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
  Link2,
  Link2Off,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { BankTransaction, Month, TransactionCategory } from '@/types';
import { useBank } from '@/context/BankContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';

interface TransactionFilters {
  account: string;
  category: string;
  mapped: string;
  search: string;
}

interface BankTransactionTableProps {
  accountId?: number;
  year?: number;
  month?: Month;
  showFilters?: boolean;
  filters?: Partial<TransactionFilters>;
  onFiltersChange?: (filters: Partial<TransactionFilters>) => void;
  onMapTransaction?: (transaction: BankTransaction) => void;
}

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  revenue: 'bg-green-500/10 text-green-600 border-green-500/20',
  expense: 'bg-red-500/10 text-red-600 border-red-500/20',
  transfer: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ignore: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

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
  const { transactions, accounts, bulkCategorize, bulkMapToSource } = useBank();
  const { sources } = useRevenue();

  // Use controlled filters from props or internal state
  const accountFilter = filters?.account || accountId?.toString() || 'all';
  const categoryFilter = filters?.category || 'all';
  const mappedFilter = filters?.mapped || 'all';
  const searchQuery = filters?.search || '';
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Helper to update filters
  const updateFilters = (updates: Partial<TransactionFilters>) => {
    if (onFiltersChange) {
      onFiltersChange({
        account: accountFilter,
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

      // Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

      // Mapped filter
      if (mappedFilter === 'mapped' && !tx.revenueSourceId) return false;
      if (mappedFilter === 'unmapped' && tx.revenueSourceId) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = tx.name.toLowerCase().includes(query);
        const matchesMemo = tx.memo?.toLowerCase().includes(query);
        if (!matchesName && !matchesMemo) return false;
      }

      return true;
    });
  }, [transactions, accountId, accountFilter, year, month, categoryFilter, mappedFilter, searchQuery]);

  const getSourceName = (id?: number) => {
    if (!id) return null;
    return sources.find(s => s.id === id)?.name || 'Unknown Source';
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
              <ArrowDownLeft className="h-4 w-4 variance-positive flex-shrink-0" />
            ) : (
              <ArrowUpRight className="h-4 w-4 variance-negative flex-shrink-0" />
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
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn("capitalize", CATEGORY_COLORS[row.original.category])}
        >
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: 'revenueSourceId',
      header: 'Mapped To',
      cell: ({ row }) => {
        const tx = row.original;
        if (tx.revenueSourceId) {
          return (
            <div className="flex items-center gap-1 text-sm">
              <Link2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground">{getSourceName(tx.revenueSourceId)}</span>
            </div>
          );
        }
        if (tx.category === 'revenue') {
          return (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Link2Off className="h-3 w-3" />
              <span>Not mapped</span>
            </div>
          );
        }
        return <span className="text-sm text-muted-foreground">-</span>;
      },
      sortingFn: (rowA, rowB) => {
        const nameA = getSourceName(rowA.original.revenueSourceId) || '';
        const nameB = getSourceName(rowB.original.revenueSourceId) || '';
        return nameA.localeCompare(nameB);
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = row.original.amount;
        return (
          <span className={cn(
            "font-mono font-medium",
            amount >= 0 ? "variance-positive" : "variance-negative"
          )}>
            {amount >= 0 ? '+' : ''}{formatCurrency(amount, false)}
          </span>
        );
      },
    },
    ...(onMapTransaction ? [{
      id: 'actions',
      header: '',
      cell: ({ row }: { row: { original: BankTransaction } }) => {
        const tx = row.original;
        if (tx.category === 'revenue' && !tx.revenueSourceId) {
          return (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onMapTransaction(tx);
              }}
            >
              Map
            </Button>
          );
        }
        return null;
      },
      enableSorting: false,
    } as ColumnDef<BankTransaction>] : []),
  ], [selectedIds, onMapTransaction, sources]);

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

  const handleBulkCategorize = async (category: TransactionCategory) => {
    await bulkCategorize(Array.from(selectedIds), category);
    setSelectedIds(new Set());
  };

  const handleBulkMapToSource = async (sourceId: number) => {
    await bulkMapToSource(Array.from(selectedIds), sourceId);
    setSelectedIds(new Set());
  };

  const pageRows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
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

          <Select value={categoryFilter} onValueChange={(v) => {
            updateFilters({ category: v });
            table.setPageIndex(0);
          }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="ignore">Ignored</SelectItem>
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

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
          <Select onValueChange={(v) => handleBulkCategorize(v as TransactionCategory)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Set Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="ignore">Ignore</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => handleBulkMapToSource(parseInt(v))}>
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Map to Source" />
            </SelectTrigger>
            <SelectContent>
              {sources.map(source => (
                <SelectItem key={source.id} value={source.id.toString()}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
                              <ArrowUp className="h-4 w-4" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
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
              <ChevronLeft className="h-4 w-4" />
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
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
