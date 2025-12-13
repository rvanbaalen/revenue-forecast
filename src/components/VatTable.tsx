import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          VAT to Reserve
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({config.vatRate}% on local revenue)
          </span>
        </h2>
        <span className="text-sm font-mono font-medium">
          Total: {formatCurrency(totalVat)}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-40">Source</TableHead>
            {MONTHS.map(month => {
              const status = getMonthStatus(month, config.year);
              return (
                <TableHead
                  key={month}
                  className={cn(
                    "w-20 text-right",
                    status === 'current' && "text-primary font-semibold"
                  )}
                >
                  {MONTH_LABELS[month]}
                </TableHead>
              );
            })}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map(source => {
            const isLocal = source.type === 'local';
            const rate = getRate(source.currency);

            if (!isLocal) return null;

            return (
              <TableRow key={source.id}>
                <TableCell className="text-muted-foreground">{source.name}</TableCell>
                {MONTHS.map(month => {
                  const status = getMonthStatus(month, config.year);
                  const monthValue = getSourceValue(source, month, dataType);
                  const vatAmount = monthValue * rate * vatRate;
                  return (
                    <TableCell
                      key={month}
                      className={cn(
                        "text-right font-mono text-muted-foreground",
                        status === 'current' && "bg-primary/5"
                      )}
                    >
                      {vatAmount > 0 ? formatCurrency(vatAmount, false) : '—'}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-mono font-medium">
                  {formatCurrency(getSourceVat(source, dataType), false)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">Monthly Total</TableCell>
            {MONTHS.map(month => {
              const status = getMonthStatus(month, config.year);
              return (
                <TableCell
                  key={month}
                  className={cn(
                    "text-right font-mono",
                    status === 'current' && "text-primary font-semibold bg-primary/5"
                  )}
                >
                  {formatCurrency(getMonthlyVat(month, dataType), false)}
                </TableCell>
              );
            })}
            <TableCell className="text-right font-mono font-semibold">
              {formatCurrency(totalVat, false)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
