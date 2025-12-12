import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Wand2,
  Link2,
  Play,
} from 'lucide-react';
import type { TransactionMappingRule, TransactionCategory } from '@/types';
import { useBank } from '@/context/BankContext';
import { useRevenue } from '@/context/RevenueContext';
import { useAccountingContext } from '@/context/AccountingContext';

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  revenue: 'bg-green-500/10 text-green-600 border-green-500/20',
  expense: 'bg-red-500/10 text-red-600 border-red-500/20',
  transfer: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ignore: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

interface RuleFormData {
  pattern: string;
  matchField: 'name' | 'memo' | 'both';
  category: TransactionCategory;
  revenueSourceId?: number;
  chartAccountId?: string;
  accountId?: number;
}

export function MappingRulesTable() {
  const { mappingRules, accounts, addMappingRule, updateMappingRule, deleteMappingRule, applyMappingRules } = useBank();
  const { sources } = useRevenue();
  const { getExpenseAccounts, getAccountById } = useAccountingContext();

  const expenseAccounts = getExpenseAccounts();

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRule, setEditingRule] = useState<TransactionMappingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<TransactionMappingRule | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  const [formData, setFormData] = useState<RuleFormData>({
    pattern: '',
    matchField: 'name',
    category: 'revenue',
  });

  const resetForm = () => {
    setFormData({
      pattern: '',
      matchField: 'name',
      category: 'revenue',
    });
  };

  const handleAddRule = async () => {
    const maxPriority = Math.max(0, ...mappingRules.map(r => r.priority));
    await addMappingRule({
      ...formData,
      isActive: true,
      priority: maxPriority + 1,
      createdAt: new Date().toISOString(),
    });
    setIsAddingRule(false);
    resetForm();
  };

  const handleEditRule = async () => {
    if (!editingRule) return;
    await updateMappingRule({
      ...editingRule,
      ...formData,
    });
    setEditingRule(null);
    resetForm();
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    await deleteMappingRule(deletingRule.id);
    setDeletingRule(null);
  };

  const handleToggleRule = async (rule: TransactionMappingRule) => {
    await updateMappingRule({
      ...rule,
      isActive: !rule.isActive,
    });
  };

  const handleApplyRules = async () => {
    setIsApplying(true);
    try {
      const count = await applyMappingRules();
      setAppliedCount(count);
      setTimeout(() => setAppliedCount(null), 3000);
    } finally {
      setIsApplying(false);
    }
  };

  const openEditDialog = (rule: TransactionMappingRule) => {
    setFormData({
      pattern: rule.pattern,
      matchField: rule.matchField,
      category: rule.category,
      revenueSourceId: rule.revenueSourceId,
      chartAccountId: rule.chartAccountId,
      accountId: rule.accountId,
    });
    setEditingRule(rule);
  };

  const getSourceName = (id?: number) => {
    if (!id) return null;
    return sources.find(s => s.id === id)?.name || 'Unknown';
  };

  const getChartAccountName = (chartAccountId?: string) => {
    if (!chartAccountId) return null;
    const account = getAccountById(chartAccountId);
    return account?.name || 'Unknown';
  };

  const getAccountName = (id?: number) => {
    if (!id) return 'All Accounts';
    return accounts.find(a => a.id === id)?.name || 'Unknown';
  };

  const sortedRules = [...mappingRules].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Mapping Rules</h3>
          <p className="text-sm text-muted-foreground">
            Automatically categorize and map transactions based on patterns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {appliedCount !== null && (
            <span className="text-sm text-muted-foreground animate-fade-in">
              Updated {appliedCount} transaction{appliedCount !== 1 ? 's' : ''}
            </span>
          )}
          <Button
            variant="outline"
            onClick={handleApplyRules}
            disabled={isApplying || mappingRules.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            {isApplying ? 'Applying...' : 'Apply Rules'}
          </Button>
          <Button onClick={() => setIsAddingRule(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Rules table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">Active</TableHead>
              <TableHead>Pattern</TableHead>
              <TableHead>Match In</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Maps To</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No mapping rules yet</p>
                  <p className="text-sm">Create rules to automatically categorize transactions.</p>
                </TableCell>
              </TableRow>
            ) : (
              sortedRules.map(rule => (
                <TableRow key={rule.id} className={cn(!rule.isActive && "opacity-50")}>
                  <TableCell>
                    <button
                      onClick={() => handleToggleRule(rule)}
                      className="p-1 hover:bg-accent rounded"
                    >
                      {rule.isActive ? (
                        <ToggleRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                      {rule.pattern}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {rule.matchField === 'both' ? 'Name & Memo' : rule.matchField}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("capitalize", CATEGORY_COLORS[rule.category])}
                    >
                      {rule.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {rule.revenueSourceId ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Link2 className="h-3 w-3 text-green-500" />
                        {getSourceName(rule.revenueSourceId)}
                      </div>
                    ) : rule.chartAccountId ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Link2 className="h-3 w-3 text-red-500" />
                        {getChartAccountName(rule.chartAccountId)}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getAccountName(rule.accountId)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingRule(rule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddingRule || !!editingRule}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingRule(false);
            setEditingRule(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Mapping Rule' : 'Add Mapping Rule'}
            </DialogTitle>
            <DialogDescription>
              Define a pattern to automatically categorize matching transactions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pattern">Pattern</Label>
              <Input
                id="pattern"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                placeholder="e.g., ACME Corp or ^PAY.*"
              />
              <p className="text-xs text-muted-foreground">
                Enter text to match, or use regex patterns for advanced matching.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchField">Match In</Label>
              <Select
                value={formData.matchField}
                onValueChange={(v) => setFormData({ ...formData, matchField: v as any })}
              >
                <SelectTrigger id="matchField">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name only</SelectItem>
                  <SelectItem value="memo">Memo only</SelectItem>
                  <SelectItem value="both">Name and Memo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as TransactionCategory })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="ignore">Ignore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.category === 'revenue' && (
              <div className="space-y-2">
                <Label htmlFor="source">Revenue Source (Optional)</Label>
                <Select
                  value={formData.revenueSourceId?.toString() || 'none'}
                  onValueChange={(v) => setFormData({
                    ...formData,
                    revenueSourceId: v === 'none' ? undefined : parseInt(v),
                    chartAccountId: undefined,
                  })}
                >
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No source (just categorize)</SelectItem>
                    {sources.map(source => (
                      <SelectItem key={source.id} value={source.id.toString()}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.category === 'expense' && (
              <div className="space-y-2">
                <Label htmlFor="expenseCategory">Expense Category (Optional)</Label>
                <Select
                  value={formData.chartAccountId || 'none'}
                  onValueChange={(v) => setFormData({
                    ...formData,
                    chartAccountId: v === 'none' ? undefined : v,
                    revenueSourceId: undefined,
                  })}
                >
                  <SelectTrigger id="expenseCategory">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category (just categorize)</SelectItem>
                    {expenseAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{account.code}</span>
                          <span>{account.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="account">Apply to Account (Optional)</Label>
              <Select
                value={formData.accountId?.toString() || 'all'}
                onValueChange={(v) => setFormData({
                  ...formData,
                  accountId: v === 'all' ? undefined : parseInt(v)
                })}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder="All accounts" />
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
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingRule(false);
                setEditingRule(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingRule ? handleEditRule : handleAddRule}
              disabled={!formData.pattern}
            >
              {editingRule ? 'Save Changes' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deletingRule} onOpenChange={(open) => !open && setDeletingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this mapping rule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted rounded-lg">
            <code className="text-sm font-mono">{deletingRule?.pattern}</code>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRule(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule}>
              Delete Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
