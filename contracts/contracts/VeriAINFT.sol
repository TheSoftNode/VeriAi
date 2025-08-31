// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {IVeriAINFT} from "../interfaces/IVeriAINFT.sol";

/**
 * @title VeriAINFT
 * @notice Production-ready NFT contract for AI verification certificates
 * @dev ERC721 tokens representing verified AI-generated content with on-chain metadata
 * @author VeriAI Team
 * @custom:security-contact security@veriai.app
 */
contract VeriAINFT is
    IVeriAINFT,
    ERC721,
    ERC721URIStorage,
    ERC721Burnable,
    ERC721Enumerable,
    ERC721Pausable,
    AccessControl
{
    using Strings for uint256;
    using Strings for address;

    /*//////////////////////////////////////////////////////////////
                                 ROLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Role for minting verification NFTs
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Role for pausing/unpausing the contract
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Role for updating contract parameters
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Base URI for token metadata
    string private _baseTokenURI;

    /// @notice Current token ID counter
    uint256 private _tokenIdCounter;

    /// @notice Contract deployment timestamp
    uint256 public immutable DEPLOYMENT_TIME;

    /// @notice Maximum supply of tokens (0 = unlimited)
    uint256 public constant MAX_SUPPLY = 0;

    /*//////////////////////////////////////////////////////////////
                               MAPPINGS
    //////////////////////////////////////////////////////////////*/

    /// @notice Verification metadata for each token
    mapping(uint256 => VerificationMetadata) private _verificationData;

    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidPrompt();
    error InvalidModel();
    error InvalidOutputHash();
    error InvalidVerifier();
    error TokenNotFound();
    error MaxSupplyExceeded();
    error InvalidBaseURI();
    error UnauthorizedMinter();
    error TokenAlreadyExists();

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Additional events for enhanced tracking
    event ContractInitialized(string name, string symbol, string baseURI);
    event MetadataUpdated(uint256 indexed tokenId);
    event BatchMinted(address indexed recipient, uint256 startId, uint256 count);

    /*//////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Validates verification metadata
     */
    modifier validMetadata(VerificationMetadata memory metadata) {
        if (bytes(metadata.prompt).length == 0) revert InvalidPrompt();
        if (bytes(metadata.model).length == 0) revert InvalidModel();
        if (bytes(metadata.outputHash).length == 0) revert InvalidOutputHash();
        if (metadata.verifier == address(0)) revert InvalidVerifier();
        _;
    }

    /**
     * @dev Checks if token exists
     */
    modifier tokenExists(uint256 tokenId) {
        if (tokenId >= _tokenIdCounter) revert TokenNotFound();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initialize the VeriAINFT contract
     * @param name Token name
     * @param symbol Token symbol
     * @param baseTokenURI Base URI for token metadata
     */
    constructor(string memory name, string memory symbol, string memory baseTokenURI) ERC721(name, symbol) {
        if (bytes(baseTokenURI).length == 0) revert InvalidBaseURI();

        _baseTokenURI = baseTokenURI;
        DEPLOYMENT_TIME = block.timestamp;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);

        emit ContractInitialized(name, symbol, baseTokenURI);
    }

    /*//////////////////////////////////////////////////////////////
                          MINTING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mint a verification NFT
     * @param recipient Address to receive the NFT
     * @param metadata Verification metadata
     * @return tokenId The minted token ID
     */
    function mintVerificationNFT(
        address recipient,
        VerificationMetadata memory metadata
    ) external whenNotPaused onlyRole(MINTER_ROLE) validMetadata(metadata) returns (uint256 tokenId) {
        if (recipient == address(0)) revert InvalidVerifier();
        if (MAX_SUPPLY > 0 && _tokenIdCounter >= MAX_SUPPLY) revert MaxSupplyExceeded();

        tokenId = _tokenIdCounter++;

        // Store verification metadata
        _verificationData[tokenId] = metadata;

        // Mint the token
        _safeMint(recipient, tokenId);

        emit VerificationNFTMinted(tokenId, recipient, metadata.model, metadata.verified);

        return tokenId;
    }

    /**
     * @notice Batch mint verification NFTs
     * @param recipient Address to receive the NFTs
     * @param metadataArray Array of verification metadata
     * @return tokenIds Array of minted token IDs
     */
    function batchMintVerificationNFT(
        address recipient,
        VerificationMetadata[] memory metadataArray
    ) external whenNotPaused onlyRole(MINTER_ROLE) returns (uint256[] memory tokenIds) {
        if (recipient == address(0)) revert InvalidVerifier();
        if (metadataArray.length == 0) revert InvalidPrompt();

        uint256 startId = _tokenIdCounter;
        uint256 count = metadataArray.length;

        if (MAX_SUPPLY > 0 && _tokenIdCounter + count > MAX_SUPPLY) {
            revert MaxSupplyExceeded();
        }

        tokenIds = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            // Validate metadata
            VerificationMetadata memory metadata = metadataArray[i];
            if (bytes(metadata.prompt).length == 0) revert InvalidPrompt();
            if (bytes(metadata.model).length == 0) revert InvalidModel();
            if (bytes(metadata.outputHash).length == 0) revert InvalidOutputHash();
            if (metadata.verifier == address(0)) revert InvalidVerifier();

            uint256 tokenId = _tokenIdCounter++;
            tokenIds[i] = tokenId;

            // Store verification metadata
            _verificationData[tokenId] = metadata;

            // Mint the token
            _safeMint(recipient, tokenId);

            emit VerificationNFTMinted(tokenId, recipient, metadata.model, metadata.verified);
        }

        emit BatchMinted(recipient, startId, count);

        return tokenIds;
    }

    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get verification metadata for a token
     * @param tokenId Token ID
     * @return Verification metadata
     */
    function getVerificationData(
        uint256 tokenId
    ) external view tokenExists(tokenId) returns (VerificationMetadata memory) {
        return _verificationData[tokenId];
    }

    /**
     * @notice Get all tokens owned by an address
     * @param owner Owner address
     * @return Array of token IDs
     */
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokens;
    }

    /**
     * @notice Get total supply of tokens
     * @return Total number of minted tokens
     */
    function totalSupply() public view override(ERC721Enumerable, IVeriAINFT) returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Get base URI
     * @return Current base URI
     */
    function baseURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Generate token URI with embedded metadata
     * @param tokenId Token ID
     * @return Token URI with base64 encoded JSON metadata
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) tokenExists(tokenId) returns (string memory) {
        VerificationMetadata memory metadata = _verificationData[tokenId];
        return _generateTokenURI(tokenId, metadata);
    }

    /**
     * @notice Check if contract supports an interface
     * @param interfaceId Interface identifier
     * @return Whether interface is supported
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /*//////////////////////////////////////////////////////////////
                          ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set base URI for tokens
     * @param newBaseURI New base URI
     */
    function setBaseURI(string calldata newBaseURI) external onlyRole(UPDATER_ROLE) {
        if (bytes(newBaseURI).length == 0) revert InvalidBaseURI();
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
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

    /*//////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Generate token URI with embedded JSON metadata
     */
    function _generateTokenURI(
        uint256 tokenId,
        VerificationMetadata memory metadata
    ) internal pure returns (string memory) {
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "VeriAI Verification Certificate #',
                        tokenId.toString(),
                        '", "description": "Cryptographically verified AI-generated content ',
                        'authenticated through Flare blockchain", "image": "https://api.veriai.app/nft/',
                        tokenId.toString(),
                        '/image", "attributes": [',
                        '{"trait_type": "AI Model", "value": "',
                        metadata.model,
                        '"},',
                        '{"trait_type": "Verification Status", "value": "',
                        metadata.verified ? "Verified" : "Pending",
                        '"},',
                        '{"trait_type": "Timestamp", "display_type": "date", "value": ',
                        metadata.timestamp.toString(),
                        "},",
                        '{"trait_type": "Verifier", "value": "',
                        metadata.verifier.toHexString(),
                        '"}',
                        '], "prompt": "',
                        _escapeJsonString(metadata.prompt),
                        '", "output_hash": "',
                        metadata.outputHash,
                        '", "proof_hash": "',
                        uint256(metadata.proofHash).toHexString(),
                        '", "verified": ',
                        metadata.verified ? "true" : "false",
                        "}"
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     * @dev Escape special characters in JSON strings
     */
    function _escapeJsonString(string memory str) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        uint256 extraChars = 0;

        // Count extra characters needed for escaping
        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] == '"' || strBytes[i] == "\\" || strBytes[i] == "\n" || strBytes[i] == "\r") {
                extraChars++;
            }
        }

        if (extraChars == 0) {
            return str;
        }

        bytes memory escapedBytes = new bytes(strBytes.length + extraChars);
        uint256 j = 0;

        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] == '"') {
                escapedBytes[j++] = "\\";
                escapedBytes[j++] = '"';
            } else if (strBytes[i] == "\\") {
                escapedBytes[j++] = "\\";
                escapedBytes[j++] = "\\";
            } else if (strBytes[i] == "\n") {
                escapedBytes[j++] = "\\";
                escapedBytes[j++] = "n";
            } else if (strBytes[i] == "\r") {
                escapedBytes[j++] = "\\";
                escapedBytes[j++] = "r";
            } else {
                escapedBytes[j++] = strBytes[i];
            }
        }

        return string(escapedBytes);
    }

    /**
     * @dev Override _update to handle pausable functionality
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable, ERC721Pausable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override _increaseBalance for enumerable compatibility
     */
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Override base URI function
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
