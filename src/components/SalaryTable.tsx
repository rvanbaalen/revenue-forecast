import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';

export function SalaryTable() {
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

  const totalSalaryGross = salaries.reduce((sum, s) => sum + getSalaryTotal(s), 0);
  const totalSalaryTax = salaries.reduce((sum, s) => sum + getSalaryTaxCg(s), 0);
  const totalTaxPct = totalSalaryGross > 0 ? (totalSalaryTax / totalSalaryGross) * 100 : 0;

  return (
    <section className="glass rounded-2xl p-6 mb-6 fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-300">Salaries</h2>
        <button
          onClick={addSalary}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white"
        >
          + Add Salary
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="salary-header">
              <th className="px-3 py-3 text-left font-semibold text-slate-300 rounded-tl-lg">Employee</th>
              {MONTHS.map(month => (
                <th key={month} className="px-3 py-3 text-right font-semibold text-slate-300">
                  {MONTH_LABELS[month]}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-semibold text-slate-300">Total Gross</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-300">Tax (Cg)</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-300">Tax (%)</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-300 rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map(salary => {
              const total = getSalaryTotal(salary);
              const taxCg = getSalaryTaxCg(salary);
              const taxPct = total > 0 ? (taxCg / total) * 100 : 0;

              return (
                <tr key={salary.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={salary.name}
                      onChange={(e) => updateSalary(salary.id, { name: e.target.value })}
                      className="w-32 px-2 py-1 rounded text-slate-200 text-sm"
                    />
                  </td>
                  {MONTHS.map(month => (
                    <td key={month} className="px-1 py-2">
                      <input
                        type="number"
                        value={salary.amounts[month] || ''}
                        onChange={(e) => updateSalaryAmount(salary.id, month, parseFloat(e.target.value) || 0)}
                        placeholder="-"
                        className="editable-cell w-full px-2 py-1 rounded text-slate-200 text-sm font-mono currency-input"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono text-purple-300">
                    {formatCurrency(total, false)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-purple-300">
                    {formatCurrency(taxCg, false)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-purple-300/70">
                    {taxPct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => deleteSalary(salary.id)}
                      className="btn-danger px-2 py-1 rounded text-white text-xs font-medium opacity-70 hover:opacity-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="salary-row font-semibold">
              <td className="px-3 py-3 text-slate-300">Monthly Total</td>
              {MONTHS.map(month => (
                <td key={month} className="px-3 py-3 text-right font-mono text-purple-300">
                  {formatCurrency(getMonthlySalary(month), false)}
                </td>
              ))}
              <td className="px-3 py-3 text-right font-mono text-purple-300">
                {formatCurrency(totalSalaryGross, false)}
              </td>
              <td className="px-3 py-3 text-right font-mono text-purple-300">
                {formatCurrency(totalSalaryTax, false)}
              </td>
              <td className="px-3 py-3 text-right font-mono text-purple-300">
                {totalTaxPct.toFixed(1)}%
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
