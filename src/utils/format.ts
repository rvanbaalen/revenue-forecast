export function formatCurrency(amount: number, showSymbol = true): string {
  if (amount === 0 || isNaN(amount)) return '-';
  const formatted = Math.round(amount).toLocaleString('en-US');
  return showSymbol ? `ƒ ${formatted}` : formatted;
}

export function formatCurrencyWithCode(amount: number, symbol: string): string {
  if (amount === 0 || isNaN(amount)) return '-';
  return `${symbol} ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatVariance(expected: number, actual: number): {
  value: number;
  percentage: number;
  isPositive: boolean;
  display: string;
} {
  const value = actual - expected;
  const percentage = expected !== 0 ? (value / expected) * 100 : 0;
  const isPositive = value >= 0;

  return {
    value,
    percentage,
    isPositive,
    display: `${isPositive ? '+' : ''}${formatCurrency(value, false)} (${isPositive ? '+' : ''}${percentage.toFixed(1)}%)`,
  };
}
