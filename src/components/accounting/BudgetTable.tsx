import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import type { Month } from '@/types';
import { MONTHS, MONTH_LABELS } from '@/types';
import { useAccountingContext } from '@/context/AccountingContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';

export function BudgetTable() {
  const { getExpenseAccounts, updateAccountBudget, getActualExpensesByMonth } = useAccountingContext();
  const { config } = useRevenue();

  const [editingCell, setEditingCell] = useState<{ accountId: string; month: Month } | null>(null);
  const [editValue, setEditValue] = useState('');

  const expenseAccounts = getExpenseAccounts();

  // Calculate actual expenses for each month
  const actualsByMonth = useMemo(() => {
    const result: Map<Month, Map<string, number>> = new Map();
    for (const month of MONTHS) {
      result.set(month, getActualExpensesByMonth(config.year, month));
    }
    return result;
  }, [config.year, getActualExpensesByMonth]);

  // Calculate totals
  const totals = useMemo(() => {
    const budgetTotals: Record<Month, number> = {} as Record<Month, number>;
    const actualTotals: Record<Month, number> = {} as Record<Month, number>;

    for (const month of MONTHS) {
      budgetTotals[month] = 0;
      actualTotals[month] = 0;

      for (const account of expenseAccounts) {
        budgetTotals[month] += account.budget?.expectedMonthly[month] || 0;
        actualTotals[month] += actualsByMonth.get(month)?.get(account.id) || 0;
      }
    }

    return { budgetTotals, actualTotals };
  }, [expenseAccounts, actualsByMonth]);

  const handleStartEdit = (accountId: string, month: Month, currentValue: number) => {
    setEditingCell({ accountId, month });
    setEditValue(currentValue > 0 ? currentValue.toString() : '');
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    const value = parseFloat(editValue) || 0;
    await updateAccountBudget(editingCell.accountId, editingCell.month, value);
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getVarianceStatus = (budget: number, actual: number): 'good' | 'warning' | 'over' => {
    if (budget === 0) return 'good';
    const variance = actual - budget;
    const percentOver = (variance / budget) * 100;

    if (variance <= 0) return 'good';
    if (percentOver <= 10) return 'warning';
    return 'over';
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Set monthly expense budgets for each category. Actuals are calculated from categorized transactions.
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground sticky left-0 bg-muted min-w-[200px]">
                Category
              </th>
              {MONTHS.map(month => (
                <th key={month} className="px-3 py-3 text-center font-medium text-muted-foreground min-w-[100px]">
                  {MONTH_LABELS[month]}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-muted-foreground min-w-[100px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {expenseAccounts.map(account => {
              const yearTotal = {
                budget: MONTHS.reduce((sum, m) => sum + (account.budget?.expectedMonthly[m] || 0), 0),
                actual: MONTHS.reduce((sum, m) => sum + (actualsByMonth.get(m)?.get(account.id) || 0), 0),
              };

              return (
                <tr key={account.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium text-foreground sticky left-0 bg-background">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <span>{account.name}</span>
                    </div>
                  </td>
                  {MONTHS.map(month => {
                    const budget = account.budget?.expectedMonthly[month] || 0;
                    const actual = actualsByMonth.get(month)?.get(account.id) || 0;
                    const isEditing = editingCell?.accountId === account.id && editingCell?.month === month;
                    const status = getVarianceStatus(budget, actual);

                    return (
                      <td key={month} className="px-1 py-1 text-center">
                        <div className="space-y-1">
                          {/* Budget input */}
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={handleSaveEdit}
                              className="h-7 w-full text-center text-xs"
                              autoFocus
                            />
                          ) : (
                            <div
                              onClick={() => handleStartEdit(account.id, month, budget)}
                              className={cn(
                                "cursor-pointer rounded px-2 py-1 text-xs font-mono",
                                "hover:bg-accent",
                                budget > 0 ? "text-foreground" : "text-muted-foreground"
                              )}
                            >
                              {budget > 0 ? formatCurrency(budget, false) : '—'}
                            </div>
                          )}

                          {/* Actual value */}
                          {actual > 0 && (
                            <div className={cn(
                              "text-xs font-mono",
                              status === 'good' && "text-green-600 dark:text-green-400",
                              status === 'warning' && "text-yellow-600 dark:text-yellow-400",
                              status === 'over' && "text-red-600 dark:text-red-400"
                            )}>
                              {formatCurrency(actual, false)}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right">
                    <div className="space-y-1">
                      <div className="font-mono text-sm text-foreground">
                        {formatCurrency(yearTotal.budget, false)}
                      </div>
                      {yearTotal.actual > 0 && (
                        <div className={cn(
                          "text-xs font-mono",
                          yearTotal.actual <= yearTotal.budget ? "variance-positive" : "variance-negative"
                        )}>
                          {formatCurrency(yearTotal.actual, false)}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted font-medium">
              <td className="px-4 py-3 text-foreground sticky left-0 bg-muted">
                Total
              </td>
              {MONTHS.map(month => {
                const budget = totals.budgetTotals[month];
                const actual = totals.actualTotals[month];
                const status = getVarianceStatus(budget, actual);

                return (
                  <td key={month} className="px-3 py-3 text-center">
                    <div className="space-y-1">
                      <div className="font-mono text-sm">
                        {formatCurrency(budget, false)}
                      </div>
                      {actual > 0 && (
                        <div className={cn(
                          "text-xs font-mono",
                          status === 'good' && "text-green-600 dark:text-green-400",
                          status === 'warning' && "text-yellow-600 dark:text-yellow-400",
                          status === 'over' && "text-red-600 dark:text-red-400"
                        )}>
                          {formatCurrency(actual, false)}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right">
                <div className="space-y-1">
                  <div className="font-mono text-sm">
                    {formatCurrency(
                      Object.values(totals.budgetTotals).reduce((a, b) => a + b, 0),
                      false
                    )}
                  </div>
                  <div className={cn(
                    "text-xs font-mono",
                    Object.values(totals.actualTotals).reduce((a, b) => a + b, 0) <=
                    Object.values(totals.budgetTotals).reduce((a, b) => a + b, 0)
                      ? "variance-positive"
                      : "variance-negative"
                  )}>
                    {formatCurrency(
                      Object.values(totals.actualTotals).reduce((a, b) => a + b, 0),
                      false
                    )}
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Under budget</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span>Near budget (within 10%)</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span>Over budget</span>
        </div>
      </div>
    </div>
  );
}
