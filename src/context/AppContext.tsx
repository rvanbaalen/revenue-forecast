/**
 * Application Context Provider
 *
 * Provides centralized state management for:
 * - Contexts (workspaces)
 * - Bank accounts
 * - Transactions
 * - Subcategories
 * - Mapping rules
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  Context,
  BankAccount,
  Transaction,
  Subcategory,
  MappingRule,
  ParsedOFXFile,
  OFXImportResult,
  DateRange,
  BalanceSheetReport,
  ProfitLossReport,
  CashFlowReport,
  CategorySpendingReport,
  Reconciliation,
  ReconciliationResult,
} from '../types';
import {
  DEFAULT_INCOME_SUBCATEGORIES,
  DEFAULT_EXPENSE_SUBCATEGORIES,
} from '../types';
import { db } from '../store/db';
import {
  generateBalanceSheet,
  generateProfitLoss,
  generateCashFlow,
  generateCategorySpending,
  calculateSummaryMetrics,
} from '../utils/reports';
import {
  calculateExpectedBalance,
  performReconciliation,
} from '../utils/reconciliation';

// ============================================
// Types
// ============================================

interface AppState {
  // Data
  contexts: Context[];
  activeContextId: string | null;
  accounts: BankAccount[];
  transactions: Transaction[];
  subcategories: Subcategory[];
  mappingRules: MappingRule[];
  reconciliations: Reconciliation[];

  // UI State
  isLoading: boolean;
  error: string | null;
}

interface AppContextValue extends AppState {
  // Context operations
  createContext: (name: string) => Promise<Context>;
  updateContext: (context: Context) => Promise<void>;
  deleteContext: (id: string) => Promise<void>;
  setActiveContext: (id: string | null) => void;

  // Account operations
  importOFXFile: (contextId: string, parsedOFX: ParsedOFXFile) => Promise<OFXImportResult>;
  updateAccount: (account: BankAccount) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Transaction operations
  updateTransaction: (transaction: Transaction) => Promise<void>;
  updateTransactions: (transactions: Transaction[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Subcategory operations
  addSubcategory: (name: string, type: 'income' | 'expense') => Promise<Subcategory>;
  deleteSubcategory: (id: string) => Promise<void>;

  // Mapping rule operations
  addMappingRule: (rule: Omit<MappingRule, 'id' | 'createdAt'>) => Promise<MappingRule>;
  updateMappingRule: (rule: MappingRule) => Promise<void>;
  deleteMappingRule: (id: string) => Promise<void>;
  applyMappingRules: () => Promise<number>;

  // Reconciliation operations
  reconcileAccount: (
    accountId: string,
    reconciledDate: string,
    actualBalance: string,
    notes?: string,
    createAdjustment?: boolean
  ) => Promise<ReconciliationResult>;
  getAccountReconciliations: (accountId: string) => Reconciliation[];
  getExpectedBalance: (accountId: string, asOfDate: string) => string | null;

  // Report functions
  getBalanceSheet: (asOf?: string) => BalanceSheetReport;
  getProfitLoss: (period: DateRange) => ProfitLossReport;
  getCashFlow: (period: DateRange) => CashFlowReport;
  getCategorySpending: (period: DateRange) => CategorySpendingReport;
  getSummaryMetrics: (period: DateRange) => ReturnType<typeof calculateSummaryMetrics>;

  // Computed values
  activeContext: Context | null;
  contextAccounts: BankAccount[];
  contextTransactions: Transaction[];
  contextSubcategories: Subcategory[];
  contextMappingRules: MappingRule[];
  uncategorizedCount: number;

  // Data operations
  refreshData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<{ success: boolean; error?: string }>;
}

// ============================================
// Context
// ============================================

const AppContext = createContext<AppContextValue | null>(null);

// ============================================
// Provider
// ============================================

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    contexts: [],
    activeContextId: null,
    accounts: [],
    transactions: [],
    subcategories: [],
    mappingRules: [],
    reconciliations: [],
    isLoading: true,
    error: null,
  });

  // Initialize database and load data
  useEffect(() => {
    const init = async () => {
      try {
        await db.init();
        await loadAllData();
      } catch (err) {
        setState((s) => ({ ...s, error: String(err), isLoading: false }));
      }
    };
    init();
  }, []);

  // Load all data from database
  const loadAllData = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const [contexts, accounts, transactions, subcategories, mappingRules, reconciliations] = await Promise.all([
        db.getContexts(),
        db.getAccounts(),
        db.getTransactions(),
        db.getSubcategories(),
        db.getMappingRules(),
        db.getReconciliations(),
      ]);

      // Set active context to first one if not set
      const activeContextId = contexts.length > 0 ? contexts[0].id : null;

      setState((s) => ({
        ...s,
        contexts,
        accounts,
        transactions,
        subcategories,
        mappingRules,
        reconciliations,
        activeContextId: s.activeContextId || activeContextId,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      setState((s) => ({ ...s, error: String(err), isLoading: false }));
    }
  }, []);

  // ============================================
  // Context Operations
  // ============================================

  const createContext = useCallback(async (name: string): Promise<Context> => {
    const context: Context = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };

    await db.addContext(context);

    // Initialize default subcategories for this context
    await db.initDefaultSubcategories(
      context.id,
      DEFAULT_INCOME_SUBCATEGORIES,
      DEFAULT_EXPENSE_SUBCATEGORIES
    );

    // Reload subcategories
    const subcategories = await db.getSubcategories();

    setState((s) => ({
      ...s,
      contexts: [...s.contexts, context],
      subcategories,
      activeContextId: s.activeContextId || context.id,
    }));

    return context;
  }, []);

  const updateContextFn = useCallback(async (context: Context) => {
    await db.updateContext(context);
    setState((s) => ({
      ...s,
      contexts: s.contexts.map((c) => (c.id === context.id ? context : c)),
    }));
  }, []);

  const deleteContextFn = useCallback(async (id: string) => {
    await db.deleteContext(id);
    await loadAllData();
  }, [loadAllData]);

  const setActiveContext = useCallback((id: string | null) => {
    setState((s) => ({ ...s, activeContextId: id }));
  }, []);

  // ============================================
  // Account Operations
  // ============================================

  const importOFXFile = useCallback(
    async (contextId: string, parsedOFX: ParsedOFXFile): Promise<OFXImportResult> => {
      const errors: string[] = [];
      const now = new Date().toISOString();
      const importBatchId = crypto.randomUUID();

      // Hash the account ID for deduplication
      const encoder = new TextEncoder();
      const data = encoder.encode(parsedOFX.account.bankId + parsedOFX.account.accountId);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const accountIdHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Check if account already exists
      let account = await db.getAccountByHash(accountIdHash);
      const isNewAccount = !account;

      if (!account) {
        // Determine account type
        const ofxType = parsedOFX.account.accountType;
        const type: BankAccount['type'] =
          ofxType === 'CREDITCARD' ? 'credit_card' : 'checking';

        // Mask account number
        const fullAccountId = parsedOFX.account.accountId;
        const accountNumber =
          fullAccountId.length > 4
            ? '****' + fullAccountId.slice(-4)
            : fullAccountId;

        // Create new account
        account = {
          id: crypto.randomUUID(),
          contextId,
          name: `${type === 'credit_card' ? 'Credit Card' : 'Checking'} ${accountNumber}`,
          type,
          currency: parsedOFX.currency || 'USD',
          bankId: parsedOFX.account.bankId,
          accountNumber,
          accountIdHash,
          balance: parsedOFX.balance?.amount || '0',
          balanceDate: parsedOFX.balance?.asOf || now,
          createdAt: now,
        };

        await db.addAccount(account);
      } else {
        // Update balance if newer
        if (parsedOFX.balance) {
          account = {
            ...account,
            balance: parsedOFX.balance.amount,
            balanceDate: parsedOFX.balance.asOf,
          };
          await db.updateAccount(account);
        }
      }

      // Convert parsed transactions to our format
      const transactions: Transaction[] = parsedOFX.transactions.map((t) => ({
        id: crypto.randomUUID(),
        accountId: account!.id,
        fitId: t.fitId,
        date: t.datePosted,
        amount: t.amount,
        name: t.name,
        memo: t.memo || '',
        type: t.type,
        checkNumber: t.checkNumber,
        category: 'uncategorized',
        subcategory: '',
        importBatchId,
        createdAt: now,
      }));

      // Add transactions (duplicates will be skipped)
      const { added, skipped } = await db.addTransactions(transactions);

      // Reload data
      await loadAllData();

      return {
        success: true,
        accountId: account.id,
        accountName: account.name,
        isNewAccount,
        totalTransactions: transactions.length,
        newTransactions: added,
        duplicatesSkipped: skipped,
        dateRange: parsedOFX.dateRange,
        errors,
      };
    },
    [loadAllData]
  );

  const updateAccountFn = useCallback(async (account: BankAccount) => {
    await db.updateAccount(account);
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === account.id ? account : a)),
    }));
  }, []);

  const deleteAccountFn = useCallback(async (id: string) => {
    await db.deleteAccount(id);
    await loadAllData();
  }, [loadAllData]);

  // ============================================
  // Transaction Operations
  // ============================================

  const updateTransactionFn = useCallback(async (transaction: Transaction) => {
    await db.updateTransaction(transaction);
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        t.id === transaction.id ? transaction : t
      ),
    }));
  }, []);

  const updateTransactionsFn = useCallback(async (transactions: Transaction[]) => {
    await db.updateTransactions(transactions);
    const updatedIds = new Set(transactions.map((t) => t.id));
    const updatedMap = new Map(transactions.map((t) => [t.id, t]));

    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        updatedIds.has(t.id) ? updatedMap.get(t.id)! : t
      ),
    }));
  }, []);

  const deleteTransactionFn = useCallback(async (id: string) => {
    await db.deleteTransaction(id);
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id),
    }));
  }, []);

  // ============================================
  // Subcategory Operations
  // ============================================

  const addSubcategoryFn = useCallback(
    async (name: string, type: 'income' | 'expense'): Promise<Subcategory> => {
      if (!state.activeContextId) {
        throw new Error('No active context');
      }

      const subcategory: Subcategory = {
        id: crypto.randomUUID(),
        contextId: state.activeContextId,
        name,
        type,
        createdAt: new Date().toISOString(),
      };

      await db.addSubcategory(subcategory);
      setState((s) => ({
        ...s,
        subcategories: [...s.subcategories, subcategory],
      }));

      return subcategory;
    },
    [state.activeContextId]
  );

  const deleteSubcategoryFn = useCallback(async (id: string) => {
    await db.deleteSubcategory(id);
    setState((s) => ({
      ...s,
      subcategories: s.subcategories.filter((sub) => sub.id !== id),
    }));
  }, []);

  // ============================================
  // Mapping Rule Operations
  // ============================================

  const addMappingRuleFn = useCallback(
    async (rule: Omit<MappingRule, 'id' | 'createdAt'>): Promise<MappingRule> => {
      const fullRule: MappingRule = {
        ...rule,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      await db.addMappingRule(fullRule);
      setState((s) => ({
        ...s,
        mappingRules: [...s.mappingRules, fullRule],
      }));

      return fullRule;
    },
    []
  );

  const updateMappingRuleFn = useCallback(async (rule: MappingRule) => {
    await db.updateMappingRule(rule);
    setState((s) => ({
      ...s,
      mappingRules: s.mappingRules.map((r) => (r.id === rule.id ? rule : r)),
    }));
  }, []);

  const deleteMappingRuleFn = useCallback(async (id: string) => {
    await db.deleteMappingRule(id);
    setState((s) => ({
      ...s,
      mappingRules: s.mappingRules.filter((r) => r.id !== id),
    }));
  }, []);

  const applyMappingRules = useCallback(async (): Promise<number> => {
    if (!state.activeContextId) return 0;

    const contextAccountIds = new Set(
      state.accounts.filter((a) => a.contextId === state.activeContextId).map((a) => a.id)
    );

    const uncategorizedTx = state.transactions.filter(
      (t) => contextAccountIds.has(t.accountId) && t.category === 'uncategorized'
    );

    const rules = state.mappingRules
      .filter((r) => r.contextId === state.activeContextId && r.isActive)
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
      await updateTransactionsFn(updatedTransactions);
    }

    return updatedTransactions.length;
  }, [state.activeContextId, state.accounts, state.transactions, state.mappingRules, updateTransactionsFn]);

  // ============================================
  // Reconciliation Operations
  // ============================================

  const reconcileAccount = useCallback(
    async (
      accountId: string,
      reconciledDate: string,
      actualBalance: string,
      notes: string = '',
      createAdjustment: boolean = true
    ): Promise<ReconciliationResult> => {
      const account = state.accounts.find((a) => a.id === accountId);
      if (!account) {
        return {
          success: false,
          reconciliation: {} as Reconciliation,
          adjustmentTransaction: null,
          message: 'Account not found',
        };
      }

      const accountTransactions = state.transactions.filter((t) => t.accountId === accountId);

      const result = performReconciliation(
        account,
        accountTransactions,
        reconciledDate,
        actualBalance,
        notes,
        createAdjustment
      );

      // Save reconciliation to database
      await db.addReconciliation(result.reconciliation);

      // If adjustment transaction was created, save it and update account balance
      if (result.adjustmentTransaction) {
        await db.addTransaction(result.adjustmentTransaction);

        // Update account balance
        const updatedAccount: BankAccount = {
          ...account,
          balance: actualBalance,
          balanceDate: reconciledDate,
        };
        await db.updateAccount(updatedAccount);
      }

      // Reload all data to ensure state is consistent
      await loadAllData();

      return result;
    },
    [state.accounts, state.transactions, loadAllData]
  );

  const getAccountReconciliations = useCallback(
    (accountId: string): Reconciliation[] => {
      return state.reconciliations
        .filter((r) => r.accountId === accountId)
        .sort((a, b) => b.reconciledDate.localeCompare(a.reconciledDate));
    },
    [state.reconciliations]
  );

  const getExpectedBalance = useCallback(
    (accountId: string, asOfDate: string): string | null => {
      const account = state.accounts.find((a) => a.id === accountId);
      if (!account) return null;

      const accountTransactions = state.transactions.filter((t) => t.accountId === accountId);
      return calculateExpectedBalance(account, accountTransactions, asOfDate);
    },
    [state.accounts, state.transactions]
  );

  // ============================================
  // Report Functions
  // ============================================

  const contextAccounts = state.accounts.filter(
    (a) => a.contextId === state.activeContextId
  );
  const contextAccountIds = new Set(contextAccounts.map((a) => a.id));
  const contextTransactions = state.transactions.filter((t) =>
    contextAccountIds.has(t.accountId)
  );
  const contextSubcategories = state.subcategories.filter(
    (s) => s.contextId === state.activeContextId
  );
  const contextMappingRules = state.mappingRules.filter(
    (r) => r.contextId === state.activeContextId
  );

  const getBalanceSheet = useCallback(
    (asOf?: string) => {
      return generateBalanceSheet(
        contextAccounts,
        contextTransactions,
        asOf || new Date().toISOString().split('T')[0]
      );
    },
    [contextAccounts, contextTransactions]
  );

  const getProfitLoss = useCallback(
    (period: DateRange) => {
      return generateProfitLoss(contextTransactions, period);
    },
    [contextTransactions]
  );

  const getCashFlow = useCallback(
    (period: DateRange) => {
      return generateCashFlow(contextTransactions, contextAccounts, period);
    },
    [contextTransactions, contextAccounts]
  );

  const getCategorySpending = useCallback(
    (period: DateRange) => {
      return generateCategorySpending(contextTransactions, period);
    },
    [contextTransactions]
  );

  const getSummaryMetrics = useCallback(
    (period: DateRange) => {
      return calculateSummaryMetrics(contextTransactions, contextAccounts, period);
    },
    [contextTransactions, contextAccounts]
  );

  // ============================================
  // Data Operations
  // ============================================

  const exportData = useCallback(async () => {
    return db.exportData();
  }, []);

  const importDataFn = useCallback(async (jsonData: string) => {
    const result = await db.importData(jsonData);
    if (result.success) {
      await loadAllData();
    }
    return result;
  }, [loadAllData]);

  // ============================================
  // Computed Values
  // ============================================

  const activeContext = state.contexts.find((c) => c.id === state.activeContextId) || null;
  const uncategorizedCount = contextTransactions.filter(
    (t) => t.category === 'uncategorized'
  ).length;

  // ============================================
  // Context Value
  // ============================================

  const value: AppContextValue = {
    ...state,

    // Context operations
    createContext,
    updateContext: updateContextFn,
    deleteContext: deleteContextFn,
    setActiveContext,

    // Account operations
    importOFXFile,
    updateAccount: updateAccountFn,
    deleteAccount: deleteAccountFn,

    // Transaction operations
    updateTransaction: updateTransactionFn,
    updateTransactions: updateTransactionsFn,
    deleteTransaction: deleteTransactionFn,

    // Subcategory operations
    addSubcategory: addSubcategoryFn,
    deleteSubcategory: deleteSubcategoryFn,

    // Mapping rule operations
    addMappingRule: addMappingRuleFn,
    updateMappingRule: updateMappingRuleFn,
    deleteMappingRule: deleteMappingRuleFn,
    applyMappingRules,

    // Reconciliation operations
    reconcileAccount,
    getAccountReconciliations,
    getExpectedBalance,

    // Report functions
    getBalanceSheet,
    getProfitLoss,
    getCashFlow,
    getCategorySpending,
    getSummaryMetrics,

    // Computed values
    activeContext,
    contextAccounts,
    contextTransactions,
    contextSubcategories,
    contextMappingRules,
    uncategorizedCount,

    // Data operations
    refreshData: loadAllData,
    exportData,
    importData: importDataFn,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
