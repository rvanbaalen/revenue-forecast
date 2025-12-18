/**
 * Report Calculations for Financial Reports
 *
 * ACCURACY IS LAW - All calculations use Decimal.js
 *
 * Reports:
 * - Balance Sheet: Assets - Liabilities = Net Worth
 * - Profit & Loss: Revenue - Expenses - Tax = Net Profit
 * - Cash Flow: Inflows - Outflows = Net Cash Flow
 * - Category Spending: Breakdown by subcategory
 */

import type {
  Transaction,
  BankAccount,
  DateRange,
  BalanceSheetReport,
  ProfitLossReport,
  CashFlowReport,
  CategorySpendingReport,
  PLLineItem,
  CategorySpendingItem,
  AccountBalanceItem,
} from '../types';
import {
  toDecimal,
  sum,
  subtract,
  multiply,
  percentage,
  abs,
  isPositive,
  isNegative,
  toFixed,
  groupAndSum,
  Decimal,
} from './decimal';

// Re-export the tax rate
const TAX_RATE = '0.15'; // 15% on local income

/**
 * Filter transactions by date range
 */
export function filterByDateRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((t) => t.date >= range.start && t.date <= range.end);
}

/**
 * Filter transactions by category
 */
export function filterByCategory(
  transactions: Transaction[],
  category: Transaction['category']
): Transaction[] {
  return transactions.filter((t) => t.category === category);
}

/**
 * Get transactions for a specific context (via accounts)
 */
export function filterByAccounts(transactions: Transaction[], accountIds: Set<string>): Transaction[] {
  return transactions.filter((t) => accountIds.has(t.accountId));
}

/**
 * Calculate account balance from transactions
 * Balance = Opening Balance + Sum(all transactions)
 *
 * For checking: positive balance = money available
 * For credit card: negative balance = money owed
 */
export function calculateAccountBalance(
  account: BankAccount,
  _transactions: Transaction[]
): string {
  // Start with the balance from OFX (or 0 if not set)
  const openingBalance = toDecimal(account.balance);

  // Note: For simplicity, we use the OFX balance directly
  // In a more sophisticated system, we'd track opening balance separately
  // and calculate: opening + sum(transactions after opening date)
  return toFixed(openingBalance);
}

/**
 * Generate Balance Sheet report
 *
 * ASSETS = Checking account balances (positive)
 * LIABILITIES = Credit card balances (negative = owed)
 * NET WORTH = Assets - Liabilities
 */
export function generateBalanceSheet(
  accounts: BankAccount[],
  _transactions: Transaction[],
  asOf: string
): BalanceSheetReport {
  const assets: AccountBalanceItem[] = [];
  const liabilities: AccountBalanceItem[] = [];

  let totalAssets = new Decimal(0);
  let totalLiabilities = new Decimal(0);

  for (const account of accounts) {
    // For balance sheet, we use the account's stored balance
    // (which comes from OFX or is calculated)
    const balance = toDecimal(account.balance);

    const item: AccountBalanceItem = {
      accountId: account.id,
      accountName: account.name,
      accountType: account.type,
      currency: account.currency,
      balance: toFixed(balance),
    };

    if (account.type === 'checking') {
      assets.push(item);
      totalAssets = totalAssets.plus(balance);
    } else if (account.type === 'credit_card') {
      liabilities.push(item);
      // Credit card balance: negative = owed, positive = credit
      // For liabilities, we want the absolute value of what's owed
      totalLiabilities = totalLiabilities.plus(abs(balance));
    }
  }

  const netWorth = subtract(totalAssets, totalLiabilities);

  return {
    asOf,
    assets: {
      accounts: assets,
      total: toFixed(totalAssets),
    },
    liabilities: {
      accounts: liabilities,
      total: toFixed(totalLiabilities),
    },
    netWorth: toFixed(netWorth),
  };
}

