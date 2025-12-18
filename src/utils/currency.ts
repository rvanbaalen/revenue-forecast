/**
 * Currency utilities for formatting and displaying currencies
 *
 * Provides mapping from ISO 4217 currency codes to symbols and display names.
 */

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
 * Map of currency codes to their info for quick lookup
 */
const CURRENCY_MAP = new Map<string, CurrencyInfo>(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c])
);

/**
 * Get currency info by code
 * @param code ISO 4217 currency code
 * @returns Currency info or undefined if not found
 */
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCY_MAP.get(code.toUpperCase());
}

/**
 * Get currency symbol by code
 * Falls back to the code itself if not found
 * @param code ISO 4217 currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(code: string): string {
  const info = getCurrencyInfo(code);
  return info?.symbol ?? code;
}

/**
 * Get currency name by code
 * Falls back to the code itself if not found
 * @param code ISO 4217 currency code
 * @returns Currency name
 */
export function getCurrencyName(code: string): string {
  const info = getCurrencyInfo(code);
  return info?.name ?? code;
}

/**
 * Check if a currency code is supported
 * @param code ISO 4217 currency code
 * @returns True if supported
 */
export function isSupportedCurrency(code: string): boolean {
  return CURRENCY_MAP.has(code.toUpperCase());
}

/**
 * Get display label for a currency (code + name)
 * @param code ISO 4217 currency code
 * @returns Display label like "USD - US Dollar"
 */
export function getCurrencyLabel(code: string): string {
  const info = getCurrencyInfo(code);
  if (info) {
    return `${info.code} - ${info.name}`;
  }
  return code;
}
