/**
 * Decimal.js utilities for accurate financial calculations
 *
 * CRITICAL: All financial calculations MUST use these utilities
 * to avoid floating-point precision errors.
 *
 * Convention:
 * - All amounts are stored as strings in the database
 * - All calculations use Decimal objects
 * - All display values are formatted strings
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20, // High precision for intermediate calculations
  rounding: Decimal.ROUND_HALF_UP, // Standard rounding (banker's rounding alternative: ROUND_HALF_EVEN)
  toExpNeg: -9, // Don't use exponential notation for small numbers
  toExpPos: 21, // Don't use exponential notation for large numbers
});

/**
 * Create a Decimal from a string or number
 * Returns Decimal(0) for invalid inputs
 */
export function toDecimal(value: string | number | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }

  try {
    return new Decimal(value);
  } catch {
    console.warn(`Invalid decimal value: ${value}`);
    return new Decimal(0);
  }
}

/**
 * Add multiple values together
 */
export function sum(...values: (string | number | Decimal)[]): Decimal {
  return values.reduce((acc: Decimal, val) => acc.plus(toDecimal(val)), new Decimal(0));
}

/**
 * Subtract b from a
 */
export function subtract(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

/**
 * Multiply two values
 */
export function multiply(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return toDecimal(a).times(toDecimal(b));
}

/**
 * Divide a by b
 * Returns Decimal(0) if b is zero
 */
export function divide(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    console.warn('Division by zero attempted');
    return new Decimal(0);
  }
  return toDecimal(a).dividedBy(divisor);
}

/**
 * Calculate percentage: (value / total) * 100
 * Returns "0" if total is zero
 */
export function percentage(value: string | number | Decimal, total: string | number | Decimal): Decimal {
  const totalDecimal = toDecimal(total);
  if (totalDecimal.isZero()) {
    return new Decimal(0);
  }
  return toDecimal(value).dividedBy(totalDecimal).times(100);
}

/**
 * Apply a percentage rate to a value: value * (rate / 100)
 * Example: applyRate(1000, 15) = 150 (15% of 1000)
 */
export function applyRate(value: string | number | Decimal, ratePercent: string | number | Decimal): Decimal {
  return toDecimal(value).times(toDecimal(ratePercent).dividedBy(100));
}

/**
 * Get absolute value
 */
export function abs(value: string | number | Decimal): Decimal {
  return toDecimal(value).abs();
}

/**
 * Negate a value (flip sign)
 */
export function negate(value: string | number | Decimal): Decimal {
  return toDecimal(value).negated();
}

/**
 * Check if value is positive (> 0)
 */
export function isPositive(value: string | number | Decimal): boolean {
  return toDecimal(value).isPositive() && !toDecimal(value).isZero();
}

/**
 * Check if value is negative (< 0)
 */
export function isNegative(value: string | number | Decimal): boolean {
  return toDecimal(value).isNegative();
}

/**
 * Check if value is zero
 */
export function isZero(value: string | number | Decimal): boolean {
  return toDecimal(value).isZero();
}

/**
 * Compare two values
 * Returns: -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compare(a: string | number | Decimal, b: string | number | Decimal): -1 | 0 | 1 {
  const result = toDecimal(a).comparedTo(toDecimal(b));
  return result as -1 | 0 | 1;
}

/**
 * Get the maximum of multiple values
 */
export function max(...values: (string | number | Decimal)[]): Decimal {
  if (values.length === 0) return new Decimal(0);
  return values.reduce((acc: Decimal, val) => {
    const d = toDecimal(val);
    return d.greaterThan(acc) ? d : acc;
  }, toDecimal(values[0]));
}

/**
 * Get the minimum of multiple values
 */
export function min(...values: (string | number | Decimal)[]): Decimal {
  if (values.length === 0) return new Decimal(0);
  return values.reduce((acc: Decimal, val) => {
    const d = toDecimal(val);
    return d.lessThan(acc) ? d : acc;
  }, toDecimal(values[0]));
}

// ============================================
// Formatting Functions
// ============================================

/**
 * Format as string with fixed decimal places
 * Default: 2 decimal places for currency
 */
export function toFixed(value: string | number | Decimal, decimals: number = 2): string {
  return toDecimal(value).toFixed(decimals);
}

/**
 * Format as string without trailing zeros
 */
export function toString(value: string | number | Decimal): string {
  return toDecimal(value).toString();
}

/**
 * Format as currency string with symbol
 * Example: formatCurrency(1234.5, '$') => "$1,234.50"
 */
export function formatCurrency(
  value: string | number | Decimal,
  symbol: string = '$',
  decimals: number = 2,
  locale: string = 'en-US'
): string {
  const d = toDecimal(value);
  const isNeg = d.isNegative();
  const absValue = d.abs().toNumber();

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absValue);

  if (isNeg) {
    return `-${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}

/**
 * Format as whole number (no decimals)
 */
export function formatWholeNumber(value: string | number | Decimal, locale: string = 'en-US'): string {
  const d = toDecimal(value);
  const rounded = d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded.toNumber());
}

/**
 * Format as percentage string
 * Example: formatPercentage(15.5) => "15.50%"
 */
export function formatPercentage(value: string | number | Decimal, decimals: number = 2): string {
  return `${toFixed(value, decimals)}%`;
}

// ============================================
// Aggregation Functions
// ============================================

/**
 * Sum an array of objects by a key
 */
export function sumBy<T>(items: T[], key: keyof T): Decimal {
  return items.reduce((acc, item) => {
    const value = item[key];
    if (typeof value === 'string' || typeof value === 'number') {
      return acc.plus(toDecimal(value));
    }
    return acc;
  }, new Decimal(0));
}

/**
 * Group items and sum by a key
 */
export function groupAndSum<T>(
  items: T[],
  groupKey: keyof T,
  sumKey: keyof T
): Map<string, Decimal> {
  const result = new Map<string, Decimal>();

  for (const item of items) {
    const group = String(item[groupKey]);
    const value = item[sumKey];
    const current = result.get(group) || new Decimal(0);

    if (typeof value === 'string' || typeof value === 'number') {
      result.set(group, current.plus(toDecimal(value)));
    }
  }

  return result;
}

// ============================================
// Validation Functions
// ============================================

/**
 * Check if a string is a valid decimal number
 */
export function isValidDecimal(value: string): boolean {
  if (!value || value.trim() === '') return false;

  try {
    new Decimal(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a currency string to Decimal
 * Handles strings like "$1,234.56" or "-$1,234.56"
 */
export function parseCurrency(value: string): Decimal {
  // Remove currency symbols, spaces, and thousands separators
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return toDecimal(cleaned);
}

// Re-export Decimal class for advanced usage
export { Decimal };
