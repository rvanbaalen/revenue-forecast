import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Building2,
  CreditCard,
  Wallet,
  PiggyBank,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { BankAccount, BankAccountType } from '@/types';
import { useBank } from '@/context/BankContext';
import { formatCurrency } from '@/utils/format';

interface BankAccountCardProps {
  account: BankAccount;
  onSelect?: () => void;
}

const ACCOUNT_TYPE_ICONS = {
  CHECKING: Wallet,
  SAVINGS: PiggyBank,
  CREDITCARD: CreditCard,
  CREDITLINE: CreditCard,
  MONEYMRKT: TrendingUp,
};

const ACCOUNT_TYPE_OPTIONS: { value: BankAccountType; label: string; description: string }[] = [
  { value: 'CHECKING', label: 'Checking', description: 'Standard checking account' },
  { value: 'SAVINGS', label: 'Savings', description: 'Savings account' },
  { value: 'CREDITCARD', label: 'Credit Card', description: 'Credit card account' },
  { value: 'CREDITLINE', label: 'Credit Line', description: 'Line of credit' },
  { value: 'MONEYMRKT', label: 'Money Market', description: 'Money market account' },
];

export function BankAccountCard({ account, onSelect }: BankAccountCardProps) {
  const { updateAccount, deleteAccount, getAccountStats } = useBank();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editName, setEditName] = useState(account.name);
  const [editAccountType, setEditAccountType] = useState<BankAccountType>(account.accountType);
  const [editCreditLimit, setEditCreditLimit] = useState<string>(account.creditLimit?.toString() || '');
  const [showMenu, setShowMenu] = useState(false);

  const stats = getAccountStats(account.id);
  const Icon = ACCOUNT_TYPE_ICONS[account.accountType] || Building2;

  // For credit cards: current balance is total debits minus total credits (positive = owe money)
  const isCreditCard = account.accountType === 'CREDITCARD' || account.accountType === 'CREDITLINE';
  const currentBalance = isCreditCard ? stats.totalDebits - stats.totalCredits : stats.totalCredits - stats.totalDebits;
  const availableCredit = account.creditLimit ? account.creditLimit - currentBalance : null;
  const utilizationPercent = account.creditLimit && account.creditLimit > 0
    ? (currentBalance / account.creditLimit) * 100
    : null;

  const handleSave = async () => {
    const creditLimit = editCreditLimit ? parseFloat(editCreditLimit) : undefined;
    await updateAccount({
      ...account,
      name: editName,
      accountType: editAccountType,
      creditLimit: (editAccountType === 'CREDITCARD' || editAccountType === 'CREDITLINE') ? creditLimit : undefined,
    });
    setIsEditing(false);
  };

  const openEditDialog = () => {
    setEditName(account.name);
    setEditAccountType(account.accountType);
    setEditCreditLimit(account.creditLimit?.toString() || '');
    setIsEditing(true);
  };

  const handleDelete = async () => {
    await deleteAccount(account.id);
    setIsDeleting(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Card
        className={cn(
          "group relative transition-all",
          onSelect && "cursor-pointer hover:border-primary"
        )}
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{account.name}</CardTitle>
                <p className="text-sm text-muted-foreground font-mono">
                  {account.accountType} {account.accountId}
                </p>
              </div>
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      openEditDialog();
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2 text-destructive"
                    onClick={() => {
                      setShowMenu(false);
                      setIsDeleting(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isCreditCard && account.creditLimit ? (
            // Credit Card View
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                  <p className={cn(
                    "text-lg font-semibold",
                    currentBalance > 0 ? "variance-negative" : "variance-positive"
                  )}>
                    {formatCurrency(currentBalance, false)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Available Credit</p>
                  <p className={cn(
                    "text-lg font-semibold",
                    availableCredit && availableCredit >= 0 ? "variance-positive" : "variance-negative"
                  )}>
                    {formatCurrency(availableCredit || 0, false)}
                  </p>
                </div>
              </div>

              {/* Credit utilization bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Credit Utilization</span>
                  <span className={cn(
                    "font-medium",
                    utilizationPercent && utilizationPercent > 80 ? "text-destructive" :
                    utilizationPercent && utilizationPercent > 50 ? "text-warning" : "variance-positive"
                  )}>
                    {utilizationPercent?.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      utilizationPercent && utilizationPercent > 80 ? "bg-destructive" :
                      utilizationPercent && utilizationPercent > 50 ? "bg-warning" : "bg-success"
                    )}
                    style={{ width: `${Math.min(utilizationPercent || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(account.creditLimit)} limit
                </p>
              </div>
            </div>
          ) : (
            // Regular Account View
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Credits</p>
                <p className="text-lg font-semibold variance-positive">
                  +{formatCurrency(stats.totalCredits, false)}
                </p>
                <p className="text-xs text-muted-foreground">{stats.creditCount} transactions</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Debits</p>
                <p className="text-lg font-semibold variance-negative">
                  -{formatCurrency(stats.totalDebits, false)}
                </p>
                <p className="text-xs text-muted-foreground">{stats.debitCount} transactions</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm mt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last import:</span>
              <span className="text-foreground">{formatDate(account.lastImportDate)}</span>
            </div>
            <Badge variant="secondary">{account.currency}</Badge>
          </div>

          {stats.unmappedCount > 0 && (
            <div className="mt-3 p-2 bg-warning-muted border border-border rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-sm text-warning">
                {stats.unmappedCount} unmapped transaction{stats.unmappedCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update the account name and type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Account name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={editAccountType}
                onValueChange={(v) => setEditAccountType(v as BankAccountType)}
              >
                <SelectTrigger id="accountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ACCOUNT_TYPE_OPTIONS.find(o => o.value === editAccountType)?.description}
              </p>
            </div>

            {(editAccountType === 'CREDITCARD' || editAccountType === 'CREDITLINE') && (
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Credit Limit</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={editCreditLimit}
                  onChange={(e) => setEditCreditLimit(e.target.value)}
                  placeholder="e.g., 5000"
                />
                <p className="text-xs text-muted-foreground">
                  Your total credit limit for this card. Used to calculate available credit and utilization.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{account.name}"? This will also delete all {stats.totalTransactions} imported transactions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
