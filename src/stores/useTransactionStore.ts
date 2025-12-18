/**
 * Transaction Store - Transaction management
 *
 * Manages transactions imported from bank accounts.
 * Provides operations for categorization and bulk updates.
 */

import { create } from 'zustand';
import type { Transaction } from '../types';
import { db } from '../store/db';

interface TransactionState {
  transactions: Transaction[];
}

interface TransactionActions {
  // Data loading
  loadTransactions: () => Promise<void>;
  setTransactions: (transactions: Transaction[]) => void;

  // CRUD operations
  updateTransaction: (transaction: Transaction) => Promise<void>;
  updateTransactions: (transactions: Transaction[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
}

type TransactionStore = TransactionState & TransactionActions;

export const useTransactionStore = create<TransactionStore>((set) => ({
  // State
  transactions: [],

  // Data loading
  loadTransactions: async () => {
    const transactions = await db.getTransactions();
    set({ transactions });
  },

  setTransactions: (transactions) => set({ transactions }),

  // CRUD operations
  updateTransaction: async (transaction) => {
    await db.updateTransaction(transaction);
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === transaction.id ? transaction : t
      ),
    }));
  },

  updateTransactions: async (transactions) => {
    await db.updateTransactions(transactions);
    const updatedIds = new Set(transactions.map((t) => t.id));
    const updatedMap = new Map(transactions.map((t) => [t.id, t]));

    set((state) => ({
      transactions: state.transactions.map((t) =>
        updatedIds.has(t.id) ? updatedMap.get(t.id)! : t
      ),
    }));
  },

  deleteTransaction: async (id) => {
    await db.deleteTransaction(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  addTransaction: async (transaction) => {
    await db.addTransaction(transaction);
    set((state) => ({
      transactions: [...state.transactions, transaction],
    }));
  },
}));

// Selectors
export const selectTransactions = (state: TransactionStore) => state.transactions;

export const selectTransactionsByAccountIds = (accountIds: Set<string>) => (state: TransactionStore) =>
  state.transactions.filter((t) => accountIds.has(t.accountId));

export const selectTransactionById = (id: string) => (state: TransactionStore) =>
  state.transactions.find((t) => t.id === id);

export const selectUncategorizedTransactions = (accountIds: Set<string>) => (state: TransactionStore) =>
  state.transactions.filter(
    (t) => accountIds.has(t.accountId) && t.category === 'uncategorized'
  );
