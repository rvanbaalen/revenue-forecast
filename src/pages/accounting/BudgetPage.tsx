import { BudgetTable } from '@/components/accounting/BudgetTable';
import { useRevenue } from '@/context/RevenueContext';

export function BudgetPage() {
  const { config } = useRevenue();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Expense Budget — {config.year}</h2>
        <p className="text-sm text-muted-foreground">
          Set monthly expense targets for each category. Click on a cell to edit the budget amount.
          Actual expenses are shown below each budget (calculated from categorized transactions).
        </p>
      </div>

      <BudgetTable />
    </div>
  );
}
