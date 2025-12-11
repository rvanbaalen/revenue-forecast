import { useRevenueData } from './hooks/useRevenueData';
import {
  Header,
  ConfigSection,
  RevenueTable,
  VatTable,
  SalaryTable,
  SummaryDashboard,
} from './components';

function App() {
  const {
    config,
    sources,
    salaries,
    loading,

    // Config operations
    updateConfig,

    // Currency operations
    addCurrency,
    updateCurrency,
    removeCurrency,
    getRate,

    // Source operations
    addSource,
    updateSource,
    updateSourceRevenue,
    deleteSource,

    // Salary operations
    addSalary,
    updateSalary,
    updateSalaryAmount,
    deleteSalary,

    // Calculations
    getSourceValue,
    getSourceTotal,
    getSourceTotalCg,
    getProfitTax,
    getSourceVat,
    getMonthlyTotal,
    getMonthlyVat,
    getSalaryTotal,
    getSalaryTaxCg,
    getMonthlySalary,
    getTotals,

    // Export/Import
    exportData,
    importData,
  } = useRevenueData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-400 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const expectedTotals = getTotals('expected');
  const actualTotals = getTotals('actual');

  return (
    <div className="text-slate-200 p-4 md:p-8">
      <div className="max-w-[1900px] mx-auto">
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

        {/* Expected Revenue Section */}
        <RevenueTable
          sources={sources}
          config={config}
          dataType="expected"
          onAddSource={addSource}
          onUpdateSource={updateSource}
          onUpdateRevenue={updateSourceRevenue}
          onDeleteSource={deleteSource}
          getSourceTotal={getSourceTotal}
          getSourceTotalCg={getSourceTotalCg}
          getProfitTax={getProfitTax}
          getMonthlyTotal={getMonthlyTotal}
        />

        <VatTable
          sources={sources}
          config={config}
          dataType="expected"
          getSourceValue={getSourceValue}
          getSourceVat={getSourceVat}
          getMonthlyVat={getMonthlyVat}
          getRate={getRate}
        />

        {/* Actual Revenue Section */}
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

        <SalaryTable
          salaries={salaries}
          onAddSalary={addSalary}
          onUpdateSalary={updateSalary}
          onUpdateSalaryAmount={updateSalaryAmount}
          onDeleteSalary={deleteSalary}
          getSalaryTotal={getSalaryTotal}
          getSalaryTaxCg={getSalaryTaxCg}
          getMonthlySalary={getMonthlySalary}
        />

        <footer className="text-center text-slate-500 text-sm pb-4 mt-8">
          Data stored locally in your browser using IndexedDB
        </footer>
      </div>
    </div>
  );
}

export default App;
