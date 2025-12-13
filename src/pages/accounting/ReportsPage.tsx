import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ProfitLossReport } from '@/components/accounting/ProfitLossReport';
import { BalanceSheetReport } from '@/components/accounting/BalanceSheetReport';
import { ExpenseBreakdownReport } from '@/components/accounting/ExpenseBreakdownReport';
import { CashFlowReport } from '@/components/accounting/CashFlowReport';
import { useRevenue } from '@/context/RevenueContext';
import type { Month } from '@/types';
import { MONTHS, MONTH_LABELS } from '@/types';

export function ReportsPage() {
  const { config } = useRevenue();
  const [selectedMonth, setSelectedMonth] = useState<Month | 'all'>('all');

  const month = selectedMonth === 'all' ? undefined : selectedMonth;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Financial Reports</h2>
          <p className="text-sm text-muted-foreground">
            View profit & loss, balance sheet, expense breakdown, and cash flow reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="month" className="text-sm">Period:</Label>
          <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v as Month | 'all')}>
            <SelectTrigger id="month" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Full Year {config.year}</SelectItem>
              {MONTHS.map(m => (
                <SelectItem key={m} value={m}>
                  {MONTH_LABELS[m]} {config.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="pnl" className="flex flex-col gap-6">
        <TabsList>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="expenses">Expense Breakdown</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="mt-6">
          <ProfitLossReport month={month} />
        </TabsContent>

        <TabsContent value="balance" className="mt-6">
          <BalanceSheetReport />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <ExpenseBreakdownReport month={month} />
        </TabsContent>

        <TabsContent value="cashflow" className="mt-6">
          <CashFlowReport month={month} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
