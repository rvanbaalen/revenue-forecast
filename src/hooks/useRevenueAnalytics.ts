import { useMemo, useCallback } from 'react';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from './useTime';
import {
  MONTHS,
  type Month,
  type RevenueSource,
  type VarianceInfo,
  type SourcePerformance,
  type MonthAnalysis,
  type Insight,
  type YTDSummary,
  type ForecastWithConfidence,
  type SourceForecast,
  type ForecastScenario,
} from '../types';
import {
  generateForecast,
  calculateGrowthRate,
  linearRegression,
  type ForecastMethod,
} from '../utils/forecast';

/**
 * Calculate variance information between expected and actual
 */
function calculateVariance(expected: number, actual: number): VarianceInfo {
  const difference = actual - expected;
  const percentage = expected !== 0 ? (difference / expected) * 100 : actual > 0 ? 100 : 0;
  const isPositive = difference >= 0;

  let status: VarianceInfo['status'];
  if (percentage >= 10) status = 'exceeding';
  else if (percentage >= -5) status = 'on-target';
  else if (percentage >= -20) status = 'behind';
  else status = 'critical';

  return {
    expected,
    actual,
    difference,
    percentage,
    isPositive,
    status,
  };
}

/**
 * Determine trend from monthly values
 */
function determineTrend(values: number[]): 'growing' | 'stable' | 'declining' {
  if (values.length < 2) return 'stable';
  const regression = linearRegression(values);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const slopePercent = avgValue !== 0 ? (regression.slope / avgValue) * 100 : 0;

  if (slopePercent > 3) return 'growing';
  if (slopePercent < -3) return 'declining';
  return 'stable';
}

/**
 * Calculate reliability score (how often source hits targets)
 */
function calculateReliability(source: RevenueSource, getSourceValue: (s: RevenueSource, m: Month, t: 'expected' | 'actual') => number): number {
  let hitCount = 0;
  let totalMonths = 0;

  for (const month of MONTHS) {
    const expected = getSourceValue(source, month, 'expected');
    const actual = getSourceValue(source, month, 'actual');

    if (expected > 0 || actual > 0) {
      totalMonths++;
      const variance = expected > 0 ? (actual - expected) / expected : 0;
      // Within 10% is considered hitting target
      if (variance >= -0.1) hitCount++;
    }
  }

  return totalMonths > 0 ? Math.round((hitCount / totalMonths) * 100) : 100;
}

