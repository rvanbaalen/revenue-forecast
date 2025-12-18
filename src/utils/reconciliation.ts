/**
 * Balance Reconciliation Utilities
 *
 * Functions for calculating expected balances and detecting discrepancies
 * between calculated and actual bank balances.
 */

import type { Transaction, BankAccount, Reconciliation, ReconciliationResult } from '../types';
import { toDecimal, subtract, sum, toFixed, isZero } from './decimal';

/**
 * Calculate the expected balance for an account as of a given date
 *
 * This calculates balance by:
 * 1. Starting from the last known OFX balance
 * 2. Adding all transactions between the OFX balance date and the target date
 *
 * @param account The bank account
 * @param transactions All transactions for this account
 * @param asOfDate The date to calculate balance for (ISO date string YYYY-MM-DD)
 * @returns The expected balance as a Decimal string
 */
export function calculateExpectedBalance(
  account: BankAccount,
  transactions: Transaction[],
  asOfDate: string
): string {
  // Start with the OFX balance
  const baseBalance = toDecimal(account.balance);
  const balanceDate = account.balanceDate.split('T')[0]; // Normalize to YYYY-MM-DD

  // If the as-of date is before or equal to the balance date, just return the OFX balance
  if (asOfDate <= balanceDate) {
    return toFixed(baseBalance);
  }

  // Find transactions between balance date (exclusive) and as-of date (inclusive)
  const relevantTransactions = transactions.filter((tx) => {
    const txDate = tx.date.split('T')[0];
    return txDate > balanceDate && txDate <= asOfDate;
  });

  // Sum all transaction amounts (positive = in, negative = out)
  const transactionTotal = sum(...relevantTransactions.map((tx) => tx.amount));

  // Calculate expected balance
  const expectedBalance = baseBalance.plus(transactionTotal);

  return toFixed(expectedBalance);
}

/**
 * Calculate balance from scratch using all transactions up to a date
 * This is useful when you don't have a reliable starting balance
 *
 * @param transactions All transactions for the account
 * @param asOfDate The date to calculate balance for (ISO date string YYYY-MM-DD)
 * @returns The calculated balance as a Decimal string
 */
export function calculateBalanceFromTransactions(
  transactions: Transaction[],
  asOfDate: string
): string {
  // Filter transactions up to and including the as-of date
  const relevantTransactions = transactions.filter((tx) => {
    const txDate = tx.date.split('T')[0];
    return txDate <= asOfDate;
  });

  // Sum all transaction amounts
  const balance = sum(...relevantTransactions.map((tx) => tx.amount));

  return toFixed(balance);
}

/**
 * Calculate the discrepancy between expected and actual balance
 *
 * @param expectedBalance The calculated expected balance
 * @param actualBalance The actual balance from the bank
 * @returns The difference (actual - expected). Positive means bank has more.
 */
export function calculateDiscrepancy(
  expectedBalance: string,
  actualBalance: string
): string {
  return toFixed(subtract(actualBalance, expectedBalance));
}

/**
 * Check if a balance reconciliation is needed (non-zero discrepancy)
 */
export function needsReconciliation(
  expectedBalance: string,
  actualBalance: string
): boolean {
  const discrepancy = subtract(actualBalance, expectedBalance);
  return !isZero(discrepancy);
}

/**
 * Create a reconciliation record
 *
 * @param accountId The account being reconciled
 * @param reconciledDate The date being reconciled (YYYY-MM-DD)
 * @param expectedBalance The calculated expected balance
 * @param actualBalance The user-entered actual balance
 * @param notes Optional notes about the reconciliation
 * @param adjustmentTransactionId Optional ID of the adjustment transaction created
 * @returns A Reconciliation object
 */
export function createReconciliation(
  accountId: string,
  reconciledDate: string,
  expectedBalance: string,
  actualBalance: string,
  notes: string = '',
  adjustmentTransactionId: string | null = null
): Reconciliation {
  const adjustmentAmount = calculateDiscrepancy(expectedBalance, actualBalance);

  return {
    id: crypto.randomUUID(),
    accountId,
    reconciledDate,
    expectedBalance,
    actualBalance,
    adjustmentAmount,
    adjustmentTransactionId,
    notes,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create an adjustment transaction to reconcile the balance
 *
 * @param accountId The account to adjust
 * @param date The date of the adjustment (usually the reconciliation date)
 * @param amount The adjustment amount (positive to increase balance, negative to decrease)
 * @returns A Transaction object for the adjustment
 */
export function createAdjustmentTransaction(
  accountId: string,
  date: string,
  amount: string
): Transaction {
  return {
    id: crypto.randomUUID(),
    accountId,
    fitId: `RECONCILE-${date}-${crypto.randomUUID().slice(0, 8)}`,
    date,
    amount,
    name: 'Balance Adjustment',
    memo: 'Reconciliation adjustment to match bank balance',
    type: 'OTHER',
    category: 'adjustment',
    subcategory: 'Balance Adjustment',
    importBatchId: `RECONCILE-${date}`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Perform a full reconciliation
 * Creates the reconciliation record and optionally an adjustment transaction
 *
 * @param account The account to reconcile
 * @param transactions The account's transactions
 * @param reconciledDate The date being reconciled
 * @param actualBalance The actual bank balance
 * @param notes Optional notes
 * @param createAdjustment Whether to create an adjustment transaction
 * @returns ReconciliationResult with the reconciliation and optional adjustment transaction
 */
export function performReconciliation(
  account: BankAccount,
  transactions: Transaction[],
  reconciledDate: string,
  actualBalance: string,
  notes: string = '',
  createAdjustment: boolean = true
): ReconciliationResult {
  const expectedBalance = calculateExpectedBalance(account, transactions, reconciledDate);
  const discrepancy = calculateDiscrepancy(expectedBalance, actualBalance);
  const hasDiscrepancy = !isZero(discrepancy);

  let adjustmentTransaction: Transaction | null = null;
  let adjustmentTransactionId: string | null = null;

  if (hasDiscrepancy && createAdjustment) {
    adjustmentTransaction = createAdjustmentTransaction(
      account.id,
      reconciledDate,
      discrepancy
    );
    adjustmentTransactionId = adjustmentTransaction.id;
  }

  const reconciliation = createReconciliation(
    account.id,
    reconciledDate,
    expectedBalance,
    actualBalance,
    notes,
    adjustmentTransactionId
  );

  const message = hasDiscrepancy
    ? `Balance adjusted by ${discrepancy} to match bank balance`
    : 'Balance matches - no adjustment needed';

  return {
    success: true,
    reconciliation,
    adjustmentTransaction,
    message,
  };
}
