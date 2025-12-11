import type { Month } from '../types';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
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
import { Plus, Trash2, CircleDot } from 'lucide-react';

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

  const headerClass = dataType === 'expected' ? 'expected-header' : 'actual-header';
  const title = dataType === 'expected' ? 'Expected Revenue' : 'Actual Revenue';
  const titleColor = dataType === 'expected' ? 'text-amber-400' : 'text-emerald-400';
  const accentColor = dataType === 'expected' ? 'amber' : 'emerald';

  const grandTotalCg = sources.reduce((sum, s) => sum + getSourceTotalCg(s, dataType), 0);
  const totalProfitTax = sources.reduce((sum, s) => sum + getProfitTax(s, dataType), 0);

  const getMonthCellClass = (month: Month): string => {
    const status = getMonthStatus(month, config.year);
    return cn(
      'px-1 py-2 transition-colors',
      status === 'current' && 'month-current',
      status === 'past' && 'month-past',
      status === 'future' && 'month-future'
    );
  };

  const getMonthHeaderClass = (month: Month): string => {
    const status = getMonthStatus(month, config.year);
    return cn(
      'px-3 py-3 text-right font-semibold text-slate-300',
      status === 'current' && 'bg-sky-500/20 text-sky-300'
    );
  };

  return (
    <TooltipProvider>
      <Card className="mb-6 fade-in">
        <CardHeader className={headerClass}>
          <div className="flex items-center justify-between">
            <CardTitle className={cn("text-lg font-semibold", titleColor)}>
              {title}
            </CardTitle>
            <Button onClick={addSource} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className={headerClass}>
                  <TableHead className="px-3 py-3 text-left font-semibold text-slate-300 rounded-tl-lg">Source</TableHead>
                  <TableHead className="px-3 py-3 text-left font-semibold text-slate-300">Type</TableHead>
                  <TableHead className="px-3 py-3 text-left font-semibold text-slate-300">Currency</TableHead>
                  {dataType === 'expected' && (
                    <TableHead className="px-3 py-3 text-center font-semibold text-slate-300">MRR</TableHead>
                  )}
                  {MONTHS.map(month => {
                    const status = getMonthStatus(month, config.year);
                    return (
                      <TableHead key={month} className={getMonthHeaderClass(month)}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              {dataType === 'actual' && onMonthHeaderClick ? (
                                <button
                                  onClick={() => onMonthHeaderClick(month)}
                                  className={cn(
                                    "hover:underline transition-colors cursor-pointer flex items-center justify-end gap-1",
                                    status === 'current' ? 'text-sky-300 hover:text-sky-200' : `hover:text-${accentColor}-400`
                                  )}
                                  title={`Click to confirm ${MONTH_LABELS[month]} revenue`}
                                >
                                  {status === 'current' && <CircleDot className="h-3 w-3 animate-pulse" />}
                                  {MONTH_LABELS[month]}
                                </button>
                              ) : (
                                <span className="flex items-center justify-end gap-1">
                                  {status === 'current' && <CircleDot className="h-3 w-3 text-sky-400 animate-pulse" />}
                                  {MONTH_LABELS[month]}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-center">
                              <div>{MONTH_LABELS[month]} {config.year}</div>
                              <div className="text-xs text-slate-400">
                                {getRelativeTimeLabel(month, config.year)}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                    );
                  })}
                  <TableHead className="px-3 py-3 text-right font-semibold text-slate-300">Total</TableHead>
                  <TableHead className="px-3 py-3 text-right font-semibold text-slate-300">Total (Cg)</TableHead>
                  <TableHead className="px-3 py-3 text-right font-semibold text-slate-300">Profit Tax</TableHead>
                  <TableHead className="px-3 py-3 text-center font-semibold text-slate-300 rounded-tr-lg">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map(source => (
                  <TableRow key={source.id}>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        value={source.name}
                        onChange={(e) => updateSource(source.id, { name: e.target.value })}
                        className="w-32 h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Select
                        value={source.type}
                        onValueChange={(value) => updateSource(source.id, { type: value as 'local' | 'foreign' })}
                      >
                        <SelectTrigger className="w-24 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local</SelectItem>
                          <SelectItem value="foreign">Foreign</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Select
                        value={source.currency}
                        onValueChange={(value) => updateSource(source.id, { currency: value })}
                      >
                        <SelectTrigger className="w-20 h-8 text-sm font-mono">
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
                      <TableCell className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={source.isRecurring}
                            onChange={(e) => updateSource(source.id, { isRecurring: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600"
                          />
                          {source.isRecurring && (
                            <Input
                              type="number"
                              value={source.recurringAmount || ''}
                              onChange={(e) => updateSource(source.id, { recurringAmount: parseFloat(e.target.value) || 0 })}
                              placeholder="MRR"
                              className="w-20 h-8 text-sm font-mono text-right"
                            />
                          )}
                        </div>
                      </TableCell>
                    )}
                    {MONTHS.map(month => (
                      <TableCell key={month} className={getMonthCellClass(month)}>
                        {source.isRecurring && dataType === 'expected' ? (
                          <div className="editable-cell w-full px-2 py-1 rounded text-slate-400 text-sm font-mono text-right">
                            {formatCurrency(source.recurringAmount, false)}
                          </div>
                        ) : (
                          <Input
                            type="number"
                            value={source[dataType][month] || ''}
                            onChange={(e) => updateSourceRevenue(source.id, month, parseFloat(e.target.value) || 0, dataType)}
                            placeholder="-"
                            className="editable-cell w-full h-8 text-sm font-mono text-right"
                          />
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="px-3 py-2 text-right font-mono text-slate-300">
                      {formatCurrency(getSourceTotal(source, dataType), false)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right font-mono text-sky-300">
                      {formatCurrency(getSourceTotalCg(source, dataType), false)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right font-mono text-amber-300">
                      {formatCurrency(getProfitTax(source, dataType), false)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSource(source.id)}
                        className="h-7 opacity-70 hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="total-row font-semibold">
                  <TableCell className="px-3 py-3 text-slate-300" colSpan={dataType === 'expected' ? 4 : 3}>
                    <div className="flex items-center gap-2">
                      Monthly Total (Cg)
                      <Badge variant="secondary" className="text-xs">
                        {sources.length} sources
                      </Badge>
                    </div>
                  </TableCell>
                  {MONTHS.map(month => {
                    const status = getMonthStatus(month, config.year);
                    return (
                      <TableCell
                        key={month}
                        className={cn(
                          "px-3 py-3 text-right font-mono text-sky-300",
                          status === 'current' && 'bg-sky-500/10'
                        )}
                      >
                        {formatCurrency(getMonthlyTotal(month, dataType), false)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="px-3 py-3 text-right font-mono text-sky-300">-</TableCell>
                  <TableCell className="px-3 py-3 text-right font-mono text-sky-300">
                    {formatCurrency(grandTotalCg, false)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right font-mono text-sky-300">
                    {formatCurrency(totalProfitTax, false)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
