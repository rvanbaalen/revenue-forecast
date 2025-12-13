import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Month } from '../types';
import { useRevenue } from '../context/RevenueContext';
import { useBank } from '../context/BankContext';
import { RevenueTable, VatTable, MonthlyConfirmationModal } from '../components';
import { formatCurrency, formatVariance } from '../utils/format';
import { Receipt, DollarSign, TrendingUp, TrendingDown, Building2, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  StatCard,
  StatCardIcon,
  StatCardContent,
  StatCardLabel,
  StatCardValue,
} from '@/components/ui/stat-card';

export function ActualRevenuePage() {
  const { getTotals, config } = useRevenue();
  const { transactions, accounts } = useBank();
  const actualTotals = getTotals('actual');
  const expectedTotals = getTotals('expected');
  const variance = formatVariance(expectedTotals.totalRevenue, actualTotals.totalRevenue);

  // Calculate bank import totals for the current year
  const yearTransactions = transactions.filter(tx => tx.year === config.year && tx.category === 'revenue');
  const bankTotal = yearTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const unmappedCount = yearTransactions.filter(tx => !tx.revenueSourceId).length;
  const hasBankData = accounts.length > 0;

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
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Actual Revenue</h1>
          <p className="text-muted-foreground mt-1">
            Track real income for {config.year}
          </p>
        </div>
        {hasBankData && (
          <Button asChild>
            <Link to="/bank">
              <Building2 className="size-4" />
              View Bank Data
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard>
          <StatCardIcon>
            <DollarSign className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Total Actual</StatCardLabel>
            <StatCardValue>{formatCurrency(actualTotals.totalRevenue)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon>
            <Receipt className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>VAT to Reserve</StatCardLabel>
            <StatCardValue>{formatCurrency(actualTotals.totalVat)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon variant={variance.isPositive ? 'success' : 'destructive'}>
            {variance.isPositive ? (
              <TrendingUp className="size-5" />
            ) : (
              <TrendingDown className="size-5" />
            )}
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>vs Expected</StatCardLabel>
            <StatCardValue variant={variance.isPositive ? 'positive' : 'negative'}>
              {variance.display}
            </StatCardValue>
          </StatCardContent>
        </StatCard>

        {hasBankData && (
          <StatCard>
            <StatCardIcon variant="primary">
              <Building2 className="size-5" />
            </StatCardIcon>
            <StatCardContent>
              <StatCardLabel>Bank Revenue</StatCardLabel>
              <StatCardValue variant="positive">{formatCurrency(bankTotal)}</StatCardValue>
            </StatCardContent>
          </StatCard>
        )}
      </div>

      {/* Bank reconciliation alert */}
      {hasBankData && unmappedCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertCircle className="size-5 text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {unmappedCount} bank transaction{unmappedCount !== 1 ? 's' : ''} need{unmappedCount === 1 ? 's' : ''} to be mapped to revenue sources
            </p>
            <p className="text-sm text-muted-foreground">
              Map transactions in the Bank section to automatically track revenue.
            </p>
          </div>
          <Link
            to="/bank"
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            Map Now <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {/* Tip */}
      <div className="bg-secondary border border-border rounded-lg px-4 py-3">
        <p className="text-sm text-muted-foreground">
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
