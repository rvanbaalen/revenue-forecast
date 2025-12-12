import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAccountingContext } from '@/context/AccountingContext';
import type { ChartAccount } from '@/types';

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Filter to specific account types. Default: ['REVENUE', 'EXPENSE'] */
  accountTypes?: Array<'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY'>;
  /** Show type group headers */
  showGroupHeaders?: boolean;
}

export function CategorySelect({
  value,
  onValueChange,
  placeholder = 'Select a category',
  disabled = false,
  className,
  accountTypes = ['REVENUE', 'EXPENSE'],
  showGroupHeaders = true,
}: CategorySelectProps) {
  const { chartAccounts } = useAccountingContext();

  // Build hierarchical category list with proper indentation
  const categoriesByType = useMemo(() => {
    // Filter to active, non-parent accounts of the requested types
    const assignable = chartAccounts.filter(a =>
      accountTypes.includes(a.type as typeof accountTypes[number]) &&
      a.isActive &&
      !a.parentId?.match(/^[1-5]000$/) // Exclude top-level parent accounts
    );

    // Group by type
    const grouped: Record<string, ChartAccount[]> = {};
    for (const type of accountTypes) {
      const accounts = assignable.filter(a => a.type === type);
      if (accounts.length > 0) {
        // Sort by code to maintain hierarchy
        grouped[type] = accounts.sort((a, b) => a.code.localeCompare(b.code));
      }
    }

    return grouped;
  }, [chartAccounts, accountTypes]);

  // Calculate indentation level based on code structure
  const getIndentLevel = (account: ChartAccount): number => {
    // Codes like 5100, 5200 are level 0 (parent categories)
    // Codes like 5110, 5120, 5210 are level 1 (child categories)
    const code = account.code;
    if (code.endsWith('00')) return 0;
    return 1;
  };

  const typeLabels: Record<string, { label: string; icon: typeof TrendingUp }> = {
    REVENUE: { label: 'Revenue', icon: TrendingUp },
    EXPENSE: { label: 'Expense', icon: TrendingDown },
  };

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(categoriesByType).map(([type, accounts]) => {
          const typeConfig = typeLabels[type];
          const Icon = typeConfig?.icon;

          return (
            <div key={type}>
              {showGroupHeaders && typeConfig && (
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  {Icon && <Icon className="h-3 w-3" />}
                  {typeConfig.label} Categories
                </div>
              )}
              {accounts.map(account => {
                const indent = getIndentLevel(account);
                const isParent = account.code.endsWith('00');

                return (
                  <SelectItem
                    key={account.id}
                    value={account.id}
                    disabled={isParent}
                    className={isParent ? 'font-medium text-muted-foreground' : ''}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${indent * 12}px` }}
                    >
                      <span className="font-mono text-xs text-muted-foreground w-10">
                        {account.code}
                      </span>
                      <span>{account.name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );
}
