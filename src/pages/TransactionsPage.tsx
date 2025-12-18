/**
 * TransactionsPage - Transaction management
 *
 * Thin orchestrator that composes transaction components.
 * Uses Zustand stores for state management.
 */

import { useState, useMemo } from 'react';
import { useFinancialData } from '../stores';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationButton,
  PaginationPreviousButton,
  PaginationNextButton,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { Receipt, Sparkles } from 'lucide-react';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import {
  TransactionFilters,
  TransactionTable,
  EditTransactionDialog,
  LLMCategorizeDialog,
} from '../components/transactions';
import { convertLLMRuleToMappingRule } from '../utils/llm-prompt';
import type { Transaction, TransactionCategory } from '../types';

export function TransactionsPage() {
  const {
    contextTransactions: transactions,
    contextAccounts: accounts,
    contextSubcategories: subcategories,
    updateTransaction,
    updateTransactions,
    addMappingRule,
    addSubcategory,
    activeContextId,
  } = useFinancialData();

  // Filter and pagination state
  const {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    accountFilter,
    setAccountFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedTransactions,
    filteredTransactions,
    totalPages,
    hasActiveFilters,
    clearFilters,
  } = useTransactionFilters({
    transactions,
    initialPageSize: 25,
  });

  // Edit dialog state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // LLM dialog state
  const [showLLMDialog, setShowLLMDialog] = useState(false);

  // Uncategorized transactions for LLM
  const uncategorizedTransactions = useMemo(
    () => transactions.filter((tx) => tx.category === 'uncategorized'),
    [transactions]
  );

  // Handlers
  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
  };

  const handleSaveTransaction = async (tx: Transaction) => {
    await updateTransaction(tx);
  };

  const handleAddMappingRule = async (
    rule: Parameters<typeof convertLLMRuleToMappingRule>[0],
    contextId: string,
    priority: number
  ) => {
    const mappingRule = convertLLMRuleToMappingRule(rule, contextId, priority);
    await addMappingRule(mappingRule);
  };

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            {transactions.length} transactions
            {uncategorizedTransactions.length > 0 && (
              <span className="text-warning">
                {' '}
                ({uncategorizedTransactions.length} uncategorized)
              </span>
            )}
          </p>
        </div>
        {uncategorizedTransactions.length > 0 && (
          <Button onClick={() => setShowLLMDialog(true)}>
            <Sparkles className="size-4" />
            AI Categorize ({uncategorizedTransactions.length})
          </Button>
        )}
      </div>

      {/* Filters */}
      <TransactionFilters
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryChange={(v) => setCategoryFilter(v as TransactionCategory | 'all')}
        accountFilter={accountFilter}
        onAccountChange={setAccountFilter}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        accounts={accounts}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {/* Content */}
      {filteredTransactions.length === 0 ? (
        <Empty className="border border-border rounded-lg py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>
              {transactions.length === 0
                ? 'No transactions yet'
                : 'No matching transactions'}
            </EmptyTitle>
            <EmptyDescription>
              {transactions.length === 0
                ? 'Import an OFX file to add transactions'
                : 'Try adjusting your filters'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <TransactionTable
            transactions={paginatedTransactions}
            accounts={accounts}
            onEditTransaction={handleEditTransaction}
          />

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredTransactions.length)} of{' '}
              {filteredTransactions.length} transactions
            </p>

            <div className="flex items-center gap-2 order-1 sm:order-2">
              {/* Page size selector - Desktop only */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page navigation */}
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPreviousButton
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>

                  {currentPage > 2 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationButton onClick={() => setCurrentPage(1)}>
                        1
                      </PaginationButton>
                    </PaginationItem>
                  )}

                  {currentPage > 3 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {currentPage > 1 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationButton onClick={() => setCurrentPage(currentPage - 1)}>
                        {currentPage - 1}
                      </PaginationButton>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationButton isActive>{currentPage}</PaginationButton>
                  </PaginationItem>

                  {currentPage < totalPages && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationButton onClick={() => setCurrentPage(currentPage + 1)}>
                        {currentPage + 1}
                      </PaginationButton>
                    </PaginationItem>
                  )}

                  {currentPage < totalPages - 2 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {currentPage < totalPages - 1 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationButton onClick={() => setCurrentPage(totalPages)}>
                        {totalPages}
                      </PaginationButton>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNextButton
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <EditTransactionDialog
        transaction={editingTransaction}
        subcategories={subcategories}
        onClose={() => setEditingTransaction(null)}
        onSave={handleSaveTransaction}
      />

      {/* LLM Categorization Dialog */}
      <LLMCategorizeDialog
        open={showLLMDialog}
        onClose={() => setShowLLMDialog(false)}
        uncategorizedTransactions={uncategorizedTransactions}
        subcategories={subcategories}
        activeContextId={activeContextId}
        onUpdateTransactions={updateTransactions}
        onAddSubcategory={addSubcategory}
        onAddMappingRule={handleAddMappingRule}
      />
    </div>
  );
}
