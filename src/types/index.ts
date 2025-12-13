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

// Default revenue sources (empty - users create via wizard or manually)
export const DEFAULT_SOURCES: Omit<RevenueSource, 'id'>[] = [];

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

// Transaction types from OFX (raw, granular)
export type BankTransactionType = 'CREDIT' | 'DEBIT' | 'INT' | 'DIV' | 'FEE' | 'SRVCHG' | 'DEP' | 'ATM' | 'POS' | 'XFER' | 'CHECK' | 'PAYMENT' | 'CASH' | 'DIRECTDEP' | 'DIRECTDEBIT' | 'REPEATPMT' | 'OTHER';

// Simplified transaction flow type based on account type
// Checking/Savings: credit (money in) / debit (money out)
// Credit Card: charge (purchase) / payment (paying off)
export type TransactionFlowType = 'credit' | 'debit' | 'charge' | 'payment';

// Transaction classification - derived from chartAccountId and transferAccountId
// DEPRECATED: Use chartAccountId for actual category, this is for filtering/display
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

  // Accounting integration
  chartAccountId?: string;         // Link to ChartAccount
  openingBalance?: number;         // Opening balance amount
  openingBalanceDate?: string;     // Date of opening balance

  // Credit card specific
  creditLimit?: number;            // Credit limit for credit card accounts
}

// Bank Transaction - raw imported transaction
export interface BankTransaction {
  id: number;
  accountId: number;               // FK to BankAccount
  fitId: string;                   // Bank's unique transaction ID (for dedup)
  type: BankTransactionType;       // Raw OFX type (CREDIT, DEBIT, POS, etc.)
  flowType: TransactionFlowType;   // Simplified: credit/debit (checking) or charge/payment (credit card)
  amount: number;                  // Positive = credit/payment, Negative = debit/charge
  datePosted: string;              // ISO date (converted from OFX YYYYMMDD)
  name: string;                    // Payee/payer name
  memo?: string;                   // Transaction memo
  checkNum?: string;               // Check number if applicable
  refNum?: string;                 // Reference number

  // Time fields
  month: Month;                    // Derived from datePosted
  year: number;                    // Year of transaction

  // Category - links to Chart of Accounts (the actual category)
  chartAccountId?: string;         // Links to ChartAccount (Revenue or Expense category)

  // For revenue tracking integration
  revenueSourceId?: number;        // Optional link to revenue source for forecasting

  // For transfers between accounts
  transferAccountId?: number;      // Linked transfer account (for transfers between accounts)

  // Status flags
  isIgnored: boolean;              // Exclude from all reports and calculations
  isReconciled: boolean;           // User confirmed this categorization

  // Accounting integration
  journalEntryId?: string;         // Generated journal entry ID

  // Import metadata
  importedAt: string;              // When imported to system
  importBatchId: string;           // Group imports together

  // DEPRECATED: Use chartAccountId type to determine classification
  // Kept for backwards compatibility during migration
  category: TransactionCategory;
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
  pattern: string;                 // Text pattern to match
  matchField: 'name' | 'memo' | 'both';
  matchType?: 'exact' | 'contains' | 'startsWith' | 'endsWith'; // How to match (default: 'contains')
  revenueSourceId?: number;        // Map to this source (if category is 'revenue')
  transferAccountId?: number;      // Map to this account (if category is 'transfer')
  category: TransactionCategory;
  isActive: boolean;
  priority: number;                // Higher priority rules applied first
  createdAt: string;

  // Accounting integration
  chartAccountId?: string;         // Map to this ChartAccount for expenses/revenue
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

// ============================================
// Accounting Types (Double-Entry)
// ============================================

// Account types in double-entry accounting
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

// Normal balance for each account type
export const NORMAL_BALANCE: Record<AccountType, 'DEBIT' | 'CREDIT'> = {
  ASSET: 'DEBIT',      // Assets increase with debits
  LIABILITY: 'CREDIT', // Liabilities increase with credits
  EQUITY: 'CREDIT',    // Equity increases with credits
  REVENUE: 'CREDIT',   // Revenue increases with credits
  EXPENSE: 'DEBIT',    // Expenses increase with debits
};

// Chart of Accounts - represents a category/account in the accounting system
export interface ChartAccount {
  id: string;                    // UUID for new accounts, code for system accounts
  code: string;                  // Account code (e.g., "1000", "5110")
  name: string;                  // Display name
  type: AccountType;
  subtype?: string;              // Sub-classification (e.g., "Cash", "Operating")
  parentId?: string;             // Parent account ID for hierarchy
  isSystem: boolean;             // Built-in account (cannot be deleted)
  isActive: boolean;             // Soft delete flag
  description?: string;

