import { useFinancialData } from '../../stores';
import { formatCurrency } from '../../utils/decimal';
import { useContextCurrency } from '@/hooks/useContextCurrency';
import { useReportDateRange } from '@/hooks/useReportDateRange';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CashFlowPage() {
  const { getCashFlow } = useFinancialData();
  const { symbol: currencySymbol } = useContextCurrency();
  const { dateRange } = useReportDateRange();

  const cashFlow = getCashFlow(dateRange);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Inflows</p>
          <p className="text-2xl font-bold variance-positive tabular-nums">
            {formatCurrency(cashFlow.inflows.total, currencySymbol, 0)}
          </p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Outflows</p>
          <p className="text-2xl font-bold variance-negative tabular-nums">
            {formatCurrency(cashFlow.outflows.total, currencySymbol, 0)}
          </p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Transfers</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatCurrency(cashFlow.transfers.total, currencySymbol, 0)}
          </p>
        </div>
        <div className="p-4 bg-primary text-primary-foreground rounded-lg">
          <p className="text-sm text-primary-foreground/70">Net Cash Flow</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(cashFlow.netCashFlow, currencySymbol, 0)}
          </p>
        </div>
      </div>

      {/* Inflows */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted border-b border-border flex items-center gap-2">
          <TrendingUp className="size-4 variance-positive" />
          <h3 className="font-medium">Inflows</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashFlow.inflows.bySubcategory.map((item) => (
              <TableRow key={item.subcategory}>
                <TableCell>{item.subcategory || 'Uncategorized'}</TableCell>
                <TableCell className="text-right tabular-nums variance-positive">
                  +{formatCurrency(item.amount, currencySymbol)}
                </TableCell>
              </TableRow>
            ))}
            {cashFlow.inflows.bySubcategory.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  No inflows
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-muted font-bold">
              <TableCell>Total Inflows</TableCell>
              <TableCell className="text-right tabular-nums variance-positive">
                +{formatCurrency(cashFlow.inflows.total, currencySymbol)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Outflows */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted border-b border-border flex items-center gap-2">
          <TrendingDown className="size-4 variance-negative" />
          <h3 className="font-medium">Outflows</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashFlow.outflows.bySubcategory.map((item) => (
              <TableRow key={item.subcategory}>
                <TableCell>{item.subcategory || 'Uncategorized'}</TableCell>
                <TableCell className="text-right tabular-nums variance-negative">
                  -{formatCurrency(item.amount, currencySymbol)}
                </TableCell>
              </TableRow>
            ))}
            {cashFlow.outflows.bySubcategory.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  No outflows
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-muted font-bold">
              <TableCell>Total Outflows</TableCell>
              <TableCell className="text-right tabular-nums variance-negative">
                -{formatCurrency(cashFlow.outflows.total, currencySymbol)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="border border-primary/20 bg-primary/5 rounded-lg p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Opening Balance</span>
            <span className="tabular-nums">
              {formatCurrency(cashFlow.openingBalance, currencySymbol)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Net Cash Flow</span>
            <span
              className={cn(
                'tabular-nums',
                parseFloat(cashFlow.netCashFlow) >= 0
                  ? 'variance-positive'
                  : 'variance-negative'
              )}
            >
              {parseFloat(cashFlow.netCashFlow) >= 0 ? '+' : ''}
              {formatCurrency(cashFlow.netCashFlow, currencySymbol)}
            </span>
          </div>
          <div className="border-t border-border pt-2 flex items-center justify-between">
            <span className="font-bold">Closing Balance</span>
            <span className="text-xl font-bold tabular-nums">
              {formatCurrency(cashFlow.closingBalance, currencySymbol)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
