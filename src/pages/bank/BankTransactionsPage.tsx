import { useState } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { useRevenue } from '@/context/RevenueContext';
import { BankTransactionTable } from '@/components/BankTransactionTable';
import { TransactionMappingModal } from '@/components/TransactionMappingModal';
import type { BankTransaction, TransactionCategory } from '@/types';

const routeApi = getRouteApi('/bank/transactions');

export function BankTransactionsPage() {
  const { config } = useRevenue();
  const navigate = useNavigate();
  const search = routeApi.useSearch();

  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);

  const handleFilterChange = (filters: {
    account?: string;
    category?: string;
    mapped?: string;
    search?: string;
  }) => {
    // Build new search params, omitting 'all' and empty values
    const newSearch: Record<string, string> = {};

    if (filters.account && filters.account !== 'all') {
      newSearch.account = filters.account;
    }
    if (filters.category && filters.category !== 'all') {
      newSearch.category = filters.category;
    }
    if (filters.mapped && filters.mapped !== 'all') {
      newSearch.mapped = filters.mapped;
    }
    if (filters.search) {
      newSearch.q = filters.search;
    }

    navigate({
      to: '/bank/transactions',
      search: newSearch,
      replace: true,
    });
  };

  return (
    <>
      <BankTransactionTable
        year={config.year}
        filters={{
          account: search.account || 'all',
          category: (search.category as TransactionCategory) || 'all',
          mapped: search.mapped || 'all',
          search: search.q || '',
        }}
        onFiltersChange={handleFilterChange}
        onMapTransaction={(tx) => setSelectedTransaction(tx)}
      />

      <TransactionMappingModal
        isOpen={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  );
}
