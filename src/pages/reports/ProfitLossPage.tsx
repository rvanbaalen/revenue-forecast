import { useNavigate } from '@tanstack/react-router';
import { useFinancialData } from '../../stores';
import { formatCurrency } from '../../utils/decimal';
import { useContextCurrency } from '@/hooks/useContextCurrency';
import { useReportDateRange } from '@/hooks/useReportDateRange';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function ProfitLossPage() {
  const { getProfitLoss } = useFinancialData();
  const navigate = useNavigate();
  const { symbol: currencySymbol } = useContextCurrency();
  const { dateRange } = useReportDateRange();

  const profitLoss = getProfitLoss(dateRange);

  // Navigate to transactions page with filters
  const viewExpenseTransactions = (subcategory: string) => {
    navigate({
      to: '/transactions',
      search: {
        category: 'expense',
        subcategory: subcategory,
        startDate: dateRange.start,
        endDate: dateRange.end,
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold variance-positive tabular-nums">
            {formatCurrency(profitLoss.revenue.total, currencySymbol, 0)}
          </p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold variance-negative tabular-nums">
            {formatCurrency(profitLoss.expenses.total, currencySymbol, 0)}
          </p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            Tax ({parseFloat(profitLoss.tax.rate) * 100}% on local)
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatCurrency(profitLoss.tax.amount, currencySymbol, 0)}
          </p>
        </div>
        <div className="p-4 bg-primary text-primary-foreground rounded-lg">
          <p className="text-sm text-primary-foreground/70">Net Profit</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(profitLoss.netProfit, currencySymbol, 0)}
          </p>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted border-b border-border">
          <h3 className="font-medium">Revenue</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Local income */}
            {profitLoss.revenue.local.items.map((item) => (
              <TableRow key={`local-${item.subcategory}`}>
                <TableCell>{item.subcategory || 'Uncategorized'}</TableCell>
                <TableCell>
                  <Badge variant="default">Local (taxed)</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums variance-positive">
                  {formatCurrency(item.amount, currencySymbol)}
                </TableCell>
              </TableRow>
            ))}
            {/* Foreign income */}
            {profitLoss.revenue.foreign.items.map((item) => (
              <TableRow key={`foreign-${item.subcategory}`}>
                <TableCell>{item.subcategory || 'Uncategorized'}</TableCell>
                <TableCell>
                  <Badge variant="secondary">Foreign (exempt)</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums variance-positive">
                  {formatCurrency(item.amount, currencySymbol)}
                </TableCell>
              </TableRow>
            ))}
            {/* Totals */}
            <TableRow className="bg-muted/50 font-medium">
              <TableCell>Local Income Subtotal</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(profitLoss.revenue.local.total, currencySymbol)}
              </TableCell>
            </TableRow>
            <TableRow className="bg-muted/50 font-medium">
              <TableCell>Foreign Income Subtotal</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(profitLoss.revenue.foreign.total, currencySymbol)}
              </TableCell>
            </TableRow>
            <TableRow className="bg-muted font-bold">
              <TableCell>Total Revenue</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right tabular-nums variance-positive">
                {formatCurrency(profitLoss.revenue.total, currencySymbol)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Expenses breakdown */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted border-b border-border">
          <h3 className="font-medium">Expenses</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profitLoss.expenses.items.map((item) => (
              <TableRow
                key={item.subcategory || 'uncategorized'}
                className="cursor-pointer hover:bg-muted/50 group"
                onClick={() => viewExpenseTransactions(item.subcategory)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.subcategory || 'Uncategorized'}
                    <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums variance-negative">
                  {formatCurrency(item.amount, currencySymbol)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted font-bold">
              <TableCell>Total Expenses</TableCell>
              <TableCell className="text-right tabular-nums variance-negative">
                {formatCurrency(profitLoss.expenses.total, currencySymbol)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Gross Profit</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(profitLoss.grossProfit, currencySymbol)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                Tax ({parseFloat(profitLoss.tax.rate) * 100}% on{' '}
                {formatCurrency(profitLoss.revenue.local.total, currencySymbol, 0)} local
                income)
              </TableCell>
              <TableCell className="text-right tabular-nums variance-negative">
                -{formatCurrency(profitLoss.tax.amount, currencySymbol)}
              </TableCell>
            </TableRow>
            <TableRow className="bg-primary/10 font-bold">
              <TableCell>Net Profit</TableCell>
              <TableCell
                className={cn(
                  'text-right tabular-nums',
                  parseFloat(profitLoss.netProfit) >= 0
                    ? 'variance-positive'
                    : 'variance-negative'
                )}
              >
                {formatCurrency(profitLoss.netProfit, currencySymbol)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
