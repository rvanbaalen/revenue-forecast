import { Link } from '@tanstack/react-router';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatWholeNumber } from '../utils/decimal';
import {
  StatCard,
  StatCardIcon,
  StatCardContent,
  StatCardLabel,
  StatCardValue,
} from '@/components/ui/stat-card';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  AlertTriangle,
  ArrowRight,
  Building2,
  CreditCard,
  FileText,
  Settings,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DashboardPage() {
  const {
    activeContext,
    contexts,
    setActiveContext,
    contextAccounts: accounts,
    contextTransactions: transactions,
    getSummaryMetrics,
  } = useApp();

  // Get current year date range for metrics
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;
  const period = { start: yearStart, end: yearEnd };

  const metrics = getSummaryMetrics(period);

  // Count accounts by type
  const checkingAccounts = accounts.filter((a) => a.type === 'checking');
  const creditCardAccounts = accounts.filter((a) => a.type === 'credit_card');

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {now.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Context selector */}
        {contexts.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Context:</span>
            <select
              value={activeContext?.id || ''}
              onChange={(e) => setActiveContext(e.target.value)}
              className="text-sm border border-border rounded px-2 py-1 bg-background"
            >
              {contexts.map((ctx) => (
                <option key={ctx.id} value={ctx.id}>
                  {ctx.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Hero Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Net Profit - Primary */}
        <StatCard className="md:col-span-2 bg-primary text-primary-foreground border-0">
          <StatCardIcon variant="primary" className="bg-primary-foreground/10">
            <Wallet className="size-6" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel className="text-primary-foreground/70">
              Net Profit ({now.getFullYear()})
            </StatCardLabel>
            <StatCardValue className="text-3xl text-primary-foreground">
              {formatCurrency(metrics.netProfit, '$', 0)}
            </StatCardValue>
            <p className="text-sm text-primary-foreground/70 mt-1">
              After {formatCurrency(metrics.taxOwed, '$', 0)} tax on local income
            </p>
          </StatCardContent>
        </StatCard>

        {/* Total Income */}
        <StatCard>
          <StatCardIcon variant="success">
            <TrendingUp className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Total Income</StatCardLabel>
            <StatCardValue variant="positive">
              {formatCurrency(metrics.totalIncome, '$', 0)}
            </StatCardValue>
          </StatCardContent>
        </StatCard>

        {/* Total Expenses */}
        <StatCard>
          <StatCardIcon variant="destructive">
            <TrendingDown className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Total Expenses</StatCardLabel>
            <StatCardValue variant="negative">
              {formatCurrency(metrics.totalExpenses, '$', 0)}
            </StatCardValue>
          </StatCardContent>
        </StatCard>
      </div>

      {/* Uncategorized Alert */}
      {metrics.uncategorizedCount > 0 && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-warning" />
              <div>
                <p className="font-medium text-foreground">
                  {metrics.uncategorizedCount} uncategorized transaction
                  {metrics.uncategorizedCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  Categorize them for accurate reports
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/transactions">
                Review
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Accounts */}
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Accounts</p>
              <p className="text-xl font-semibold mt-1 tabular-nums">
                {accounts.length}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {checkingAccounts.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Building2 className="size-3" />
                    {checkingAccounts.length} checking
                  </span>
                )}
                {creditCardAccounts.length > 0 && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="size-3" />
                    {creditCardAccounts.length} credit
                  </span>
                )}
              </div>
            </div>
            <Building2 className="size-5 text-muted-foreground" />
          </div>
        </div>

        {/* Transactions */}
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Transactions</p>
              <p className="text-xl font-semibold mt-1 tabular-nums">
                {formatWholeNumber(metrics.transactionCount)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This year
              </p>
            </div>
            <Receipt className="size-5 text-muted-foreground" />
          </div>
        </div>

        {/* Net Worth */}
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Net Worth</p>
              <p
                className={cn(
                  'text-xl font-semibold mt-1 tabular-nums',
                  parseFloat(metrics.netWorth) >= 0
                    ? 'variance-positive'
                    : 'variance-negative'
                )}
              >
                {formatCurrency(metrics.netWorth, '$', 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Assets - Liabilities
              </p>
            </div>
            <Wallet className="size-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/reports" className="block">
          <div className="p-4 bg-card border border-border rounded-lg hover:border-ring hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <FileText className="size-4 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Reports</p>
                  <p className="text-sm text-muted-foreground">
                    Balance Sheet, P&L, Cash Flow
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>
          </div>
        </Link>

        <Link to="/transactions" className="block">
          <div className="p-4 bg-card border border-border rounded-lg hover:border-ring hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Receipt className="size-4 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Transactions</p>
                  <p className="text-sm text-muted-foreground">
                    View and categorize
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>
          </div>
        </Link>

        <Link to="/import" className="block">
          <div className="p-4 bg-card border border-border rounded-lg hover:border-ring hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Upload className="size-4 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Import</p>
                  <p className="text-sm text-muted-foreground">
                    Upload OFX bank statements
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>
          </div>
        </Link>

        <Link to="/settings" className="block">
          <div className="p-4 bg-card border border-border rounded-lg hover:border-ring hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Settings className="size-4 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Settings</p>
                  <p className="text-sm text-muted-foreground">
                    Contexts, categories, rules
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
      </div>

      {/* Empty state */}
      {accounts.length === 0 && transactions.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Upload className="size-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">Get Started</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Import your first OFX bank statement to begin tracking
          </p>
          <Button asChild>
            <Link to="/import">
              <Upload className="size-4" />
              Import OFX File
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
