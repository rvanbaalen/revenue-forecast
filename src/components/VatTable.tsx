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
          <CardTitle className="text-base font-medium text-foreground">
            VAT to Reserve
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({config.vatRate}% on local revenue)
            </span>
          </CardTitle>
          <span className="text-sm font-mono text-foreground font-medium">
            Total: {formatCurrency(totalVat)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm table-clean">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground w-32">Source</th>
                {MONTHS.map(month => {
                  const status = getMonthStatus(month, config.year);
                  return (
                    <th key={month} className={cn(
                      "px-2 py-3 text-right font-medium text-muted-foreground min-w-[80px]",
                      status === 'current' && 'bg-accent text-foreground'
                    )}>
                      {MONTH_LABELS[month]}
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(source => {
                const isLocal = source.type === 'local';
                const rate = getRate(source.currency);

                if (!isLocal) return null;

                return (
                  <tr key={source.id}>
                    <td className="px-3 py-2 text-muted-foreground">{source.name}</td>
                    {MONTHS.map(month => {
                      const status = getMonthStatus(month, config.year);
                      const monthValue = getSourceValue(source, month, dataType);
                      const vatAmount = monthValue * rate * vatRate;
                      return (
                        <td key={month} className={cn(
                          "px-2 py-2 text-right font-mono text-muted-foreground",
                          status === 'current' && 'bg-accent'
                        )}>
                          {vatAmount > 0 ? formatCurrency(vatAmount, false) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-mono text-foreground font-medium">
                      {formatCurrency(getSourceVat(source, dataType), false)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-medium">
                <td className="px-3 py-3 text-muted-foreground">Monthly Total</td>
                {MONTHS.map(month => {
                  const status = getMonthStatus(month, config.year);
                  return (
                    <td key={month} className={cn(
                      "px-2 py-3 text-right font-mono",
                      status === 'current' ? 'text-foreground bg-accent' : 'text-muted-foreground'
                    )}>
                      {formatCurrency(getMonthlyVat(month, dataType), false)}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-right font-mono text-foreground font-semibold">
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
