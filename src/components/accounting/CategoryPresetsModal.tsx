import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { useAccountingContext } from '@/context/AccountingContext';
import { Download, Upload, FolderOpen, Server, ShoppingCart, Palette, Briefcase, User, Check, AlertCircle } from 'lucide-react';
import type { CategoryPreset } from '@/data/categoryPresets';

interface CategoryPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  saas: <Server className="h-5 w-5" />,
  ecommerce: <ShoppingCart className="h-5 w-5" />,
  agency: <Palette className="h-5 w-5" />,
  consulting: <Briefcase className="h-5 w-5" />,
  freelancer: <User className="h-5 w-5" />,
};

export function CategoryPresetsModal({ isOpen, onClose }: CategoryPresetsModalProps) {
  const { exportCategories, importCategories, applyPreset, getAvailablePresets, chartAccounts } = useAccountingContext();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'preset' | 'import'; data?: string } | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = getAvailablePresets();

  const handleExport = async () => {
    try {
      const data = await exportCategories();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `categories-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportResult({ success: true, message: 'Categories exported successfully!' });
    } catch (error) {
      setImportResult({ success: false, message: `Export failed: ${error}` });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      setPendingAction({ type: 'import', data });
      setConfirmDialogOpen(true);
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
  };

  const handleApplyPreset = () => {
    if (!selectedPreset) return;
    setPendingAction({ type: 'preset', data: selectedPreset });
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsLoading(true);
    setConfirmDialogOpen(false);

    try {
      if (pendingAction.type === 'preset' && pendingAction.data) {
        await applyPreset(pendingAction.data);
        const preset = presets.find(p => p.id === pendingAction.data);
        setImportResult({ success: true, message: `Applied "${preset?.name}" preset successfully!` });
      } else if (pendingAction.type === 'import' && pendingAction.data) {
        const result = await importCategories(pendingAction.data);
        if (result.errors.length > 0) {
          setImportResult({
            success: result.imported > 0,
            message: `Imported ${result.imported} categories. ${result.errors.length} errors: ${result.errors.join(', ')}`,
          });
        } else {
          setImportResult({ success: true, message: `Imported ${result.imported} categories successfully!` });
        }
      }
    } catch (error) {
      setImportResult({ success: false, message: `Operation failed: ${error}` });
    } finally {
      setIsLoading(false);
      setPendingAction(null);
    }
  };

  const countAccountsByType = (accounts: CategoryPreset['accounts']) => {
    const revenue = accounts.filter(a => a.type === 'REVENUE').length;
    const expense = accounts.filter(a => a.type === 'EXPENSE').length;
    return { revenue, expense };
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Category Presets & Import/Export</DialogTitle>
            <DialogDescription>
              Choose a preset for your business type, or import/export custom category configurations.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="presets" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="presets">Business Presets</TabsTrigger>
              <TabsTrigger value="import-export">Import / Export</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a preset that matches your business type. This will replace all existing categories.
              </p>

              <div className="space-y-3">
                {presets.map((preset) => {
                  const counts = countAccountsByType(preset.accounts);
                  const isSelected = selectedPreset === preset.id;

                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                          {PRESET_ICONS[preset.id] || <FolderOpen className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{preset.name}</span>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {counts.revenue} revenue categories
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {counts.expense} expense categories
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={handleApplyPreset}
                  disabled={!selectedPreset || isLoading}
                >
                  {isLoading ? 'Applying...' : 'Apply Selected Preset'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import-export" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Download className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium">Export Categories</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download your current {chartAccounts.length} categories as a JSON file.
                        Share with team members or use as a backup.
                      </p>
                      <Button onClick={handleExport} variant="outline" className="mt-3">
                        <Download className="h-4 w-4 mr-2" />
                        Export to JSON
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Upload className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium">Import Categories</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Import categories from a JSON file. This will replace all existing categories.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button onClick={handleImportClick} variant="outline" className="mt-3">
                        <Upload className="h-4 w-4 mr-2" />
                        Import from JSON
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {importResult && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg ${
                    importResult.success ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                  }`}
                >
                  {importResult.success ? (
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span className="text-sm">{importResult.message}</span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace All Categories?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will replace all your existing categories ({chartAccounts.length} categories).
              Any custom categories you've created will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              Yes, Replace Categories
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
