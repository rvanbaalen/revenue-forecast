import { useState, useMemo } from 'react';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useRevenue } from '@/context/RevenueContext';
import { MONTHS, MONTH_LABELS, type RevenueType } from '@/types';
import { formatCurrency } from '@/utils/format';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronRight,
  Globe,
  MapPin,
} from 'lucide-react';
import { Sparklines, SparklinesLine, SparklinesReferenceLine } from 'react-sparklines';

type SortField = 'name' | 'revenue' | 'variance' | 'reliability';

export function SourcePerformanceTab() {
  const {
    sourcePerformance,
    sources,
    getSourceValue,
    getRate,
  } = useRevenueAnalytics();

  const { updateSourceRevenue } = useRevenue();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | RevenueType>('all');
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);

  // Filter and sort sources
  const filteredSources = useMemo(() => {
    let result = [...sourcePerformance];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => s.sourceName.toLowerCase().includes(query));
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(s => s.sourceType === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.sourceName.localeCompare(b.sourceName);
          break;
        case 'revenue':
          comparison = a.ytdActual - b.ytdActual;
          break;
        case 'variance':
          comparison = a.variance.percentage - b.variance.percentage;
          break;
        case 'reliability':
          comparison = a.reliability - b.reliability;
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [sourcePerformance, searchQuery, typeFilter, sortField, sortDirection]);

  // Get source details for sheet
  const selectedSource = useMemo(() => {
    if (!selectedSourceId) return null;
    return sources.find(s => s.id === selectedSourceId) || null;
  }, [selectedSourceId, sources]);

  const selectedPerformance = useMemo(() => {
    if (!selectedSourceId) return null;
    return sourcePerformance.find(s => s.sourceId === selectedSourceId) || null;
  }, [selectedSourceId, sourcePerformance]);

  // Get sparkline data for a source
  const getSparklineData = (sourceId: number) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return [];
    return MONTHS.map(month => getSourceValue(source, month, 'actual') * getRate(source.currency));
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing':
        return <TrendingUp className="size-4 variance-positive" />;
      case 'declining':
        return <TrendingDown className="size-4 variance-negative" />;
      default:
        return <Minus className="size-4 text-muted-foreground" />;
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | RevenueType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="foreign">Foreign</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={(v) => handleSort(v as SortField)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="variance">Variance</SelectItem>
            <SelectItem value="reliability">Reliability</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Source Cards Grid */}
      {filteredSources.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {sourcePerformance.length === 0
            ? 'No revenue sources configured yet.'
            : 'No sources match your filters.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSources.map((perf) => {
            const source = sources.find(s => s.id === perf.sourceId);
            const sparklineData = getSparklineData(perf.sourceId);

            return (
              <div
                key={perf.sourceId}
                className="border border-border rounded-lg p-4 hover:border-ring transition-colors cursor-pointer"
                onClick={() => setSelectedSourceId(perf.sourceId)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{perf.sourceName}</h4>
                      {source?.isRecurring && (
                        <RefreshCw className="size-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {perf.sourceType === 'local' ? (
                        <MapPin className="size-3 text-muted-foreground" />
                      ) : (
                        <Globe className="size-3 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground capitalize">
                        {perf.sourceType}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {perf.currency}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
                </div>

                {/* Sparkline */}
                <div className="h-12 mb-3">
                  <Sparklines data={sparklineData} height={48} margin={2}>
                    <SparklinesLine
                      color={perf.monthlyTrend === 'declining' ? 'var(--color-destructive)' : 'var(--color-primary)'}
                      style={{ strokeWidth: 2, fill: 'none' }}
                    />
                    <SparklinesReferenceLine
                      type="avg"
                      style={{ stroke: 'var(--color-muted)', strokeDasharray: '3,3' }}
                    />
                  </Sparklines>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">YTD Revenue</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrency(perf.ytdActual)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">vs Expected</p>
                    <p className={cn(
                      "text-lg font-semibold tabular-nums",
                      perf.variance.isPositive ? "variance-positive" : "variance-negative"
                    )}>
                      {perf.variance.isPositive ? '+' : ''}{perf.variance.percentage.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Footer badges */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <Badge variant="outline" className="text-xs">
                    {getTrendIcon(perf.monthlyTrend)}
                    <span className="ml-1 capitalize">{perf.monthlyTrend}</span>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {perf.reliability}% reliable
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Source Detail Sheet */}
      <Sheet open={selectedSourceId !== null} onOpenChange={(open) => !open && setSelectedSourceId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedSource && selectedPerformance && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedSource.name}
                  {selectedSource.isRecurring && (
                    <Badge variant="secondary">
                      <RefreshCw className="size-3 mr-1" />
                      MRR
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {selectedSource.type === 'local' ? 'Local' : 'Foreign'} revenue source in {selectedSource.currency}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-6 mt-6">
                {/* Performance Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">YTD Revenue</p>
                    <p className="text-xl font-semibold">{formatCurrency(selectedPerformance.ytdActual)}</p>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">vs Expected</p>
                    <p className={cn(
                      "text-xl font-semibold",
                      selectedPerformance.variance.isPositive ? "variance-positive" : "variance-negative"
                    )}>
                      {selectedPerformance.variance.isPositive ? '+' : ''}
                      {selectedPerformance.variance.percentage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Avg Monthly</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(selectedPerformance.ytdActual / 12)}
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Reliability</p>
                    <p className="text-xl font-semibold">{selectedPerformance.reliability}%</p>
                  </div>
                </div>

                {/* Best/Worst Months */}
                {(selectedPerformance.bestMonth || selectedPerformance.worstMonth) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPerformance.bestMonth && (
                      <div className="border border-success/20 bg-success/5 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Best Month</p>
                        <p className="font-medium variance-positive">
                          {MONTH_LABELS[selectedPerformance.bestMonth.month]}
                        </p>
                        <p className="text-sm">
                          {formatCurrency(selectedPerformance.bestMonth.amount)}
                        </p>
                      </div>
                    )}
                    {selectedPerformance.worstMonth && (
                      <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Worst Month</p>
                        <p className="font-medium variance-negative">
                          {MONTH_LABELS[selectedPerformance.worstMonth.month]}
                        </p>
                        <p className="text-sm">
                          {formatCurrency(selectedPerformance.worstMonth.amount)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Monthly Breakdown Table */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Monthly Breakdown</h4>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Expected</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MONTHS.map((month) => {
                          const expected = getSourceValue(selectedSource, month, 'expected') * getRate(selectedSource.currency);

                          return (
                            <TableRow key={month}>
                              <TableCell>{MONTH_LABELS[month]}</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                {expected > 0 ? formatCurrency(expected, false) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  value={selectedSource.actual[month] || ''}
                                  onChange={(e) => updateSourceRevenue(
                                    selectedSource.id,
                                    month,
                                    parseFloat(e.target.value) || 0,
                                    'actual'
                                  )}
                                  placeholder="-"
                                  className="h-8 w-24 text-right font-mono ml-auto"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
