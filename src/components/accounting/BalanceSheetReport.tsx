import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Wallet, CreditCard, Scale } from 'lucide-react';
import { useAccountingContext } from '@/context/AccountingContext';
import { formatCurrency } from '@/utils/format';

export function BalanceSheetReport() {
  const { getBalanceSheet, getAccountById } = useAccountingContext();

  const balanceSheet = useMemo(() => {
    return getBalanceSheet();
  }, [getBalanceSheet]);

  // Group assets by category
  const assetsByCategory = useMemo(() => {
    const categories = new Map<string, { name: string; accounts: { name: string; balance: number }[] }>();

    balanceSheet.assetsByAccount.forEach((balance, accountId) => {
      if (balance === 0) return;

      const account = getAccountById(accountId);
      if (!account) return;

      const parent = account.parentId ? getAccountById(account.parentId) : null;
      const categoryId = parent?.id || accountId;
      const categoryName = parent?.name || account.name;

      if (!categories.has(categoryId)) {
        categories.set(categoryId, { name: categoryName, accounts: [] });
      }

      categories.get(categoryId)!.accounts.push({
        name: account.name,
        balance,
      });
    });

    return Array.from(categories.values());
  }, [balanceSheet.assetsByAccount, getAccountById]);

  // Group liabilities by category
  const liabilitiesByCategory = useMemo(() => {
    const categories = new Map<string, { name: string; accounts: { name: string; balance: number }[] }>();

    balanceSheet.liabilitiesByAccount.forEach((balance, accountId) => {
      if (balance === 0) return;

      const account = getAccountById(accountId);
      if (!account) return;

      const parent = account.parentId ? getAccountById(account.parentId) : null;
      const categoryId = parent?.id || accountId;
      const categoryName = parent?.name || account.name;

      if (!categories.has(categoryId)) {
        categories.set(categoryId, { name: categoryName, accounts: [] });
      }

      categories.get(categoryId)!.accounts.push({
        name: account.name,
        balance,
      });
    });

    return Array.from(categories.values());
  }, [balanceSheet.liabilitiesByAccount, getAccountById]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(balanceSheet.assets, false)}
                </p>
              </div>
              <div className="p-3 bg-info-muted rounded-full">
                <Wallet className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Liabilities</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(balanceSheet.liabilities, false)}
                </p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-full">
                <CreditCard className="h-5 w-5 variance-negative" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          balanceSheet.equity >= 0 ? "border-success/50" : "border-destructive/50"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Worth (Equity)</p>
                <p className={cn(
                  "text-2xl font-bold",
                  balanceSheet.equity >= 0 ? "variance-positive" : "variance-negative"
                )}>
                  {formatCurrency(balanceSheet.equity, false)}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                balanceSheet.equity >= 0 ? "bg-success-muted" : "bg-destructive/10"
              )}>
                <Scale className={cn(
                  "h-5 w-5",
                  balanceSheet.equity >= 0 ? "variance-positive" : "variance-negative"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Balance Sheet */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Balance Sheet — As of {new Date().toLocaleDateString()}
          </h3>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {/* Assets Section */}
            <tr className="bg-info-muted font-medium">
              <td className="px-4 py-3 text-foreground" colSpan={2}>
                ASSETS
              </td>
            </tr>
            {assetsByCategory.length > 0 ? (
              assetsByCategory.map((category, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="px-4 py-2" colSpan={2}>
                    <div className="font-medium text-foreground pl-4">{category.name}</div>
                    {category.accounts.map((account, accountIdx) => (
                      <div key={accountIdx} className="flex justify-between py-1 pl-8 text-muted-foreground">
                        <span>{account.name}</span>
                        <span className="font-mono text-foreground">
                          {formatCurrency(account.balance, false)}
                        </span>
                      </div>
                    ))}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-border">
                <td className="px-4 py-2 pl-8 text-muted-foreground italic" colSpan={2}>
                  No assets recorded
                </td>
              </tr>
            )}
            <tr className="border-t border-border bg-info-muted font-medium">
              <td className="px-4 py-2 text-foreground">Total Assets</td>
              <td className="px-4 py-2 text-right font-mono text-foreground">
                {formatCurrency(balanceSheet.assets, false)}
              </td>
            </tr>

            {/* Liabilities Section */}
            <tr className="bg-destructive/10 font-medium border-t-2 border-border">
              <td className="px-4 py-3 text-foreground" colSpan={2}>
                LIABILITIES
              </td>
            </tr>
            {liabilitiesByCategory.length > 0 ? (
              liabilitiesByCategory.map((category, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="px-4 py-2" colSpan={2}>
                    <div className="font-medium text-foreground pl-4">{category.name}</div>
                    {category.accounts.map((account, accountIdx) => (
                      <div key={accountIdx} className="flex justify-between py-1 pl-8 text-muted-foreground">
                        <span>{account.name}</span>
                        <span className="font-mono text-foreground">
                          {formatCurrency(account.balance, false)}
                        </span>
                      </div>
                    ))}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-border">
                <td className="px-4 py-2 pl-8 text-muted-foreground italic" colSpan={2}>
                  No liabilities recorded
                </td>
              </tr>
            )}
            <tr className="border-t border-border bg-destructive/10 font-medium">
              <td className="px-4 py-2 text-foreground">Total Liabilities</td>
              <td className="px-4 py-2 text-right font-mono text-foreground">
                {formatCurrency(balanceSheet.liabilities, false)}
              </td>
            </tr>

            {/* Equity */}
            <tr className={cn(
              "border-t-2 border-border font-bold",
              balanceSheet.equity >= 0
                ? "bg-success-muted"
                : "bg-destructive/10"
            )}>
              <td className="px-4 py-3 text-foreground text-lg">NET WORTH (EQUITY)</td>
              <td className={cn(
                "px-4 py-3 text-right font-mono text-lg",
                balanceSheet.equity >= 0 ? "variance-positive" : "variance-negative"
              )}>
                {formatCurrency(balanceSheet.equity, false)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Accounting equation */}
      <div className="text-center text-sm text-muted-foreground">
        <span className="font-mono">
          Assets ({formatCurrency(balanceSheet.assets, false)}) −
          Liabilities ({formatCurrency(balanceSheet.liabilities, false)}) =
          Equity ({formatCurrency(balanceSheet.equity, false)})
        </span>
      </div>
    </div>
  );
}
