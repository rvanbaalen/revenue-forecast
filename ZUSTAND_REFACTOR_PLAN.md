# Zustand State Management Refactor Plan

## Executive Summary

This document proposes migrating from a monolithic React Context (883 lines, 143+ operations) to Zustand with domain-driven stores. The refactor addresses:

- **Performance**: Eliminate unnecessary re-renders via selective subscriptions
- **Maintainability**: Split god context into focused, testable stores
- **DRY**: Consolidate repeated CRUD patterns into reusable abstractions
- **YAGNI**: Remove over-engineered operations and computed values
- **Composability**: Extract monster page components into focused units

---

## Current State Analysis

### The Problem: Monolithic Context

```
AppContext.tsx (883 lines)
├── 9 state slices (contexts, accounts, transactions, subcategories, mappingRules, reconciliations, currencies, isLoading, error)
├── 36 operations across 9 categories
├── 5 computed values (recalculated every render)
├── 5 report functions
└── 143+ total exports
```

**Impact**: Any component using `useApp()` re-renders on ANY state change.

### Monster Page Components

| Page | Lines | useState Calls | Problem |
|------|-------|----------------|---------|
| TransactionsPage | 937 | 14+ | Business logic + UI + dialogs |
| SettingsPage | 957 | 20+ | 4 CRUD features in one file |

### DRY Violations Identified

1. **CRUD Pattern** repeated 7 times (add/update/delete for each entity)
2. **Dialog Pattern** repeated 4 times in SettingsPage
3. **Filter UI** duplicated for desktop/mobile in TransactionsPage
4. **Context Filtering** logic duplicated in AppContext and report functions

### YAGNI Violations Identified

1. **Reconciliations in global state** - rarely used, could be fetched on-demand
2. **Full data reloads** after single-entity operations
3. **Wrapper functions** that add no value (e.g., `getSymbol` wraps `getCurrencySymbol`)
4. **Computed values exported as state** - confuses API surface

---

## Proposed Architecture

### Store Structure (Domain-Driven)

```
src/stores/
├── useContextStore.ts      # Contexts + activeContextId
├── useAccountStore.ts      # Accounts + reconciliations
├── useTransactionStore.ts  # Transactions
├── useCategoryStore.ts     # Subcategories + mapping rules
├── useCurrencyStore.ts     # Currencies + exchange rates
├── useUIStore.ts           # Loading states, errors, UI preferences
├── selectors/
│   ├── contextSelectors.ts # Memoized derived state
│   └── reportSelectors.ts  # Report computations
└── index.ts                # Combined exports
```

### Store Design Principles

1. **Single Responsibility**: Each store manages one domain aggregate
2. **Selective Subscriptions**: Components subscribe only to what they need
3. **Derived State via Selectors**: Memoized computations, not recalculated on every render
4. **Surgical Updates**: No full reloads - update only affected state

### Example Store Structure

```typescript
// stores/useAccountStore.ts
interface AccountState {
  accounts: BankAccount[];

  // Actions
  loadAccounts: () => Promise<void>;
  importOFX: (file: File, contextId: string) => Promise<ImportResult>;
  updateAccount: (account: BankAccount) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Reconciliation (co-located with accounts)
  reconcileAccount: (accountId: string, data: ReconcileData) => Promise<void>;
  getReconciliations: (accountId: string) => Promise<Reconciliation[]>;
}

// Selector - memoized, only recalculates when dependencies change
export const selectContextAccounts = (contextId: string) =>
  (state: AccountState) =>
    state.accounts.filter(a => a.contextId === contextId);
```

---

## Component Refactor Strategy

### Principle: Components Use Stores Directly

```tsx
// ❌ BEFORE: Pull everything from context
const { contextAccounts, contextTransactions, updateAccount, deleteAccount, ... } = useApp();

// ✅ AFTER: Subscribe only to what's needed
const accounts = useAccountStore(selectContextAccounts(activeContextId));
const updateAccount = useAccountStore(s => s.updateAccount);
```

### TransactionsPage Decomposition (937 → ~300 lines)

