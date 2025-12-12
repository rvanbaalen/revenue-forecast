import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

export function SalaryTable() {
  const {
    salaries,
    config,
    addSalary,
    updateSalary,
    updateSalaryAmount,
    deleteSalary,
    getSalaryTotal,
    getSalaryTaxCg,
    getMonthlySalary,
  } = useRevenue();

  const { getMonthStatus } = useTime();

  const totalSalaryGross = salaries.reduce((sum, s) => sum + getSalaryTotal(s), 0);
  const totalSalaryTax = salaries.reduce((sum, s) => sum + getSalaryTaxCg(s), 0);
  const totalTaxPct = totalSalaryGross > 0 ? (totalSalaryTax / totalSalaryGross) * 100 : 0;

  return (
    <Card className="fade-in">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-foreground">
            Salaries
          </CardTitle>
          <Button onClick={addSalary} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm table-clean">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground w-32">Employee</th>
                {MONTHS.map(month => {
                  const status = getMonthStatus(month, config.year);
                  return (
                    <th key={month} className={cn(
                      "px-2 py-3 text-right font-medium text-muted-foreground min-w-[80px]",
                      status === 'current' && 'bg-accent text-foreground'
                    )}>
                      {MONTH_LABELS[month]}
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">Gross</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">Tax</th>
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">%</th>
                <th className="px-3 py-3 text-center font-medium text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody>
              {salaries.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-3 py-8 text-center text-muted-foreground">
                    No employees yet. Click "Add Employee" to get started.
                  </td>
                </tr>
              ) : (
                salaries.map(salary => {
                  const total = getSalaryTotal(salary);
                  const taxCg = getSalaryTaxCg(salary);
                  const taxPct = total > 0 ? (taxCg / total) * 100 : 0;

                  return (
                    <tr key={salary.id} className="group">
                      <td className="px-3 py-2">
                        <Input
                          type="text"
                          value={salary.name}
                          onChange={(e) => updateSalary(salary.id, { name: e.target.value })}
                          className="h-8 text-sm border-transparent hover:border-border focus:border-ring"
                          placeholder="Employee name"
                        />
                      </td>
                      {MONTHS.map(month => {
                        const status = getMonthStatus(month, config.year);
                        return (
                          <td key={month} className={cn(
                            "px-1 py-2",
                            status === 'current' && 'bg-accent/50'
                          )}>
                            <Input
                              type="number"
                              value={salary.amounts[month] || ''}
                              onChange={(e) => updateSalaryAmount(salary.id, month, parseFloat(e.target.value) || 0)}
                              placeholder="-"
                              className="w-full h-8 text-sm font-mono text-right border-transparent hover:border-border focus:border-ring"
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {formatCurrency(total, false)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-foreground font-medium">
                        {formatCurrency(taxCg, false)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {taxPct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSalary(salary.id)}
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {salaries.length > 0 && (
              <tfoot>
                <tr className="bg-muted font-medium">
                  <td className="px-3 py-3 text-muted-foreground">Monthly Total</td>
                  {MONTHS.map(month => {
                    const status = getMonthStatus(month, config.year);
                    return (
                      <td key={month} className={cn(
                        "px-2 py-3 text-right font-mono",
                        status === 'current' ? 'text-foreground bg-accent' : 'text-muted-foreground'
                      )}>
                        {formatCurrency(getMonthlySalary(month), false)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                    {formatCurrency(totalSalaryGross, false)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-foreground font-semibold">
                    {formatCurrency(totalSalaryTax, false)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                    {totalTaxPct.toFixed(1)}%
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
