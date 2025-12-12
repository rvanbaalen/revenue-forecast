import { useRevenue } from '../context/RevenueContext';
import { SalaryTable, SalaryTaxConfig } from '../components';
import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useTime } from '@/hooks/useTime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Users, DollarSign, Percent, Calculator } from 'lucide-react';

export function SalaryPage() {
  const { salaries, config, getSalaryTotal, getSalaryTaxCg, getMonthlySalary } = useRevenue();
  const { getMonthStatus } = useTime();

  // Calculate summary stats
  const totalGross = salaries.reduce((sum, s) => sum + getSalaryTotal(s), 0);
  const totalTax = salaries.reduce((sum, s) => sum + getSalaryTaxCg(s), 0);
  const totalCost = totalGross + totalTax;

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Salaries & Payroll</h1>
        <p className="text-muted-foreground mt-1">
          Manage employee salaries and taxes for {config.year}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="p-2 bg-secondary rounded-lg">
            <DollarSign className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Gross</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(totalGross)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="p-2 bg-secondary rounded-lg">
            <Percent className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Tax</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(totalTax)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="p-2 bg-secondary rounded-lg">
            <Calculator className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(totalCost)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="p-2 bg-secondary rounded-lg">
            <Users className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Employees</p>
            <p className="text-xl font-semibold tabular-nums">{salaries.length}</p>
          </div>
        </div>
      </div>

      {/* Monthly Overview */}
      <Card>
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base font-medium">Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {MONTHS.map(month => {
              const monthTotal = getMonthlySalary(month);
              const status = getMonthStatus(month, config.year);
              return (
                <div
                  key={month}
                  className={cn(
                    "text-center p-3 rounded-lg",
                    status === 'current' ? 'bg-accent ring-1 ring-ring' : 'bg-muted'
                  )}
                >
                  <p className={cn(
                    "text-xs font-medium uppercase mb-1",
                    status === 'current' ? 'text-foreground' : 'text-muted-foreground'
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
        </CardContent>
      </Card>

      {/* Salary Table */}
      <SalaryTable />

      {/* Tax Configuration Section */}
      {salaries.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base font-medium">Tax Configuration</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Configure taxes for each employee. Taxes can be percentage-based or fixed amount per month worked.
            </p>
            <div className="space-y-4">
              {salaries.map(salary => (
                <SalaryTaxConfig key={salary.id} salaryId={salary.id} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
