import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  StatCard,
  StatCardIcon,
  StatCardContent,
  StatCardLabel,
  StatCardValue,
} from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderTree,
  Target,
  FileBarChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { useAccountingContext } from '@/context/AccountingContext';
import { useRevenue } from '@/context/RevenueContext';
import { formatCurrency } from '@/utils/format';

export function AccountingLayout() {
  const { getProfitAndLoss, getBalanceSheet } = useAccountingContext();
  const { config } = useRevenue();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Calculate key metrics for current year
  const pnl = getProfitAndLoss(config.year);
  const balanceSheet = getBalanceSheet();

  const tabs = [
    { path: '/accounting', label: 'Overview', icon: LayoutDashboard },
    { path: '/accounting/categories', label: 'Categories', icon: FolderTree },
    { path: '/accounting/budget', label: 'Budget', icon: Target },
    { path: '/accounting/reports', label: 'Reports', icon: FileBarChart },
  ];

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Accounting</h1>
        <p className="text-muted-foreground mt-1">
          Track expenses, manage budgets, and view financial reports.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard>
          <StatCardIcon variant="success">
            <TrendingUp className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>{config.year} Revenue</StatCardLabel>
            <StatCardValue variant="positive">{formatCurrency(pnl.revenue, false)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon variant="destructive">
            <TrendingDown className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>{config.year} Expenses</StatCardLabel>
            <StatCardValue variant="negative">{formatCurrency(pnl.expenses, false)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon variant={pnl.netIncome >= 0 ? 'success' : 'destructive'}>
            <DollarSign className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Net Income</StatCardLabel>
            <StatCardValue variant={pnl.netIncome >= 0 ? 'positive' : 'negative'}>
              {formatCurrency(pnl.netIncome, false)}
            </StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon variant="primary">
            <CreditCard className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Cash Position</StatCardLabel>
            <StatCardValue>{formatCurrency(balanceSheet.assets - balanceSheet.liabilities, false)}</StatCardValue>
          </StatCardContent>
        </StatCard>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPath === tab.path ||
            (tab.path !== '/accounting' && currentPath.startsWith(tab.path));
          const isOverviewActive = tab.path === '/accounting' && currentPath === '/accounting';

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                (isActive || isOverviewActive)
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Child route content */}
      <Outlet />
    </div>
  );
}
