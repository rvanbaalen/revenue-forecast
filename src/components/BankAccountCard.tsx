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
import type { BankAccount } from '@/types';
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

export function BankAccountCard({ account, onSelect }: BankAccountCardProps) {
  const { updateAccount, deleteAccount, getAccountStats } = useBank();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editName, setEditName] = useState(account.name);
  const [showMenu, setShowMenu] = useState(false);

  const stats = getAccountStats(account.id);
  const Icon = ACCOUNT_TYPE_ICONS[account.accountType] || Building2;

  const handleSave = async () => {
    await updateAccount({ ...account, name: editName });
    setIsEditing(false);
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
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Rename
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

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last import:</span>
              <span className="text-foreground">{formatDate(account.lastImportDate)}</span>
            </div>
            <Badge variant="secondary">{account.currency}</Badge>
          </div>

          {stats.unmappedCount > 0 && (
            <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
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
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>
              Give this account a friendly name for easier identification.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Account name"
          />
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
