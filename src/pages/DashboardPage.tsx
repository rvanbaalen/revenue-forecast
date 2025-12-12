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
      <div className="fade-in space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
            <p className="text-zinc-500 mt-1">
              {time.currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span className="font-medium text-zinc-600">{config.year}</span>
            {config.year !== time.currentYear && (
              <span className="text-xs text-zinc-400">
                ({config.year < time.currentYear ? 'past' : 'future'})
              </span>
            )}
          </div>
        </div>

        {/* Hero Metrics - Net Profit focus */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Net Profit - Primary */}
          <Card className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-700 border-0 text-white">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-indigo-200 text-sm font-medium">Net Profit (Actual)</p>
                  <p className="text-3xl font-bold mt-1 tabular-nums">
                    {formatCurrency(actualTotals.net)}
                  </p>
                  <div className={cn(
                    "flex items-center gap-1 mt-2 text-sm",
                    netVariance.isPositive ? "text-emerald-300" : "text-red-300"
                  )}>
                    {netVariance.isPositive ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{netVariance.display} vs expected</span>
                  </div>
                </div>
                <div className="p-3 bg-white/10 rounded-xl">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-500 text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums text-zinc-900">
                    {formatCurrency(actualTotals.totalRevenue)}
                  </p>
                  <div className={cn(
                    "flex items-center gap-1 mt-2 text-sm",
                    revenueVariance.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {revenueVariance.isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{revenueVariance.percentage >= 0 ? '+' : ''}{revenueVariance.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Month */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-500 text-sm font-medium">
                    {currentMonthData ? currentMonthData.label : 'Current Month'}
                  </p>
                  <p className="text-2xl font-bold mt-1 tabular-nums text-zinc-900">
                    {formatCurrency(currentMonthData?.actual || 0)}
                  </p>
                  {currentMonthData && currentMonthData.expected > 0 && (
                    <p className="text-sm text-zinc-500 mt-2">
                      of {formatCurrency(currentMonthData.expected)} expected
                    </p>
                  )}
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
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
                  <div className="w-3 h-3 rounded-sm bg-indigo-600" />
                  <span className="text-zinc-500">Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-indigo-200" />
                  <span className="text-zinc-500">Expected</span>
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
                          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-end gap-0.5">
                        {/* Expected bar (background) */}
                        <div
                          className="w-full bg-indigo-100 rounded-t transition-all group-hover:bg-indigo-200"
                          style={{
                            height: `${Math.max((data.expected / maxMonthlyValue) * 100, 2)}%`,
                          }}
                        />
                        {/* Actual bar (overlaid) */}
                        <div
                          className={cn(
                            "w-full rounded-t transition-all absolute bottom-6",
                            data.status === 'future' ? 'bg-zinc-300' : 'bg-indigo-600',
                            "group-hover:opacity-90"
                          )}
                          style={{
                            height: `${Math.max((data.actual / maxMonthlyValue) * 100, 0)}%`,
                          }}
                        />
                      </div>
                      <p className={cn(
                        "text-xs text-center mt-1",
                        data.status === 'current' ? 'text-indigo-600 font-medium' : 'text-zinc-400'
                      )}>
                        {data.label.slice(0, 3)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{data.label} {config.year}</p>
                      <p className="text-zinc-400">Actual: {formatCurrency(data.actual)}</p>
                      <p className="text-zinc-400">Expected: {formatCurrency(data.expected)}</p>
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
                  <p className="text-zinc-500 text-sm">VAT Reserved</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">
                    {formatCurrency(actualTotals.totalVat)}
                  </p>
                </div>
                <Receipt className="w-5 h-5 text-zinc-400" />
              </div>
            </CardContent>
          </Card>

          {/* Profit Tax Due */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-sm">Profit Tax Due</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">
                    {formatCurrency(actualTotals.totalProfitTax)}
                  </p>
                </div>
                <TrendingDown className="w-5 h-5 text-zinc-400" />
              </div>
            </CardContent>
          </Card>

          {/* Salary Costs */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-sm">Salary + Tax</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">
                    {formatCurrency(totalSalaryCost)}
                  </p>
                </div>
                <Users className="w-5 h-5 text-zinc-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/expected" className="block">
            <Card className="hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">Expected Revenue</p>
                      <p className="text-sm text-zinc-500">{sources.length} sources</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/actual" className="block">
            <Card className="hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Receipt className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">Actual Revenue</p>
                      <p className="text-sm text-zinc-500">Track real income</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </TooltipProvider>
  );
}
