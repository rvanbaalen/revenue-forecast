import { useState } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  StatCard,
  StatCardIcon,
  StatCardContent,
  StatCardLabel,
  StatCardValue,
} from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';
import {
  Upload,
  Building2,
  ArrowUpDown,
  Wand2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { useBank } from '@/context/BankContext';
import { useRevenue } from '@/context/RevenueContext';
import { OFXImportModal } from '@/components/OFXImportModal';
import { formatCurrency } from '@/utils/format';

export function BankLayout() {
  const { accounts, transactions, getUnmappedTransactions } = useBank();
  const { config } = useRevenue();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const unmappedTransactions = getUnmappedTransactions();

  // Calculate overall stats for the current year
  const yearTransactions = transactions.filter(tx => tx.year === config.year);
  const yearCredits = yearTransactions.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0);
  const yearDebits = yearTransactions.reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);

  const tabs = [
    { path: '/bank/accounts', label: 'Accounts', icon: Building2, count: accounts.length },
    { path: '/bank/transactions', label: 'Transactions', icon: ArrowUpDown, count: yearTransactions.length },
    { path: '/bank/transactions/mapping', label: 'Mapping Rules', icon: Wand2 },
  ];

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bank Import</h1>
          <p className="text-muted-foreground mt-1">
            Import and manage bank transactions from OFX files.
          </p>
        </div>
        <Button onClick={() => setIsImportModalOpen(true)}>
          <Upload className="size-4" />
          Import OFX
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard>
          <StatCardIcon variant="primary">
            <Building2 className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Bank Accounts</StatCardLabel>
            <StatCardValue>{accounts.length}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon variant="success">
            <TrendingUp className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>{config.year} Credits</StatCardLabel>
            <StatCardValue variant="positive">+{formatCurrency(yearCredits, false)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon variant="destructive">
            <TrendingDown className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>{config.year} Debits</StatCardLabel>
            <StatCardValue variant="negative">-{formatCurrency(yearDebits, false)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard variant={unmappedTransactions.length > 0 ? 'warning' : undefined}>
          <StatCardIcon variant={unmappedTransactions.length > 0 ? 'warning' : 'muted'}>
            <AlertCircle className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Unmapped Revenue</StatCardLabel>
            <StatCardValue>{unmappedTransactions.length}</StatCardValue>
          </StatCardContent>
        </StatCard>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          // For transactions tab, also consider mapping sub-route as active
          const isActive = currentPath === tab.path ||
            (tab.path === '/bank/transactions' && currentPath.startsWith('/bank/transactions'));

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-xs text-muted-foreground">({tab.count})</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Child route content */}
      <Outlet />

      {/* Import modal */}
      <OFXImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
