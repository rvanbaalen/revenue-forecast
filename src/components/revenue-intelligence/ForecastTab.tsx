import { useState, useMemo } from 'react';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useAccountingContext } from '@/context/AccountingContext';
import { MONTHS, MONTH_LABELS } from '@/types';
import { formatCurrency } from '@/utils/format';
import { type ForecastMethod } from '@/utils/forecast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  TableFooter,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, CartesianGrid, XAxis, YAxis, ReferenceLine, Bar, ComposedChart } from 'recharts';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const FORECAST_METHODS: { value: ForecastMethod; label: string }[] = [
  { value: 'simple', label: 'Simple Moving Average' },
  { value: 'weighted', label: 'Weighted Moving Average' },
  { value: 'exponential', label: 'Exponential Smoothing' },
  { value: 'linear', label: 'Linear Regression' },
];

type ValidScenario = 'conservative' | 'baseline' | 'optimistic';

const SCENARIOS: { value: ValidScenario; label: string; factor: number }[] = [
  { value: 'conservative', label: 'Conservative (-10%)', factor: 0.9 },
  { value: 'baseline', label: 'Baseline', factor: 1.0 },
  { value: 'optimistic', label: 'Optimistic (+15%)', factor: 1.15 },
];

export function ForecastTab() {
  const {
    generateScenarioForecast,
    getSourceForecasts,
    monthlyChartData,
    getTotals,
  } = useRevenueAnalytics();

  const { getBalanceSheet, getTotalExpenseBudget } = useAccountingContext();

  const [method, setMethod] = useState<ForecastMethod>('weighted');
  const [forecastPeriods, setForecastPeriods] = useState(6);
  const [scenario, setScenario] = useState<ValidScenario>('baseline');

  // Generate forecasts for all scenarios
  const forecasts = useMemo(() => ({
    conservative: generateScenarioForecast(forecastPeriods, method, 'conservative'),
    baseline: generateScenarioForecast(forecastPeriods, method, 'baseline'),
    optimistic: generateScenarioForecast(forecastPeriods, method, 'optimistic'),
  }), [generateScenarioForecast, forecastPeriods, method]);

  // Source-level forecasts
  const sourceForecasts = useMemo(
    () => getSourceForecasts(forecastPeriods, method),
    [getSourceForecasts, forecastPeriods, method]
  );

  // Calculate cash runway
  const runwayAnalysis = useMemo(() => {
    const balanceSheet = getBalanceSheet();
    const currentCash = balanceSheet.assets - balanceSheet.liabilities;

    // Get monthly expense budget average
    const monthlyBudgets = MONTHS.map(m => getTotalExpenseBudget(m));
    const avgExpenseBudget = monthlyBudgets.reduce((a, b) => a + b, 0) / 12;

    // Calculate net income projections
    const baselineForecast = forecasts.baseline;
    let cumulativeCash = currentCash;

    const cashPositions = baselineForecast.map(f => {
      const netIncome = f.predicted - avgExpenseBudget;
      cumulativeCash += netIncome;
      return {
        month: f.month,
        revenue: f.predicted,
        expenses: avgExpenseBudget,
        netIncome,
        cashPosition: cumulativeCash,
      };
    });

    const avgMonthlyNet = cashPositions.length > 0
      ? cashPositions.reduce((sum, p) => sum + p.netIncome, 0) / cashPositions.length
      : 0;

    let runwayMonths: number | 'infinite' = 'infinite';
    if (avgMonthlyNet < 0) {
      runwayMonths = Math.floor(currentCash / Math.abs(avgMonthlyNet));
    }

    return {
      currentCash,
      avgExpenseBudget,
      avgMonthlyNet,
      runwayMonths,
      cashPositions,
      finalCash: cashPositions.length > 0 ? cashPositions[cashPositions.length - 1].cashPosition : currentCash,
    };
  }, [forecasts.baseline, getBalanceSheet, getTotalExpenseBudget]);

  // Prepare chart data with scenarios
  const chartData = useMemo(() => {
    type ChartDataPoint = {
      month: string;
      actual: number | null;
      conservative: number | null;
      baseline: number | null;
      optimistic: number | null;
      isForecast: boolean;
    };

    // Historical data
    const historical: ChartDataPoint[] = monthlyChartData
      .filter(d => !d.isFuture && d.actual > 0)
      .map(d => ({
        month: MONTH_LABELS[d.month],
        actual: d.actual,
        conservative: null,
        baseline: null,
        optimistic: null,
        isForecast: false,
      }));

    // Forecast data
    forecasts.baseline.forEach((f, i) => {
      const [, monthNum] = f.month.split('-');
      const monthIndex = parseInt(monthNum) - 1;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      historical.push({
        month: `${monthNames[monthIndex % 12]}'${f.month.slice(2, 4)}`,
        actual: null,
        conservative: forecasts.conservative[i]?.predicted ?? null,
        baseline: f.predicted,
        optimistic: forecasts.optimistic[i]?.predicted ?? null,
        isForecast: true,
      });
    });

    return historical;
  }, [monthlyChartData, forecasts]);

  const chartConfig = {
    actual: {
      label: 'Actual',
      color: 'var(--color-primary)',
    },
    baseline: {
      label: 'Baseline',
      color: 'var(--color-chart-2)',
    },
    conservative: {
      label: 'Conservative',
      color: 'var(--color-muted)',
    },
    optimistic: {
      label: 'Optimistic',
      color: 'var(--color-success)',
    },
  } satisfies ChartConfig;

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  // Calculate totals for selected scenario
  const selectedForecast = forecasts[scenario];
  const forecastTotal = selectedForecast.reduce((sum, f) => sum + f.predicted, 0);
  const expectedTotal = getTotals('expected').totalRevenue;
  const actualTotal = getTotals('actual').totalRevenue;

  // Format month for display
  const formatForecastMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthIndex = parseInt(month) - 1;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[monthIndex]} ${year}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-base font-medium mb-4">Forecast Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <Label>Forecast Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as ForecastMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORECAST_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Periods (months)</Label>
            <Input
              type="number"
              value={forecastPeriods}
              onChange={(e) => setForecastPeriods(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
              min={1}
              max={24}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Scenario</Label>
            <div className="flex gap-1">
              {SCENARIOS.map(s => (
                <Button
                  key={s.value}
                  variant={scenario === s.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScenario(s.value)}
                  className="flex-1"
                >
                  {s.label.split(' ')[0]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Forecast Total</Label>
            <div className="text-2xl font-semibold text-foreground">
              {formatCurrency(forecastTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Key Projections */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Projected EOY</span>
          </div>
          <p className="text-2xl font-semibold">
            {formatCurrency(actualTotal + forecastTotal)}
          </p>
          <p className={cn(
            "text-xs mt-1",
            (actualTotal + forecastTotal) >= expectedTotal ? "variance-positive" : "variance-negative"
          )}>
            {((actualTotal + forecastTotal - expectedTotal) / expectedTotal * 100).toFixed(0)}% vs budget
          </p>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Current Cash</span>
          </div>
          <p className="text-2xl font-semibold">
            {formatCurrency(runwayAnalysis.currentCash)}
          </p>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {runwayAnalysis.avgMonthlyNet >= 0 ? (
              <TrendingUp className="size-4 variance-positive" />
            ) : (
              <TrendingDown className="size-4 variance-negative" />
            )}
            <span className="text-sm text-muted-foreground">Avg Monthly Net</span>
          </div>
          <p className={cn(
            "text-2xl font-semibold",
            runwayAnalysis.avgMonthlyNet >= 0 ? "variance-positive" : "variance-negative"
          )}>
            {formatCurrency(runwayAnalysis.avgMonthlyNet)}
          </p>
        </div>

        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {runwayAnalysis.runwayMonths === 'infinite' ? (
              <CheckCircle2 className="size-4 variance-positive" />
            ) : (
              <AlertTriangle className="size-4 text-warning" />
            )}
            <span className="text-sm text-muted-foreground">Cash Runway</span>
          </div>
          <p className={cn(
            "text-2xl font-semibold",
            runwayAnalysis.runwayMonths === 'infinite' ? "variance-positive" : "text-warning"
          )}>
            {runwayAnalysis.runwayMonths === 'infinite'
              ? 'Sustainable'
              : `${runwayAnalysis.runwayMonths} months`}
          </p>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium">Revenue Projection</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-sm bg-primary" />
              <span className="text-muted-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-sm bg-muted" />
              <span className="text-muted-foreground">Conservative</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-sm bg-chart-2" />
              <span className="text-muted-foreground">Baseline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-sm bg-success" />
              <span className="text-muted-foreground">Optimistic</span>
            </div>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <ComposedChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
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
                      <span className="text-muted-foreground capitalize">{name}</span>
                      <span className="font-mono font-medium">
                        {value ? formatCurrency(value as number) : '-'}
                      </span>
                    </div>
                  )}
                />
              }
            />
            {/* Reference line at transition */}
            {chartData.findIndex(d => d.isForecast) > 0 && (
              <ReferenceLine
                x={chartData[chartData.findIndex(d => d.isForecast) - 1]?.month}
                stroke="var(--color-border)"
                strokeDasharray="3 3"
              />
            )}
            <Bar
              dataKey="actual"
              fill="var(--color-actual)"
              radius={[4, 4, 0, 0]}
            />
            <Area
              dataKey="optimistic"
              fill="var(--color-optimistic)"
              stroke="var(--color-optimistic)"
              fillOpacity={0.1}
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="baseline"
              fill="var(--color-baseline)"
              stroke="var(--color-baseline)"
              fillOpacity={0.2}
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="conservative"
              fill="var(--color-conservative)"
              stroke="var(--color-conservative)"
              fillOpacity={0.1}
              strokeWidth={2}
              type="monotone"
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      {/* Forecast Details Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-base font-medium">Monthly Forecast Details</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Net Income</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedForecast.map((f) => (
              <TableRow key={f.month}>
                <TableCell className="font-medium">{formatForecastMonth(f.month)}</TableCell>
                <TableCell className="text-right font-mono variance-positive">
                  {formatCurrency(f.predicted)}
                </TableCell>
                <TableCell className="text-right font-mono variance-negative">
                  {formatCurrency(runwayAnalysis.avgExpenseBudget)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-mono font-medium",
                  f.predicted - runwayAnalysis.avgExpenseBudget >= 0 ? "variance-positive" : "variance-negative"
                )}>
                  {formatCurrency(f.predicted - runwayAnalysis.avgExpenseBudget)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "text-sm",
                    f.confidence >= 70 ? "text-success" :
                    f.confidence >= 50 ? "text-warning" : "text-muted-foreground"
                  )}>
                    {f.confidence.toFixed(0)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Total</TableCell>
              <TableCell className="text-right font-mono variance-positive font-semibold">
                {formatCurrency(selectedForecast.reduce((sum, f) => sum + f.predicted, 0))}
              </TableCell>
              <TableCell className="text-right font-mono variance-negative font-semibold">
                {formatCurrency(runwayAnalysis.avgExpenseBudget * selectedForecast.length)}
              </TableCell>
              <TableCell className={cn(
                "text-right font-mono font-semibold",
                runwayAnalysis.cashPositions.reduce((sum, p) => sum + p.netIncome, 0) >= 0
                  ? "variance-positive" : "variance-negative"
              )}>
                {formatCurrency(runwayAnalysis.cashPositions.reduce((sum, p) => sum + p.netIncome, 0))}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Source-Level Forecasts */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-base font-medium">Source-Level Forecasts</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10">Source</TableHead>
                {selectedForecast.slice(0, 6).map(f => (
                  <TableHead key={f.month} className="text-right">
                    {formatForecastMonth(f.month).split(' ')[0]}
                  </TableHead>
                ))}
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceForecasts
                .filter(sf => sf.forecasts.length > 0)
                .sort((a, b) => {
                  const aTotal = a.forecasts.reduce((sum, f) => sum + f.predicted, 0);
                  const bTotal = b.forecasts.reduce((sum, f) => sum + f.predicted, 0);
                  return bTotal - aTotal;
                })
                .map(sf => (
                  <TableRow key={sf.sourceId}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      {sf.sourceName}
                    </TableCell>
                    {sf.forecasts.slice(0, 6).map(f => (
                      <TableCell key={f.month} className="text-right font-mono">
                        {formatCurrency(f.predicted, false)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-sm font-medium",
                        sf.overallConfidence >= 70 ? "variance-positive" :
                        sf.overallConfidence >= 50 ? "text-warning" : "text-muted-foreground"
                      )}>
                        {sf.overallConfidence.toFixed(0)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
