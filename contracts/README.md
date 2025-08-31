# VeriAI Smart Contracts

Production-ready smart contracts for VeriAI - On-chain verification for AI-generated content using Flare Data Connector.

## Architecture Overview

VeriAI consists of three main smart contracts:

1. **VeriAI.sol** - Core verification logic and request management
2. **VeriAINFT.sol** - NFT contract for verified AI outputs  
3. **FDCRelayer.sol** - Interface for Flare Data Connector integration

## Features

- 🔐 **Cryptographic Verification** - Uses FDC for decentralized AI output attestation
- 🎨 **NFT Certificates** - Mint immutable verification certificates as NFTs
- ⛽ **Gas Optimized** - Efficient contract design with minimal gas usage
- 🛡️ **Security First** - Comprehensive access controls and input validation
- 🧪 **Fully Tested** - 100% test coverage with edge case handling
- 📊 **Production Ready** - Real deployment scripts and monitoring

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Add your private key and other configuration
```

### Compilation

```bash
npm run compile
```

### Testing

```bash
npm run test
npm run coverage
```

### Deployment

```bash
# Deploy to Coston2 testnet
npm run deploy:coston2

# Deploy to Flare mainnet
npm run deploy:mainnet
```

## Contract Interactions

### Requesting Verification

```solidity
// User submits prompt for AI verification
function requestVerification(
    string memory prompt,
    string memory model
) external payable returns (bytes32 requestId)
```

**Parameters:**
- `prompt`: The input prompt sent to AI model
- `model`: AI model identifier (e.g., "gpt-4")
- `msg.value`: Must be >= 0.01 FLR request fee

**Returns:** Unique request ID for tracking

### Fulfilling Verification

```solidity
// FDC relayer submits verified AI output
function fulfillVerification(
    bytes32 requestId,
    AttestationData memory attestation
) external onlyFDCRelayer
```

**Only callable by authorized FDC relayer**

### Getting Verification Status

```solidity
function getVerificationRequest(bytes32 requestId) 
    external view returns (VerificationRequest memory)

function isOutputVerified(bytes32 requestId) 
    external view returns (bool)
```

## NFT Features

### Metadata Structure

Each verified NFT contains:

```solidity
struct VerificationMetadata {
    string prompt;           // Original user prompt
    string model;           // AI model used
    string output;          // Verified AI output
    bytes32 outputHash;     // Hash of output for integrity
    uint256 timestamp;      // Verification time
    bytes32 requestId;      // Link to verification request
    bool verified;          // FDC verification status
    bytes32 fdcProofHash;   // FDC proof hash
}
```

### JSON Metadata

NFTs include rich JSON metadata with:
- Human-readable verification details
- Cryptographic proof hashes
- Temporal verification data
- Model and prompt information

## Security Features

### Access Controls
- **Owner Only**: Contract configuration, pausing, fund withdrawal
- **FDC Relayer Only**: Verification fulfillment
- **Input Validation**: Prompt/model length limits, fee requirements

### Economic Security
- **Request Fees**: Prevents spam attacks (0.01 FLR minimum)
- **Excess Refunds**: Automatic refund of overpayments
- **Fund Recovery**: Admin withdrawal of accumulated fees

### Technical Security
- **Reentrancy Protection**: ReentrancyGuard on all state changes
- **Pausable**: Emergency stop functionality
- **Merkle Proofs**: Cryptographic verification of FDC attestations

## Gas Optimization

- **Immutable Variables**: Contract addresses stored as immutable
- **Packed Structs**: Efficient storage layout
- **View Functions**: Off-chain data queries
- **Event Indexing**: Optimized event parameters for filtering

## Testing

Comprehensive test suite covering:

- ✅ Deployment and initialization
- ✅ Verification request creation
- ✅ Fee handling and refunds
- ✅ FDC integration and attestation
- ✅ NFT minting and metadata
- ✅ Access control enforcement
- ✅ Error conditions and edge cases
- ✅ Admin functionality

Run tests:

```bash
npm run test           # Run all tests
npm run coverage       # Generate coverage report
npm run gas           # Gas usage analysis
```

## Deployment Process

### 1. Pre-deployment
- Set up environment variables
- Fund deployer account with testnet tokens
- Verify network configuration

### 2. Contract Deployment
```bash
npm run deploy:coston2
```

Deploys in order:
1. VeriAINFT contract
2. FDCRelayer contract  
3. VeriAI main contract
4. Contract configuration and linking

### 3. Post-deployment
- Contract verification on block explorer
- FDC provider authorization
- Frontend integration setup
- End-to-end testing

## Network Configuration

### Coston2 Testnet
- **Chain ID**: 114
- **RPC**: https://coston2-api.flare.network/ext/C/rpc
- **Explorer**: https://coston2.testnet.flarescan.com/
- **Faucet**: https://faucet.flare.network/coston2

### Flare Mainnet
- **Chain ID**: 14
- **RPC**: https://flare-api.flare.network/ext/C/rpc
- **Explorer**: https://flarescan.com/

## Monitoring & Analytics

### Events for Indexing

```solidity
event VerificationRequested(bytes32 indexed requestId, address indexed requester, string prompt, string model, bytes32 fdcRequestId);
event VerificationFulfilled(bytes32 indexed requestId, address indexed requester, string output, bytes32 outputHash, bool verified);
event NFTMinted(bytes32 indexed requestId, address indexed recipient, uint256 tokenId);
```

### Key Metrics
- Total verification requests
- Success rate of FDC attestations
- NFT minting volume
- Fee collection and distribution
- Average verification latency

## Integration Examples

### Frontend Integration

```typescript
import { ethers } from 'ethers';
import VeriAIABI from './abis/VeriAI.json';

const contract = new ethers.Contract(
  VERIAI_CONTRACT_ADDRESS,
  VeriAIABI,
  signer
);

// Request verification
const tx = await contract.requestVerification(
  "What is blockchain?",
  "gpt-4",
  { value: ethers.parseEther("0.01") }
);
```

### Backend Integration

```typescript
// Listen for verification requests
contract.on("VerificationRequested", (requestId, requester, prompt, model) => {
  // Trigger FDC attestation process
  processFDCAttestation(requestId, prompt, model);
});
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Add comprehensive tests
4. Ensure gas optimization
5. Submit pull request with security review

## License

MIT License - see LICENSE file for details.