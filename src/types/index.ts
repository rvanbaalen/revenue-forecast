// Months array for iteration
export const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
export type Month = typeof MONTHS[number];

export const MONTH_LABELS: Record<Month, string> = {
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
  may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug',
  sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec'
};

// Currency definition
export interface Currency {
  code: string;      // e.g., 'Cg', 'USD'
  symbol: string;    // e.g., 'ƒ', '$'
  rate: number;      // Exchange rate to base currency (Cg = 1)
}

// Revenue source types
export type RevenueType = 'local' | 'foreign';

// Monthly values for expected and actual revenue
export type MonthlyValues = Partial<Record<Month, number>>;

// Revenue source definition
export interface RevenueSource {
  id: number;
  name: string;
  type: RevenueType;
  currency: string;        // Currency code
  isRecurring: boolean;    // Monthly recurring revenue
  recurringAmount: number; // MRR amount (used if isRecurring is true)
  expected: MonthlyValues; // Expected/budgeted revenue per month
  actual: MonthlyValues;   // Actual revenue per month
}

// Salary definition
export interface Salary {
  id: number;
  name: string;
  amounts: MonthlyValues;   // Monthly salary amounts in Cg
}

// Salary tax definition - allows multiple taxes per salary
export interface SalaryTax {
  id: number;
  salaryId: number;         // Reference to salary
  name: string;             // Tax name (e.g., "Income Tax", "Social Security")
  type: 'percentage' | 'fixed';
  value: number;            // Tax percentage or fixed amount per month worked
}

// Application configuration
export interface AppConfig {
  id: string;
  profitTaxRate: number;    // Local profit tax rate (percentage)
  vatRate: number;          // Local VAT rate (percentage)
  currencies: Currency[];   // Available currencies
  year: number;             // Tracking year
}

// Default configuration
export const DEFAULT_CONFIG: AppConfig = {
  id: 'main',
  profitTaxRate: 16,
  vatRate: 6,
  year: 2026,
  currencies: [
    { code: 'Cg', symbol: 'ƒ', rate: 1 },
    { code: 'USD', symbol: '$', rate: 1.79 },
  ]
};

// Default revenue sources
export const DEFAULT_SOURCES: Omit<RevenueSource, 'id'>[] = [
  { name: 'Source 1', type: 'local', currency: 'Cg', isRecurring: false, recurringAmount: 0, expected: {}, actual: {} },
  { name: 'Source 2', type: 'foreign', currency: 'USD', isRecurring: false, recurringAmount: 0, expected: {}, actual: {} },
];

// Default salaries
export const DEFAULT_SALARIES: Omit<Salary, 'id'>[] = [
  { name: 'Employee 1', amounts: {} }
];

// Default salary taxes
export const DEFAULT_SALARY_TAXES: Omit<SalaryTax, 'id'>[] = [
  { salaryId: 1, name: 'Payroll Tax', type: 'percentage', value: 15 }
];
