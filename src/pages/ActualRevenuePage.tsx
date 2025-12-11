import { useState } from 'react';
import type { Month } from '../types';
import { RevenueTable, VatTable, MonthlyConfirmationModal } from '../components';

export function ActualRevenuePage() {
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
        dataType="actual"
        onMonthHeaderClick={openConfirmationModal}
      />

      <VatTable dataType="actual" />

      <MonthlyConfirmationModal
        isOpen={confirmationModal.isOpen}
        month={confirmationModal.month}
        onClose={closeConfirmationModal}
      />
    </>
  );
}
