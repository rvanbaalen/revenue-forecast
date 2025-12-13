import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Link2Off,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { BankTransaction, Month, TransactionFlowType } from '@/types';
import { useBank } from '@/context/BankContext';
import { useAccountingContext } from '@/context/AccountingContext';
import { CategorySelect } from '@/components/CategorySelect';

interface TransactionFilters {
  account: string;
  flowType: string;       // credit/debit/charge/payment or 'all'
  category: string;       // chartAccountId or 'all' or 'uncategorized'
  mapped: string;
  search: string;
}

// Flow type labels and colors
const FLOW_TYPE_CONFIG: Record<TransactionFlowType, { label: string; color: string }> = {
  credit: { label: 'Credit', color: 'badge-success' },
  debit: { label: 'Debit', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  charge: { label: 'Charge', color: 'badge-warning' },
  payment: { label: 'Payment', color: 'badge-info' },
};

interface BankTransactionTableProps {
  accountId?: number;
  year?: number;
  month?: Month;
  showFilters?: boolean;
  filters?: Partial<TransactionFilters>;
  onFiltersChange?: (filters: Partial<TransactionFilters>) => void;
  onMapTransaction?: (transaction: BankTransaction) => void;
}

const PAGE_SIZE = 20;

export function BankTransactionTable({
  accountId,
  year,
  month,
  showFilters = true,
  filters,
  onFiltersChange,
  onMapTransaction,
}: BankTransactionTableProps) {
  const { transactions, accounts, bulkMapToTransfer, bulkMapToExpense, bulkIgnore } = useBank();
  const { getAccountById, chartAccounts } = useAccountingContext();

  // Get all assignable categories (revenue + expense accounts)
  const assignableCategories = useMemo(() => {
    return chartAccounts.filter(a =>
      (a.type === 'REVENUE' || a.type === 'EXPENSE') &&
      a.isActive &&
      !a.parentId?.match(/^[1-5]000$/) // Exclude top-level parent accounts
    );
  }, [chartAccounts]);

  // Use controlled filters from props or internal state
  const accountFilter = filters?.account || accountId?.toString() || 'all';
  const flowTypeFilter = filters?.flowType || 'all';
  const categoryFilter = filters?.category || 'all';
  const mappedFilter = filters?.mapped || 'all';
  const searchQuery = filters?.search || '';
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Helper to update filters
  const updateFilters = (updates: Partial<TransactionFilters>) => {
    if (onFiltersChange) {
      onFiltersChange({
        account: accountFilter,
        flowType: flowTypeFilter,
        category: categoryFilter,
        mapped: mappedFilter,
        search: searchQuery,
        ...updates,
      });
    }
  };

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'datePosted', desc: true }
  ]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Account filter
      if (accountId && tx.accountId !== accountId) return false;
      if (accountFilter !== 'all' && tx.accountId !== parseInt(accountFilter)) return false;

      // Year/Month filter
      if (year && tx.year !== year) return false;
      if (month && tx.month !== month) return false;

      // Flow type filter (credit/debit/charge/payment)
      if (flowTypeFilter !== 'all' && tx.flowType !== flowTypeFilter) return false;

      // Category filter (chart account)
      if (categoryFilter === 'uncategorized') {
        if (tx.chartAccountId || tx.transferAccountId || tx.isIgnored) return false;
      } else if (categoryFilter === 'transfers') {
        if (!tx.transferAccountId) return false;
      } else if (categoryFilter === 'ignored') {
        if (!tx.isIgnored) return false;
      } else if (categoryFilter !== 'all') {
        if (tx.chartAccountId !== categoryFilter) return false;
      }

      // Mapped filter (consider chart accounts and transfer accounts as "mapped")
      const isMapped = tx.chartAccountId || tx.transferAccountId || tx.isIgnored;
      if (mappedFilter === 'mapped' && !isMapped) return false;
      if (mappedFilter === 'unmapped' && isMapped) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = tx.name.toLowerCase().includes(query);
        const matchesMemo = tx.memo?.toLowerCase().includes(query);
        if (!matchesName && !matchesMemo) return false;
      }

      return true;
    });
  }, [transactions, accountId, accountFilter, year, month, flowTypeFilter, categoryFilter, mappedFilter, searchQuery]);

  const getAccountName = (id?: number) => {
    if (!id) return null;
    return accounts.find(a => a.id === id)?.name || 'Unknown Account';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Column definitions
  const columns: ColumnDef<BankTransaction>[] = useMemo(() => [
    {
      id: 'select',
      header: () => null,
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleSelection(row.original.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'datePosted',
      header: 'Date',
      cell: ({ row }) => (
        <span className="font-mono text-sm whitespace-nowrap">
          {formatDate(row.original.datePosted)}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        return new Date(rowA.original.datePosted).getTime() - new Date(rowB.original.datePosted).getTime();
      },
    },
    {
      accessorKey: 'name',
      header: 'Description',
      cell: ({ row }) => {
        const tx = row.original;
        return (
          <div className="flex items-center gap-2">
            {tx.amount >= 0 ? (
              <ArrowDownLeft className="size-4 variance-positive flex-shrink-0" />
            ) : (
              <ArrowUpRight className="size-4 variance-negative flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{tx.name}</p>
              {tx.memo && (
                <p className="text-xs text-muted-foreground truncate">{tx.memo}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'flowType',
      header: 'Type',
      cell: ({ row }) => {
        const flowType = row.original.flowType;
        const config = flowType ? FLOW_TYPE_CONFIG[flowType] : null;
        return config ? (
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'chartAccountId',
      header: 'Category',
      cell: ({ row }) => {
        const tx = row.original;
        if (tx.isIgnored) {
          return (
            <span className="text-sm text-muted-foreground italic">Ignored</span>
          );
        }
        if (tx.chartAccountId) {
          const account = getAccountById(tx.chartAccountId);
          return (
            <span className="text-sm text-foreground">{account?.name || 'Unknown'}</span>
          );
        }
        if (tx.transferAccountId) {
          return (
            <div className="flex items-center gap-1 text-sm">
              <ArrowLeftRight className="h-3 w-3 text-info" />
              <span className="text-foreground">Transfer: {getAccountName(tx.transferAccountId)}</span>
            </div>
          );
        }
        // Uncategorized
        return (
          <span className="text-sm text-muted-foreground italic">Uncategorized</span>
        );
      },
      sortingFn: (rowA, rowB) => {
        const getLabel = (tx: BankTransaction) => {
          if (tx.isIgnored) return 'zzz_ignored';
          if (tx.chartAccountId) return getAccountById(tx.chartAccountId)?.name || '';
          if (tx.transferAccountId) return getAccountName(tx.transferAccountId) || '';
          return 'zzz_uncategorized';
        };
        return getLabel(rowA.original).localeCompare(getLabel(rowB.original));
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = row.original.amount;
        const formatted = amount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return (
          <span className={cn(
            "font-mono font-medium",
            amount >= 0 ? "variance-positive" : "variance-negative"
          )}>
            {amount >= 0 ? '+' : ''}{formatted}
          </span>
        );
      },
    },
    ...(onMapTransaction ? [{
      id: 'actions',
      header: '',
      cell: ({ row }: { row: { original: BankTransaction } }) => {
        const tx = row.original;
        // Show categorize button for all transactions - allows re-categorization
        const isUncategorized = !tx.revenueSourceId && !tx.chartAccountId && !tx.transferAccountId && tx.category !== 'ignore';
        return (
          <Button
            size="sm"
            variant={isUncategorized ? "default" : "ghost"}
            className={cn(
              "h-7 text-xs",
              !isUncategorized && "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onMapTransaction(tx);
            }}
          >
            {isUncategorized ? 'Categorize' : 'Edit'}
          </Button>
        );
      },
      enableSorting: false,
    } as ColumnDef<BankTransaction>] : []),
  ], [selectedIds, onMapTransaction, getAccountById]);

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: PAGE_SIZE,
      },
    },
  });

  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    const pageRows = table.getRowModel().rows;
    if (selectedIds.size === pageRows.length && pageRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageRows.map(row => row.original.id)));
    }
  };

  const handleBulkMapToTransfer = async (transferAccountId: number) => {
    await bulkMapToTransfer(Array.from(selectedIds), transferAccountId);
    setSelectedIds(new Set());
  };

  const handleBulkMapToExpense = async (chartAccountId: string) => {
    await bulkMapToExpense(Array.from(selectedIds), chartAccountId);
    setSelectedIds(new Set());
  };

  const handleBulkIgnore = async () => {
    await bulkIgnore(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const pageRows = table.getRowModel().rows;

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => {
                updateFilters({ search: e.target.value });
                table.setPageIndex(0);
              }}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => updateFilters({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {!accountId && (
            <Select value={accountFilter} onValueChange={(v) => {
              updateFilters({ account: v });
              table.setPageIndex(0);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={flowTypeFilter} onValueChange={(v) => {
            updateFilters({ flowType: v });
            table.setPageIndex(0);
          }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="charge">Charge</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(v) => {
            updateFilters({ category: v });
            table.setPageIndex(0);
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              <SelectItem value="transfers">Transfers</SelectItem>
              <SelectItem value="ignored">Ignored</SelectItem>
              {assignableCategories.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Categories</div>
                  {assignableCategories.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>

          <Select value={mappedFilter} onValueChange={(v) => {
            updateFilters({ mapped: v });
            table.setPageIndex(0);
          }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mapping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="mapped">Mapped</SelectItem>
              <SelectItem value="unmapped">Unmapped</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Fixed bulk actions bar at bottom */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-200 ease-out",
        selectedIds.size > 0 ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="bg-background border-t border-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
              <div className="h-4 w-px bg-border" />
              <CategorySelect
                value=""
                onValueChange={(v) => handleBulkMapToExpense(v)}
                placeholder="Set Category"
                className="w-[200px] h-8"
              />
              <Select onValueChange={(v) => handleBulkMapToTransfer(parseInt(v))}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder="Mark as Transfer" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkIgnore}
              >
                <Link2Off className="h-3 w-3" />
                Mark Ignored
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map(header => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  // Special handling for select column header
                  if (header.id === 'select') {
                    const allSelected = selectedIds.size === pageRows.length && pageRows.length > 0;
                    const someSelected = selectedIds.size > 0 && selectedIds.size < pageRows.length;
                    return (
                      <TableHead key={header.id} className="w-10">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={selectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    );
                  }

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.id === 'amount' && 'text-right',
                        header.id === 'actions' && 'w-20',
                        canSort && 'cursor-pointer select-none hover:bg-muted/80'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className={cn(
                        "flex items-center gap-1",
                        header.id === 'amount' && 'justify-end'
                      )}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="ml-1">
                            {sorted === 'asc' ? (
                              <ArrowUp className="size-4" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="size-4" />
                            ) : (
                              <ArrowUpDown className="size-4 text-muted-foreground" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map(row => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "group cursor-pointer",
                    selectedIds.has(row.original.id) && "bg-primary/5"
                  )}
                  onClick={() => toggleSelection(row.original.id)}
                  onDoubleClick={() => onMapTransaction?.(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.id === 'amount' && 'text-right'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * PAGE_SIZE + 1} to{' '}
            {Math.min((table.getState().pagination.pageIndex + 1) * PAGE_SIZE, filteredTransactions.length)} of{' '}
            {filteredTransactions.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
