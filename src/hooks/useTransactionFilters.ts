/**
 * useTransactionFilters - Transaction filtering and pagination
 *
 * Consolidates filter state and logic from TransactionsPage.
 * Provides memoized filtered/sorted/paginated transaction data.
 */

import { useState, useMemo, useCallback } from 'react';
import type { Transaction, TransactionCategory } from '../types';

interface UseTransactionFiltersOptions {
  transactions: Transaction[];
  initialSearch?: string;
  initialCategory?: TransactionCategory | 'all';
  initialAccount?: string;
  initialPageSize?: number;
}

interface UseTransactionFiltersReturn {
  // Filter state
  search: string;
  setSearch: (search: string) => void;
  categoryFilter: TransactionCategory | 'all';
  setCategoryFilter: (category: TransactionCategory | 'all') => void;
  accountFilter: string;
  setAccountFilter: (account: string) => void;

  // Pagination state
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;

  // Computed values
  filteredTransactions: Transaction[];
  paginatedTransactions: Transaction[];
  totalPages: number;
  hasActiveFilters: boolean;

  // Actions
  clearFilters: () => void;
}

export function useTransactionFilters(
  options: UseTransactionFiltersOptions
): UseTransactionFiltersReturn {
  const {
    transactions,
    initialSearch = '',
    initialCategory = 'all',
    initialAccount = 'all',
    initialPageSize = 20,
  } = options;

  // Filter state
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | 'all'>(initialCategory);
  const [accountFilter, setAccountFilter] = useState(initialAccount);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.memo.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // Apply account filter
    if (accountFilter !== 'all') {
      result = result.filter((t) => t.accountId === accountFilter);
    }

    // Sort by date descending
    result.sort((a, b) => b.date.localeCompare(a.date));

    return result;
  }, [transactions, search, categoryFilter, accountFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Check if filters are active
  const hasActiveFilters = search !== '' || categoryFilter !== 'all' || accountFilter !== 'all';

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearch('');
    setCategoryFilter('all');
    setAccountFilter('all');
    setCurrentPage(1);
  }, []);

  // Reset to page 1 when filters change
  const handleSetSearch = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handleSetCategoryFilter = useCallback((value: TransactionCategory | 'all') => {
    setCategoryFilter(value);
    setCurrentPage(1);
  }, []);

  const handleSetAccountFilter = useCallback((value: string) => {
    setAccountFilter(value);
    setCurrentPage(1);
  }, []);

  return {
    // Filter state
    search,
    setSearch: handleSetSearch,
    categoryFilter,
    setCategoryFilter: handleSetCategoryFilter,
    accountFilter,
    setAccountFilter: handleSetAccountFilter,

    // Pagination state
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    // Computed values
    filteredTransactions,
    paginatedTransactions,
    totalPages,
    hasActiveFilters,

    // Actions
    clearFilters,
  };
}
