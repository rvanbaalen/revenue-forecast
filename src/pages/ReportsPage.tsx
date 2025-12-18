import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatPercentage } from '../utils/decimal';
import { useContextCurrency } from '@/hooks/useContextCurrency';
import { getCurrencySymbol } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from '../types';

export function ReportsPage() {
  const { getBalanceSheet, getProfitLoss, getCashFlow, getCategorySpending } =
    useApp();

  const { symbol: currencySymbol } = useContextCurrency();

  // Date range state
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [period, setPeriod] = useState<'year' | 'q1' | 'q2' | 'q3' | 'q4'>('year');

  // Calculate date range
  const dateRange: DateRange = useMemo(() => {
    const y = parseInt(year);
    switch (period) {
      case 'q1':
        return { start: `${y}-01-01`, end: `${y}-03-31` };
      case 'q2':
        return { start: `${y}-04-01`, end: `${y}-06-30` };
      case 'q3':
        return { start: `${y}-07-01`, end: `${y}-09-30` };
      case 'q4':
        return { start: `${y}-10-01`, end: `${y}-12-31` };
      default:
        return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
  }, [year, period]);

  // Get reports
  const balanceSheet = getBalanceSheet(dateRange.end);
  const profitLoss = getProfitLoss(dateRange);
  const cashFlow = getCashFlow(dateRange);
  const categorySpending = getCategorySpending(dateRange);

  // Generate year options (last 5 years)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push((currentYear - i).toString());
    }
    return years;
  }, [currentYear]);

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Financial reports and analysis
          </p>
        </div>

        {/* Date range selector */}
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">Full Year</SelectItem>
              <SelectItem value="q1">Q1 (Jan-Mar)</SelectItem>
              <SelectItem value="q2">Q2 (Apr-Jun)</SelectItem>
              <SelectItem value="q3">Q3 (Jul-Sep)</SelectItem>
              <SelectItem value="q4">Q4 (Oct-Dec)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="profit-loss" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profit-loss">P&L</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
        </TabsList>

        {/* Profit & Loss */}
        <TabsContent value="profit-loss" className="flex flex-col gap-6 mt-6">
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
                  <TableRow key={item.subcategory}>
                    <TableCell>{item.subcategory || 'Uncategorized'}</TableCell>
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
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="flex flex-col gap-6 mt-6">
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
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cash-flow" className="flex flex-col gap-6 mt-6">
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
        </TabsContent>

        {/* Category Spending */}
        <TabsContent value="spending" className="flex flex-col gap-6 mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
