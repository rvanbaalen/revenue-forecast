/**
 * Zustand Store Index
 *
 * Provides centralized exports and initialization for all stores.
 * Components should import from here rather than individual store files.
 */

import { useMemo } from 'react';
import { useUIStore } from './useUIStore';
import { useContextStore, selectActiveContext } from './useContextStore';
import { useAccountStore } from './useAccountStore';
import { useTransactionStore, selectTransactions } from './useTransactionStore';
import { useCategoryStore } from './useCategoryStore';
import { useCurrencyStore, selectCurrencies } from './useCurrencyStore';
import {
  createContextTransactionsSelector,
  createUncategorizedCountSelector,
} from './selectors/contextSelectors';
import { getCurrencySymbol, convertCurrency } from '../utils/currency';
import { DEFAULT_CURRENCY } from '../types';
import type {
  DateRange,
  BalanceSheetReport,
  ProfitLossReport,
  CashFlowReport,
  CategorySpendingReport,
} from '../types';
import {
  generateBalanceSheet,
  generateProfitLoss,
  generateCashFlow,
  generateCategorySpending,
  calculateSummaryMetrics,
} from '../utils/reports';
import { db } from '../store/db';

// Re-export individual stores
export { useUIStore } from './useUIStore';
export { useContextStore } from './useContextStore';
export { useAccountStore } from './useAccountStore';
export { useTransactionStore } from './useTransactionStore';
export { useCategoryStore } from './useCategoryStore';
export { useCurrencyStore } from './useCurrencyStore';

// Re-export selectors
export * from './selectors/contextSelectors';

/**
 * Initialize all stores by loading data from IndexedDB
 */
export async function initializeStores(): Promise<void> {
  const { setLoading, setError } = useUIStore.getState();

  try {
    setLoading(true);
    await db.init();

    // Load all data in parallel
    await Promise.all([
      useContextStore.getState().loadContexts(),
      useAccountStore.getState().loadAccounts(),
      useAccountStore.getState().loadReconciliations(),
      useTransactionStore.getState().loadTransactions(),
      useCategoryStore.getState().loadSubcategories(),
      useCategoryStore.getState().loadMappingRules(),
      useCurrencyStore.getState().loadCurrencies(),
    ]);

    setLoading(false);
  } catch (err) {
    setError(String(err));
    setLoading(false);
  }
}

/**
 * Hook that provides context-scoped data with memoized selectors
 *
 * This is the main hook components should use to access financial data.
 * It provides selective subscriptions - components only re-render when
 * data they actually use changes.
 */
