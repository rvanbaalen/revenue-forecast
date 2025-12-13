import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency, formatVariance } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Users,
  ArrowRight,
  Calendar,
} from 'lucide-react';

export function DashboardPage() {
  const { getTotals, getMonthlyTotal, config, sources, salaries, getSalaryTotal, getSalaryTaxCg } = useRevenue();
  const { time, getMonthStatus } = useTime();

  const expectedTotals = getTotals('expected');
  const actualTotals = getTotals('actual');

  const revenueVariance = formatVariance(expectedTotals.totalRevenue, actualTotals.totalRevenue);
  const netVariance = formatVariance(expectedTotals.net, actualTotals.net);

  // Monthly data for chart
  const monthlyData = useMemo(() => {
    return MONTHS.map(month => ({
      month,
      label: MONTH_LABELS[month],
      expected: getMonthlyTotal(month, 'expected'),
      actual: getMonthlyTotal(month, 'actual'),
      status: getMonthStatus(month, config.year),
    }));
  }, [getMonthlyTotal, getMonthStatus, config.year]);

  const maxMonthlyValue = Math.max(
    ...monthlyData.map(d => Math.max(d.expected, d.actual)),
    1
  );

  // Current month data
  const currentMonthData = monthlyData.find(d => d.status === 'current');

  // Calculate totals for salaries
  const totalSalaryCost = salaries.reduce((sum, s) => sum + getSalaryTotal(s) + getSalaryTaxCg(s), 0);

  return (
    <TooltipProvider>
      <div className="fade-in flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {time.currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">{config.year}</span>
            {config.year !== time.currentYear && (
              <span className="text-xs text-muted-foreground">
                ({config.year < time.currentYear ? 'past' : 'future'})
              </span>
            )}
          </div>
        </div>

        {/* Hero Metrics - Net Profit focus */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Net Profit - Primary */}
          <Card className="md:col-span-2 bg-primary text-primary-foreground border-0">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-primary-foreground/70 text-sm font-medium">Net Profit (Actual)</p>
                  <p className="text-3xl font-bold mt-1 tabular-nums">
                    {formatCurrency(actualTotals.net)}
                  </p>
                  <div className={cn(
                    "flex items-center gap-1 mt-2 text-sm",
                    netVariance.isPositive ? "text-primary-foreground/90" : "text-primary-foreground/70"
                  )}>
                    {netVariance.isPositive ? (
                      <TrendingUp className="size-4" />
                    ) : (
                      <TrendingDown className="size-4" />
                    )}
                    <span>{netVariance.display} vs expected</span>
                  </div>
                </div>
                <div className="p-3 bg-primary-foreground/10 rounded-xl">
                  <Wallet className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums text-foreground">
                    {formatCurrency(actualTotals.totalRevenue)}
                  </p>
                  <div className={cn(
                    "flex items-center gap-1 mt-2 text-sm",
                    revenueVariance.isPositive ? "variance-positive" : "variance-negative"
                  )}>
                    {revenueVariance.isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{revenueVariance.percentage >= 0 ? '+' : ''}{revenueVariance.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="p-2 bg-secondary rounded-lg">
                  <TrendingUp className="size-5 text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Month */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    {currentMonthData ? currentMonthData.label : 'Current Month'}
                  </p>
                  <p className="text-2xl font-bold mt-1 tabular-nums text-foreground">
                    {formatCurrency(currentMonthData?.actual || 0)}
                  </p>
                  {currentMonthData && currentMonthData.expected > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      of {formatCurrency(currentMonthData.expected)} expected
                    </p>
                  )}
                </div>
                <div className="p-2 bg-secondary rounded-lg">
                  <Calendar className="size-5 text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Monthly Revenue</CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-muted-foreground">Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-secondary border" />
                  <span className="text-muted-foreground">Expected</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-48 pt-4">
              {monthlyData.map((data) => (
                <Tooltip key={data.month}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex-1 flex flex-col gap-1 cursor-pointer group relative",
                      data.status === 'current' && "px-0.5"
                    )}>
                      {data.status === 'current' && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-end gap-0.5">
                        {/* Expected bar (background) */}
                        <div
                          className="w-full bg-secondary rounded-t transition-all group-hover:bg-accent"
                          style={{
                            height: `${Math.max((data.expected / maxMonthlyValue) * 100, 2)}%`,
                          }}
                        />
                        {/* Actual bar (overlaid) */}
                        <div
                          className={cn(
                            "w-full rounded-t transition-all absolute bottom-6",
                            data.status === 'future' ? 'bg-muted' : 'bg-primary',
                            "group-hover:opacity-90"
                          )}
                          style={{
                            height: `${Math.max((data.actual / maxMonthlyValue) * 100, 0)}%`,
                          }}
                        />
                      </div>
                      <p className={cn(
                        "text-xs text-center mt-1",
                        data.status === 'current' ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}>
                        {data.label.slice(0, 3)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{data.label} {config.year}</p>
                      <p className="text-muted-foreground">Actual: {formatCurrency(data.actual)}</p>
                      <p className="text-muted-foreground">Expected: {formatCurrency(data.expected)}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* VAT Reserved */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">VAT Reserved</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">
                    {formatCurrency(actualTotals.totalVat)}
                  </p>
                </div>
                <Receipt className="size-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Profit Tax Due */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Profit Tax Due</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">
                    {formatCurrency(actualTotals.totalProfitTax)}
                  </p>
                </div>
                <TrendingDown className="size-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Salary Costs */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Salary + Tax</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">
                    {formatCurrency(totalSalaryCost)}
                  </p>
                </div>
                <Users className="size-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/expected" className="block">
            <Card className="hover:border-ring hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary rounded-lg">
                      <TrendingUp className="size-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Expected Revenue</p>
                      <p className="text-sm text-muted-foreground">{sources.length} sources</p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/actual" className="block">
            <Card className="hover:border-ring hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Receipt className="size-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Actual Revenue</p>
                      <p className="text-sm text-muted-foreground">Track real income</p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </TooltipProvider>
  );
}
