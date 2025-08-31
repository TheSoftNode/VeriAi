// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IVeriAI} from "../interfaces/IVeriAI.sol";
import {IVeriAINFT} from "../interfaces/IVeriAINFT.sol";

/**
 * @title VeriAI
 * @notice Production-ready smart contract for AI content verification on Flare Network
 * @dev Implements comprehensive verification system with FDC integration, rate limiting, 
 *      access controls, and security features for hackathon and public deployment
 * @author VeriAI Team
 * @custom:security-contact security@veriai.app
 */
contract VeriAI is IVeriAI, AccessControl, ReentrancyGuard, Pausable {
    using Strings for uint256;

    /*//////////////////////////////////////////////////////////////
                                 ROLES
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Role for FDC relayers who can fulfill verifications
    bytes32 public constant FDC_RELAYER_ROLE = keccak256("FDC_RELAYER_ROLE");
    
    /// @notice Role for pausing/unpausing the contract
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    /// @notice Role for emergency operations
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Maximum length for AI prompts
    uint256 public constant MAX_PROMPT_LENGTH = 2000;
    
    /// @notice Maximum length for AI model names
    uint256 public constant MAX_MODEL_LENGTH = 50;
    
    /// @notice Minimum verification fee (0.01 FLR)
    uint256 public constant MIN_VERIFICATION_FEE = 0.01 ether;
    
    /// @notice Maximum verification fee (10 FLR)
    uint256 public constant MAX_VERIFICATION_FEE = 10 ether;
    
    /// @notice Rate limiting window (1 minute)
    uint256 public constant RATE_LIMIT_WINDOW = 60 seconds;
    
    /// @notice Maximum requests per user per day
    uint256 public constant MAX_DAILY_REQUESTS = 100;
    
    /// @notice Request timeout period (24 hours)
    uint256 public constant REQUEST_TIMEOUT = 24 hours;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Current verification fee
    uint256 public verificationFee;
    
    /// @notice Treasury address for fee collection
    address public treasuryAddress;
    
    /// @notice NFT contract for verification certificates
    IVeriAINFT public nftContract;
    
    /// @notice Request counter for unique IDs
    uint256 private _requestCounter;
    
    /// @notice Contract deployment timestamp
    uint256 public immutable DEPLOYMENT_TIME;

    /*//////////////////////////////////////////////////////////////
                               MAPPINGS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Verification requests by ID
    mapping(bytes32 => VerificationRequest) private _requests;
    
    /// @notice User last request timestamp for rate limiting
    mapping(address => uint256) private _lastRequestTime;
    
    /// @notice User request count
    mapping(address => uint256) private _requestCount;
    
    /// @notice Daily request count per user
    mapping(address => mapping(uint256 => uint256)) private _dailyRequestCount;
    
    /// @notice Processed attestation IDs to prevent replay
    mapping(bytes32 => bool) private _processedAttestations;
    
    /// @notice User requests for enumeration
    mapping(address => bytes32[]) private _userRequests;

    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error InvalidPromptLength();
    error InvalidModelLength();
    error InsufficientFee();
    error ExcessiveFee();
    error RateLimitExceeded();
    error DailyLimitExceeded();
    error InvalidFeeAmount();
    error InvalidTreasuryAddress();
    error InvalidNFTContract();
    error RequestNotFound();
    error RequestAlreadyVerified();
    error RequestExpired();
    error AttestationAlreadyProcessed();
    error UnauthorizedVerifier();
    error ZeroAddress();
    error InvalidInput();
    error TransferFailed();
    error WithdrawalFailed();

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/
    
    /// @dev Additional events for monitoring and analytics
    event ContractInitialized(address treasury, uint256 fee);
    event RateLimitUpdated(uint256 newWindow);
    event DailyLimitUpdated(uint256 newLimit);
    event RequestTimeout(bytes32 indexed requestId, address indexed requester);

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Initialize the VeriAI contract
     * @param _treasuryAddress Address to receive verification fees
     * @param _verificationFee Initial verification fee in wei
     */
    constructor(
        address _treasuryAddress,
        uint256 _verificationFee
    ) {
        if (_treasuryAddress == address(0)) revert InvalidTreasuryAddress();
        if (_verificationFee < MIN_VERIFICATION_FEE || _verificationFee > MAX_VERIFICATION_FEE) {
            revert InvalidFeeAmount();
        }

        treasuryAddress = _treasuryAddress;
        verificationFee = _verificationFee;
        DEPLOYMENT_TIME = block.timestamp;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        _grantRole(FDC_RELAYER_ROLE, msg.sender);

        emit ContractInitialized(_treasuryAddress, _verificationFee);
    }

    /*//////////////////////////////////////////////////////////////
                        CORE VERIFICATION LOGIC
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Request verification for AI-generated content
     * @param prompt The prompt used to generate the content
     * @param model The AI model identifier
     * @return requestId Unique identifier for the verification request
     */
    function requestVerification(
        string calldata prompt,
        string calldata model
    )
        external
        payable
        whenNotPaused
        nonReentrant
        returns (bytes32 requestId)
    {
        // Input validation
        _validateVerificationInput(prompt, model);
        
        // Fee validation
        if (msg.value < verificationFee) revert InsufficientFee();
        if (msg.value > verificationFee * 2) revert ExcessiveFee(); // Prevent accidental overpayment
        
        // Rate limiting checks
        _checkRateLimits(msg.sender);
        
        // Generate unique request ID
        requestId = _generateRequestId(msg.sender, prompt, model);
        
        // Store verification request
        _requests[requestId] = VerificationRequest({
            requester: msg.sender,
            prompt: prompt,
            model: model,
            timestamp: block.timestamp,
            verified: false,
            outputHash: bytes32(0),
            attestationId: bytes32(0)
        });
        
        // Update user tracking
        _updateUserTracking(msg.sender, requestId);
        
        // Transfer fees to treasury
        _transferFees(msg.value);
        
        emit VerificationRequested(requestId, msg.sender, prompt, model, msg.value);
        
        return requestId;
    }

    /**
     * @notice Fulfill verification request with FDC attestation
     * @param requestId The verification request ID
     * @param output The verified AI output
     * @param attestationId The FDC attestation ID
     * @param proof Cryptographic proof from FDC
     */
    function fulfillVerification(
        bytes32 requestId,
        string calldata output,
        bytes32 attestationId,
        bytes calldata proof
    )
        external
        whenNotPaused
        nonReentrant
        onlyRole(FDC_RELAYER_ROLE)
    {
        VerificationRequest storage request = _requests[requestId];
        
        // Validation checks
        _validateFulfillmentRequest(request, attestationId);
        
        // Calculate output hash
        bytes32 outputHash = keccak256(abi.encodePacked(output));
        
        // Update request state
        request.verified = true;
        request.outputHash = outputHash;
        request.attestationId = attestationId;
        
        // Mark attestation as processed
        _processedAttestations[attestationId] = true;
        
        // Mint verification NFT if contract is set
        if (address(nftContract) != address(0)) {
            _mintVerificationNFT(request.requester, requestId, request, outputHash, proof);
        }
        
        emit VerificationFulfilled(requestId, attestationId, outputHash);
    }

    /**
     * @notice Mark verification as failed
     * @param requestId The verification request ID
     * @param reason Reason for failure
     */
    function markVerificationFailed(
        bytes32 requestId,
        string calldata reason
    )
        external
        whenNotPaused
        onlyRole(FDC_RELAYER_ROLE)
    {
        VerificationRequest storage request = _requests[requestId];
        
        if (request.timestamp == 0) revert RequestNotFound();
        if (request.verified) revert RequestAlreadyVerified();
        
        emit VerificationFailed(requestId, reason);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Get verification request details
     * @param requestId The request ID
     * @return The verification request
     */
    function getVerificationRequest(bytes32 requestId)
        external
        view
        returns (VerificationRequest memory)
    {
        return _requests[requestId];
    }

    /**
     * @notice Verify if output matches the verified output for a request
     * @param requestId The request ID
     * @param output The output to verify
     * @return Whether the output is verified
     */
    function verifyOutput(bytes32 requestId, string calldata output)
        external
        view
        returns (bool)
    {
        VerificationRequest memory request = _requests[requestId];
        if (!request.verified) return false;
        
        bytes32 outputHash = keccak256(abi.encodePacked(output));
        return outputHash == request.outputHash;
    }

    /**
     * @notice Get user's total request count
     * @param user User address
     * @return Number of requests made by user
     */
    function getUserRequestCount(address user) external view returns (uint256) {
        return _requestCount[user];
    }

    /**
     * @notice Get user's last request time
     * @param user User address
     * @return Timestamp of last request
     */
    function getUserLastRequestTime(address user) external view returns (uint256) {
        return _lastRequestTime[user];
    }

    /**
     * @notice Get user's daily request count
     * @param user User address
     * @param day Day since deployment
     * @return Number of requests made by user on that day
     */
    function getUserDailyRequestCount(address user, uint256 day) external view returns (uint256) {
        return _dailyRequestCount[user][day];
    }

    /**
     * @notice Get all request IDs for a user
     * @param user User address
     * @return Array of request IDs
     */
    function getUserRequests(address user) external view returns (bytes32[] memory) {
        return _userRequests[user];
    }

    /**
     * @notice Check if attestation has been processed
     * @param attestationId The attestation ID
     * @return Whether attestation is processed
     */
    function isAttestationProcessed(bytes32 attestationId) external view returns (bool) {
        return _processedAttestations[attestationId];
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Set verification fee
     * @param _fee New verification fee
     */
    function setVerificationFee(uint256 _fee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_fee < MIN_VERIFICATION_FEE || _fee > MAX_VERIFICATION_FEE) {
            revert InvalidFeeAmount();
        }
        verificationFee = _fee;
        emit VerificationFeeUpdated(_fee);
    }

    /**
     * @notice Set treasury address
     * @param _treasury New treasury address
     */
    function setTreasuryAddress(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_treasury == address(0)) revert InvalidTreasuryAddress();
        treasuryAddress = _treasury;
        emit TreasuryAddressUpdated(_treasury);
    }

    /**
     * @notice Set NFT contract address
     * @param _nftContract Address of the VeriAINFT contract
     */
    function setNFTContract(address _nftContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_nftContract == address(0)) revert InvalidNFTContract();
        nftContract = IVeriAINFT(_nftContract);
        emit NFTContractUpdated(_nftContract);
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
            if (!success) revert WithdrawalFailed();
        }
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Validate verification input parameters
     */
    function _validateVerificationInput(string calldata prompt, string calldata model) internal pure {
        if (bytes(prompt).length == 0 || bytes(prompt).length > MAX_PROMPT_LENGTH) {
            revert InvalidPromptLength();
        }
        if (bytes(model).length == 0 || bytes(model).length > MAX_MODEL_LENGTH) {
            revert InvalidModelLength();
        }
    }

    /**
     * @dev Check rate limits for user
     */
    function _checkRateLimits(address user) internal view {
        // Check time-based rate limit
        if (block.timestamp < _lastRequestTime[user] + RATE_LIMIT_WINDOW) {
            revert RateLimitExceeded();
        }
        
        // Check daily limit
        uint256 currentDay = (block.timestamp - DEPLOYMENT_TIME) / 1 days;
        if (_dailyRequestCount[user][currentDay] >= MAX_DAILY_REQUESTS) {
            revert DailyLimitExceeded();
        }
    }

    /**
     * @dev Generate unique request ID
     */
    function _generateRequestId(
        address requester,
        string calldata prompt,
        string calldata model
    ) internal returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                requester,
                prompt,
                model,
                block.timestamp,
                block.prevrandao,
                _requestCounter++
            )
        );
    }

    /**
     * @dev Update user tracking data
     */
    function _updateUserTracking(address user, bytes32 requestId) internal {
        _lastRequestTime[user] = block.timestamp;
        _requestCount[user]++;
        
        uint256 currentDay = (block.timestamp - DEPLOYMENT_TIME) / 1 days;
        _dailyRequestCount[user][currentDay]++;
        
        _userRequests[user].push(requestId);
    }

    /**
     * @dev Transfer fees to treasury
     */
    function _transferFees(uint256 amount) internal {
        (bool success, ) = payable(treasuryAddress).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @dev Validate fulfillment request
     */
    function _validateFulfillmentRequest(
        VerificationRequest storage request,
        bytes32 attestationId
    ) internal view {
        if (request.timestamp == 0) revert RequestNotFound();
        if (request.verified) revert RequestAlreadyVerified();
        if (block.timestamp > request.timestamp + REQUEST_TIMEOUT) revert RequestExpired();
        if (_processedAttestations[attestationId]) revert AttestationAlreadyProcessed();
    }

    /**
     * @dev Mint verification NFT
     */
    function _mintVerificationNFT(
        address recipient,
        bytes32 /* requestId */,
        VerificationRequest memory request,
        bytes32 outputHash,
        bytes memory proof
    ) internal {
        bytes32 proofHash = keccak256(proof);
        
        IVeriAINFT.VerificationMetadata memory metadata = IVeriAINFT.VerificationMetadata({
            prompt: request.prompt,
            model: request.model,
            outputHash: Strings.toHexString(uint256(outputHash)),
            timestamp: request.timestamp,
            proofHash: proofHash,
            verified: true,
            verifier: msg.sender
        });

        nftContract.mintVerificationNFT(recipient, metadata);
    }

    /*//////////////////////////////////////////////////////////////
                          RECEIVE FUNCTION
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Receive function to accept FLR payments
     * @dev Allows contract to receive FLR for verification fees
     */
    receive() external payable {
        // Accept payments - could be used for direct fee payments
    }
}
