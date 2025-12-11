import { useState } from 'react';
import type { Month } from '../types';
import { useRevenue } from '../context/RevenueContext';
import { RevenueTable, VatTable, MonthlyConfirmationModal } from '../components';

export function ActualRevenuePage() {
  const {
    config,
    sources,
    addSource,
    updateSource,
    updateSourceRevenue,
    deleteSource,
    confirmMonthlyRevenue,
    getSourceValue,
    getSourceTotal,
    getSourceTotalCg,
    getProfitTax,
    getSourceVat,
    getMonthlyTotal,
    getMonthlyVat,
    getRate,
  } = useRevenue();

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
    <>
      <h1 className="text-2xl font-bold text-emerald-400 mb-6">Actual Revenue</h1>

      <p className="text-slate-400 text-sm mb-6">
        Click on any month header to quickly confirm or correct the actual revenue for that month.
      </p>

      <RevenueTable
        sources={sources}
        config={config}
        dataType="actual"
        onAddSource={addSource}
        onUpdateSource={updateSource}
        onUpdateRevenue={updateSourceRevenue}
        onDeleteSource={deleteSource}
        getSourceTotal={getSourceTotal}
        getSourceTotalCg={getSourceTotalCg}
        getProfitTax={getProfitTax}
        getMonthlyTotal={getMonthlyTotal}
        onMonthHeaderClick={openConfirmationModal}
      />

      <VatTable
        sources={sources}
        config={config}
        dataType="actual"
        getSourceValue={getSourceValue}
        getSourceVat={getSourceVat}
        getMonthlyVat={getMonthlyVat}
        getRate={getRate}
      />

      {/* Monthly Confirmation Modal */}
      <MonthlyConfirmationModal
        isOpen={confirmationModal.isOpen}
        month={confirmationModal.month}
        sources={sources}
        config={config}
        onClose={closeConfirmationModal}
        onConfirmSource={(sourceId, month, value) => updateSourceRevenue(sourceId, month, value, 'actual')}
        onConfirmAll={confirmMonthlyRevenue}
        getSourceValue={getSourceValue}
        getRate={getRate}
      />
    </>
  );
}
