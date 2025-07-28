'use client';

import React, { useState, useEffect } from 'react';
import { WebSocketStatus, getWebSocketService } from '../services/websocketService';
import styles from './RealTimeStatusIndicator.module.css';

interface RealTimeStatusIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showDetails?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export default function RealTimeStatusIndicator({
  position = 'top-right',
  showDetails = false,
  autoHide = false,
  autoHideDelay = 3000,
}: RealTimeStatusIndicatorProps) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [connectionCount, setConnectionCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  useEffect(() => {
    const ws = getWebSocketService();
    
    // Subscribe to status changes
    const unsubscribe = ws.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setLastUpdate(new Date());
      
      // Show indicator when status changes
      if (autoHide) {
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), autoHideDelay);
      }
    });

    // Subscribe to status updates for connection details
    const unsubscribeStatus = ws.subscribe('status_update', (message) => {
      if (message.type === 'status_update') {
        setConnectionCount(message.payload.activeConnections || 0);
        setSubscriptionCount(message.payload.activeSubscriptions || 0);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeStatus();
    };
  }, [autoHide, autoHideDelay]);

  const getStatusConfig = (status: WebSocketStatus) => {
    switch (status) {
      case 'connected':
        return {
          icon: '🟢',
          label: 'Live',
          color: '#10b981',
          description: 'Real-time data connection active',
        };
      case 'connecting':
        return {
          icon: '🟡',
          label: 'Connecting',
          color: '#f59e0b',
          description: 'Establishing real-time connection',
        };
      case 'reconnecting':
        return {
          icon: '🟠',
          label: 'Reconnecting',
          color: '#f97316',
          description: 'Attempting to restore connection',
        };
      case 'disconnected':
        return {
          icon: '🔴',
          label: 'Offline',
          color: '#ef4444',
          description: 'Real-time updates unavailable',
        };
      case 'error':
        return {
          icon: '❌',
          label: 'Error',
          color: '#dc2626',
          description: 'Connection error occurred',
        };
      default:
        return {
          icon: '❓',
          label: 'Unknown',
          color: '#6b7280',
          description: 'Connection status unknown',
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  const handleReconnect = () => {
    const ws = getWebSocketService();
    ws.disconnect();
    ws.connect().catch(console.error);
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  if (autoHide && !isVisible) {
    return null;
  }

  return (
    <div 
      className={`${styles.indicator} ${styles[position]} ${styles[status]}`}
      title={statusConfig.description}
    >
      <div className={styles.statusIcon}>
        {statusConfig.icon}
      </div>
      
      <div className={styles.statusContent}>
        <div className={styles.statusLabel}>
          {statusConfig.label}
        </div>
        
        {showDetails && (
          <div className={styles.statusDetails}>
            {lastUpdate && (
              <div className={styles.lastUpdate}>
                Updated {formatLastUpdate(lastUpdate)}
              </div>
            )}
            
            {status === 'connected' && (
              <div className={styles.connectionInfo}>
                <div className={styles.connectionStat}>
                  Connections: {connectionCount}
                </div>
                <div className={styles.connectionStat}>
                  Subscriptions: {subscriptionCount}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reconnect button for error states */}
      {(status === 'error' || status === 'disconnected') && (
        <button
          className={styles.reconnectButton}
          onClick={handleReconnect}
          title="Reconnect to real-time data"
        >
          🔄
        </button>
      )}

      {/* Pulse animation for connecting states */}
      {(status === 'connecting' || status === 'reconnecting') && (
        <div className={styles.pulseAnimation} />
      )}
    </div>
  );
}

/**
 * Compact version of the real-time status indicator
 */
interface CompactStatusIndicatorProps {
  className?: string;
  onClick?: () => void;
}

export function CompactRealTimeStatusIndicator({ 
  className = '', 
  onClick 
}: CompactStatusIndicatorProps) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');

  useEffect(() => {
    const ws = getWebSocketService();
    const unsubscribe = ws.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const statusConfig = {
    connected: { icon: '🟢', label: 'Live' },
    connecting: { icon: '🟡', label: 'Connecting' },
    reconnecting: { icon: '🟠', label: 'Reconnecting' },
    disconnected: { icon: '🔴', label: 'Offline' },
    error: { icon: '❌', label: 'Error' },
  }[status] || { icon: '❓', label: 'Unknown' };

  return (
    <div 
      className={`${styles.compactIndicator} ${styles[status]} ${className}`}
      onClick={onClick}
      title={`Real-time status: ${statusConfig.label}`}
    >
      <span className={styles.compactIcon}>{statusConfig.icon}</span>
      <span className={styles.compactLabel}>{statusConfig.label}</span>
    </div>
  );
}

/**
 * Real-time data counter component
 */
interface RealTimeDataCounterProps {
  dataType: string;
  className?: string;
}

export function RealTimeDataCounter({ dataType, className = '' }: RealTimeDataCounterProps) {
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const ws = getWebSocketService();
    
    const unsubscribe = ws.subscribe(dataType, (message) => {
      if (message.type === 'data_update') {
        setUpdateCount(prev => prev + 1);
        setLastUpdate(new Date(message.timestamp));
      }
    });

    return unsubscribe;
  }, [dataType]);

  return (
    <div className={`${styles.dataCounter} ${className}`}>
      <div className={styles.counterValue}>{updateCount}</div>
      <div className={styles.counterLabel}>Live Updates</div>
      {lastUpdate && (
        <div className={styles.counterTime}>
          {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

/**
 * Hook for using real-time status in components
 */
export function useRealTimeStatus() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const ws = getWebSocketService();
    
    const unsubscribe = ws.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setIsConnected(newStatus === 'connected');
      setLastUpdate(new Date());
    });

    return unsubscribe;
  }, []);

  const reconnect = () => {
    const ws = getWebSocketService();
    ws.disconnect();
    ws.connect().catch(console.error);
  };

  return {
    status,
    isConnected,
    lastUpdate,
    reconnect,
  };
}
