import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
  ArrowRight,
  ArrowUpDown,
} from 'lucide-react';
import { useBank } from '@/context/BankContext';
import type { OFXImportResult } from '@/types';
import { parseOFXFile, validateOFXFile } from '@/utils/ofx-parser';
import type { ParsedOFXFile } from '@/types';

interface OFXImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportState = 'idle' | 'preview' | 'importing' | 'success' | 'error';

export function OFXImportModal({ isOpen, onClose }: OFXImportModalProps) {
  const { importOFXFile, accounts } = useBank();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<ImportState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedOFXFile | null>(null);
  const [result, setResult] = useState<OFXImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const reset = useCallback(() => {
    setState('idle');
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      const parsed = await parseOFXFile(selectedFile);
      const validation = validateOFXFile(parsed);

      if (!validation.valid) {
        setError(validation.errors.join(', '));
        setState('error');
        return;
      }

      setPreview(parsed);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setState('error');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.ofx') || droppedFile.name.endsWith('.qfx'))) {
      handleFileSelect(droppedFile);
    } else {
      setError('Please drop a valid OFX or QFX file');
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setState('importing');
    setError(null);

    try {
      const importResult = await importOFXFile(file);
      setResult(importResult);
      setState(importResult.success ? 'success' : 'error');

      if (!importResult.success && importResult.errors.length > 0) {
        setError(importResult.errors.join(', '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setState('error');
    }
  }, [file, importOFXFile]);

  // Check if account already exists
  const existingAccount = preview?.account.accountId
    ? accounts.find(a => a.accountId.endsWith(preview.account.accountId.slice(-4)))
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Upload className="h-5 w-5" />
            Import Bank Statement
          </DialogTitle>
          <DialogDescription>
            Upload an OFX or QFX file exported from your bank to import transactions.
          </DialogDescription>
        </DialogHeader>

        {/* Idle state - file drop zone */}
        {state === 'idle' && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.qfx"
              onChange={handleInputChange}
              className="hidden"
            />
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium mb-2">
              Drop your OFX file here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Select File
            </Button>
          </div>
        )}

        {/* Preview state */}
        {state === 'preview' && preview && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file?.size ?? 0 / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <Separator />

            {/* Account info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Account</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {preview.account.accountType} ****{preview.account.accountId.slice(-4)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Currency: {preview.currency}
                  </p>
                </div>
                {existingAccount ? (
                  <Badge variant="secondary">
                    Existing Account
                  </Badge>
                ) : (
                  <Badge className="bg-primary text-primary-foreground">
                    New Account
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Transaction summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Transactions</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-card border border-border rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {preview.transactions.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="p-3 bg-card border border-border rounded-lg">
                  <p className="text-2xl font-bold variance-positive">
                    {preview.transactions.filter(t => t.amount > 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Credits</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Date range */}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date Range:</span>
              <span className="font-mono text-foreground">{preview.dateRange.start}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-foreground">{preview.dateRange.end}</span>
            </div>

            {/* Balance if available */}
            {preview.balance && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Ending Balance:</span>
                <span className="font-mono text-foreground font-medium">
                  {preview.currency} {preview.balance.amount.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Importing state */}
        {state === 'importing' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-foreground font-medium">Importing transactions...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        )}

        {/* Success state */}
        {state === 'success' && result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto variance-positive mb-4" />
              <p className="text-lg font-medium text-foreground">Import Successful!</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{result.newTransactions}</p>
                <p className="text-sm text-muted-foreground">New Transactions</p>
              </div>
              <div className="p-3 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-muted-foreground">{result.duplicatesSkipped}</p>
                <p className="text-sm text-muted-foreground">Duplicates Skipped</p>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Imported to account:</p>
              <p className="font-medium text-foreground">{result.accountName}</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">Import Failed</p>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive text-left">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {state === 'idle' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {state === 'preview' && (
            <>
              <Button variant="outline" onClick={reset}>
                Choose Different File
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import {preview?.transactions.length} Transactions
              </Button>
            </>
          )}

          {state === 'importing' && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </Button>
          )}

          {(state === 'success' || state === 'error') && (
            <>
              {state === 'error' && (
                <Button variant="outline" onClick={reset}>
                  Try Again
                </Button>
              )}
              <Button onClick={handleClose}>
                {state === 'success' ? 'Done' : 'Close'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
