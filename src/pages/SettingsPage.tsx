import { useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { db } from '@/store/db';

export function SettingsPage() {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await db.clearAllData();
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert(error instanceof Error ? error.message : 'Failed to clear data');
      setIsClearing(false);
    }
  };

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage contexts, categories, and mapping rules
        </p>
      </div>

      {/* Settings content */}
      <Outlet />

      {/* Danger Zone */}
      <div className="border border-destructive/50 rounded-lg p-6 mt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Irreversible actions that affect all your data
            </p>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="font-medium text-foreground">Clear all data</p>
                <p className="text-sm text-muted-foreground">
                  Delete all contexts, accounts, transactions, and settings
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isClearing}>
                    <Trash2 className="size-4" />
                    {isClearing ? 'Clearing...' : 'Clear Data'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your data including:
                      <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
                        <li>All contexts</li>
                        <li>All bank accounts and transactions</li>
                        <li>All subcategories and mapping rules</li>
                      </ul>
                      <p className="mt-3 font-medium">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearData}>
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