/**
 * Generate Profit & Loss report
 *
 * REVENUE = Local Income + Foreign Income
 * EXPENSES = Sum of expense transactions (absolute value)
 * GROSS PROFIT = Revenue - Expenses
 * TAX = Local Income × 15%
 * NET PROFIT = Gross Profit - Tax
 */
export function generateProfitLoss(
  transactions: Transaction[],
  period: DateRange
): ProfitLossReport {
  // Filter by date range
  const periodTx = filterByDateRange(transactions, period);

  // Income transactions (positive amounts, category = 'income')
  const incomeTransactions = periodTx.filter(
    (t) => t.category === 'income' && isPositive(t.amount)
  );

  // Split by income type
  const localIncome = incomeTransactions.filter((t) => t.incomeType === 'local');
  const foreignIncome = incomeTransactions.filter((t) => t.incomeType === 'foreign');

  // Group by subcategory
  const localBySubcategory = groupAndSum(localIncome, 'subcategory', 'amount');
  const foreignBySubcategory = groupAndSum(foreignIncome, 'subcategory', 'amount');

  // Calculate local income items
  const localItems: PLLineItem[] = [];
  let totalLocalIncome = new Decimal(0);
  for (const [subcategory, amount] of localBySubcategory) {
    localItems.push({ subcategory, amount: toFixed(amount) });
    totalLocalIncome = totalLocalIncome.plus(amount);
  }

  // Calculate foreign income items
  const foreignItems: PLLineItem[] = [];
  let totalForeignIncome = new Decimal(0);
  for (const [subcategory, amount] of foreignBySubcategory) {
    foreignItems.push({ subcategory, amount: toFixed(amount) });
    totalForeignIncome = totalForeignIncome.plus(amount);
  }

  // Total revenue
  const totalRevenue = sum(totalLocalIncome, totalForeignIncome);

  // Expense transactions (negative amounts, category = 'expense')
  const expenseTransactions = periodTx.filter(
    (t) => t.category === 'expense' && isNegative(t.amount)
  );

  // Group expenses by subcategory
  const expensesBySubcategory = groupAndSum(expenseTransactions, 'subcategory', 'amount');

  // Calculate expense items (convert to absolute values for display)
  const expenseItems: PLLineItem[] = [];
  let totalExpenses = new Decimal(0);
  for (const [subcategory, amount] of expensesBySubcategory) {
    const absAmount = abs(amount);
    expenseItems.push({ subcategory, amount: toFixed(absAmount) });
    totalExpenses = totalExpenses.plus(absAmount);
  }

  // Gross profit
  const grossProfit = subtract(totalRevenue, totalExpenses);

  // Tax on local income (15%)
  const taxAmount = multiply(totalLocalIncome, TAX_RATE);

  // Net profit
  const netProfit = subtract(grossProfit, taxAmount);

  return {
    period,
    revenue: {
      local: {
        items: localItems,
        total: toFixed(totalLocalIncome),
      },
      foreign: {
        items: foreignItems,
        total: toFixed(totalForeignIncome),
      },
      total: toFixed(totalRevenue),
    },
    expenses: {
      items: expenseItems,
      total: toFixed(totalExpenses),
    },
    grossProfit: toFixed(grossProfit),
    tax: {
      rate: TAX_RATE,
      amount: toFixed(taxAmount),
    },
    netProfit: toFixed(netProfit),
  };
}

/**
 * Generate Cash Flow report
 *
 * INFLOWS = Sum of income transactions (positive)
 * OUTFLOWS = Sum of expense transactions (negative, shown as absolute)
 * TRANSFERS = Net of transfer transactions (should be 0 across all accounts)
 * NET CASH FLOW = Inflows - Outflows
 */
