import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, toDecimal, isZero, subtract } from '../utils/decimal';
import { getCurrencySymbol } from '@/utils/currency';
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
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { BankAccount } from '../types';

interface ReconcileAccountDialogProps {
  account: BankAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReconcileAccountDialog({
  account,
  open,
  onOpenChange,
}: ReconcileAccountDialogProps) {
  const { reconcileAccount, getExpectedBalance, contextTransactions } = useApp();

  const [reconciledDate, setReconciledDate] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expectedBalance, setExpectedBalance] = useState<string | null>(null);

  // Reset form when dialog opens with new account
  useEffect(() => {
    if (open && account) {
      const today = new Date().toISOString().split('T')[0];
      setReconciledDate(today);
      setActualBalance('');
      setNotes('');
      setExpectedBalance(getExpectedBalance(account.id, today));
    }
  }, [open, account, getExpectedBalance]);

  // Update expected balance when date changes
  useEffect(() => {
    if (account && reconciledDate) {
      setExpectedBalance(getExpectedBalance(account.id, reconciledDate));
    }
  }, [account, reconciledDate, getExpectedBalance]);

  const handleSubmit = async () => {
    if (!account || !reconciledDate || !actualBalance) return;

    setIsSubmitting(true);
    try {
      await reconcileAccount(
        account.id,
        reconciledDate,
        actualBalance,
        notes,
        true // create adjustment transaction
      );
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) return null;

  // Calculate discrepancy for display
  const discrepancy = expectedBalance && actualBalance
    ? subtract(actualBalance, expectedBalance).toString()
    : null;
  const hasDiscrepancy = discrepancy && !isZero(discrepancy);
  const discrepancyValue = discrepancy ? toDecimal(discrepancy) : null;
  const isPositiveDiscrepancy = discrepancyValue?.isPositive();

  // Count transactions for this account up to the reconciled date
  const transactionCount = contextTransactions.filter(
    (t) => t.accountId === account.id && t.date.split('T')[0] <= reconciledDate
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reconcile Account</DialogTitle>
          <DialogDescription>
            Enter your actual bank balance to reconcile {account.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Date */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="reconcileDate">Statement Date</Label>
            <Input
              id="reconcileDate"
              type="date"
              value={reconciledDate}
              onChange={(e) => setReconciledDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The date on your bank statement
            </p>
          </div>

          {/* Expected Balance (read-only) */}
          {expectedBalance && (
            <div className="flex flex-col gap-2">
              <Label>Expected Balance</Label>
              <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                <span className="font-mono text-lg">
                  {formatCurrency(expectedBalance, getCurrencySymbol(account.currency))}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({transactionCount} transactions)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Calculated from OFX balance + transactions
              </p>
            </div>
          )}

          {/* Actual Balance */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="actualBalance">Actual Bank Balance</Label>
            <Input
              id="actualBalance"
              type="number"
              step="0.01"
              value={actualBalance}
              onChange={(e) => setActualBalance(e.target.value)}
              placeholder="Enter balance from your bank statement"
            />
          </div>

          {/* Discrepancy Display */}
          {hasDiscrepancy && actualBalance && (
            <div
              className={`flex items-start gap-3 p-3 rounded-lg ${
                isPositiveDiscrepancy
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              <AlertCircle className="size-5 mt-0.5 flex-shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="font-medium">
                  Discrepancy: {formatCurrency(discrepancy, getCurrencySymbol(account.currency))}
                </p>
                <p className="text-sm opacity-80">
                  {isPositiveDiscrepancy
                    ? 'An adjustment will add funds to match your bank balance'
                    : 'An adjustment will reduce funds to match your bank balance'}
                </p>
              </div>
            </div>
          )}

          {/* No Discrepancy */}
          {!hasDiscrepancy && actualBalance && expectedBalance && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
              <p className="font-medium">Balance matches - no adjustment needed</p>
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Reconciled with December statement"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reconciledDate || !actualBalance || isSubmitting}
          >
            {isSubmitting ? 'Reconciling...' : 'Reconcile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
