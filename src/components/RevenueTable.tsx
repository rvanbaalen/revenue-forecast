import type { Month } from '../types';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const getMonthCellClass = (month: Month): string => {
    const status = getMonthStatus(month, config.year);
    return cn(
      'px-1 py-2 transition-colors',
      status === 'current' && 'month-current'
    );
  };

  return (
    <TooltipProvider>
      <Card className="fade-in">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-zinc-900">
              {dataType === 'expected' ? 'Expected Revenue' : 'Actual Revenue'}
            </CardTitle>
            <Button onClick={addSource} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm table-clean">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500 w-32">Source</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500 w-24">Type</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500 w-20">Curr</th>
                  {dataType === 'expected' && (
                    <th className="px-3 py-3 text-center font-medium text-zinc-500 w-28">MRR</th>
                  )}
                  {MONTHS.map(month => {
                    const status = getMonthStatus(month, config.year);
                    return (
                      <th key={month} className={cn(
                        "px-2 py-3 text-right font-medium text-zinc-500 min-w-[80px]",
                        status === 'current' && 'bg-indigo-50 text-indigo-600'
                      )}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              {dataType === 'actual' && onMonthHeaderClick ? (
                                <button
                                  onClick={() => onMonthHeaderClick(month)}
                                  className={cn(
                                    "hover:underline transition-colors cursor-pointer",
                                    status === 'current' && 'text-indigo-600'
                                  )}
                                >
                                  {MONTH_LABELS[month]}
                                </button>
                              ) : (
                                <span>{MONTH_LABELS[month]}</span>
                              )}
                              {status === 'current' && (
                                <div className="absolute -top-1 right-0 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-center">
                              <div>{MONTH_LABELS[month]} {config.year}</div>
                              <div className="text-xs text-zinc-400">
                                {getRelativeTimeLabel(month, config.year)}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">Total</th>
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">Cg</th>
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">Tax</th>
                  <th className="px-3 py-3 text-center font-medium text-zinc-500 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={dataType === 'expected' ? 19 : 18} className="px-3 py-8 text-center text-zinc-400">
                      No revenue sources yet. Click "Add Source" to get started.
                    </td>
                  </tr>
                ) : (
                  sources.map(source => (
                    <tr key={source.id} className="group">
                      <td className="px-3 py-2">
                        <Input
                          type="text"
                          value={source.name}
                          onChange={(e) => updateSource(source.id, { name: e.target.value })}
                          className="h-8 text-sm border-transparent hover:border-zinc-200 focus:border-indigo-500"
                          placeholder="Source name"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={source.type}
                          onValueChange={(value) => updateSource(source.id, { type: value as 'local' | 'foreign' })}
                        >
                          <SelectTrigger className="h-8 text-sm border-transparent hover:border-zinc-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">Local</SelectItem>
                            <SelectItem value="foreign">Foreign</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={source.currency}
                          onValueChange={(value) => updateSource(source.id, { currency: value })}
                        >
                          <SelectTrigger className="h-8 text-sm font-mono border-transparent hover:border-zinc-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {config.currencies.map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {dataType === 'expected' && (
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              checked={source.isRecurring}
                              onChange={(e) => updateSource(source.id, { isRecurring: e.target.checked })}
                              className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            {source.isRecurring && (
                              <Input
                                type="number"
                                value={source.recurringAmount || ''}
                                onChange={(e) => updateSource(source.id, { recurringAmount: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-16 h-8 text-sm font-mono text-right border-transparent hover:border-zinc-200"
                              />
                            )}
                          </div>
                        </td>
                      )}
                      {MONTHS.map(month => (
                        <td key={month} className={getMonthCellClass(month)}>
                          {source.isRecurring && dataType === 'expected' ? (
                            <div className="flex items-center justify-end gap-1 text-zinc-400 text-sm font-mono pr-2">
                              <RefreshCw className="w-3 h-3" />
                              {formatCurrency(source.recurringAmount, false)}
                            </div>
                          ) : (
                            <Input
                              type="number"
                              value={source[dataType][month] || ''}
                              onChange={(e) => updateSourceRevenue(source.id, month, parseFloat(e.target.value) || 0, dataType)}
                              placeholder="-"
                              className="w-full h-8 text-sm font-mono text-right border-transparent hover:border-zinc-200 focus:border-indigo-500"
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono text-zinc-600">
                        {formatCurrency(getSourceTotal(source, dataType), false)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-indigo-600 font-medium">
                        {formatCurrency(getSourceTotalCg(source, dataType), false)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-500">
                        {formatCurrency(getProfitTax(source, dataType), false)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSource(source.id)}
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sources.length > 0 && (
                <tfoot>
                  <tr className="bg-zinc-50 font-medium">
                    <td className="px-3 py-3 text-zinc-600" colSpan={dataType === 'expected' ? 4 : 3}>
                      Monthly Total
                    </td>
                    {MONTHS.map(month => {
                      const status = getMonthStatus(month, config.year);
                      return (
                        <td
                          key={month}
                          className={cn(
                            "px-2 py-3 text-right font-mono",
                            status === 'current' ? 'text-indigo-600 bg-indigo-50' : 'text-zinc-600'
                          )}
                        >
                          {formatCurrency(getMonthlyTotal(month, dataType), false)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right font-mono text-zinc-600">-</td>
                    <td className="px-3 py-3 text-right font-mono text-indigo-600 font-semibold">
                      {formatCurrency(grandTotalCg, false)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-zinc-600">
                      {formatCurrency(totalProfitTax, false)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
