// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVeriAI
 * @notice Interface for the VeriAI verification system
 * @dev Defines core functionality for AI content verification on Flare Network
 */
interface IVeriAI {
    // Structs
    struct VerificationRequest {
        address requester;
        string prompt;
        string model;
        uint256 timestamp;
        bool verified;
        bytes32 outputHash;
        bytes32 attestationId;
    }

    // Events
    event VerificationRequested(
        bytes32 indexed requestId,
        address indexed requester,
        string prompt,
        string model,
        uint256 fee
    );

    event VerificationFulfilled(bytes32 indexed requestId, bytes32 indexed attestationId, bytes32 outputHash);

    event VerificationFailed(bytes32 indexed requestId, string reason);

    event VerificationFeeUpdated(uint256 newFee);
    event TreasuryAddressUpdated(address newTreasury);
    event NFTContractUpdated(address newNFTContract);

    // Core functions
    function requestVerification(
        string calldata prompt,
        string calldata model
    ) external payable returns (bytes32 requestId);

    function fulfillVerification(
        bytes32 requestId,
        string calldata output,
        bytes32 attestationId,
        bytes calldata proof
    ) external;

    function markVerificationFailed(bytes32 requestId, string calldata reason) external;

    // View functions
    function getVerificationRequest(bytes32 requestId) external view returns (VerificationRequest memory);

    function verifyOutput(bytes32 requestId, string calldata output) external view returns (bool);

    function getUserRequestCount(address user) external view returns (uint256);
    function getUserLastRequestTime(address user) external view returns (uint256);

    // Admin functions
    function setVerificationFee(uint256 fee) external;
    function setTreasuryAddress(address treasury) external;
    function setNFTContract(address nftContract) external;
}
