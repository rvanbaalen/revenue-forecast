import { useState } from 'react';
import { ChartOfAccountsTable } from '@/components/accounting/ChartOfAccountsTable';
import { AccountFormModal } from '@/components/accounting/AccountFormModal';
import type { ChartAccount } from '@/types';

export function ChartOfAccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Chart of Accounts</h2>
        <p className="text-sm text-muted-foreground">
          Manage your expense and revenue categories. Click on an account code to expand or collapse sub-accounts.
        </p>
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
    </div>
  );
}
