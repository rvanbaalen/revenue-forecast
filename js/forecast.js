/**
 * Revenue Forecasting Module
 * Provides multiple forecasting methods for revenue prediction
 */

class RevenueForecast {
    /**
     * Calculate simple moving average
     * @param {number[]} data - Array of values
     * @param {number} period - Number of periods for the moving average
     */
    static movingAverage(data, period = 3) {
        if (data.length < period) {
            return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
        }

        const recentData = data.slice(-period);
        return recentData.reduce((a, b) => a + b, 0) / period;
    }

    /**
     * Calculate weighted moving average (more recent data has higher weight)
     * @param {number[]} data - Array of values
     * @param {number} period - Number of periods
     */
    static weightedMovingAverage(data, period = 3) {
        if (data.length === 0) return 0;

        const actualPeriod = Math.min(period, data.length);
        const recentData = data.slice(-actualPeriod);

        let weightedSum = 0;
        let weightSum = 0;

        recentData.forEach((value, index) => {
            const weight = index + 1;
            weightedSum += value * weight;
            weightSum += weight;
        });

        return weightedSum / weightSum;
    }

    /**
     * Calculate exponential moving average
     * @param {number[]} data - Array of values
     * @param {number} alpha - Smoothing factor (0 < alpha <= 1)
     */
    static exponentialMovingAverage(data, alpha = 0.3) {
        if (data.length === 0) return 0;
        if (data.length === 1) return data[0];

        let ema = data[0];
        for (let i = 1; i < data.length; i++) {
            ema = alpha * data[i] + (1 - alpha) * ema;
        }

        return ema;
    }

    /**
     * Linear regression for trend analysis
     * @param {number[]} data - Array of values
     * @returns {Object} - { slope, intercept, predict(x) }
     */
    static linearRegression(data) {
        const n = data.length;
        if (n === 0) return { slope: 0, intercept: 0, predict: () => 0 };
        if (n === 1) return { slope: 0, intercept: data[0], predict: () => data[0] };

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += data[i];
            sumXY += i * data[i];
            sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return {
            slope,
            intercept,
            predict: (x) => slope * x + intercept
        };
    }

    /**
     * Calculate growth rate
     * @param {number[]} data - Array of values
     */
    static calculateGrowthRate(data) {
        if (data.length < 2) return 0;

        const rates = [];
        for (let i = 1; i < data.length; i++) {
            if (data[i - 1] !== 0) {
                rates.push((data[i] - data[i - 1]) / data[i - 1]);
            }
        }

        if (rates.length === 0) return 0;
        return rates.reduce((a, b) => a + b, 0) / rates.length;
    }

    /**
     * Generate forecast for future periods
     * @param {Object[]} monthlyData - Array of { month, total } sorted by date
     * @param {number} periods - Number of future periods to forecast
     * @param {string} method - Forecasting method to use
     */
    static generateForecast(monthlyData, periods = 6, method = 'weighted') {
        const values = monthlyData.map(d => d.total);
        const forecasts = [];

        if (values.length === 0) {
            return forecasts;
        }

        let baseValue;
        let trend = 0;

        switch (method) {
            case 'simple':
                baseValue = this.movingAverage(values);
                break;

            case 'weighted':
                baseValue = this.weightedMovingAverage(values);
                trend = this.calculateGrowthRate(values);
                break;

            case 'exponential':
                baseValue = this.exponentialMovingAverage(values);
                trend = this.calculateGrowthRate(values) * 0.5; // Dampened trend
                break;

            case 'linear':
                const regression = this.linearRegression(values);
                for (let i = 0; i < periods; i++) {
                    const futureMonth = this.addMonths(monthlyData[monthlyData.length - 1].month, i + 1);
                    forecasts.push({
                        month: futureMonth,
                        predicted: Math.max(0, regression.predict(values.length + i)),
                        method: 'linear'
                    });
                }
                return forecasts;

            default:
                baseValue = this.weightedMovingAverage(values);
        }

        // Generate forecasts with optional trend
        for (let i = 0; i < periods; i++) {
            const futureMonth = this.addMonths(monthlyData[monthlyData.length - 1].month, i + 1);
            const growthFactor = Math.pow(1 + trend, i + 1);
            forecasts.push({
                month: futureMonth,
                predicted: Math.max(0, baseValue * growthFactor),
                method
            });
        }

        return forecasts;
    }

