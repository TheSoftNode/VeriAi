// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFDCRelayer
 * @notice Interface for the FDC Relayer contract
 * @dev Defines the interface for interacting with Flare Data Connector services
 */
interface IFDCRelayer {
    // Structs
    struct AttestationRequest {
        bytes32 veriAIRequestId;
        address requester;
        string prompt;
        string model;
        uint256 timestamp;
        bytes32 fdcAttestationId;
        bool fulfilled;
        uint256 retryCount;
    }

    // Events
    event AttestationRequested(
        bytes32 indexed veriAIRequestId,
        bytes32 indexed fdcAttestationId,
        address indexed requester,
        string model
    );

    event AttestationFulfilled(
        bytes32 indexed veriAIRequestId,
        bytes32 indexed fdcAttestationId,
        bool success,
        string output
    );

    event AttestationFailed(
        bytes32 indexed veriAIRequestId,
        bytes32 indexed fdcAttestationId,
        string reason
    );

    event RelayerConfigUpdated(address indexed fdcHub, uint256 fee);

    // Custom errors
    error InvalidFDCHub();
    error InvalidVeriAIContract();
    error AttestationNotFound();
    error AttestationExpired();
    error AttestationAlreadyProcessed();
    error InsufficientFee();
    error MaxRetriesExceeded();
    error UnauthorizedCaller();

    // Main functions
    function requestAttestation(
        bytes32 veriAIRequestId,
        string calldata prompt,
        string calldata model
    ) external payable;

    function fulfillAttestation(bytes32 fdcAttestationId) external;

    function retryAttestation(bytes32 fdcAttestationId) external payable;

    // View functions
    function getAttestationRequest(bytes32 fdcAttestationId) 
        external 
        view 
        returns (AttestationRequest memory);

    function isAttestationProcessed(bytes32 fdcAttestationId) 
        external 
        view 
        returns (bool);

    // Admin functions
    function pause() external;
    function unpause() external;
    function emergencyWithdraw() external;
    function withdrawFees(address payable to, uint256 amount) external;
}

/**
 * @title IFDCHub
 * @notice Interface for the Flare Data Connector Hub
 * @dev This would be replaced with the actual FDC contract interface
 */
interface IFDCHub {
    function requestAttestation(bytes memory encodedRequest) external payable returns (bytes32);
    function getAttestation(bytes32 attestationId) external view returns (bool success, bytes memory data);
}
