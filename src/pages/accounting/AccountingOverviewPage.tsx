import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BarChart3,
  Target,
} from 'lucide-react';
import { useAccountingContext } from '@/context/AccountingContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';
import { MONTHS, MONTH_LABELS } from '@/types';

export function AccountingOverviewPage() {
  const { getProfitAndLoss, getBalanceSheet, getExpenseAccounts, getTotalExpenseBudget } = useAccountingContext();
  const { config } = useRevenue();

  // Current month data
  const currentMonth = MONTHS[new Date().getMonth()];
  const monthlyPnl = getProfitAndLoss(config.year, currentMonth);
  const yearlyPnl = getProfitAndLoss(config.year);
  const balanceSheet = getBalanceSheet();

  // Budget vs actual
  const monthlyBudget = getTotalExpenseBudget(currentMonth);
  const budgetVariance = monthlyBudget - monthlyPnl.expenses;
  const budgetPercentUsed = monthlyBudget > 0 ? (monthlyPnl.expenses / monthlyBudget) * 100 : 0;

  // Expense accounts count
  const expenseAccounts = getExpenseAccounts();
  const accountsWithBudget = expenseAccounts.filter(
    a => a.budget?.expectedMonthly && Object.values(a.budget.expectedMonthly).some(v => v > 0)
  ).length;

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{MONTH_LABELS[currentMonth]} Net Income</p>
              {monthlyPnl.netIncome >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className={cn(
              "text-2xl font-bold",
              monthlyPnl.netIncome >= 0 ? "variance-positive" : "variance-negative"
            )}>
              {formatCurrency(monthlyPnl.netIncome, false)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue: {formatCurrency(monthlyPnl.revenue, false)} |
              Expenses: {formatCurrency(monthlyPnl.expenses, false)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">YTD Net Income</p>
              {yearlyPnl.netIncome >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className={cn(
              "text-2xl font-bold",
              yearlyPnl.netIncome >= 0 ? "variance-positive" : "variance-negative"
            )}>
              {formatCurrency(yearlyPnl.netIncome, false)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {config.year} year-to-date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{MONTH_LABELS[currentMonth]} Budget</p>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className={cn(
              "text-2xl font-bold",
              budgetVariance >= 0 ? "variance-positive" : "variance-negative"
            )}>
              {budgetPercentUsed.toFixed(0)}% used
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(monthlyPnl.expenses, false)} of {formatCurrency(monthlyBudget, false)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Cash Position</p>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(balanceSheet.equity, false)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Assets - Liabilities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/accounting/categories">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Expense Categories</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {expenseAccounts.length} categories configured
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Organize your spending into categories
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounting/budget">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Budget Planning</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {accountsWithBudget} categories budgeted
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Set monthly spending targets
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounting/reports">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Financial Reports</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    P&L, Balance Sheet, Cash Flow
                  </p>
                  <p className="text-xs text-muted-foreground">
                    View detailed financial reports
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Monthly Summary */}
      <Card>
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base font-medium">
            {config.year} Monthly Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Month</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Revenue</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Expenses</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Net</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.map(month => {
                  const monthPnl = getProfitAndLoss(config.year, month);
                  const hasData = monthPnl.revenue > 0 || monthPnl.expenses > 0;

                  return (
                    <tr key={month} className="border-t border-border">
                      <td className="px-4 py-2 font-medium text-foreground">
                        {MONTH_LABELS[month]}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {hasData ? (
                          <span className="variance-positive">
                            {formatCurrency(monthPnl.revenue, false)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {hasData ? (
                          <span className="variance-negative">
                            {formatCurrency(monthPnl.expenses, false)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-medium">
                        {hasData ? (
                          <span className={monthPnl.netIncome >= 0 ? "variance-positive" : "variance-negative"}>
                            {formatCurrency(monthPnl.netIncome, false)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted font-medium">
                  <td className="px-4 py-2 text-foreground">Total</td>
                  <td className="px-4 py-2 text-right font-mono variance-positive">
                    {formatCurrency(yearlyPnl.revenue, false)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono variance-negative">
                    {formatCurrency(yearlyPnl.expenses, false)}
                  </td>
                  <td className={cn(
                    "px-4 py-2 text-right font-mono",
                    yearlyPnl.netIncome >= 0 ? "variance-positive" : "variance-negative"
                  )}>
                    {formatCurrency(yearlyPnl.netIncome, false)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
