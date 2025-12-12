import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="space-y-6 fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Accounting</h1>
        <p className="text-muted-foreground">
          Track expenses, manage budgets, and view financial reports.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{config.year} Revenue</p>
                <p className="text-2xl font-bold variance-positive">
                  {formatCurrency(pnl.revenue, false)}
                </p>
              </div>
              <div className="p-3 bg-success-muted rounded-full">
                <TrendingUp className="h-5 w-5 variance-positive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{config.year} Expenses</p>
                <p className="text-2xl font-bold variance-negative">
                  {formatCurrency(pnl.expenses, false)}
                </p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-full">
                <TrendingDown className="h-5 w-5 variance-negative" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Income</p>
                <p className={cn(
                  "text-2xl font-bold",
                  pnl.netIncome >= 0 ? "variance-positive" : "variance-negative"
                )}>
                  {formatCurrency(pnl.netIncome, false)}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                pnl.netIncome >= 0 ? "bg-success-muted" : "bg-destructive/10"
              )}>
                <DollarSign className={cn(
                  "h-5 w-5",
                  pnl.netIncome >= 0 ? "variance-positive" : "variance-negative"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Position</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(balanceSheet.assets - balanceSheet.liabilities, false)}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
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
              <Icon className="h-4 w-4" />
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