```
TransactionsPage.tsx (orchestrator only)
├── components/
│   ├── TransactionFilters.tsx      # Search, category, account filters
│   ├── TransactionTable.tsx        # Table rendering
│   ├── TransactionPagination.tsx   # Pagination controls
│   ├── EditTransactionDialog.tsx   # Edit form
│   └── LLMCategorizeDialog.tsx     # LLM categorization feature
└── hooks/
    ├── useTransactionFilters.ts    # Filter state + logic
    └── useLLMCategorization.ts     # LLM feature state + handlers
```

### SettingsPage Decomposition (957 → ~150 lines)

```
SettingsPage.tsx (tab orchestrator only)
├── tabs/
│   ├── ContextsTab.tsx             # Context management
│   ├── CurrenciesTab.tsx           # Currency management
│   ├── SubcategoriesTab.tsx        # Subcategory management
│   └── MappingRulesTab.tsx         # Rule management
├── dialogs/
│   ├── ContextDialog.tsx
│   ├── CurrencyDialog.tsx
│   ├── SubcategoryDialog.tsx
│   └── MappingRuleDialog.tsx
└── DangerZone.tsx                  # Clear data section
```

---

## DRY: Reusable Abstractions

### 1. Generic CRUD Hook

```typescript
// hooks/useEntityCRUD.ts
function useEntityCRUD<T extends { id: string }>(config: {
  getAll: () => T[];
  add: (item: T) => Promise<void>;
  update: (item: T) => Promise<void>;
  delete: (id: string) => Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (item: T) => {
    setIsSubmitting(true);
    try {
      if (editing) await config.update(item);
      else await config.add(item);
      setDialogOpen(false);
      setEditing(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await config.delete(id);
  };

  return {
    dialogOpen,
    editing,
    isSubmitting,
    openCreate: () => { setEditing(null); setDialogOpen(true); },
    openEdit: (item: T) => { setEditing(item); setDialogOpen(true); },
    closeDialog: () => { setDialogOpen(false); setEditing(null); },
    handleSave,
    handleDelete,
  };
}
```

**Impact**: Eliminates ~150 lines of duplicated dialog/form state across SettingsPage.

### 2. Generic Entity Dialog

```typescript
// components/EntityDialog.tsx
interface EntityDialogProps<T> {
  open: boolean;
  editing: T | null;
  title: string;
  onClose: () => void;
  onSave: (item: T) => Promise<void>;
  children: (props: { value: T; onChange: (v: T) => void }) => ReactNode;
}
```

### 3. Unified Filter Component

```tsx
// components/TransactionFilters.tsx
// Single responsive component instead of duplicated desktop/mobile versions
<TransactionFilters
  search={search}
  category={category}
  account={account}
  onSearchChange={setSearch}
  onCategoryChange={setCategory}
  onAccountChange={setAccount}
  onClear={clearFilters}
/>
```

---

## YAGNI: What to Remove/Simplify

### Remove

1. **Wrapper functions** that add no value:
   - `getSymbol()` → use `getCurrencySymbol()` directly
   - `convertToContextCurrency()` → use `convertCurrency()` directly

2. **Duplicate computed values** - compute once via selector, not inline

3. **Full `loadAllData()` calls** after single-entity updates

### Simplify

1. **Reconciliations**: Fetch on-demand instead of storing in global state
   ```typescript
   // Before: reconciliations always in state
   // After:
   const getReconciliations = async (accountId: string) => {
     return await db.getReconciliationsByAccount(accountId);
   };
   ```

2. **Report functions**: Move to separate module, call with explicit params
   ```typescript
   // Before: getBalanceSheet() depends on context state
   // After:
   import { generateBalanceSheet } from '@/lib/reports';
   const report = generateBalanceSheet(accounts, transactions, asOf);
   ```

---

## Type System Cleanup

### Issue 1: Currency Inconsistency

```typescript
// CURRENT: 3 representations
Context { currency: 'USD' }         // Just code
BankAccount { currency: 'USD' }     // Just code
Currency { code, symbol, rate }     // Full object

// PROPOSED: Unified approach
// All entities store currency CODE, resolve full object via store
const currency = useCurrencyStore(s => s.getCurrency('USD'));
```

