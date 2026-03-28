'use client';

/**
 * View Mode Context
 *
 * This module provides React context for managing view mode state across the application.
 * It handles switching between different view modes like 'edit', 'live', and 'preview'.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export type ViewMode = 'edit' | 'live' | 'preview' | 'investments';

export interface ViewModeState {
  currentMode: ViewMode;
  isLiveViewMode: boolean;
  isEditMode: boolean;
  isPreviewMode: boolean;
  isInvestmentsMode: boolean;
  lastChanged: Date | null;
}

export interface ViewModeContextType {
  state: ViewModeState;
  setViewMode: (mode: ViewMode) => void;
  toggleLiveMode: () => void;
  toggleEditMode: () => void;
  setLiveMode: () => void;
  setEditMode: () => void;
  setPreviewMode: () => void;
}

// Create context
const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

// Custom hook to use the context
export function useViewMode(): ViewModeContextType {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

// Helper function to create state from mode
function createStateFromMode(mode: ViewMode, includeTimestamp: boolean = false): ViewModeState {
  return {
    currentMode: mode,
    isLiveViewMode: mode === 'live',
    isEditMode: mode === 'edit',
    isPreviewMode: mode === 'preview',
    isInvestmentsMode: mode === 'investments',
    lastChanged: includeTimestamp ? new Date() : null,
  };
}

// Local storage key for persisting view mode
const VIEW_MODE_STORAGE_KEY = 'finance-dashboard-view-mode';

// Provider component
export function ViewModeProvider({ children }: { children: ReactNode }) {
  // Initialize state with default mode (always start with 'live' to avoid hydration issues)
  const [state, setState] = useState<ViewModeState>(() => createStateFromMode('live'));
  // Load from localStorage after hydration to prevent hydration mismatches
  /* eslint-disable react-hooks/set-state-in-effect -- syncing view mode from localStorage after hydration */
  useEffect(() => {
    // Try to load from localStorage on client side after hydration
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved) {
        const savedMode = JSON.parse(saved) as ViewMode;
        if (['edit', 'live', 'preview', 'investments'].includes(savedMode)) {
          setState(createStateFromMode(savedMode, false)); // Don't include timestamp during hydration
        }
      } else {
        // If no saved preference, default to 'live' mode
        setState(createStateFromMode('live', false));
      }
    } catch (error) {
      console.warn('Failed to load view mode from localStorage:', error);
      // On error, ensure we default to 'live' mode
      setState(createStateFromMode('live', false));
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Set view mode
  const setViewMode = useCallback((mode: ViewMode) => {
    setState(createStateFromMode(mode, true)); // Include timestamp when actively changing mode

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, JSON.stringify(mode));
      } catch (error) {
        console.warn('Failed to save view mode to localStorage:', error);
      }
    }
  }, []);

  // Toggle between live and edit modes
  const toggleLiveMode = useCallback(() => {
    const newMode = state.currentMode === 'live' ? 'edit' : 'live';
    setViewMode(newMode);
  }, [state.currentMode, setViewMode]);

  // Toggle between edit and preview modes
  const toggleEditMode = useCallback(() => {
    const newMode = state.currentMode === 'edit' ? 'preview' : 'edit';
    setViewMode(newMode);
  }, [state.currentMode, setViewMode]);

  // Specific mode setters
  const setLiveMode = useCallback(() => setViewMode('live'), [setViewMode]);
  const setEditMode = useCallback(() => setViewMode('edit'), [setViewMode]);
  const setPreviewMode = useCallback(() => setViewMode('preview'), [setViewMode]);

  // Context value
  const contextValue: ViewModeContextType = {
    state,
    setViewMode,
    toggleLiveMode,
    toggleEditMode,
    setLiveMode,
    setEditMode,
    setPreviewMode,
  };

  return (
    <ViewModeContext.Provider value={contextValue}>
      {children}
    </ViewModeContext.Provider>
  );
}

// Export the context for direct access if needed
export { ViewModeContext };

// Hook for checking specific view modes
export function useIsLiveViewMode(): boolean {
  const { state } = useViewMode();
  return state.isLiveViewMode;
}

export function useIsEditMode(): boolean {
  const { state } = useViewMode();
  return state.isEditMode;
}

export function useIsPreviewMode(): boolean {
  const { state } = useViewMode();
  return state.isPreviewMode;
}

// Hook for view mode controls
export function useViewModeControls() {
  const {
    setViewMode,
    toggleLiveMode,
    toggleEditMode,
    setLiveMode,
    setEditMode,
    setPreviewMode,
  } = useViewMode();

  return {
    setViewMode,
    toggleLiveMode,
    toggleEditMode,
    setLiveMode,
    setEditMode,
    setPreviewMode,
  };
}
