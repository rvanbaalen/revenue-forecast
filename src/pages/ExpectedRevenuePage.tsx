import { useRevenue } from '../context/RevenueContext';
import { RevenueTable, VatTable } from '../components';
import { formatCurrency } from '../utils/format';
import { TrendingUp, DollarSign, Receipt } from 'lucide-react';
import {
  StatCard,
  StatCardIcon,
  StatCardContent,
  StatCardLabel,
  StatCardValue,
} from '@/components/ui/stat-card';

export function ExpectedRevenuePage() {
  const { getTotals, sources, config } = useRevenue();
  const totals = getTotals('expected');

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Expected Revenue</h1>
          <p className="text-muted-foreground mt-1">
            Budget and forecast for {config.year}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard>
          <StatCardIcon>
            <DollarSign className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Total Expected</StatCardLabel>
            <StatCardValue>{formatCurrency(totals.totalRevenue)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon>
            <Receipt className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>VAT to Reserve</StatCardLabel>
            <StatCardValue>{formatCurrency(totals.totalVat)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon>
            <TrendingUp className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Sources</StatCardLabel>
            <StatCardValue>{sources.length}</StatCardValue>
          </StatCardContent>
        </StatCard>
      </div>

      {/* Tables */}
      <RevenueTable dataType="expected" />
      <VatTable dataType="expected" />
    </div>
  );
}
