import { useState } from 'react';
import type { Month } from './types';
import {
  Header,
  ConfigSection,
  RevenueTable,
  VatTable,
  SalaryTable,
  SummaryDashboard,
  MonthlyConfirmationModal,
} from './components';

function App() {
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
    <div className="text-slate-200 p-4 md:p-8">
      <div className="max-w-[1900px] mx-auto">
        <Header />
        <ConfigSection />
        <SummaryDashboard />

        {/* Expected Revenue Section */}
        <RevenueTable dataType="expected" />
        <VatTable dataType="expected" />

        {/* Actual Revenue Section */}
        <RevenueTable
          dataType="actual"
          onMonthHeaderClick={openConfirmationModal}
        />
        <VatTable dataType="actual" />

        <SalaryTable />

        <footer className="text-center text-slate-500 text-sm pb-4 mt-8">
          Data stored locally in your browser using IndexedDB
        </footer>
      </div>

      {/* Monthly Confirmation Modal */}
      <MonthlyConfirmationModal
        isOpen={confirmationModal.isOpen}
        month={confirmationModal.month}
        onClose={closeConfirmationModal}
      />
    </div>
  );
}

export default App;
