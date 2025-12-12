import { useState } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-6 fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Import</h1>
          <p className="text-muted-foreground">
            Import and manage bank transactions from OFX files.
          </p>
        </div>
        <Button onClick={() => setIsImportModalOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import OFX
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bank Accounts</p>
                <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{config.year} Credits</p>
                <p className="text-2xl font-bold variance-positive">
                  +{formatCurrency(yearCredits, false)}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{config.year} Debits</p>
                <p className="text-2xl font-bold variance-negative">
                  -{formatCurrency(yearDebits, false)}
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={unmappedTransactions.length > 0 ? 'border-warning' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unmapped Revenue</p>
                <p className="text-2xl font-bold text-foreground">{unmappedTransactions.length}</p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                unmappedTransactions.length > 0 ? "bg-warning/10" : "bg-muted"
              )}>
                <AlertCircle className={cn(
                  "h-5 w-5",
                  unmappedTransactions.length > 0 ? "text-warning" : "text-muted-foreground"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
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
              <Icon className="h-4 w-4" />
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
