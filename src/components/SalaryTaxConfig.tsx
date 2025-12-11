import type { Salary, SalaryTax } from '../types';
import { formatCurrency } from '../utils/format';

interface SalaryTaxConfigProps {
  salary: Salary;
  taxes: SalaryTax[];
  salaryTotal: number;
  monthsWorked: number;
  onAddTax: (salaryId: number) => void;
  onUpdateTax: (id: number, updates: Partial<SalaryTax>) => void;
  onDeleteTax: (id: number) => void;
}

export function SalaryTaxConfig({
  salary,
  taxes,
  salaryTotal,
  monthsWorked,
  onAddTax,
  onUpdateTax,
  onDeleteTax,
}: SalaryTaxConfigProps) {
  const calculateTaxAmount = (tax: SalaryTax): number => {
    if (tax.type === 'percentage') {
      return salaryTotal * (tax.value / 100);
    }
    return tax.value * monthsWorked;
  };

  const totalTax = taxes.reduce((sum, tax) => sum + calculateTaxAmount(tax), 0);
  const totalTaxPct = salaryTotal > 0 ? (totalTax / salaryTotal) * 100 : 0;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">
          Tax Configuration for {salary.name}
        </h3>
        <button
          onClick={() => onAddTax(salary.id)}
          className="px-3 py-1 text-xs font-medium text-sky-400 hover:text-sky-300 border border-sky-400/50 hover:border-sky-300 rounded transition-colors"
        >
          + Add Tax
        </button>
      </div>

      {taxes.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No taxes configured</p>
      ) : (
        <div className="space-y-2">
          {taxes.map((tax) => {
            const taxAmount = calculateTaxAmount(tax);
            const taxPct = salaryTotal > 0 ? (taxAmount / salaryTotal) * 100 : 0;

            return (
              <div
                key={tax.id}
                className="flex items-center gap-3 p-2 bg-slate-700/30 rounded"
              >
                <input
                  type="text"
                  value={tax.name}
                  onChange={(e) => onUpdateTax(tax.id, { name: e.target.value })}
                  placeholder="Tax name"
                  className="flex-1 px-2 py-1 rounded text-slate-200 text-sm bg-slate-700/50 min-w-0"
                />
                <select
                  value={tax.type}
                  onChange={(e) =>
                    onUpdateTax(tax.id, { type: e.target.value as 'percentage' | 'fixed' })
                  }
                  className="px-2 py-1 rounded text-slate-200 text-sm bg-slate-700/50"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed/month</option>
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={tax.value || ''}
                    step={0.01}
                    min={0}
                    onChange={(e) =>
                      onUpdateTax(tax.id, { value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-20 px-2 py-1 rounded text-slate-200 text-sm font-mono text-right bg-slate-700/50"
                  />
                  <span className="text-slate-400 text-xs w-6">
                    {tax.type === 'percentage' ? '%' : 'Cg'}
                  </span>
                </div>
                <span className="text-purple-300 text-sm font-mono w-24 text-right">
                  {formatCurrency(taxAmount, false)}
                </span>
                <span className="text-slate-400 text-xs w-14 text-right">
                  ({taxPct.toFixed(1)}%)
                </span>
                <button
                  onClick={() => onDeleteTax(tax.id)}
                  className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                >
                  Remove
                </button>
              </div>
            );
          })}

          {taxes.length > 1 && (
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-600/50">
              <span className="text-sm text-slate-400">Total Tax:</span>
              <span className="text-purple-300 font-mono font-semibold">
                {formatCurrency(totalTax, false)}
              </span>
              <span className="text-slate-400 text-xs">
                ({totalTaxPct.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