  // For bank account linking
  bankAccountId?: number;        // Link to BankAccount if this is a cash/card account

  // For expense budgeting
  budget?: {
    expectedMonthly: MonthlyValues;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Journal Entry - the core of double-entry accounting
export interface JournalEntry {
  id: string;                    // UUID
  date: string;                  // ISO date YYYY-MM-DD
  description: string;
  lines: JournalLine[];

  // Source references
  bankTransactionId?: number;    // Link to imported bank transaction
  revenueSourceId?: number;      // Link to revenue source
  salaryId?: number;             // Link to salary record

  // For opening balances
  isOpeningBalance?: boolean;

  // Metadata
  isReconciled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Journal Line - individual debit or credit in a journal entry
export interface JournalLine {
  accountId: string;             // ChartAccount.id
  amount: number;                // Always positive
  type: 'DEBIT' | 'CREDIT';
  memo?: string;
}

// Account balance at a point in time
export interface AccountBalance {
  accountId: string;
  balance: number;               // Positive or negative based on account type
  asOf: string;                  // ISO date
}

// Opening balance record
export interface OpeningBalance {
  accountId: string;
  balance: number;
  date: string;                  // ISO date when balance was set
}

// ============================================
// Default Chart of Accounts for Freelancers
// ============================================

export const DEFAULT_CHART_OF_ACCOUNTS: Omit<ChartAccount, 'createdAt' | 'updatedAt'>[] = [
  // ASSETS (1000s)
  { id: '1000', code: '1000', name: 'Assets', type: 'ASSET', isSystem: true, isActive: true },
  { id: '1100', code: '1100', name: 'Cash & Bank', type: 'ASSET', parentId: '1000', subtype: 'Cash', isSystem: true, isActive: true },
  { id: '1110', code: '1110', name: 'Checking Account', type: 'ASSET', parentId: '1100', subtype: 'Cash', isSystem: false, isActive: true },
  { id: '1120', code: '1120', name: 'Savings Account', type: 'ASSET', parentId: '1100', subtype: 'Cash', isSystem: false, isActive: true },

  // LIABILITIES (2000s)
  { id: '2000', code: '2000', name: 'Liabilities', type: 'LIABILITY', isSystem: true, isActive: true },
  { id: '2100', code: '2100', name: 'Credit Cards', type: 'LIABILITY', parentId: '2000', subtype: 'Credit Card', isSystem: true, isActive: true },
  { id: '2110', code: '2110', name: 'Credit Card', type: 'LIABILITY', parentId: '2100', subtype: 'Credit Card', isSystem: false, isActive: true },
  { id: '2200', code: '2200', name: 'Tax Liabilities', type: 'LIABILITY', parentId: '2000', isSystem: true, isActive: true },
  { id: '2210', code: '2210', name: 'VAT Payable', type: 'LIABILITY', parentId: '2200', isSystem: false, isActive: true },

  // EQUITY (3000s)
  { id: '3000', code: '3000', name: 'Equity', type: 'EQUITY', isSystem: true, isActive: true },
  { id: '3100', code: '3100', name: "Owner's Equity", type: 'EQUITY', parentId: '3000', isSystem: true, isActive: true },
  { id: '3200', code: '3200', name: 'Retained Earnings', type: 'EQUITY', parentId: '3000', isSystem: true, isActive: true },

  // REVENUE (4000s)
  { id: '4000', code: '4000', name: 'Revenue', type: 'REVENUE', isSystem: true, isActive: true },
  { id: '4100', code: '4100', name: 'Service Revenue', type: 'REVENUE', parentId: '4000', isSystem: true, isActive: true },
  { id: '4200', code: '4200', name: 'Product Revenue', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },
  { id: '4900', code: '4900', name: 'Other Income', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },

  // EXPENSES (5000s)
  { id: '5000', code: '5000', name: 'Expenses', type: 'EXPENSE', isSystem: true, isActive: true },

  // Operating Expenses (5100s)
  { id: '5100', code: '5100', name: 'Operating Expenses', type: 'EXPENSE', parentId: '5000', subtype: 'Operating', isSystem: true, isActive: true },
  { id: '5110', code: '5110', name: 'Rent', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
  { id: '5120', code: '5120', name: 'Utilities', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
  { id: '5130', code: '5130', name: 'Software & Subscriptions', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
  { id: '5140', code: '5140', name: 'Office Supplies', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
  { id: '5150', code: '5150', name: 'Internet & Phone', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
  { id: '5160', code: '5160', name: 'Insurance', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },

  // Professional Services (5200s)
  { id: '5200', code: '5200', name: 'Professional Services', type: 'EXPENSE', parentId: '5000', subtype: 'Professional', isSystem: true, isActive: true },
  { id: '5210', code: '5210', name: 'Legal', type: 'EXPENSE', parentId: '5200', subtype: 'Professional', isSystem: false, isActive: true },
  { id: '5220', code: '5220', name: 'Accounting', type: 'EXPENSE', parentId: '5200', subtype: 'Professional', isSystem: false, isActive: true },
  { id: '5230', code: '5230', name: 'Consulting', type: 'EXPENSE', parentId: '5200', subtype: 'Professional', isSystem: false, isActive: true },

  // Marketing & Advertising (5300s)
  { id: '5300', code: '5300', name: 'Marketing & Advertising', type: 'EXPENSE', parentId: '5000', subtype: 'Marketing', isSystem: true, isActive: true },
  { id: '5310', code: '5310', name: 'Online Advertising', type: 'EXPENSE', parentId: '5300', subtype: 'Marketing', isSystem: false, isActive: true },
  { id: '5320', code: '5320', name: 'Content & Design', type: 'EXPENSE', parentId: '5300', subtype: 'Marketing', isSystem: false, isActive: true },

  // Travel & Entertainment (5400s)
  { id: '5400', code: '5400', name: 'Travel & Entertainment', type: 'EXPENSE', parentId: '5000', subtype: 'Travel', isSystem: true, isActive: true },
  { id: '5410', code: '5410', name: 'Travel', type: 'EXPENSE', parentId: '5400', subtype: 'Travel', isSystem: false, isActive: true },
  { id: '5420', code: '5420', name: 'Meals & Entertainment', type: 'EXPENSE', parentId: '5400', subtype: 'Travel', isSystem: false, isActive: true },

  // Bank Fees & Interest (5500s)
  { id: '5500', code: '5500', name: 'Bank Fees & Interest', type: 'EXPENSE', parentId: '5000', subtype: 'Banking', isSystem: true, isActive: true },
  { id: '5510', code: '5510', name: 'Bank Fees', type: 'EXPENSE', parentId: '5500', subtype: 'Banking', isSystem: false, isActive: true },
  { id: '5520', code: '5520', name: 'Interest Expense', type: 'EXPENSE', parentId: '5500', subtype: 'Banking', isSystem: false, isActive: true },
  { id: '5530', code: '5530', name: 'Payment Processing Fees', type: 'EXPENSE', parentId: '5500', subtype: 'Banking', isSystem: false, isActive: true },

  // Payroll (5600s)
  { id: '5600', code: '5600', name: 'Payroll', type: 'EXPENSE', parentId: '5000', subtype: 'Payroll', isSystem: true, isActive: true },
  { id: '5610', code: '5610', name: 'Salaries & Wages', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },
  { id: '5620', code: '5620', name: 'Payroll Taxes', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },

  // Cost of Goods Sold (5700s)
  { id: '5700', code: '5700', name: 'Cost of Goods Sold', type: 'EXPENSE', parentId: '5000', subtype: 'COGS', isSystem: true, isActive: true },

  // Taxes (5800s)
  { id: '5800', code: '5800', name: 'Taxes', type: 'EXPENSE', parentId: '5000', subtype: 'Tax', isSystem: true, isActive: true },
  { id: '5810', code: '5810', name: 'VAT Expense', type: 'EXPENSE', parentId: '5800', subtype: 'Tax', isSystem: false, isActive: true },
  { id: '5820', code: '5820', name: 'Corporate Tax', type: 'EXPENSE', parentId: '5800', subtype: 'Tax', isSystem: false, isActive: true },

  // Other Expenses (5900s)
  { id: '5900', code: '5900', name: 'Other Expenses', type: 'EXPENSE', parentId: '5000', isSystem: true, isActive: true },
];
