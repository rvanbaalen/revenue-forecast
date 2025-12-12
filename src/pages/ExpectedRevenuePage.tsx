import { useRevenue } from '../context/RevenueContext';
import { RevenueTable, VatTable } from '../components';
import { formatCurrency } from '../utils/format';
import { TrendingUp, DollarSign, Receipt } from 'lucide-react';

export function ExpectedRevenuePage() {
  const { getTotals, sources, config } = useRevenue();
  const totals = getTotals('expected');

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Expected Revenue</h1>
          <p className="text-zinc-500 mt-1">
            Budget and forecast for {config.year}
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
            <p className="text-sm text-zinc-500">Total Expected</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(totals.totalRevenue)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-lg">
          <div className="p-2 bg-green-50 rounded-lg">
            <Receipt className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-500">VAT to Reserve</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(totals.totalVat)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-lg">
          <div className="p-2 bg-amber-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Sources</p>
            <p className="text-xl font-semibold tabular-nums">{sources.length}</p>
          </div>
        </div>
      </div>

      {/* Tables */}
      <RevenueTable dataType="expected" />
      <VatTable dataType="expected" />
    </div>
  );
}
