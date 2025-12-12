import { useState, useMemo } from 'react';
import { useRevenue } from '../context/RevenueContext';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  generateForecast,
  getStatistics,
  detectSeasonality,
  linearRegression,
  calculateGrowthRate,
  type ForecastMethod,
} from '../utils/forecast';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

const FORECAST_METHODS: { value: ForecastMethod; label: string; description: string }[] = [
  { value: 'simple', label: 'Simple Moving Average', description: 'Average of recent periods' },
  { value: 'weighted', label: 'Weighted Moving Average', description: 'Recent months weighted more' },
  { value: 'exponential', label: 'Exponential Smoothing', description: 'Exponentially weighted' },
  { value: 'linear', label: 'Linear Regression', description: 'Trend-based projection' },
];

export function ForecastPage() {
  const { config, sources, getSourceValue, getRate } = useRevenue();

  const [method, setMethod] = useState<ForecastMethod>('weighted');
  const [forecastPeriods, setForecastPeriods] = useState(6);
  const [dataSource, setDataSource] = useState<'expected' | 'actual'>('actual');

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

  // Calculate max value for chart scaling
  const allValues = [...dataWithValues.map(d => d.total), ...forecasts.map(f => f.predicted)];
  const maxValue = Math.max(...allValues, 1);

  return (
    <TooltipProvider>
      <div className="fade-in space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Revenue Forecast</h1>
          <p className="text-zinc-500 mt-1">
            Predict future revenue based on historical data
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base font-medium">Forecast Settings</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
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
              <div className="space-y-2">
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
                <p className="text-xs text-zinc-500">
                  {FORECAST_METHODS.find(m => m.value === method)?.description}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Forecast Periods (months)</Label>
                <Input
                  type="number"
                  value={forecastPeriods}
                  onChange={(e) => setForecastPeriods(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={24}
                />
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
                    trendInfo.trend === 'upward' ? 'bg-green-50' :
                    trendInfo.trend === 'downward' ? 'bg-red-50' : 'bg-zinc-100'
                  )}>
                    {trendInfo.trend === 'upward' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : trendInfo.trend === 'downward' ? (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    ) : (
                      <Minus className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Trend</p>
                    <p className="font-medium text-zinc-900 capitalize">{trendInfo.trend}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Monthly Change</p>
                  <p className={cn(
                    "font-medium",
                    trendInfo.slope >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {trendInfo.slope >= 0 ? '+' : ''}{formatCurrency(trendInfo.slope)}/month
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Growth Rate</p>
                  <p className={cn(
                    "font-medium",
                    trendInfo.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {trendInfo.growthRate >= 0 ? '+' : ''}{(trendInfo.growthRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              {seasonality.hasSeasonality && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-amber-600">
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
                  <div className="w-3 h-3 rounded-sm bg-indigo-600" />
                  <span className="text-zinc-500">Historical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-indigo-300 border border-dashed border-indigo-500" />
                  <span className="text-zinc-500">Forecast</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-4">
            {dataWithValues.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-zinc-400">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No {dataSource} revenue data available yet.</p>
                  <p className="text-sm">Add revenue data to generate forecasts.</p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-end gap-1 overflow-x-auto pb-8">
                {/* Historical data bars */}
                {dataWithValues.map((d) => (
                  <Tooltip key={d.month}>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group" style={{ width: '40px' }}>
                        <div
                          className="w-8 bg-indigo-600 rounded-t transition-all group-hover:bg-indigo-500"
                          style={{ height: `${Math.max((d.total / maxValue) * 200, 4)}px` }}
                        />
                        <p className="text-xs text-zinc-400 mt-2 -rotate-45 origin-top-left whitespace-nowrap">
                          {d.label}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{d.label}</p>
                      <p className="font-mono">{formatCurrency(d.total)}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}

                {/* Divider */}
                {forecasts.length > 0 && (
                  <div className="flex flex-col items-center justify-end flex-shrink-0 px-2">
                    <div className="w-px h-48 border-l border-dashed border-zinc-300" />
                  </div>
                )}

                {/* Forecast bars */}
                {forecasts.map((f) => (
                  <Tooltip key={f.month}>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group" style={{ width: '40px' }}>
                        <div
                          className="w-8 bg-indigo-200 rounded-t border-2 border-dashed border-indigo-400 transition-all group-hover:bg-indigo-300"
                          style={{ height: `${Math.max((f.predicted / maxValue) * 200, 4)}px` }}
                        />
                        <p className="text-xs text-indigo-400 mt-2 -rotate-45 origin-top-left whitespace-nowrap">
                          {formatForecastMonth(f.month)}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{formatForecastMonth(f.month)}</p>
                      <p className="font-mono">{formatCurrency(f.predicted)}</p>
                      <p className="text-xs text-zinc-400">Forecast</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forecast Table */}
        {forecasts.length > 0 && (
          <Card>
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base font-medium">Forecast Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm table-clean">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Month</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Predicted Revenue</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f) => (
                    <tr key={f.month}>
                      <td className="px-4 py-3 text-zinc-700">{formatForecastMonth(f.month)}</td>
                      <td className="px-4 py-3 text-right font-mono text-indigo-600">
                        {formatCurrency(f.predicted)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 capitalize">{f.method}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-50 font-medium">
                    <td className="px-4 py-3 text-zinc-700">Total Forecast</td>
                    <td className="px-4 py-3 text-right font-mono text-indigo-600 font-semibold">
                      {formatCurrency(forecasts.reduce((sum, f) => sum + f.predicted, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-white border border-zinc-200 rounded-lg">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 tabular-nums">{value}</p>
    </div>
  );
}
