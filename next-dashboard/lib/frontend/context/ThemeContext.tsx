'use client';

/**
 * Theme Context
 *
 * This module provides React context for managing theme state across the application.
 * It handles switching between light and dark themes with localStorage persistence.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeState {
  currentTheme: Theme;
  isDarkMode: boolean;
  isLightMode: boolean;
  lastChanged: Date | null;
}

export interface ThemeContextType {
  state: ThemeState;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLightMode: () => void;
  setDarkMode: () => void;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use the context
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper function to create state from theme
function createStateFromTheme(theme: Theme, includeTimestamp: boolean = false): ThemeState {
  return {
    currentTheme: theme,
    isDarkMode: theme === 'dark',
    isLightMode: theme === 'light',
    lastChanged: includeTimestamp ? new Date() : null,
  };
}

// Local storage key for persisting theme
const THEME_STORAGE_KEY = 'finance-dashboard-theme';

// Helper function to detect system preference
function getSystemPreference(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light'; // Default fallback
}

// Helper function to apply theme to document
function applyThemeToDocument(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    // Also update the class for compatibility
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }
}

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize state with system preference or light mode
  const [state, setState] = useState<ThemeState>(() => {
    // Start with light mode to avoid hydration issues
    return createStateFromTheme('light');
  });
  // Load from localStorage after hydration to prevent hydration mismatches
  /* eslint-disable react-hooks/set-state-in-effect -- syncing theme state from localStorage after hydration */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      let themeToApply: Theme;

      if (saved && (saved === 'light' || saved === 'dark')) {
        themeToApply = saved as Theme;
      } else {
        // If no saved preference, use system preference
        themeToApply = getSystemPreference();
      }

      setState(createStateFromTheme(themeToApply, false));
      applyThemeToDocument(themeToApply);
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
      // On error, use system preference
      const systemTheme = getSystemPreference();
      setState(createStateFromTheme(systemTheme, false));
      applyThemeToDocument(systemTheme);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Set theme
  const setTheme = useCallback((theme: Theme) => {
    setState(createStateFromTheme(theme, true)); // Include timestamp when actively changing theme
    applyThemeToDocument(theme);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error);
      }
    }
  }, []);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    const newTheme = state.currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [state.currentTheme, setTheme]);

  // Specific theme setters
  const setLightMode = useCallback(() => setTheme('light'), [setTheme]);
  const setDarkMode = useCallback(() => setTheme('dark'), [setTheme]);

  // Context value
  const contextValue: ThemeContextType = {
    state,
    setTheme,
    toggleTheme,
    setLightMode,
    setDarkMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Export the context for direct access if needed
export { ThemeContext };

// Hook for checking specific themes
export function useIsDarkMode(): boolean {
  const { state } = useTheme();
  return state.isDarkMode;
}

export function useIsLightMode(): boolean {
  const { state } = useTheme();
  return state.isLightMode;
}

// Hook for theme controls
export function useThemeControls() {
  const {
    setTheme,
    toggleTheme,
    setLightMode,
    setDarkMode,
  } = useTheme();

  return {
    setTheme,
    toggleTheme,
    setLightMode,
    setDarkMode,
  };
}
