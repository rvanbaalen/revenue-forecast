import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Plus, ArrowUp } from 'lucide-react';
import { useBank } from '@/context/BankContext';
import { BankAccountCard } from '@/components/BankAccountCard';

export function BankAccountsPage() {
  const { accounts } = useBank();
  const navigate = useNavigate();

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Bank Accounts
          </h3>
          <p className="text-muted-foreground mb-4">
            Import an OFX file from your bank to get started.
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <ArrowUp className="h-4 w-4" />
            Use the "Import OFX" button above
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map(account => (
        <BankAccountCard
          key={account.id}
          account={account}
          onSelect={() => {
            navigate({
              to: '/bank/transactions',
              search: { account: account.id.toString() },
            });
          }}
        />
      ))}
      <Card className="border-dashed hover:border-primary transition-colors h-full flex items-center justify-center min-h-[180px]">
        <CardContent className="py-6 text-center">
          <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Use "Import OFX" to add accounts
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
