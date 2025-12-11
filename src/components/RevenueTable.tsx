import type { RevenueSource, AppConfig, Month } from '../types';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';

interface RevenueTableProps {
  sources: RevenueSource[];
  config: AppConfig;
  dataType: 'expected' | 'actual';
  onAddSource: () => void;
  onUpdateSource: (id: number, updates: Partial<RevenueSource>) => void;
  onUpdateRevenue: (id: number, month: Month, value: number, type: 'expected' | 'actual') => void;
  onDeleteSource: (id: number) => void;
  getSourceTotal: (source: RevenueSource, type: 'expected' | 'actual') => number;
  getSourceTotalCg: (source: RevenueSource, type: 'expected' | 'actual') => number;
  getProfitTax: (source: RevenueSource, type: 'expected' | 'actual') => number;
  getMonthlyTotal: (month: Month, type: 'expected' | 'actual') => number;
  onMonthHeaderClick?: (month: Month) => void;
}

export function RevenueTable({
  sources,
  config,
  dataType,
  onAddSource,
  onUpdateSource,
  onUpdateRevenue,
  onDeleteSource,
  getSourceTotal,
  getSourceTotalCg,
  getProfitTax,
  getMonthlyTotal,
  onMonthHeaderClick,
}: RevenueTableProps) {
  const headerClass = dataType === 'expected' ? 'expected-header' : 'actual-header';
  const title = dataType === 'expected' ? 'Expected Revenue' : 'Actual Revenue';
  const titleColor = dataType === 'expected' ? 'text-amber-400' : 'text-emerald-400';

  const grandTotalCg = sources.reduce((sum, s) => sum + getSourceTotalCg(s, dataType), 0);
  const totalProfitTax = sources.reduce((sum, s) => sum + getProfitTax(s, dataType), 0);

  return (
    <section className="glass rounded-2xl p-6 mb-6 fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold ${titleColor}`}>{title}</h2>
        <button
          onClick={onAddSource}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white"
        >
          + Add Source
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className={headerClass}>
              <th className="px-3 py-3 text-left font-semibold text-slate-300 rounded-tl-lg">Source</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-300">Type</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-300">Currency</th>
              {dataType === 'expected' && (
                <th className="px-3 py-3 text-center font-semibold text-slate-300">MRR</th>
              )}
              {MONTHS.map(month => (
                <th key={month} className="px-3 py-3 text-right font-semibold text-slate-300">
                  {dataType === 'actual' && onMonthHeaderClick ? (
                    <button
                      onClick={() => onMonthHeaderClick(month)}
                      className="hover:text-emerald-400 hover:underline transition-colors cursor-pointer"
                      title={`Click to confirm ${MONTH_LABELS[month]} revenue`}
                    >
                      {MONTH_LABELS[month]}
                    </button>
                  ) : (
                    MONTH_LABELS[month]
                  )}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-semibold text-slate-300">Total</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-300">Total (Cg)</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-300">Profit Tax</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-300 rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(source => (
              <tr key={source.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={source.name}
                    onChange={(e) => onUpdateSource(source.id, { name: e.target.value })}
                    className="w-32 px-2 py-1 rounded text-slate-200 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={source.type}
                    onChange={(e) => onUpdateSource(source.id, { type: e.target.value as 'local' | 'foreign' })}
                    className="px-2 py-1 rounded text-slate-200 text-sm"
                  >
                    <option value="local">Local</option>
                    <option value="foreign">Foreign</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={source.currency}
                    onChange={(e) => onUpdateSource(source.id, { currency: e.target.value })}
                    className="px-2 py-1 rounded text-slate-200 text-sm font-mono"
                  >
                    {config.currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </td>
                {dataType === 'expected' && (
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="checkbox"
                        checked={source.isRecurring}
                        onChange={(e) => onUpdateSource(source.id, { isRecurring: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      {source.isRecurring && (
                        <input
                          type="number"
                          value={source.recurringAmount || ''}
                          onChange={(e) => onUpdateSource(source.id, { recurringAmount: parseFloat(e.target.value) || 0 })}
                          placeholder="MRR"
                          className="w-20 px-2 py-1 rounded text-slate-200 text-sm font-mono currency-input"
                        />
                      )}
                    </div>
                  </td>
                )}
                {MONTHS.map(month => (
                  <td key={month} className="px-1 py-2">
                    {source.isRecurring && dataType === 'expected' ? (
                      <div className="editable-cell w-full px-2 py-1 rounded text-slate-400 text-sm font-mono text-right">
                        {formatCurrency(source.recurringAmount, false)}
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={source[dataType][month] || ''}
                        onChange={(e) => onUpdateRevenue(source.id, month, parseFloat(e.target.value) || 0, dataType)}
                        placeholder="-"
                        className="editable-cell w-full px-2 py-1 rounded text-slate-200 text-sm font-mono currency-input"
                      />
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-mono text-slate-300">
                  {formatCurrency(getSourceTotal(source, dataType), false)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-sky-300">
                  {formatCurrency(getSourceTotalCg(source, dataType), false)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-amber-300">
                  {formatCurrency(getProfitTax(source, dataType), false)}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onDeleteSource(source.id)}
                    className="btn-danger px-2 py-1 rounded text-white text-xs font-medium opacity-70 hover:opacity-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row font-semibold">
              <td className="px-3 py-3 text-slate-300" colSpan={dataType === 'expected' ? 4 : 3}>
                Monthly Total (Cg)
              </td>
              {MONTHS.map(month => (
                <td key={month} className="px-3 py-3 text-right font-mono text-sky-300">
                  {formatCurrency(getMonthlyTotal(month, dataType), false)}
                </td>
              ))}
              <td className="px-3 py-3 text-right font-mono text-sky-300">-</td>
              <td className="px-3 py-3 text-right font-mono text-sky-300">
                {formatCurrency(grandTotalCg, false)}
              </td>
              <td className="px-3 py-3 text-right font-mono text-sky-300">
                {formatCurrency(totalProfitTax, false)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