export function generateCashFlow(
  transactions: Transaction[],
  accounts: BankAccount[],
  period: DateRange
): CashFlowReport {
  // Filter by date range
  const periodTx = filterByDateRange(transactions, period);

  // Inflows (income)
  const inflowTx = periodTx.filter((t) => t.category === 'income' && isPositive(t.amount));
  const inflowBySubcategory = groupAndSum(inflowTx, 'subcategory', 'amount');

  const inflowItems: PLLineItem[] = [];
  let totalInflows = new Decimal(0);
  for (const [subcategory, amount] of inflowBySubcategory) {
    inflowItems.push({ subcategory, amount: toFixed(amount) });
    totalInflows = totalInflows.plus(amount);
  }

  // Outflows (expenses)
  const outflowTx = periodTx.filter((t) => t.category === 'expense' && isNegative(t.amount));
  const outflowBySubcategory = groupAndSum(outflowTx, 'subcategory', 'amount');

  const outflowItems: PLLineItem[] = [];
  let totalOutflows = new Decimal(0);
  for (const [subcategory, amount] of outflowBySubcategory) {
    const absAmount = abs(amount);
    outflowItems.push({ subcategory, amount: toFixed(absAmount) });
    totalOutflows = totalOutflows.plus(absAmount);
  }

  // Transfers (should net to 0 across all accounts)
  const transferTx = periodTx.filter((t) => t.category === 'transfer');
  const totalTransfers = transferTx.reduce(
    (acc, t) => acc.plus(toDecimal(t.amount)),
    new Decimal(0)
  );

  // Net cash flow
  const netCashFlow = subtract(totalInflows, totalOutflows);

  // Opening and closing balance (sum of all account balances)
  // This is simplified - a real system would track historical balances
  const totalBalance = accounts.reduce(
    (acc, a) => acc.plus(toDecimal(a.balance)),
    new Decimal(0)
  );

  // Opening balance = Closing - Net Cash Flow (approximation)
  const closingBalance = totalBalance;
  const openingBalance = subtract(closingBalance, netCashFlow);

  return {
    period,
    inflows: {
      total: toFixed(totalInflows),
      bySubcategory: inflowItems,
    },
    outflows: {
      total: toFixed(totalOutflows),
      bySubcategory: outflowItems,
    },
    transfers: {
      total: toFixed(totalTransfers),
    },
    netCashFlow: toFixed(netCashFlow),
    openingBalance: toFixed(openingBalance),
    closingBalance: toFixed(closingBalance),
  };
}

/**
 * Generate Category Spending report
 *
 * Groups transactions by subcategory and calculates:
 * - Total amount
 * - Percentage of total
 * - Transaction count
 */
