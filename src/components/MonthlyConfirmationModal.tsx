import { useState, useEffect } from 'react';
import type { Month } from '../types';
import { MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Check, Copy, Save, CheckCircle2, Circle } from 'lucide-react';

interface MonthlyConfirmationModalProps {
  isOpen: boolean;
  month: Month;
  onClose: () => void;
}

export function MonthlyConfirmationModal({
  isOpen,
  month,
  onClose,
}: MonthlyConfirmationModalProps) {
  const {
    sources,
    config,
    updateSourceRevenue,
    confirmMonthlyRevenue,
    getSourceValue,
    getRate,
  } = useRevenue();

  const { getMonthStatus, getRelativeTimeLabel } = useTime();

  // Track edited values locally before confirming
  const [editedValues, setEditedValues] = useState<Record<number, number>>({});

  const monthStatus = getMonthStatus(month, config.year);

  // Reset edited values when modal opens or month changes
  useEffect(() => {
    if (isOpen) {
      const initialValues: Record<number, number> = {};
      sources.forEach(source => {
        const actual = getSourceValue(source, month, 'actual');
        initialValues[source.id] = actual;
      });
      setEditedValues(initialValues);
    }
  }, [isOpen, month, sources, getSourceValue]);

  const handleValueChange = (sourceId: number, value: number) => {
    setEditedValues(prev => ({ ...prev, [sourceId]: value }));
  };

  const handleConfirmSource = (sourceId: number) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;
    const expected = getSourceValue(source, month, 'expected');
    updateSourceRevenue(sourceId, month, expected, 'actual');
    setEditedValues(prev => ({ ...prev, [sourceId]: expected }));
  };

  const handleSaveSource = (sourceId: number) => {
    const value = editedValues[sourceId] ?? 0;
    updateSourceRevenue(sourceId, month, value, 'actual');
  };

  const handleConfirmAll = () => {
    confirmMonthlyRevenue(month);
    // Update local state to reflect confirmed values
    const newValues: Record<number, number> = {};
    sources.forEach(source => {
      newValues[source.id] = getSourceValue(source, month, 'expected');
    });
    setEditedValues(newValues);
  };

  const getMonthlyTotalExpected = () => {
    return sources.reduce((sum, source) => {
      const value = getSourceValue(source, month, 'expected');
      return sum + value * getRate(source.currency);
    }, 0);
  };

  const getMonthlyTotalActual = () => {
    return sources.reduce((sum, source) => {
      const value = editedValues[source.id] ?? getSourceValue(source, month, 'actual');
      return sum + value * getRate(source.currency);
    }, 0);
  };

  const allConfirmed = sources.every(source => {
    const expected = getSourceValue(source, month, 'expected');
    const actual = editedValues[source.id] ?? getSourceValue(source, month, 'actual');
    return expected === actual;
  });

  const confirmedCount = sources.filter(source => {
    const expected = getSourceValue(source, month, 'expected');
    const actual = editedValues[source.id] ?? getSourceValue(source, month, 'actual');
    return expected === actual;
  }).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-zinc-900">
            {MONTH_LABELS[month]} {config.year}
            <Badge
              className={cn(
                "text-xs",
                monthStatus === 'current' ? 'bg-indigo-100 text-indigo-700' :
                monthStatus === 'past' ? 'bg-zinc-100 text-zinc-600' :
                'bg-purple-100 text-purple-700'
              )}
            >
              {getRelativeTimeLabel(month, config.year)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Confirm actual revenue for each source. Click "Use Expected" to copy values.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${sources.length > 0 ? (confirmedCount / sources.length) * 100 : 0}%` }}
            />
          </div>
          <span className="font-medium">{confirmedCount}/{sources.length}</span>
        </div>

        <div className="space-y-2">
          {sources.map(source => {
            const expected = getSourceValue(source, month, 'expected');
            const currentActual = editedValues[source.id] ?? getSourceValue(source, month, 'actual');
            const isConfirmed = expected === currentActual;
            const hasChanged = (editedValues[source.id] ?? getSourceValue(source, month, 'actual')) !== getSourceValue(source, month, 'actual');
            const currency = config.currencies.find(c => c.code === source.currency);

            return (
              <div
                key={source.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  isConfirmed
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-zinc-200 bg-white'
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isConfirmed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-zinc-300 flex-shrink-0" />
                      )}
                      <span className="font-medium text-zinc-900 truncate">
                        {source.name}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {source.currency}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-500 ml-6">
                      Expected: <span className="font-mono text-zinc-700">{currency?.symbol}{formatCurrency(expected, false)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400 text-sm">{currency?.symbol}</span>
                      <Input
                        type="number"
                        value={currentActual || ''}
                        onChange={(e) => handleValueChange(source.id, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-24 h-8 text-sm font-mono text-right"
                      />
                    </div>

                    {hasChanged ? (
                      <Button
                        size="sm"
                        onClick={() => handleSaveSource(source.id)}
                        className="h-8"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    ) : isConfirmed ? (
                      <div className="w-20 flex justify-center">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfirmSource(source.id)}
                        className="h-8"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Use Expected
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Expected Total:</span>
            <span className="font-mono text-zinc-700">{formatCurrency(getMonthlyTotalExpected())}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Actual Total:</span>
            <span className="font-mono text-indigo-600 font-medium">{formatCurrency(getMonthlyTotalActual())}</span>
          </div>
          {getMonthlyTotalExpected() !== getMonthlyTotalActual() && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Difference:</span>
              <span className={cn(
                "font-mono font-medium",
                getMonthlyTotalActual() >= getMonthlyTotalExpected()
                  ? 'text-green-600'
                  : 'text-red-600'
              )}>
                {getMonthlyTotalActual() >= getMonthlyTotalExpected() ? '+' : ''}
                {formatCurrency(getMonthlyTotalActual() - getMonthlyTotalExpected())}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleConfirmAll}
            disabled={allConfirmed}
          >
            {allConfirmed ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                All Confirmed
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Use All Expected
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
