import { createContext, useContext, type ReactNode } from 'react';
import { useRevenueData } from '../hooks/useRevenueData';

type RevenueDataReturn = ReturnType<typeof useRevenueData>;

const RevenueContext = createContext<RevenueDataReturn | null>(null);

export function RevenueProvider({ children }: { children: ReactNode }) {
  const revenueData = useRevenueData();

  if (revenueData.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <RevenueContext.Provider value={revenueData}>
      {children}
    </RevenueContext.Provider>
  );
}

export function useRevenue() {
  const context = useContext(RevenueContext);
  if (!context) {
    throw new Error('useRevenue must be used within a RevenueProvider');
  }
  return context;
}
