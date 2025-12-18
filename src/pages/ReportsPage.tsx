import { Outlet } from '@tanstack/react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ReportDateRangeContext,
  useReportDateRangeProvider,
} from '@/hooks/useReportDateRange';

export function ReportsPage() {
  const dateRangeValue = useReportDateRangeProvider();

  return (
    <ReportDateRangeContext.Provider value={dateRangeValue}>
      <div className="fade-in flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Financial reports and analysis
            </p>
          </div>

          {/* Date range selector */}
          <div className="flex items-center gap-2">
            <Select value={dateRangeValue.year} onValueChange={dateRangeValue.setYear}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeValue.yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRangeValue.period} onValueChange={(v) => dateRangeValue.setPeriod(v as typeof dateRangeValue.period)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">Full Year</SelectItem>
                <SelectItem value="q1">Q1 (Jan-Mar)</SelectItem>
                <SelectItem value="q2">Q2 (Apr-Jun)</SelectItem>
                <SelectItem value="q3">Q3 (Jul-Sep)</SelectItem>
                <SelectItem value="q4">Q4 (Oct-Dec)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Report content */}
        <Outlet />
      </div>
    </ReportDateRangeContext.Provider>
  );
}
