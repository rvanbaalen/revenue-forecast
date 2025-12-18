# Financial Reports from OFX - Architecture Redesign

## Overview

Complete redesign of the application to focus on:
1. **Contexts** - Workspaces for organizing financial data (personal, business, etc.)
2. **OFX Import** - Import bank statements from checking accounts and credit cards
3. **Transaction Categorization** - Manual + LLM-assisted categorization
4. **Accurate Reports** - Balance Sheet, P&L, Cash Flow, Category Spending

### Key Principles
- **Accuracy is LAW** - All calculations must be correct using Decimal.js
- **OFX is leading** - All data comes from imported OFX files
- **Simple architecture** - No double-entry, just transactions with categories
- **Local vs Foreign income** - Local income subject to 15% profit tax

---

## Data Model

### Context
```typescript
interface Context {
  id: string;           // UUID
  name: string;         // "Personal", "Business A", etc.
  createdAt: string;    // ISO date
}
```

### BankAccount
```typescript
type BankAccountType = 'checking' | 'credit_card';

interface BankAccount {
  id: string;           // UUID
  contextId: string;    // FK to Context
  name: string;         // User-friendly name
  type: BankAccountType;
  currency: string;     // From OFX (USD, EUR, etc.)
  bankId: string;       // From OFX <BANKID> or <ORG>
  accountNumber: string; // Masked (****1234)
  accountIdHash: string; // SHA-256 hash for deduplication
  balance: string;      // Current balance as string (Decimal.js)
  balanceDate: string;  // Date of balance from OFX
  createdAt: string;
}
```

### Transaction
```typescript
type TransactionCategory = 'income' | 'expense' | 'transfer' | 'uncategorized';
type IncomeType = 'local' | 'foreign';

interface Transaction {
  id: string;           // UUID
  accountId: string;    // FK to BankAccount
  fitId: string;        // OFX transaction ID (for deduplication)
  date: string;         // ISO date
  amount: string;       // String for Decimal.js precision (positive/negative)
  name: string;         // OFX <NAME> - payee/merchant
  memo: string;         // OFX <MEMO> - additional info
  type: string;         // OFX type: CREDIT, DEBIT, POS, XFER, etc.
  checkNumber?: string; // OFX <CHECKNUM>

  // Categorization
  category: TransactionCategory;
  subcategory: string;  // User-defined: "Software", "Rent", "Consulting", etc.
  incomeType?: IncomeType; // Only for income: 'local' (15% tax) or 'foreign' (0%)

  // Metadata
  importBatchId: string;
  createdAt: string;
}
```

### Subcategory
```typescript
interface Subcategory {
  id: string;
  contextId: string;
  name: string;         // "Software Subscriptions", "Office Supplies", etc.
  type: 'income' | 'expense';
  createdAt: string;
}
```

### MappingRule (for auto-categorization)
```typescript
interface MappingRule {
  id: string;
  contextId: string;
  pattern: string;      // Regex or simple string match
  patternType: 'contains' | 'exact' | 'regex';
  category: TransactionCategory;
  subcategory: string;
  incomeType?: IncomeType;
  priority: number;     // Higher = applied first
  createdAt: string;
}
```

---

## Report Calculations

All calculations use **Decimal.js** for accuracy. Display as whole numbers or 2 decimal places.

### Balance Sheet
Shows financial position at a point in time.

```
ASSETS
  Checking Accounts
    Account A                    $10,000.00
    Account B                     $5,000.00
  ─────────────────────────────────────────
  Total Assets                   $15,000.00

LIABILITIES
  Credit Cards
    Credit Card A                ($2,500.00)
    Credit Card B                ($1,200.00)
  ─────────────────────────────────────────
  Total Liabilities              ($3,700.00)

─────────────────────────────────────────────
NET WORTH                        $11,300.00
```

**Calculation:**
- Assets = Sum of checking account balances (from OFX balance or calculated from transactions)
- Liabilities = Sum of credit card balances (negative = owed)
- Net Worth = Assets - Liabilities

### Profit & Loss (Income Statement)
Shows profitability over a period.

```
REVENUE
  Local Income                   $50,000.00
  Foreign Income                 $30,000.00
  ─────────────────────────────────────────
  Total Revenue                  $80,000.00

EXPENSES
  Software Subscriptions          ($2,400.00)
  Office Supplies                   ($500.00)
  Professional Services          ($5,000.00)
  Other Expenses                 ($3,100.00)
  ─────────────────────────────────────────
  Total Expenses                ($11,000.00)

─────────────────────────────────────────────
GROSS PROFIT                     $69,000.00

TAX (15% on Local Income)
  Local Income Tax               ($7,500.00)

─────────────────────────────────────────────
NET PROFIT                       $61,500.00
```

