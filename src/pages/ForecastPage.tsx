import { useState, useMemo } from 'react';
import { useRevenue } from '../context/RevenueContext';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import {
  generateForecast,
  getStatistics,
  detectSeasonality,
  linearRegression,
  calculateGrowthRate,
  type ForecastMethod,
} from '../utils/forecast';

const FORECAST_METHODS: { value: ForecastMethod; label: string; description: string }[] = [
  { value: 'simple', label: 'Simple Moving Average', description: 'Average of recent periods' },
  { value: 'weighted', label: 'Weighted Moving Average', description: 'Recent months weighted more heavily' },
  { value: 'exponential', label: 'Exponential Smoothing', description: 'Exponentially weighted with dampened trend' },
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
    <>
      <h1 className="text-2xl font-bold text-sky-400 mb-6">Revenue Forecast</h1>

      {/* Controls */}
      <section className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-300 mb-4">Forecast Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Data Source</label>
            <select
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value as 'expected' | 'actual')}
              className="w-full px-3 py-2 rounded-lg text-slate-200 text-sm"
            >
              <option value="actual">Actual Revenue</option>
              <option value="expected">Expected Revenue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Forecast Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as ForecastMethod)}
              className="w-full px-3 py-2 rounded-lg text-slate-200 text-sm"
            >
              {FORECAST_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {FORECAST_METHODS.find(m => m.value === method)?.description}
            </p>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Forecast Periods</label>
            <input
              type="number"
              value={forecastPeriods}
              onChange={(e) => setForecastPeriods(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
              min={1}
              max={24}
              className="w-full px-3 py-2 rounded-lg text-slate-200 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Months with Data" value={dataWithValues.length.toString()} />
        <StatCard label="Total Revenue" value={formatCurrency(stats.total)} />
        <StatCard label="Monthly Average" value={formatCurrency(stats.avg)} />
        <StatCard label="Std Deviation" value={formatCurrency(stats.stdDev)} />
        <StatCard label="Min Month" value={formatCurrency(stats.min)} />
        <StatCard label="Max Month" value={formatCurrency(stats.max)} />
      </div>

      {/* Trend Analysis */}
      {trendInfo && (
        <section className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">Trend Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                trendInfo.trend === 'upward' ? 'bg-emerald-500' :
                trendInfo.trend === 'downward' ? 'bg-red-500' : 'bg-slate-500'
              }`} />
              <div>
                <p className="text-sm text-slate-400">Trend Direction</p>
                <p className="font-medium text-slate-200 capitalize">{trendInfo.trend}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-400">Monthly Change</p>
              <p className={`font-medium ${trendInfo.slope >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trendInfo.slope >= 0 ? '+' : ''}{formatCurrency(trendInfo.slope)}/month
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Avg Growth Rate</p>
              <p className={`font-medium ${trendInfo.growthRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trendInfo.growthRate >= 0 ? '+' : ''}{(trendInfo.growthRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          {seasonality.hasSeasonality && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-sm text-amber-400">
                Seasonality detected in your data. Consider this when interpreting forecasts.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Visual Chart */}
      <section className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-300 mb-4">Revenue Trend & Forecast</h2>
        <div className="h-64 flex items-end gap-1 overflow-x-auto pb-4">
          {/* Historical data bars */}
          {dataWithValues.map((d) => (
            <div key={d.month} className="flex flex-col items-center flex-shrink-0" style={{ width: '40px' }}>
              <div
                className="w-8 bg-sky-500/80 rounded-t transition-all hover:bg-sky-400"
                style={{ height: `${(d.total / maxValue) * 200}px` }}
                title={`${d.label}: ${formatCurrency(d.total)}`}
              />
              <p className="text-xs text-slate-400 mt-2 rotate-45 origin-left whitespace-nowrap">
                {d.label}
              </p>
            </div>
          ))}

          {/* Divider */}
          {forecasts.length > 0 && (
            <div className="flex flex-col items-center justify-end flex-shrink-0 px-2">
              <div className="w-px h-48 bg-slate-600 border-l border-dashed" />
              <p className="text-xs text-slate-500 mt-2">Forecast</p>
            </div>
          )}

          {/* Forecast bars */}
          {forecasts.map((f) => (
            <div key={f.month} className="flex flex-col items-center flex-shrink-0" style={{ width: '40px' }}>
              <div
                className="w-8 bg-emerald-500/60 rounded-t border-2 border-dashed border-emerald-400/50 transition-all hover:bg-emerald-400/60"
                style={{ height: `${(f.predicted / maxValue) * 200}px` }}
                title={`${formatForecastMonth(f.month)}: ${formatCurrency(f.predicted)} (forecast)`}
              />
              <p className="text-xs text-emerald-400/70 mt-2 rotate-45 origin-left whitespace-nowrap">
                {formatForecastMonth(f.month)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-sky-500/80 rounded" />
            <span className="text-sm text-slate-400">Historical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-500/60 rounded border-2 border-dashed border-emerald-400/50" />
            <span className="text-sm text-slate-400">Forecast</span>
          </div>
        </div>
      </section>

      {/* Forecast Table */}
      {forecasts.length > 0 && (
        <section className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">Forecast Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Month</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium">Predicted Revenue (Cg)</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => (
                  <tr key={f.month} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-200">{formatForecastMonth(f.month)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-300">
                      {formatCurrency(f.predicted)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{f.method}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="px-4 py-3 text-slate-200">Total Forecast</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">
                    {formatCurrency(forecasts.reduce((sum, f) => sum + f.predicted, 0))}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {dataWithValues.length === 0 && (
        <section className="glass rounded-2xl p-8 text-center">
          <p className="text-slate-400 mb-2">No {dataSource} revenue data available yet.</p>
          <p className="text-sm text-slate-500">
            Add some {dataSource} revenue data to generate forecasts.
          </p>
        </section>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-200">{value}</p>
    </div>
  );
}
