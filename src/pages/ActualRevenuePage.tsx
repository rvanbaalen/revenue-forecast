import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Month } from '../types';
import { useRevenue } from '../context/RevenueContext';
import { useBank } from '../context/BankContext';
import { RevenueTable, VatTable, MonthlyConfirmationModal } from '../components';
import { formatCurrency, formatVariance } from '../utils/format';
import { Receipt, DollarSign, TrendingUp, TrendingDown, Building2, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ActualRevenuePage() {
  const { getTotals, config, sources, updateSourceRevenue } = useRevenue();
  const { transactions, accounts, syncBankToActual } = useBank();
  const actualTotals = getTotals('actual');
  const expectedTotals = getTotals('expected');
  const variance = formatVariance(expectedTotals.totalRevenue, actualTotals.totalRevenue);

  // Calculate bank import totals for the current year
  const yearTransactions = transactions.filter(tx => tx.year === config.year && tx.category === 'revenue');
  const bankTotal = yearTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const unmappedCount = yearTransactions.filter(tx => !tx.revenueSourceId).length;
  const mappedCount = yearTransactions.filter(tx => tx.revenueSourceId).length;
  const hasBankData = accounts.length > 0;

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSyncFromBank = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncBankToActual(config.year, sources, updateSourceRevenue);
      setSyncResult({
        success: true,
        message: `Synced ${result.sourcesUpdated} source${result.sourcesUpdated !== 1 ? 's' : ''} from bank data`,
      });
      // Clear message after 5 seconds
      setTimeout(() => setSyncResult(null), 5000);
    } catch (error) {
      setSyncResult({
        success: false,
        message: 'Failed to sync bank data',
      });
    } finally {
      setIsSyncing(false);
    }
  };

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
          <div className="flex items-center gap-3">
            {syncResult && (
              <span className={`text-sm ${syncResult.success ? 'variance-positive' : 'text-destructive'}`}>
                {syncResult.message}
              </span>
            )}
            <Button
              variant="outline"
              onClick={handleSyncFromBank}
              disabled={isSyncing || mappedCount === 0}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync from Bank'}
            </Button>
            <Link
              to="/bank"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Building2 className="h-4 w-4" />
              View Bank Data
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="p-2 bg-secondary rounded-lg">
            <DollarSign className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Actual</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(actualTotals.totalRevenue)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="p-2 bg-secondary rounded-lg">
            <Receipt className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">VAT to Reserve</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(actualTotals.totalVat)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className={`p-2 rounded-lg ${variance.isPositive ? 'bg-secondary' : 'bg-destructive/10'}`}>
            {variance.isPositive ? (
              <TrendingUp className="w-5 h-5 text-foreground" />
            ) : (
              <TrendingDown className="w-5 h-5 text-destructive" />
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">vs Expected</p>
            <p className={`text-xl font-semibold tabular-nums ${variance.isPositive ? 'variance-positive' : 'variance-negative'}`}>
              {variance.display}
            </p>
          </div>
        </div>

        {hasBankData && (
          <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bank Revenue</p>
              <p className="text-xl font-semibold tabular-nums variance-positive">{formatCurrency(bankTotal)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bank reconciliation alert */}
      {hasBankData && unmappedCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
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
            Map Now <ArrowRight className="h-4 w-4" />
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
