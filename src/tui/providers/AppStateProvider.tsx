// src/tui/providers/AppStateProvider.tsx
import React, { createContext, useContext, useReducer } from 'react';
import { TuiState, TuiAction } from '../types.js';
import { tuiReducer, INITIAL_STATE } from '../state/reducer.js';

interface AppStateContextProps {
  state: TuiState;
  dispatch: React.Dispatch<TuiAction>;
}

const AppStateContext = createContext<AppStateContextProps | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tuiReducer, INITIAL_STATE);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextProps => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
