import { describe, it, expect } from 'vitest';
import {
  getCurrencyInfo,
  getCurrencySymbol,
  getCurrencyName,
  isSupportedCurrency,
  getCurrencyLabel,
  SUPPORTED_CURRENCIES,
} from './currency';

describe('Currency Utilities', () => {
  describe('SUPPORTED_CURRENCIES', () => {
    it('should have USD as the first currency', () => {
      expect(SUPPORTED_CURRENCIES[0].code).toBe('USD');
    });

    it('should have all required properties for each currency', () => {
      for (const currency of SUPPORTED_CURRENCIES) {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('symbol');
        expect(currency).toHaveProperty('name');
        expect(typeof currency.code).toBe('string');
        expect(typeof currency.symbol).toBe('string');
        expect(typeof currency.name).toBe('string');
        expect(currency.code.length).toBe(3); // ISO 4217 codes are 3 letters
      }
    });

    it('should have common currencies', () => {
      const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('GBP');
      expect(codes).toContain('JPY');
      expect(codes).toContain('CHF');
      expect(codes).toContain('CAD');
      expect(codes).toContain('AUD');
    });
  });

  describe('getCurrencyInfo', () => {
    it('should return currency info for valid code', () => {
      const info = getCurrencyInfo('USD');
      expect(info).toBeDefined();
      expect(info?.code).toBe('USD');
      expect(info?.symbol).toBe('$');
      expect(info?.name).toBe('US Dollar');
    });

    it('should handle lowercase codes', () => {
      const info = getCurrencyInfo('eur');
      expect(info).toBeDefined();
      expect(info?.code).toBe('EUR');
      expect(info?.symbol).toBe('€');
    });

    it('should handle mixed case codes', () => {
      const info = getCurrencyInfo('GbP');
      expect(info).toBeDefined();
      expect(info?.code).toBe('GBP');
    });

    it('should return undefined for unknown code', () => {
      const info = getCurrencyInfo('XYZ');
      expect(info).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const info = getCurrencyInfo('');
      expect(info).toBeUndefined();
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return symbol for valid codes', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('JPY')).toBe('¥');
      expect(getCurrencySymbol('CHF')).toBe('CHF');
    });

    it('should handle lowercase codes', () => {
      expect(getCurrencySymbol('usd')).toBe('$');
      expect(getCurrencySymbol('eur')).toBe('€');
    });

    it('should return the code itself for unknown currencies', () => {
      expect(getCurrencySymbol('XYZ')).toBe('XYZ');
      expect(getCurrencySymbol('ABC')).toBe('ABC');
    });

    it('should return correct symbols for special currencies', () => {
      expect(getCurrencySymbol('INR')).toBe('₹');
      expect(getCurrencySymbol('KRW')).toBe('₩');
      expect(getCurrencySymbol('BRL')).toBe('R$');
      expect(getCurrencySymbol('AWG')).toBe('ƒ'); // Aruban Florin
    });
  });

  describe('getCurrencyName', () => {
    it('should return name for valid codes', () => {
      expect(getCurrencyName('USD')).toBe('US Dollar');
      expect(getCurrencyName('EUR')).toBe('Euro');
      expect(getCurrencyName('GBP')).toBe('British Pound');
      expect(getCurrencyName('JPY')).toBe('Japanese Yen');
    });

    it('should handle lowercase codes', () => {
      expect(getCurrencyName('usd')).toBe('US Dollar');
    });

    it('should return the code itself for unknown currencies', () => {
      expect(getCurrencyName('XYZ')).toBe('XYZ');
    });
  });

  describe('isSupportedCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(isSupportedCurrency('USD')).toBe(true);
      expect(isSupportedCurrency('EUR')).toBe(true);
      expect(isSupportedCurrency('GBP')).toBe(true);
    });

    it('should handle lowercase codes', () => {
      expect(isSupportedCurrency('usd')).toBe(true);
      expect(isSupportedCurrency('eur')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(isSupportedCurrency('XYZ')).toBe(false);
      expect(isSupportedCurrency('ABC')).toBe(false);
      expect(isSupportedCurrency('')).toBe(false);
    });
  });

  describe('getCurrencyLabel', () => {
    it('should return formatted label for valid codes', () => {
      expect(getCurrencyLabel('USD')).toBe('USD - US Dollar');
      expect(getCurrencyLabel('EUR')).toBe('EUR - Euro');
      expect(getCurrencyLabel('GBP')).toBe('GBP - British Pound');
    });

    it('should handle lowercase codes', () => {
      expect(getCurrencyLabel('usd')).toBe('USD - US Dollar');
    });

    it('should return just the code for unknown currencies', () => {
      expect(getCurrencyLabel('XYZ')).toBe('XYZ');
    });
  });

  describe('Currency symbol uniqueness', () => {
    it('should correctly handle currencies with same symbol', () => {
      // JPY and CNY both use ¥
      expect(getCurrencySymbol('JPY')).toBe('¥');
      expect(getCurrencySymbol('CNY')).toBe('¥');

      // But they should have different names
      expect(getCurrencyName('JPY')).toBe('Japanese Yen');
      expect(getCurrencyName('CNY')).toBe('Chinese Yuan');
    });

    it('should correctly handle Nordic currencies with same symbol', () => {
      // SEK, NOK, DKK all use kr
      expect(getCurrencySymbol('SEK')).toBe('kr');
      expect(getCurrencySymbol('NOK')).toBe('kr');
      expect(getCurrencySymbol('DKK')).toBe('kr');

      // But they should have different names
      expect(getCurrencyName('SEK')).toBe('Swedish Krona');
      expect(getCurrencyName('NOK')).toBe('Norwegian Krone');
      expect(getCurrencyName('DKK')).toBe('Danish Krone');
    });
  });
});
