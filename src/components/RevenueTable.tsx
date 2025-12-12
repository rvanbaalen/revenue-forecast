import type { Month } from '../types';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

interface RevenueTableProps {
  dataType: 'expected' | 'actual';
  onMonthHeaderClick?: (month: Month) => void;
}

export function RevenueTable({
  dataType,
  onMonthHeaderClick,
}: RevenueTableProps) {
  const {
    sources,
    config,
    addSource,
    updateSource,
    updateSourceRevenue,
    deleteSource,
    getSourceTotal,
    getSourceTotalCg,
    getProfitTax,
    getMonthlyTotal,
  } = useRevenue();

  const { getMonthStatus, getRelativeTimeLabel } = useTime();

  const grandTotalCg = sources.reduce((sum, s) => sum + getSourceTotalCg(s, dataType), 0);
  const totalProfitTax = sources.reduce((sum, s) => sum + getProfitTax(s, dataType), 0);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {dataType === 'expected' ? 'Expected Revenue' : 'Actual Revenue'}
          </h2>
          <Button onClick={addSource} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-40">Source</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-20">Curr</TableHead>
              {dataType === 'expected' && (
                <TableHead className="w-24 text-center">MRR</TableHead>
              )}
              {MONTHS.map(month => {
                const status = getMonthStatus(month, config.year);
                const isCurrent = status === 'current';
                return (
                  <TableHead
                    key={month}
                    className={cn(
                      "w-20 text-right",
                      isCurrent && "text-primary font-semibold"
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn(
                          dataType === 'actual' && onMonthHeaderClick && "cursor-pointer hover:underline"
                        )}
                        onClick={() => dataType === 'actual' && onMonthHeaderClick?.(month)}
                        >
                          {MONTH_LABELS[month]}
                          {isCurrent && <span className="ml-1 text-xs">●</span>}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {MONTH_LABELS[month]} {config.year} • {getRelativeTimeLabel(month, config.year)}
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                );
              })}
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Cg</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={dataType === 'expected' ? 19 : 18}
                  className="h-24 text-center text-muted-foreground"
                >
                  No revenue sources. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              sources.map(source => (
                <TableRow key={source.id} className="group">
                  <TableCell className="p-1">
                    <Input
                      type="text"
                      value={source.name}
                      onChange={(e) => updateSource(source.id, { name: e.target.value })}
                      className="h-8 border-transparent bg-transparent hover:bg-muted focus:bg-background"
                      placeholder="Source name"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Select
                      value={source.type}
                      onValueChange={(value) => updateSource(source.id, { type: value as 'local' | 'foreign' })}
                    >
                      <SelectTrigger className="h-8 border-transparent bg-transparent hover:bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="foreign">Foreign</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-1">
                    <Select
                      value={source.currency}
                      onValueChange={(value) => updateSource(source.id, { currency: value })}
                    >
                      <SelectTrigger className="h-8 font-mono border-transparent bg-transparent hover:bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.currencies.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {dataType === 'expected' && (
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="checkbox"
                          checked={source.isRecurring}
                          onChange={(e) => updateSource(source.id, { isRecurring: e.target.checked })}
                          className="rounded"
                        />
                        {source.isRecurring && (
                          <Input
                            type="number"
                            value={source.recurringAmount || ''}
                            onChange={(e) => updateSource(source.id, { recurringAmount: parseFloat(e.target.value) || 0 })}
                            className="w-16 h-7 text-xs font-mono text-right border-transparent bg-transparent"
                          />
                        )}
                      </div>
                    </TableCell>
                  )}
                  {MONTHS.map(month => {
                    const status = getMonthStatus(month, config.year);
                    return (
                      <TableCell
                        key={month}
                        className={cn(
                          "p-1",
                          status === 'current' && "bg-primary/5"
                        )}
                      >
                        {source.isRecurring && dataType === 'expected' ? (
                          <div className="flex items-center justify-end gap-1 text-muted-foreground text-xs font-mono pr-1">
                            <RefreshCw className="w-3 h-3" />
                            {formatCurrency(source.recurringAmount, false)}
                          </div>
                        ) : (
                          <Input
                            type="number"
                            value={source[dataType][month] || ''}
                            onChange={(e) => updateSourceRevenue(source.id, month, parseFloat(e.target.value) || 0, dataType)}
                            placeholder="—"
                            className="h-8 text-sm font-mono text-right border-transparent bg-transparent hover:bg-muted focus:bg-background"
                          />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(getSourceTotal(source, dataType), false)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(getSourceTotalCg(source, dataType), false)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground text-sm">
                    {formatCurrency(getProfitTax(source, dataType), false)}
                  </TableCell>
                  <TableCell className="p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSource(source.id)}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {sources.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={dataType === 'expected' ? 4 : 3} className="font-medium">
                  Monthly Total
                </TableCell>
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
                      {formatCurrency(getMonthlyTotal(month, dataType), false)}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-mono text-muted-foreground">—</TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(grandTotalCg, false)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatCurrency(totalProfitTax, false)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </TooltipProvider>
  );
}
