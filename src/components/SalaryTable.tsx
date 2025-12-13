import { MONTHS, MONTH_LABELS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Salaries</h2>
        <Button onClick={addSalary} size="sm" variant="outline">
          <Plus className="size-4" />
          Add Employee
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-40">Employee</TableHead>
            {MONTHS.map(month => {
              const status = getMonthStatus(month, config.year);
              return (
                <TableHead
                  key={month}
                  className={cn(
                    "w-20 text-right",
                    status === 'current' && "text-primary font-semibold"
                  )}
                >
                  {MONTH_LABELS[month]}
                </TableHead>
              );
            })}
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salaries.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={17}
                className="h-24 text-center text-muted-foreground"
              >
                No employees yet. Add one to get started.
              </TableCell>
            </TableRow>
          ) : (
            salaries.map(salary => {
              const total = getSalaryTotal(salary);
              const taxCg = getSalaryTaxCg(salary);
              const taxPct = total > 0 ? (taxCg / total) * 100 : 0;

              return (
                <TableRow key={salary.id} className="group">
                  <TableCell className="p-1">
                    <Input
                      type="text"
                      value={salary.name}
                      onChange={(e) => updateSalary(salary.id, { name: e.target.value })}
                      className="h-8 border-transparent bg-transparent hover:bg-muted focus:bg-background"
                      placeholder="Employee name"
                    />
                  </TableCell>
                  {MONTHS.map(month => {
                    const status = getMonthStatus(month, config.year);
                    return (
                      <TableCell
                        key={month}
                        className={cn(
                          "p-1",
                          status === 'current' && "bg-primary/5"
                        )}
                      >
                        <Input
                          type="number"
                          value={salary.amounts[month] || ''}
                          onChange={(e) => updateSalaryAmount(salary.id, month, parseFloat(e.target.value) || 0)}
                          placeholder="—"
                          className="h-8 text-sm font-mono text-right border-transparent bg-transparent hover:bg-muted focus:bg-background"
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(total, false)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(taxCg, false)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground text-sm">
                    {taxPct.toFixed(1)}%
                  </TableCell>
                  <TableCell className="p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSalary(salary.id)}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
        {salaries.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Monthly Total</TableCell>
              {MONTHS.map(month => {
                const status = getMonthStatus(month, config.year);
                return (
                  <TableCell
                    key={month}
                    className={cn(
                      "text-right font-mono",
                      status === 'current' && "text-primary font-semibold bg-primary/5"
                    )}
                  >
                    {formatCurrency(getMonthlySalary(month), false)}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-mono text-muted-foreground">
                {formatCurrency(totalSalaryGross, false)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatCurrency(totalSalaryTax, false)}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {totalTaxPct.toFixed(1)}%
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
