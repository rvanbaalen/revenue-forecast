import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ChartAccount, AccountType } from '@/types';
import { useAccountingContext } from '@/context/AccountingContext';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: ChartAccount | null;
  parentId?: string;
}

export function AccountFormModal({
  isOpen,
  onClose,
  account,
  parentId,
}: AccountFormModalProps) {
  const { chartAccounts, addChartAccount, updateChartAccount } = useAccountingContext();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('EXPENSE');
  const [subtype, setSubtype] = useState('');
  const [description, setDescription] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(parentId);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!account;

  // Initialize form when account changes
  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setSubtype(account.subtype || '');
      setDescription(account.description || '');
      setSelectedParentId(account.parentId);
    } else {
      setName('');
      setType(parentId ? chartAccounts.find(a => a.id === parentId)?.type || 'EXPENSE' : 'EXPENSE');
      setSubtype('');
      setDescription('');
      setSelectedParentId(parentId);
    }
  }, [account, parentId, chartAccounts]);

  // Get potential parent accounts
  const parentAccounts = chartAccounts.filter(a => {
    // Must be same type and active
    if (a.type !== type || !a.isActive) return false;
    // Can't be self or descendant of self
    if (account && (a.id === account.id || a.parentId === account.id)) return false;
    return true;
  });

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (isEditing && account) {
        await updateChartAccount({
          ...account,
          name: name.trim(),
          type,
          subtype: subtype.trim() || undefined,
          description: description.trim() || undefined,
          parentId: selectedParentId,
        });
      } else {
        await addChartAccount({
          name: name.trim(),
          type,
          subtype: subtype.trim() || undefined,
          description: description.trim() || undefined,
          parentId: selectedParentId,
          isSystem: false,
          isActive: true,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save account:', error);
      alert('Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Account' : 'Add Account'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the account details below.'
              : 'Create a new account in your chart of accounts.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Software Subscriptions"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Account Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as AccountType);
                setSelectedParentId(undefined);
              }}
              disabled={isEditing && account?.isSystem}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASSET">Asset</SelectItem>
                <SelectItem value="LIABILITY">Liability</SelectItem>
                <SelectItem value="EQUITY">Equity</SelectItem>
                <SelectItem value="REVENUE">Revenue</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="parent">Parent Account</Label>
            <Select
              value={selectedParentId || 'none'}
              onValueChange={(v) => setSelectedParentId(v === 'none' ? undefined : v)}
            >
              <SelectTrigger id="parent">
                <SelectValue placeholder="No parent (root account)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (root account)</SelectItem>
                {parentAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="subtype">Subtype (optional)</Label>
            <Input
              id="subtype"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              placeholder="e.g., Operating, Cash, Professional"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this account..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
