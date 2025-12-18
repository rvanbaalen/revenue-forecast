/**
 * Store Provider - Initialize Zustand stores
 *
 * This component initializes all stores by loading data from IndexedDB.
 * It shows a loading state while data is being loaded.
 */

import { useEffect, type ReactNode } from 'react';
import { initializeStores, useUIStore } from './index';
import { Loader2 } from 'lucide-react';

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const isLoading = useUIStore((state) => state.isLoading);
  const error = useUIStore((state) => state.error);

  useEffect(() => {
    initializeStores();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-destructive text-lg font-semibold">Error</div>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
