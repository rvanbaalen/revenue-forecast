import { useState, useMemo, createContext, useContext } from 'react';
import type { DateRange } from '../types';

interface ReportDateRangeContextValue {
  year: string;
  setYear: (year: string) => void;
  period: 'year' | 'q1' | 'q2' | 'q3' | 'q4';
  setPeriod: (period: 'year' | 'q1' | 'q2' | 'q3' | 'q4') => void;
  dateRange: DateRange;
  yearOptions: string[];
}

const ReportDateRangeContext = createContext<ReportDateRangeContextValue | null>(null);

export function useReportDateRangeProvider() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [period, setPeriod] = useState<'year' | 'q1' | 'q2' | 'q3' | 'q4'>('year');

  // Calculate date range
  const dateRange: DateRange = useMemo(() => {
    const y = parseInt(year);
    switch (period) {
      case 'q1':
        return { start: `${y}-01-01`, end: `${y}-03-31` };
      case 'q2':
        return { start: `${y}-04-01`, end: `${y}-06-30` };
      case 'q3':
        return { start: `${y}-07-01`, end: `${y}-09-30` };
      case 'q4':
        return { start: `${y}-10-01`, end: `${y}-12-31` };
      default:
        return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
  }, [year, period]);

  // Generate year options (last 5 years)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push((currentYear - i).toString());
    }
    return years;
  }, [currentYear]);

  return {
    year,
    setYear,
    period,
    setPeriod,
    dateRange,
    yearOptions,
  };
}

export function useReportDateRange() {
  const context = useContext(ReportDateRangeContext);
  if (!context) {
    throw new Error('useReportDateRange must be used within a ReportDateRangeProvider');
  }
  return context;
}

export { ReportDateRangeContext };
