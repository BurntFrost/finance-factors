'use client';

import { ChartData } from '../types/dashboard';

export interface WebSocketMessage {
  type: 'data_update' | 'status_update' | 'error' | 'connection_status';
  payload: any;
  timestamp: number;
  dataType?: string;
  source?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private listeners: Map<string, Set<(message: WebSocketMessage) => void>> = new Map();
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setStatus('connecting');

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.setStatus('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          this.setStatus('disconnected');
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.setStatus('error');
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        this.setStatus('error');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Subscribe to messages for a specific data type
   */
  subscribe(dataType: string, callback: (message: WebSocketMessage) => void): () => void {
    if (!this.listeners.has(dataType)) {
      this.listeners.set(dataType, new Set());
    }

    this.listeners.get(dataType)!.add(callback);

    // Send subscription message to server
    this.send({
      type: 'subscribe',
      payload: { dataType },
      timestamp: Date.now(),
    });

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(dataType);
      if (typeListeners) {
        typeListeners.delete(callback);
        if (typeListeners.size === 0) {
          this.listeners.delete(dataType);
          // Send unsubscribe message to server
          this.send({
            type: 'unsubscribe',
            payload: { dataType },
            timestamp: Date.now(),
          });
        }
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(callback);
    
    // Immediately call with current status
    callback(this.status);

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Send message to WebSocket server
   */
  private send(message: Partial<WebSocketMessage>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Notify specific data type listeners
    if (message.dataType) {
      const typeListeners = this.listeners.get(message.dataType);
      if (typeListeners) {
        typeListeners.forEach(callback => callback(message));
      }
    }

    // Notify all listeners for certain message types
    if (message.type === 'connection_status' || message.type === 'error') {
      this.listeners.forEach(typeListeners => {
        typeListeners.forEach(callback => callback(message));
      });
    }
  }

  /**
   * Set connection status and notify listeners
   */
  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach(callback => callback(status));
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // Reconnection failed, will be handled by onclose
      });
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: 'ping',
        payload: {},
        timestamp: Date.now(),
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }
}

/**
 * Default WebSocket configuration
 */
const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.NODE_ENV === 'production' 
    ? 'wss://finance-factors.vercel.app/api/ws'
    : 'ws://localhost:3000/api/ws',
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
};

/**
 * Singleton WebSocket service instance
 */
let websocketService: WebSocketService | null = null;

/**
 * Get or create WebSocket service instance
 */
export function getWebSocketService(config?: Partial<WebSocketConfig>): WebSocketService {
  if (!websocketService) {
    websocketService = new WebSocketService({ ...DEFAULT_CONFIG, ...config });
  }
  return websocketService;
}

/**
 * Hook for using WebSocket in React components
 */
export function useWebSocket(dataType: string) {
  const [data, setData] = React.useState<ChartData | null>(null);
  const [status, setStatus] = React.useState<WebSocketStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ws = getWebSocketService();
    
    // Subscribe to status changes
    const unsubscribeStatus = ws.onStatusChange(setStatus);

    // Subscribe to data updates
    const unsubscribeData = ws.subscribe(dataType, (message) => {
      switch (message.type) {
        case 'data_update':
          setData(message.payload);
          setLastUpdate(new Date(message.timestamp));
          setError(null);
          break;
        case 'error':
          setError(message.payload.message || 'WebSocket error');
          break;
      }
    });

    // Connect if not already connected
    if (!ws.isConnected()) {
      ws.connect().catch((error) => {
        setError(error.message || 'Failed to connect');
      });
    }

    return () => {
      unsubscribeStatus();
      unsubscribeData();
    };
  }, [dataType]);

  const reconnect = React.useCallback(() => {
    const ws = getWebSocketService();
    ws.disconnect();
    ws.connect().catch((error) => {
      setError(error.message || 'Failed to reconnect');
    });
  }, []);

  return {
    data,
    status,
    lastUpdate,
    error,
    reconnect,
    isConnected: status === 'connected',
  };
}

// Import React for the hook
import React from 'react';
