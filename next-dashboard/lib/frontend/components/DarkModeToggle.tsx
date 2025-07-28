'use client';

/**
 * Dark Mode Toggle Component
 * 
 * A toggle button component that allows users to switch between
 * light and dark themes.
 */

import React from 'react';
import { useTheme } from '@/frontend/context/ThemeContext';
import styles from './DarkModeToggle.module.css';

interface DarkModeToggleProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  disabled?: boolean;
}

export default function DarkModeToggle({
  className = '',
  size = 'medium',
  showLabel = false,
  disabled = false,
}: DarkModeToggleProps) {
  const { state, toggleTheme } = useTheme();

  const handleToggle = () => {
    if (disabled) return;
    toggleTheme();
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${styles[size]} ${state.isDarkMode ? styles.dark : styles.light} ${className}`}
      onClick={handleToggle}
      disabled={disabled}
      title={state.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={state.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-pressed={state.isDarkMode}
    >
      <span className={styles.iconContainer}>
        <span className={`${styles.icon} ${styles.sunIcon}`}>
          ☀️
        </span>
        <span className={`${styles.icon} ${styles.moonIcon}`}>
          🌙
        </span>
      </span>
      
      {showLabel && (
        <span className={styles.label}>
          {state.isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
      
      <span className={styles.slider} />
    </button>
  );
}

// Compact version for smaller spaces
export function CompactDarkModeToggle({
  className = '',
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  return (
    <DarkModeToggle
      className={className}
      size="small"
      showLabel={false}
      disabled={disabled}
    />
  );
}

// Version with label for accessibility
export function LabeledDarkModeToggle({
  className = '',
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  return (
    <DarkModeToggle
      className={className}
      size="medium"
      showLabel={true}
      disabled={disabled}
    />
  );
}