**Calculation:**
- Local Income = Sum of transactions where category='income' AND incomeType='local'
- Foreign Income = Sum of transactions where category='income' AND incomeType='foreign'
- Total Revenue = Local Income + Foreign Income
- Total Expenses = Sum of transactions where category='expense' (absolute value)
- Gross Profit = Total Revenue - Total Expenses
- Tax = Local Income × 0.15
- Net Profit = Gross Profit - Tax

### Cash Flow Statement
Shows money movement over a period.

```
CASH INFLOWS
  Income                         $80,000.00

CASH OUTFLOWS
  Expenses                      ($11,000.00)

INTERNAL MOVEMENTS
  Transfers                           $0.00

─────────────────────────────────────────────
NET CASH FLOW                    $69,000.00

Opening Balance                  $10,000.00
Closing Balance                  $79,000.00
```

**Calculation:**
- Cash Inflows = Sum of positive amounts where category='income'
- Cash Outflows = Sum of negative amounts where category='expense' (show as negative)
- Transfers = Net of transfer transactions (should be $0 across all accounts)
- Net Cash Flow = Inflows + Outflows
- Opening/Closing Balance = Account balances at period start/end

### Category Spending Analysis
Breakdown of expenses by subcategory.

```
EXPENSE BREAKDOWN (Jan 2024 - Dec 2024)

Category                    Amount        % of Total
─────────────────────────────────────────────────────
Software Subscriptions     $2,400.00        21.8%
Professional Services      $5,000.00        45.5%
Office Supplies              $500.00         4.5%
Other Expenses             $3,100.00        28.2%
─────────────────────────────────────────────────────
TOTAL                     $11,000.00       100.0%
```

---

## Application Flow

### 1. Context Setup
```
[App Start] → [No contexts?] → [Create Context Form]
                    ↓
            [Select Context] → [Context Dashboard]
```

### 2. OFX Import
```
[Upload OFX] → [Parse File] → [Detect Account Type]
                    ↓
            [Create/Match Account] → [Import Transactions]
                    ↓
            [Apply Mapping Rules] → [Show Import Summary]
```

### 3. Transaction Categorization
```
[View Uncategorized] → [Select Transaction(s)]
        ↓
[Manual Categorize] ← or → [Generate LLM Prompt]
        ↓                          ↓
[Apply Category]          [Copy Prompt to LLM]
        ↓                          ↓
[Create Rule?]            [Paste JSON Response]
        ↓                          ↓
[Save Rule]               [Review & Apply]
```

### 4. Reports
```
[Select Report] → [Choose Date Range] → [Generate Report]
        ↓
[Balance Sheet | P&L | Cash Flow | Category Spending]
        ↓
[View/Export Report]
```

---

## LLM Prompt Strategy

Generate a comprehensive prompt that:
1. Lists uncategorized transactions
2. Provides existing subcategories as examples
3. Requests JSON output format
4. Includes instructions for local vs foreign income

**Sample Prompt:**
```
I need help categorizing bank transactions. Please analyze each transaction and provide categorization.

EXISTING SUBCATEGORIES:
Income: Consulting, Product Sales, Affiliate Revenue
Expense: Software Subscriptions, Office Supplies, Professional Services

TRANSACTIONS TO CATEGORIZE:
1. 2024-01-15 | -$99.00 | GITHUB.COM
2. 2024-01-16 | +$5,000.00 | WIRE FROM ACME CORP
3. 2024-01-17 | -$45.00 | AMAZON WEB SERVICES

For each transaction, determine:
- category: "income" | "expense" | "transfer" | "uncategorized"
- subcategory: Use existing or suggest new (keep it short, 2-3 words max)
- incomeType (only if income): "local" or "foreign"
  - "local" = income from same country, subject to 15% profit tax
  - "foreign" = income from international sources, no profit tax

RESPOND IN THIS EXACT JSON FORMAT:
{
  "categorizations": [
    {
      "index": 1,
      "category": "expense",
      "subcategory": "Software Subscriptions",
      "incomeType": null,
      "confidence": "high",
      "reasoning": "GitHub is a software development platform subscription"
    },
    ...
  ]
}
```

---

## File Structure

