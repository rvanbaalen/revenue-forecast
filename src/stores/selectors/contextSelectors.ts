/**
 * Context Selectors - Derived state for active context
 *
 * These selectors compute context-filtered data efficiently.
 * They replace the inline filtering that happened in AppContext.
 */

import type { BankAccount, Transaction, Subcategory, MappingRule } from '../../types';

/**
 * Creates a memoizable selector for context accounts
 */
export const createContextAccountsSelector = (
  accounts: BankAccount[],
  activeContextId: string | null
): BankAccount[] => {
  if (!activeContextId) return [];
  return accounts.filter((a) => a.contextId === activeContextId);
};

/**
 * Creates a memoizable selector for context transactions
 */
export const createContextTransactionsSelector = (
  transactions: Transaction[],
  contextAccounts: BankAccount[]
): Transaction[] => {
  const accountIds = new Set(contextAccounts.map((a) => a.id));
  return transactions.filter((t) => accountIds.has(t.accountId));
};

/**
 * Creates a memoizable selector for context subcategories
 */
export const createContextSubcategoriesSelector = (
  subcategories: Subcategory[],
  activeContextId: string | null
): Subcategory[] => {
  if (!activeContextId) return [];
  return subcategories.filter((s) => s.contextId === activeContextId);
};

/**
 * Creates a memoizable selector for context mapping rules
 */
export const createContextMappingRulesSelector = (
  mappingRules: MappingRule[],
  activeContextId: string | null
): MappingRule[] => {
  if (!activeContextId) return [];
  return mappingRules.filter((r) => r.contextId === activeContextId);
};

/**
 * Creates a memoizable selector for uncategorized transaction count
 */
export const createUncategorizedCountSelector = (
  contextTransactions: Transaction[]
): number => {
  return contextTransactions.filter((t) => t.category === 'uncategorized').length;
};
