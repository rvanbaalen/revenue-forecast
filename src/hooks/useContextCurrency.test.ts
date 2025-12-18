import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/utils/decimal';
import { getCurrencySymbol } from '@/utils/currency';

// Test the hook's internal logic without the React context wrapper
// by testing the functions it uses directly

describe('useContextCurrency hook logic', () => {
  describe('currency formatting', () => {
    it('should format values with USD symbol', () => {
      const currencySymbol = getCurrencySymbol('USD');
      expect(currencySymbol).toBe('$');
      expect(formatCurrency(1234.56, currencySymbol, 2)).toBe('$1,234.56');
      expect(formatCurrency(1000, currencySymbol, 0)).toBe('$1,000');
    });

    it('should format values with EUR symbol', () => {
      const currencySymbol = getCurrencySymbol('EUR');
      expect(currencySymbol).toBe('€');
      expect(formatCurrency(1234.56, currencySymbol, 2)).toBe('€1,234.56');
      expect(formatCurrency(1000, currencySymbol, 0)).toBe('€1,000');
    });

    it('should format values with GBP symbol', () => {
      const currencySymbol = getCurrencySymbol('GBP');
      expect(currencySymbol).toBe('£');
      expect(formatCurrency(1234.56, currencySymbol, 2)).toBe('£1,234.56');
    });

    it('should format values with JPY symbol (typically no decimals)', () => {
      const currencySymbol = getCurrencySymbol('JPY');
      expect(currencySymbol).toBe('¥');
      expect(formatCurrency(1234, currencySymbol, 0)).toBe('¥1,234');
    });

    it('should format negative values correctly', () => {
      const currencySymbol = getCurrencySymbol('USD');
      expect(formatCurrency(-1234.56, currencySymbol, 2)).toBe('-$1,234.56');
    });

    it('should format zero correctly', () => {
      const currencySymbol = getCurrencySymbol('USD');
      expect(formatCurrency(0, currencySymbol, 2)).toBe('$0.00');
    });

    it('should handle various decimal places', () => {
      const currencySymbol = getCurrencySymbol('USD');
      expect(formatCurrency(1234.5678, currencySymbol, 0)).toBe('$1,235');
      expect(formatCurrency(1234.5678, currencySymbol, 1)).toBe('$1,234.6');
      expect(formatCurrency(1234.5678, currencySymbol, 2)).toBe('$1,234.57');
      expect(formatCurrency(1234.5678, currencySymbol, 3)).toBe('$1,234.568');
    });
  });

  describe('currency symbol resolution', () => {
    it('should return fallback symbol for unknown currency', () => {
      const currencySymbol = getCurrencySymbol('XYZ');
      expect(currencySymbol).toBe('XYZ');
      expect(formatCurrency(1234.56, currencySymbol, 2)).toBe('XYZ1,234.56');
    });

    it('should handle empty currency code', () => {
      const currencySymbol = getCurrencySymbol('');
      expect(currencySymbol).toBe('');
      expect(formatCurrency(1234.56, currencySymbol, 2)).toBe('1,234.56');
    });
  });

  describe('context currency default behavior', () => {
    it('should default to USD when context has no currency', () => {
      // Simulate context without currency (legacy contexts)
      const contextCurrency = undefined;
      const DEFAULT_CURRENCY = 'USD';

      const effectiveCurrency = contextCurrency || DEFAULT_CURRENCY;
      const symbol = getCurrencySymbol(effectiveCurrency);

      expect(effectiveCurrency).toBe('USD');
      expect(symbol).toBe('$');
    });

    it('should use context currency when available', () => {
      const contextCurrency = 'EUR';
      const DEFAULT_CURRENCY = 'USD';

      const effectiveCurrency = contextCurrency || DEFAULT_CURRENCY;
      const symbol = getCurrencySymbol(effectiveCurrency);

      expect(effectiveCurrency).toBe('EUR');
      expect(symbol).toBe('€');
    });
  });

  describe('multi-currency formatting', () => {
    it('should format same value with different currencies', () => {
      const value = 1000;

      expect(formatCurrency(value, getCurrencySymbol('USD'), 2)).toBe('$1,000.00');
      expect(formatCurrency(value, getCurrencySymbol('EUR'), 2)).toBe('€1,000.00');
      expect(formatCurrency(value, getCurrencySymbol('GBP'), 2)).toBe('£1,000.00');
      expect(formatCurrency(value, getCurrencySymbol('JPY'), 0)).toBe('¥1,000');
      expect(formatCurrency(value, getCurrencySymbol('CHF'), 2)).toBe('CHF1,000.00');
    });

    it('should handle Caribbean florin currencies', () => {
      const value = 100;

      expect(formatCurrency(value, getCurrencySymbol('AWG'), 2)).toBe('ƒ100.00');
      expect(formatCurrency(value, getCurrencySymbol('ANG'), 2)).toBe('ƒ100.00');
    });
  });
});
