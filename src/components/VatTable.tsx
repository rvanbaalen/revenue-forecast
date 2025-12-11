import type { RevenueSource, AppConfig, Month } from '../types';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';

interface VatTableProps {
  sources: RevenueSource[];
  config: AppConfig;
  dataType: 'expected' | 'actual';
  getSourceValue: (source: RevenueSource, month: Month, type: 'expected' | 'actual') => number;
  getSourceVat: (source: RevenueSource, type: 'expected' | 'actual') => number;
  getMonthlyVat: (month: Month, type: 'expected' | 'actual') => number;
  getRate: (code: string) => number;
}

export function VatTable({
  sources,
  config,
  dataType,
  getSourceValue,
  getSourceVat,
  getMonthlyVat,
  getRate,
}: VatTableProps) {
  const vatRate = config.vatRate / 100;
  const title = dataType === 'expected' ? 'VAT to Reserve (Expected)' : 'VAT to Reserve (Actual)';
  const titleColor = dataType === 'expected' ? 'text-amber-400' : 'text-emerald-400';
  const totalVat = sources.reduce((sum, s) => sum + getSourceVat(s, dataType), 0);

  return (
    <section className="glass rounded-2xl p-6 mb-6 fade-in">
      <h2 className={`text-lg font-semibold ${titleColor} mb-4`}>
        {title} <span className="text-slate-400 text-sm font-normal">(Local Revenue Only, in Cg)</span>
      </h2>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="vat-header">
              <th className="px-3 py-3 text-left font-semibold text-slate-300 rounded-tl-lg">Source</th>
              {MONTHS.map(month => (
                <th key={month} className="px-3 py-3 text-right font-semibold text-slate-300">
                  {MONTH_LABELS[month]}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-semibold text-slate-300 rounded-tr-lg">Total VAT</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(source => {
              const isLocal = source.type === 'local';
              const rate = getRate(source.currency);

              return (
                <tr key={source.id} className="vat-row border-b border-slate-700/30">
                  <td className="px-3 py-2 text-slate-300">{source.name}</td>
                  {MONTHS.map(month => {
                    const monthValue = getSourceValue(source, month, dataType);
                    const vatAmount = isLocal ? monthValue * rate * vatRate : 0;
                    return (
                      <td key={month} className="px-3 py-2 text-right font-mono text-emerald-400/80">
                        {formatCurrency(vatAmount, false)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono text-emerald-400">
                    {formatCurrency(getSourceVat(source, dataType), false)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="vat-row font-semibold">
              <td className="px-3 py-3 text-slate-300">Monthly VAT Total</td>
              {MONTHS.map(month => (
                <td key={month} className="px-3 py-3 text-right font-mono text-emerald-400">
                  {formatCurrency(getMonthlyVat(month, dataType), false)}
                </td>
              ))}
              <td className="px-3 py-3 text-right font-mono text-emerald-400">
                {formatCurrency(totalVat, false)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
