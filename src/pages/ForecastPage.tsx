import { useState, useMemo } from 'react';
import { useRevenue } from '../context/RevenueContext';
import { useAccountingContext } from '../context/AccountingContext';
import { MONTHS, MONTH_LABELS, type Month } from '../types';
import { formatCurrency } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import {
  generateForecast,
  getStatistics,
  detectSeasonality,
  linearRegression,
  calculateGrowthRate,
  type ForecastMethod,
} from '../utils/forecast';
import { TrendingUp, TrendingDown, Minus, BarChart3, Wallet, Target } from 'lucide-react';

const FORECAST_METHODS: { value: ForecastMethod; label: string; description: string }[] = [
  { value: 'simple', label: 'Simple Moving Average', description: 'Average of recent periods' },
  { value: 'weighted', label: 'Weighted Moving Average', description: 'Recent months weighted more' },
  { value: 'exponential', label: 'Exponential Smoothing', description: 'Exponentially weighted' },
  { value: 'linear', label: 'Linear Regression', description: 'Trend-based projection' },
];

export function ForecastPage() {
  const { config, sources, getSourceValue, getRate } = useRevenue();
  const { getTotalExpenseBudget, getBalanceSheet } = useAccountingContext();

  const [method, setMethod] = useState<ForecastMethod>('weighted');
  const [forecastPeriods, setForecastPeriods] = useState(6);
  const [dataSource, setDataSource] = useState<'expected' | 'actual'>('actual');
  const [includeExpenses, setIncludeExpenses] = useState(true);

  // Calculate monthly totals
  const monthlyData = useMemo(() => {
    return MONTHS.map(month => {
      const total = sources.reduce((sum, source) => {
        const value = getSourceValue(source, month, dataSource);
        return sum + value * getRate(source.currency);
      }, 0);
      return {
        month: `${config.year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}`,
        label: MONTH_LABELS[month],
        total,
      };
    });
  }, [sources, config.year, dataSource, getSourceValue, getRate]);

  // Filter to only months with data
  const dataWithValues = monthlyData.filter(d => d.total > 0);

  // Generate forecasts
  const forecasts = useMemo(() => {
    if (dataWithValues.length === 0) return [];
    return generateForecast(dataWithValues, forecastPeriods, method);
  }, [dataWithValues, forecastPeriods, method]);

  // Calculate expense budgets for forecast periods
  const expenseForecast = useMemo(() => {
    // Get average monthly expense budget for future projections
    const monthlyBudgets = MONTHS.map(m => getTotalExpenseBudget(m));
    const avgExpenseBudget = monthlyBudgets.reduce((a, b) => a + b, 0) / 12;

    // For forecast periods, use the corresponding month's budget if available,
    // otherwise use average
    return forecasts.map(f => {
      const [, monthStr] = f.month.split('-');
      const monthIndex = parseInt(monthStr) - 1;
      const month = MONTHS[monthIndex % 12] as Month;
      const budget = getTotalExpenseBudget(month);
      return {
        month: f.month,
        expenses: budget > 0 ? budget : avgExpenseBudget,
      };
    });
  }, [forecasts, getTotalExpenseBudget]);

  // Calculate net income projections
  const netIncomeProjections = useMemo(() => {
    return forecasts.map((f, i) => ({
      month: f.month,
      revenue: f.predicted,
      expenses: expenseForecast[i]?.expenses || 0,
      netIncome: f.predicted - (expenseForecast[i]?.expenses || 0),
    }));
  }, [forecasts, expenseForecast]);

  // Cash runway calculation
  const runwayAnalysis = useMemo(() => {
    const balanceSheet = getBalanceSheet();
    const currentCash = balanceSheet.assets - balanceSheet.liabilities;

    // Calculate cumulative cash position over forecast period
    let cumulativeCash = currentCash;
    const cashPositions = netIncomeProjections.map(p => {
      cumulativeCash += p.netIncome;
      return {
        month: p.month,
        cashPosition: cumulativeCash,
      };
    });

    // Calculate average monthly net income
    const avgMonthlyNet = netIncomeProjections.length > 0
      ? netIncomeProjections.reduce((sum, p) => sum + p.netIncome, 0) / netIncomeProjections.length
      : 0;

    // Calculate runway
    let runwayMonths: number | 'infinite' = 'infinite';
    if (avgMonthlyNet < 0) {
      runwayMonths = Math.floor(currentCash / Math.abs(avgMonthlyNet));
    }

    return {
      currentCash,
      avgMonthlyNet,
      runwayMonths,
      cashPositions,
      finalCash: cashPositions.length > 0 ? cashPositions[cashPositions.length - 1].cashPosition : currentCash,
    };
  }, [netIncomeProjections, getBalanceSheet]);

  // Calculate statistics
  const stats = useMemo(() => {
    const values = dataWithValues.map(d => d.total);
    return getStatistics(values);
  }, [dataWithValues]);

  // Detect seasonality
  const seasonality = useMemo(() => {
    const values = monthlyData.map(d => d.total);
    return detectSeasonality(values);
  }, [monthlyData]);

  // Calculate trend info
  const trendInfo = useMemo(() => {
    const values = dataWithValues.map(d => d.total);
    if (values.length < 2) return null;

    const regression = linearRegression(values);
    const growthRate = calculateGrowthRate(values);

    return {
      slope: regression.slope,
      growthRate,
      trend: regression.slope > 0 ? 'upward' : regression.slope < 0 ? 'downward' : 'flat',
    };
  }, [dataWithValues]);

  // Format forecast month for display
  const formatForecastMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthIndex = parseInt(month) - 1;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[monthIndex]} ${year}`;
  };

  // Combine historical and forecast data for the chart
  const chartData = useMemo(() => {
    const historical = dataWithValues.map(d => ({
      label: d.label,
      value: d.total,
      type: 'historical' as const,
    }));

    const forecastData = forecasts.map(f => ({
      label: formatForecastMonth(f.month),
      value: f.predicted,
      type: 'forecast' as const,
    }));

    return [...historical, ...forecastData];
  }, [dataWithValues, forecasts]);

  // Chart config
  const chartConfig = {
    value: {
      label: 'Revenue',
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
      <div className="fade-in flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Revenue Forecast</h1>
          <p className="text-muted-foreground mt-1">
            Predict future revenue based on historical data
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base font-medium">Forecast Settings</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Data Source</Label>
                <Select value={dataSource} onValueChange={(v) => setDataSource(v as 'expected' | 'actual')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actual">Actual Revenue</SelectItem>
                    <SelectItem value="expected">Expected Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <p className="text-xs text-muted-foreground">
                  {FORECAST_METHODS.find(m => m.value === method)?.description}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Forecast Periods (months)</Label>
                <Input
                  type="number"
                  value={forecastPeriods}
                  onChange={(e) => setForecastPeriods(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={24}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Options</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="includeExpenses"
                    checked={includeExpenses}
                    onCheckedChange={(checked) => setIncludeExpenses(checked === true)}
                  />
                  <Label htmlFor="includeExpenses" className="cursor-pointer text-sm font-normal">
                    Include expense budget
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Data Points" value={dataWithValues.length.toString()} />
          <StatCard label="Total" value={formatCurrency(stats.total)} />
          <StatCard label="Average" value={formatCurrency(stats.avg)} />
          <StatCard label="Std Dev" value={formatCurrency(stats.stdDev)} />
          <StatCard label="Min" value={formatCurrency(stats.min)} />
          <StatCard label="Max" value={formatCurrency(stats.max)} />
        </div>

        {/* Trend Analysis */}
        {trendInfo && (
          <Card>
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base font-medium">Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    trendInfo.trend === 'upward' ? 'bg-secondary' :
                    trendInfo.trend === 'downward' ? 'bg-destructive/10' : 'bg-muted'
                  )}>
                    {trendInfo.trend === 'upward' ? (
                      <TrendingUp className="size-5 variance-positive" />
                    ) : trendInfo.trend === 'downward' ? (
                      <TrendingDown className="size-5 variance-negative" />
                    ) : (
                      <Minus className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trend</p>
                    <p className="font-medium text-foreground capitalize">{trendInfo.trend}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Change</p>
                  <p className={cn(
                    "font-medium",
                    trendInfo.slope >= 0 ? 'variance-positive' : 'variance-negative'
                  )}>
                    {trendInfo.slope >= 0 ? '+' : ''}{formatCurrency(trendInfo.slope)}/month
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Growth Rate</p>
                  <p className={cn(
                    "font-medium",
                    trendInfo.growthRate >= 0 ? 'variance-positive' : 'variance-negative'
                  )}>
                    {trendInfo.growthRate >= 0 ? '+' : ''}{(trendInfo.growthRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              {seasonality.hasSeasonality && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Seasonality detected. Consider this when interpreting forecasts.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        <Card>
          <CardHeader className="border-b py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Revenue Trend & Forecast</CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-sm bg-chart-1" />
                  <span className="text-muted-foreground">Historical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-sm bg-chart-2" />
                  <span className="text-muted-foreground">Forecast</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-4">
            {dataWithValues.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No {dataSource} revenue data available yet.</p>
                  <p className="text-sm">Add revenue data to generate forecasts.</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
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
                        formatter={(value, _name, item) => (
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-medium">{formatCurrency(value as number)}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.payload.type === 'forecast' ? 'Forecast' : 'Historical'}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  {dataWithValues.length > 0 && forecasts.length > 0 && (
                    <ReferenceLine
                      x={dataWithValues[dataWithValues.length - 1].label}
                      stroke="var(--color-border)"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                  )}
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.type === 'historical' ? 'var(--color-chart-1)' : 'var(--color-chart-2)'}
                        opacity={entry.type === 'forecast' ? 0.7 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Cash Runway Analysis */}
        {includeExpenses && forecasts.length > 0 && (
          <Card>
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Wallet className="size-4" />
                Cash Runway Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Cash Position</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(runwayAnalysis.currentCash)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg Monthly Net Income</p>
                  <p className={cn(
                    "text-xl font-bold",
                    runwayAnalysis.avgMonthlyNet >= 0 ? "variance-positive" : "variance-negative"
                  )}>
                    {formatCurrency(runwayAnalysis.avgMonthlyNet)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Cash Runway</p>
                  <p className={cn(
                    "text-xl font-bold",
                    runwayAnalysis.runwayMonths === 'infinite' ? "variance-positive" : "text-foreground"
                  )}>
                    {runwayAnalysis.runwayMonths === 'infinite'
                      ? 'Cash Positive'
                      : `${runwayAnalysis.runwayMonths} months`}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Projected Cash ({forecastPeriods}mo)</p>
                  <p className={cn(
                    "text-xl font-bold",
                    runwayAnalysis.finalCash >= 0 ? "variance-positive" : "variance-negative"
                  )}>
                    {formatCurrency(runwayAnalysis.finalCash)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forecast Table */}
        {forecasts.length > 0 && (
          <Card>
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Target className="size-4" />
                Forecast Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm table-clean">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Month</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                    {includeExpenses && (
                      <>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Expenses</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net Income</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {netIncomeProjections.map((p, i) => (
                    <tr key={p.month}>
                      <td className="px-4 py-3 text-foreground">{formatForecastMonth(p.month)}</td>
                      <td className="px-4 py-3 text-right font-mono variance-positive">
                        {formatCurrency(p.revenue)}
                      </td>
                      {includeExpenses && (
                        <>
                          <td className="px-4 py-3 text-right font-mono variance-negative">
                            {formatCurrency(p.expenses)}
                          </td>
                          <td className={cn(
                            "px-4 py-3 text-right font-mono font-medium",
                            p.netIncome >= 0 ? "variance-positive" : "variance-negative"
                          )}>
                            {formatCurrency(p.netIncome)}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-muted-foreground capitalize">{forecasts[i]?.method}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted font-medium">
                    <td className="px-4 py-3 text-foreground">Total</td>
                    <td className="px-4 py-3 text-right font-mono variance-positive font-semibold">
                      {formatCurrency(netIncomeProjections.reduce((sum, p) => sum + p.revenue, 0))}
                    </td>
                    {includeExpenses && (
                      <>
                        <td className="px-4 py-3 text-right font-mono variance-negative font-semibold">
                          {formatCurrency(netIncomeProjections.reduce((sum, p) => sum + p.expenses, 0))}
                        </td>
                        <td className={cn(
                          "px-4 py-3 text-right font-mono font-semibold",
                          netIncomeProjections.reduce((sum, p) => sum + p.netIncome, 0) >= 0
                            ? "variance-positive"
                            : "variance-negative"
                        )}>
                          {formatCurrency(netIncomeProjections.reduce((sum, p) => sum + p.netIncome, 0))}
                        </td>
                      </>
                    )}
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="text-lg font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
