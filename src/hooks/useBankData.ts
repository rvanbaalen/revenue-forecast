import { useState, useEffect, useCallback } from 'react';
import { db } from '../store/db';
import { parseOFXFile, hashAccountId, maskAccountId, extractMonthYear } from '../utils/ofx-parser';
import type {
  BankAccount,
  BankTransaction,
  TransactionMappingRule,
  OFXImportResult,
  MonthlyBankSummary,
  Month,
  TransactionCategory,
  TransactionFlowType,
  RevenueSource,
} from '../types';

const MONTHS_ARRAY: Month[] = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function useBankData() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [mappingRules, setMappingRules] = useState<TransactionMappingRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all bank data from IndexedDB
  const loadData = useCallback(async () => {
    try {
      const [accts, txns, rules] = await Promise.all([
        db.getBankAccounts(),
        db.getBankTransactions(),
        db.getMappingRules(),
      ]);
      setAccounts(accts);
      setTransactions(txns);
      setMappingRules(rules);
    } catch (error) {
      console.error('Failed to load bank data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // Account Operations
  // ============================================

  const addAccount = useCallback(async (account: Omit<BankAccount, 'id'>): Promise<number> => {
    const id = await db.addBankAccount(account);
    await loadData();
    return id;
  }, [loadData]);

  const updateAccount = useCallback(async (account: BankAccount): Promise<void> => {
    await db.updateBankAccount(account);
    await loadData();
  }, [loadData]);

  const deleteAccount = useCallback(async (id: number): Promise<void> => {
    await db.deleteBankAccount(id);
    await loadData();
  }, [loadData]);

  const getAccountById = useCallback((id: number): BankAccount | undefined => {
    return accounts.find(a => a.id === id);
  }, [accounts]);

  // ============================================
  // Import Operations
  // ============================================

  const importOFXFile = useCallback(async (file: File): Promise<OFXImportResult> => {
    const result: OFXImportResult = {
      success: false,
      accountId: 0,
      accountName: '',
      totalTransactions: 0,
      newTransactions: 0,
      duplicatesSkipped: 0,
      dateRange: { start: '', end: '' },
      errors: [],
    };

    try {
      // Parse the OFX file
      const parsed = await parseOFXFile(file);
      result.totalTransactions = parsed.transactions.length;
      result.dateRange = parsed.dateRange;

      // Find or create account
      const accountHash = hashAccountId(parsed.account.accountId);
      let account = await db.getBankAccountByHash(accountHash);

      if (!account) {
        // Create new account
        const newAccount: Omit<BankAccount, 'id'> = {
          name: `${parsed.account.accountType} ${maskAccountId(parsed.account.accountId)}`,
          bankId: parsed.account.bankId,
          accountId: maskAccountId(parsed.account.accountId),
          accountIdHash: accountHash,
          accountType: parsed.account.accountType,
          currency: parsed.currency,
          createdAt: new Date().toISOString(),
        };
        const accountId = await db.addBankAccount(newAccount);
        account = { ...newAccount, id: accountId };
      }

      result.accountId = account.id;
      result.accountName = account.name;

      // Import transactions
      const importBatchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const importedAt = new Date().toISOString();

      // Get existing mapping rules for auto-categorization
      const rules = await db.getMappingRules();
      const applicableRules = rules
        .filter(r => r.isActive && (!r.accountId || r.accountId === account!.id))
        .sort((a, b) => b.priority - a.priority);

      const transactionsToAdd: Omit<BankTransaction, 'id'>[] = [];

      for (const tx of parsed.transactions) {
        // Check if transaction already exists
        const exists = await db.checkTransactionExists(account.id, tx.fitId);
        if (exists) {
          result.duplicatesSkipped++;
          continue;
        }

        const { month, year } = extractMonthYear(tx.datePosted);

        // Determine flowType based on account type and amount direction
        const isCreditCard = account.accountType === 'CREDITCARD' || account.accountType === 'CREDITLINE';
        let flowType: TransactionFlowType;
        if (isCreditCard) {
          // Credit card: positive = charge (purchase), negative = payment (paying off)
          flowType = tx.amount > 0 ? 'charge' : 'payment';
        } else {
          // Checking/Savings: positive = credit (money in), negative = debit (money out)
          flowType = tx.amount >= 0 ? 'credit' : 'debit';
        }

        // Default category for backwards compatibility (derived from flowType)
        // Will be deprecated - use chartAccountId instead
        let category: TransactionCategory;
        if (isCreditCard) {
          category = tx.amount > 0 ? 'expense' : 'transfer';
        } else {
          category = tx.amount >= 0 ? 'revenue' : 'expense';
        }

        let revenueSourceId: number | undefined;
        let chartAccountId: string | undefined;
        let transferAccountId: number | undefined;
        let isIgnored = false;

        for (const rule of applicableRules) {
          const textToMatch = rule.matchField === 'name' ? tx.name :
            rule.matchField === 'memo' ? (tx.memo || '') :
            `${tx.name} ${tx.memo || ''}`;

          const applyRule = () => {
            category = rule.category;
            chartAccountId = rule.chartAccountId; // Can be set for any category
            revenueSourceId = rule.revenueSourceId;
            transferAccountId = rule.transferAccountId;
            isIgnored = rule.category === 'ignore';
          };

          try {
            const regex = new RegExp(rule.pattern, 'i');
            if (regex.test(textToMatch)) {
              applyRule();
              break;
            }
          } catch {
            // Invalid regex, try simple string match
            if (textToMatch.toLowerCase().includes(rule.pattern.toLowerCase())) {
              applyRule();
              break;
            }
          }
        }

        transactionsToAdd.push({
          accountId: account.id,
          fitId: tx.fitId,
          type: tx.type,
          flowType,
          amount: tx.amount,
          datePosted: tx.datePosted,
          name: tx.name,
          memo: tx.memo,
          checkNum: tx.checkNum,
          refNum: tx.refNum,
          month,
          year,
          category,
          chartAccountId,
          revenueSourceId,
          transferAccountId,
          isIgnored,
          isReconciled: false,
          importedAt,
          importBatchId,
        });
      }

      // Bulk insert transactions
      if (transactionsToAdd.length > 0) {
        const ids = await db.addBankTransactions(transactionsToAdd);
        result.newTransactions = ids.length;
      }

      // Update account's last import date
      await db.updateBankAccount({
        ...account,
        lastImportDate: importedAt,
      });

      result.success = true;
      await loadData();
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }, [loadData]);

  // ============================================
  // Transaction Operations
  // ============================================

  const getTransactionsByAccount = useCallback((accountId: number): BankTransaction[] => {
    return transactions.filter(t => t.accountId === accountId);
  }, [transactions]);

  const getTransactionsByMonth = useCallback((year: number, month: Month): BankTransaction[] => {
    return transactions.filter(t => t.year === year && t.month === month);
  }, [transactions]);

  const getTransactionsBySource = useCallback((sourceId: number): BankTransaction[] => {
    return transactions.filter(t => t.revenueSourceId === sourceId);
  }, [transactions]);

  const getUnmappedTransactions = useCallback((): BankTransaction[] => {
    return transactions.filter(t =>
      t.category === 'revenue' && !t.revenueSourceId && !t.isReconciled
    );
  }, [transactions]);

  const updateTransaction = useCallback(async (transaction: BankTransaction): Promise<void> => {
    await db.updateBankTransaction(transaction);
    await loadData();
  }, [loadData]);

  const updateTransactions = useCallback(async (txns: BankTransaction[]): Promise<void> => {
    await db.updateBankTransactions(txns);
    await loadData();
  }, [loadData]);

  const deleteTransaction = useCallback(async (id: number): Promise<void> => {
    await db.deleteBankTransaction(id);
    await loadData();
  }, [loadData]);

  const mapTransactionToSource = useCallback(async (
    transactionId: number,
    sourceId: number | undefined,
    createRule?: { pattern: string; matchField: 'name' | 'memo' | 'both' }
  ): Promise<void> => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Update transaction
    await db.updateBankTransaction({
      ...transaction,
      revenueSourceId: sourceId,
      category: sourceId ? 'revenue' : transaction.category,
      isReconciled: true,
    });

    // Create mapping rule if requested
    if (createRule && sourceId) {
      const maxPriority = Math.max(0, ...mappingRules.map(r => r.priority));
      await db.addMappingRule({
        accountId: transaction.accountId,
        pattern: createRule.pattern,
        matchField: createRule.matchField,
        revenueSourceId: sourceId,
        category: 'revenue',
        isActive: true,
        priority: maxPriority + 1,
        createdAt: new Date().toISOString(),
      });
    }

    await loadData();
  }, [transactions, mappingRules, loadData]);

  const bulkCategorize = useCallback(async (
    transactionIds: number[],
    category: TransactionCategory
  ): Promise<void> => {
    const txnsToUpdate = transactions
      .filter(t => transactionIds.includes(t.id))
      .map(t => ({
        ...t,
        category,
        revenueSourceId: category === 'revenue' ? t.revenueSourceId : undefined,
        isReconciled: true,
      }));

    await db.updateBankTransactions(txnsToUpdate);
    await loadData();
  }, [transactions, loadData]);

  const bulkMapToSource = useCallback(async (
    transactionIds: number[],
    sourceId: number
  ): Promise<void> => {
    const txnsToUpdate = transactions
      .filter(t => transactionIds.includes(t.id))
      .map(t => ({
        ...t,
        revenueSourceId: sourceId,
        transferAccountId: undefined,
        category: 'revenue' as TransactionCategory,
        isReconciled: true,
      }));

    await db.updateBankTransactions(txnsToUpdate);
    await loadData();
  }, [transactions, loadData]);

  const mapTransactionToTransfer = useCallback(async (
    transactionId: number,
    transferAccountId: number | undefined,
    createRule?: { pattern: string; matchField: 'name' | 'memo' | 'both' }
  ): Promise<void> => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Update transaction
    await db.updateBankTransaction({
      ...transaction,
      transferAccountId,
      revenueSourceId: undefined,
      category: 'transfer',
      isReconciled: true,
    });

    // Create mapping rule if requested
    if (createRule && transferAccountId) {
      const maxPriority = Math.max(0, ...mappingRules.map(r => r.priority));
      await db.addMappingRule({
        accountId: transaction.accountId,
        pattern: createRule.pattern,
        matchField: createRule.matchField,
        transferAccountId,
        category: 'transfer',
        isActive: true,
        priority: maxPriority + 1,
        createdAt: new Date().toISOString(),
      });
    }

    await loadData();
  }, [transactions, mappingRules, loadData]);

  const bulkMapToTransfer = useCallback(async (
    transactionIds: number[],
    transferAccountId: number
  ): Promise<void> => {
    const txnsToUpdate = transactions
      .filter(t => transactionIds.includes(t.id))
      .map(t => ({
        ...t,
        transferAccountId,
        revenueSourceId: undefined,
        category: 'transfer' as TransactionCategory,
        isReconciled: true,
      }));

    await db.updateBankTransactions(txnsToUpdate);
    await loadData();
  }, [transactions, loadData]);

  const bulkMapToExpense = useCallback(async (
    transactionIds: number[],
    chartAccountId: string
  ): Promise<void> => {
    const txnsToUpdate = transactions
      .filter(t => transactionIds.includes(t.id))
      .map(t => ({
        ...t,
        chartAccountId,
        revenueSourceId: undefined,
        transferAccountId: undefined,
        category: 'expense' as TransactionCategory,
        isReconciled: true,
        isIgnored: false,
      }));

    await db.updateBankTransactions(txnsToUpdate);
    await loadData();
  }, [transactions, loadData]);

  const bulkIgnore = useCallback(async (
    transactionIds: number[]
  ): Promise<void> => {
    const txnsToUpdate = transactions
      .filter(t => transactionIds.includes(t.id))
      .map(t => ({
        ...t,
        category: 'ignore' as TransactionCategory,
        chartAccountId: undefined,
        revenueSourceId: undefined,
        transferAccountId: undefined,
        isIgnored: true,
        isReconciled: true,
      }));

    await db.updateBankTransactions(txnsToUpdate);
    await loadData();
  }, [transactions, loadData]);

  // ============================================
  // Mapping Rule Operations
  // ============================================

  const addMappingRule = useCallback(async (rule: Omit<TransactionMappingRule, 'id'>): Promise<number> => {
    const id = await db.addMappingRule(rule);
    await loadData();
    return id;
  }, [loadData]);

  const updateMappingRule = useCallback(async (rule: TransactionMappingRule): Promise<void> => {
    await db.updateMappingRule(rule);
    await loadData();
  }, [loadData]);

  const deleteMappingRule = useCallback(async (id: number): Promise<void> => {
    await db.deleteMappingRule(id);
    await loadData();
  }, [loadData]);

  const applyMappingRules = useCallback(async (transactionIds?: number[]): Promise<number> => {
    const targetTransactions = transactionIds
      ? transactions.filter(t => transactionIds.includes(t.id))
      : transactions.filter(t => !t.isReconciled);

    if (targetTransactions.length === 0) return 0;

    const activeRules = mappingRules
      .filter(r => r.isActive)
      .sort((a, b) => b.priority - a.priority);

    const updatedTransactions: BankTransaction[] = [];

    for (const tx of targetTransactions) {
      const applicableRules = activeRules.filter(r => !r.accountId || r.accountId === tx.accountId);

      for (const rule of applicableRules) {
        const textToMatch = rule.matchField === 'name' ? tx.name :
          rule.matchField === 'memo' ? (tx.memo || '') :
          `${tx.name} ${tx.memo || ''}`;

        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(textToMatch)) {
            updatedTransactions.push({
              ...tx,
              category: rule.category,
              revenueSourceId: rule.category === 'revenue' ? rule.revenueSourceId : undefined,
              transferAccountId: rule.category === 'transfer' ? rule.transferAccountId : undefined,
              chartAccountId: rule.category === 'expense' ? rule.chartAccountId : undefined,
            });
            break;
          }
        } catch {
          if (textToMatch.toLowerCase().includes(rule.pattern.toLowerCase())) {
            updatedTransactions.push({
              ...tx,
              category: rule.category,
              revenueSourceId: rule.category === 'revenue' ? rule.revenueSourceId : undefined,
              transferAccountId: rule.category === 'transfer' ? rule.transferAccountId : undefined,
              chartAccountId: rule.category === 'expense' ? rule.chartAccountId : undefined,
            });
            break;
          }
        }
      }
    }

    if (updatedTransactions.length > 0) {
      await db.updateBankTransactions(updatedTransactions);
      await loadData();
    }

    return updatedTransactions.length;
  }, [transactions, mappingRules, loadData]);

  const exportMappingRules = useCallback(async (): Promise<string> => {
    return db.exportMappingRules();
  }, []);

  const importMappingRules = useCallback(async (jsonData: string): Promise<{ imported: number; errors: string[] }> => {
    const result = await db.importMappingRules(jsonData);
    await loadData();
    return result;
  }, [loadData]);

  // ============================================
  // Revenue Integration
  // ============================================

  const getActualRevenueFromBank = useCallback((
    sourceId: number,
    year: number,
    month: Month
  ): { total: number; transactions: BankTransaction[] } => {
    const matchingTxns = transactions.filter(
      t => t.revenueSourceId === sourceId &&
           t.year === year &&
           t.month === month &&
           t.category === 'revenue'
    );

    return {
      total: matchingTxns.reduce((sum, t) => sum + t.amount, 0),
      transactions: matchingTxns,
    };
  }, [transactions]);

  const getMonthlyBankSummary = useCallback((
    year: number,
    month: Month
  ): MonthlyBankSummary => {
    const monthTxns = transactions.filter(t => t.year === year && t.month === month);

    const totalCredits = monthTxns
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebits = monthTxns
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const mappedTxns = monthTxns.filter(t => t.revenueSourceId || t.category !== 'revenue');

    const revenueBySource: Record<number, number> = {};
    monthTxns
      .filter(t => t.revenueSourceId && t.category === 'revenue')
      .forEach(t => {
        revenueBySource[t.revenueSourceId!] = (revenueBySource[t.revenueSourceId!] || 0) + t.amount;
      });

    return {
      month,
      year,
      totalCredits,
      totalDebits,
      netAmount: totalCredits - totalDebits,
      transactionCount: monthTxns.length,
      mappedCount: mappedTxns.length,
      unmappedCount: monthTxns.length - mappedTxns.length,
      revenueBySource,
    };
  }, [transactions]);

  const getAllMonthlySummaries = useCallback((year: number): MonthlyBankSummary[] => {
    return MONTHS_ARRAY.map(month => getMonthlyBankSummary(year, month));
  }, [getMonthlyBankSummary]);

  /**
   * Sync mapped bank transactions to actual revenue data.
   * This calculates the total for each source/month from bank transactions
   * and updates the actual revenue data accordingly.
   */
  const syncBankToActual = useCallback(async (
    year: number,
    sources: RevenueSource[],
    updateSourceRevenue: (id: number, month: Month, value: number, type: 'expected' | 'actual') => Promise<void>
  ): Promise<{ sourcesUpdated: number; totalAmount: number }> => {
    // Get all mapped revenue transactions for the year
    const mappedTransactions = transactions.filter(
      t => t.year === year &&
           t.category === 'revenue' &&
           t.revenueSourceId !== undefined
    );

    // Group by source and month
    const totals: Record<number, Record<Month, number>> = {};

    for (const tx of mappedTransactions) {
      if (!tx.revenueSourceId) continue;

      if (!totals[tx.revenueSourceId]) {
        totals[tx.revenueSourceId] = {} as Record<Month, number>;
      }

      totals[tx.revenueSourceId][tx.month] =
        (totals[tx.revenueSourceId][tx.month] || 0) + tx.amount;
    }

    // Update each source's actual data
    let sourcesUpdated = 0;
    let totalAmount = 0;

    for (const source of sources) {
      const sourceTotals = totals[source.id];
      if (!sourceTotals) continue;

      sourcesUpdated++;

      for (const month of MONTHS_ARRAY) {
        const amount = sourceTotals[month] || 0;
        if (amount !== (source.actual[month] || 0)) {
          totalAmount += amount;
          await updateSourceRevenue(source.id, month, amount, 'actual');
        }
      }
    }

    return { sourcesUpdated, totalAmount };
  }, [transactions]);

  // ============================================
  // Statistics
  // ============================================

  const getAccountStats = useCallback((accountId: number) => {
    const accountTxns = transactions.filter(t => t.accountId === accountId);
    const credits = accountTxns.filter(t => t.amount > 0);
    const debits = accountTxns.filter(t => t.amount < 0);

    return {
      totalTransactions: accountTxns.length,
      totalCredits: credits.reduce((sum, t) => sum + t.amount, 0),
      totalDebits: debits.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      creditCount: credits.length,
      debitCount: debits.length,
      mappedCount: accountTxns.filter(t => t.revenueSourceId || t.isReconciled).length,
      unmappedCount: accountTxns.filter(t => !t.revenueSourceId && !t.isReconciled && t.category === 'revenue').length,
    };
  }, [transactions]);

  return {
    // State
    accounts,
    transactions,
    mappingRules,
    loading,

    // Account operations
    addAccount,
    updateAccount,
    deleteAccount,
    getAccountById,

    // Import operations
    importOFXFile,

    // Transaction operations
    getTransactionsByAccount,
    getTransactionsByMonth,
    getTransactionsBySource,
    getUnmappedTransactions,
    updateTransaction,
    updateTransactions,
    deleteTransaction,
    mapTransactionToSource,
    mapTransactionToTransfer,
    bulkCategorize,
    bulkMapToSource,
    bulkMapToTransfer,
    bulkMapToExpense,
    bulkIgnore,

    // Mapping rule operations
    addMappingRule,
    updateMappingRule,
    deleteMappingRule,
    applyMappingRules,
    exportMappingRules,
    importMappingRules,

    // Revenue integration
    getActualRevenueFromBank,
    getMonthlyBankSummary,
    getAllMonthlySummaries,
    syncBankToActual,

    // Statistics
    getAccountStats,

    // Reload data
    reloadData: loadData,
  };
}
