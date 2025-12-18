/**
 * Fiscal Year Utilities
 *
 * Provides functions for working with fiscal year overrides on transactions.
 * Supports scenarios where a transaction's reporting year differs from its bank date.
 *
 * Example use case:
 * - Invoice sent: December 2024
 * - Payment received: January 2026
 * - Bookkeeper assigns to: Fiscal Year 2025
 */

import type { Transaction, DateRange } from '../types';

/**
 * Get the fiscal year for a transaction.
 * Returns the manually set fiscalYear if present, otherwise extracts year from transaction date.
 */
export function getFiscalYear(transaction: Transaction): number {
  if (transaction.fiscalYear !== undefined) {
    return transaction.fiscalYear;
  }
  return new Date(transaction.date).getFullYear();
}

/**
 * Get the year from the transaction date (ignoring any fiscal year override).
 * Useful for display purposes to show the actual bank date year.
 */
export function getTransactionDateYear(transaction: Transaction): number {
  return new Date(transaction.date).getFullYear();
}

/**
 * Check if a transaction has a fiscal year override.
 */
export function hasFiscalYearOverride(transaction: Transaction): boolean {
  return transaction.fiscalYear !== undefined;
}

/**
 * Check if a transaction's fiscal year differs from its transaction date year.
 * Returns false if no override is set.
 */
export function isFiscalYearDifferent(transaction: Transaction): boolean {
  if (transaction.fiscalYear === undefined) {
    return false;
  }
  return transaction.fiscalYear !== getTransactionDateYear(transaction);
}

/**
 * Filter transactions by fiscal year.
 * Uses fiscalYear override when present, otherwise uses the year from transaction date.
 */
export function filterByFiscalYear(transactions: Transaction[], year: number): Transaction[] {
  return transactions.filter((t) => getFiscalYear(t) === year);
}

/**
 * Filter transactions by date range, using fiscal year for year comparison.
 * The month/day filtering still uses the actual transaction date.
 *
 * This is a hybrid filter:
 * - For year boundaries, uses fiscal year (override or from date)
 * - For month/day boundaries within a year, uses actual transaction date
 *
 * For example, if filtering for 2025:
 * - A transaction dated 2026-01-15 with fiscalYear=2025 WILL be included
 * - A transaction dated 2025-03-15 without override WILL be included
 * - A transaction dated 2024-12-15 without override will NOT be included
 */
export function filterByFiscalDateRange(
  transactions: Transaction[],
  range: DateRange
): Transaction[] {
  const startYear = parseInt(range.start.substring(0, 4), 10);
  const endYear = parseInt(range.end.substring(0, 4), 10);

  // If the range spans a single year, filter by fiscal year
  if (startYear === endYear) {
    return transactions.filter((t) => {
      const fiscalYear = getFiscalYear(t);
      if (fiscalYear !== startYear) {
        return false;
      }

      // If fiscal year matches and there's an override, include regardless of date
      if (t.fiscalYear !== undefined) {
        return true;
      }

      // No override - use actual date for filtering
      return t.date >= range.start && t.date <= range.end;
    });
  }

  // For multi-year ranges, include transactions whose fiscal year falls within range
  return transactions.filter((t) => {
    const fiscalYear = getFiscalYear(t);

    // Check if fiscal year is within the year range
    if (fiscalYear < startYear || fiscalYear > endYear) {
      return false;
    }

    // If fiscal year matches and there's an override, include
    if (t.fiscalYear !== undefined) {
      return true;
    }

    // No override - use actual date
    return t.date >= range.start && t.date <= range.end;
  });
}

/**
 * Get a list of all unique fiscal years in the transactions.
 * Sorted in descending order (most recent first).
 */
export function getUniqueFiscalYears(transactions: Transaction[]): number[] {
  const years = new Set<number>();
  for (const t of transactions) {
    years.add(getFiscalYear(t));
  }
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Group transactions by fiscal year.
 * Returns a Map where keys are fiscal years and values are arrays of transactions.
 */
export function groupByFiscalYear(transactions: Transaction[]): Map<number, Transaction[]> {
  const groups = new Map<number, Transaction[]>();

  for (const t of transactions) {
    const year = getFiscalYear(t);
    const group = groups.get(year) || [];
    group.push(t);
    groups.set(year, group);
  }

  return groups;
}
