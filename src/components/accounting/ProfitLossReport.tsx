import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useAccountingContext } from '@/context/AccountingContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';
import type { Month } from '@/types';
import { MONTH_LABELS } from '@/types';

interface ProfitLossReportProps {
  month?: Month;
}

export function ProfitLossReport({ month }: ProfitLossReportProps) {
  const { getProfitAndLoss, getAccountById } = useAccountingContext();
  const { config } = useRevenue();

  const pnl = useMemo(() => {
    return getProfitAndLoss(config.year, month);
  }, [config.year, month, getProfitAndLoss]);

  // Group expenses by parent category
  const expensesByCategory = useMemo(() => {
    const categories = new Map<string, { name: string; accounts: { name: string; amount: number }[] }>();

    pnl.expensesByAccount.forEach((amount, accountId) => {
      if (amount === 0) return;

      const account = getAccountById(accountId);
      if (!account) return;

      const parent = account.parentId ? getAccountById(account.parentId) : null;
      const categoryId = parent?.id || accountId;
      const categoryName = parent?.name || account.name;

      if (!categories.has(categoryId)) {
        categories.set(categoryId, { name: categoryName, accounts: [] });
      }

      categories.get(categoryId)!.accounts.push({
        name: account.name,
        amount,
      });
    });

    return Array.from(categories.values()).sort((a, b) => {
      const totalA = a.accounts.reduce((sum, acc) => sum + acc.amount, 0);
      const totalB = b.accounts.reduce((sum, acc) => sum + acc.amount, 0);
      return totalB - totalA;
    });
  }, [pnl.expensesByAccount, getAccountById]);

  // Group revenue by category
  const revenueByCategory = useMemo(() => {
    const categories: { name: string; amount: number }[] = [];

    pnl.revenueByAccount.forEach((amount, accountId) => {
      if (amount === 0) return;
      const account = getAccountById(accountId);
      if (!account) return;
      categories.push({ name: account.name, amount });
    });

    return categories.sort((a, b) => b.amount - a.amount);
  }, [pnl.revenueByAccount, getAccountById]);

  const periodLabel = month
    ? `${MONTH_LABELS[month]} ${config.year}`
    : `Year ${config.year}`;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold variance-positive">
                  {formatCurrency(pnl.revenue, false)}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold variance-negative">
                  {formatCurrency(pnl.expenses, false)}
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          pnl.netIncome >= 0 ? "border-green-500/50" : "border-red-500/50"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Income</p>
                <p className={cn(
                  "text-2xl font-bold",
                  pnl.netIncome >= 0 ? "variance-positive" : "variance-negative"
                )}>
                  {formatCurrency(pnl.netIncome, false)}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                pnl.netIncome >= 0 ? "bg-green-500/10" : "bg-red-500/10"
              )}>
                <DollarSign className={cn(
                  "h-5 w-5",
                  pnl.netIncome >= 0 ? "text-green-500" : "text-red-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed P&L */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Profit & Loss Statement — {periodLabel}
          </h3>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {/* Revenue Section */}
            <tr className="bg-muted/50 font-medium">
              <td className="px-4 py-3 text-foreground" colSpan={2}>
                REVENUE
              </td>
            </tr>
            {revenueByCategory.length > 0 ? (
              revenueByCategory.map((item, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="px-4 py-2 pl-8 text-foreground">{item.name}</td>
                  <td className="px-4 py-2 text-right font-mono variance-positive">
                    {formatCurrency(item.amount, false)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-border">
                <td className="px-4 py-2 pl-8 text-muted-foreground italic" colSpan={2}>
                  No revenue recorded
                </td>
              </tr>
            )}
            <tr className="border-t border-border bg-green-50 dark:bg-green-900/20 font-medium">
              <td className="px-4 py-2 text-foreground">Total Revenue</td>
              <td className="px-4 py-2 text-right font-mono variance-positive">
                {formatCurrency(pnl.revenue, false)}
              </td>
            </tr>

            {/* Expenses Section */}
            <tr className="bg-muted/50 font-medium border-t-2 border-border">
              <td className="px-4 py-3 text-foreground" colSpan={2}>
                EXPENSES
              </td>
            </tr>
            {expensesByCategory.length > 0 ? (
              expensesByCategory.map((category, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="px-4 py-2" colSpan={2}>
                    <div className="font-medium text-foreground pl-4">{category.name}</div>
                    {category.accounts.map((account, accountIdx) => (
                      <div key={accountIdx} className="flex justify-between py-1 pl-8 text-muted-foreground">
                        <span>{account.name}</span>
                        <span className="font-mono variance-negative">
                          {formatCurrency(account.amount, false)}
                        </span>
                      </div>
                    ))}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-border">
                <td className="px-4 py-2 pl-8 text-muted-foreground italic" colSpan={2}>
                  No expenses recorded
                </td>
              </tr>
            )}
            <tr className="border-t border-border bg-red-50 dark:bg-red-900/20 font-medium">
              <td className="px-4 py-2 text-foreground">Total Expenses</td>
              <td className="px-4 py-2 text-right font-mono variance-negative">
                {formatCurrency(pnl.expenses, false)}
              </td>
            </tr>

            {/* Net Income */}
            <tr className={cn(
              "border-t-2 border-border font-bold",
              pnl.netIncome >= 0
                ? "bg-green-100 dark:bg-green-900/40"
                : "bg-red-100 dark:bg-red-900/40"
            )}>
              <td className="px-4 py-3 text-foreground text-lg">NET INCOME</td>
              <td className={cn(
                "px-4 py-3 text-right font-mono text-lg",
                pnl.netIncome >= 0 ? "variance-positive" : "variance-negative"
              )}>
                {formatCurrency(pnl.netIncome, false)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
