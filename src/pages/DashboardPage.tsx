import { useRevenue } from '../context/RevenueContext';
import { Header, ConfigSection, SummaryDashboard } from '../components';

export function DashboardPage() {
  const {
    config,
    updateConfig,
    addCurrency,
    updateCurrency,
    removeCurrency,
    getTotals,
    exportData,
    importData,
  } = useRevenue();

  const expectedTotals = getTotals('expected');
  const actualTotals = getTotals('actual');

  return (
    <>
      <Header
        year={config.year}
        onExport={exportData}
        onImport={importData}
      />

      <ConfigSection
        config={config}
        onUpdateConfig={updateConfig}
        onAddCurrency={addCurrency}
        onUpdateCurrency={updateCurrency}
        onRemoveCurrency={removeCurrency}
      />

      <SummaryDashboard
        expectedTotals={expectedTotals}
        actualTotals={actualTotals}
      />

      <footer className="text-center text-slate-500 text-sm pb-4 mt-8">
        Data stored locally in your browser using IndexedDB
      </footer>
    </>
  );
}
