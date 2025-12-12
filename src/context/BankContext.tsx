import { createContext, useContext, type ReactNode } from 'react';
import { useBankData } from '../hooks/useBankData';

type BankDataReturn = ReturnType<typeof useBankData>;

const BankContext = createContext<BankDataReturn | null>(null);

export function BankProvider({ children }: { children: ReactNode }) {
  const bankData = useBankData();

  if (bankData.loading) {
    return null; // Let the parent loading state handle this
  }

  return (
    <BankContext.Provider value={bankData}>
      {children}
    </BankContext.Provider>
  );
}

export function useBank() {
  const context = useContext(BankContext);
  if (!context) {
    throw new Error('useBank must be used within a BankProvider');
  }
  return context;
}
