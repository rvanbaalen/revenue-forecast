import { useState, useEffect } from 'react';
import type { RevenueSource, AppConfig, Month } from '../types';
import { MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';

interface MonthlyConfirmationModalProps {
  isOpen: boolean;
  month: Month;
  sources: RevenueSource[];
  config: AppConfig;
  onClose: () => void;
  onConfirmSource: (sourceId: number, month: Month, value: number) => void;
  onConfirmAll: (month: Month) => void;
  getSourceValue: (source: RevenueSource, month: Month, type: 'expected' | 'actual') => number;
  getRate: (code: string) => number;
}

export function MonthlyConfirmationModal({
  isOpen,
  month,
  sources,
  config,
  onClose,
  onConfirmSource,
  onConfirmAll,
  getSourceValue,
  getRate,
}: MonthlyConfirmationModalProps) {
  // Track edited values locally before confirming
  const [editedValues, setEditedValues] = useState<Record<number, number>>({});

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

  if (!isOpen) return null;

  const handleValueChange = (sourceId: number, value: number) => {
    setEditedValues(prev => ({ ...prev, [sourceId]: value }));
  };

  const handleConfirmSource = (source: RevenueSource) => {
    const expected = getSourceValue(source, month, 'expected');
    onConfirmSource(source.id, month, expected);
    setEditedValues(prev => ({ ...prev, [source.id]: expected }));
  };

  const handleSaveSource = (source: RevenueSource) => {
    const value = editedValues[source.id] ?? 0;
    onConfirmSource(source.id, month, value);
  };

  const handleConfirmAll = () => {
    onConfirmAll(month);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-emerald-400">
            Confirm Revenue - {MONTH_LABELS[month]} {config.year}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Review and confirm actual revenue for each source. Click "Use Expected" to copy the expected value, or enter the actual amount manually.
        </p>

        <div className="space-y-3 mb-6">
          {sources.map(source => {
            const expected = getSourceValue(source, month, 'expected');
            const currentActual = editedValues[source.id] ?? getSourceValue(source, month, 'actual');
            const isConfirmed = expected === currentActual;
            const hasChanged = (editedValues[source.id] ?? getSourceValue(source, month, 'actual')) !== getSourceValue(source, month, 'actual');
            const currency = config.currencies.find(c => c.code === source.currency);

            return (
              <div
                key={source.id}
                className={`p-4 rounded-xl border transition-colors ${
                  isConfirmed
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-slate-700/50 bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-200 truncate">
                        {source.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        source.type === 'local'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {source.type}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {source.currency}
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">
                      Expected: <span className="font-mono text-amber-300">{currency?.symbol}{formatCurrency(expected, false)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-sm">{currency?.symbol}</span>
                      <input
                        type="number"
                        value={currentActual || ''}
                        onChange={(e) => handleValueChange(source.id, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-28 px-3 py-2 rounded-lg text-slate-200 text-sm font-mono currency-input text-right"
                      />
                    </div>

                    {hasChanged ? (
                      <button
                        onClick={() => handleSaveSource(source)}
                        className="btn-primary px-3 py-2 rounded-lg text-xs font-medium text-white whitespace-nowrap"
                      >
                        Save
                      </button>
                    ) : isConfirmed ? (
                      <span className="text-emerald-400 text-sm px-3 py-2">
                        ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConfirmSource(source)}
                        className="btn-primary px-3 py-2 rounded-lg text-xs font-medium text-white whitespace-nowrap"
                      >
                        Use Expected
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="border-t border-slate-700/50 pt-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Expected Total (Cg):</span>
            <span className="font-mono text-amber-300">{formatCurrency(getMonthlyTotalExpected())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Actual Total (Cg):</span>
            <span className="font-mono text-emerald-300">{formatCurrency(getMonthlyTotalActual())}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleConfirmAll}
            disabled={allConfirmed}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              allConfirmed
                ? 'bg-slate-600 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {allConfirmed ? 'All Confirmed' : 'Confirm All as Expected'}
          </button>
        </div>
      </div>
    </div>
  );
}
