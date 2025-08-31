import { useState, useEffect, useRef, useCallback } from 'react';
import { APP_CONFIG } from '@/lib/config';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(url?: string, options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef(false);

  const wsUrl = url || `${APP_CONFIG.api.baseUrl.replace('http', 'ws')}/ws`;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    isManuallyClosedRef.current = false;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        setReconnectAttempts(0);
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setConnectionState('disconnected');
        onDisconnect?.();

        // Auto-reconnect if not manually closed
        if (!isManuallyClosedRef.current && reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        setConnectionState('error');
        onError?.(error);
      };
    } catch (error) {
      setConnectionState('error');
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [wsUrl, onMessage, onConnect, onDisconnect, onError, reconnectInterval, maxReconnectAttempts, reconnectAttempts]);

  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
  };
}

// Hook for verification status updates
export function useVerificationWebSocket(verificationId?: string) {
  const [status, setStatus] = useState<string>('pending');
  const [updates, setUpdates] = useState<any[]>([]);

  const { isConnected, sendMessage } = useWebSocket(undefined, {
    onMessage: (message) => {
      if (message.type === 'verification_update') {
        const { id, status: newStatus, data } = message.data;
        if (!verificationId || id === verificationId) {
          setStatus(newStatus);
          setUpdates(prev => [...prev, { ...data, timestamp: message.timestamp }]);
        }
      }
    },
    onConnect: () => {
      if (verificationId) {
        sendMessage({
          type: 'subscribe_verification',
          data: { verificationId }
        });
      }
    }
  });

  const subscribeToVerification = useCallback((id: string) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe_verification',
        data: { verificationId: id }
      });
    }
  }, [isConnected, sendMessage]);

  return {
    status,
    updates,
    isConnected,
    subscribeToVerification,
  };
}

// Hook for AI generation status updates
export function useAIGenerationWebSocket(generationId?: string) {
  const [status, setStatus] = useState<string>('pending');
  const [progress, setProgress] = useState<number>(0);
  const [output, setOutput] = useState<string>('');

  const { isConnected, sendMessage } = useWebSocket(undefined, {
    onMessage: (message) => {
      if (message.type === 'generation_update') {
        const { id, status: newStatus, progress: newProgress, output: newOutput } = message.data;
        if (!generationId || id === generationId) {
          setStatus(newStatus);
          if (newProgress !== undefined) setProgress(newProgress);
          if (newOutput !== undefined) setOutput(newOutput);
        }
      }
    },
    onConnect: () => {
      if (generationId) {
        sendMessage({
          type: 'subscribe_generation',
          data: { generationId }
        });
      }
    }
  });

  const subscribeToGeneration = useCallback((id: string) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe_generation',
        data: { generationId: id }
      });
    }
  }, [isConnected, sendMessage]);

  return {
    status,
    progress,
    output,
    isConnected,
    subscribeToGeneration,
  };
}
