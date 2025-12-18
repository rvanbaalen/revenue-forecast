/**
 * Hook for accessing the current context's currency and formatting helpers
 */

import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/utils/decimal';
import { getCurrencySymbol } from '@/utils/currency';

export interface ContextCurrencyResult {
  /** ISO 4217 currency code (e.g., 'USD', 'EUR') */
  currency: string;
  /** Currency symbol (e.g., '$', '€') */
  symbol: string;
  /**
   * Format a value with the context's currency symbol
   * @param value - The numeric value to format
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted currency string
   */
  format: (value: string | number, decimals?: number) => string;
}

/**
 * Hook that provides the current context's currency and a formatting function.
 *
 * @example
 * ```tsx
 * const { currency, symbol, format } = useContextCurrency();
 *
 * // Access currency code
 * console.log(currency); // 'USD'
 *
 * // Access currency symbol
 * console.log(symbol); // '$'
 *
 * // Format amounts
 * format(1234.56); // '$1,234.56'
 * format(1000, 0); // '$1,000'
 * ```
 */
export function useContextCurrency(): ContextCurrencyResult {
  const { contextCurrency, contextCurrencySymbol } = useApp();

  return {
    currency: contextCurrency,
    symbol: contextCurrencySymbol,
    format: (value: string | number, decimals: number = 2) =>
      formatCurrency(value, contextCurrencySymbol, decimals),
  };
}

/**
 * Get currency symbol for a specific currency code.
 * Useful when you need to display a currency different from the context's default.
 *
 * @param currencyCode - ISO 4217 currency code
 * @returns Currency symbol
 */
export function useCurrencySymbol(currencyCode: string): string {
  return getCurrencySymbol(currencyCode);
}
