/**
 * Tests for Fiscal Year Utilities
 *
 * Tests the fiscal year override functionality that allows transactions
 * to be reported in a different fiscal year than their bank date.
 */

import { describe, it, expect } from 'vitest';
import type { Transaction } from '../types';
import {
  getFiscalYear,
  getTransactionDateYear,
  hasFiscalYearOverride,
  isFiscalYearDifferent,
  filterByFiscalYear,
  filterByFiscalDateRange,
  getUniqueFiscalYears,
  groupByFiscalYear,
} from './fiscal-year';

// Helper to create test transactions
function createTransaction(
  overrides: Partial<Transaction> & { date: string }
): Transaction {
  return {
    id: crypto.randomUUID(),
    accountId: 'acc-1',
    fitId: `fit-${Date.now()}-${Math.random()}`,
    amount: '100',
    name: 'Test Transaction',
    memo: '',
    type: 'OTHER',
    category: 'income',
    subcategory: 'Other',
    importBatchId: 'batch-1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Fiscal Year Utilities', () => {
  describe('getFiscalYear', () => {
    it('should return fiscal year override when set', () => {
      const tx = createTransaction({ date: '2026-01-15', fiscalYear: 2025 });
      expect(getFiscalYear(tx)).toBe(2025);
    });

    it('should return year from date when no override', () => {
      const tx = createTransaction({ date: '2024-06-15' });
      expect(getFiscalYear(tx)).toBe(2024);
    });

    it('should handle year boundaries correctly', () => {
      const tx1 = createTransaction({ date: '2024-12-31' });
      const tx2 = createTransaction({ date: '2025-01-01' });

      expect(getFiscalYear(tx1)).toBe(2024);
      expect(getFiscalYear(tx2)).toBe(2025);
    });
  });

  describe('getTransactionDateYear', () => {
    it('should always return year from date, ignoring override', () => {
      const tx = createTransaction({ date: '2026-01-15', fiscalYear: 2025 });
      expect(getTransactionDateYear(tx)).toBe(2026);
    });

    it('should return correct year for various dates', () => {
      expect(getTransactionDateYear(createTransaction({ date: '2020-03-15' }))).toBe(2020);
      expect(getTransactionDateYear(createTransaction({ date: '2025-12-31' }))).toBe(2025);
    });
  });

  describe('hasFiscalYearOverride', () => {
    it('should return true when fiscalYear is set', () => {
      const tx = createTransaction({ date: '2024-06-15', fiscalYear: 2023 });
      expect(hasFiscalYearOverride(tx)).toBe(true);
    });

    it('should return false when fiscalYear is undefined', () => {
      const tx = createTransaction({ date: '2024-06-15' });
      expect(hasFiscalYearOverride(tx)).toBe(false);
    });
  });

  describe('isFiscalYearDifferent', () => {
    it('should return true when fiscal year differs from date year', () => {
      // Invoice in Dec 2024, paid in Jan 2026, assigned to FY 2025
      const tx = createTransaction({ date: '2026-01-15', fiscalYear: 2025 });
      expect(isFiscalYearDifferent(tx)).toBe(true);
    });

    it('should return false when fiscal year matches date year', () => {
      const tx = createTransaction({ date: '2024-06-15', fiscalYear: 2024 });
      expect(isFiscalYearDifferent(tx)).toBe(false);
    });

    it('should return false when no override is set', () => {
      const tx = createTransaction({ date: '2024-06-15' });
      expect(isFiscalYearDifferent(tx)).toBe(false);
    });
  });

  describe('filterByFiscalYear', () => {
    const transactions = [
      createTransaction({ date: '2024-03-15' }), // FY 2024
      createTransaction({ date: '2024-09-20' }), // FY 2024
      createTransaction({ date: '2025-01-10' }), // FY 2025
      createTransaction({ date: '2026-01-15', fiscalYear: 2025 }), // Override to FY 2025
      createTransaction({ date: '2024-12-01', fiscalYear: 2025 }), // Override to FY 2025
    ];

    it('should filter by fiscal year including overrides', () => {
      const fy2024 = filterByFiscalYear(transactions, 2024);
      expect(fy2024).toHaveLength(2);

      const fy2025 = filterByFiscalYear(transactions, 2025);
      expect(fy2025).toHaveLength(3); // 1 natural + 2 overrides
    });

    it('should return empty array for year with no transactions', () => {
      const fy2023 = filterByFiscalYear(transactions, 2023);
      expect(fy2023).toHaveLength(0);
    });
  });

  describe('filterByFiscalDateRange', () => {
    describe('single year ranges', () => {
      const transactions = [
        createTransaction({ date: '2024-03-15' }),
        createTransaction({ date: '2024-09-20' }),
        createTransaction({ date: '2025-01-10' }),
        createTransaction({ date: '2026-01-15', fiscalYear: 2025 }), // Paid 2026, reports as 2025
        createTransaction({ date: '2024-12-20', fiscalYear: 2025 }), // Dec 2024, reports as 2025
      ];

      it('should include transactions with matching fiscal year', () => {
        const range = { start: '2025-01-01', end: '2025-12-31' };
        const result = filterByFiscalDateRange(transactions, range);

        // Should include:
        // - 2025-01-10 (natural date match)
        // - 2026-01-15 with FY 2025 override
        // - 2024-12-20 with FY 2025 override
        expect(result).toHaveLength(3);
      });

      it('should exclude transactions outside fiscal year', () => {
        const range = { start: '2024-01-01', end: '2024-12-31' };
        const result = filterByFiscalDateRange(transactions, range);

        // Should include only natural 2024 transactions (2 of them)
        // The 2024-12-20 transaction has FY 2025 override, so excluded
        expect(result).toHaveLength(2);
      });

      it('should handle quarterly ranges', () => {
        const q1Range = { start: '2024-01-01', end: '2024-03-31' };
        const result = filterByFiscalDateRange(transactions, q1Range);

        expect(result).toHaveLength(1);
        expect(result[0].date).toBe('2024-03-15');
      });
    });

    describe('multi-year ranges', () => {
      const transactions = [
        createTransaction({ date: '2023-06-15' }),
        createTransaction({ date: '2024-06-15' }),
        createTransaction({ date: '2025-06-15' }),
        createTransaction({ date: '2026-01-15', fiscalYear: 2024 }), // Override back to 2024
      ];

      it('should include transactions within year range', () => {
        const range = { start: '2024-01-01', end: '2025-12-31' };
        const result = filterByFiscalDateRange(transactions, range);

        // Should include: 2024-06-15, 2025-06-15, and 2026-01-15 with FY 2024 override
        expect(result).toHaveLength(3);
      });
    });

    describe('edge cases', () => {
      it('should handle transactions on boundary dates', () => {
        const transactions = [
          createTransaction({ date: '2024-01-01' }),
          createTransaction({ date: '2024-12-31' }),
        ];

        const range = { start: '2024-01-01', end: '2024-12-31' };
        const result = filterByFiscalDateRange(transactions, range);

        expect(result).toHaveLength(2);
      });

      it('should return empty array when no matches', () => {
        const transactions = [createTransaction({ date: '2024-06-15' })];
        const range = { start: '2025-01-01', end: '2025-12-31' };

        expect(filterByFiscalDateRange(transactions, range)).toHaveLength(0);
      });
    });
  });

  describe('getUniqueFiscalYears', () => {
    it('should return unique fiscal years sorted descending', () => {
      const transactions = [
        createTransaction({ date: '2024-06-15' }),
        createTransaction({ date: '2023-06-15' }),
        createTransaction({ date: '2025-06-15' }),
        createTransaction({ date: '2024-01-15' }), // Duplicate year
        createTransaction({ date: '2026-01-15', fiscalYear: 2025 }), // Override
      ];

      const years = getUniqueFiscalYears(transactions);

      expect(years).toEqual([2025, 2024, 2023]);
    });

    it('should handle empty transaction array', () => {
      expect(getUniqueFiscalYears([])).toEqual([]);
    });

    it('should use fiscal year override when set', () => {
      const transactions = [
        createTransaction({ date: '2024-06-15', fiscalYear: 2020 }),
      ];

      expect(getUniqueFiscalYears(transactions)).toEqual([2020]);
    });
  });

  describe('groupByFiscalYear', () => {
    it('should group transactions by fiscal year', () => {
      const tx2024a = createTransaction({ date: '2024-03-15' });
      const tx2024b = createTransaction({ date: '2024-09-20' });
      const tx2025 = createTransaction({ date: '2025-01-10' });
      const txOverride = createTransaction({ date: '2026-01-15', fiscalYear: 2025 });

      const transactions = [tx2024a, tx2024b, tx2025, txOverride];
      const groups = groupByFiscalYear(transactions);

      expect(groups.get(2024)).toHaveLength(2);
      expect(groups.get(2025)).toHaveLength(2); // Natural 2025 + override to 2025
      expect(groups.has(2026)).toBe(false);
    });

    it('should handle empty transaction array', () => {
      const groups = groupByFiscalYear([]);
      expect(groups.size).toBe(0);
    });
  });
});

describe('Real-world Fiscal Year Scenarios', () => {
  describe('Invoice paid in later year', () => {
    it('should assign payment to invoice fiscal year', () => {
      // Scenario: Invoice for 10k in December 2024, paid January 2026
      // Bookkeeper assigns to FY 2025
      const payment = createTransaction({
        date: '2026-01-15',
        amount: '10000',
        name: 'Client Payment - Invoice #2024-123',
        fiscalYear: 2025,
      });

      // Should appear in 2025 reports
      const fy2025Range = { start: '2025-01-01', end: '2025-12-31' };
      const result = filterByFiscalDateRange([payment], fy2025Range);

      expect(result).toHaveLength(1);
      expect(getFiscalYear(payment)).toBe(2025);
      expect(getTransactionDateYear(payment)).toBe(2026);
      expect(isFiscalYearDifferent(payment)).toBe(true);
    });
  });

  describe('Year-end adjustments', () => {
    it('should handle moving December expenses to next fiscal year', () => {
      // Prepaid expense in December 2024, should be allocated to 2025
      const prepaidExpense = createTransaction({
        date: '2024-12-28',
        amount: '-12000',
        name: 'Annual Software License (2025)',
        category: 'expense',
        fiscalYear: 2025,
      });

      const fy2024Range = { start: '2024-01-01', end: '2024-12-31' };
      const fy2025Range = { start: '2025-01-01', end: '2025-12-31' };

      expect(filterByFiscalDateRange([prepaidExpense], fy2024Range)).toHaveLength(0);
      expect(filterByFiscalDateRange([prepaidExpense], fy2025Range)).toHaveLength(1);
    });
  });

  describe('Multiple override scenarios mixed', () => {
    it('should correctly filter a mix of regular and overridden transactions', () => {
      const transactions = [
        // Regular 2024 income
        createTransaction({
          date: '2024-06-15',
          amount: '5000',
          name: 'Regular Client Payment',
          category: 'income',
        }),
        // Regular 2024 expense
        createTransaction({
          date: '2024-03-15',
          amount: '-500',
          name: 'Office Supplies',
          category: 'expense',
        }),
        // Late payment moved to 2024
        createTransaction({
          date: '2025-02-01',
          amount: '8000',
          name: 'Late Payment - 2024 Invoice',
          category: 'income',
          fiscalYear: 2024,
        }),
        // Prepaid expense moved to 2025
        createTransaction({
          date: '2024-12-20',
          amount: '-6000',
          name: 'Prepaid 2025 Rent',
          category: 'expense',
          fiscalYear: 2025,
        }),
        // Regular 2025 income
        createTransaction({
          date: '2025-04-10',
          amount: '7000',
          name: 'New Client Payment',
          category: 'income',
        }),
      ];

      const fy2024 = filterByFiscalDateRange(transactions, {
        start: '2024-01-01',
        end: '2024-12-31',
      });

      const fy2025 = filterByFiscalDateRange(transactions, {
        start: '2025-01-01',
        end: '2025-12-31',
      });

      // 2024: Regular income, regular expense, late payment override = 3
      expect(fy2024).toHaveLength(3);

      // 2025: Prepaid expense override, regular 2025 income = 2
      expect(fy2025).toHaveLength(2);
    });
  });
});
