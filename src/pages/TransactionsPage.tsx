import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/decimal';
import { getCurrencySymbol } from '@/utils/currency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationButton,
  PaginationPreviousButton,
  PaginationNextButton,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Receipt,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  HelpCircle,
  Sparkles,
  Copy,
  Check,
  Scale,
  Calendar,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Transaction, TransactionCategory, IncomeType } from '../types';
import {
  generateRulesetPrompt,
  parseRulesetResponse,
  applyRulesToTransactions,
  convertLLMRuleToMappingRule,
} from '../utils/llm-prompt';
import type { RuleApplicationResult } from '../types';
import {
  isFiscalYearDifferent,
  getTransactionDateYear,
  getFiscalYear,
} from '../utils/fiscal-year';

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  income: 'bg-green-500/10 text-green-700 dark:text-green-400',
  expense: 'bg-red-500/10 text-red-700 dark:text-red-400',
  transfer: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  uncategorized: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  adjustment: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

const CATEGORY_ICONS: Record<TransactionCategory, React.ReactNode> = {
  income: <TrendingUp className="size-3" />,
  expense: <TrendingDown className="size-3" />,
  transfer: <ArrowLeftRight className="size-3" />,
  uncategorized: <HelpCircle className="size-3" />,
  adjustment: <Scale className="size-3" />,
};

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
  } = useApp();

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Mobile filter drawer
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Edit state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editCategory, setEditCategory] = useState<TransactionCategory>('uncategorized');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editIncomeType, setEditIncomeType] = useState<IncomeType>('local');
  const [editFiscalYear, setEditFiscalYear] = useState<string>('');

  // LLM categorization state
  const [showLLM, setShowLLM] = useState(false);
  const [llmPrompt, setLlmPrompt] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applyResults, setApplyResults] = useState<{
    appliedCount: number;
    unmatchedCount: number;
    ruleApplications: RuleApplicationResult[];
  } | null>(null);

  // Create account lookup map
  const accountMap = useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a]));
  }, [accounts]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          tx.name.toLowerCase().includes(searchLower) ||
          (tx.memo && tx.memo.toLowerCase().includes(searchLower)) ||
          tx.subcategory.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
      }

      // Account filter
      if (accountFilter !== 'all' && tx.accountId !== accountFilter) {
        return false;
      }

      return true;
    });
  }, [transactions, search, categoryFilter, accountFilter]);

  // Sort by date descending
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredTransactions]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedTransactions.length / pageSize);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(startIndex, startIndex + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Reset to page 1 when filters change
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const handleAccountFilter = (value: string) => {
    setAccountFilter(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = search !== '' || categoryFilter !== 'all' || accountFilter !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setAccountFilter('all');
    setCurrentPage(1);
    setFilterDrawerOpen(false);
  };

  // Get uncategorized transactions for LLM
  const uncategorizedTx = useMemo(() => {
    return transactions.filter((tx) => tx.category === 'uncategorized');
  }, [transactions]);

  // Handle opening edit dialog
  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditCategory(tx.category);
    setEditSubcategory(tx.subcategory);
    setEditIncomeType(tx.incomeType || 'local');
    setEditFiscalYear(tx.fiscalYear?.toString() || '');
  };

  // Handle saving edit
  const handleEditSave = async () => {
    if (!editingTx) return;

    // Parse fiscal year: empty string = undefined (use transaction date), valid number = override
    const fiscalYearValue = editFiscalYear.trim();
    const fiscalYear = fiscalYearValue ? parseInt(fiscalYearValue, 10) : undefined;

    await updateTransaction({
      ...editingTx,
      category: editCategory,
      subcategory: editSubcategory,
      incomeType: editCategory === 'income' ? editIncomeType : undefined,
      fiscalYear: fiscalYear && !isNaN(fiscalYear) ? fiscalYear : undefined,
    });
    setEditingTx(null);
  };

  // Handle LLM categorization
  const openLLMDialog = () => {
    const prompt = generateRulesetPrompt(uncategorizedTx, subcategories);
    setLlmPrompt(prompt);
    setLlmResponse('');
    setParseError(null);
    setApplyResults(null);
    setShowLLM(true);
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(llmPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyLLMResponse = async () => {
    const result = parseRulesetResponse(llmResponse);
    if ('error' in result) {
      setParseError(result.error);
      return;
    }

    const { updatedTransactions, newSubcategories, appliedCount, unmatchedCount, ruleApplications } =
      applyRulesToTransactions(uncategorizedTx, result.rules, subcategories);

    // Show results before closing
    setApplyResults({ appliedCount, unmatchedCount, ruleApplications });

    if (appliedCount > 0) {
      await updateTransactions(updatedTransactions);

      // Add any new subcategories suggested by LLM to the database
      for (const newSub of newSubcategories) {
        await addSubcategory(newSub.name, newSub.type);
      }

      // Save LLM-generated rules as MappingRules for future use
      if (activeContextId) {
        for (let i = 0; i < ruleApplications.length; i++) {
          const mappingRule = convertLLMRuleToMappingRule(
            ruleApplications[i].rule,
            activeContextId,
            ruleApplications.length - i // Higher priority for earlier rules
          );
          await addMappingRule(mappingRule);
        }
      }
    }
  };

  const handleCloseLLMDialog = () => {
    setShowLLM(false);
    setLlmResponse('');
    setParseError(null);
    setApplyResults(null);
  };

  // Get subcategories for current category
  const relevantSubcategories = useMemo(() => {
    if (!editCategory || editCategory === 'uncategorized' || editCategory === 'transfer') {
      return [];
    }
    return subcategories.filter((s) => s.type === editCategory);
  }, [subcategories, editCategory]);

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            {transactions.length} transactions
            {uncategorizedTx.length > 0 && (
              <span className="text-warning">
                {' '}
                ({uncategorizedTx.length} uncategorized)
              </span>
            )}
          </p>
        </div>
        {uncategorizedTx.length > 0 && (
          <Button onClick={openLLMDialog}>
            <Sparkles className="size-4" />
            AI Categorize ({uncategorizedTx.length})
          </Button>
        )}
      </div>

      {/* Filters - Desktop */}
      <div className="hidden md:flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
          <SelectTrigger className="w-40">
            <Filter className="size-4 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
          </SelectContent>
        </Select>

        {accounts.length > 1 && (
          <Select value={accountFilter} onValueChange={handleAccountFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Filters - Mobile */}
      <div className="flex md:hidden items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative shrink-0">
              <SlidersHorizontal className="size-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 size-2 bg-primary rounded-full" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {accounts.length > 1 && (
                <div className="flex flex-col gap-2">
                  <Label>Account</Label>
                  <Select value={accountFilter} onValueChange={handleAccountFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label>Results per page</Label>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger>
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

              <div className="flex gap-2 pt-2">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="flex-1">
                    <X className="size-4" />
                    Clear Filters
                  </Button>
                )}
                <Button onClick={() => setFilterDrawerOpen(false)} className="flex-1">
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Transactions table */}
      {sortedTransactions.length === 0 ? (
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
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Account</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="hidden md:table-cell">Subcategory</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((tx) => {
                  const account = accountMap.get(tx.accountId);
                  const isPositive = parseFloat(tx.amount) >= 0;

                  return (
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEdit(tx)}
                    >
                      <TableCell className="text-muted-foreground tabular-nums">
                        <div className="flex items-center gap-1.5">
                          {new Date(tx.date).toLocaleDateString()}
                          {isFiscalYearDifferent(tx) && (
                            <span
                              className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-info/10 text-info"
                              title={`Fiscal year override: Reports as ${getFiscalYear(tx)}`}
                            >
                              <Calendar className="size-3" />
                              FY{getFiscalYear(tx)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{tx.name}</p>
                          {tx.memo && (
                            <p className="text-xs text-muted-foreground truncate">
                              {tx.memo}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {account?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'gap-1',
                            CATEGORY_COLORS[tx.category]
                          )}
                        >
                          {CATEGORY_ICONS[tx.category]}
                          {tx.category}
                          {tx.category === 'income' && tx.incomeType === 'foreign' && (
                            <span className="text-xs opacity-70">(intl)</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {tx.subcategory || '-'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-medium',
                          isPositive ? 'variance-positive' : 'variance-negative'
                        )}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(tx.amount, getCurrencySymbol(account?.currency || 'USD'))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
              Showing {((currentPage - 1) * pageSize) + 1} to{' '}
              {Math.min(currentPage * pageSize, sortedTransactions.length)} of{' '}
              {sortedTransactions.length} transactions
            </p>

            <div className="flex items-center gap-2 order-1 sm:order-2">
              {/* Page size selector - Desktop only */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
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

              {/* Page navigation using shadcn pagination */}
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPreviousButton
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>

                  {/* First page */}
                  {currentPage > 2 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationButton onClick={() => setCurrentPage(1)}>
                        1
                      </PaginationButton>
                    </PaginationItem>
                  )}

                  {/* Ellipsis before current */}
                  {currentPage > 3 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {/* Previous page (if not first) */}
                  {currentPage > 1 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationButton onClick={() => setCurrentPage(currentPage - 1)}>
                        {currentPage - 1}
                      </PaginationButton>
                    </PaginationItem>
                  )}

                  {/* Current page */}
                  <PaginationItem>
                    <PaginationButton isActive>
                      {currentPage}
                    </PaginationButton>
                  </PaginationItem>

                  {/* Next page (if not last) */}
                  {currentPage < totalPages && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationButton onClick={() => setCurrentPage(currentPage + 1)}>
                        {currentPage + 1}
                      </PaginationButton>
                    </PaginationItem>
                  )}

                  {/* Ellipsis after current */}
                  {currentPage < totalPages - 2 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationButton onClick={() => setCurrentPage(totalPages)}>
                        {totalPages}
                      </PaginationButton>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNextButton
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTx} onOpenChange={() => setEditingTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              {editingTx?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select
                value={editCategory}
                onValueChange={(v) => setEditCategory(v as TransactionCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editCategory === 'income' && (
              <div className="flex flex-col gap-2">
                <Label>Income Type</Label>
                <Select
                  value={editIncomeType}
                  onValueChange={(v) => setEditIncomeType(v as IncomeType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local (15% tax)</SelectItem>
                    <SelectItem value="foreign">Foreign (exempt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(editCategory === 'income' || editCategory === 'expense') && (
              <div className="flex flex-col gap-2">
                <Label>Subcategory</Label>
                {relevantSubcategories.length > 0 ? (
                  <Select
                    value={editSubcategory}
                    onValueChange={setEditSubcategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {relevantSubcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.name}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editSubcategory}
                    onChange={(e) => setEditSubcategory(e.target.value)}
                    placeholder="Enter subcategory"
                  />
                )}
              </div>
            )}

            {/* Fiscal Year Override */}
            <div className="flex flex-col gap-2">
              <Label>Fiscal Year Override</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editFiscalYear}
                  onChange={(e) => setEditFiscalYear(e.target.value)}
                  placeholder={editingTx ? getTransactionDateYear(editingTx).toString() : ''}
                  min={1900}
                  max={2100}
                  className="w-32"
                />
                {editFiscalYear && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditFiscalYear('')}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to use transaction date year ({editingTx ? getTransactionDateYear(editingTx) : ''}).
                Set to override for reporting purposes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTx(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LLM Categorization Dialog */}
      <Dialog open={showLLM} onOpenChange={handleCloseLLMDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Categorization</DialogTitle>
            <DialogDescription>
              The AI will first ask clarifying questions about your business, then generate
              efficient categorization rules. Have a conversation to define local/foreign income,
              recurring vs one-time revenue, and expense categories.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {!applyResults ? (
              <>
                {/* Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>1. Copy this prompt</Label>
                    <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="bg-muted rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                      {llmPrompt.slice(0, 500)}...
                    </pre>
                  </div>
                </div>

                {/* Response */}
                <div>
                  <Label className="mb-2 block">2. Paste AI response (rules JSON)</Label>
                  <Textarea
                    placeholder='Paste the JSON response with "rules" array here...'
                    className="min-h-32 font-mono text-xs"
                    value={llmResponse}
                    onChange={(e) => {
                      setLlmResponse(e.target.value);
                      setParseError(null);
                    }}
                  />
                </div>

                {parseError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{parseError}</p>
                  </div>
                )}
              </>
            ) : (
              /* Results view */
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 p-3 bg-green-500/10 rounded-lg text-center">
                    <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
                      {applyResults.appliedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Categorized</p>
                  </div>
                  {applyResults.unmatchedCount > 0 && (
                    <div className="flex-1 p-3 bg-yellow-500/10 rounded-lg text-center">
                      <p className="text-2xl font-semibold text-yellow-700 dark:text-yellow-400">
                        {applyResults.unmatchedCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Unmatched</p>
                    </div>
                  )}
                  <div className="flex-1 p-3 bg-blue-500/10 rounded-lg text-center">
                    <p className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
                      {applyResults.ruleApplications.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Rules Applied</p>
                  </div>
                </div>

                {applyResults.ruleApplications.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pattern</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Matched</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applyResults.ruleApplications.map((app, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">
                                {app.rule.pattern}
                              </TableCell>
                              <TableCell>
                                <Badge className={cn('gap-1', CATEGORY_COLORS[app.rule.category])}>
                                  {CATEGORY_ICONS[app.rule.category]}
                                  {app.rule.subcategory}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {app.matchedCount}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {!applyResults ? (
              <>
                <Button variant="outline" onClick={handleCloseLLMDialog}>
                  Cancel
                </Button>
                <Button onClick={handleApplyLLMResponse} disabled={!llmResponse.trim()}>
                  Apply Rules
                </Button>
              </>
            ) : (
              <Button onClick={handleCloseLLMDialog}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
