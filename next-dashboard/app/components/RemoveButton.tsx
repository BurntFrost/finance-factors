'use client';

import React from 'react';

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
      className={`${sizeClasses[size]} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: '#ef4444',
        color: 'white',
        border: '1px solid #dc2626',
        borderRadius: '0.375rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
      }}
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
