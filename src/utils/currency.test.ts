import { describe, it, expect } from 'vitest';
import {
  getCurrencyInfo,
  getCurrencySymbol,
  getCurrencyName,
  isSupportedCurrency,
  getCurrencyLabel,
  getSuggestedCurrencyInfo,
  getExchangeRate,
  convertCurrency,
  convertToUsd,
  SUPPORTED_CURRENCIES,
} from './currency';
import type { Currency } from '@/types';

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

  describe('User-defined currencies', () => {
    const userCurrencies: Currency[] = [
      { id: '1', code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin', exchangeRate: '0.56', createdAt: '' },
      { id: '2', code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: '1', createdAt: '' },
      { id: '3', code: 'XYZ', symbol: '¤', name: 'Custom Currency', exchangeRate: '0.5', createdAt: '' },
    ];

    it('should prefer user-defined currencies over predefined', () => {
      // User defined should take precedence
      expect(getCurrencySymbol('AWG', userCurrencies)).toBe('ƒ');
      expect(getCurrencyName('AWG', userCurrencies)).toBe('Aruban Florin');
    });

    it('should find custom currencies not in predefined list', () => {
      expect(getCurrencySymbol('XYZ', userCurrencies)).toBe('¤');
      expect(getCurrencyName('XYZ', userCurrencies)).toBe('Custom Currency');
      expect(isSupportedCurrency('XYZ', userCurrencies)).toBe(true);
    });

    it('should fall back to predefined for currencies not in user list', () => {
      expect(getCurrencySymbol('EUR', userCurrencies)).toBe('€');
      expect(getCurrencyName('EUR', userCurrencies)).toBe('Euro');
    });
  });

  describe('getSuggestedCurrencyInfo', () => {
    it('should return predefined info for known currencies', () => {
      const info = getSuggestedCurrencyInfo('USD');
      expect(info.code).toBe('USD');
      expect(info.symbol).toBe('$');
      expect(info.name).toBe('US Dollar');
    });

    it('should return the code itself for unknown currencies', () => {
      const info = getSuggestedCurrencyInfo('XYZ');
      expect(info.code).toBe('XYZ');
      expect(info.symbol).toBe('XYZ');
      expect(info.name).toBe('XYZ');
    });

    it('should handle lowercase codes', () => {
      const info = getSuggestedCurrencyInfo('eur');
      expect(info.code).toBe('EUR');
      expect(info.symbol).toBe('€');
    });
  });

  describe('getExchangeRate', () => {
    const userCurrencies: Currency[] = [
      { id: '1', code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin', exchangeRate: '0.56', createdAt: '' },
      { id: '2', code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: '1', createdAt: '' },
      { id: '3', code: 'EUR', symbol: '€', name: 'Euro', exchangeRate: '1.08', createdAt: '' },
    ];

    it('should return exchange rate for known currency', () => {
      expect(getExchangeRate('AWG', userCurrencies)).toBe('0.56');
      expect(getExchangeRate('USD', userCurrencies)).toBe('1');
      expect(getExchangeRate('EUR', userCurrencies)).toBe('1.08');
    });

    it('should return 1 for unknown currency', () => {
      expect(getExchangeRate('XYZ', userCurrencies)).toBe('1');
    });

    it('should return 1 when no user currencies provided', () => {
      expect(getExchangeRate('USD')).toBe('1');
    });

    it('should handle case-insensitive lookup', () => {
      expect(getExchangeRate('awg', userCurrencies)).toBe('0.56');
      expect(getExchangeRate('Eur', userCurrencies)).toBe('1.08');
    });
  });

  describe('convertToUsd', () => {
    const userCurrencies: Currency[] = [
      { id: '1', code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin', exchangeRate: '0.56', createdAt: '' },
      { id: '2', code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: '1', createdAt: '' },
      { id: '3', code: 'EUR', symbol: '€', name: 'Euro', exchangeRate: '1.08', createdAt: '' },
    ];

    it('should convert AWG to USD', () => {
      const result = convertToUsd('100', 'AWG', userCurrencies);
      expect(parseFloat(result)).toBe(56); // 100 * 0.56
    });

    it('should convert EUR to USD', () => {
      const result = convertToUsd('100', 'EUR', userCurrencies);
      expect(parseFloat(result)).toBe(108); // 100 * 1.08
    });

    it('should not change USD', () => {
      const result = convertToUsd('100', 'USD', userCurrencies);
      expect(parseFloat(result)).toBe(100); // 100 * 1
    });
  });

  describe('convertCurrency', () => {
    const userCurrencies: Currency[] = [
      { id: '1', code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin', exchangeRate: '0.56', createdAt: '' },
      { id: '2', code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: '1', createdAt: '' },
      { id: '3', code: 'EUR', symbol: '€', name: 'Euro', exchangeRate: '1.08', createdAt: '' },
    ];

    it('should convert AWG to USD', () => {
      const result = convertCurrency('100', 'AWG', 'USD', userCurrencies);
      expect(parseFloat(result)).toBe(56); // 100 * 0.56 / 1
    });

    it('should convert USD to AWG', () => {
      const result = convertCurrency('56', 'USD', 'AWG', userCurrencies);
      expect(parseFloat(result)).toBe(100); // 56 * 1 / 0.56
    });

    it('should convert EUR to AWG', () => {
      const result = convertCurrency('100', 'EUR', 'AWG', userCurrencies);
      // 100 EUR * 1.08 = 108 USD
      // 108 USD / 0.56 = ~192.86 AWG
      const expected = (100 * 1.08) / 0.56;
      expect(parseFloat(result)).toBeCloseTo(expected, 2);
    });

    it('should convert AWG to EUR', () => {
      const result = convertCurrency('100', 'AWG', 'EUR', userCurrencies);
      // 100 AWG * 0.56 = 56 USD
      // 56 USD / 1.08 = ~51.85 EUR
      const expected = (100 * 0.56) / 1.08;
      expect(parseFloat(result)).toBeCloseTo(expected, 2);
    });

    it('should handle same currency (no conversion)', () => {
      const result = convertCurrency('100', 'USD', 'USD', userCurrencies);
      expect(parseFloat(result)).toBe(100);
    });
  });
});
