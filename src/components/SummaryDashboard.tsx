import { formatCurrency, formatVariance } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';

export function SummaryDashboard() {
  const { getTotals } = useRevenue();

  const expectedTotals = getTotals('expected');
  const actualTotals = getTotals('actual');

  const revenueVariance = formatVariance(expectedTotals.totalRevenue, actualTotals.totalRevenue);
  const netVariance = formatVariance(expectedTotals.net, actualTotals.net);

  return (
    <section className="mb-8 fade-in">
      <h2 className="text-lg font-semibold text-slate-300 mb-4">Summary</h2>

      {/* Expected vs Actual Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Expected Summary */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-md font-semibold text-amber-400 mb-4">Expected (Budget)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="summary-card rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Total Revenue</p>
              <p className="text-xl font-bold font-mono text-slate-200">
                {formatCurrency(expectedTotals.totalRevenue)}
              </p>
            </div>
            <div className="summary-card rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">VAT to Reserve</p>
              <p className="text-xl font-bold font-mono text-emerald-400">
                {formatCurrency(expectedTotals.totalVat)}
              </p>
            </div>
            <div className="summary-card rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Profit Tax Due</p>
              <p className="text-xl font-bold font-mono text-amber-400">
                {formatCurrency(expectedTotals.totalProfitTax)}
              </p>
            </div>
            <div className="summary-card rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Total Salary + Tax</p>
              <p className="text-xl font-bold font-mono text-purple-400">
                {formatCurrency(expectedTotals.totalSalaryGross + expectedTotals.totalSalaryTax)}
              </p>
            </div>
            <div className="summary-card rounded-xl p-4 col-span-2">
              <p className="text-sm text-slate-400 mb-1">Net After All</p>
              <p className="text-2xl font-bold font-mono text-sky-400">
                {formatCurrency(expectedTotals.net)}
              </p>
            </div>
          </div>
        </div>

        {/* Actual Summary */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-md font-semibold text-emerald-400 mb-4">Actual</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="summary-card rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Total Revenue</p>
              <p className="text-xl font-bold font-mono text-slate-200">
                {formatCurrency(actualTotals.totalRevenue)}
              </p>
              <p className={`text-xs font-mono mt-1 ${revenueVariance.isPositive ? 'variance-positive' : 'variance-negative'}`}>
                {revenueVariance.display}
              </p>
            </div>
            <div className="summary-card rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">VAT to Reserve</p>
              <p className="text-xl font-bold font-mono text-emerald-400">
                {formatCurrency(actualTotals.totalVat)}
              </p>
            </div>
            <div className="summary-card rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Profit Tax Due</p>
              <p className="text-xl font-bold font-mono text-amber-400">
                {formatCurrency(actualTotals.totalProfitTax)}
              </p>
            </div>
            <div className="summary-card rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Total Salary + Tax</p>
              <p className="text-xl font-bold font-mono text-purple-400">
                {formatCurrency(actualTotals.totalSalaryGross + actualTotals.totalSalaryTax)}
              </p>
            </div>
            <div className="summary-card rounded-xl p-4 col-span-2">
              <p className="text-sm text-slate-400 mb-1">Net After All</p>
              <p className="text-2xl font-bold font-mono text-sky-400">
                {formatCurrency(actualTotals.net)}
              </p>
              <p className={`text-xs font-mono mt-1 ${netVariance.isPositive ? 'variance-positive' : 'variance-negative'}`}>
                {netVariance.display}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Revenue Variance</p>
          <p className={`text-lg font-bold font-mono ${revenueVariance.isPositive ? 'variance-positive' : 'variance-negative'}`}>
            {revenueVariance.percentage.toFixed(1)}%
          </p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Net Variance</p>
          <p className={`text-lg font-bold font-mono ${netVariance.isPositive ? 'variance-positive' : 'variance-negative'}`}>
            {netVariance.percentage.toFixed(1)}%
          </p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Expected Margin</p>
          <p className="text-lg font-bold font-mono text-slate-200">
            {expectedTotals.totalRevenue > 0
              ? ((expectedTotals.net / expectedTotals.totalRevenue) * 100).toFixed(1)
              : '0'}%
          </p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Actual Margin</p>
          <p className="text-lg font-bold font-mono text-slate-200">
            {actualTotals.totalRevenue > 0
              ? ((actualTotals.net / actualTotals.totalRevenue) * 100).toFixed(1)
              : '0'}%
          </p>
        </div>
      </div>
    </section>
  );
}
