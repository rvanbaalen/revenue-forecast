import { useState, useMemo } from 'react';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { MONTHS, MONTH_LABELS, type Month } from '@/types';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

type ViewMode = 'single' | 'heatmap';

export function MonthlyAnalysisTab() {
  const {
    getMonthAnalysis,
    varianceHeatmap,
    currentMonth,
    config,
  } = useRevenueAnalytics();

  const [selectedMonth, setSelectedMonth] = useState<Month>(currentMonth);
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  const monthAnalysis = useMemo(
    () => getMonthAnalysis(selectedMonth),
    [getMonthAnalysis, selectedMonth]
  );

  const currentMonthIndex = MONTHS.indexOf(selectedMonth);

  const goToPrevMonth = () => {
    if (currentMonthIndex > 0) {
      setSelectedMonth(MONTHS[currentMonthIndex - 1]);
    }
  };

  const goToNextMonth = () => {
    if (currentMonthIndex < 11) {
      setSelectedMonth(MONTHS[currentMonthIndex + 1]);
    }
  };

  // Get variance color class based on percentage
  const getVarianceColor = (percentage: number, hasData: boolean) => {
    if (!hasData) return 'bg-muted/30';
    if (percentage >= 20) return 'bg-success/40';
    if (percentage >= 10) return 'bg-success/25';
    if (percentage >= -5) return 'bg-success/10';
    if (percentage >= -20) return 'bg-warning/25';
    return 'bg-destructive/25';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceeding':
        return <TrendingUp className="size-4 variance-positive" />;
      case 'behind':
      case 'critical':
        return <TrendingDown className="size-4 variance-negative" />;
      default:
        return <Minus className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* View Mode Toggle & Month Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('single')}
            >
              <List className="size-4" />
              Single Month
            </Button>
            <Button
              variant={viewMode === 'heatmap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('heatmap')}
            >
              <Grid3X3 className="size-4" />
              Full Year Heatmap
            </Button>
          </div>

          {viewMode === 'single' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPrevMonth}
                disabled={currentMonthIndex === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-medium w-24 text-center">
                {MONTH_LABELS[selectedMonth]} {config.year}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                disabled={currentMonthIndex === 11}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {viewMode === 'single' ? (
          /* Single Month View */
          <div className="flex flex-col gap-6">
            {/* Month Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Expected</p>
                <p className="text-2xl font-semibold mt-1">
                  {formatCurrency(monthAnalysis.totalExpected)}
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Actual</p>
                <p className="text-2xl font-semibold mt-1">
                  {formatCurrency(monthAnalysis.totalActual)}
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Variance</p>
                <p className={cn(
                  "text-2xl font-semibold mt-1",
                  monthAnalysis.variance.isPositive ? "variance-positive" : "variance-negative"
                )}>
                  {monthAnalysis.variance.isPositive ? '+' : ''}{monthAnalysis.variance.percentage.toFixed(1)}%
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className={cn(
                  "text-2xl font-semibold mt-1",
                  monthAnalysis.variance.isPositive ? "variance-positive" : "variance-negative"
                )}>
                  {formatCurrency(monthAnalysis.variance.difference)}
                </p>
              </div>
            </div>

            {/* By Type Breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Local Revenue (Taxable)</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected:</span>
                  <span>{formatCurrency(monthAnalysis.byType.local.expected)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Actual:</span>
                  <span>{formatCurrency(monthAnalysis.byType.local.actual)}</span>
                </div>
              </div>
              <div className="border border-border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Foreign Revenue</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected:</span>
                  <span>{formatCurrency(monthAnalysis.byType.foreign.expected)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Actual:</span>
                  <span>{formatCurrency(monthAnalysis.byType.foreign.actual)}</span>
                </div>
              </div>
            </div>

            {/* Source Breakdown Table */}
            <div className="border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <h4 className="text-base font-medium">Source Breakdown</h4>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">% of Target</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthAnalysis.sources.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No revenue sources configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthAnalysis.sources.map((source) => (
                      <TableRow key={source.sourceId}>
                        <TableCell className="font-medium">{source.sourceName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(source.expected)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(source.actual)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          source.variance.isPositive ? "variance-positive" : "variance-negative"
                        )}>
                          {source.variance.isPositive ? '+' : ''}{formatCurrency(source.variance.difference, false)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          source.variance.isPositive ? "variance-positive" : "variance-negative"
                        )}>
                          {source.expected > 0
                            ? `${Math.round((source.actual / source.expected) * 100)}%`
                            : source.actual > 0 ? '100%+' : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusIcon(source.variance.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* Heatmap View */
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <h4 className="text-base font-medium">Variance Heatmap</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Color intensity shows performance vs target
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 w-40">Source</TableHead>
                    {MONTHS.map(month => (
                      <TableHead
                        key={month}
                        className={cn(
                          "text-center w-16 px-1",
                          month === currentMonth && "text-primary font-semibold"
                        )}
                      >
                        {MONTH_LABELS[month]}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">YTD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varianceHeatmap.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                        No revenue sources configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    varianceHeatmap.map((source) => {
                      const ytdExpected = source.months.reduce((sum, m) => sum + m.expected, 0);
                      const ytdActual = source.months.reduce((sum, m) => sum + m.actual, 0);
                      const ytdVariance = ytdExpected > 0
                        ? ((ytdActual - ytdExpected) / ytdExpected) * 100
                        : 0;

                      return (
                        <TableRow key={source.sourceId}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium truncate max-w-[160px]">
                            {source.sourceName}
                          </TableCell>
                          {source.months.map((monthData) => {
                            const hasData = monthData.expected > 0 || monthData.actual > 0;
                            return (
                              <TableCell
                                key={monthData.month}
                                className={cn(
                                  "text-center p-1",
                                  monthData.month === currentMonth && "ring-1 ring-primary ring-inset"
                                )}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "rounded p-2 text-xs font-mono cursor-default min-h-[36px] flex items-center justify-center",
                                        getVarianceColor(monthData.variance.percentage, hasData)
                                      )}
                                    >
                                      {hasData ? (
                                        <span className={cn(
                                          monthData.variance.isPositive ? "text-success" : "text-destructive"
                                        )}>
                                          {monthData.variance.isPositive ? '+' : ''}
                                          {monthData.variance.percentage.toFixed(0)}%
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      <p className="font-medium">{MONTH_LABELS[monthData.month]} {config.year}</p>
                                      <p>Expected: {formatCurrency(monthData.expected)}</p>
                                      <p>Actual: {formatCurrency(monthData.actual)}</p>
                                      <p className={monthData.variance.isPositive ? "variance-positive" : "variance-negative"}>
                                        Variance: {monthData.variance.isPositive ? '+' : ''}
                                        {formatCurrency(monthData.variance.difference)}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            );
                          })}
                          <TableCell className={cn(
                            "text-right font-mono text-sm",
                            ytdVariance >= 0 ? "variance-positive" : "variance-negative"
                          )}>
                            {ytdVariance >= 0 ? '+' : ''}{ytdVariance.toFixed(0)}%
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-border flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">Legend:</span>
              <div className="flex items-center gap-1">
                <div className="size-4 rounded bg-success/40" />
                <span>&gt;20%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-4 rounded bg-success/25" />
                <span>10-20%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-4 rounded bg-success/10" />
                <span>On target</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-4 rounded bg-warning/25" />
                <span>Behind</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-4 rounded bg-destructive/25" />
                <span>&gt;20% below</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
