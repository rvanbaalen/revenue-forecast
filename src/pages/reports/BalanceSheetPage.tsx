import { useFinancialData } from '../../stores';
import { formatCurrency } from '../../utils/decimal';
import { useContextCurrency } from '@/hooks/useContextCurrency';
import { useReportDateRange } from '@/hooks/useReportDateRange';
import { getCurrencySymbol } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wallet, Building2, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BalanceSheetPage() {
  const { getBalanceSheet } = useFinancialData();
  const { symbol: currencySymbol } = useContextCurrency();
  const { dateRange } = useReportDateRange();

  const balanceSheet = getBalanceSheet(dateRange.end);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Total Assets</p>
          <p className="text-2xl font-bold variance-positive tabular-nums">
            {formatCurrency(balanceSheet.assets.total, currencySymbol, 0)}
          </p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Total Liabilities</p>
          <p className="text-2xl font-bold variance-negative tabular-nums">
            {formatCurrency(balanceSheet.liabilities.total, currencySymbol, 0)}
          </p>
        </div>
        <div className="p-4 bg-primary text-primary-foreground rounded-lg">
          <p className="text-sm text-primary-foreground/70">Net Worth</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(balanceSheet.netWorth, currencySymbol, 0)}
          </p>
        </div>
      </div>

      {/* Assets */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted border-b border-border flex items-center gap-2">
          <Building2 className="size-4" />
          <h3 className="font-medium">Assets</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balanceSheet.assets.accounts.map((account) => (
              <TableRow key={account.accountId}>
                <TableCell className="font-medium">
                  {account.accountName}
                </TableCell>
                <TableCell>
                  <Badge variant="default">Checking</Badge>
                </TableCell>
                <TableCell>{account.currency}</TableCell>
                <TableCell className="text-right tabular-nums variance-positive">
                  {formatCurrency(account.balance, getCurrencySymbol(account.currency))}
                </TableCell>
              </TableRow>
            ))}
            {balanceSheet.assets.accounts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No assets
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-muted font-bold">
              <TableCell colSpan={3}>Total Assets</TableCell>
              <TableCell className="text-right tabular-nums variance-positive">
                {formatCurrency(balanceSheet.assets.total, currencySymbol)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Liabilities */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted border-b border-border flex items-center gap-2">
          <CreditCard className="size-4" />
          <h3 className="font-medium">Liabilities</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balanceSheet.liabilities.accounts.map((account) => (
              <TableRow key={account.accountId}>
                <TableCell className="font-medium">
                  {account.accountName}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Credit Card</Badge>
                </TableCell>
                <TableCell>{account.currency}</TableCell>
                <TableCell className="text-right tabular-nums variance-negative">
                  {formatCurrency(account.balance, getCurrencySymbol(account.currency))}
                </TableCell>
              </TableRow>
            ))}
            {balanceSheet.liabilities.accounts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No liabilities
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-muted font-bold">
              <TableCell colSpan={3}>Total Liabilities</TableCell>
              <TableCell className="text-right tabular-nums variance-negative">
                {formatCurrency(balanceSheet.liabilities.total, currencySymbol)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Net Worth */}
      <div className="border border-primary/20 bg-primary/5 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-primary" />
            <span className="font-bold text-lg">Net Worth</span>
          </div>
          <span
            className={cn(
              'text-2xl font-bold tabular-nums',
              parseFloat(balanceSheet.netWorth) >= 0
                ? 'variance-positive'
                : 'variance-negative'
            )}
          >
            {formatCurrency(balanceSheet.netWorth, currencySymbol)}
          </span>
        </div>
      </div>
    </div>
  );
}
