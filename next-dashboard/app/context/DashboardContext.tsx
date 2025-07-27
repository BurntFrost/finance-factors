'use client';

import React, { createContext, useContext, useReducer, ReactNode, useRef } from 'react';
import { DashboardState, DashboardAction, DashboardElement } from '../types/dashboard';

const initialState: DashboardState = {
  elements: [],
  layout: 'stack',
  isLoading: false,
  error: undefined,
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'ADD_ELEMENT':
      return {
        ...state,
        elements: [...state.elements, action.payload],
        error: undefined,
      };

    case 'REMOVE_ELEMENT':
      return {
        ...state,
        elements: state.elements.filter(element => element.id !== action.payload),
        error: undefined,
      };

    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map(element =>
          element.id === action.payload.id
            ? { ...element, ...action.payload.updates, updatedAt: new Date() }
            : element
        ),
        error: undefined,
      };

    case 'REORDER_ELEMENTS':
      return {
        ...state,
        elements: action.payload,
        error: undefined,
      };

    case 'SET_LAYOUT':
      return {
        ...state,
        layout: action.payload,
        error: undefined,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    default:
      return state;
  }
}

interface DashboardContextType {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  addElement: (element: Omit<DashboardElement, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<DashboardElement>) => void;
  reorderElements: (elements: DashboardElement[]) => void;
  setLayout: (layout: 'grid' | 'stack') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const elementCounterRef = useRef(0);

  const addElement = (element: Omit<DashboardElement, 'id' | 'createdAt' | 'updatedAt'>) => {
    elementCounterRef.current += 1;
    const newElement: DashboardElement = {
      ...element,
      id: `element_${elementCounterRef.current}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Default to historical data unless explicitly specified
      isRealData: element.isRealData ?? false,
      dataSource: element.dataSource ?? 'Historical Data Generator'
    };
    dispatch({ type: 'ADD_ELEMENT', payload: newElement });
  };

  const removeElement = (id: string) => {
    dispatch({ type: 'REMOVE_ELEMENT', payload: id });
  };

  const updateElement = (id: string, updates: Partial<DashboardElement>) => {
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } });
  };

  const reorderElements = (elements: DashboardElement[]) => {
    dispatch({ type: 'REORDER_ELEMENTS', payload: elements });
  };

  const setLayout = (layout: 'grid' | 'stack') => {
    dispatch({ type: 'SET_LAYOUT', payload: layout });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | undefined) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const contextValue: DashboardContextType = {
    state,
    dispatch,
    addElement,
    removeElement,
    updateElement,
    reorderElements,
    setLayout,
    setLoading,
    setError,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
