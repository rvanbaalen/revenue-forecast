/**
 * Account Store - Bank account management
 *
 * Manages bank accounts imported from OFX files and reconciliation operations.
 */

import { create } from 'zustand';
import type {
  BankAccount,
  Transaction,
  Reconciliation,
  ReconciliationResult,
  ParsedOFXFile,
  OFXImportResult,
} from '../types';
import { db } from '../store/db';
import { getSuggestedCurrencyInfo } from '../utils/currency';
import {
  calculateExpectedBalance,
  performReconciliation,
} from '../utils/reconciliation';

interface AccountState {
  accounts: BankAccount[];
  reconciliations: Reconciliation[];
}

interface AccountActions {
  // Data loading
  loadAccounts: () => Promise<void>;
  loadReconciliations: () => Promise<void>;
  setAccounts: (accounts: BankAccount[]) => void;
  setReconciliations: (reconciliations: Reconciliation[]) => void;

  // Account CRUD
  updateAccount: (account: BankAccount) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // OFX Import
  importOFXFile: (
    contextId: string,
    parsedOFX: ParsedOFXFile,
    onTransactionsImported: (transactions: Transaction[]) => void
  ) => Promise<OFXImportResult>;

  // Reconciliation
  reconcileAccount: (
    accountId: string,
    reconciledDate: string,
    actualBalance: string,
    transactions: Transaction[],
    notes?: string,
    createAdjustment?: boolean
  ) => Promise<{ result: ReconciliationResult; adjustmentTx: Transaction | null }>;
  getAccountReconciliations: (accountId: string) => Reconciliation[];
  getExpectedBalance: (
    accountId: string,
    asOfDate: string,
    transactions: Transaction[]
  ) => string | null;
}

type AccountStore = AccountState & AccountActions;

export const useAccountStore = create<AccountStore>((set, get) => ({
  // State
  accounts: [],
  reconciliations: [],

  // Data loading
  loadAccounts: async () => {
    const accounts = await db.getAccounts();
    set({ accounts });
  },

  loadReconciliations: async () => {
    const reconciliations = await db.getReconciliations();
    set({ reconciliations });
  },

  setAccounts: (accounts) => set({ accounts }),
  setReconciliations: (reconciliations) => set({ reconciliations }),

  // Account CRUD
  updateAccount: async (account) => {
    await db.updateAccount(account);
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === account.id ? account : a
      ),
    }));
  },

  deleteAccount: async (id) => {
    await db.deleteAccount(id);
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
      reconciliations: state.reconciliations.filter((r) => r.accountId !== id),
    }));
  },

  // OFX Import - creates account and returns transactions to be added by transaction store
  importOFXFile: async (contextId, parsedOFX, onTransactionsImported) => {
    const errors: string[] = [];
    const now = new Date().toISOString();
    const importBatchId = crypto.randomUUID();

    // Auto-create currency from OFX if it doesn't exist
    const ofxCurrency = parsedOFX.currency || 'USD';
    const existingCurrency = await db.getCurrencyByCode(ofxCurrency);
    if (!existingCurrency) {
      const suggested = getSuggestedCurrencyInfo(ofxCurrency);
      await db.getOrCreateCurrency(
        suggested.code,
        suggested.symbol,
        suggested.name,
        '1'
      );
    }

    // Hash the account ID for deduplication
    const encoder = new TextEncoder();
    const data = encoder.encode(
      parsedOFX.account.bankId + parsedOFX.account.accountId
    );
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const accountIdHash = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

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
      set((state) => ({
        accounts: [...state.accounts, account!],
      }));
    } else {
      // Update balance if newer
      if (parsedOFX.balance) {
        account = {
          ...account,
          balance: parsedOFX.balance.amount,
          balanceDate: parsedOFX.balance.asOf,
        };
        await db.updateAccount(account);
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === account!.id ? account! : a
          ),
        }));
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

    // Notify caller about imported transactions so they can update transaction store
    if (added > 0) {
      const importedTransactions = await db.getTransactions();
      onTransactionsImported(importedTransactions);
    }

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

  // Reconciliation
  reconcileAccount: async (
    accountId,
    reconciledDate,
    actualBalance,
    transactions,
    notes = '',
    createAdjustment = true
  ) => {
    const { accounts } = get();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      return {
        result: {
          success: false,
          reconciliation: {} as Reconciliation,
          adjustmentTransaction: null,
          message: 'Account not found',
        },
        adjustmentTx: null,
      };
    }

    const accountTransactions = transactions.filter(
      (t) => t.accountId === accountId
    );

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

      set((state) => ({
        accounts: state.accounts.map((a) =>
          a.id === accountId ? updatedAccount : a
        ),
        reconciliations: [...state.reconciliations, result.reconciliation],
      }));
    } else {
      set((state) => ({
        reconciliations: [...state.reconciliations, result.reconciliation],
      }));
    }

    return { result, adjustmentTx: result.adjustmentTransaction };
  },

  getAccountReconciliations: (accountId) => {
    return get()
      .reconciliations.filter((r) => r.accountId === accountId)
      .sort((a, b) => b.reconciledDate.localeCompare(a.reconciledDate));
  },

  getExpectedBalance: (accountId, asOfDate, transactions) => {
    const { accounts } = get();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return null;

    const accountTransactions = transactions.filter(
      (t) => t.accountId === accountId
    );
    return calculateExpectedBalance(account, accountTransactions, asOfDate);
  },
}));

// Selectors
export const selectAccounts = (state: AccountStore) => state.accounts;
export const selectReconciliations = (state: AccountStore) => state.reconciliations;

export const selectAccountsByContext = (contextId: string | null) => (state: AccountStore) =>
  contextId ? state.accounts.filter((a) => a.contextId === contextId) : [];

export const selectAccountById = (id: string) => (state: AccountStore) =>
  state.accounts.find((a) => a.id === id);