export function useRevenueAnalytics() {
  const {
    sources,
    config,
    getSourceValue,
    getSourceTotalCg,
    getMonthlyTotal,
    getTotals,
    getRate,
  } = useRevenue();

  const { time, getMonthStatus } = useTime();

  // Current month for the configured year
  const currentMonth = useMemo(() => {
    if (config.year === time.currentYear) {
      return time.currentMonth;
    }
    // If viewing past year, use December; future year, use January
    return config.year < time.currentYear ? 'dec' : 'jan';
  }, [config.year, time.currentYear, time.currentMonth]);

  // Get months up to current (for YTD calculations)
  const ytdMonths = useMemo(() => {
    const currentIndex = MONTHS.indexOf(currentMonth);
    return MONTHS.slice(0, currentIndex + 1);
  }, [currentMonth]);

  /**
   * YTD Summary - core metrics
   */
  const ytdSummary = useMemo((): YTDSummary => {
    const expectedTotals = getTotals('expected');
    const actualTotals = getTotals('actual');

    // YTD calculations (sum only months up to current)
    let ytdExpected = 0;
    let ytdActual = 0;

    for (const month of ytdMonths) {
      ytdExpected += getMonthlyTotal(month, 'expected');
      ytdActual += getMonthlyTotal(month, 'actual');
    }

    const currentMonthExpected = getMonthlyTotal(currentMonth, 'expected');
    const currentMonthActual = getMonthlyTotal(currentMonth, 'actual');

    // Calculate projected EOY based on current run rate
    const monthsElapsed = ytdMonths.length;
    const avgMonthlyActual = monthsElapsed > 0 ? ytdActual / monthsElapsed : 0;
    const remainingMonths = 12 - monthsElapsed;
    const projectedEOY = ytdActual + (avgMonthlyActual * remainingMonths);

    return {
      revenue: calculateVariance(ytdExpected, ytdActual),
      net: calculateVariance(expectedTotals.net, actualTotals.net),
      currentMonth: {
        month: currentMonth,
        actual: currentMonthActual,
        expected: currentMonthExpected,
        percentComplete: currentMonthExpected > 0
          ? Math.round((currentMonthActual / currentMonthExpected) * 100)
          : 0,
      },
      projectedEOY,
      projectedEOYVariance: calculateVariance(expectedTotals.totalRevenue, projectedEOY),
    };
  }, [getTotals, getMonthlyTotal, ytdMonths, currentMonth]);

  /**
   * Source performance metrics
   */
  const sourcePerformance = useMemo((): SourcePerformance[] => {
    return sources.map(source => {
      const ytdExpected = getSourceTotalCg(source, 'expected');
      const ytdActual = getSourceTotalCg(source, 'actual');

      // Monthly values for trend analysis
      const monthlyActuals = MONTHS.map(m => getSourceValue(source, m, 'actual') * getRate(source.currency));
      const nonZeroMonths = monthlyActuals.filter(v => v > 0);

      // Find best and worst months
      let bestMonth: SourcePerformance['bestMonth'] = null;
      let worstMonth: SourcePerformance['worstMonth'] = null;

      MONTHS.forEach((month, i) => {
        const amount = monthlyActuals[i];
        if (amount > 0) {
          if (!bestMonth || amount > bestMonth.amount) {
            bestMonth = { month, amount };
          }
          if (!worstMonth || amount < worstMonth.amount) {
            worstMonth = { month, amount };
          }
        }
      });

      return {
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        currency: source.currency,
        ytdExpected,
        ytdActual,
        variance: calculateVariance(ytdExpected, ytdActual),
        monthlyTrend: determineTrend(nonZeroMonths),
        growthRate: calculateGrowthRate(nonZeroMonths),
        reliability: calculateReliability(source, getSourceValue),
        bestMonth,
        worstMonth,
      };
    });
  }, [sources, getSourceTotalCg, getSourceValue, getRate]);

  /**
   * Top performers (exceeding expectations)
   */
  const topPerformers = useMemo(() => {
    return [...sourcePerformance]
      .filter(s => s.variance.isPositive && s.ytdActual > 0)
      .sort((a, b) => b.variance.difference - a.variance.difference)
      .slice(0, 5);
  }, [sourcePerformance]);

  /**
   * Underperformers (below expectations)
   */
  const underperformers = useMemo(() => {
    return [...sourcePerformance]
      .filter(s => !s.variance.isPositive && s.ytdExpected > 0)
      .sort((a, b) => a.variance.difference - b.variance.difference)
      .slice(0, 5);
  }, [sourcePerformance]);

  /**
   * Get analysis for a specific month
   */
  const getMonthAnalysis = useCallback((month: Month): MonthAnalysis => {
    const totalExpected = getMonthlyTotal(month, 'expected');
    const totalActual = getMonthlyTotal(month, 'actual');

    let localExpected = 0, localActual = 0;
    let foreignExpected = 0, foreignActual = 0;

    const sourcesData = sources.map(source => {
      const expected = getSourceValue(source, month, 'expected') * getRate(source.currency);
      const actual = getSourceValue(source, month, 'actual') * getRate(source.currency);

      if (source.type === 'local') {
        localExpected += expected;
        localActual += actual;
      } else {
        foreignExpected += expected;
        foreignActual += actual;
      }

      return {
        sourceId: source.id,
        sourceName: source.name,
        expected,
        actual,
        variance: calculateVariance(expected, actual),
      };
    });

    return {
      month,
      year: config.year,
      totalExpected,
      totalActual,
      variance: calculateVariance(totalExpected, totalActual),
      byType: {
        local: { expected: localExpected, actual: localActual },
        foreign: { expected: foreignExpected, actual: foreignActual },
      },
      sources: sourcesData.sort((a, b) => b.actual - a.actual),
    };
  }, [sources, config.year, getSourceValue, getMonthlyTotal, getRate]);

  /**
   * Monthly data for charts (all 12 months)
   */
  const monthlyChartData = useMemo(() => {
    return MONTHS.map(month => {
      const status = getMonthStatus(month, config.year);
      return {
        month,
        expected: getMonthlyTotal(month, 'expected'),
        actual: getMonthlyTotal(month, 'actual'),
        status,
        isPast: status === 'past',
        isCurrent: status === 'current',
        isFuture: status === 'future',
      };
    });
  }, [getMonthlyTotal, getMonthStatus, config.year]);

  /**
   * Variance heatmap data (sources × months)
   */
  const varianceHeatmap = useMemo(() => {
    return sources.map(source => ({
      sourceId: source.id,
      sourceName: source.name,
      months: MONTHS.map(month => {
        const expected = getSourceValue(source, month, 'expected') * getRate(source.currency);
        const actual = getSourceValue(source, month, 'actual') * getRate(source.currency);
        return {
          month,
          expected,
          actual,
          variance: calculateVariance(expected, actual),
        };
      }),
    }));
  }, [sources, getSourceValue, getRate]);

  /**
   * Generate insights based on data
   */
  const insights = useMemo((): Insight[] => {
    const result: Insight[] = [];

    // Check for missing actual data
    const missingActuals = sources.filter(source => {
      const currentActual = getSourceValue(source, currentMonth, 'actual');
      const currentExpected = getSourceValue(source, currentMonth, 'expected');
      return currentExpected > 0 && currentActual === 0;
    });

    if (missingActuals.length > 0) {
      result.push({
        id: 'missing-actuals',
        type: 'action',
        title: 'Missing Actual Revenue',
        description: `${missingActuals.length} source${missingActuals.length !== 1 ? 's' : ''} have no actual revenue entered for ${currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}`,
        metric: `${missingActuals.length} sources`,
      });
    }

    // MRR contribution
    const mrrSources = sources.filter(s => s.isRecurring);
    if (mrrSources.length > 0) {
      const mrrTotal = mrrSources.reduce((sum, s) => sum + (s.recurringAmount * 12 * getRate(s.currency)), 0);
      const totalExpected = getTotals('expected').totalRevenue;
      const mrrPercent = totalExpected > 0 ? Math.round((mrrTotal / totalExpected) * 100) : 0;

      result.push({
        id: 'mrr-contribution',
        type: 'info',
        title: 'Recurring Revenue',
        description: `MRR sources are contributing ${mrrPercent}% of expected revenue`,
        metric: `${mrrPercent}%`,
      });
    }

    // Foreign vs Local revenue
    const foreignTotal = sources
      .filter(s => s.type === 'foreign')
      .reduce((sum, s) => sum + getSourceTotalCg(s, 'actual'), 0);
    const totalActual = getTotals('actual').totalRevenue;
    if (totalActual > 0) {
      const foreignPercent = Math.round((foreignTotal / totalActual) * 100);
      if (foreignPercent > 50) {
        result.push({
          id: 'foreign-revenue',
          type: 'success',
          title: 'Tax-Advantaged Revenue',
          description: `Foreign revenue (no local profit tax): ${foreignPercent}% of total`,
          metric: `${foreignPercent}%`,
        });
      }
    }

    // Growth rate
    if (ytdSummary.revenue.actual > 0 && ytdMonths.length >= 3) {
      const monthlyActuals = ytdMonths.map(m => getMonthlyTotal(m, 'actual'));
      const growthRate = calculateGrowthRate(monthlyActuals);
      if (Math.abs(growthRate) > 0.05) {
        result.push({
          id: 'growth-trend',
          type: growthRate > 0 ? 'success' : 'warning',
          title: growthRate > 0 ? 'Growing Revenue' : 'Declining Revenue',
          description: `${growthRate > 0 ? '+' : ''}${(growthRate * 100).toFixed(1)}% month-over-month average`,
          metric: `${(growthRate * 100).toFixed(1)}%`,
        });
      }
    }

    // Critical underperformers
    const criticalSources = underperformers.filter(s => s.variance.status === 'critical');
    if (criticalSources.length > 0) {
      result.push({
        id: 'critical-sources',
        type: 'warning',
        title: 'Sources Need Attention',
        description: `${criticalSources.length} source${criticalSources.length !== 1 ? 's are' : ' is'} more than 20% below target`,
        metric: `${criticalSources.length} critical`,
      });
    }

    return result;
  }, [sources, currentMonth, getSourceValue, getSourceTotalCg, getTotals, getMonthlyTotal, ytdSummary, ytdMonths, underperformers, getRate]);

  /**
   * Generate forecast with scenarios
   */
  const generateScenarioForecast = useCallback((
    periods: number,
    method: ForecastMethod,
    scenario: ForecastScenario = 'baseline'
  ): ForecastWithConfidence[] => {
    // Get monthly actual data
    const monthlyData = MONTHS.map((month, i) => ({
      month: `${config.year}-${String(i + 1).padStart(2, '0')}`,
      label: month,
      total: getMonthlyTotal(month, 'actual'),
    })).filter(d => d.total > 0);

    if (monthlyData.length === 0) return [];

    const baseForecast = generateForecast(monthlyData, periods, method);

    // Scenario adjustments
    const adjustmentFactors: Record<ForecastScenario, number> = {
      conservative: 0.9,
      baseline: 1.0,
      optimistic: 1.15,
      custom: 1.0,
    };

    const factor = adjustmentFactors[scenario];

    // Calculate confidence based on data consistency
    const values = monthlyData.map(d => d.total);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const coefficientOfVariation = avg > 0 ? Math.sqrt(variance) / avg : 1;
    const baseConfidence = Math.max(20, Math.min(95, 100 - (coefficientOfVariation * 100)));

    return baseForecast.map((f, i) => {
      // Confidence decreases for further predictions
      const distancePenalty = i * 5;
      const confidence = Math.max(20, baseConfidence - distancePenalty);

      const predicted = f.predicted * factor;
      const uncertaintyRange = predicted * (1 - confidence / 100);

      return {
        month: f.month,
        predicted,
        confidence,
        lowerBound: predicted - uncertaintyRange,
        upperBound: predicted + uncertaintyRange,
        method: f.method,
      };
    });
  }, [config.year, getMonthlyTotal]);

  /**
   * Source-level forecasts
   */
  const getSourceForecasts = useCallback((
    periods: number,
    method: ForecastMethod
  ): SourceForecast[] => {
    return sources.map(source => {
      const monthlyData = MONTHS.map((month, i) => ({
        month: `${config.year}-${String(i + 1).padStart(2, '0')}`,
        label: month,
        total: getSourceValue(source, month, 'actual') * getRate(source.currency),
      })).filter(d => d.total > 0);

      if (monthlyData.length === 0) {
        return {
          sourceId: source.id,
          sourceName: source.name,
          forecasts: [],
          overallConfidence: 0,
        };
      }

      const baseForecast = generateForecast(monthlyData, periods, method);

      // MRR sources have higher confidence
      const mrrBoost = source.isRecurring ? 20 : 0;
      const values = monthlyData.map(d => d.total);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
      const coefficientOfVariation = avg > 0 ? Math.sqrt(variance) / avg : 1;
      const baseConfidence = Math.min(95, Math.max(20, 100 - (coefficientOfVariation * 100) + mrrBoost));

      const forecasts: ForecastWithConfidence[] = baseForecast.map((f, i) => {
        const confidence = Math.max(20, baseConfidence - (i * 5));
        const uncertaintyRange = f.predicted * (1 - confidence / 100);

        return {
          month: f.month,
          predicted: f.predicted,
          confidence,
          lowerBound: f.predicted - uncertaintyRange,
          upperBound: f.predicted + uncertaintyRange,
          method: f.method,
        };
      });

      return {
        sourceId: source.id,
        sourceName: source.name,
        forecasts,
        overallConfidence: baseConfidence,
      };
    });
  }, [sources, config.year, getSourceValue, getRate]);

  return {
    // Core data
    sources,
    config,
    currentMonth,
    ytdMonths,

    // YTD Summary
    ytdSummary,

    // Performance rankings
    sourcePerformance,
    topPerformers,
    underperformers,

    // Monthly analysis
    getMonthAnalysis,
    monthlyChartData,
    varianceHeatmap,

    // Insights
    insights,

    // Forecasting
    generateScenarioForecast,
    getSourceForecasts,

    // Re-export commonly used functions
    getMonthlyTotal,
    getSourceValue,
    getTotals,
    getRate,
  };
}
