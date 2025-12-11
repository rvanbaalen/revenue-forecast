import { formatCurrency, formatVariance } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DollarSign,
  Receipt,
  Percent,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export function SummaryDashboard() {
  const { getTotals, config } = useRevenue();
  const { getYearStatus } = useTime();

  const expectedTotals = getTotals('expected');
  const actualTotals = getTotals('actual');
  const yearStatus = getYearStatus(config.year);

  const revenueVariance = formatVariance(expectedTotals.totalRevenue, actualTotals.totalRevenue);
  const netVariance = formatVariance(expectedTotals.net, actualTotals.net);

  const VarianceIndicator = ({ variance }: { variance: ReturnType<typeof formatVariance> }) => (
    <div className={cn(
      "flex items-center gap-1 text-xs font-mono",
      variance.isPositive ? 'text-emerald-400' : 'text-red-400'
    )}>
      {variance.isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {variance.display}
    </div>
  );

  return (
    <TooltipProvider>
      <section className="mb-8 fade-in">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-300">Summary</h2>
          <Badge variant={yearStatus} className="text-xs">
            {config.year}
          </Badge>
        </div>

        {/* Expected vs Actual Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Expected Summary */}
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-semibold text-amber-400 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Expected (Budget)
              </CardTitle>
              <CardDescription>
                Projected revenue and expenses for {config.year}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <p className="text-sm text-slate-400">Total Revenue</p>
                      </div>
                      <p className="text-xl font-bold font-mono text-slate-200">
                        {formatCurrency(expectedTotals.totalRevenue)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Gross revenue before taxes</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt className="h-4 w-4 text-emerald-400" />
                        <p className="text-sm text-slate-400">VAT to Reserve</p>
                      </div>
                      <p className="text-xl font-bold font-mono text-emerald-400">
                        {formatCurrency(expectedTotals.totalVat)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>VAT at {config.vatRate}% on local revenue</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-4 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Percent className="h-4 w-4 text-amber-400" />
                        <p className="text-sm text-slate-400">Profit Tax Due</p>
                      </div>
                      <p className="text-xl font-bold font-mono text-amber-400">
                        {formatCurrency(expectedTotals.totalProfitTax)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Profit tax at {config.profitTaxRate}% on local revenue</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl p-4 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-purple-400" />
                        <p className="text-sm text-slate-400">Salary + Tax</p>
                      </div>
                      <p className="text-xl font-bold font-mono text-purple-400">
                        {formatCurrency(expectedTotals.totalSalaryGross + expectedTotals.totalSalaryTax)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Total salary costs including payroll taxes</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="col-span-2 bg-gradient-to-br from-sky-500/10 to-violet-500/10 rounded-xl p-4 border border-sky-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="h-4 w-4 text-sky-400" />
                        <p className="text-sm text-slate-400">Net After All</p>
                      </div>
                      <p className="text-2xl font-bold font-mono text-sky-400">
                        {formatCurrency(expectedTotals.net)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Revenue minus all taxes, VAT, and salaries</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Actual Summary */}
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-semibold text-emerald-400 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Actual
              </CardTitle>
              <CardDescription>
                Recorded revenue and expenses for {config.year}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <p className="text-sm text-slate-400">Total Revenue</p>
                      </div>
                      <p className="text-xl font-bold font-mono text-slate-200">
                        {formatCurrency(actualTotals.totalRevenue)}
                      </p>
                      <VarianceIndicator variance={revenueVariance} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {revenueVariance.isPositive ? 'Above' : 'Below'} expected by {revenueVariance.percentage.toFixed(1)}%
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt className="h-4 w-4 text-emerald-400" />
                        <p className="text-sm text-slate-400">VAT to Reserve</p>
                      </div>
                      <p className="text-xl font-bold font-mono text-emerald-400">
                        {formatCurrency(actualTotals.totalVat)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>VAT at {config.vatRate}% on local revenue</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-4 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Percent className="h-4 w-4 text-amber-400" />
                        <p className="text-sm text-slate-400">Profit Tax Due</p>
                      </div>
                      <p className="text-xl font-bold font-mono text-amber-400">
                        {formatCurrency(actualTotals.totalProfitTax)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Profit tax at {config.profitTaxRate}% on local revenue</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl p-4 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-purple-400" />
                        <p className="text-sm text-slate-400">Salary + Tax</p>
                      </div>
                      <p className="text-xl font-bold font-mono text-purple-400">
                        {formatCurrency(actualTotals.totalSalaryGross + actualTotals.totalSalaryTax)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Total salary costs including payroll taxes</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="col-span-2 bg-gradient-to-br from-sky-500/10 to-violet-500/10 rounded-xl p-4 border border-sky-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="h-4 w-4 text-sky-400" />
                        <p className="text-sm text-slate-400">Net After All</p>
                      </div>
                      <p className="text-2xl font-bold font-mono text-sky-400">
                        {formatCurrency(actualTotals.net)}
                      </p>
                      <VarianceIndicator variance={netVariance} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {netVariance.isPositive ? 'Above' : 'Below'} expected by {netVariance.percentage.toFixed(1)}%
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Revenue Variance</p>
            <p className={cn(
              "text-lg font-bold font-mono",
              revenueVariance.isPositive ? 'text-emerald-400' : 'text-red-400'
            )}>
              {revenueVariance.percentage >= 0 ? '+' : ''}{revenueVariance.percentage.toFixed(1)}%
            </p>
          </Card>

          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Net Variance</p>
            <p className={cn(
              "text-lg font-bold font-mono",
              netVariance.isPositive ? 'text-emerald-400' : 'text-red-400'
            )}>
              {netVariance.percentage >= 0 ? '+' : ''}{netVariance.percentage.toFixed(1)}%
            </p>
          </Card>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-4 text-center cursor-help">
                <p className="text-xs text-slate-400 mb-1">Expected Margin</p>
                <p className="text-lg font-bold font-mono text-slate-200">
                  {expectedTotals.totalRevenue > 0
                    ? ((expectedTotals.net / expectedTotals.totalRevenue) * 100).toFixed(1)
                    : '0'}%
                </p>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Net profit as percentage of revenue</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-4 text-center cursor-help">
                <p className="text-xs text-slate-400 mb-1">Actual Margin</p>
                <p className="text-lg font-bold font-mono text-slate-200">
                  {actualTotals.totalRevenue > 0
                    ? ((actualTotals.net / actualTotals.totalRevenue) * 100).toFixed(1)
                    : '0'}%
                </p>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Net profit as percentage of revenue</TooltipContent>
          </Tooltip>
        </div>
      </section>
    </TooltipProvider>
  );
}
