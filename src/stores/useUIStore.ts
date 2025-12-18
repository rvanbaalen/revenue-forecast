/**
 * UI Store - Global UI state management
 *
 * Manages application-wide UI state like loading states and errors.
 * This is intentionally minimal - most UI state should be local to components.
 */

import { create } from 'zustand';

interface UIState {
  isLoading: boolean;
  error: string | null;
}

interface UIActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  // State
  isLoading: true,
  error: null,

  // Actions
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

// Selectors
export const selectIsLoading = (state: UIStore) => state.isLoading;
export const selectError = (state: UIStore) => state.error;
