import { RevenueTable, VatTable } from '../components';

export function ExpectedRevenuePage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-6">Expected Revenue</h1>
      <RevenueTable dataType="expected" />
      <VatTable dataType="expected" />
    </>
  );
}
