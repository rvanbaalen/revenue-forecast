/**
 * Currency utilities for formatting and displaying currencies
 *
 * Supports both user-defined currencies (stored in IndexedDB) and
 * a fallback list of predefined currencies for common cases.
 *
 * User-defined currencies take precedence over predefined ones.
 */

import type { Currency } from '@/types';
import { multiply, divide } from './decimal';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

/**
 * Supported currencies with their symbols and display names.
 * Ordered by most common usage in financial applications.
 */
export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso' },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
  // Caribbean/Atlantic currencies (often use ƒ symbol from OFX)
  { code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin' },
  { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder' },
];

/**
 * Map of predefined currency codes to their info for quick lookup
 */
const PREDEFINED_CURRENCY_MAP = new Map<string, CurrencyInfo>(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c])
);

/**
 * Convert a user-defined Currency to CurrencyInfo
 */
function currencyToInfo(currency: Currency): CurrencyInfo {
  return {
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name,
  };
}

/**
 * Create a lookup map from user-defined currencies
 */
function createUserCurrencyMap(userCurrencies: Currency[]): Map<string, CurrencyInfo> {
  return new Map(userCurrencies.map((c) => [c.code.toUpperCase(), currencyToInfo(c)]));
}

/**
 * Get currency info by code
 * Checks user-defined currencies first, then falls back to predefined
 * @param code ISO 4217 currency code
 * @param userCurrencies Optional array of user-defined currencies
 * @returns Currency info or undefined if not found
 */
export function getCurrencyInfo(code: string, userCurrencies?: Currency[]): CurrencyInfo | undefined {
  const upperCode = code.toUpperCase();

  // Check user-defined currencies first
  if (userCurrencies) {
    const userMap = createUserCurrencyMap(userCurrencies);
    const userCurrency = userMap.get(upperCode);
    if (userCurrency) {
      return userCurrency;
    }
  }

  // Fall back to predefined currencies
  return PREDEFINED_CURRENCY_MAP.get(upperCode);
}

/**
 * Get currency symbol by code
 * Checks user-defined currencies first, then falls back to predefined
 * Falls back to the code itself if not found anywhere
 * @param code ISO 4217 currency code
 * @param userCurrencies Optional array of user-defined currencies
 * @returns Currency symbol
 */
export function getCurrencySymbol(code: string, userCurrencies?: Currency[]): string {
  const info = getCurrencyInfo(code, userCurrencies);
  return info?.symbol ?? code;
}

/**
 * Get currency name by code
 * Checks user-defined currencies first, then falls back to predefined
 * Falls back to the code itself if not found anywhere
 * @param code ISO 4217 currency code
 * @param userCurrencies Optional array of user-defined currencies
 * @returns Currency name
 */
export function getCurrencyName(code: string, userCurrencies?: Currency[]): string {
  const info = getCurrencyInfo(code, userCurrencies);
  return info?.name ?? code;
}

/**
 * Check if a currency code is known (either user-defined or predefined)
 * @param code ISO 4217 currency code
 * @param userCurrencies Optional array of user-defined currencies
 * @returns True if known
 */
export function isSupportedCurrency(code: string, userCurrencies?: Currency[]): boolean {
  const upperCode = code.toUpperCase();

  if (userCurrencies) {
    const userMap = createUserCurrencyMap(userCurrencies);
    if (userMap.has(upperCode)) {
      return true;
    }
  }

  return PREDEFINED_CURRENCY_MAP.has(upperCode);
}

/**
 * Get display label for a currency (code + name)
 * @param code ISO 4217 currency code
 * @param userCurrencies Optional array of user-defined currencies
 * @returns Display label like "USD - US Dollar"
 */
export function getCurrencyLabel(code: string, userCurrencies?: Currency[]): string {
  const info = getCurrencyInfo(code, userCurrencies);
  if (info) {
    return `${info.code} - ${info.name}`;
  }
  return code;
}

/**
 * Get suggested currency info for a code from OFX import
 * First checks user currencies, then predefined list
 * Returns suggested symbol and name for creating a new currency
 * @param code ISO 4217 currency code
 * @param userCurrencies User-defined currencies
 * @returns Suggested currency info or defaults
 */
export function getSuggestedCurrencyInfo(code: string, userCurrencies?: Currency[]): CurrencyInfo {
  const upperCode = code.toUpperCase();

  // First check if already exists
  const existing = getCurrencyInfo(upperCode, userCurrencies);
  if (existing) {
    return existing;
  }

  // Check predefined for suggestions
  const predefined = PREDEFINED_CURRENCY_MAP.get(upperCode);
  if (predefined) {
    return predefined;
  }

  // Default: use code as both symbol and name
  return {
    code: upperCode,
    symbol: upperCode,
    name: upperCode,
  };
}

/**
 * Get exchange rate for a currency
 * @param code ISO 4217 currency code
 * @param userCurrencies User-defined currencies with exchange rates
 * @returns Exchange rate as string, defaults to '1' if not found
 */
export function getExchangeRate(code: string, userCurrencies?: Currency[]): string {
  if (!userCurrencies) return '1';

  const upperCode = code.toUpperCase();
  const currency = userCurrencies.find((c) => c.code.toUpperCase() === upperCode);
  return currency?.exchangeRate ?? '1';
}

/**
 * Convert an amount from one currency to another using exchange rates
 * All rates are relative to USD, so conversion goes: source -> USD -> target
 *
 * @param amount Amount to convert (string for Decimal.js precision)
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 * @param userCurrencies User-defined currencies with exchange rates
 * @returns Converted amount as string
 */
export function convertCurrency(
  amount: string,
  fromCurrency: string,
  toCurrency: string,
  userCurrencies?: Currency[]
): string {
  const fromRate = getExchangeRate(fromCurrency, userCurrencies);
  const toRate = getExchangeRate(toCurrency, userCurrencies);

  // Convert: amount * fromRate / toRate
  // (amount in source) * (USD per source) / (USD per target) = amount in target
  const inUsd = multiply(amount, fromRate);
  return divide(inUsd, toRate).toString();
}

/**
 * Convert amount to USD using exchange rate
 * @param amount Amount in source currency
 * @param currencyCode Source currency code
 * @param userCurrencies User-defined currencies
 * @returns Amount in USD as string
 */
export function convertToUsd(
  amount: string,
  currencyCode: string,
  userCurrencies?: Currency[]
): string {
  const rate = getExchangeRate(currencyCode, userCurrencies);
  return multiply(amount, rate).toString();
}
