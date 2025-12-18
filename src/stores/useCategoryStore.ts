/**
 * Category Store - Subcategory and mapping rule management
 *
 * Manages subcategories for transaction categorization and
 * mapping rules for automatic categorization.
 */

import { create } from 'zustand';
import type { Subcategory, MappingRule, Transaction } from '../types';
import { db } from '../store/db';

interface CategoryState {
  subcategories: Subcategory[];
  mappingRules: MappingRule[];
}

interface CategoryActions {
  // Data loading
  loadSubcategories: () => Promise<void>;
  loadMappingRules: () => Promise<void>;
  setSubcategories: (subcategories: Subcategory[]) => void;
  setMappingRules: (mappingRules: MappingRule[]) => void;

  // Subcategory CRUD
  addSubcategory: (
    contextId: string,
    name: string,
    type: 'income' | 'expense'
  ) => Promise<Subcategory>;
  deleteSubcategory: (id: string) => Promise<void>;

  // Mapping Rule CRUD
  addMappingRule: (rule: Omit<MappingRule, 'id' | 'createdAt'>) => Promise<MappingRule>;
  updateMappingRule: (rule: MappingRule) => Promise<void>;
  deleteMappingRule: (id: string) => Promise<void>;

  // Rule application
  applyMappingRules: (
    contextId: string,
    transactions: Transaction[],
    accounts: { id: string; contextId: string }[],
    onTransactionsUpdated: (transactions: Transaction[]) => Promise<void>
  ) => Promise<number>;
}

type CategoryStore = CategoryState & CategoryActions;

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  // State
  subcategories: [],
  mappingRules: [],

  // Data loading
  loadSubcategories: async () => {
    const subcategories = await db.getSubcategories();
    set({ subcategories });
  },

  loadMappingRules: async () => {
    const mappingRules = await db.getMappingRules();
    set({ mappingRules });
  },

  setSubcategories: (subcategories) => set({ subcategories }),
  setMappingRules: (mappingRules) => set({ mappingRules }),

  // Subcategory CRUD
  addSubcategory: async (contextId, name, type) => {
    const subcategory: Subcategory = {
      id: crypto.randomUUID(),
      contextId,
      name,
      type,
      createdAt: new Date().toISOString(),
    };

    await db.addSubcategory(subcategory);
    set((state) => ({
      subcategories: [...state.subcategories, subcategory],
    }));

    return subcategory;
  },

  deleteSubcategory: async (id) => {
    await db.deleteSubcategory(id);
    set((state) => ({
      subcategories: state.subcategories.filter((s) => s.id !== id),
    }));
  },

  // Mapping Rule CRUD
  addMappingRule: async (rule) => {
    const fullRule: MappingRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    await db.addMappingRule(fullRule);
    set((state) => ({
      mappingRules: [...state.mappingRules, fullRule],
    }));

    return fullRule;
  },

  updateMappingRule: async (rule) => {
    await db.updateMappingRule(rule);
    set((state) => ({
      mappingRules: state.mappingRules.map((r) =>
        r.id === rule.id ? rule : r
      ),
    }));
  },

  deleteMappingRule: async (id) => {
    await db.deleteMappingRule(id);
    set((state) => ({
      mappingRules: state.mappingRules.filter((r) => r.id !== id),
    }));
  },

  // Rule application
  applyMappingRules: async (contextId, transactions, accounts, onTransactionsUpdated) => {
    const { mappingRules } = get();

    const contextAccountIds = new Set(
      accounts.filter((a) => a.contextId === contextId).map((a) => a.id)
    );

    const uncategorizedTx = transactions.filter(
      (t) => contextAccountIds.has(t.accountId) && t.category === 'uncategorized'
    );

    const rules = mappingRules
      .filter((r) => r.contextId === contextId && r.isActive)
      .sort((a, b) => b.priority - a.priority);

    const updatedTransactions: Transaction[] = [];

    for (const tx of uncategorizedTx) {
      for (const rule of rules) {
        const textToMatch =
          rule.matchField === 'both'
            ? `${tx.name} ${tx.memo}`
            : rule.matchField === 'memo'
              ? tx.memo
              : tx.name;

        let matches = false;

        switch (rule.patternType) {
          case 'exact':
            matches = textToMatch.toLowerCase() === rule.pattern.toLowerCase();
            break;
          case 'contains':
            matches = textToMatch.toLowerCase().includes(rule.pattern.toLowerCase());
            break;
          case 'regex':
            try {
              matches = new RegExp(rule.pattern, 'i').test(textToMatch);
            } catch {
              matches = false;
            }
            break;
        }

        if (matches) {
          updatedTransactions.push({
            ...tx,
            category: rule.category,
            subcategory: rule.subcategory,
            incomeType: rule.incomeType,
          });
          break; // Stop after first match
        }
      }
    }

    if (updatedTransactions.length > 0) {
      await onTransactionsUpdated(updatedTransactions);
    }

    return updatedTransactions.length;
  },
}));

// Selectors
export const selectSubcategories = (state: CategoryStore) => state.subcategories;
export const selectMappingRules = (state: CategoryStore) => state.mappingRules;

export const selectSubcategoriesByContext = (contextId: string | null) => (state: CategoryStore) =>
  contextId ? state.subcategories.filter((s) => s.contextId === contextId) : [];

export const selectMappingRulesByContext = (contextId: string | null) => (state: CategoryStore) =>
  contextId ? state.mappingRules.filter((r) => r.contextId === contextId) : [];

export const selectActiveRulesByContext = (contextId: string | null) => (state: CategoryStore) =>
  contextId
    ? state.mappingRules
        .filter((r) => r.contextId === contextId && r.isActive)
        .sort((a, b) => b.priority - a.priority)
    : [];
