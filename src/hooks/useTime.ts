import { useMemo, useCallback } from 'react';
import type { Month } from '../types';
import { MONTHS } from '../types';

export interface TimeInfo {
  currentYear: number;
  currentMonth: Month;
  currentMonthIndex: number;
  currentDate: Date;
}

export interface TimeUtils {
  // Current time info
  time: TimeInfo;

  // Month status helpers for a given year
  isCurrentMonth: (month: Month, year: number) => boolean;
  isPastMonth: (month: Month, year: number) => boolean;
  isFutureMonth: (month: Month, year: number) => boolean;
  getMonthStatus: (month: Month, year: number) => 'past' | 'current' | 'future';

  // Year comparison helpers
  isCurrentYear: (year: number) => boolean;
  isPastYear: (year: number) => boolean;
  isFutureYear: (year: number) => boolean;
  getYearStatus: (year: number) => 'past' | 'current' | 'future';

  // Generate year options for navigation
  getYearOptions: (range?: number) => number[];

  // Format helpers
  formatMonthYear: (month: Month, year: number) => string;
  getRelativeTimeLabel: (month: Month, year: number) => string;
}

export function useTime(): TimeUtils {
  const now = useMemo(() => new Date(), []);

  const time: TimeInfo = useMemo(() => {
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth(); // 0-indexed
    const currentMonth = MONTHS[currentMonthIndex];

    return {
      currentYear,
      currentMonth,
      currentMonthIndex,
      currentDate: now,
    };
  }, [now]);

  const isCurrentMonth = useCallback((month: Month, year: number): boolean => {
    return year === time.currentYear && month === time.currentMonth;
  }, [time]);

  const isPastMonth = useCallback((month: Month, year: number): boolean => {
    if (year < time.currentYear) return true;
    if (year > time.currentYear) return false;
    return MONTHS.indexOf(month) < time.currentMonthIndex;
  }, [time]);

  const isFutureMonth = useCallback((month: Month, year: number): boolean => {
    if (year > time.currentYear) return true;
    if (year < time.currentYear) return false;
    return MONTHS.indexOf(month) > time.currentMonthIndex;
  }, [time]);

  const getMonthStatus = useCallback((month: Month, year: number): 'past' | 'current' | 'future' => {
    if (isCurrentMonth(month, year)) return 'current';
    if (isPastMonth(month, year)) return 'past';
    return 'future';
  }, [isCurrentMonth, isPastMonth]);

  const isCurrentYear = useCallback((year: number): boolean => {
    return year === time.currentYear;
  }, [time]);

  const isPastYear = useCallback((year: number): boolean => {
    return year < time.currentYear;
  }, [time]);

  const isFutureYear = useCallback((year: number): boolean => {
    return year > time.currentYear;
  }, [time]);

  const getYearStatus = useCallback((year: number): 'past' | 'current' | 'future' => {
    if (isCurrentYear(year)) return 'current';
    if (isPastYear(year)) return 'past';
    return 'future';
  }, [isCurrentYear, isPastYear]);

  const getYearOptions = useCallback((range: number = 5): number[] => {
    const years: number[] = [];
    const startYear = time.currentYear - Math.floor(range / 2);
    for (let i = 0; i < range; i++) {
      years.push(startYear + i);
    }
    return years;
  }, [time]);

  const formatMonthYear = useCallback((month: Month, year: number): string => {
    const monthIndex = MONTHS.indexOf(month);
    const date = new Date(year, monthIndex, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, []);

  const getRelativeTimeLabel = useCallback((month: Month, year: number): string => {
    const status = getMonthStatus(month, year);
    if (status === 'current') return 'Current month';

    const monthIndex = MONTHS.indexOf(month);
    const targetDate = new Date(year, monthIndex, 1);
    const currentDate = new Date(time.currentYear, time.currentMonthIndex, 1);

    const diffMonths = (targetDate.getFullYear() - currentDate.getFullYear()) * 12
      + (targetDate.getMonth() - currentDate.getMonth());

    if (diffMonths === -1) return 'Last month';
    if (diffMonths === 1) return 'Next month';
    if (diffMonths < 0) return `${Math.abs(diffMonths)} months ago`;
    return `In ${diffMonths} months`;
  }, [time, getMonthStatus]);

  return {
    time,
    isCurrentMonth,
    isPastMonth,
    isFutureMonth,
    getMonthStatus,
    isCurrentYear,
    isPastYear,
    isFutureYear,
    getYearStatus,
    getYearOptions,
    formatMonthYear,
    getRelativeTimeLabel,
  };
}
