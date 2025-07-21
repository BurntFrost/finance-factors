'use client';

import React from 'react';
import styles from './LazyChart.module.css';

interface RemoveButtonProps {
  onClick: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
  confirmAction?: boolean;
}

export default function RemoveButton({
  onClick,
  disabled = false,
  size = 'medium',
  showText = true,
  className = '',
  confirmAction = true
}: RemoveButtonProps) {
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-4 py-2',
    large: 'text-base px-6 py-3'
  };

  const iconSizes = {
    small: '12px',
    medium: '14px',
    large: '16px'
  };

  const handleClick = () => {
    if (confirmAction) {
      if (window.confirm('Are you sure you want to remove this item?')) {
        onClick();
      }
    } else {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${styles.removeButton} ${sizeClasses[size]} ${className}`}
      aria-label="Remove item"
      title="Remove this item"
    >
      <span style={{ fontSize: iconSizes[size] }}>
        🗑️
      </span>
      {showText && <span>Remove</span>}
    </button>
  );
}
