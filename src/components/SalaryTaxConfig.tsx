import type { SalaryTax } from '../types';
import { MONTHS } from '../types';
import { formatCurrency } from '../utils/format';
import { useRevenue } from '../context/RevenueContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

interface SalaryTaxConfigProps {
  salaryId: number;
}

export function SalaryTaxConfig({ salaryId }: SalaryTaxConfigProps) {
  const {
    salaries,
    getTaxesForSalary,
    getSalaryTotal,
    addSalaryTax,
    updateSalaryTax,
    deleteSalaryTax,
  } = useRevenue();

  const salary = salaries.find(s => s.id === salaryId);
  if (!salary) return null;

  const taxes = getTaxesForSalary(salaryId);
  const salaryTotal = getSalaryTotal(salary);
  const monthsWorked = MONTHS.filter(m => (salary.amounts[m] || 0) > 0).length;

  const calculateTaxAmount = (tax: SalaryTax): number => {
    if (tax.type === 'percentage') {
      return salaryTotal * (tax.value / 100);
    }
    return tax.value * monthsWorked;
  };

  const totalTax = taxes.reduce((sum, tax) => sum + calculateTaxAmount(tax), 0);
  const totalTaxPct = salaryTotal > 0 ? (totalTax / salaryTotal) * 100 : 0;

  return (
    <div className="bg-muted rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">
          {salary.name}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSalaryTax(salary.id)}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Tax
        </Button>
      </div>

      {taxes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No taxes configured</p>
      ) : (
        <div className="space-y-2">
          {taxes.map((tax) => {
            const taxAmount = calculateTaxAmount(tax);
            const taxPct = salaryTotal > 0 ? (taxAmount / salaryTotal) * 100 : 0;

            return (
              <div
                key={tax.id}
                className="flex items-center gap-2 p-2 bg-card rounded border border-border"
              >
                <Input
                  type="text"
                  value={tax.name}
                  onChange={(e) => updateSalaryTax(tax.id, { name: e.target.value })}
                  placeholder="Tax name"
                  className="flex-1 h-8 text-sm"
                />
                <Select
                  value={tax.type}
                  onValueChange={(v) =>
                    updateSalaryTax(tax.id, { type: v as 'percentage' | 'fixed' })
                  }
                >
                  <SelectTrigger className="w-28 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed/month</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={tax.value || ''}
                    step={0.01}
                    min={0}
                    onChange={(e) =>
                      updateSalaryTax(tax.id, { value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-20 h-8 text-sm font-mono text-right"
                  />
                  <span className="text-muted-foreground text-xs w-6">
                    {tax.type === 'percentage' ? '%' : 'Cg'}
                  </span>
                </div>
                <span className="text-foreground text-sm font-mono w-24 text-right font-medium">
                  {formatCurrency(taxAmount, false)}
                </span>
                <span className="text-muted-foreground text-xs w-12 text-right">
                  ({taxPct.toFixed(1)}%)
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteSalaryTax(tax.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {taxes.length > 1 && (
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-foreground font-mono font-semibold">
                {formatCurrency(totalTax, false)}
              </span>
              <span className="text-muted-foreground text-xs">
                ({totalTaxPct.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
