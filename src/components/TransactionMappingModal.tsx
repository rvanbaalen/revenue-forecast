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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Link2,
  Wand2,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
} from 'lucide-react';
import type { BankTransaction } from '@/types';
import { useBank } from '@/context/BankContext';
import { useRevenue } from '@/context/RevenueContext';
import { useAccountingContext } from '@/context/AccountingContext';
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
  const { mapTransactionToSource, mapTransactionToTransfer, updateTransaction, accounts } = useBank();
  const { sources } = useRevenue();
  const { getExpenseAccounts, getChartAccountForBankAccount, createJournalEntryFromTransaction } = useAccountingContext();

  const [selectedTab, setSelectedTab] = useState<'revenue' | 'expense' | 'transfer' | 'ignore'>('expense');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedExpenseAccountId, setSelectedExpenseAccountId] = useState<string>('');
  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState<string>('');
  const [createRule, setCreateRule] = useState(false);
  const [rulePattern, setRulePattern] = useState('');
  const [matchField, setMatchField] = useState<'name' | 'memo' | 'both'>('name');
  const [isSaving, setIsSaving] = useState(false);

  const expenseAccounts = getExpenseAccounts();

  // Determine default tab based on transaction amount
  useEffect(() => {
    if (transaction && isOpen) {
      // Get the bank account type to understand semantics
      const bankAccount = accounts.find(a => a.id === transaction.accountId);
      const isCreditCard = bankAccount?.accountType === 'CREDITCARD' || bankAccount?.accountType === 'CREDITLINE';

      if (isCreditCard) {
        // For credit cards in OFX: positive = charge/purchase (expense), negative = payment (transfer)
        setSelectedTab(transaction.amount > 0 ? 'expense' : 'transfer');
      } else {
        // For checking: positive = income (revenue), negative = spending (expense)
        setSelectedTab(transaction.amount >= 0 ? 'revenue' : 'expense');
      }

      setSelectedSourceId('');
      setSelectedExpenseAccountId('');
      setSelectedTransferAccountId('');
      setCreateRule(false);
      setRulePattern(transaction.name);
      setMatchField('name');
    }
  }, [transaction, isOpen, accounts]);

  const handleClose = useCallback(() => {
    setSelectedSourceId('');
    setSelectedExpenseAccountId('');
    setSelectedTransferAccountId('');
    setCreateRule(false);
    setRulePattern('');
    setMatchField('name');
    setIsSaving(false);
    onClose();
  }, [onClose]);

  const handleSave = async () => {
    if (!transaction) return;

    setIsSaving(true);
    try {
      const bankChartAccount = getChartAccountForBankAccount(transaction.accountId);

      if (selectedTab === 'revenue' && selectedSourceId) {
        await mapTransactionToSource(
          transaction.id,
          parseInt(selectedSourceId),
          createRule ? { pattern: rulePattern, matchField } : undefined
        );
      } else if (selectedTab === 'expense' && selectedExpenseAccountId) {
        // Update transaction with expense category
        await updateTransaction({
          ...transaction,
          category: 'expense',
          chartAccountId: selectedExpenseAccountId,
          revenueSourceId: undefined,
          transferAccountId: undefined,
          isReconciled: true,
        });

        // Create journal entry if we have a linked chart account for the bank
        if (bankChartAccount) {
          try {
            await createJournalEntryFromTransaction(
              {
                id: transaction.id,
                amount: transaction.amount,
                name: transaction.name,
                datePosted: transaction.datePosted,
                accountId: transaction.accountId,
              },
              selectedExpenseAccountId,
              bankChartAccount.id
            );
          } catch (err) {
            console.warn('Could not create journal entry:', err);
          }
        }
      } else if (selectedTab === 'transfer' && selectedTransferAccountId) {
        await mapTransactionToTransfer(
          transaction.id,
          parseInt(selectedTransferAccountId),
          createRule ? { pattern: rulePattern, matchField } : undefined
        );
      } else if (selectedTab === 'ignore') {
        await updateTransaction({
          ...transaction,
          category: 'ignore',
          revenueSourceId: undefined,
          transferAccountId: undefined,
          chartAccountId: undefined,
          isReconciled: true,
        });
      }

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

  const canSave = () => {
    if (selectedTab === 'revenue') return !!selectedSourceId;
    if (selectedTab === 'expense') return !!selectedExpenseAccountId;
    if (selectedTab === 'transfer') return !!selectedTransferAccountId;
    if (selectedTab === 'ignore') return true;
    return false;
  };

  if (!transaction) return null;

  // Determine if this is a credit card transaction
  const bankAccount = accounts.find(a => a.id === transaction.accountId);
  const isCreditCard = bankAccount?.accountType === 'CREDITCARD' || bankAccount?.accountType === 'CREDITLINE';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Categorize Transaction
          </DialogTitle>
          <DialogDescription>
            Assign this transaction to a category for tracking and reporting.
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
            {isCreditCard && (
              <span className="text-xs badge-warning px-2 py-0.5 rounded">
                Credit Card
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Category selection tabs */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="revenue" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="expense" className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Expense
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex items-center gap-1">
              <ArrowLeftRight className="h-3 w-3" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="ignore">Ignore</TabsTrigger>
          </TabsList>

          {/* Revenue tab */}
          <TabsContent value="revenue" className="space-y-4 mt-4">
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
          </TabsContent>

          {/* Expense tab */}
          <TabsContent value="expense" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="expense">Expense Category</Label>
              <Select value={selectedExpenseAccountId} onValueChange={setSelectedExpenseAccountId}>
                <SelectTrigger id="expense">
                  <SelectValue placeholder="Select an expense category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {account.code}
                        </span>
                        <span>{account.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This will create a journal entry recording the expense.
              </p>
            </div>
          </TabsContent>

          {/* Transfer tab */}
          <TabsContent value="transfer" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="transfer">Transfer To/From Account</Label>
              <Select value={selectedTransferAccountId} onValueChange={setSelectedTransferAccountId}>
                <SelectTrigger id="transfer">
                  <SelectValue placeholder="Select the other account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter(a => a.id !== transaction.accountId)
                    .map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Transfers between accounts are not income or expenses.
              </p>
            </div>
          </TabsContent>

          {/* Ignore tab */}
          <TabsContent value="ignore" className="mt-4">
            <p className="text-sm text-muted-foreground">
              This transaction will be excluded from all calculations and reports.
              Use this for duplicate entries or non-business transactions.
            </p>
          </TabsContent>
        </Tabs>

        {/* Create mapping rule option */}
        {(selectedTab === 'revenue' || selectedTab === 'expense') && (
          <div className="space-y-3 pt-2">
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
                  <Select value={matchField} onValueChange={(v) => setMatchField(v as typeof matchField)}>
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
