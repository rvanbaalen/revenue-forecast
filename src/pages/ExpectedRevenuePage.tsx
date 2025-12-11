import { useRevenue } from '../context/RevenueContext';
import { RevenueTable, VatTable } from '../components';

export function ExpectedRevenuePage() {
  const {
    config,
    sources,
    addSource,
    updateSource,
    updateSourceRevenue,
    deleteSource,
    getSourceValue,
    getSourceTotal,
    getSourceTotalCg,
    getProfitTax,
    getSourceVat,
    getMonthlyTotal,
    getMonthlyVat,
    getRate,
  } = useRevenue();

  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-6">Expected Revenue</h1>

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
    </>
  );
}
