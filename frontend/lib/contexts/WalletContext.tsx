import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { APP_CONFIG } from '@/lib/config';
import { toast } from 'sonner';

interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address?: string;
  
  // Network state
  chainId?: number;
  isCorrectNetwork: boolean;
  
  // Balance
  balance?: bigint;
  formattedBalance?: string;
  
  // Actions
  switchToCorrectNetwork: () => Promise<void>;
  
  // Status
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  
  const { data: balanceData } = useBalance({
    address,
    chainId: APP_CONFIG.blockchain.chainId,
  });

  const isCorrectNetwork = chainId === APP_CONFIG.blockchain.chainId;

  useEffect(() => {
    if (isConnecting) {
      setConnectionStatus('connecting');
    } else if (isReconnecting) {
      setConnectionStatus('reconnecting');
    } else if (isConnected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnecting, isReconnecting, isConnected]);

  useEffect(() => {
    if (isConnected && !isCorrectNetwork) {
      toast.error(
        `Please switch to ${APP_CONFIG.blockchain.name}`,
        {
          description: `Current network is not supported. Switch to ${APP_CONFIG.blockchain.name} to continue.`,
          action: {
            label: 'Switch Network',
            onClick: () => switchToCorrectNetwork(),
          },
        }
      );
    }
  }, [isConnected, isCorrectNetwork]);

  const switchToCorrectNetwork = async () => {
    try {
      await switchChain({ chainId: APP_CONFIG.blockchain.chainId });
      toast.success(`Switched to ${APP_CONFIG.blockchain.name}`);
    } catch (error) {
      console.error('Failed to switch network:', error);
      toast.error('Failed to switch network', {
        description: 'Please manually switch to the correct network in your wallet.',
      });
    }
  };

  const value: WalletContextType = {
    isConnected,
    isConnecting,
    address,
    chainId,
    isCorrectNetwork,
    balance: balanceData?.value,
    formattedBalance: balanceData?.formatted,
    switchToCorrectNetwork,
    connectionStatus,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Enhanced wallet hooks
export function useWalletActions() {
  const { address, isConnected } = useAccount();
  const { switchToCorrectNetwork, isCorrectNetwork } = useWallet();

  const requireConnection = (action: string = 'perform this action') => {
    if (!isConnected) {
      toast.error('Wallet not connected', {
        description: `Please connect your wallet to ${action}.`,
      });
      return false;
    }
    return true;
  };

  const requireCorrectNetwork = (action: string = 'perform this action') => {
    if (!isCorrectNetwork) {
      toast.error('Wrong network', {
        description: `Please switch to ${APP_CONFIG.blockchain.name} to ${action}.`,
        action: {
          label: 'Switch Network',
          onClick: () => switchToCorrectNetwork(),
        },
      });
      return false;
    }
    return true;
  };

  const requireWallet = (action: string = 'perform this action') => {
    return requireConnection(action) && requireCorrectNetwork(action);
  };

  return {
    address,
    isConnected,
    isCorrectNetwork,
    requireConnection,
    requireCorrectNetwork,
    requireWallet,
    switchToCorrectNetwork,
  };
}
