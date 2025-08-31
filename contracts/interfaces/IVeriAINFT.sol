// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVeriAINFT
 * @notice Interface for VeriAI verification NFTs
 * @dev Defines functionality for minting and managing verification certificates
 */
interface IVeriAINFT {
    // Structs
    struct VerificationMetadata {
        string prompt;
        string model;
        string outputHash;
        uint256 timestamp;
        bytes32 proofHash;
        bool verified;
        address verifier;
    }

    // Events
    event VerificationNFTMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string model,
        bool verified
    );

    event BaseURIUpdated(string newBaseURI);

    // Core functions
    function mintVerificationNFT(
        address recipient,
        VerificationMetadata memory metadata
    ) external returns (uint256 tokenId);

    // View functions
    function getVerificationData(uint256 tokenId)
        external
        view
        returns (VerificationMetadata memory);

    function getTokensByOwner(address owner)
        external
        view
        returns (uint256[] memory);

    function totalSupply() external view returns (uint256);
    function baseURI() external view returns (string memory);

    // Admin functions
    function setBaseURI(string calldata newBaseURI) external;
    function pause() external;
    function unpause() external;
}
