import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRevenue } from '@/context/RevenueContext';
import {
  Download,
  Upload,
  Check,
  AlertCircle,
  FileJson,
  Database,
  Calendar,
  HardDrive,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  config: 'Settings',
  sources: 'Revenue Sources',
  salaries: 'Salaries',
  salaryTaxes: 'Salary Taxes',
  bankAccounts: 'Bank Accounts',
  bankTransactions: 'Bank Transactions',
  mappingRules: 'Mapping Rules',
  chartAccounts: 'Chart of Accounts',
  journalEntries: 'Journal Entries',
};

export function BackupRestoreModal({ isOpen, onClose }: BackupRestoreModalProps) {
  const { exportData, validateBackup, importData, config } = useRevenue();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    version?: string;
    exportedAt?: string;
    error?: string;
    recordCounts?: Record<string, number>;
  } | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setResult({ success: true, message: 'Backup created successfully!' });
    } catch (error) {
      setResult({ success: false, message: `Backup failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      const validation = validateBackup(data);
      setValidationResult(validation);

      if (validation.valid) {
        setPendingImportData(data);
        setConfirmDialogOpen(true);
      } else {
        setResult({ success: false, message: validation.error || 'Invalid backup file' });
      }
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingImportData) return;

    setIsLoading(true);
    setConfirmDialogOpen(false);

    try {
      await importData(pendingImportData, true);
      setResult({ success: true, message: 'Data restored successfully! The page will reload.' });
      // Reload after a short delay to show success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setResult({ success: false, message: `Restore failed: ${error}` });
    } finally {
      setIsLoading(false);
      setPendingImportData(null);
      setValidationResult(null);
    }
  };

  const handleCancelRestore = () => {
    setPendingImportData(null);
    setValidationResult(null);
    setConfirmDialogOpen(false);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Unknown';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Backup & Restore</DialogTitle>
            <DialogDescription>
              Create a backup of all your data or restore from a previous backup.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="backup" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="backup">Backup</TabsTrigger>
              <TabsTrigger value="restore">Restore</TabsTrigger>
            </TabsList>

            <TabsContent value="backup" className="mt-4 flex flex-col gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <HardDrive className="size-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Create Backup</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Download a complete backup of all your data including revenue sources,
                      salaries, bank accounts, transactions, and accounting data.
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-4" />
                        <span>Year: {config.year}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileJson className="size-4" />
                        <span>JSON format</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleBackup}
                      disabled={isLoading}
                      className="mt-4"
                    >
                      <Download className="size-4" />
                      {isLoading ? 'Creating Backup...' : 'Download Backup'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="restore" className="mt-4 flex flex-col gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <Database className="size-5 text-warning" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Restore from Backup</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Restore your data from a previously created backup file.
                      This will replace all existing data.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={handleRestoreClick}
                      variant="outline"
                      disabled={isLoading}
                      className="mt-4"
                    >
                      <Upload className="size-4" />
                      {isLoading ? 'Restoring...' : 'Select Backup File'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-4 text-warning mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-warning">
                    Restoring from a backup will permanently replace all your current data.
                    Make sure to create a backup first if you want to keep your current data.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {result && (
            <>
              <Separator />
              <div
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  result.success
                    ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                    : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                }`}
              >
                {result.success ? (
                  <Check className="size-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-sm">{result.message}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from Backup?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3">
                <p>This will replace all your existing data with the backup contents.</p>

                {validationResult && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FileJson className="size-4" />
                      <span className="font-medium">Backup Details</span>
                    </div>
                    <div className="flex flex-col gap-1 text-muted-foreground">
                      <div>Version: {validationResult.version}</div>
                      {validationResult.exportedAt && (
                        <div>Created: {formatDate(validationResult.exportedAt)}</div>
                      )}
                    </div>
                    {validationResult.recordCounts && (
                      <>
                        <Separator className="my-2" />
                        <div className="font-medium mb-1">Data to restore:</div>
                        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                          {Object.entries(validationResult.recordCounts).map(([key, count]) => (
                            <div key={key}>
                              {DATA_TYPE_LABELS[key] || key}: {count}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <p className="text-destructive font-medium">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRestore}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore}>
              Yes, Restore Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
