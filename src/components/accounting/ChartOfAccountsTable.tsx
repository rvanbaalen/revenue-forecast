import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Search,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Scale,
} from 'lucide-react';
import type { ChartAccount, AccountType } from '@/types';
import { useAccountingContext } from '@/context/AccountingContext';
import { formatCurrency } from '@/utils/format';

interface ChartOfAccountsTableProps {
  onEditAccount: (account: ChartAccount) => void;
  onAddAccount: (parentId?: string) => void;
}

const TYPE_ICONS: Record<AccountType, typeof Wallet> = {
  ASSET: Wallet,
  LIABILITY: CreditCard,
  EQUITY: Scale,
  REVENUE: TrendingUp,
  EXPENSE: TrendingDown,
};

const TYPE_COLORS: Record<AccountType, string> = {
  ASSET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  LIABILITY: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  EQUITY: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  REVENUE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  EXPENSE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

export function ChartOfAccountsTable({ onEditAccount, onAddAccount }: ChartOfAccountsTableProps) {
  const { chartAccounts, deleteChartAccount, calculateAccountBalance } = useAccountingContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set(['1000', '2000', '3000', '4000', '5000']));

  // Build account hierarchy
  const accountHierarchy = useMemo(() => {
    const filtered = chartAccounts.filter(a => a.isActive);

    // Apply search filter
    const searchFiltered = searchQuery
      ? filtered.filter(a =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.code.includes(searchQuery)
        )
      : filtered;

    // Apply type filter
    const typeFiltered = typeFilter === 'all'
      ? searchFiltered
      : searchFiltered.filter(a => a.type === typeFilter);

    // Sort by code
    return typeFiltered.sort((a, b) => a.code.localeCompare(b.code));
  }, [chartAccounts, searchQuery, typeFilter]);

  // Get children of an account
  const getChildren = (parentId: string): ChartAccount[] => {
    return accountHierarchy.filter(a => a.parentId === parentId);
  };

  // Check if account has children
  const hasChildren = (accountId: string): boolean => {
    return accountHierarchy.some(a => a.parentId === accountId);
  };

  // Toggle expansion
  const toggleExpand = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  // Handle delete
  const handleDelete = async (account: ChartAccount) => {
    if (account.isSystem) {
      alert('Cannot delete system accounts');
      return;
    }

    if (hasChildren(account.id)) {
      alert('Cannot delete account with child accounts');
      return;
    }

    if (confirm(`Delete account "${account.name}"?`)) {
      await deleteChartAccount(account.id);
    }
  };

  // Render account row with indentation
  const renderAccountRow = (account: ChartAccount, depth: number = 0) => {
    const Icon = TYPE_ICONS[account.type];
    const children = getChildren(account.id);
    const isExpanded = expandedAccounts.has(account.id);
    const balance = calculateAccountBalance(account.id);

    return (
      <div key={account.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-4 hover:bg-muted/50 border-b border-border",
            depth > 0 && "bg-muted/20"
          )}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          {/* Expand/collapse toggle */}
          <button
            onClick={() => toggleExpand(account.id)}
            className={cn(
              "p-1 rounded hover:bg-muted",
              !hasChildren(account.id) && "invisible"
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Code */}
          <span className="w-16 font-mono text-sm text-muted-foreground">
            {account.code}
          </span>

          {/* Name */}
          <div className="flex-1 flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{account.name}</span>
            {account.isSystem && (
              <Badge variant="secondary" className="text-xs">System</Badge>
            )}
            {account.bankAccountId && (
              <Badge variant="outline" className="text-xs">Linked</Badge>
            )}
          </div>

          {/* Type badge */}
          <Badge className={cn("text-xs", TYPE_COLORS[account.type])}>
            {account.type}
          </Badge>

          {/* Balance */}
          <span className={cn(
            "w-28 text-right font-mono text-sm",
            balance >= 0 ? "text-foreground" : "variance-negative"
          )}>
            {formatCurrency(balance, false)}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1 w-24 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onAddAccount(account.id)}
              title="Add sub-account"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEditAccount(account)}
              title="Edit account"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {!account.isSystem && !hasChildren(account.id) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleDelete(account)}
                title="Delete account"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Render children if expanded */}
        {isExpanded && children.map(child => renderAccountRow(child, depth + 1))}
      </div>
    );
  };

  // Get root accounts (no parent)
  const rootAccounts = accountHierarchy.filter(a => !a.parentId);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AccountType | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ASSET">Assets</SelectItem>
            <SelectItem value="LIABILITY">Liabilities</SelectItem>
            <SelectItem value="EQUITY">Equity</SelectItem>
            <SelectItem value="REVENUE">Revenue</SelectItem>
            <SelectItem value="EXPENSE">Expenses</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => onAddAccount()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Table header */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 py-2 px-4 bg-muted font-medium text-sm text-muted-foreground border-b border-border">
          <span className="w-6" /> {/* Expand toggle space */}
          <span className="w-16">Code</span>
          <span className="flex-1">Name</span>
          <span className="w-24 text-center">Type</span>
          <span className="w-28 text-right">Balance</span>
          <span className="w-24 text-right">Actions</span>
        </div>

        {/* Account rows */}
        <div>
          {rootAccounts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No accounts found
            </div>
          ) : (
            rootAccounts.map(account => renderAccountRow(account))
          )}
        </div>
      </div>
    </div>
  );
}
