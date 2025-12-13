import { useState } from 'react';
import { ChartOfAccountsTable } from '@/components/accounting/ChartOfAccountsTable';
import { AccountFormModal } from '@/components/accounting/AccountFormModal';
import { CategoryPresetsModal } from '@/components/accounting/CategoryPresetsModal';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import type { ChartAccount } from '@/types';

export function ChartOfAccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [parentId, setParentId] = useState<string | undefined>();

  const handleEditAccount = (account: ChartAccount) => {
    setEditingAccount(account);
    setParentId(undefined);
    setIsFormOpen(true);
  };

  const handleAddAccount = (parentId?: string) => {
    setEditingAccount(null);
    setParentId(parentId);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
    setParentId(undefined);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Chart of Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your expense and revenue categories. Click on an account code to expand or collapse sub-accounts.
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsPresetsOpen(true)}>
          <Settings2 className="h-4 w-4" />
          Presets & Import/Export
        </Button>
      </div>

      <ChartOfAccountsTable
        onEditAccount={handleEditAccount}
        onAddAccount={handleAddAccount}
      />

      <AccountFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        account={editingAccount}
        parentId={parentId}
      />

      <CategoryPresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
      />
    </div>
  );
}
