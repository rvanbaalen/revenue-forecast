import { useRevenue } from '../context/RevenueContext';
import { SalaryTable } from '../components';
import { MONTHS } from '../types';
import { formatCurrency } from '../utils/format';

export function SalaryPage() {
  const {
    salaries,
    addSalary,
    updateSalary,
    updateSalaryAmount,
    deleteSalary,
    getSalaryTotal,
    getSalaryTaxCg,
    getMonthlySalary,
  } = useRevenue();

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

      <SalaryTable
        salaries={salaries}
        onAddSalary={addSalary}
        onUpdateSalary={updateSalary}
        onUpdateSalaryAmount={updateSalaryAmount}
        onDeleteSalary={deleteSalary}
        getSalaryTotal={getSalaryTotal}
        getSalaryTaxCg={getSalaryTaxCg}
        getMonthlySalary={getMonthlySalary}
      />
    </>
  );
}
