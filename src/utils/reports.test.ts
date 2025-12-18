/**
 * Tests for Report Calculations
 *
 * ACCURACY IS LAW - These tests verify all financial calculations are correct.
 */

import { describe, it, expect } from 'vitest';
import type { Transaction, BankAccount, DateRange } from '../types';
import {
  filterByDateRange,
  filterByCategory,
  generateBalanceSheet,
  generateProfitLoss,
  generateCashFlow,
  generateCategorySpending,
  calculateSummaryMetrics,
} from './reports';

// Helper to create test transactions
function createTransaction(
  overrides: Partial<Transaction> & { amount: string; category: Transaction['category'] }
): Transaction {
  return {
    id: crypto.randomUUID(),
    accountId: 'acc-1',
    fitId: `fit-${Date.now()}-${Math.random()}`,
    date: '2024-06-15',
    name: 'Test Transaction',
    memo: '',
    type: 'OTHER',
    subcategory: 'Other',
    importBatchId: 'batch-1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create test accounts
function createAccount(overrides: Partial<BankAccount>): BankAccount {
  return {
    id: 'acc-1',
    contextId: 'ctx-1',
    name: 'Test Account',
    type: 'checking',
    currency: 'USD',
    bankId: 'BANK001',
    accountNumber: '****1234',
    accountIdHash: 'hash-1',
    balance: '0',
    balanceDate: '2024-06-30',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Report Utilities', () => {
  describe('filterByDateRange', () => {
    const transactions = [
      createTransaction({ date: '2024-01-15', amount: '100', category: 'income' }),
      createTransaction({ date: '2024-06-15', amount: '200', category: 'income' }),
      createTransaction({ date: '2024-12-15', amount: '300', category: 'income' }),
    ];

    it('should filter transactions within date range', () => {
      const range: DateRange = { start: '2024-01-01', end: '2024-06-30' };
      const result = filterByDateRange(transactions, range);
      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe('100');
      expect(result[1].amount).toBe('200');
    });

    it('should include transactions on boundary dates', () => {
      const range: DateRange = { start: '2024-06-15', end: '2024-06-15' };
      const result = filterByDateRange(transactions, range);
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe('200');
    });

    it('should return empty array for no matches', () => {
      const range: DateRange = { start: '2025-01-01', end: '2025-12-31' };
      const result = filterByDateRange(transactions, range);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterByCategory', () => {
    const transactions = [
      createTransaction({ amount: '100', category: 'income' }),
      createTransaction({ amount: '-50', category: 'expense' }),
      createTransaction({ amount: '-30', category: 'expense' }),
      createTransaction({ amount: '0', category: 'transfer' }),
    ];

    it('should filter by category', () => {
      expect(filterByCategory(transactions, 'income')).toHaveLength(1);
      expect(filterByCategory(transactions, 'expense')).toHaveLength(2);
      expect(filterByCategory(transactions, 'transfer')).toHaveLength(1);
      expect(filterByCategory(transactions, 'uncategorized')).toHaveLength(0);
    });
  });
});

describe('Balance Sheet Report', () => {
  it('should calculate assets from checking accounts', () => {
    const accounts = [
      createAccount({ id: 'acc-1', type: 'checking', balance: '10000.00' }),
      createAccount({ id: 'acc-2', type: 'checking', balance: '5000.00' }),
    ];

    const report = generateBalanceSheet(accounts, [], '2024-06-30');

    expect(report.assets.accounts).toHaveLength(2);
    expect(report.assets.total).toBe('15000.00');
    expect(report.liabilities.total).toBe('0.00');
    expect(report.netWorth).toBe('15000.00');
  });

  it('should calculate liabilities from credit cards', () => {
    const accounts = [
      createAccount({ id: 'acc-1', type: 'checking', balance: '10000.00' }),
      createAccount({ id: 'acc-2', type: 'credit_card', balance: '-2500.00' }),
      createAccount({ id: 'acc-3', type: 'credit_card', balance: '-1200.00' }),
    ];

    const report = generateBalanceSheet(accounts, [], '2024-06-30');

    expect(report.assets.total).toBe('10000.00');
    expect(report.liabilities.total).toBe('3700.00');
    expect(report.netWorth).toBe('6300.00');
  });

  it('should handle zero balances', () => {
    const accounts = [
      createAccount({ id: 'acc-1', type: 'checking', balance: '0' }),
    ];

    const report = generateBalanceSheet(accounts, [], '2024-06-30');

    expect(report.assets.total).toBe('0.00');
    expect(report.netWorth).toBe('0.00');
  });
});

describe('Profit & Loss Report', () => {
  const period: DateRange = { start: '2024-01-01', end: '2024-12-31' };

  it('should calculate local and foreign income separately', () => {
    const transactions = [
      createTransaction({
        amount: '30000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Consulting',
      }),
      createTransaction({
        amount: '20000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Product Sales',
      }),
      createTransaction({
        amount: '30000',
        category: 'income',
        incomeType: 'foreign',
        subcategory: 'Consulting',
      }),
    ];

    const report = generateProfitLoss(transactions, period);

    expect(report.revenue.local.total).toBe('50000.00');
    expect(report.revenue.foreign.total).toBe('30000.00');
    expect(report.revenue.total).toBe('80000.00');
  });

  it('should calculate expenses correctly', () => {
    const transactions = [
      createTransaction({
        amount: '-2400',
        category: 'expense',
        subcategory: 'Software Subscriptions',
      }),
      createTransaction({
        amount: '-500',
        category: 'expense',
        subcategory: 'Office Supplies',
      }),
      createTransaction({
        amount: '-5000',
        category: 'expense',
        subcategory: 'Professional Services',
      }),
      createTransaction({
        amount: '-3100',
        category: 'expense',
        subcategory: 'Other Expenses',
      }),
    ];

    const report = generateProfitLoss(transactions, period);

    expect(report.expenses.total).toBe('11000.00');
    expect(report.expenses.items).toHaveLength(4);
  });

  it('should calculate gross profit correctly', () => {
    const transactions = [
      createTransaction({
        amount: '80000',
        category: 'income',
        incomeType: 'foreign',
        subcategory: 'Consulting',
      }),
      createTransaction({
        amount: '-11000',
        category: 'expense',
        subcategory: 'Expenses',
      }),
    ];

    const report = generateProfitLoss(transactions, period);

    expect(report.revenue.total).toBe('80000.00');
    expect(report.expenses.total).toBe('11000.00');
    expect(report.grossProfit).toBe('69000.00');
  });

  it('should calculate tax on local income only at 15%', () => {
    const transactions = [
      createTransaction({
        amount: '50000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Consulting',
      }),
      createTransaction({
        amount: '30000',
        category: 'income',
        incomeType: 'foreign',
        subcategory: 'Consulting',
      }),
    ];

    const report = generateProfitLoss(transactions, period);

    expect(report.tax.rate).toBe('0.15');
    expect(report.tax.amount).toBe('7500.00'); // 50000 * 0.15 = 7500
  });

  it('should calculate net profit correctly (Revenue - Expenses - Tax)', () => {
    const transactions = [
      createTransaction({
        amount: '50000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Local Revenue',
      }),
      createTransaction({
        amount: '30000',
        category: 'income',
        incomeType: 'foreign',
        subcategory: 'Foreign Revenue',
      }),
      createTransaction({
        amount: '-11000',
        category: 'expense',
        subcategory: 'Expenses',
      }),
    ];

    const report = generateProfitLoss(transactions, period);

    // Revenue: 50000 + 30000 = 80000
    expect(report.revenue.total).toBe('80000.00');
    // Expenses: 11000
    expect(report.expenses.total).toBe('11000.00');
    // Gross Profit: 80000 - 11000 = 69000
    expect(report.grossProfit).toBe('69000.00');
    // Tax: 50000 * 0.15 = 7500
    expect(report.tax.amount).toBe('7500.00');
    // Net Profit: 69000 - 7500 = 61500
    expect(report.netProfit).toBe('61500.00');
  });

  it('should handle foreign-only income (no tax)', () => {
    const transactions = [
      createTransaction({
        amount: '100000',
        category: 'income',
        incomeType: 'foreign',
        subcategory: 'Consulting',
      }),
      createTransaction({
        amount: '-20000',
        category: 'expense',
        subcategory: 'Expenses',
      }),
    ];

    const report = generateProfitLoss(transactions, period);

    expect(report.revenue.local.total).toBe('0.00');
    expect(report.revenue.foreign.total).toBe('100000.00');
    expect(report.tax.amount).toBe('0.00'); // No tax on foreign income
    expect(report.netProfit).toBe('80000.00'); // 100000 - 20000 - 0
  });

  it('should filter by date range', () => {
    const transactions = [
      createTransaction({
        date: '2024-01-15',
        amount: '10000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Q1 Revenue',
      }),
      createTransaction({
        date: '2024-06-15',
        amount: '20000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Q2 Revenue',
      }),
      createTransaction({
        date: '2025-01-15', // Outside range
        amount: '30000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Next Year',
      }),
    ];

    const report = generateProfitLoss(transactions, period);

    expect(report.revenue.total).toBe('30000.00'); // Only 2024 transactions
  });
});

describe('Cash Flow Report', () => {
  const period: DateRange = { start: '2024-01-01', end: '2024-12-31' };

  it('should calculate inflows correctly', () => {
    const transactions = [
      createTransaction({
        amount: '50000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Consulting',
      }),
      createTransaction({
        amount: '30000',
        category: 'income',
        incomeType: 'foreign',
        subcategory: 'Product Sales',
      }),
    ];

    const report = generateCashFlow(transactions, [], period);

    expect(report.inflows.total).toBe('80000.00');
    expect(report.inflows.bySubcategory).toHaveLength(2);
  });

  it('should calculate outflows correctly', () => {
    const transactions = [
      createTransaction({
        amount: '-5000',
        category: 'expense',
        subcategory: 'Software',
      }),
      createTransaction({
        amount: '-3000',
        category: 'expense',
        subcategory: 'Travel',
      }),
    ];

    const report = generateCashFlow(transactions, [], period);

    expect(report.outflows.total).toBe('8000.00');
    expect(report.outflows.bySubcategory).toHaveLength(2);
  });

  it('should calculate net cash flow correctly', () => {
    const transactions = [
      createTransaction({
        amount: '80000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Revenue',
      }),
      createTransaction({
        amount: '-11000',
        category: 'expense',
        subcategory: 'Expenses',
      }),
    ];

    const report = generateCashFlow(transactions, [], period);

    expect(report.inflows.total).toBe('80000.00');
    expect(report.outflows.total).toBe('11000.00');
    expect(report.netCashFlow).toBe('69000.00');
  });

  it('should track transfers separately', () => {
    const transactions = [
      createTransaction({
        amount: '1000',
        category: 'transfer',
        subcategory: 'Transfer',
      }),
      createTransaction({
        amount: '-1000',
        category: 'transfer',
        subcategory: 'Transfer',
      }),
    ];

    const report = generateCashFlow(transactions, [], period);

    expect(report.transfers.total).toBe('0.00'); // Should net to 0
  });
});

describe('Category Spending Report', () => {
  const period: DateRange = { start: '2024-01-01', end: '2024-12-31' };

  it('should group expenses by subcategory', () => {
    const transactions = [
      createTransaction({
        amount: '-2400',
        category: 'expense',
        subcategory: 'Software Subscriptions',
      }),
      createTransaction({
        amount: '-100',
        category: 'expense',
        subcategory: 'Software Subscriptions', // Same subcategory
      }),
      createTransaction({
        amount: '-500',
        category: 'expense',
        subcategory: 'Office Supplies',
      }),
    ];

    const report = generateCategorySpending(transactions, period);

    expect(report.expenses).toHaveLength(2);
    const software = report.expenses.find((e) => e.subcategory === 'Software Subscriptions');
    expect(software?.amount).toBe('2500.00'); // 2400 + 100
    expect(software?.transactionCount).toBe(2);
  });

  it('should calculate percentages correctly', () => {
    const transactions = [
      createTransaction({
        amount: '-2500',
        category: 'expense',
        subcategory: 'Software',
      }),
      createTransaction({
        amount: '-7500',
        category: 'expense',
        subcategory: 'Services',
      }),
    ];

    const report = generateCategorySpending(transactions, period);

    expect(report.totalExpenses).toBe('10000.00');
    const software = report.expenses.find((e) => e.subcategory === 'Software');
    expect(software?.percentage).toBe('25.00'); // 2500 / 10000 * 100
    const services = report.expenses.find((e) => e.subcategory === 'Services');
    expect(services?.percentage).toBe('75.00'); // 7500 / 10000 * 100
  });

  it('should sort by amount descending', () => {
    const transactions = [
      createTransaction({ amount: '-100', category: 'expense', subcategory: 'Small' }),
      createTransaction({ amount: '-1000', category: 'expense', subcategory: 'Large' }),
      createTransaction({ amount: '-500', category: 'expense', subcategory: 'Medium' }),
    ];

    const report = generateCategorySpending(transactions, period);

    expect(report.expenses[0].subcategory).toBe('Large');
    expect(report.expenses[1].subcategory).toBe('Medium');
    expect(report.expenses[2].subcategory).toBe('Small');
  });

  it('should include income breakdown', () => {
    const transactions = [
      createTransaction({
        amount: '30000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Consulting',
      }),
      createTransaction({
        amount: '20000',
        category: 'income',
        incomeType: 'foreign',
        subcategory: 'Product Sales',
      }),
    ];

    const report = generateCategorySpending(transactions, period);

    expect(report.income).toHaveLength(2);
    expect(report.totalIncome).toBe('50000.00');
  });
});

describe('Summary Metrics', () => {
  const period: DateRange = { start: '2024-01-01', end: '2024-12-31' };

  it('should calculate all summary metrics correctly', () => {
    const accounts = [
      createAccount({ id: 'acc-1', type: 'checking', balance: '10000' }),
      createAccount({ id: 'acc-2', type: 'credit_card', balance: '-2000' }),
    ];

    const transactions = [
      createTransaction({
        accountId: 'acc-1',
        amount: '50000',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Consulting',
      }),
      createTransaction({
        accountId: 'acc-1',
        amount: '30000',
        category: 'income',
        incomeType: 'foreign',
        subcategory: 'Sales',
      }),
      createTransaction({
        accountId: 'acc-1',
        amount: '-11000',
        category: 'expense',
        subcategory: 'Expenses',
      }),
      createTransaction({
        accountId: 'acc-1',
        amount: '-500',
        category: 'uncategorized',
        subcategory: '',
      }),
    ];

    const metrics = calculateSummaryMetrics(transactions, accounts, period);

    expect(metrics.totalIncome).toBe('80000.00');
    expect(metrics.totalExpenses).toBe('11000.00');
    expect(metrics.taxOwed).toBe('7500.00'); // 50000 * 0.15
    expect(metrics.netProfit).toBe('61500.00'); // 80000 - 11000 - 7500
    expect(metrics.netWorth).toBe('8000.00'); // 10000 - 2000
    expect(metrics.transactionCount).toBe(4);
    expect(metrics.uncategorizedCount).toBe(1);
  });

  it('should handle negative net worth', () => {
    const accounts = [
      createAccount({ id: 'acc-1', type: 'checking', balance: '1000' }),
      createAccount({ id: 'acc-2', type: 'credit_card', balance: '-5000' }),
    ];

    const metrics = calculateSummaryMetrics([], accounts, period);

    expect(metrics.netWorth).toBe('-4000.00');
  });
});

describe('Precision and Accuracy', () => {
  const period: DateRange = { start: '2024-01-01', end: '2024-12-31' };

  it('should handle many small transactions accurately', () => {
    // 100 transactions of $9.99
    const transactions = Array(100)
      .fill(null)
      .map((_, i) =>
        createTransaction({
          id: `tx-${i}`,
          amount: '9.99',
          category: 'income',
          incomeType: 'local',
          subcategory: 'Sales',
        })
      );

    const report = generateProfitLoss(transactions, period);

    expect(report.revenue.total).toBe('999.00'); // Exact, no floating point issues
  });

  it('should calculate tax precisely', () => {
    const transactions = [
      createTransaction({
        amount: '33333.33',
        category: 'income',
        incomeType: 'local',
        subcategory: 'Revenue',
      }),
    ];

    const report = generateProfitLoss(transactions, period);

    // 33333.33 * 0.15 = 5000.00 (approximately, with proper rounding)
    expect(report.tax.amount).toBe('5000.00');
  });

  it('should handle large amounts', () => {
    const transactions = [
      createTransaction({
        amount: '999999999.99',
        category: 'income',
        incomeType: 'foreign',
        subcategory: 'Big Revenue',
      }),
      createTransaction({
        amount: '-123456789.01',
        category: 'expense',
        subcategory: 'Big Expense',
      }),
    ];

    const report = generateProfitLoss(transactions, period);

    expect(report.revenue.total).toBe('999999999.99');
    expect(report.expenses.total).toBe('123456789.01');
    expect(report.grossProfit).toBe('876543210.98');
  });
});
