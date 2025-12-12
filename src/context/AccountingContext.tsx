import { createContext, useContext, type ReactNode } from 'react';
import { useAccounting } from '../hooks/useAccounting';

type AccountingDataReturn = ReturnType<typeof useAccounting>;

const AccountingContext = createContext<AccountingDataReturn | null>(null);

export function AccountingProvider({ children }: { children: ReactNode }) {
  const accountingData = useAccounting();

  if (accountingData.loading) {
    return null; // Let the parent loading state handle this
  }

  return (
    <AccountingContext.Provider value={accountingData}>
      {children}
    </AccountingContext.Provider>
  );
}

export function useAccountingContext() {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccountingContext must be used within an AccountingProvider');
  }
  return context;
}
