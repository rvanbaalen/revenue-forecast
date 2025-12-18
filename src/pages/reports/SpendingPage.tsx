import { useFinancialData } from '../../stores';
import { formatCurrency, formatPercentage } from '../../utils/decimal';
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

export function SpendingPage() {
  const { getCategorySpending } = useFinancialData();
  const { symbol: currencySymbol } = useContextCurrency();
  const { dateRange } = useReportDateRange();

  const categorySpending = getCategorySpending(dateRange);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Total Income</p>
          <p className="text-2xl font-bold variance-positive tabular-nums">
            {formatCurrency(categorySpending.totalIncome, currencySymbol, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {categorySpending.income.length} categories
          </p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold variance-negative tabular-nums">
            {formatCurrency(categorySpending.totalExpenses, currencySymbol, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {categorySpending.expenses.length} categories
          </p>
        </div>
      </div>

      {/* Income breakdown */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted border-b border-border flex items-center gap-2">
          <TrendingUp className="size-4 variance-positive" />
          <h3 className="font-medium">Income by Category</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorySpending.income.map((item) => (
              <TableRow key={item.subcategory}>
                <TableCell className="font-medium">
                  {item.subcategory || 'Uncategorized'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {item.transactionCount}
                </TableCell>
                <TableCell className="text-right tabular-nums variance-positive">
                  {formatCurrency(item.amount, currencySymbol)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatPercentage(item.percentage, 1)}
                </TableCell>
              </TableRow>
            ))}
            {categorySpending.income.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No income data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Expenses breakdown */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted border-b border-border flex items-center gap-2">
          <TrendingDown className="size-4 variance-negative" />
          <h3 className="font-medium">Expenses by Category</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorySpending.expenses.map((item) => (
              <TableRow key={item.subcategory}>
                <TableCell className="font-medium">
                  {item.subcategory || 'Uncategorized'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {item.transactionCount}
                </TableCell>
                <TableCell className="text-right tabular-nums variance-negative">
                  {formatCurrency(item.amount, currencySymbol)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatPercentage(item.percentage, 1)}
                </TableCell>
              </TableRow>
            ))}
            {categorySpending.expenses.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No expense data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
