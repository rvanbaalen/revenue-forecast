/**
 * Financial Reports from OFX - Type Definitions
 *
 * Core principles:
 * - Simple transaction-based accounting (no double-entry)
 * - All amounts stored as strings for Decimal.js precision
 * - OFX data is the source of truth
 * - Local income subject to 15% profit tax, foreign income exempt
 */

// ============================================
// Context Types
// ============================================

/**
 * Context represents a workspace for financial data
 * Examples: "Personal", "Business A", "Freelance"
 */
export interface Context {
  id: string;
  name: string;
  createdAt: string; // ISO date
}

// ============================================
// Bank Account Types
// ============================================

export type BankAccountType = 'checking' | 'credit_card';

/**
 * BankAccount represents a bank account imported from OFX
 */
export interface BankAccount {
  id: string;
  contextId: string;
  name: string; // User-friendly name
  type: BankAccountType;
  currency: string; // From OFX (USD, EUR, etc.)
  bankId: string; // From OFX <BANKID> or <ORG>
  accountNumber: string; // Masked (****1234)
  accountIdHash: string; // SHA-256 hash for deduplication
  balance: string; // Current balance as string (Decimal.js)
  balanceDate: string; // ISO date of balance from OFX
  createdAt: string;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionCategory = 'income' | 'expense' | 'transfer' | 'uncategorized';
export type IncomeType = 'local' | 'foreign';

/**
 * OFX transaction types
 * CREDIT = Money in, DEBIT = Money out, etc.
 */
export type OFXTransactionType =
  | 'CREDIT'
  | 'DEBIT'
  | 'INT'
  | 'DIV'
  | 'FEE'
  | 'SRVCHG'
  | 'DEP'
  | 'ATM'
  | 'POS'
  | 'XFER'
  | 'CHECK'
  | 'PAYMENT'
  | 'CASH'
  | 'DIRECTDEP'
  | 'DIRECTDEBIT'
  | 'REPEATPMT'
  | 'OTHER';

/**
 * Transaction represents a single bank transaction
 * Amount convention:
 * - Positive = Money IN (income, refunds)
 * - Negative = Money OUT (expenses, payments)
 */
export interface Transaction {
  id: string;
  accountId: string; // FK to BankAccount
  fitId: string; // OFX transaction ID (for deduplication)
  date: string; // ISO date
  amount: string; // String for Decimal.js precision
  name: string; // OFX <NAME> - payee/merchant
  memo: string; // OFX <MEMO> - additional info
  type: OFXTransactionType; // OFX type: CREDIT, DEBIT, POS, etc.
  checkNumber?: string; // OFX <CHECKNUM>

  // Categorization
  category: TransactionCategory;
  subcategory: string; // User-defined: "Software", "Rent", "Consulting", etc.
  incomeType?: IncomeType; // Only for income: 'local' (15% tax) or 'foreign' (0%)