### Issue 2: Pattern Type Mismatch

```typescript
// CURRENT
MappingRule.patternType: 'contains' | 'exact' | 'regex'
LLMCategorizationRule.matchType: 'contains' | 'startsWith' | 'exact'

// PROPOSED: Single type
export type MatchPattern = 'contains' | 'startsWith' | 'exact' | 'regex';
```

---

## Migration Strategy

### Phase 1: Foundation (Non-Breaking)

1. Install Zustand
2. Create store files with same data shape as current context
3. Create `useLegacyAppBridge` hook that syncs context → stores
4. Components can start using stores alongside context

### Phase 2: Component Extraction

1. Extract TransactionsPage sub-components
2. Extract SettingsPage tab components
3. New components use stores directly
4. Create reusable hooks (useEntityCRUD, useTransactionFilters)

### Phase 3: Store Migration

1. Migrate one store at a time (start with currencies - smallest)
2. Update consumers to use store instead of context
3. Remove corresponding context operations
4. Repeat for each domain

### Phase 4: Cleanup

1. Remove AppContext entirely
2. Remove legacy bridge
3. Clean up unused code
4. Update tests

---

## File Impact Summary

### Files to Create

```
src/stores/
├── useContextStore.ts        (~80 lines)
├── useAccountStore.ts        (~100 lines)
├── useTransactionStore.ts    (~80 lines)
├── useCategoryStore.ts       (~100 lines)
├── useCurrencyStore.ts       (~60 lines)
├── useUIStore.ts             (~40 lines)
├── selectors/
│   ├── contextSelectors.ts   (~50 lines)
│   └── reportSelectors.ts    (~80 lines)
└── index.ts                  (~30 lines)

src/components/transactions/
├── TransactionFilters.tsx    (~80 lines)
├── TransactionTable.tsx      (~120 lines)
├── TransactionPagination.tsx (~60 lines)
├── EditTransactionDialog.tsx (~80 lines)
└── LLMCategorizeDialog.tsx   (~150 lines)

src/components/settings/
├── tabs/
│   ├── ContextsTab.tsx       (~80 lines)
│   ├── CurrenciesTab.tsx     (~80 lines)
│   ├── SubcategoriesTab.tsx  (~80 lines)
│   └── MappingRulesTab.tsx   (~100 lines)
├── dialogs/                  (~60 lines each)
└── DangerZone.tsx            (~50 lines)

src/hooks/
├── useEntityCRUD.ts          (~50 lines)
├── useTransactionFilters.ts  (~60 lines)
└── useLLMCategorization.ts   (~80 lines)
```

### Files to Modify

| File | Current | After | Change |
|------|---------|-------|--------|
| AppContext.tsx | 883 | 0 (deleted) | -883 |
| TransactionsPage.tsx | 937 | ~300 | -637 |
| SettingsPage.tsx | 957 | ~150 | -807 |
| ReportsPage.tsx | 702 | ~400 | -302 |

### Net Impact

- **Before**: ~3,500 lines in context + pages
- **After**: ~2,200 lines across stores + components + hooks
- **Reduction**: ~1,300 lines (37% less code)
- **Benefit**: Each file < 150 lines, single responsibility

---

## Success Criteria

1. **No component > 300 lines**
2. **Each store < 120 lines**
3. **Components subscribe only to needed state slices**
4. **No DRY violations** - CRUD patterns consolidated
5. **No YAGNI violations** - removed unused abstractions
6. **All existing tests pass**
7. **No visual changes to UI**

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes during migration | Phased approach with legacy bridge |
| Performance regression | Benchmark critical paths before/after |
| Test coverage gaps | Add tests for new stores/hooks first |
| Learning curve for team | Document store patterns, provide examples |

---

## Decision: Proceed with Zustand?

**Recommendation: YES**

The codebase exhibits classic symptoms that Zustand solves:
- Monolithic context causing unnecessary re-renders
- Repeated patterns that benefit from store abstraction
- Monster components that need decomposition
- Computed state that should be memoized

The migration can be done incrementally with the bridge pattern, minimizing risk while delivering immediate benefits for new code.
