// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IVeriAI} from "../interfaces/IVeriAI.sol";
import {IFDCRelayer, IFDCHub} from "../interfaces/IFDCRelayer.sol";

/**
 * @title FDCRelayer
 * @notice Production-ready relayer contract for Flare Data Connector integration
 * @dev Handles attestation requests and responses between VeriAI and FDC Hub
 * @author VeriAI Team
 * @custom:security-contact security@veriai.app
 */
contract FDCRelayer is IFDCRelayer, ReentrancyGuard, AccessControl, Pausable {
    /*//////////////////////////////////////////////////////////////
                                 ROLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Role for executing relayer operations
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    /// @notice Role for pausing/unpausing the contract
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Role for emergency operations
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    /// @notice Role for updating contract parameters
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice FDC attestation fee (0.005 FLR)
    uint256 public constant ATTESTATION_FEE = 0.005 ether;

    /// @notice Maximum retry attempts for failed attestations
    uint256 public constant MAX_RETRY_ATTEMPTS = 3;

    /// @notice Attestation timeout period (30 minutes)
    uint256 public constant ATTESTATION_TIMEOUT = 30 minutes;

    /// @notice Request expiry time (24 hours)
    uint256 public constant REQUEST_EXPIRY = 24 hours;

    /// @notice Maximum batch size for operations
    uint256 public constant MAX_BATCH_SIZE = 100;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice VeriAI contract instance
    IVeriAI public immutable VERI_AI_CONTRACT;

    /// @notice FDC Hub contract instance
    IFDCHub public immutable FDC_HUB;

    /// @notice Contract deployment timestamp
    uint256 public immutable DEPLOYMENT_TIME;

    /// @notice Current attestation fee
    uint256 public attestationFee;

    /// @notice Treasury address for fee collection
    address public treasuryAddress;

    /*//////////////////////////////////////////////////////////////
                               MAPPINGS
    //////////////////////////////////////////////////////////////*/

    /// @notice Attestation requests by FDC attestation ID
    mapping(bytes32 => AttestationRequest) private _attestationRequests;

    /// @notice Processed attestations to prevent replay attacks
    mapping(bytes32 => bool) private _processedAttestations;

    /// @notice VeriAI request ID to FDC attestation ID mapping
    mapping(bytes32 => bytes32) private _veriAIToFDC;

    /// @notice Request queue for batch processing
    mapping(address => bytes32[]) private _userRequests;

    /// @notice Failed requests for retry tracking
    mapping(bytes32 => uint256) private _failedRequests;

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Additional events for monitoring and analytics
    event ContractInitialized(address veriAI, address fdcHub, address treasury);
    event AttestationFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event BatchRequestProcessed(uint256 requestCount, uint256 successCount);
    event RequestRetried(bytes32 indexed fdcAttestationId, uint256 attempt);
    event RequestExpired(bytes32 indexed fdcAttestationId, bytes32 indexed veriAIRequestId);

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initialize the FDCRelayer contract
     * @param _veriAIContract Address of the VeriAI contract
     * @param _fdcHub Address of the FDC Hub contract
     * @param _treasuryAddress Address for fee collection
     */
    constructor(address _veriAIContract, address _fdcHub, address _treasuryAddress) {
        if (_veriAIContract == address(0)) revert InvalidVeriAIContract();
        if (_fdcHub == address(0)) revert InvalidFDCHub();
        if (_treasuryAddress == address(0)) revert UnauthorizedCaller();

        VERI_AI_CONTRACT = IVeriAI(_veriAIContract);
        FDC_HUB = IFDCHub(_fdcHub);
        treasuryAddress = _treasuryAddress;
        attestationFee = ATTESTATION_FEE;
        DEPLOYMENT_TIME = block.timestamp;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RELAYER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);

        emit ContractInitialized(_veriAIContract, _fdcHub, _treasuryAddress);
    }

    /*//////////////////////////////////////////////////////////////
                        CORE RELAYER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Request attestation from FDC for a verification request
     * @param veriAIRequestId The VeriAI request ID
     * @param prompt The prompt to be verified
     * @param model The AI model used
     */
    function requestAttestation(
        bytes32 veriAIRequestId,
        string calldata prompt,
        string calldata model
    ) external payable whenNotPaused nonReentrant onlyRole(RELAYER_ROLE) {
        if (msg.value < attestationFee) revert InsufficientFee();
        if (bytes(prompt).length == 0 || bytes(model).length == 0) {
            revert UnauthorizedCaller();
        }

        // Encode the request for FDC
        bytes memory encodedRequest = abi.encode(veriAIRequestId, prompt, model, block.timestamp, msg.sender);

        // Request attestation from FDC Hub
        bytes32 fdcAttestationId = FDC_HUB.requestAttestation{value: attestationFee}(encodedRequest);

        // Store the attestation request
        _attestationRequests[fdcAttestationId] = AttestationRequest({
            veriAIRequestId: veriAIRequestId,
            requester: msg.sender,
            prompt: prompt,
            model: model,
            timestamp: block.timestamp,
            fdcAttestationId: fdcAttestationId,
            fulfilled: false,
            retryCount: 0
        });

        // Create bidirectional mapping
        _veriAIToFDC[veriAIRequestId] = fdcAttestationId;

        // Add to user requests
        _userRequests[msg.sender].push(fdcAttestationId);

        // Transfer any excess fees to treasury
        if (msg.value > attestationFee) {
            _transferExcessFees(msg.value - attestationFee);
        }

        emit AttestationRequested(veriAIRequestId, fdcAttestationId, msg.sender, model);
    }

    /**
     * @notice Fulfill attestation response from FDC
     * @param fdcAttestationId The FDC attestation ID
     */
    function fulfillAttestation(bytes32 fdcAttestationId) external whenNotPaused nonReentrant onlyRole(RELAYER_ROLE) {
        AttestationRequest storage request = _attestationRequests[fdcAttestationId];

        _validateAttestationRequest(request, fdcAttestationId);

        // Get attestation result from FDC
        (bool success, bytes memory data) = FDC_HUB.getAttestation(fdcAttestationId);

        if (success && data.length > 0) {
            _processSuccessfulAttestation(request, fdcAttestationId, data);
        } else {
            _processFailedAttestation(request, fdcAttestationId);
        }
    }

    /**
     * @notice Retry failed attestation
     * @param fdcAttestationId The FDC attestation ID to retry
     */
    function retryAttestation(
        bytes32 fdcAttestationId
    ) external payable whenNotPaused nonReentrant onlyRole(RELAYER_ROLE) {
        AttestationRequest storage request = _attestationRequests[fdcAttestationId];

        if (request.timestamp == 0) revert AttestationNotFound();
        if (request.fulfilled) revert AttestationAlreadyProcessed();
        if (request.retryCount >= MAX_RETRY_ATTEMPTS) revert MaxRetriesExceeded();
        if (msg.value < attestationFee) revert InsufficientFee();

        // Re-encode the request
        bytes memory encodedRequest = abi.encode(
            request.veriAIRequestId,
            request.prompt,
            request.model,
            block.timestamp,
            msg.sender
        );

        // Request new attestation
        bytes32 newFdcAttestationId = FDC_HUB.requestAttestation{value: attestationFee}(encodedRequest);

        // Update the request
        request.fdcAttestationId = newFdcAttestationId;
        request.timestamp = block.timestamp;
        request.retryCount++;

        // Update mappings
        _veriAIToFDC[request.veriAIRequestId] = newFdcAttestationId;
        _attestationRequests[newFdcAttestationId] = request;
        delete _attestationRequests[fdcAttestationId];

        // Transfer any excess fees to treasury
        if (msg.value > attestationFee) {
            _transferExcessFees(msg.value - attestationFee);
        }

        emit RequestRetried(newFdcAttestationId, request.retryCount);
        emit AttestationRequested(request.veriAIRequestId, newFdcAttestationId, msg.sender, request.model);
    }

    /**
     * @notice Batch process multiple attestation requests
     * @param fdcAttestationIds Array of FDC attestation IDs to process
     */
    function batchFulfillAttestations(
        bytes32[] calldata fdcAttestationIds
    ) external whenNotPaused nonReentrant onlyRole(RELAYER_ROLE) {
        if (fdcAttestationIds.length == 0 || fdcAttestationIds.length > MAX_BATCH_SIZE) {
            revert UnauthorizedCaller();
        }

        uint256 successCount = 0;

        for (uint256 i = 0; i < fdcAttestationIds.length; i++) {
            bytes32 fdcAttestationId = fdcAttestationIds[i];
            AttestationRequest storage request = _attestationRequests[fdcAttestationId];

            // Skip invalid or already processed requests
            if (request.timestamp == 0 || request.fulfilled) {
                continue;
            }

            // Check if request has expired
            if (block.timestamp > request.timestamp + REQUEST_EXPIRY) {
                emit RequestExpired(fdcAttestationId, request.veriAIRequestId);
                continue;
            }

            // Try to fulfill the attestation
            (bool success, bytes memory data) = FDC_HUB.getAttestation(fdcAttestationId);

            if (success && data.length > 0) {
                _processSuccessfulAttestation(request, fdcAttestationId, data);
                successCount++;
            }
        }

        emit BatchRequestProcessed(fdcAttestationIds.length, successCount);
    }

    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get attestation request details
     * @param fdcAttestationId The FDC attestation ID
     * @return The attestation request details
     */
    function getAttestationRequest(bytes32 fdcAttestationId) external view returns (AttestationRequest memory) {
        return _attestationRequests[fdcAttestationId];
    }

    /**
     * @notice Check if attestation is processed
     * @param fdcAttestationId The FDC attestation ID
     * @return Whether the attestation is processed
     */
    function isAttestationProcessed(bytes32 fdcAttestationId) external view returns (bool) {
        return _processedAttestations[fdcAttestationId];
    }

    /**
     * @notice Get FDC attestation ID for a VeriAI request
     * @param veriAIRequestId The VeriAI request ID
     * @return The corresponding FDC attestation ID
     */
    function getFDCAttestationId(bytes32 veriAIRequestId) external view returns (bytes32) {
        return _veriAIToFDC[veriAIRequestId];
    }

    /**
     * @notice Get user's attestation requests
     * @param user User address
     * @return Array of FDC attestation IDs
     */
    function getUserRequests(address user) external view returns (bytes32[] memory) {
        return _userRequests[user];
    }

    /**
     * @notice Get failed request count
     * @param fdcAttestationId The FDC attestation ID
     * @return Number of failures
     */
    function getFailedRequestCount(bytes32 fdcAttestationId) external view returns (uint256) {
        return _failedRequests[fdcAttestationId];
    }

    /*//////////////////////////////////////////////////////////////
                          ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Update attestation fee
     * @param newFee New attestation fee
     */
    function updateAttestationFee(uint256 newFee) external onlyRole(UPDATER_ROLE) {
        if (newFee == 0 || newFee > 1 ether) revert InsufficientFee();

        uint256 oldFee = attestationFee;
        attestationFee = newFee;

        emit AttestationFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert UnauthorizedCaller();

        address oldTreasury = treasuryAddress;
        treasuryAddress = newTreasury;

        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal of contract balance
     */
    function emergencyWithdraw() external onlyRole(EMERGENCY_ROLE) {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = payable(treasuryAddress).call{value: balance}("");
            if (!success) revert UnauthorizedCaller();
        }
    }

    /**
     * @notice Withdraw accumulated fees
     * @param to Address to send the fees to
     * @param amount Amount to withdraw
     */
    function withdrawFees(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert UnauthorizedCaller();
        if (amount == 0 || amount > address(this).balance) revert InsufficientFee();

        (bool success, ) = to.call{value: amount}("");
        if (!success) revert UnauthorizedCaller();
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Validate attestation request
     */
    function _validateAttestationRequest(AttestationRequest storage request, bytes32 fdcAttestationId) internal view {
        if (request.timestamp == 0) revert AttestationNotFound();
        if (request.fulfilled) revert AttestationAlreadyProcessed();
        if (block.timestamp > request.timestamp + ATTESTATION_TIMEOUT) {
            revert AttestationExpired();
        }
        if (_processedAttestations[fdcAttestationId]) revert AttestationAlreadyProcessed();
    }

    /**
     * @dev Process successful attestation
     */
    function _processSuccessfulAttestation(
        AttestationRequest storage request,
        bytes32 fdcAttestationId,
        bytes memory data
    ) internal {
        // Decode the response
        (string memory output, bytes32 proofHash) = abi.decode(data, (string, bytes32));

        // Mark as fulfilled
        request.fulfilled = true;
        _processedAttestations[fdcAttestationId] = true;

        // Fulfill the verification in VeriAI contract
        VERI_AI_CONTRACT.fulfillVerification(request.veriAIRequestId, output, fdcAttestationId, abi.encode(proofHash));

        emit AttestationFulfilled(request.veriAIRequestId, fdcAttestationId, true, output);
    }

    /**
     * @dev Process failed attestation
     */
    function _processFailedAttestation(AttestationRequest storage request, bytes32 fdcAttestationId) internal {
        request.retryCount++;
        _failedRequests[fdcAttestationId]++;

        if (request.retryCount >= MAX_RETRY_ATTEMPTS) {
            request.fulfilled = true;

            VERI_AI_CONTRACT.markVerificationFailed(
                request.veriAIRequestId,
                "FDC attestation failed after max retries"
            );

            emit AttestationFailed(request.veriAIRequestId, fdcAttestationId, "Max retries exceeded");
        } else {
            emit AttestationFailed(request.veriAIRequestId, fdcAttestationId, "FDC attestation failed, retrying");
        }
    }

    /**
     * @dev Transfer excess fees to treasury
     */
    function _transferExcessFees(uint256 amount) internal {
        if (amount > 0) {
            (bool success, ) = payable(treasuryAddress).call{value: amount}("");
            if (!success) revert UnauthorizedCaller();
        }
    }

    /*//////////////////////////////////////////////////////////////
                          RECEIVE FUNCTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Receive function to accept FLR payments
     * @dev Allows contract to receive FLR for attestation fees
     */
    receive() external payable {
        // Accept payments for attestation fees
    }

    /**
     * @notice Fallback function
     */
    fallback() external payable {
        // Handle any other calls
    }
}