    /**
     * Add months to a YYYY-MM string
     * @param {string} monthStr - Month string in YYYY-MM format
     * @param {number} months - Number of months to add
     */
    static addMonths(monthStr, months) {
        const [year, month] = monthStr.split('-').map(Number);
        const date = new Date(year, month - 1 + months, 1);
        const newYear = date.getFullYear();
        const newMonth = String(date.getMonth() + 1).padStart(2, '0');
        return `${newYear}-${newMonth}`;
    }

    /**
     * Calculate forecast accuracy metrics (for backtesting)
     * @param {number[]} actual - Actual values
     * @param {number[]} predicted - Predicted values
     */
    static calculateAccuracy(actual, predicted) {
        if (actual.length !== predicted.length || actual.length === 0) {
            return { mape: null, rmse: null, mae: null };
        }

        let sumAbsPercError = 0;
        let sumSquaredError = 0;
        let sumAbsError = 0;
        let validCount = 0;

        for (let i = 0; i < actual.length; i++) {
            const error = actual[i] - predicted[i];
            sumSquaredError += error * error;
            sumAbsError += Math.abs(error);

            if (actual[i] !== 0) {
                sumAbsPercError += Math.abs(error / actual[i]);
                validCount++;
            }
        }

        return {
            mape: validCount > 0 ? (sumAbsPercError / validCount) * 100 : null, // Mean Absolute Percentage Error
            rmse: Math.sqrt(sumSquaredError / actual.length), // Root Mean Square Error
            mae: sumAbsError / actual.length // Mean Absolute Error
        };
    }

    /**
     * Detect seasonality in the data
     * @param {number[]} data - Array of monthly values (at least 12 months)
     */
    static detectSeasonality(data) {
        if (data.length < 12) {
            return { hasSeasonality: false, seasonalFactors: null };
        }

        // Calculate overall average
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg === 0) return { hasSeasonality: false, seasonalFactors: null };

        // Calculate seasonal factors for each month
        const monthlyTotals = new Array(12).fill(0);
        const monthlyCounts = new Array(12).fill(0);

        data.forEach((value, index) => {
            const monthIndex = index % 12;
            monthlyTotals[monthIndex] += value;
            monthlyCounts[monthIndex]++;
        });

        const seasonalFactors = monthlyTotals.map((total, i) => {
            const monthAvg = monthlyCounts[i] > 0 ? total / monthlyCounts[i] : avg;
            return monthAvg / avg;
        });

        // Check if there's significant seasonality (variance in factors)
        const factorAvg = seasonalFactors.reduce((a, b) => a + b, 0) / 12;
        const factorVariance = seasonalFactors.reduce((sum, f) => sum + Math.pow(f - factorAvg, 2), 0) / 12;

        return {
            hasSeasonality: factorVariance > 0.01, // Threshold for significance
            seasonalFactors
        };
    }

    /**
     * Apply seasonal adjustment to forecast
     * @param {number} baseValue - Base forecast value
     * @param {string} month - Target month (YYYY-MM)
     * @param {number[]} seasonalFactors - Array of 12 seasonal factors
     */
    static applySeasonalAdjustment(baseValue, month, seasonalFactors) {
        const monthIndex = parseInt(month.split('-')[1]) - 1;
        return baseValue * seasonalFactors[monthIndex];
    }

    /**
     * Get statistics summary for the data
     * @param {number[]} data - Array of values
     */
    static getStatistics(data) {
        if (data.length === 0) {
            return { min: 0, max: 0, avg: 0, median: 0, stdDev: 0, total: 0 };
        }

        const sorted = [...data].sort((a, b) => a - b);
        const total = data.reduce((a, b) => a + b, 0);
        const avg = total / data.length;

        const variance = data.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / data.length;

        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            avg,
            median: sorted.length % 2 === 0
                ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                : sorted[Math.floor(sorted.length / 2)],
            stdDev: Math.sqrt(variance),
            total
        };
    }
}

export default RevenueForecast;
