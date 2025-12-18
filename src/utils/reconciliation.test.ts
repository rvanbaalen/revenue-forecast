/**
 * Tests for Balance Reconciliation Utilities
 *
 * These tests ensure balance reconciliation calculations are accurate.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateExpectedBalance,
  calculateBalanceFromTransactions,
  calculateDiscrepancy,
  needsReconciliation,
  createReconciliation,
  createAdjustmentTransaction,
  performReconciliation,
} from './reconciliation';
import type { BankAccount, Transaction } from '../types';

// Helper to create a mock account
function createMockAccount(overrides: Partial<BankAccount> = {}): BankAccount {
  return {
    id: 'acc-1',
    contextId: 'ctx-1',
    name: 'Test Checking',
    type: 'checking',
    currency: 'USD',
    bankId: 'TEST-BANK',
    accountNumber: '****1234',
    accountIdHash: 'hash123',
    balance: '1000.00',
    balanceDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper to create a mock transaction
function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    accountId: 'acc-1',
    fitId: 'FIT-001',
    date: '2024-01-15',
    amount: '100.00',
    name: 'Test Transaction',
    memo: '',
    type: 'CREDIT',
    category: 'income',
    subcategory: 'Other Income',
    importBatchId: 'batch-1',
    createdAt: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

describe('Balance Reconciliation Utilities', () => {
  describe('calculateExpectedBalance', () => {
    it('should return OFX balance when as-of date is before balance date', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-15',
      });
      const transactions: Transaction[] = [];

      const result = calculateExpectedBalance(account, transactions, '2024-01-10');
      expect(result).toBe('1000.00');
    });

    it('should return OFX balance when as-of date equals balance date', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-15',
      });
      const transactions: Transaction[] = [];

      const result = calculateExpectedBalance(account, transactions, '2024-01-15');
      expect(result).toBe('1000.00');
    });

    it('should add transactions after OFX balance date', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-01',
      });
      const transactions = [
        createMockTransaction({ date: '2024-01-05', amount: '200.00' }),
        createMockTransaction({ date: '2024-01-10', amount: '-50.00', id: 'tx-2' }),
      ];

      const result = calculateExpectedBalance(account, transactions, '2024-01-15');
      expect(result).toBe('1150.00'); // 1000 + 200 - 50
    });

    it('should not include transactions after as-of date', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-01',
      });
      const transactions = [
        createMockTransaction({ date: '2024-01-05', amount: '200.00' }),
        createMockTransaction({ date: '2024-01-20', amount: '500.00', id: 'tx-2' }),
      ];

      const result = calculateExpectedBalance(account, transactions, '2024-01-10');
      expect(result).toBe('1200.00'); // 1000 + 200 (excludes the 500 after Jan 10)
    });

    it('should not include transactions on the balance date', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-01',
      });
      const transactions = [
        createMockTransaction({ date: '2024-01-01', amount: '200.00' }), // On balance date - should be excluded
        createMockTransaction({ date: '2024-01-02', amount: '100.00', id: 'tx-2' }), // After balance date - included
      ];

      const result = calculateExpectedBalance(account, transactions, '2024-01-05');
      expect(result).toBe('1100.00'); // 1000 + 100 (not the 200 on Jan 1)
    });

    it('should handle many transactions correctly', () => {
      const account = createMockAccount({
        balance: '5000.00',
        balanceDate: '2024-01-01',
      });

      const transactions = [
        createMockTransaction({ id: 'tx-1', date: '2024-01-05', amount: '100.00' }),
        createMockTransaction({ id: 'tx-2', date: '2024-01-10', amount: '-50.00' }),
        createMockTransaction({ id: 'tx-3', date: '2024-01-15', amount: '200.00' }),
        createMockTransaction({ id: 'tx-4', date: '2024-01-20', amount: '-75.00' }),
        createMockTransaction({ id: 'tx-5', date: '2024-01-25', amount: '300.00' }),
      ];

      const result = calculateExpectedBalance(account, transactions, '2024-01-31');
      expect(result).toBe('5475.00'); // 5000 + 100 - 50 + 200 - 75 + 300
    });
  });

  describe('calculateBalanceFromTransactions', () => {
    it('should calculate balance from transactions', () => {
      const transactions = [
        createMockTransaction({ id: 'tx-1', date: '2024-01-05', amount: '1000.00' }),
        createMockTransaction({ id: 'tx-2', date: '2024-01-10', amount: '-200.00' }),
        createMockTransaction({ id: 'tx-3', date: '2024-01-15', amount: '500.00' }),
      ];

      const result = calculateBalanceFromTransactions(transactions, '2024-01-20');
      expect(result).toBe('1300.00'); // 1000 - 200 + 500
    });

    it('should only include transactions up to as-of date', () => {
      const transactions = [
        createMockTransaction({ id: 'tx-1', date: '2024-01-05', amount: '1000.00' }),
        createMockTransaction({ id: 'tx-2', date: '2024-01-10', amount: '-200.00' }),
        createMockTransaction({ id: 'tx-3', date: '2024-01-15', amount: '500.00' }),
        createMockTransaction({ id: 'tx-4', date: '2024-01-25', amount: '999.00' }),
      ];

      const result = calculateBalanceFromTransactions(transactions, '2024-01-15');
      expect(result).toBe('1300.00'); // 1000 - 200 + 500 (excludes 999)
    });

    it('should return 0 for empty transactions', () => {
      const result = calculateBalanceFromTransactions([], '2024-01-15');
      expect(result).toBe('0.00');
    });
  });

  describe('calculateDiscrepancy', () => {
    it('should calculate positive discrepancy (bank has more)', () => {
      const result = calculateDiscrepancy('1000.00', '1100.00');
      expect(result).toBe('100.00');
    });

    it('should calculate negative discrepancy (bank has less)', () => {
      const result = calculateDiscrepancy('1000.00', '900.00');
      expect(result).toBe('-100.00');
    });

    it('should return 0 when balances match', () => {
      const result = calculateDiscrepancy('1000.00', '1000.00');
      expect(result).toBe('0.00');
    });

    it('should handle decimal amounts', () => {
      const result = calculateDiscrepancy('1234.56', '1234.78');
      expect(result).toBe('0.22');
    });
  });

  describe('needsReconciliation', () => {
    it('should return true when there is a discrepancy', () => {
      expect(needsReconciliation('1000.00', '1100.00')).toBe(true);
      expect(needsReconciliation('1000.00', '999.99')).toBe(true);
    });

    it('should return false when balances match', () => {
      expect(needsReconciliation('1000.00', '1000.00')).toBe(false);
      expect(needsReconciliation('0.00', '0.00')).toBe(false);
    });
  });

  describe('createReconciliation', () => {
    it('should create a reconciliation record', () => {
      const result = createReconciliation(
        'acc-1',
        '2024-01-15',
        '1000.00',
        '1100.00',
        'Monthly reconciliation'
      );

      expect(result.id).toBeDefined();
      expect(result.accountId).toBe('acc-1');
      expect(result.reconciledDate).toBe('2024-01-15');
      expect(result.expectedBalance).toBe('1000.00');
      expect(result.actualBalance).toBe('1100.00');
      expect(result.adjustmentAmount).toBe('100.00');
      expect(result.notes).toBe('Monthly reconciliation');
      expect(result.adjustmentTransactionId).toBeNull();
      expect(result.createdAt).toBeDefined();
    });

    it('should include adjustment transaction ID when provided', () => {
      const result = createReconciliation(
        'acc-1',
        '2024-01-15',
        '1000.00',
        '1100.00',
        '',
        'adj-tx-123'
      );

      expect(result.adjustmentTransactionId).toBe('adj-tx-123');
    });
  });

  describe('createAdjustmentTransaction', () => {
    it('should create a positive adjustment transaction', () => {
      const result = createAdjustmentTransaction('acc-1', '2024-01-15', '100.00');

      expect(result.id).toBeDefined();
      expect(result.accountId).toBe('acc-1');
      expect(result.date).toBe('2024-01-15');
      expect(result.amount).toBe('100.00');
      expect(result.category).toBe('adjustment');
      expect(result.subcategory).toBe('Balance Adjustment');
      expect(result.name).toBe('Balance Adjustment');
      expect(result.fitId).toContain('RECONCILE-2024-01-15');
    });

    it('should create a negative adjustment transaction', () => {
      const result = createAdjustmentTransaction('acc-1', '2024-01-15', '-50.00');

      expect(result.amount).toBe('-50.00');
    });
  });

  describe('performReconciliation', () => {
    it('should perform full reconciliation with adjustment', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-01',
      });
      const transactions = [
        createMockTransaction({ date: '2024-01-10', amount: '100.00' }),
      ];

      const result = performReconciliation(
        account,
        transactions,
        '2024-01-15',
        '1200.00', // Actual balance (expected is 1100)
        'Test reconciliation',
        true
      );

      expect(result.success).toBe(true);
      expect(result.reconciliation.expectedBalance).toBe('1100.00');
      expect(result.reconciliation.actualBalance).toBe('1200.00');
      expect(result.reconciliation.adjustmentAmount).toBe('100.00');
      expect(result.adjustmentTransaction).not.toBeNull();
      expect(result.adjustmentTransaction?.amount).toBe('100.00');
      expect(result.message).toContain('adjusted');
    });

    it('should not create adjustment when balances match', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-01',
      });
      const transactions: Transaction[] = [];

      const result = performReconciliation(
        account,
        transactions,
        '2024-01-01',
        '1000.00', // Matches expected
        '',
        true
      );

      expect(result.success).toBe(true);
      expect(result.adjustmentTransaction).toBeNull();
      expect(result.message).toContain('no adjustment needed');
    });

    it('should not create adjustment when createAdjustment is false', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-01',
      });
      const transactions: Transaction[] = [];

      const result = performReconciliation(
        account,
        transactions,
        '2024-01-15',
        '1500.00', // Different from expected
        '',
        false // Don't create adjustment
      );

      expect(result.success).toBe(true);
      expect(result.adjustmentTransaction).toBeNull();
      expect(result.reconciliation.adjustmentAmount).toBe('500.00');
    });

    it('should handle negative adjustments', () => {
      const account = createMockAccount({
        balance: '2000.00',
        balanceDate: '2024-01-01',
      });
      const transactions: Transaction[] = [];

      const result = performReconciliation(
        account,
        transactions,
        '2024-01-15',
        '1800.00', // Less than expected (2000)
        'Correction',
        true
      );

      expect(result.success).toBe(true);
      expect(result.reconciliation.adjustmentAmount).toBe('-200.00');
      expect(result.adjustmentTransaction?.amount).toBe('-200.00');
    });

    it('should handle real-world scenario with multiple transactions', () => {
      const account = createMockAccount({
        balance: '5234.56',
        balanceDate: '2024-01-01',
      });

      const transactions = [
        createMockTransaction({ id: 'tx-1', date: '2024-01-05', amount: '1500.00' }),
        createMockTransaction({ id: 'tx-2', date: '2024-01-10', amount: '-234.56' }),
        createMockTransaction({ id: 'tx-3', date: '2024-01-15', amount: '-1000.00' }),
        createMockTransaction({ id: 'tx-4', date: '2024-01-20', amount: '500.00' }),
      ];

      // Expected: 5234.56 + 1500 - 234.56 - 1000 + 500 = 6000.00
      // Actual bank says: 5950.00 (missing 50.00 somewhere)
      const result = performReconciliation(
        account,
        transactions,
        '2024-01-25',
        '5950.00',
        'January statement reconciliation',
        true
      );

      expect(result.success).toBe(true);
      expect(result.reconciliation.expectedBalance).toBe('6000.00');
      expect(result.reconciliation.actualBalance).toBe('5950.00');
      expect(result.reconciliation.adjustmentAmount).toBe('-50.00');
      expect(result.adjustmentTransaction?.amount).toBe('-50.00');
      expect(result.reconciliation.notes).toBe('January statement reconciliation');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero balance', () => {
      const account = createMockAccount({
        balance: '0.00',
        balanceDate: '2024-01-01',
      });
      const transactions: Transaction[] = [];

      const result = performReconciliation(
        account,
        transactions,
        '2024-01-15',
        '100.00',
        '',
        true
      );

      expect(result.reconciliation.expectedBalance).toBe('0.00');
      expect(result.reconciliation.actualBalance).toBe('100.00');
      expect(result.adjustmentTransaction?.amount).toBe('100.00');
    });

    it('should handle negative balance (credit card)', () => {
      const account = createMockAccount({
        type: 'credit_card',
        balance: '-500.00',
        balanceDate: '2024-01-01',
      });
      const transactions = [
        createMockTransaction({ date: '2024-01-10', amount: '-100.00' }), // Charge
      ];

      const result = performReconciliation(
        account,
        transactions,
        '2024-01-15',
        '-650.00', // Actual balance
        '',
        true
      );

      // Expected: -500 - 100 = -600
      // Actual: -650
      // Adjustment: -650 - (-600) = -50
      expect(result.reconciliation.expectedBalance).toBe('-600.00');
      expect(result.reconciliation.actualBalance).toBe('-650.00');
      expect(result.adjustmentTransaction?.amount).toBe('-50.00');
    });

    it('should handle very small discrepancies', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-01',
      });
      const transactions: Transaction[] = [];

      const result = performReconciliation(
        account,
        transactions,
        '2024-01-15',
        '1000.01', // 1 cent difference
        '',
        true
      );

      expect(result.reconciliation.adjustmentAmount).toBe('0.01');
      expect(result.adjustmentTransaction?.amount).toBe('0.01');
    });

    it('should handle date with timestamp format', () => {
      const account = createMockAccount({
        balance: '1000.00',
        balanceDate: '2024-01-01T00:00:00Z', // ISO format with time
      });
      const transactions = [
        createMockTransaction({ date: '2024-01-05T12:30:00Z', amount: '100.00' }),
      ];

      const result = calculateExpectedBalance(account, transactions, '2024-01-10');
      expect(result).toBe('1100.00');
    });
  });
});
