/**
 * TransactionTable - Transaction list table
 *
 * Displays transactions in a responsive table with
 * sorting by date and click-to-edit functionality.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../utils/decimal';
import { getCurrencySymbol } from '../../utils/currency';
import { isFiscalYearDifferent, getFiscalYear } from '../../utils/fiscal-year';
import type { Transaction, BankAccount } from '../../types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './constants';

interface TransactionTableProps {
  transactions: Transaction[];
  accounts: BankAccount[];
  onEditTransaction: (transaction: Transaction) => void;
}

export function TransactionTable({
  transactions,
  accounts,
  onEditTransaction,
}: TransactionTableProps) {
  // Create account lookup map
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="hidden sm:table-cell">Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden md:table-cell">Subcategory</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const account = accountMap.get(tx.accountId);
              const isPositive = parseFloat(tx.amount) >= 0;

              return (
                <TableRow
                  key={tx.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onEditTransaction(tx)}
                >
                  <TableCell className="text-muted-foreground tabular-nums">
                    <div className="flex items-center gap-1.5">
                      {new Date(tx.date).toLocaleDateString()}
                      {isFiscalYearDifferent(tx) && (
                        <span
                          className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-info/10 text-info"
                          title={`Fiscal year override: Reports as ${getFiscalYear(tx)}`}
                        >
                          <Calendar className="size-3" />
                          FY{getFiscalYear(tx)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium truncate">{tx.name}</p>
                      {tx.memo && (
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.memo}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {account?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('gap-1', CATEGORY_COLORS[tx.category])}>
                      {CATEGORY_ICONS[tx.category]}
                      {tx.category}
                      {tx.category === 'income' && tx.incomeType === 'foreign' && (
                        <span className="text-xs opacity-70">(intl)</span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {tx.subcategory || '-'}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums font-medium',
                      isPositive ? 'variance-positive' : 'variance-negative'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {formatCurrency(
                      tx.amount,
                      getCurrencySymbol(account?.currency || 'USD')
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
