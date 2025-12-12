import { useState, useEffect, useCallback } from 'react';
import { db } from '../store/db';
import type {
  ChartAccount,
  JournalEntry,
  JournalLine,
  AccountType,
  Month,
  BankAccount,
} from '../types';
import { NORMAL_BALANCE, MONTHS } from '../types';

// Generate a UUID for new accounts
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate account code based on type and existing codes
function generateAccountCode(type: AccountType, existingAccounts: ChartAccount[]): string {
  const typePrefixes: Record<AccountType, string> = {
    ASSET: '1',
    LIABILITY: '2',
    EQUITY: '3',
    REVENUE: '4',
    EXPENSE: '5',
  };

  const prefix = typePrefixes[type];
  const sameTypeAccounts = existingAccounts.filter(a => a.code.startsWith(prefix));
  const maxCode = Math.max(
    ...sameTypeAccounts.map(a => parseInt(a.code) || 0),
    parseInt(`${prefix}000`)
  );

  return String(maxCode + 10).padStart(4, '0');
}

export function useAccounting() {
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all accounting data
  const loadData = useCallback(async () => {
    try {
      const [accounts, entries] = await Promise.all([
        db.getChartAccounts(),
        db.getJournalEntries(),
      ]);
      setChartAccounts(accounts);
      setJournalEntries(entries);
    } catch (error) {
      console.error('Failed to load accounting data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // Chart Account Operations
  // ============================================

  const addChartAccount = useCallback(async (
    account: Omit<ChartAccount, 'id' | 'code' | 'createdAt' | 'updatedAt'>
  ): Promise<ChartAccount> => {
    const now = new Date().toISOString();
    const newAccount: ChartAccount = {
      ...account,
      id: generateId(),
      code: generateAccountCode(account.type, chartAccounts),
      createdAt: now,
      updatedAt: now,
    };
    await db.addChartAccount(newAccount);
    await loadData();
    return newAccount;
  }, [chartAccounts, loadData]);

  const updateChartAccount = useCallback(async (account: ChartAccount): Promise<void> => {
    const updatedAccount = {
      ...account,
      updatedAt: new Date().toISOString(),
    };
    await db.updateChartAccount(updatedAccount);
    await loadData();
  }, [loadData]);

  const deleteChartAccount = useCallback(async (id: string): Promise<void> => {
    const account = chartAccounts.find(a => a.id === id);
    if (account?.isSystem) {
      throw new Error('Cannot delete system accounts');
    }
    await db.deleteChartAccount(id);
    await loadData();
  }, [chartAccounts, loadData]);

  const getAccountById = useCallback((id: string): ChartAccount | undefined => {
    return chartAccounts.find(a => a.id === id);
  }, [chartAccounts]);

  const getAccountByCode = useCallback((code: string): ChartAccount | undefined => {
    return chartAccounts.find(a => a.code === code);
  }, [chartAccounts]);

  // ============================================
  // Account Filtering
  // ============================================

  const getAccountsByType = useCallback((type: AccountType): ChartAccount[] => {
    return chartAccounts.filter(a => a.type === type && a.isActive);
  }, [chartAccounts]);

  const getExpenseAccounts = useCallback((): ChartAccount[] => {
    // Get leaf expense accounts (no children)
    const expenseAccounts = chartAccounts.filter(a => a.type === 'EXPENSE' && a.isActive);
    const parentIds = new Set(chartAccounts.map(a => a.parentId).filter(Boolean));
    return expenseAccounts.filter(a => !parentIds.has(a.id));
  }, [chartAccounts]);

  const getRevenueAccounts = useCallback((): ChartAccount[] => {
    const revenueAccounts = chartAccounts.filter(a => a.type === 'REVENUE' && a.isActive);
    const parentIds = new Set(chartAccounts.map(a => a.parentId).filter(Boolean));
    return revenueAccounts.filter(a => !parentIds.has(a.id));
  }, [chartAccounts]);

  const getCashAccounts = useCallback((): ChartAccount[] => {
    return chartAccounts.filter(
      a => a.type === 'ASSET' && a.subtype === 'Cash' && a.isActive && a.bankAccountId
    );
  }, [chartAccounts]);

  const getCreditCardAccounts = useCallback((): ChartAccount[] => {
    return chartAccounts.filter(
      a => a.type === 'LIABILITY' && a.subtype === 'Credit Card' && a.isActive && a.bankAccountId
    );
  }, [chartAccounts]);

  // Get account hierarchy (with children nested)
  const getAccountHierarchy = useCallback((type?: AccountType): ChartAccount[] => {
    const filtered = type
      ? chartAccounts.filter(a => a.type === type && a.isActive)
      : chartAccounts.filter(a => a.isActive);

    // Sort by code for proper ordering
    return filtered.sort((a, b) => a.code.localeCompare(b.code));
  }, [chartAccounts]);

  // ============================================
  // Balance Calculations
  // ============================================

  // Calculate account balance from journal entries
  const calculateAccountBalance = useCallback((
    accountId: string,
    asOfDate?: string
  ): number => {
    const account = chartAccounts.find(a => a.id === accountId);
    if (!account) return 0;

    const normalBalance = NORMAL_BALANCE[account.type];
    let balance = 0;

    for (const entry of journalEntries) {
      if (asOfDate && entry.date > asOfDate) continue;

      for (const line of entry.lines) {
        if (line.accountId === accountId) {
          if (line.type === normalBalance) {
            balance += line.amount;
          } else {
            balance -= line.amount;
          }
        }
      }
    }

    return balance;
  }, [chartAccounts, journalEntries]);

  // Calculate balances for all accounts
  const getAllAccountBalances = useCallback((asOfDate?: string): Map<string, number> => {
    const balances = new Map<string, number>();

    for (const account of chartAccounts) {
      const balance = calculateAccountBalance(account.id, asOfDate);
      balances.set(account.id, balance);
    }

    return balances;
  }, [chartAccounts, calculateAccountBalance]);

  // Calculate total by account type
  const getTotalByType = useCallback((
    type: AccountType,
    asOfDate?: string
  ): number => {
    const accounts = chartAccounts.filter(a => a.type === type && a.isActive);
    return accounts.reduce((sum, account) => {
      return sum + calculateAccountBalance(account.id, asOfDate);
    }, 0);
  }, [chartAccounts, calculateAccountBalance]);

  // ============================================
  // Budget Operations
  // ============================================

  const updateAccountBudget = useCallback(async (
    accountId: string,
    month: Month,
    amount: number
  ): Promise<void> => {
    const account = chartAccounts.find(a => a.id === accountId);
    if (!account) return;

    const budget = account.budget || { expectedMonthly: {} };
    budget.expectedMonthly[month] = amount;

    await updateChartAccount({
      ...account,
      budget,
    });
  }, [chartAccounts, updateChartAccount]);

  const getAccountBudget = useCallback((
    accountId: string,
    month: Month
  ): number => {
    const account = chartAccounts.find(a => a.id === accountId);
    return account?.budget?.expectedMonthly[month] || 0;
  }, [chartAccounts]);

  const getTotalExpenseBudget = useCallback((month: Month): number => {
    const expenseAccounts = getExpenseAccounts();
    return expenseAccounts.reduce((sum, account) => {
      return sum + (account.budget?.expectedMonthly[month] || 0);
    }, 0);
  }, [getExpenseAccounts]);

  // Get actual expenses for a month (from journal entries)
  const getActualExpensesByMonth = useCallback((
    year: number,
    month: Month
  ): Map<string, number> => {
    const monthIndex = MONTHS.indexOf(month);
    const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-31`;

    const expenseAccounts = getExpenseAccounts();
    const actuals = new Map<string, number>();

    for (const account of expenseAccounts) {
      let total = 0;

      for (const entry of journalEntries) {
        if (entry.date < startDate || entry.date > endDate) continue;

        for (const line of entry.lines) {
          if (line.accountId === account.id) {
            // Debits increase expenses
            if (line.type === 'DEBIT') {
              total += line.amount;
            } else {
              total -= line.amount;
            }
          }
        }
      }

      actuals.set(account.id, total);
    }

    return actuals;
  }, [getExpenseAccounts, journalEntries]);

  // ============================================
  // Journal Entry Operations
  // ============================================

  const addJournalEntry = useCallback(async (
    entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JournalEntry> => {
    // Validate that debits equal credits
    const totalDebits = entry.lines
      .filter(l => l.type === 'DEBIT')
      .reduce((sum, l) => sum + l.amount, 0);
    const totalCredits = entry.lines
      .filter(l => l.type === 'CREDIT')
      .reduce((sum, l) => sum + l.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Journal entry must balance: debits must equal credits');
    }

    const now = new Date().toISOString();
    const newEntry: JournalEntry = {
      ...entry,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    await db.addJournalEntry(newEntry);
    await loadData();
    return newEntry;
  }, [loadData]);

  const updateJournalEntry = useCallback(async (entry: JournalEntry): Promise<void> => {
    const updatedEntry = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };
    await db.updateJournalEntry(updatedEntry);
    await loadData();
  }, [loadData]);

  const deleteJournalEntry = useCallback(async (id: string): Promise<void> => {
    await db.deleteJournalEntry(id);
    await loadData();
  }, [loadData]);

  const getJournalEntryById = useCallback((id: string): JournalEntry | undefined => {
    return journalEntries.find(e => e.id === id);
  }, [journalEntries]);

  // ============================================
  // Create Journal Entry from Transaction
  // ============================================

  const createJournalEntryFromTransaction = useCallback(async (
    bankTransaction: {
      id: number;
      amount: number;
      name: string;
      datePosted: string;
      accountId: number;
    },
    categoryAccountId: string,
    bankChartAccountId: string
  ): Promise<JournalEntry> => {
    const categoryAccount = chartAccounts.find(a => a.id === categoryAccountId);
    const bankAccount = chartAccounts.find(a => a.id === bankChartAccountId);

    if (!categoryAccount || !bankAccount) {
      throw new Error('Invalid account IDs');
    }

    const amount = Math.abs(bankTransaction.amount);
    const isCredit = bankTransaction.amount > 0;

    // Determine the journal entry lines based on transaction type and account types
    const lines: JournalLine[] = [];

    if (bankAccount.type === 'ASSET') {
      // Checking/Savings account
      if (isCredit) {
        // Money coming in (revenue or transfer in)
        lines.push({ accountId: bankChartAccountId, amount, type: 'DEBIT' }); // Increase asset
        lines.push({ accountId: categoryAccountId, amount, type: 'CREDIT' }); // Increase revenue
      } else {
        // Money going out (expense or transfer out)
        lines.push({ accountId: categoryAccountId, amount, type: 'DEBIT' }); // Increase expense
        lines.push({ accountId: bankChartAccountId, amount, type: 'CREDIT' }); // Decrease asset
      }
    } else if (bankAccount.type === 'LIABILITY') {
      // Credit card account
      if (isCredit) {
        // Credit on credit card = spending (increases liability)
        lines.push({ accountId: categoryAccountId, amount, type: 'DEBIT' }); // Increase expense
        lines.push({ accountId: bankChartAccountId, amount, type: 'CREDIT' }); // Increase liability
      } else {
        // Debit on credit card = payment (decreases liability)
        lines.push({ accountId: bankChartAccountId, amount, type: 'DEBIT' }); // Decrease liability
        lines.push({ accountId: categoryAccountId, amount, type: 'CREDIT' }); // This would be from cash
      }
    }

    const entry = await addJournalEntry({
      date: bankTransaction.datePosted.split('T')[0],
      description: bankTransaction.name,
      lines,
      bankTransactionId: bankTransaction.id,
      isReconciled: false,
    });

    return entry;
  }, [chartAccounts, addJournalEntry]);

  // ============================================
  // Bank Account Integration
  // ============================================

  const createChartAccountForBankAccount = useCallback(async (
    bankAccount: BankAccount
  ): Promise<ChartAccount> => {
    // Determine if this is an asset (checking/savings) or liability (credit card)
    const isLiability = bankAccount.accountType === 'CREDITCARD' || bankAccount.accountType === 'CREDITLINE';

    const type: AccountType = isLiability ? 'LIABILITY' : 'ASSET';
    const parentId = isLiability ? '2100' : '1100'; // Credit Cards or Cash & Bank
    const subtype = isLiability ? 'Credit Card' : 'Cash';

    const newAccount = await addChartAccount({
      name: bankAccount.name,
      type,
      parentId,
      subtype,
      isSystem: false,
      isActive: true,
      bankAccountId: bankAccount.id,
    });

    return newAccount;
  }, [addChartAccount]);

  const getChartAccountForBankAccount = useCallback((
    bankAccountId: number
  ): ChartAccount | undefined => {
    return chartAccounts.find(a => a.bankAccountId === bankAccountId);
  }, [chartAccounts]);

  // ============================================
  // Financial Reports Data
  // ============================================

  // Profit & Loss data
  const getProfitAndLoss = useCallback((
    year: number,
    month?: Month
  ): {
    revenue: number;
    expenses: number;
    netIncome: number;
    revenueByAccount: Map<string, number>;
    expensesByAccount: Map<string, number>;
  } => {
    let startDate: string;
    let endDate: string;

    if (month) {
      const monthIndex = MONTHS.indexOf(month);
      startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-31`;
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    const revenueByAccount = new Map<string, number>();
    const expensesByAccount = new Map<string, number>();

    const revenueAccounts = getRevenueAccounts();
    const expenseAccounts = getExpenseAccounts();

    // Calculate revenue
    let totalRevenue = 0;
    for (const account of revenueAccounts) {
      let accountTotal = 0;
      for (const entry of journalEntries) {
        if (entry.date < startDate || entry.date > endDate) continue;
        for (const line of entry.lines) {
          if (line.accountId === account.id) {
            // Credits increase revenue
            if (line.type === 'CREDIT') {
              accountTotal += line.amount;
            } else {
              accountTotal -= line.amount;
            }
          }
        }
      }
      revenueByAccount.set(account.id, accountTotal);
      totalRevenue += accountTotal;
    }

    // Calculate expenses
    let totalExpenses = 0;
    for (const account of expenseAccounts) {
      let accountTotal = 0;
      for (const entry of journalEntries) {
        if (entry.date < startDate || entry.date > endDate) continue;
        for (const line of entry.lines) {
          if (line.accountId === account.id) {
            // Debits increase expenses
            if (line.type === 'DEBIT') {
              accountTotal += line.amount;
            } else {
              accountTotal -= line.amount;
            }
          }
        }
      }
      expensesByAccount.set(account.id, accountTotal);
      totalExpenses += accountTotal;
    }

    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      revenueByAccount,
      expensesByAccount,
    };
  }, [journalEntries, getRevenueAccounts, getExpenseAccounts]);

  // Balance Sheet data
  const getBalanceSheet = useCallback((asOfDate?: string): {
    assets: number;
    liabilities: number;
    equity: number;
    assetsByAccount: Map<string, number>;
    liabilitiesByAccount: Map<string, number>;
  } => {
    const balances = getAllAccountBalances(asOfDate);

    const assetsByAccount = new Map<string, number>();
    const liabilitiesByAccount = new Map<string, number>();

    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const account of chartAccounts.filter(a => a.isActive)) {
      const balance = balances.get(account.id) || 0;

      if (account.type === 'ASSET') {
        assetsByAccount.set(account.id, balance);
        totalAssets += balance;
      } else if (account.type === 'LIABILITY') {
        liabilitiesByAccount.set(account.id, balance);
        totalLiabilities += balance;
      }
    }

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalAssets - totalLiabilities,
      assetsByAccount,
      liabilitiesByAccount,
    };
  }, [chartAccounts, getAllAccountBalances]);

  // Cash Flow data
  const getCashFlow = useCallback((
    year: number,
    month?: Month
  ): {
    inflows: number;
    outflows: number;
    netCashFlow: number;
  } => {
    let startDate: string;
    let endDate: string;

    if (month) {
      const monthIndex = MONTHS.indexOf(month);
      startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-31`;
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    const cashAccounts = getCashAccounts();
    let inflows = 0;
    let outflows = 0;

    for (const entry of journalEntries) {
      if (entry.date < startDate || entry.date > endDate) continue;

      for (const line of entry.lines) {
        const isCashAccount = cashAccounts.some(a => a.id === line.accountId);
        if (isCashAccount) {
          // Debits to cash = inflows, Credits to cash = outflows
          if (line.type === 'DEBIT') {
            inflows += line.amount;
          } else {
            outflows += line.amount;
          }
        }
      }
    }

    return {
      inflows,
      outflows,
      netCashFlow: inflows - outflows,
    };
  }, [journalEntries, getCashAccounts]);

  return {
    // State
    chartAccounts,
    journalEntries,
    loading,

    // Chart Account operations
    addChartAccount,
    updateChartAccount,
    deleteChartAccount,
    getAccountById,
    getAccountByCode,

    // Account filtering
    getAccountsByType,
    getExpenseAccounts,
    getRevenueAccounts,
    getCashAccounts,
    getCreditCardAccounts,
    getAccountHierarchy,

    // Balance calculations
    calculateAccountBalance,
    getAllAccountBalances,
    getTotalByType,

    // Budget operations
    updateAccountBudget,
    getAccountBudget,
    getTotalExpenseBudget,
    getActualExpensesByMonth,

    // Journal Entry operations
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    getJournalEntryById,
    createJournalEntryFromTransaction,

    // Bank account integration
    createChartAccountForBankAccount,
    getChartAccountForBankAccount,

    // Financial reports
    getProfitAndLoss,
    getBalanceSheet,
    getCashFlow,

    // Reload
    reloadData: loadData,
  };
}