export function useFinancialData() {
  // UI state
  const isLoading = useUIStore((state) => state.isLoading);
  const error = useUIStore((state) => state.error);

  // Context state
  const contexts = useContextStore((state) => state.contexts);
  const activeContextId = useContextStore((state) => state.activeContextId);
  const activeContext = useContextStore(selectActiveContext);
  const setActiveContext = useContextStore((state) => state.setActiveContext);
  const createContext = useContextStore((state) => state.createContext);
  const updateContext = useContextStore((state) => state.updateContext);
  const deleteContext = useContextStore((state) => state.deleteContext);

  // Account state
  const accounts = useAccountStore((state) => state.accounts);
  const reconciliations = useAccountStore((state) => state.reconciliations);
  const updateAccount = useAccountStore((state) => state.updateAccount);
  const deleteAccount = useAccountStore((state) => state.deleteAccount);

  // Transaction state
  const transactions = useTransactionStore(selectTransactions);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const updateTransactions = useTransactionStore((state) => state.updateTransactions);
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction);

  // Category state
  const subcategories = useCategoryStore((state) => state.subcategories);
  const mappingRules = useCategoryStore((state) => state.mappingRules);
  const addSubcategory = useCategoryStore((state) => state.addSubcategory);
  const deleteSubcategory = useCategoryStore((state) => state.deleteSubcategory);
  const addMappingRule = useCategoryStore((state) => state.addMappingRule);
  const updateMappingRule = useCategoryStore((state) => state.updateMappingRule);
  const deleteMappingRule = useCategoryStore((state) => state.deleteMappingRule);

  // Currency state
  const currencies = useCurrencyStore(selectCurrencies);
  const addCurrency = useCurrencyStore((state) => state.addCurrency);
  const updateCurrency = useCurrencyStore((state) => state.updateCurrency);
  const deleteCurrency = useCurrencyStore((state) => state.deleteCurrency);
  const getCurrencyByCode = useCurrencyStore((state) => state.getCurrencyByCode);

  // Derived state - memoized
  const contextAccounts = useMemo(
    () => (activeContextId ? accounts.filter((a) => a.contextId === activeContextId) : []),
    [accounts, activeContextId]
  );

  const contextTransactions = useMemo(
    () => createContextTransactionsSelector(transactions, contextAccounts),
    [transactions, contextAccounts]
  );

  const contextSubcategories = useMemo(
    () => (activeContextId ? subcategories.filter((s) => s.contextId === activeContextId) : []),
    [subcategories, activeContextId]
  );

  const contextMappingRules = useMemo(
    () => (activeContextId ? mappingRules.filter((r) => r.contextId === activeContextId) : []),
    [mappingRules, activeContextId]
  );

  const uncategorizedCount = useMemo(
    () => createUncategorizedCountSelector(contextTransactions),
    [contextTransactions]
  );

  // Currency helpers
  const contextCurrency = activeContext?.currency || DEFAULT_CURRENCY;
  const contextCurrencySymbol = getCurrencySymbol(contextCurrency, currencies);

  const getSymbol = (code: string): string => {
    return getCurrencySymbol(code, currencies);
  };

  const convertToContextCurrency = (amount: string, fromCurrency: string): string => {
    if (fromCurrency.toUpperCase() === contextCurrency.toUpperCase()) {
      return amount;
    }
    return convertCurrency(amount, fromCurrency, contextCurrency, currencies);
  };

  // Import OFX file
  const importOFXFile = useAccountStore((state) => state.importOFXFile);

  // Reconciliation operations
  const reconcileAccount = useAccountStore((state) => state.reconcileAccount);
  const getAccountReconciliations = useAccountStore((state) => state.getAccountReconciliations);
  const getExpectedBalance = useAccountStore((state) => state.getExpectedBalance);

  // Apply mapping rules
  const applyMappingRules = useCategoryStore((state) => state.applyMappingRules);

  // Report functions
  const getBalanceSheet = (asOf?: string): BalanceSheetReport => {
    return generateBalanceSheet(
      contextAccounts,
      contextTransactions,
      asOf || new Date().toISOString().split('T')[0]
    );
  };

  const getProfitLoss = (period: DateRange): ProfitLossReport => {
    return generateProfitLoss(contextTransactions, period, contextSubcategories);
  };

  const getCashFlow = (period: DateRange): CashFlowReport => {
    return generateCashFlow(contextTransactions, contextAccounts, period);
  };

  const getCategorySpending = (period: DateRange): CategorySpendingReport => {
    return generateCategorySpending(contextTransactions, period, contextSubcategories);
  };

  const getSummaryMetrics = (period: DateRange) => {
    return calculateSummaryMetrics(contextTransactions, contextAccounts, period);
  };

  // Data operations
  const exportData = async (): Promise<string> => {
    return db.exportData();
  };

  const importData = async (jsonData: string): Promise<{ success: boolean; error?: string }> => {
    const result = await db.importData(jsonData);
    if (result.success) {
      await initializeStores();
    }
    return result;
  };

  const refreshData = async (): Promise<void> => {
    await initializeStores();
  };

  return {
    // UI state
    isLoading,
    error,

    // Raw data
    contexts,
    accounts,
    transactions,
    subcategories,
    mappingRules,
    reconciliations,
    currencies,

    // Context operations
    activeContextId,
    activeContext,
    setActiveContext,
    createContext,
    updateContext,
    deleteContext,

    // Context-scoped data
    contextAccounts,
    contextTransactions,
    contextSubcategories,
    contextMappingRules,
    uncategorizedCount,

    // Account operations
    importOFXFile: async (contextId: string, parsedOFX: Parameters<typeof importOFXFile>[1]) => {
      return importOFXFile(contextId, parsedOFX, (txs) => {
        useTransactionStore.getState().setTransactions(txs);
      });
    },
    updateAccount,
    deleteAccount,

    // Transaction operations
    updateTransaction,
    updateTransactions,
    deleteTransaction,

    // Subcategory operations
    addSubcategory: async (name: string, type: 'income' | 'expense') => {
      if (!activeContextId) throw new Error('No active context');
      return addSubcategory(activeContextId, name, type);
    },
    deleteSubcategory,

    // Mapping rule operations
    addMappingRule,
    updateMappingRule,
    deleteMappingRule,
    applyMappingRules: async () => {
      if (!activeContextId) return 0;
      return applyMappingRules(
        activeContextId,
        transactions,
        accounts,
        async (txs) => {
          await updateTransactions(txs);
        }
      );
    },

    // Reconciliation operations
    reconcileAccount: async (
      accountId: string,
      reconciledDate: string,
      actualBalance: string,
      notes?: string,
      createAdjustment?: boolean
    ) => {
      const { result, adjustmentTx } = await reconcileAccount(
        accountId,
        reconciledDate,
        actualBalance,
        transactions,
        notes,
        createAdjustment
      );
      if (adjustmentTx) {
        // Add the adjustment transaction to the store
        useTransactionStore.getState().setTransactions([...transactions, adjustmentTx]);
      }
      return result;
    },
    getAccountReconciliations,
    getExpectedBalance: (accountId: string, asOfDate: string) => {
      return getExpectedBalance(accountId, asOfDate, transactions);
    },

    // Currency operations
    addCurrency,
    updateCurrency,
    deleteCurrency,
    getCurrencyByCode,

    // Currency helpers
    contextCurrency,
    contextCurrencySymbol,
    getSymbol,
    convertToContextCurrency,

    // Report functions
    getBalanceSheet,
    getProfitLoss,
    getCashFlow,
    getCategorySpending,
    getSummaryMetrics,

    // Data operations
    exportData,
    importData,
    refreshData,
  };
}

/**
 * Type for the useFinancialData hook return value
 */
export type FinancialData = ReturnType<typeof useFinancialData>;
