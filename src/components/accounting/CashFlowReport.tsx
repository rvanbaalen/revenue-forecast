import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet } from 'lucide-react';
import { useAccountingContext } from '@/context/AccountingContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';
import type { Month } from '@/types';
import { MONTHS, MONTH_LABELS } from '@/types';

interface CashFlowReportProps {
  month?: Month;
}

export function CashFlowReport({ month }: CashFlowReportProps) {
  const { getCashFlow, getBalanceSheet, getProfitAndLoss } = useAccountingContext();
  const { config } = useRevenue();

  const cashFlow = useMemo(() => {
    return getCashFlow(config.year, month);
  }, [config.year, month, getCashFlow]);

  const balanceSheet = useMemo(() => {
    return getBalanceSheet();
  }, [getBalanceSheet]);

  const pnl = useMemo(() => {
    return getProfitAndLoss(config.year, month);
  }, [config.year, month, getProfitAndLoss]);

  // Calculate runway
  const runway = useMemo(() => {
    const cashPosition = balanceSheet.assets - balanceSheet.liabilities;
    const monthlyBurn = month
      ? pnl.expenses
      : pnl.expenses / 12;
    const monthlyRevenue = month
      ? pnl.revenue
      : pnl.revenue / 12;
    const netMonthlyBurn = monthlyBurn - monthlyRevenue;

    return {
      cashPosition,
      monthlyBurn,
      monthlyRevenue,
      netMonthlyBurn,
      runwayMonths: netMonthlyBurn > 0 ? cashPosition / netMonthlyBurn : Infinity,
      runwayWithoutRevenue: monthlyBurn > 0 ? cashPosition / monthlyBurn : Infinity,
    };
  }, [balanceSheet, pnl, month]);

  const periodLabel = month
    ? `${MONTH_LABELS[month]} ${config.year}`
    : `Year ${config.year}`;

  // Monthly cash flow data for chart
  const monthlyData = useMemo(() => {
    if (month) return null;

    return MONTHS.map(m => {
      const flow = getCashFlow(config.year, m);
      return {
        month: MONTH_LABELS[m],
        inflows: flow.inflows,
        outflows: flow.outflows,
        net: flow.netCashFlow,
      };
    });
  }, [config.year, month, getCashFlow]);

  const maxFlow = monthlyData
    ? Math.max(...monthlyData.map(d => Math.max(d.inflows, d.outflows)), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Inflows</p>
                <p className="text-2xl font-bold variance-positive">
                  {formatCurrency(cashFlow.inflows, false)}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <ArrowDownLeft className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Outflows</p>
                <p className="text-2xl font-bold variance-negative">
                  {formatCurrency(cashFlow.outflows, false)}
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <ArrowUpRight className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          cashFlow.netCashFlow >= 0 ? "border-green-500/50" : "border-red-500/50"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                <p className={cn(
                  "text-2xl font-bold",
                  cashFlow.netCashFlow >= 0 ? "variance-positive" : "variance-negative"
                )}>
                  {formatCurrency(cashFlow.netCashFlow, false)}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                cashFlow.netCashFlow >= 0 ? "bg-green-500/10" : "bg-red-500/10"
              )}>
                <TrendingUp className={cn(
                  "h-5 w-5",
                  cashFlow.netCashFlow >= 0 ? "text-green-500" : "text-red-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Position</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(runway.cashPosition, false)}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart (if showing full year) */}
      {monthlyData && (
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-4">Monthly Cash Flow</h3>
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                {/* Bars */}
                <div className="flex-1 w-full flex flex-col justify-end gap-1">
                  <div
                    className="w-full bg-green-500/80 rounded-t"
                    style={{ height: `${(data.inflows / maxFlow) * 100}%` }}
                    title={`Inflows: ${formatCurrency(data.inflows, false)}`}
                  />
                  <div
                    className="w-full bg-red-500/80 rounded-b"
                    style={{ height: `${(data.outflows / maxFlow) * 100}%` }}
                    title={`Outflows: ${formatCurrency(data.outflows, false)}`}
                  />
                </div>
                {/* Label */}
                <span className="text-xs text-muted-foreground">{data.month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-muted-foreground">Inflows</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-muted-foreground">Outflows</span>
            </div>
          </div>
        </div>
      )}

      {/* Runway Analysis */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Runway Analysis</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Average Monthly Expenses</p>
              <p className="text-xl font-bold variance-negative">
                {formatCurrency(runway.monthlyBurn, false)}/mo
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Average Monthly Revenue</p>
              <p className="text-xl font-bold variance-positive">
                {formatCurrency(runway.monthlyRevenue, false)}/mo
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Runway (at current burn rate)
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {runway.runwayWithoutRevenue === Infinity
                    ? '∞'
                    : `${Math.floor(runway.runwayWithoutRevenue)} months`}
                </p>
                <p className="text-xs text-muted-foreground">
                  If all revenue stopped today
                </p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Runway (net of revenue)
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  runway.netMonthlyBurn <= 0 ? "variance-positive" : "text-foreground"
                )}>
                  {runway.netMonthlyBurn <= 0
                    ? 'Cash positive'
                    : `${Math.floor(runway.runwayMonths)} months`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {runway.netMonthlyBurn <= 0
                    ? 'Revenue exceeds expenses'
                    : 'Net monthly burn: ' + formatCurrency(runway.netMonthlyBurn, false)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Details */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Cash Flow Statement — {periodLabel}
          </h3>
        </div>

        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-foreground">Cash Inflows</td>
              <td className="px-4 py-3 text-right font-mono variance-positive">
                +{formatCurrency(cashFlow.inflows, false)}
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-foreground">Cash Outflows</td>
              <td className="px-4 py-3 text-right font-mono variance-negative">
                -{formatCurrency(cashFlow.outflows, false)}
              </td>
            </tr>
            <tr className={cn(
              "font-bold",
              cashFlow.netCashFlow >= 0
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            )}>
              <td className="px-4 py-3 text-foreground">Net Cash Flow</td>
              <td className={cn(
                "px-4 py-3 text-right font-mono",
                cashFlow.netCashFlow >= 0 ? "variance-positive" : "variance-negative"
              )}>
                {cashFlow.netCashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlow.netCashFlow, false)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
