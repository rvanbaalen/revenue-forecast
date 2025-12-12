import { useState } from 'react';
import type { Month } from '../types';
import { useRevenue } from '../context/RevenueContext';
import { RevenueTable, VatTable, MonthlyConfirmationModal } from '../components';
import { formatCurrency, formatVariance } from '../utils/format';
import { Receipt, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export function ActualRevenuePage() {
  const { getTotals, config } = useRevenue();
  const actualTotals = getTotals('actual');
  const expectedTotals = getTotals('expected');
  const variance = formatVariance(expectedTotals.totalRevenue, actualTotals.totalRevenue);

  // Modal state for monthly confirmation
  const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean; month: Month }>({
    isOpen: false,
    month: 'jan',
  });

  const openConfirmationModal = (month: Month) => {
    setConfirmationModal({ isOpen: true, month });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Actual Revenue</h1>
          <p className="text-zinc-500 mt-1">
            Track real income for {config.year}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-lg">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Total Actual</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(actualTotals.totalRevenue)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-lg">
          <div className="p-2 bg-green-50 rounded-lg">
            <Receipt className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-500">VAT to Reserve</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(actualTotals.totalVat)}</p>
          </div>
        </div>

        <div className={`flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-lg`}>
          <div className={`p-2 rounded-lg ${variance.isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
            {variance.isPositive ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-sm text-zinc-500">vs Expected</p>
            <p className={`text-xl font-semibold tabular-nums ${variance.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {variance.display}
            </p>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
        <p className="text-sm text-indigo-700">
          Click on any month header in the table below to quickly copy expected values to actual.
        </p>
      </div>

      {/* Tables */}
      <RevenueTable
        dataType="actual"
        onMonthHeaderClick={openConfirmationModal}
      />

      <VatTable dataType="actual" />

      <MonthlyConfirmationModal
        isOpen={confirmationModal.isOpen}
        month={confirmationModal.month}
        onClose={closeConfirmationModal}
      />
    </div>
  );
}
