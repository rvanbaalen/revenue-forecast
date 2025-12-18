import { useState, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useApp } from '../context/AppContext';
import { parseOFXFile } from '../utils/ofx-parser';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Building2,
  CreditCard,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedOFXFile } from '../types';

interface ParsedFileWithMeta {
  file: File;
  parsed: ParsedOFXFile;
}

export function ImportPage() {
  const navigate = useNavigate();
  const { importOFXFile, activeContext } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedFiles, setParsedFiles] = useState<ParsedFileWithMeta[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    accountsCreated: number;
    transactionsImported: number;
    duplicatesSkipped: number;
  } | null>(null);

  const handleFilesSelect = useCallback(async (selectedFiles: File[]) => {
    setError(null);

    const validFiles: ParsedFileWithMeta[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      // Skip duplicates
      const existingFile = parsedFiles.find((pf) => pf.file.name === file.name);
      if (existingFile) {
        errors.push(`${file.name}: Already added`);
        continue;
      }

      try {
        const parsed = await parseOFXFile(file);
        validFiles.push({ file, parsed });
      } catch (err) {
        errors.push(
          `${file.name}: ${err instanceof Error ? err.message : 'Failed to parse'}`
        );
      }
    }

    if (validFiles.length > 0) {
      setParsedFiles((prev) => [...prev, ...validFiles]);
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }
  }, [parsedFiles]);

  const removeFile = useCallback((index: number) => {
    setParsedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.endsWith('.ofx') || f.name.endsWith('.qfx')
      );

      if (files.length === 0) {
        setError('Please drop valid OFX or QFX files');
        return;
      }

      handleFilesSelect(files);
    },
    [handleFilesSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFilesSelect(Array.from(files));
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFilesSelect]
  );

  const handleImport = async () => {
    if (parsedFiles.length === 0 || !activeContext) return;

    setIsImporting(true);
    setError(null);

    try {
      let totalAccountsCreated = 0;
      let totalTransactionsImported = 0;
      let totalDuplicatesSkipped = 0;

      for (const { parsed } of parsedFiles) {
        const result = await importOFXFile(activeContext.id, parsed);
        if (result.isNewAccount) {
          totalAccountsCreated++;
        }
        totalTransactionsImported += result.newTransactions;
        totalDuplicatesSkipped += result.duplicatesSkipped;
      }

      setImportResult({
        accountsCreated: totalAccountsCreated,
        transactionsImported: totalTransactionsImported,
        duplicatesSkipped: totalDuplicatesSkipped,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Calculate totals
  const totalTransactions = parsedFiles.reduce(
    (sum, pf) => sum + pf.parsed.transactions.length,
    0
  );

  // Success view
  if (importResult) {
    return (
      <div className="fade-in flex flex-col gap-6 max-w-2xl mx-auto">
        <div className="text-center py-8">
          <CheckCircle2 className="size-16 mx-auto variance-positive mb-4" />
          <h1 className="text-2xl font-semibold text-foreground">
            Import Complete!
          </h1>
          <p className="text-muted-foreground mt-1">
            Your transactions have been imported
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-lg text-center">
            <p className="text-3xl font-bold variance-positive">
              {importResult.accountsCreated}
            </p>
            <p className="text-sm text-muted-foreground">
              Account{importResult.accountsCreated !== 1 ? 's' : ''} Created
            </p>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg text-center">
            <p className="text-3xl font-bold variance-positive">
              {importResult.transactionsImported}
            </p>
            <p className="text-sm text-muted-foreground">
              Transaction{importResult.transactionsImported !== 1 ? 's' : ''}{' '}
              Imported
            </p>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg text-center">
            <p className="text-3xl font-bold text-muted-foreground">
              {importResult.duplicatesSkipped}
            </p>
            <p className="text-sm text-muted-foreground">Duplicates Skipped</p>
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setParsedFiles([]);
              setImportResult(null);
            }}
          >
            Import More
          </Button>
          <Button onClick={() => navigate({ to: '/transactions' })}>
            View Transactions
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Import OFX Files</h1>
        <p className="text-muted-foreground mt-1">
          Upload bank statements to import transactions
        </p>
      </div>

      {/* Context info */}
      {activeContext && (
        <div className="p-3 bg-muted rounded-lg text-center text-sm">
          Importing to context: <span className="font-medium">{activeContext.name}</span>
        </div>
      )}

      {/* File drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".ofx,.qfx"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        <FileText className="size-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-foreground font-medium mb-2">
          {parsedFiles.length > 0
            ? 'Drop more OFX files here'
            : 'Drop your OFX files here'}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse (supports multiple files)
        </p>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" />
          {parsedFiles.length > 0 ? 'Add More Files' : 'Select Files'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-5 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap">
              {error}
            </pre>
          </div>
        </div>
      )}

      {/* Uploaded files list */}
      {parsedFiles.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {parsedFiles.map((pf, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-muted rounded-lg"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  {pf.parsed.account.accountType === 'CREDITCARD' ? (
                    <CreditCard className="size-5 text-primary" />
                  ) : (
                    <Building2 className="size-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">
                    {pf.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pf.parsed.account.accountType} ****
                    {pf.parsed.account.accountId.slice(-4)} •{' '}
                    {pf.parsed.currency} • {pf.parsed.transactions.length}{' '}
                    transactions
                  </p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-destructive/10 rounded"
                >
                  <X className="size-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Building2 className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {parsedFiles.length} file{parsedFiles.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[...new Set(parsedFiles.map((pf) => pf.parsed.currency))].join(
                    ', '
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Calendar className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {totalTransactions} transactions
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          {/* Import button */}
          <div className="flex justify-center pt-4">
            <Button
              type="button"
              size="lg"
              onClick={handleImport}
              disabled={isImporting || parsedFiles.length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-5" />
                  Import {totalTransactions} Transactions
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