```
src/
├── components/
│   ├── ui/                    # shadcn components (keep)
│   ├── contexts/              # Context management
│   │   ├── ContextList.tsx
│   │   ├── ContextForm.tsx
│   │   └── ContextSelector.tsx
│   ├── accounts/              # Bank account UI
│   │   ├── AccountList.tsx
│   │   ├── AccountCard.tsx
│   │   └── OFXImportModal.tsx
│   ├── transactions/          # Transaction management
│   │   ├── TransactionTable.tsx
│   │   ├── TransactionFilters.tsx
│   │   ├── CategorySelect.tsx
│   │   ├── BulkCategorizeModal.tsx
│   │   └── LLMCategorizationModal.tsx
│   └── reports/               # Report components
│       ├── BalanceSheet.tsx
│       ├── ProfitLoss.tsx
│       ├── CashFlow.tsx
│       └── CategorySpending.tsx
├── hooks/
│   ├── useContexts.ts         # Context CRUD
│   ├── useAccounts.ts         # Bank account CRUD
│   ├── useTransactions.ts     # Transaction CRUD + filtering
│   ├── useMappingRules.ts     # Auto-categorization rules
│   ├── useSubcategories.ts    # Subcategory management
│   └── useReports.ts          # Report calculations (Decimal.js)
├── context/
│   └── AppContext.tsx         # Single provider
├── pages/
│   ├── ContextsPage.tsx       # List/manage contexts
│   ├── DashboardPage.tsx      # Context overview
│   ├── AccountsPage.tsx       # Bank accounts list
│   ├── TransactionsPage.tsx   # View/categorize transactions
│   ├── ReportsPage.tsx        # View reports
│   └── SettingsPage.tsx       # App settings
├── store/
│   └── db.ts                  # IndexedDB schema
├── types/
│   └── index.ts               # Type definitions
├── utils/
│   ├── ofx-parser.ts          # OFX parsing (keep/modify)
│   ├── decimal.ts             # Decimal.js utilities
│   ├── llm-prompt.ts          # LLM prompt generation
│   └── reports.ts             # Report calculation logic
├── router.tsx
└── main.tsx
```

---

## IndexedDB Schema

Database: `FinancialReports` (version 1)

```typescript
const stores = {
  contexts: {
    keyPath: 'id',
    indexes: []
  },
  accounts: {
    keyPath: 'id',
    indexes: [
      { name: 'contextId', keyPath: 'contextId' },
      { name: 'accountIdHash', keyPath: 'accountIdHash', unique: true }
    ]
  },
  transactions: {
    keyPath: 'id',
    indexes: [
      { name: 'accountId', keyPath: 'accountId' },
      { name: 'accountId_fitId', keyPath: ['accountId', 'fitId'], unique: true },
      { name: 'category', keyPath: 'category' },
      { name: 'date', keyPath: 'date' }
    ]
  },
  subcategories: {
    keyPath: 'id',
    indexes: [
      { name: 'contextId', keyPath: 'contextId' },
      { name: 'contextId_name', keyPath: ['contextId', 'name'], unique: true }
    ]
  },
  mappingRules: {
    keyPath: 'id',
    indexes: [
      { name: 'contextId', keyPath: 'contextId' },
      { name: 'priority', keyPath: 'priority' }
    ]
  }
};
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Install Decimal.js
- [ ] Create new type definitions
- [ ] Setup new IndexedDB schema
- [ ] Create Decimal.js utility functions

### Phase 2: Context Management
- [ ] Implement useContexts hook
- [ ] Create ContextList component
- [ ] Create ContextForm component
- [ ] Create ContextSelector component

### Phase 3: Bank Account Management
- [ ] Implement useAccounts hook
- [ ] Modify OFX parser for new schema
- [ ] Create AccountList component
- [ ] Create OFXImportModal component

### Phase 4: Transaction Management
- [ ] Implement useTransactions hook
- [ ] Implement useMappingRules hook
- [ ] Implement useSubcategories hook
- [ ] Create TransactionTable component
- [ ] Create categorization UI components

### Phase 5: LLM Integration
- [ ] Create LLM prompt generator
- [ ] Create LLMCategorizationModal component
- [ ] Implement JSON response parser

### Phase 6: Reports
- [ ] Implement useReports hook with Decimal.js
- [ ] Create BalanceSheet component
- [ ] Create ProfitLoss component
- [ ] Create CashFlow component
- [ ] Create CategorySpending component

### Phase 7: Pages & Routing
- [ ] Create all page components
- [ ] Setup new routing structure
- [ ] Create navigation

### Phase 8: Cleanup
- [ ] Remove old components
- [ ] Remove old hooks
- [ ] Remove old types
- [ ] Update documentation

---

## Technical Notes

### Decimal.js Usage
```typescript
import Decimal from 'decimal.js';

// Configure for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// All amounts stored as strings, calculated as Decimal
const amount = new Decimal(transaction.amount);
const total = transactions.reduce(
  (sum, t) => sum.plus(new Decimal(t.amount)),
  new Decimal(0)
);

// Display formatting
const formatCurrency = (value: Decimal | string, decimals: number = 2): string => {
  const d = new Decimal(value);
  return d.toFixed(decimals);
};
```

### Transaction Amount Convention
- **Positive amounts** = Money IN (income, refunds)
- **Negative amounts** = Money OUT (expenses, payments)
- This matches OFX convention and simplifies calculations

### Account Balance Calculation
For checking accounts: Balance = Opening Balance + Sum(all transactions)
For credit cards: Balance = Opening Balance + Sum(all transactions)
- Negative credit card balance = amount owed
- Positive credit card balance = credit available/overpaid
