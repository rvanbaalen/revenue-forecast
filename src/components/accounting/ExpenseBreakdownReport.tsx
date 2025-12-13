import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingDown } from 'lucide-react';
import { useAccountingContext } from '@/context/AccountingContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';
import type { Month } from '@/types';
import { MONTH_LABELS } from '@/types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';

interface ExpenseBreakdownReportProps {
  month?: Month;
}

export function ExpenseBreakdownReport({ month }: ExpenseBreakdownReportProps) {
  const { getProfitAndLoss, getAccountById } = useAccountingContext();
  const { config } = useRevenue();

  const pnl = useMemo(() => {
    return getProfitAndLoss(config.year, month);
  }, [config.year, month, getProfitAndLoss]);

  // Group expenses by parent category
  const expenseBreakdown = useMemo(() => {
    const categories: {
      id: string;
      name: string;
      total: number;
      percentage: number;
      accounts: { name: string; amount: number; percentage: number }[];
    }[] = [];

    // Group by parent category
    const categoryMap = new Map<string, { name: string; accounts: Map<string, number> }>();

    pnl.expensesByAccount.forEach((amount, accountId) => {
      if (amount === 0) return;

      const account = getAccountById(accountId);
      if (!account) return;

      // Find the top-level expense category (under 5000)
      let parent = account.parentId ? getAccountById(account.parentId) : null;
      while (parent && parent.parentId && parent.parentId !== '5000') {
        parent = getAccountById(parent.parentId);
      }

      const categoryId = parent?.id || accountId;
      const categoryName = parent?.name || account.name;

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, { name: categoryName, accounts: new Map() });
      }

      categoryMap.get(categoryId)!.accounts.set(accountId, amount);
    });

    // Convert to array and calculate percentages
    categoryMap.forEach((category, categoryId) => {
      const total = Array.from(category.accounts.values()).reduce((sum, amt) => sum + amt, 0);
      const percentage = pnl.expenses > 0 ? (total / pnl.expenses) * 100 : 0;

      const accounts = Array.from(category.accounts.entries()).map(([accId, amount]) => {
        const account = getAccountById(accId);
        return {
          name: account?.name || 'Unknown',
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        };
      }).sort((a, b) => b.amount - a.amount);

      categories.push({
        id: categoryId,
        name: category.name,
        total,
        percentage,
        accounts,
      });
    });

    return categories.sort((a, b) => b.total - a.total);
  }, [pnl, getAccountById]);

  const periodLabel = month
    ? `${MONTH_LABELS[month]} ${config.year}`
    : `Year ${config.year}`;

  // Colors for the bar chart - using shadcn chart colors
  const colors = [
    'bg-chart-1',
    'bg-chart-2',
    'bg-chart-3',
    'bg-chart-4',
    'bg-chart-5',
    'bg-primary',
    'bg-muted-foreground',
    'bg-accent-foreground',
  ];

  // Chart colors for Recharts
  const chartColors = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
    'var(--color-primary)',
    'var(--color-muted-foreground)',
    'var(--color-accent-foreground)',
  ];

  // Chart config
  const chartConfig = {
    total: {
      label: 'Amount',
    },
  } satisfies ChartConfig;

  // Format currency for axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          Expense Breakdown — {periodLabel}
        </h3>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(pnl.expenses, false)}
          </p>
        </div>
      </div>

      {expenseBreakdown.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingDown className="size-12 mx-auto mb-4 opacity-50" />
          <p>No expenses recorded for this period.</p>
          <p className="text-sm">Categorize bank transactions to see expense breakdown.</p>
        </div>
      ) : (
        <>
          {/* Horizontal bar chart */}
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <BarChart
              accessibilityLayer
              data={expenseBreakdown}
              layout="vertical"
              margin={{ left: 0, right: 20 }}
            >
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={120}
                tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.payload.name}</span>
                        <span className="font-mono">{formatCurrency(value as number, false)}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.payload.percentage.toFixed(1)}% of total
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {expenseBreakdown.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>

          {/* Legend and details */}
          <div className="flex flex-col gap-4">
            {expenseBreakdown.map((category, idx) => (
              <div key={category.id} className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted">
                  <div className={cn("w-4 h-4 rounded", colors[idx % colors.length])} />
                  <span className="font-medium text-foreground flex-1">{category.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {category.percentage.toFixed(1)}%
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {formatCurrency(category.total, false)}
                  </span>
                </div>

                {category.accounts.length > 1 && (
                  <div className="divide-y divide-border">
                    {category.accounts.map((account, accountIdx) => (
                      <div key={accountIdx} className="flex items-center justify-between px-4 py-2 pl-11">
                        <span className="text-sm text-muted-foreground">{account.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">
                            {account.percentage.toFixed(1)}% of category
                          </span>
                          <span className="font-mono text-sm text-foreground">
                            {formatCurrency(account.amount, false)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {expenseBreakdown.map((category, idx) => (
                  <tr key={category.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded", colors[idx % colors.length])} />
                        <span className="text-foreground">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-foreground">
                      {formatCurrency(category.total, false)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted font-medium">
                  <td className="px-4 py-2 text-foreground">Total</td>
                  <td className="px-4 py-2 text-right font-mono text-foreground">
                    {formatCurrency(pnl.expenses, false)}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
