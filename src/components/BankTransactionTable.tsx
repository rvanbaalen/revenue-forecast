import { useState, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import {
  Search,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  ArrowDownLeft,
  Link2,
  Link2Off,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import type { BankTransaction, Month, TransactionCategory } from '@/types';
import { useBank } from '@/context/BankContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';

interface BankTransactionTableProps {
  accountId?: number;
  year?: number;
  month?: Month;
  showFilters?: boolean;
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
  onMapTransaction,
}: BankTransactionTableProps) {
  const { transactions, accounts, bulkCategorize, bulkMapToSource } = useBank();
  const { sources } = useRevenue();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mappedFilter, setMappedFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>(accountId?.toString() || 'all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

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
    }).sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime());
  }, [transactions, accountId, accountFilter, year, month, categoryFilter, mappedFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
    if (selectedIds.size === paginatedTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTransactions.map(tx => tx.id)));
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {!accountId && (
            <Select value={accountFilter} onValueChange={setAccountFilter}>
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

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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

          <Select value={mappedFilter} onValueChange={setMappedFilter}>
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
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <button
                  onClick={selectAll}
                  className="p-1 hover:bg-accent rounded"
                >
                  {selectedIds.size === paginatedTransactions.length && paginatedTransactions.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Mapped To</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {onMapTransaction && <TableHead className="w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onMapTransaction ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map(tx => (
                <TableRow
                  key={tx.id}
                  className={cn(
                    "group",
                    selectedIds.has(tx.id) && "bg-primary/5"
                  )}
                >
                  <TableCell>
                    <button
                      onClick={() => toggleSelection(tx.id)}
                      className="p-1 hover:bg-accent rounded"
                    >
                      {selectedIds.has(tx.id) ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {formatDate(tx.datePosted)}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("capitalize", CATEGORY_COLORS[tx.category])}
                    >
                      {tx.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tx.revenueSourceId ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Link2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground">{getSourceName(tx.revenueSourceId)}</span>
                      </div>
                    ) : tx.category === 'revenue' ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Link2Off className="h-3 w-3" />
                        <span>Not mapped</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono font-medium",
                    tx.amount >= 0 ? "variance-positive" : "variance-negative"
                  )}>
                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount, false)}
                  </TableCell>
                  {onMapTransaction && (
                    <TableCell>
                      {tx.category === 'revenue' && !tx.revenueSourceId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onMapTransaction(tx)}
                        >
                          Map
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
