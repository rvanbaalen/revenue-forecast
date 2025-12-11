import { useRevenue } from '../context/RevenueContext';
import { SalaryTable, SalaryTaxConfig } from '../components';
import { MONTHS } from '../types';
import { formatCurrency } from '../utils/format';

export function SalaryPage() {
  const { salaries, getSalaryTotal, getSalaryTaxCg, getMonthlySalary } = useRevenue();

  // Calculate summary stats
  const totalGross = salaries.reduce((sum, s) => sum + getSalaryTotal(s), 0);
  const totalTax = salaries.reduce((sum, s) => sum + getSalaryTaxCg(s), 0);
  const totalNet = totalGross + totalTax;
  const monthlyAvg = totalGross / 12;

  return (
    <>
      <h1 className="text-2xl font-bold text-purple-400 mb-6">Salaries & Payroll</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Total Gross Salaries</p>
          <p className="text-2xl font-bold text-slate-200">{formatCurrency(totalGross)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Total Salary Tax</p>
          <p className="text-2xl font-bold text-amber-300">{formatCurrency(totalTax)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Total Cost (Gross + Tax)</p>
          <p className="text-2xl font-bold text-sky-300">{formatCurrency(totalNet)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Monthly Avg Gross</p>
          <p className="text-2xl font-bold text-emerald-300">{formatCurrency(monthlyAvg)}</p>
        </div>
      </div>

      {/* Monthly Overview */}
      <section className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-300 mb-4">Monthly Overview</h2>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {MONTHS.map(month => {
            const monthTotal = getMonthlySalary(month);
            return (
              <div key={month} className="text-center p-2 rounded-lg bg-slate-800/30">
                <p className="text-xs text-slate-400 uppercase mb-1">{month}</p>
                <p className="text-sm font-mono text-slate-200">
                  {monthTotal > 0 ? formatCurrency(monthTotal, false) : '-'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <SalaryTable />

      {/* Tax Configuration Section */}
      {salaries.length > 0 && (
        <section className="glass rounded-2xl p-6 fade-in">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">Tax Configuration</h2>
          <p className="text-sm text-slate-400 mb-4">
            Configure one or more taxes for each employee. Taxes can be percentage-based (calculated on total gross salary)
            or fixed amount per month worked.
          </p>
          {salaries.map(salary => (
            <SalaryTaxConfig key={salary.id} salaryId={salary.id} />
          ))}
        </section>
      )}
    </>
  );
}
