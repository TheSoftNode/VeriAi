# VeriAI Technical Specifications

## System Architecture

### Frontend Application
- **Framework**: Next.js 14+ with TypeScript
- **Styling**: TailwindCSS with custom design system
- **State Management**: Zustand for client state
- **Wallet Integration**: wagmi v2 + viem
- **UI Components**: Radix UI primitives
- **Build Tool**: Turbo for monorepo management

### Smart Contract Layer
- **Language**: Solidity ^0.8.20
- **Development**: Hardhat with TypeScript
- **Testing**: Foundry for comprehensive testing
- **Verification**: Automated contract verification
- **Security**: OpenZeppelin contracts, ReentrancyGuard

### Backend Services
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js for API endpoints
- **Deployment**: Serverless functions (Vercel/AWS Lambda)
- **Environment**: Secure environment variable management
- **Monitoring**: OpenTelemetry integration

## Smart Contract Specifications

### VeriAI Core Contract
```solidity
interface IVeriAI {
    function requestVerification(
        string memory prompt,
        string memory model,
        bytes32 attestationId
    ) external payable returns (bytes32 requestId);
    
    function fulfillVerification(
        bytes32 requestId,
        string memory output,
        bytes memory proof
    ) external;
    
    function verifyOutput(
        bytes32 requestId,
        string memory output
    ) external view returns (bool verified);
}
```

### VeriAI NFT Contract
```solidity
interface IVeriAINFT {
    struct VerificationMetadata {
        string prompt;
        string model;
        string output;
        uint256 timestamp;
        bytes32 proofHash;
        bool verified;
    }
    
    function mint(
        address to,
        VerificationMetadata memory metadata
    ) external returns (uint256 tokenId);
    
    function getVerificationData(
        uint256 tokenId
    ) external view returns (VerificationMetadata memory);
}
```

## API Specifications

### Backend API Endpoints
```typescript
// AI Generation Endpoint
POST /api/generate
{
  prompt: string;
  model: string;
  userAddress: string;
}

// Verification Status
GET /api/verification/:requestId
{
  status: 'pending' | 'completed' | 'failed';
  output?: string;
  proof?: string;
  transactionHash?: string;
}

// User Collections
GET /api/collections/:address
{
  nfts: VerificationNFT[];
  totalCount: number;
}
```

### Frontend API Integration
```typescript
interface VeriAIClient {
  requestVerification(prompt: string, model: string): Promise<VerificationRequest>;
  getVerificationStatus(requestId: string): Promise<VerificationStatus>;
  getUserCollections(address: string): Promise<NFTCollection>;
}
```

## Flare Integration Specifications

### FDC Integration
- **Attestation Type**: Custom VeriAI attestation
- **Data Source**: OpenAI API endpoints
- **Consensus Mechanism**: BitVote-reveal
- **Proof Verification**: Merkle proof validation

### Network Configuration
```typescript
const flareCoston2 = {
  id: 114,
  name: 'Coston2',
  network: 'coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
    },
    public: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Coston2 Explorer',
      url: 'https://coston2.testnet.flarescan.com',
    },
  },
  testnet: true,
}
```

## Security Specifications

### Smart Contract Security
- **Access Control**: Role-based permissions
- **Reentrancy Protection**: ReentrancyGuard
- **Input Validation**: Comprehensive parameter checking
- **Upgrade Pattern**: Transparent proxy pattern
- **Emergency Controls**: Pause functionality

### API Security
- **Authentication**: JWT tokens
- **Rate Limiting**: Express rate limiter
- **Input Sanitization**: Joi validation schemas
- **CORS Configuration**: Strict origin controls
- **Environment Variables**: Secure credential management

### Frontend Security
- **CSP Headers**: Content Security Policy
- **XSS Protection**: Input sanitization
- **HTTPS Only**: Secure communication
- **Wallet Security**: Secure connection patterns

## Performance Requirements

### Response Times
- **Frontend Loading**: < 2 seconds initial load
- **API Responses**: < 5 seconds for generation
- **FDC Verification**: < 30 seconds for consensus
- **Transaction Confirmation**: < 15 seconds on Coston2

### Scalability
- **Concurrent Users**: 100+ simultaneous users
- **Request Throughput**: 50+ verifications per minute
- **Storage**: Efficient IPFS integration for metadata

## Monitoring & Observability

### Metrics Collection
- **Business Metrics**: Verification success rate, user engagement
- **Technical Metrics**: API latency, contract gas usage
- **Security Metrics**: Failed verification attempts, rate limiting hits

### Logging Strategy
- **Structured Logging**: JSON format with correlation IDs
- **Error Tracking**: Comprehensive error reporting
- **Audit Logs**: All verification attempts logged

## Deployment Specifications

### Environment Strategy
- **Development**: Local hardhat network + testnet
- **Staging**: Coston2 testnet full deployment
- **Production**: Flare mainnet deployment

### Infrastructure as Code
- **Smart Contracts**: Hardhat deployment scripts
- **Frontend**: Vercel deployment configuration
- **Backend**: Serverless function definitions
- **Monitoring**: OpenTelemetry configuration