import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/decimal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  EmptyContent,
} from '@/components/ui/empty';
import {
  Building2,
  CreditCard,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BankAccount } from '../types';

export function AccountsPage() {
  const { contextAccounts: accounts, contextTransactions: transactions, updateAccount, deleteAccount } = useApp();
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<BankAccount | null>(null);

  // Count transactions per account
  const transactionCounts = new Map<string, number>();
  for (const tx of transactions) {
    const count = transactionCounts.get(tx.accountId) || 0;
    transactionCounts.set(tx.accountId, count + 1);
  }

  const handleEditSave = async () => {
    if (!editingAccount || !editName.trim()) return;
    await updateAccount({ ...editingAccount, name: editName.trim() });
    setEditingAccount(null);
    setEditName('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteAccount(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const openEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setEditName(account.name);
  };

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your bank accounts and credit cards
          </p>
        </div>
        <Button asChild>
          <Link to="/import">
            <Upload className="size-4" />
            Import OFX
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {accounts.length === 0 ? (
        <Empty className="border border-border rounded-lg py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>No accounts yet</EmptyTitle>
            <EmptyDescription>
              Import an OFX file to add your first bank account
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/import">
                <Upload className="size-4" />
                Import OFX File
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary rounded-lg">
                        {account.type === 'checking' ? (
                          <Building2 className="size-4" />
                        ) : (
                          <CreditCard className="size-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.bankId}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.type === 'checking' ? 'default' : 'secondary'}>
                      {account.type === 'checking' ? 'Checking' : 'Credit Card'}
                    </Badge>
                  </TableCell>
                  <TableCell>{account.currency}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={
                        parseFloat(account.balance) < 0
                          ? 'variance-negative'
                          : ''
                      }
                    >
                      {formatCurrency(account.balance, '$')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {transactionCounts.get(account.id) || 0}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(account)}>
                          <Pencil className="size-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(account)}
                          className="text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>
              Enter a new name for this account
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Account name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAccount(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={!editName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This will
              also delete all {transactionCounts.get(deleteConfirm?.id || '') || 0}{' '}
              transactions associated with this account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
