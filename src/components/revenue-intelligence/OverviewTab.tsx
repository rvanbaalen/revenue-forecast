import { useMemo } from 'react';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { MONTH_LABELS } from '@/types';
import { formatCurrency } from '@/utils/format';
import {
  StatCard,
  StatCardIcon,
  StatCardContent,
  StatCardLabel,
  StatCardValue,
} from '@/components/ui/stat-card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, CartesianGrid, XAxis, YAxis, ReferenceLine, ComposedChart } from 'recharts';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Info,
  Zap,
} from 'lucide-react';

export function OverviewTab() {
  const {
    ytdSummary,
    topPerformers,
    underperformers,
    insights,
    monthlyChartData,
    generateScenarioForecast,
  } = useRevenueAnalytics();

  // Generate forecast for remaining months
  const forecastData = useMemo(() => {
    return generateScenarioForecast(6, 'weighted', 'baseline');
  }, [generateScenarioForecast]);

  // Combine historical and forecast data for chart
  const chartData = useMemo(() => {
    const historical = monthlyChartData.map(d => ({
      month: MONTH_LABELS[d.month],
      expected: d.expected,
      actual: d.actual,
      forecast: null as number | null,
      isForecast: false,
    }));

    // Add forecast data for future months
    forecastData.forEach(f => {
      const [, monthNum] = f.month.split('-');
      const monthIndex = parseInt(monthNum) - 1;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = monthNames[monthIndex % 12];

      // Check if this month already exists
      const existingIndex = historical.findIndex(h => h.month === label);
      if (existingIndex >= 0 && monthlyChartData[existingIndex]?.isFuture) {
        historical[existingIndex].forecast = f.predicted;
        historical[existingIndex].isForecast = true;
      }
    });

    return historical;
  }, [monthlyChartData, forecastData]);

  const chartConfig = {
    expected: {
      label: 'Expected',
      color: 'var(--color-muted)',
    },
    actual: {
      label: 'Actual',
      color: 'var(--color-primary)',
    },
    forecast: {
      label: 'Forecast',
      color: 'var(--color-chart-2)',
    },
  } satisfies ChartConfig;

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  // Find current month index for reference line
  const currentMonthIndex = monthlyChartData.findIndex(d => d.isCurrent);

  const insightIcons = {
    warning: AlertCircle,
    success: CheckCircle2,
    info: Info,
    action: Zap,
  };

  const insightColors = {
    warning: 'text-warning bg-warning/10 border-warning/20',
    success: 'text-success bg-success/10 border-success/20',
    info: 'text-info bg-info/10 border-info/20',
    action: 'text-primary bg-primary/10 border-primary/20',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard>
          <StatCardIcon variant="primary">
            <DollarSign className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>YTD Revenue</StatCardLabel>
            <StatCardValue>{formatCurrency(ytdSummary.revenue.actual)}</StatCardValue>
            <p className="text-xs text-muted-foreground mt-1">
              Expected: {formatCurrency(ytdSummary.revenue.expected)}
            </p>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon variant={ytdSummary.revenue.isPositive ? 'success' : 'destructive'}>
            {ytdSummary.revenue.isPositive ? (
              <TrendingUp className="size-5" />
            ) : (
              <TrendingDown className="size-5" />
            )}
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>vs Budget</StatCardLabel>
            <StatCardValue variant={ytdSummary.revenue.isPositive ? 'positive' : 'negative'}>
              {ytdSummary.revenue.isPositive ? '+' : ''}{ytdSummary.revenue.percentage.toFixed(1)}%
            </StatCardValue>
            <p className="text-xs text-muted-foreground mt-1">
              {ytdSummary.revenue.isPositive ? '+' : ''}{formatCurrency(ytdSummary.revenue.difference)}
            </p>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon>
            <Calendar className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>{MONTH_LABELS[ytdSummary.currentMonth.month]}</StatCardLabel>
            <StatCardValue>{formatCurrency(ytdSummary.currentMonth.actual)}</StatCardValue>
            <p className="text-xs text-muted-foreground mt-1">
              {ytdSummary.currentMonth.percentComplete}% of {formatCurrency(ytdSummary.currentMonth.expected)}
            </p>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon variant={ytdSummary.projectedEOYVariance.isPositive ? 'success' : 'warning'}>
            <Target className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Projected EOY</StatCardLabel>
            <StatCardValue>{formatCurrency(ytdSummary.projectedEOY)}</StatCardValue>
            <p className={cn(
              "text-xs mt-1",
              ytdSummary.projectedEOYVariance.isPositive ? "variance-positive" : "variance-negative"
            )}>
              {ytdSummary.projectedEOYVariance.isPositive ? '+' : ''}
              {ytdSummary.projectedEOYVariance.percentage.toFixed(1)}% vs budget
            </p>
          </StatCardContent>
        </StatCard>
      </div>

      {/* Revenue Trend Chart */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium">Revenue Trend</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-sm bg-muted" />
              <span className="text-muted-foreground">Expected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-sm bg-primary" />
              <span className="text-muted-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-sm bg-chart-2 opacity-70" />
              <span className="text-muted-foreground">Forecast</span>
            </div>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
          <ComposedChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
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
                      <span className="font-mono font-medium">{formatCurrency(value as number)}</span>
                    </div>
                  )}
                />
              }
            />
            {currentMonthIndex >= 0 && (
              <ReferenceLine
                x={chartData[currentMonthIndex]?.month}
                stroke="var(--color-primary)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}
            <Bar
              dataKey="expected"
              fill="var(--color-expected)"
              radius={[4, 4, 0, 0]}
              opacity={0.5}
            />
            <Bar
              dataKey="actual"
              fill="var(--color-actual)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="forecast"
              fill="var(--color-forecast)"
              radius={[4, 4, 0, 0]}
              opacity={0.6}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      {/* Performance & Insights Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Performers */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-4 variance-positive" />
            <h3 className="text-base font-medium">Top Performers</h3>
          </div>
          {topPerformers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources exceeding expectations yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topPerformers.slice(0, 5).map((source, i) => (
                <div key={source.sourceId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-sm truncate max-w-[140px]">{source.sourceName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium variance-positive">
                      +{source.variance.percentage.toFixed(0)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formatCurrency(source.variance.difference, false)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Underperformers */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="size-4 variance-negative" />
            <h3 className="text-base font-medium">Needs Attention</h3>
          </div>
          {underperformers.length === 0 ? (
            <p className="text-sm text-muted-foreground">All sources meeting or exceeding targets!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {underperformers.slice(0, 5).map((source, i) => (
                <div key={source.sourceId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-sm truncate max-w-[140px]">{source.sourceName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium variance-negative">
                      {source.variance.percentage.toFixed(0)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formatCurrency(source.variance.difference, false)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Insights */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Info className="size-4 text-muted-foreground" />
            <h3 className="text-base font-medium">Insights</h3>
          </div>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No insights available yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {insights.slice(0, 4).map((insight) => {
                const Icon = insightIcons[insight.type];
                return (
                  <div
                    key={insight.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-md border text-sm",
                      insightColors[insight.type]
                    )}
                  >
                    <Icon className="size-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{insight.title}</p>
                      <p className="text-xs opacity-80">{insight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
