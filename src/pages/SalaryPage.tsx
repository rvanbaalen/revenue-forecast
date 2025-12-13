import { useRevenue } from '../context/RevenueContext';
import { SalaryTable, SalaryTaxConfig } from '../components';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useTime } from '@/hooks/useTime';
import { cn } from '@/lib/utils';
import { Users, DollarSign, Percent, Calculator } from 'lucide-react';
import {
  StatCard,
  StatCardIcon,
  StatCardContent,
  StatCardLabel,
  StatCardValue,
} from '@/components/ui/stat-card';

export function SalaryPage() {
  const { salaries, config, getSalaryTotal, getSalaryTaxCg, getMonthlySalary } = useRevenue();
  const { getMonthStatus } = useTime();

  // Calculate summary stats
  const totalGross = salaries.reduce((sum, s) => sum + getSalaryTotal(s), 0);
  const totalTax = salaries.reduce((sum, s) => sum + getSalaryTaxCg(s), 0);
  const totalCost = totalGross + totalTax;

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Salaries & Payroll</h1>
        <p className="text-muted-foreground mt-1">
          Manage employee salaries and taxes for {config.year}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard>
          <StatCardIcon>
            <DollarSign className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Total Gross</StatCardLabel>
            <StatCardValue>{formatCurrency(totalGross)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon>
            <Percent className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Total Tax</StatCardLabel>
            <StatCardValue>{formatCurrency(totalTax)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon>
            <Calculator className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Total Cost</StatCardLabel>
            <StatCardValue>{formatCurrency(totalCost)}</StatCardValue>
          </StatCardContent>
        </StatCard>

        <StatCard>
          <StatCardIcon>
            <Users className="size-5" />
          </StatCardIcon>
          <StatCardContent>
            <StatCardLabel>Employees</StatCardLabel>
            <StatCardValue>{salaries.length}</StatCardValue>
          </StatCardContent>
        </StatCard>
      </div>

      {/* Monthly Overview */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Monthly Overview</h2>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {MONTHS.map(month => {
            const monthTotal = getMonthlySalary(month);
            const status = getMonthStatus(month, config.year);
            return (
              <div
                key={month}
                className={cn(
                  "text-center p-3 rounded-lg",
                  status === 'current' ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted'
                )}
              >
                <p className={cn(
                  "text-xs font-medium uppercase mb-1",
                  status === 'current' ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {MONTH_LABELS[month].slice(0, 3)}
                </p>
                <p className={cn(
                  "text-sm font-mono font-medium",
                  status === 'current' ? 'text-foreground' : 'text-foreground'
                )}>
                  {monthTotal > 0 ? formatCurrency(monthTotal, false) : '-'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Salary Table */}
      <SalaryTable />

      {/* Tax Configuration Section */}
      {salaries.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-medium">Tax Configuration</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure taxes for each employee. Taxes can be percentage-based or fixed amount per month worked.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {salaries.map(salary => (
              <SalaryTaxConfig key={salary.id} salaryId={salary.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
