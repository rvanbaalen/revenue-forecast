import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/decimal';
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
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Transaction, TransactionCategory, IncomeType } from '../types';
import {
  generateRulesetPrompt,
  parseRulesetResponse,
  applyRulesToTransactions,
} from '../utils/llm-prompt';
import type { RuleApplicationResult } from '../types';

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
    activeContextId,
  } = useApp();

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  // Edit state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editCategory, setEditCategory] = useState<TransactionCategory>('uncategorized');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editIncomeType, setEditIncomeType] = useState<IncomeType>('local');

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
  };

  // Handle saving edit
  const handleEditSave = async () => {
    if (!editingTx) return;
    await updateTransaction({
      ...editingTx,
      category: editCategory,
      subcategory: editSubcategory,
      incomeType: editCategory === 'income' ? editIncomeType : undefined,
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

    const { updatedTransactions, appliedCount, unmatchedCount, ruleApplications } =
      applyRulesToTransactions(uncategorizedTx, result.rules, subcategories);

    // Show results before closing
    setApplyResults({ appliedCount, unmatchedCount, ruleApplications });

    if (appliedCount > 0) {
      await updateTransactions(updatedTransactions);

      // Save LLM-generated rules as MappingRules for future use
      if (activeContextId) {
        for (let i = 0; i < ruleApplications.length; i++) {
          const app = ruleApplications[i];
          const rule = app.rule;

          // Convert LLM matchType to MappingRule patternType
          let patternType: 'contains' | 'exact' | 'regex' = 'contains';
          let pattern = rule.pattern;
          if (rule.matchType === 'exact') {
            patternType = 'exact';
          } else if (rule.matchType === 'startsWith') {
            // Convert startsWith to regex pattern
            patternType = 'regex';
            pattern = `^${rule.pattern}`;
          }

          await addMappingRule({
            contextId: activeContextId,
            pattern,
            patternType,
            matchField: rule.matchField,
            category: rule.category,
            subcategory: rule.subcategory,
            incomeType: rule.incomeType || undefined,
            priority: ruleApplications.length - i, // Higher priority for earlier rules
            isActive: true,
          });
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

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
          <Select value={accountFilter} onValueChange={setAccountFilter}>
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
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((tx) => {
                  const account = accountMap.get(tx.accountId);
                  const isPositive = parseFloat(tx.amount) >= 0;

                  return (
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEdit(tx)}
                    >
                      <TableCell className="text-muted-foreground tabular-nums">
                        {new Date(tx.date).toLocaleDateString()}
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
                      <TableCell className="text-muted-foreground text-sm">
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
                      <TableCell className="text-muted-foreground">
                        {tx.subcategory || '-'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-medium',
                          isPositive ? 'variance-positive' : 'variance-negative'
                        )}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(tx.amount, '$')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
