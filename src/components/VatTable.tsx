import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface VatTableProps {
  dataType: 'expected' | 'actual';
}

export function VatTable({ dataType }: VatTableProps) {
  const {
    sources,
    config,
    getSourceValue,
    getSourceVat,
    getMonthlyVat,
    getRate,
  } = useRevenue();

  const { getMonthStatus } = useTime();

  const vatRate = config.vatRate / 100;
  const totalVat = sources.reduce((sum, s) => sum + getSourceVat(s, dataType), 0);

  // Only show if there are local sources
  const localSources = sources.filter(s => s.type === 'local');
  if (localSources.length === 0) return null;

  return (
    <Card className="fade-in mt-4">
      <CardHeader className="border-b py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-zinc-900">
            VAT to Reserve
            <span className="text-sm font-normal text-zinc-500 ml-2">
              ({config.vatRate}% on local revenue)
            </span>
          </CardTitle>
          <span className="text-sm font-mono text-indigo-600 font-medium">
            Total: {formatCurrency(totalVat)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm table-clean">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left font-medium text-zinc-500 w-32">Source</th>
                {MONTHS.map(month => {
                  const status = getMonthStatus(month, config.year);
                  return (
                    <th key={month} className={cn(
                      "px-2 py-3 text-right font-medium text-zinc-500 min-w-[80px]",
                      status === 'current' && 'bg-indigo-50 text-indigo-600'
                    )}>
                      {MONTH_LABELS[month]}
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-right font-medium text-zinc-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(source => {
                const isLocal = source.type === 'local';
                const rate = getRate(source.currency);

                if (!isLocal) return null;

                return (
                  <tr key={source.id}>
                    <td className="px-3 py-2 text-zinc-600">{source.name}</td>
                    {MONTHS.map(month => {
                      const status = getMonthStatus(month, config.year);
                      const monthValue = getSourceValue(source, month, dataType);
                      const vatAmount = monthValue * rate * vatRate;
                      return (
                        <td key={month} className={cn(
                          "px-2 py-2 text-right font-mono text-zinc-500",
                          status === 'current' && 'bg-indigo-50'
                        )}>
                          {vatAmount > 0 ? formatCurrency(vatAmount, false) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-mono text-indigo-600 font-medium">
                      {formatCurrency(getSourceVat(source, dataType), false)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50 font-medium">
                <td className="px-3 py-3 text-zinc-600">Monthly Total</td>
                {MONTHS.map(month => {
                  const status = getMonthStatus(month, config.year);
                  return (
                    <td key={month} className={cn(
                      "px-2 py-3 text-right font-mono",
                      status === 'current' ? 'text-indigo-600 bg-indigo-50' : 'text-zinc-600'
                    )}>
                      {formatCurrency(getMonthlyVat(month, dataType), false)}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-right font-mono text-indigo-600 font-semibold">
                  {formatCurrency(totalVat, false)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
