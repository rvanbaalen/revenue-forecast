/**
 * Tests for Decimal.js utilities
 *
 * These tests ensure financial calculations are accurate.
 * ACCURACY IS LAW - all tests must pass.
 */

import { describe, it, expect } from 'vitest';
import {
  toDecimal,
  sum,
  subtract,
  multiply,
  divide,
  percentage,
  applyRate,
  abs,
  negate,
  isPositive,
  isNegative,
  isZero,
  compare,
  max,
  min,
  toFixed,
  toString,
  formatCurrency,
  formatWholeNumber,
  formatPercentage,
  sumBy,
  groupAndSum,
  isValidDecimal,
  parseCurrency,
  Decimal,
} from './decimal';

describe('Decimal Utilities', () => {
  describe('toDecimal', () => {
    it('should convert string to Decimal', () => {
      expect(toDecimal('123.45').toString()).toBe('123.45');
      expect(toDecimal('0').toString()).toBe('0');
      expect(toDecimal('-999.99').toString()).toBe('-999.99');
    });

    it('should convert number to Decimal', () => {
      expect(toDecimal(123.45).toString()).toBe('123.45');
      expect(toDecimal(0).toString()).toBe('0');
      expect(toDecimal(-999.99).toString()).toBe('-999.99');
    });

    it('should handle Decimal input', () => {
      const d = new Decimal('123.45');
      expect(toDecimal(d).toString()).toBe('123.45');
    });

    it('should return 0 for null/undefined/empty', () => {
      expect(toDecimal(null).toString()).toBe('0');
      expect(toDecimal(undefined).toString()).toBe('0');
      expect(toDecimal('').toString()).toBe('0');
    });

    it('should return 0 for invalid input', () => {
      expect(toDecimal('abc').toString()).toBe('0');
      expect(toDecimal('12.34.56').toString()).toBe('0');
    });
  });

  describe('Arithmetic Operations', () => {
    describe('sum', () => {
      it('should sum multiple values', () => {
        expect(sum('100', '200', '300').toString()).toBe('600');
        expect(sum(100, 200, 300).toString()).toBe('600');
        expect(sum('100.50', '200.25', '300.25').toString()).toBe('601');
      });

      it('should handle negative values', () => {
        expect(sum('100', '-50', '25').toString()).toBe('75');
      });

      it('should return 0 for empty input', () => {
        expect(sum().toString()).toBe('0');
      });

      it('should handle floating point precision', () => {
        // Classic floating point issue: 0.1 + 0.2 !== 0.3 in JS
        expect(sum('0.1', '0.2').toString()).toBe('0.3');
        expect(sum('0.1', '0.2', '0.3').toString()).toBe('0.6');
      });
    });

    describe('subtract', () => {
      it('should subtract correctly', () => {
        expect(subtract('100', '30').toString()).toBe('70');
        expect(subtract('100.50', '50.25').toString()).toBe('50.25');
      });

      it('should handle negative results', () => {
        expect(subtract('30', '100').toString()).toBe('-70');
      });
    });

    describe('multiply', () => {
      it('should multiply correctly', () => {
        expect(multiply('10', '5').toString()).toBe('50');
        expect(multiply('10.5', '2').toString()).toBe('21');
      });

      it('should handle decimal multiplication precision', () => {
        // 0.1 * 0.2 = 0.02 (not 0.020000000000000004)
        expect(multiply('0.1', '0.2').toString()).toBe('0.02');
      });
    });

    describe('divide', () => {
      it('should divide correctly', () => {
        expect(divide('100', '4').toString()).toBe('25');
        expect(divide('10', '3').toFixed(4)).toBe('3.3333');
      });

      it('should return 0 for division by zero', () => {
        expect(divide('100', '0').toString()).toBe('0');
      });
    });
  });

  describe('Financial Calculations', () => {
    describe('percentage', () => {
      it('should calculate percentage correctly', () => {
        expect(percentage('25', '100').toString()).toBe('25');
        expect(percentage('50', '200').toString()).toBe('25');
        expect(percentage('1', '3').toFixed(2)).toBe('33.33');
      });

      it('should return 0 when total is 0', () => {
        expect(percentage('100', '0').toString()).toBe('0');
      });
    });

    describe('applyRate', () => {
      it('should apply percentage rate correctly', () => {
        // 15% of 1000 = 150
        expect(applyRate('1000', '15').toString()).toBe('150');
        // 15% of 50000 = 7500
        expect(applyRate('50000', '15').toString()).toBe('7500');
        // 6% VAT on 100 = 6
        expect(applyRate('100', '6').toString()).toBe('6');
      });

      it('should handle decimal rates', () => {
        // 15.5% of 1000 = 155
        expect(applyRate('1000', '15.5').toString()).toBe('155');
      });
    });

    describe('P&L Tax Calculation', () => {
      it('should calculate local income tax at 15%', () => {
        const localIncome = '50000';
        const taxRate = '15';
        const tax = applyRate(localIncome, taxRate);
        expect(tax.toString()).toBe('7500');
      });

      it('should calculate net profit correctly', () => {
        const localIncome = '50000';
        const foreignIncome = '30000';
        const expenses = '11000';
        const taxRate = '15';

        const totalRevenue = sum(localIncome, foreignIncome);
        expect(totalRevenue.toString()).toBe('80000');

        const grossProfit = subtract(totalRevenue, expenses);
        expect(grossProfit.toString()).toBe('69000');

        const tax = applyRate(localIncome, taxRate);
        expect(tax.toString()).toBe('7500');

        const netProfit = subtract(grossProfit, tax);
        expect(netProfit.toString()).toBe('61500');
      });
    });

    describe('Complex Financial Scenarios', () => {
      it('should handle many small transactions accurately', () => {
        // Simulate 100 transactions of $9.99
        const transactions = Array(100).fill('9.99');
        const total = sum(...transactions);
        expect(total.toString()).toBe('999');
      });

      it('should handle large amounts accurately', () => {
        const amount = '999999999999.99';
        expect(toDecimal(amount).toString()).toBe('999999999999.99');
        expect(multiply(amount, '2').toString()).toBe('1999999999999.98');
      });

      it('should handle very small amounts accurately', () => {
        expect(sum('0.001', '0.002', '0.003').toString()).toBe('0.006');
      });
    });
  });

  describe('Comparison Functions', () => {
    describe('abs', () => {
      it('should return absolute value', () => {
        expect(abs('-100').toString()).toBe('100');
        expect(abs('100').toString()).toBe('100');
        expect(abs('0').toString()).toBe('0');
      });
    });

    describe('negate', () => {
      it('should negate values', () => {
        expect(negate('100').toString()).toBe('-100');
        expect(negate('-100').toString()).toBe('100');
        expect(negate('0').toString()).toBe('0');
      });
    });

    describe('isPositive/isNegative/isZero', () => {
      it('should detect positive values', () => {
        expect(isPositive('100')).toBe(true);
        expect(isPositive('0.01')).toBe(true);
        expect(isPositive('0')).toBe(false);
        expect(isPositive('-1')).toBe(false);
      });

      it('should detect negative values', () => {
        expect(isNegative('-100')).toBe(true);
        expect(isNegative('-0.01')).toBe(true);
        expect(isNegative('0')).toBe(false);
        expect(isNegative('1')).toBe(false);
      });

      it('should detect zero', () => {
        expect(isZero('0')).toBe(true);
        expect(isZero('0.00')).toBe(true);
        expect(isZero('0.001')).toBe(false);
        expect(isZero('-0.001')).toBe(false);
      });
    });

    describe('compare', () => {
      it('should compare values correctly', () => {
        expect(compare('100', '50')).toBe(1);
        expect(compare('50', '100')).toBe(-1);
        expect(compare('100', '100')).toBe(0);
        expect(compare('100.00', '100')).toBe(0);
      });
    });

    describe('max/min', () => {
      it('should find maximum', () => {
        expect(max('10', '20', '15').toString()).toBe('20');
        expect(max('-10', '-20', '-5').toString()).toBe('-5');
      });

      it('should find minimum', () => {
        expect(min('10', '20', '15').toString()).toBe('10');
        expect(min('-10', '-20', '-5').toString()).toBe('-20');
      });

      it('should return 0 for empty input', () => {
        expect(max().toString()).toBe('0');
        expect(min().toString()).toBe('0');
      });
    });
  });

  describe('Formatting Functions', () => {
    describe('toFixed', () => {
      it('should format with specified decimals', () => {
        expect(toFixed('123.456', 2)).toBe('123.46');
        expect(toFixed('123.4', 2)).toBe('123.40');
        expect(toFixed('123', 2)).toBe('123.00');
        expect(toFixed('123.456', 0)).toBe('123');
      });

      it('should round correctly', () => {
        expect(toFixed('123.445', 2)).toBe('123.45'); // Round up
        expect(toFixed('123.444', 2)).toBe('123.44'); // Round down
        expect(toFixed('123.455', 2)).toBe('123.46'); // Round half up
      });
    });

    describe('formatCurrency', () => {
      it('should format with currency symbol', () => {
        expect(formatCurrency('1234.56', '$')).toBe('$1,234.56');
        expect(formatCurrency('1234.5', '$')).toBe('$1,234.50');
        expect(formatCurrency('1234', '$')).toBe('$1,234.00');
      });

      it('should handle negative amounts', () => {
        expect(formatCurrency('-1234.56', '$')).toBe('-$1,234.56');
      });

      it('should handle different symbols', () => {
        expect(formatCurrency('1234.56', '€')).toBe('€1,234.56');
        expect(formatCurrency('1234.56', '£')).toBe('£1,234.56');
      });

      it('should handle whole numbers', () => {
        expect(formatCurrency('1000', '$', 0)).toBe('$1,000');
      });
    });

    describe('formatWholeNumber', () => {
      it('should format as whole number', () => {
        expect(formatWholeNumber('1234.56')).toBe('1,235');
        expect(formatWholeNumber('1234.44')).toBe('1,234');
        expect(formatWholeNumber('1000000')).toBe('1,000,000');
      });
    });

    describe('formatPercentage', () => {
      it('should format as percentage', () => {
        expect(formatPercentage('15.5', 2)).toBe('15.50%');
        expect(formatPercentage('100', 0)).toBe('100%');
        expect(formatPercentage('33.333', 1)).toBe('33.3%');
      });
    });
  });

  describe('Aggregation Functions', () => {
    describe('sumBy', () => {
      it('should sum by key', () => {
        const items = [
          { name: 'A', amount: '100.50' },
          { name: 'B', amount: '200.25' },
          { name: 'C', amount: '300.25' },
        ];
        expect(sumBy(items, 'amount').toString()).toBe('601');
      });

      it('should handle numeric values', () => {
        const items = [
          { name: 'A', amount: 100 },
          { name: 'B', amount: 200 },
        ];
        expect(sumBy(items, 'amount').toString()).toBe('300');
      });

      it('should return 0 for empty array', () => {
        expect(sumBy([], 'amount').toString()).toBe('0');
      });
    });

    describe('groupAndSum', () => {
      it('should group and sum correctly', () => {
        const transactions = [
          { category: 'income', amount: '1000' },
          { category: 'expense', amount: '500' },
          { category: 'income', amount: '2000' },
          { category: 'expense', amount: '300' },
        ];

        const result = groupAndSum(transactions, 'category', 'amount');
        expect(result.get('income')?.toString()).toBe('3000');
        expect(result.get('expense')?.toString()).toBe('800');
      });
    });
  });

  describe('Validation Functions', () => {
    describe('isValidDecimal', () => {
      it('should validate decimal strings', () => {
        expect(isValidDecimal('123.45')).toBe(true);
        expect(isValidDecimal('0')).toBe(true);
        expect(isValidDecimal('-123.45')).toBe(true);
        expect(isValidDecimal('abc')).toBe(false);
        expect(isValidDecimal('')).toBe(false);
        expect(isValidDecimal('12.34.56')).toBe(false);
      });
    });

    describe('parseCurrency', () => {
      it('should parse currency strings', () => {
        expect(parseCurrency('$1,234.56').toString()).toBe('1234.56');
        expect(parseCurrency('-$1,234.56').toString()).toBe('-1234.56');
        expect(parseCurrency('1234.56').toString()).toBe('1234.56');
        expect(parseCurrency('$1,000,000.00').toString()).toBe('1000000');
      });
    });
  });

  describe('Edge Cases and Precision', () => {
    it('should handle the classic 0.1 + 0.2 problem', () => {
      // In JavaScript: 0.1 + 0.2 = 0.30000000000000004
      // With Decimal.js: 0.1 + 0.2 = 0.3
      const jsResult = 0.1 + 0.2;
      expect(jsResult).not.toBe(0.3); // JS fails

      const decimalResult = sum('0.1', '0.2');
      expect(decimalResult.toString()).toBe('0.3'); // Decimal.js succeeds
    });

    it('should handle repeating decimals', () => {
      // 1/3 = 0.333...
      const result = divide('1', '3');
      expect(result.toFixed(10)).toBe('0.3333333333');
    });

    it('should maintain precision through multiple operations', () => {
      // Start with 1000, apply 15% tax, add back, subtract original
      // Should equal the tax amount exactly
      const original = '1000';
      const taxRate = '15';
      const tax = applyRate(original, taxRate);
      const withTax = sum(original, tax);
      const taxRecovered = subtract(withTax, original);

      expect(tax.toString()).toBe('150');
      expect(withTax.toString()).toBe('1150');
      expect(taxRecovered.toString()).toBe('150');
      expect(compare(tax, taxRecovered)).toBe(0);
    });
  });
});
