'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import ErrorToast from './ErrorToast';

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  duration?: number;
  showDetails?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], options?: { duration?: number; showDetails?: boolean }) => void;
  showCorsError: (message: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounterRef = useRef(0);

  const showToast = useCallback((
    message: string,
    type: Toast['type'] = 'error',
    options: { duration?: number; showDetails?: boolean } = {}
  ) => {
    toastCounterRef.current += 1;
    const id = `toast_${toastCounterRef.current}`;
    const newToast: Toast = {
      id,
      message,
      type,
      duration: options.duration,
      showDetails: options.showDetails,
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const showCorsError = useCallback((message: string) => {
    showToast(message, 'warning', { 
      duration: 10000, // Longer duration for CORS errors
      showDetails: true 
    });
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    showCorsError,
    clearToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 1000 }}>
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              marginBottom: '10px',
              transform: `translateY(${index * 10}px)`,
            }}
          >
            <ErrorToast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              showDetails={toast.showDetails}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
