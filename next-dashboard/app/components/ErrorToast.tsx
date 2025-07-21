'use client';

import React, { useEffect, useState } from 'react';
import styles from './ErrorToast.module.css';

interface ErrorToastProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  showDetails?: boolean;
}

export default function ErrorToast({
  message,
  type = 'error',
  duration = 8000,
  onClose,
  showDetails = false,
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showFullMessage, setShowFullMessage] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Wait for fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  const isCorsError = message.includes('CORS');
  const shortMessage = isCorsError 
    ? 'API access blocked (CORS policy)' 
    : message.length > 80 
      ? `${message.substring(0, 80)}...` 
      : message;

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`${styles.toast} ${styles[type]} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.icon}>{getIcon()}</span>
          <span className={styles.message}>
            {showFullMessage ? message : shortMessage}
          </span>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
        
        {(showDetails || isCorsError) && (
          <div className={styles.details}>
            {isCorsError && (
              <div className={styles.corsHelp}>
                <p>This is expected for GitHub Pages deployment.</p>
                <p>
                  <strong>Solution:</strong> Switch to "Sample Data" mode or 
                  deploy with proper server support.
                </p>
                <p>
                  <small>See CORS_AND_API_SETUP.md for details.</small>
                </p>
              </div>
            )}
            
            {message.length > 80 && (
              <button
                className={styles.toggleButton}
                onClick={() => setShowFullMessage(!showFullMessage)}
              >
                {showFullMessage ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