  // Metadata
  importBatchId: string;
  createdAt: string;
}

// ============================================
// Subcategory Types
// ============================================

export type SubcategoryType = 'income' | 'expense';

/**
 * Subcategory for organizing transactions
 */
export interface Subcategory {
  id: string;
  contextId: string;
  name: string; // "Software Subscriptions", "Office Supplies", etc.
  type: SubcategoryType;
  createdAt: string;
}

// ============================================
// Mapping Rule Types
// ============================================

export type PatternType = 'contains' | 'exact' | 'regex';

/**
 * MappingRule for auto-categorization of transactions
 */
export interface MappingRule {
  id: string;
  contextId: string;
  pattern: string; // Pattern to match
  patternType: PatternType;
  matchField: 'name' | 'memo' | 'both';
  category: TransactionCategory;
  subcategory: string;
  incomeType?: IncomeType;
  priority: number; // Higher = applied first
  isActive: boolean;
  createdAt: string;
}

// ============================================
// OFX Parsing Types
// ============================================

/**
 * Parsed OFX transaction (intermediate, before import)
 */
export interface ParsedOFXTransaction {
  fitId: string;
  type: OFXTransactionType;
  amount: string; // String for precision
  datePosted: string; // ISO date
  name: string;
  memo?: string;
  checkNumber?: string;
}

/**
 * Parsed OFX file result
 */
export interface ParsedOFXFile {
  account: {
    bankId: string;
    accountId: string; // Full account ID (will be hashed)
    accountType: 'CHECKING' | 'SAVINGS' | 'CREDITLINE' | 'MONEYMRKT' | 'CREDITCARD';
  };
  currency: string;
  transactions: ParsedOFXTransaction[];
  balance?: {
    amount: string; // String for precision
    asOf: string; // ISO date
  };
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * OFX import result for UI feedback
 */
export interface OFXImportResult {
  success: boolean;
  accountId: string;
  accountName: string;
  isNewAccount: boolean;
  totalTransactions: number;
  newTransactions: number;
  duplicatesSkipped: number;
  dateRange: { start: string; end: string };
  errors: string[];
}

// ============================================
// LLM Categorization Types
// ============================================

/**
 * LLM categorization request item
 */
export interface LLMCategorizationItem {
  index: number;
  date: string;
  amount: string;
  name: string;
  memo?: string;
}

/**
 * LLM categorization response item
 */
export interface LLMCategorizationResult {
  index: number;
  category: TransactionCategory;
  subcategory: string;
  incomeType: IncomeType | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

/**
 * Full LLM categorization response
 */
export interface LLMCategorizationResponse {
  categorizations: LLMCategorizationResult[];
}

// ============================================
// Report Types
// ============================================

/**
 * Date range for filtering
 */
export interface DateRange {
  start: string; // ISO date
  end: string; // ISO date
}

/**
 * Account balance for Balance Sheet
 */
export interface AccountBalanceItem {
  accountId: string;
  accountName: string;
  accountType: BankAccountType;
  currency: string;
  balance: string; // Decimal string
}

/**
 * Balance Sheet report data
 */
export interface BalanceSheetReport {
  asOf: string; // ISO date
  assets: {
    accounts: AccountBalanceItem[];
    total: string;
  };
  liabilities: {
    accounts: AccountBalanceItem[];
    total: string;
  };
  netWorth: string;
}

/**
 * P&L line item by subcategory
 */
export interface PLLineItem {
  subcategory: string;
  amount: string;
}

/**
 * Profit & Loss report data
 */
export interface ProfitLossReport {
  period: DateRange;
  revenue: {
    local: {
      items: PLLineItem[];
      total: string;
    };
    foreign: {
      items: PLLineItem[];
      total: string;
    };
    total: string;
  };
  expenses: {
    items: PLLineItem[];
    total: string;
  };
  grossProfit: string;
  tax: {
    rate: string; // "0.15" for 15%
    amount: string; // Tax on local income
  };
  netProfit: string;
}

/**
 * Cash Flow report data
 */
export interface CashFlowReport {
  period: DateRange;
  inflows: {
    total: string;
    bySubcategory: PLLineItem[];
  };
  outflows: {
    total: string;
    bySubcategory: PLLineItem[];
  };
  transfers: {
    total: string;
  };
  netCashFlow: string;
  openingBalance: string;
  closingBalance: string;
}

/**
 * Category spending item
 */
export interface CategorySpendingItem {
  subcategory: string;
  amount: string;
  percentage: string; // "21.50" for 21.50%
  transactionCount: number;
}

/**
 * Category Spending report data
 */
export interface CategorySpendingReport {
  period: DateRange;
  expenses: CategorySpendingItem[];
  totalExpenses: string;
  income: CategorySpendingItem[];
  totalIncome: string;
}

// ============================================
// App Configuration
// ============================================

export const PROFIT_TAX_RATE = '0.15'; // 15% on local income

/**
 * Default subcategories to seed new contexts
 */
export const DEFAULT_INCOME_SUBCATEGORIES = [
  'Consulting',
  'Product Sales',
  'Service Revenue',
  'Interest',
  'Other Income',
];

export const DEFAULT_EXPENSE_SUBCATEGORIES = [
  'Software Subscriptions',
  'Office Supplies',
  'Professional Services',
  'Travel',
  'Meals & Entertainment',
  'Bank Fees',
  'Insurance',
  'Utilities',
  'Rent',
  'Other Expenses',
];
