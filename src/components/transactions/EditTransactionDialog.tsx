/**
 * EditTransactionDialog - Transaction editing dialog
 *
 * Allows editing category, subcategory, income type, and fiscal year.
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Transaction, TransactionCategory, IncomeType, Subcategory } from '../../types';
import { getTransactionDateYear } from '../../utils/fiscal-year';

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  subcategories: Subcategory[];
  onClose: () => void;
  onSave: (transaction: Transaction) => Promise<void>;
}

export function EditTransactionDialog({
  transaction,
  subcategories,
  onClose,
  onSave,
}: EditTransactionDialogProps) {
  const [category, setCategory] = useState<TransactionCategory>('uncategorized');
  const [subcategory, setSubcategory] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('local');
  const [fiscalYear, setFiscalYear] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      setCategory(transaction.category);
      setSubcategory(transaction.subcategory);
      setIncomeType(transaction.incomeType || 'local');
      setFiscalYear(transaction.fiscalYear?.toString() || '');
    }
  }, [transaction]);

  // Get relevant subcategories for current category
  const relevantSubcategories = useMemo(() => {
    if (!category || category === 'uncategorized' || category === 'transfer') {
      return [];
    }
    return subcategories.filter((s) => s.type === category);
  }, [subcategories, category]);

  const handleSave = async () => {
    if (!transaction) return;

    setIsSubmitting(true);
    try {
      const fiscalYearValue = fiscalYear.trim();
      const parsedFiscalYear = fiscalYearValue ? parseInt(fiscalYearValue, 10) : undefined;

      await onSave({
        ...transaction,
        category,
        subcategory,
        incomeType: category === 'income' ? incomeType : undefined,
        fiscalYear: parsedFiscalYear && !isNaN(parsedFiscalYear) ? parsedFiscalYear : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const transactionYear = transaction ? getTransactionDateYear(transaction) : '';

  return (
    <Dialog open={!!transaction} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>{transaction?.name}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as TransactionCategory)}
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

          {category === 'income' && (
            <div className="flex flex-col gap-2">
              <Label>Income Type</Label>
              <Select
                value={incomeType}
                onValueChange={(v) => setIncomeType(v as IncomeType)}
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

          {(category === 'income' || category === 'expense') && (
            <div className="flex flex-col gap-2">
              <Label>Subcategory</Label>
              {relevantSubcategories.length > 0 ? (
                <Select value={subcategory} onValueChange={setSubcategory}>
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
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="Enter subcategory"
                />
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Fiscal Year Override</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder={transactionYear.toString()}
                min={1900}
                max={2100}
                className="w-32"
              />
              {fiscalYear && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiscalYear('')}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to use transaction date year ({transactionYear}). Set to override
              for reporting purposes.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
