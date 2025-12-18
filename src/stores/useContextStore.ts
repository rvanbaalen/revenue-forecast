/**
 * Context Store - Workspace management
 *
 * Manages contexts (workspaces) and the active context selection.
 * Contexts are the top-level organizational unit for financial data.
 */

import { create } from 'zustand';
import type { Context } from '../types';
import {
  DEFAULT_CURRENCY,
  DEFAULT_INCOME_SUBCATEGORIES,
  DEFAULT_EXPENSE_SUBCATEGORIES,
} from '../types';
import { db } from '../store/db';

interface ContextState {
  contexts: Context[];
  activeContextId: string | null;
}

interface ContextActions {
  // Data loading
  loadContexts: () => Promise<void>;
  setContexts: (contexts: Context[]) => void;

  // Active context
  setActiveContext: (id: string | null) => void;

  // CRUD operations
  createContext: (name: string, currency?: string) => Promise<Context>;
  updateContext: (context: Context) => Promise<void>;
  deleteContext: (id: string) => Promise<void>;
}

type ContextStore = ContextState & ContextActions;

export const useContextStore = create<ContextStore>((set, get) => ({
  // State
  contexts: [],
  activeContextId: null,

  // Data loading
  loadContexts: async () => {
    const contexts = await db.getContexts();
    const { activeContextId } = get();

    set({
      contexts,
      // Set first context as active if none selected
      activeContextId: activeContextId || (contexts.length > 0 ? contexts[0].id : null),
    });
  },

  setContexts: (contexts) => set({ contexts }),

  // Active context
  setActiveContext: (id) => set({ activeContextId: id }),

  // CRUD operations
  createContext: async (name, currency = DEFAULT_CURRENCY) => {
    const context: Context = {
      id: crypto.randomUUID(),
      name,
      currency,
      createdAt: new Date().toISOString(),
    };

    await db.addContext(context);

    // Initialize default subcategories for this context
    await db.initDefaultSubcategories(
      context.id,
      DEFAULT_INCOME_SUBCATEGORIES,
      DEFAULT_EXPENSE_SUBCATEGORIES
    );

    set((state) => ({
      contexts: [...state.contexts, context],
      // Set as active if it's the first context
      activeContextId: state.activeContextId || context.id,
    }));

    return context;
  },

  updateContext: async (context) => {
    await db.updateContext(context);
    set((state) => ({
      contexts: state.contexts.map((c) =>
        c.id === context.id ? context : c
      ),
    }));
  },

  deleteContext: async (id) => {
    await db.deleteContext(id);
    const { contexts, activeContextId } = get();
    const remaining = contexts.filter((c) => c.id !== id);

    set({
      contexts: remaining,
      // Select another context if we deleted the active one
      activeContextId:
        activeContextId === id
          ? remaining.length > 0
            ? remaining[0].id
            : null
          : activeContextId,
    });
  },
}));

// Selectors
export const selectContexts = (state: ContextStore) => state.contexts;
export const selectActiveContextId = (state: ContextStore) => state.activeContextId;
export const selectActiveContext = (state: ContextStore) =>
  state.contexts.find((c) => c.id === state.activeContextId) || null;
