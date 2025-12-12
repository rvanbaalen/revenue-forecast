import { useState, useEffect, useCallback } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Link2,
  Wand2,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import type { BankTransaction } from '@/types';
import { useBank } from '@/context/BankContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';
import { MONTH_LABELS } from '@/types';

interface TransactionMappingModalProps {
  isOpen: boolean;
  transaction: BankTransaction | null;
  onClose: () => void;
}

export function TransactionMappingModal({
  isOpen,
  transaction,
  onClose,
}: TransactionMappingModalProps) {
  const { mapTransactionToSource } = useBank();
  const { sources } = useRevenue();

  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [createRule, setCreateRule] = useState(false);
  const [rulePattern, setRulePattern] = useState('');
  const [matchField, setMatchField] = useState<'name' | 'memo' | 'both'>('name');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form state
  const resetState = useCallback(() => {
    setSelectedSourceId('');
    setCreateRule(false);
    setRulePattern('');
    setMatchField('name');
    setIsSaving(false);
  }, []);

  // Initialize form when transaction changes
  useEffect(() => {
    if (transaction && isOpen) {
      setSelectedSourceId('');
      setCreateRule(false);
      setRulePattern(transaction.name);
      setMatchField('name');
    }
  }, [transaction, isOpen]);

  // Handle close with state reset
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSave = async () => {
    if (!transaction || !selectedSourceId) return;

    setIsSaving(true);
    try {
      await mapTransactionToSource(
        transaction.id,
        parseInt(selectedSourceId),
        createRule ? { pattern: rulePattern, matchField } : undefined
      );
      handleClose();
    } catch (error) {
      console.error('Failed to map transaction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Map Transaction
          </DialogTitle>
          <DialogDescription>
            Link this transaction to a revenue source for tracking.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction details */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              {transaction.amount >= 0 ? (
                <ArrowDownLeft className="h-5 w-5 variance-positive" />
              ) : (
                <ArrowUpRight className="h-5 w-5 variance-negative" />
              )}
              <div>
                <p className="font-medium text-foreground">{transaction.name}</p>
                {transaction.memo && (
                  <p className="text-sm text-muted-foreground">{transaction.memo}</p>
                )}
              </div>
            </div>
            <p className={cn(
              "font-mono font-semibold text-lg",
              transaction.amount >= 0 ? "variance-positive" : "variance-negative"
            )}>
              {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount, false)}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(transaction.datePosted)}
            </div>
            <span className="text-foreground font-medium">
              {MONTH_LABELS[transaction.month]} {transaction.year}
            </span>
          </div>
        </div>

        <Separator />

        {/* Source selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source">Revenue Source</Label>
            <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
              <SelectTrigger id="source">
                <SelectValue placeholder="Select a revenue source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map(source => (
                  <SelectItem key={source.id} value={source.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{source.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({source.currency})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create mapping rule option */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createRule"
                checked={createRule}
                onChange={(e) => setCreateRule(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="createRule" className="flex items-center gap-2 cursor-pointer">
                <Wand2 className="h-4 w-4 text-muted-foreground" />
                Create mapping rule for similar transactions
              </Label>
            </div>

            {createRule && (
              <div className="pl-6 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="pattern">Match Pattern</Label>
                  <Input
                    id="pattern"
                    value={rulePattern}
                    onChange={(e) => setRulePattern(e.target.value)}
                    placeholder="e.g., ACME Corp"
                  />
                  <p className="text-xs text-muted-foreground">
                    Transactions containing this text will be automatically mapped.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matchField">Match In</Label>
                  <Select value={matchField} onValueChange={(v) => setMatchField(v as any)}>
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
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedSourceId || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
