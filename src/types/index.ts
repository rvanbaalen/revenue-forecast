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
  year: new Date().getFullYear(), // Use current year as default
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

// ============================================
// Bank Import Types
// ============================================

// Bank account types from OFX
export type BankAccountType = 'CHECKING' | 'SAVINGS' | 'CREDITLINE' | 'MONEYMRKT' | 'CREDITCARD';

// Transaction types from OFX
export type BankTransactionType = 'CREDIT' | 'DEBIT' | 'INT' | 'DIV' | 'FEE' | 'SRVCHG' | 'DEP' | 'ATM' | 'POS' | 'XFER' | 'CHECK' | 'PAYMENT' | 'CASH' | 'DIRECTDEP' | 'DIRECTDEBIT' | 'REPEATPMT' | 'OTHER';

// Category for transaction classification
export type TransactionCategory = 'revenue' | 'expense' | 'transfer' | 'ignore';

// Bank Account - represents a linked bank account
export interface BankAccount {
  id: number;
  name: string;                    // User-friendly name ("Business Checking")
  bankId: string;                  // Bank routing number (from OFX)
  accountId: string;               // Masked account number for display
  accountIdHash: string;           // Hash of full account ID for matching
  accountType: BankAccountType;
  currency: string;                // Currency code from OFX
  createdAt: string;               // ISO date
  lastImportDate?: string;         // Last successful import
}

// Bank Transaction - raw imported transaction
export interface BankTransaction {
  id: number;
  accountId: number;               // FK to BankAccount
  fitId: string;                   // Bank's unique transaction ID (for dedup)
  type: BankTransactionType;
  amount: number;                  // Positive = credit, Negative = debit
  datePosted: string;              // ISO date (converted from OFX YYYYMMDD)
  name: string;                    // Payee/payer name
  memo?: string;                   // Transaction memo
  checkNum?: string;               // Check number if applicable
  refNum?: string;                 // Reference number

  // Mapping fields
  revenueSourceId?: number;        // Linked revenue source (null = unmapped)
  month: Month;                    // Derived from datePosted
  year: number;                    // Year of transaction
  category: TransactionCategory;

  // Status
  isReconciled: boolean;           // User confirmed this mapping
  importedAt: string;              // When imported to system
  importBatchId: string;           // Group imports together
}

// Parsed OFX result (intermediate, not stored)
export interface ParsedOFXFile {
  account: {
    bankId: string;
    accountId: string;
    accountType: BankAccountType;
  };
  currency: string;
  transactions: ParsedOFXTransaction[];
  balance?: {
    amount: number;
    asOf: string;
  };
  dateRange: {
    start: string;
    end: string;
  };
}

export interface ParsedOFXTransaction {
  fitId: string;
  type: BankTransactionType;
  amount: number;
  datePosted: string;
  name: string;
  memo?: string;
  checkNum?: string;
  refNum?: string;
}

// Import summary for UI feedback
export interface OFXImportResult {
  success: boolean;
  accountId: number;
  accountName: string;
  totalTransactions: number;
  newTransactions: number;
  duplicatesSkipped: number;
  dateRange: { start: string; end: string };
  errors: string[];
}

// Mapping rule for auto-categorization
export interface TransactionMappingRule {
  id: number;
  accountId?: number;              // Optional: apply only to specific account
  pattern: string;                 // Regex or simple match pattern
  matchField: 'name' | 'memo' | 'both';
  revenueSourceId?: number;        // Map to this source (if category is 'revenue')
  category: TransactionCategory;
  isActive: boolean;
  priority: number;                // Higher priority rules applied first
  createdAt: string;
}

// Monthly bank summary for reconciliation
export interface MonthlyBankSummary {
  month: Month;
  year: number;
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  transactionCount: number;
  mappedCount: number;
  unmappedCount: number;
  revenueBySource: Record<number, number>;  // sourceId -> total
}
