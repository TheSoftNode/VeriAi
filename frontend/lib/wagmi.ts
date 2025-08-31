import { createConfig, http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { APP_CONFIG } from './config';

// Define Coston2 testnet chain using viem's defineChain
export const coston2 = defineChain({
  id: 114,
  name: 'Coston2 Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/bc/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Coston2 Explorer',
      url: 'https://coston2.testnet.flarescan.com',
    },
  },
  testnet: true,
});

// Create wagmi config using RainbowKit's getDefaultConfig
export const config = getDefaultConfig({
  appName: APP_CONFIG.name,
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'your-project-id',
  chains: [coston2],
  transports: {
    [coston2.id]: http(APP_CONFIG.blockchain.rpcUrl),
  },
});

export { coston2 as chains };
