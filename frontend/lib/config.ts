export const APP_CONFIG = {
  name: 'VeriAI',
  description: 'On-Chain Verification for AI-Generated Content',
  url: 'https://veriai.app',
  version: '1.0.0',
  
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    timeout: 30000,
  },
  
  // Smart Contract Configuration
  contracts: {
    veriAI: process.env.NEXT_PUBLIC_VERI_AI_CONTRACT_ADDRESS || '0x7F158983dE8dF048045002AD6838572DF09a6591',
    veriAINFT: process.env.NEXT_PUBLIC_VERI_AI_NFT_CONTRACT_ADDRESS || '0x8AcEfA0b05D87c7a9b09F9a8F1A05dB5E8129332',
    fdcRelayer: process.env.NEXT_PUBLIC_FDC_RELAYER_CONTRACT_ADDRESS || '0xc611A81DD15b9F20459E4a347B35fD5Df19f7B32',
  },
  
  // Blockchain Configuration
  blockchain: {
    chainId: 114, // Coston2
    name: 'Coston2 Testnet',
    rpcUrl: 'https://coston2-api.flare.network/ext/bc/C/rpc',
    explorerUrl: 'https://coston2.testnet.flarescan.com',
    nativeCurrency: {
      name: 'Coston2 Flare',
      symbol: 'C2FLR',
      decimals: 18,
    },
  },
  
  // AI Models
  models: {
    gemini: 'gemini-1.5-flash',
    openai: 'gpt-3.5-turbo',
    claude: 'claude-3-haiku',
  },
  
  // UI Configuration
  ui: {
    maxPromptLength: 2000,
    maxOutputDisplay: 1000,
    animationDuration: 300,
    pollingInterval: 2000,
  },
  
  // Feature Flags
  features: {
    analytics: true,
    notifications: true,
    darkMode: true,
    batching: true,
  },
} as const;

export const VERIFICATION_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  VERIFIED: 'verified',
  CHALLENGED: 'challenged',
  REJECTED: 'rejected',
} as const;

export const AI_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
] as const;