export function generateCategorySpending(
  transactions: Transaction[],
  period: DateRange
): CategorySpendingReport {
  // Filter by date range
  const periodTx = filterByDateRange(transactions, period);

  // Expenses
  const expenseTx = periodTx.filter((t) => t.category === 'expense' && isNegative(t.amount));
  const expenseBySubcategory = groupAndSum(expenseTx, 'subcategory', 'amount');

  // Count transactions per subcategory
  const expenseCountBySubcategory = new Map<string, number>();
  for (const t of expenseTx) {
    const count = expenseCountBySubcategory.get(t.subcategory) || 0;
    expenseCountBySubcategory.set(t.subcategory, count + 1);
  }

  // Calculate total expenses
  let totalExpenses = new Decimal(0);
  for (const [, amount] of expenseBySubcategory) {
    totalExpenses = totalExpenses.plus(abs(amount));
  }

  // Build expense items with percentages
  const expenseItems: CategorySpendingItem[] = [];
  for (const [subcategory, amount] of expenseBySubcategory) {
    const absAmount = abs(amount);
    const pct = totalExpenses.isZero()
      ? new Decimal(0)
      : percentage(absAmount, totalExpenses);

    expenseItems.push({
      subcategory,
      amount: toFixed(absAmount),
      percentage: toFixed(pct),
      transactionCount: expenseCountBySubcategory.get(subcategory) || 0,
    });
  }

  // Sort by amount descending
  expenseItems.sort((a, b) => toDecimal(b.amount).minus(toDecimal(a.amount)).toNumber());

  // Income
  const incomeTx = periodTx.filter((t) => t.category === 'income' && isPositive(t.amount));
  const incomeBySubcategory = groupAndSum(incomeTx, 'subcategory', 'amount');

  // Count transactions per subcategory
  const incomeCountBySubcategory = new Map<string, number>();
  for (const t of incomeTx) {
    const count = incomeCountBySubcategory.get(t.subcategory) || 0;
    incomeCountBySubcategory.set(t.subcategory, count + 1);
  }

  // Calculate total income
  let totalIncome = new Decimal(0);
  for (const [, amount] of incomeBySubcategory) {
    totalIncome = totalIncome.plus(amount);
  }

  // Build income items with percentages
  const incomeItems: CategorySpendingItem[] = [];
  for (const [subcategory, amount] of incomeBySubcategory) {
    const pct = totalIncome.isZero() ? new Decimal(0) : percentage(amount, totalIncome);

    incomeItems.push({
      subcategory,
      amount: toFixed(amount),
      percentage: toFixed(pct),
      transactionCount: incomeCountBySubcategory.get(subcategory) || 0,
    });
  }

  // Sort by amount descending
  incomeItems.sort((a, b) => toDecimal(b.amount).minus(toDecimal(a.amount)).toNumber());

  return {
    period,
    expenses: expenseItems,
    totalExpenses: toFixed(totalExpenses),
    income: incomeItems,
    totalIncome: toFixed(totalIncome),
  };
}

/**
 * Calculate summary metrics for dashboard
 */
export function calculateSummaryMetrics(
  transactions: Transaction[],
  accounts: BankAccount[],
  period: DateRange
): {
  totalIncome: string;
  totalExpenses: string;
  netProfit: string;
  taxOwed: string;
  netWorth: string;
  transactionCount: number;
  uncategorizedCount: number;
} {
  const periodTx = filterByDateRange(transactions, period);

  // Income
  const incomeTx = periodTx.filter((t) => t.category === 'income' && isPositive(t.amount));
  const totalIncome = incomeTx.reduce((acc, t) => acc.plus(toDecimal(t.amount)), new Decimal(0));

  // Local income for tax
  const localIncomeTx = incomeTx.filter((t) => t.incomeType === 'local');
  const totalLocalIncome = localIncomeTx.reduce(
    (acc, t) => acc.plus(toDecimal(t.amount)),
    new Decimal(0)
  );

  // Expenses
  const expenseTx = periodTx.filter((t) => t.category === 'expense' && isNegative(t.amount));
  const totalExpenses = expenseTx.reduce(
    (acc, t) => acc.plus(abs(toDecimal(t.amount))),
    new Decimal(0)
  );

  // Net profit
  const grossProfit = subtract(totalIncome, totalExpenses);
  const taxOwed = multiply(totalLocalIncome, TAX_RATE);
  const netProfit = subtract(grossProfit, taxOwed);

  // Net worth (sum of all account balances)
  const netWorth = accounts.reduce((acc, a) => {
    const balance = toDecimal(a.balance);
    if (a.type === 'checking') {
      return acc.plus(balance);
    } else {
      // Credit card: negative = owed (subtract from net worth)
      return acc.plus(balance); // Balance is already negative if owed
    }
  }, new Decimal(0));

  // Uncategorized
  const uncategorizedCount = periodTx.filter((t) => t.category === 'uncategorized').length;

  return {
    totalIncome: toFixed(totalIncome),
    totalExpenses: toFixed(totalExpenses),
    netProfit: toFixed(netProfit),
    taxOwed: toFixed(taxOwed),
    netWorth: toFixed(netWorth),
    transactionCount: periodTx.length,
    uncategorizedCount,
  };
}
