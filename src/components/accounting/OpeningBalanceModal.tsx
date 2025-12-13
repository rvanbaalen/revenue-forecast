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
import type { BankAccount } from '@/types';
import { useBank } from '@/context/BankContext';

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccount: BankAccount | null;
}

export function OpeningBalanceModal({
  isOpen,
  onClose,
  bankAccount,
}: OpeningBalanceModalProps) {
  const { updateAccount } = useBank();

  const [balance, setBalance] = useState('');
  const [date, setDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form
  useEffect(() => {
    if (bankAccount) {
      setBalance(bankAccount.openingBalance?.toString() || '');
      setDate(bankAccount.openingBalanceDate || new Date().toISOString().split('T')[0]);
    }
  }, [bankAccount]);

  const handleSave = async () => {
    if (!bankAccount || !date) return;

    setIsSaving(true);
    try {
      await updateAccount({
        ...bankAccount,
        openingBalance: parseFloat(balance) || 0,
        openingBalanceDate: date,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save opening balance:', error);
      alert('Failed to save opening balance');
    } finally {
      setIsSaving(false);
    }
  };

  if (!bankAccount) return null;

  const isLiability = bankAccount.accountType === 'CREDITCARD' || bankAccount.accountType === 'CREDITLINE';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Opening Balance</DialogTitle>
          <DialogDescription>
            Enter the account balance as of a specific date. This establishes the starting point for balance tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium text-foreground">{bankAccount.name}</p>
            <p className="text-sm text-muted-foreground">
              {bankAccount.accountType} • {bankAccount.accountId}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Balance Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The date this balance was accurate.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="balance">
              {isLiability ? 'Balance Owed' : 'Account Balance'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {bankAccount.currency === 'USD' ? '$' : 'ƒ'}
              </span>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isLiability
                ? 'Enter the amount you owed on this credit card/line.'
                : 'Enter the total balance in this account.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!date || isSaving}>
            {isSaving ? 'Saving...' : 'Save Balance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
