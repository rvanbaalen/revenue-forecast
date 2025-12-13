import { useMemo } from 'react';
import { useAccountingContext } from '@/context/AccountingContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';
import type { Month } from '@/types';
import { MONTHS, MONTH_LABELS } from '@/types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

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

  // Chart configuration
  const chartConfig = {
    inflows: {
      label: 'Inflows',
      color: 'var(--color-chart-2)',
    },
    outflows: {
      label: 'Outflows',
      color: 'var(--color-chart-1)',
    },
  } satisfies ChartConfig;

  // Format currency for Y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Cash Inflows</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(cashFlow.inflows, false)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Cash Outflows</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(cashFlow.outflows, false)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Net Cash Flow</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(cashFlow.netCashFlow, false)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Cash Position</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(runway.cashPosition, false)}
          </p>
        </div>
      </div>

      {/* Monthly Chart (if showing full year) */}
      {monthlyData && (
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-4">Monthly Cash Flow</h3>
          <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
            <BarChart accessibilityLayer data={monthlyData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
                width={60}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex items-center justify-between gap-8">
                        <span className="text-muted-foreground">{name === 'inflows' ? 'Inflows' : 'Outflows'}</span>
                        <span className="font-mono font-medium">{formatCurrency(value as number, false)}</span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="inflows"
                fill="var(--color-inflows)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="outflows"
                fill="var(--color-outflows)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Runway Analysis */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Runway Analysis</h3>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Average Monthly Expenses</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(runway.monthlyBurn, false)}/mo
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Average Monthly Revenue</p>
              <p className="text-xl font-bold text-foreground">
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
                <p className="text-2xl font-bold text-foreground">
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
              <td className="px-4 py-3 text-right font-mono text-foreground">
                +{formatCurrency(cashFlow.inflows, false)}
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-foreground">Cash Outflows</td>
              <td className="px-4 py-3 text-right font-mono text-foreground">
                -{formatCurrency(cashFlow.outflows, false)}
              </td>
            </tr>
            <tr className="font-bold bg-muted">
              <td className="px-4 py-3 text-foreground">Net Cash Flow</td>
              <td className="px-4 py-3 text-right font-mono text-foreground">
                {cashFlow.netCashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlow.netCashFlow, false)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
