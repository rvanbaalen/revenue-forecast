import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  ClipboardList,
  Building2,
  Calendar,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useBank } from '@/context/BankContext';
import { useAccountingContext } from '@/context/AccountingContext';
import { parseOFXFile, validateOFXFile, hashAccountId, maskAccountId, extractMonthYear } from '@/utils/ofx-parser';
import {
  type WizardStep,
  type SuggestedCategory,
  type TransactionMapping,
  type SuggestedRevenueSource,
  type CategoryChange,
  type BusinessType,
  type MappingRuleInput,
  BUSINESS_TYPES,
  generateUnifiedAnalysisPrompt,
  parseUnifiedAnalysisResponse,
  applyMappingRules,
  analyzeTransactionPatterns,
  categoriesToChartAccounts,
  findMatchingChartAccount,
} from '@/utils/ofx-wizard';
import type { ParsedOFXFile, TransactionCategory, TransactionFlowType } from '@/types';
import { db } from '@/store/db';

// Step configuration - simplified to 3 steps
const STEPS: { id: WizardStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'analyze', label: 'AI Analysis', icon: Sparkles },
  { id: 'review', label: 'Import', icon: ClipboardList },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OFXWizardPage() {
  const navigate = useNavigate();
  useBank();
  const {
    chartAccounts,
    addChartAccount,
    addJournalEntry,
    createChartAccountForBankAccount,
    getChartAccountForBankAccount,
  } = useAccountingContext();

  // File state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedOFXFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Upload step - business type
  const [businessType, setBusinessType] = useState<BusinessType | undefined>(undefined);

  // Analysis step - unified prompt/response
  const [analysisPrompt, setAnalysisPrompt] = useState<string>('');
  const [analysisJson, setAnalysisJson] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Live preview state (editable before applying)
  const [previewCategories, setPreviewCategories] = useState<SuggestedCategory[]>([]);
  const [previewCategoryChanges, setPreviewCategoryChanges] = useState<CategoryChange[]>([]);
  const [previewRevenueSources, setPreviewRevenueSources] = useState<SuggestedRevenueSource[]>([]);
  const [previewRules, setPreviewRules] = useState<MappingRuleInput[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Final applied state
  const [suggestedCategories, setSuggestedCategories] = useState<SuggestedCategory[]>([]);
  const [categoryChanges, setCategoryChanges] = useState<CategoryChange[]>([]);
  const [suggestedRevenueSources, setSuggestedRevenueSources] = useState<SuggestedRevenueSource[]>([]);
  const [mappingRules, setMappingRules] = useState<MappingRuleInput[]>([]);
  const [transactionMappings, setTransactionMappings] = useState<TransactionMapping[]>([]);
  const [ruleStats, setRuleStats] = useState<{ pattern: string; matchCount: number }[]>([]);
  const [matchStats, setMatchStats] = useState<{ matched: number; unmatched: number }>({ matched: 0, unmatched: 0 });

  // Import progress
  const [importProgress, setImportProgress] = useState<{
    categoriesCreated: number;
    categoriesModified: number;
    revenueSourcesCreated: number;
    transactionsImported: number;
    journalEntriesCreated: number;
    rulesCreated: number;
  } | null>(null);

  // ============================================
  // Live JSON Parsing
  // ============================================

  useEffect(() => {
    if (!analysisJson.trim()) {
      setPreviewCategories([]);
      setPreviewCategoryChanges([]);
      setPreviewRevenueSources([]);
      setPreviewRules([]);
      setPreviewError(null);
      setPreviewWarnings([]);
      return;
    }

    const result = parseUnifiedAnalysisResponse(analysisJson);

    if (!result.success) {
      setPreviewError(result.error || 'Failed to parse');
      setPreviewCategories([]);
      setPreviewCategoryChanges([]);
      setPreviewRevenueSources([]);
      setPreviewRules([]);
      setPreviewWarnings([]);
      return;
    }

    setPreviewError(null);
    setPreviewWarnings(result.warnings);
    setPreviewCategories(result.categories);
    setPreviewCategoryChanges(result.categoryChanges);
    setPreviewRevenueSources(result.revenueSources);
    setPreviewRules(result.rules);
  }, [analysisJson]);

  // ============================================
  // Step Navigation
  // ============================================

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'upload':
        return parsedData !== null;
      case 'analyze':
        return mappingRules.length > 0 && transactionMappings.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, parsedData, mappingRules, transactionMappings]);

  const goNext = useCallback(() => {
    if (!canGoNext()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex].id;
      setCurrentStep(nextStep);

      // Generate unified prompt when entering analyze step
      if (nextStep === 'analyze' && parsedData) {
        const existingCategories = chartAccounts
          .filter(a => (a.type === 'REVENUE' || a.type === 'EXPENSE') && a.isActive)
          .map(a => ({
            code: a.code,
            name: a.name,
            type: a.type as 'REVENUE' | 'EXPENSE',
            description: a.description,
          }));
        const prompt = generateUnifiedAnalysisPrompt(parsedData.transactions, businessType, existingCategories);
        setAnalysisPrompt(prompt);
      }
    }
  }, [canGoNext, currentStepIndex, parsedData, chartAccounts, businessType]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  // ============================================
  // Step 1: File Upload
  // ============================================

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      const parsed = await parseOFXFile(selectedFile);
      const validation = validateOFXFile(parsed);

      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      setParsedData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
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

  // ============================================
  // Step 2: Analysis Handling
  // ============================================

  const handleCopyPrompt = useCallback(async () => {
    await navigator.clipboard.writeText(analysisPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [analysisPrompt]);

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const removeCategory = useCallback((index: number) => {
    setPreviewCategories(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeCategoryChange = useCallback((index: number) => {
    setPreviewCategoryChanges(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeRevenueSource = useCallback((index: number) => {
    setPreviewRevenueSources(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeRule = useCallback((index: number) => {
    setPreviewRules(prev => prev.filter((_, i) => i !== index));
  }, []);

  const applyAnalysis = useCallback(() => {
    if (!parsedData || previewRules.length === 0) return;

    // Commit preview to final state
    setSuggestedCategories(previewCategories);
    setCategoryChanges(previewCategoryChanges);
    setSuggestedRevenueSources(previewRevenueSources);
    setMappingRules(previewRules);

    // Apply rules to transactions
    const applied = applyMappingRules(parsedData.transactions, previewRules);
    setTransactionMappings(applied.mappings);
    setRuleStats(applied.ruleStats);
    setMatchStats({ matched: applied.matchedCount, unmatched: applied.unmatchedCount });

    setError(null);
  }, [parsedData, previewCategories, previewCategoryChanges, previewRevenueSources, previewRules]);

  // ============================================
  // Step 3: Import
  // ============================================

  const handleImport = useCallback(async () => {
    if (!parsedData) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 0. Apply category changes (rename, merge, update_description)
      let categoriesModified = 0;

      for (const change of categoryChanges) {
        const existingAccount = chartAccounts.find(
          a => a.name.toLowerCase() === change.from_name.toLowerCase() &&
               (a.type === 'REVENUE' || a.type === 'EXPENSE')
        );

        if (!existingAccount) continue;

        if (change.action === 'rename' || change.action === 'update_description') {
          await db.updateChartAccount({
            ...existingAccount,
            name: change.to_name || existingAccount.name,
            code: change.to_code || existingAccount.code,
            description: change.to_description ?? existingAccount.description,
            updatedAt: new Date().toISOString(),
          });
          categoriesModified++;
        } else if (change.action === 'merge' && change.merge_from) {
          for (const sourceName of change.merge_from) {
            const sourceAccount = chartAccounts.find(
              a => a.name.toLowerCase() === sourceName.toLowerCase() &&
                   (a.type === 'REVENUE' || a.type === 'EXPENSE')
            );

            if (sourceAccount && sourceAccount.id !== existingAccount.id) {
              await db.updateTransactionsCategory(sourceAccount.id, existingAccount.id);
              await db.updateJournalEntriesAccount(sourceAccount.id, existingAccount.id);
              await db.updateMappingRulesCategory(sourceAccount.id, existingAccount.id);
              await db.updateChartAccount({
                ...sourceAccount,
                isActive: false,
                updatedAt: new Date().toISOString(),
              });
              categoriesModified++;
            }
          }

          if (change.to_name !== existingAccount.name || change.to_description) {
            await db.updateChartAccount({
              ...existingAccount,
              name: change.to_name,
              description: change.to_description ?? existingAccount.description,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // 1. Create new categories
      // Fetch fresh chart accounts from DB to ensure we have all codes
      const freshChartAccounts = await db.getChartAccounts();
      const newCategories = categoriesToChartAccounts(suggestedCategories, freshChartAccounts);
      let categoriesCreated = 0;

      for (const category of newCategories) {
        try {
          await addChartAccount(category);
          categoriesCreated++;
        } catch (err) {
          // If code conflict, skip this category (already exists with different name)
          console.warn(`Failed to create category ${category.name}:`, err);
        }
      }

      const updatedChartAccounts = await db.getChartAccounts();

      // 2. Create revenue sources
      const existingSources = await db.getSources();
      const existingSourceNames = new Set(existingSources.map(s => s.name.toLowerCase()));
      const revenueSourceNameToId = new Map<string, number>();
      let revenueSourcesCreated = 0;

      for (const source of existingSources) {
        revenueSourceNameToId.set(source.name.toLowerCase(), source.id);
      }

      for (const source of suggestedRevenueSources) {
        if (!existingSourceNames.has(source.name.toLowerCase())) {
          const id = await db.addSource({
            name: source.name,
            type: source.type,
            currency: parsedData.currency,
            isRecurring: false,
            recurringAmount: 0,
            expected: {},
            actual: {},
          });
          revenueSourceNameToId.set(source.name.toLowerCase(), id);
          revenueSourcesCreated++;
        }
      }

      // 3. Create or find bank account
      const accountHash = hashAccountId(parsedData.account.accountId);
      let bankAccount = await db.getBankAccountByHash(accountHash);

      if (!bankAccount) {
        const accountId = await db.addBankAccount({
          name: `${parsedData.account.accountType} ${maskAccountId(parsedData.account.accountId)}`,
          bankId: parsedData.account.bankId,
          accountId: maskAccountId(parsedData.account.accountId),
          accountIdHash: accountHash,
          accountType: parsedData.account.accountType,
          currency: parsedData.currency,
          createdAt: new Date().toISOString(),
        });
        bankAccount = {
          id: accountId,
          name: `${parsedData.account.accountType} ${maskAccountId(parsedData.account.accountId)}`,
          bankId: parsedData.account.bankId,
          accountId: maskAccountId(parsedData.account.accountId),
          accountIdHash: accountHash,
          accountType: parsedData.account.accountType,
          currency: parsedData.currency,
          createdAt: new Date().toISOString(),
        };
      }

      // 4. Create chart account for bank account
      let bankChartAccount = getChartAccountForBankAccount(bankAccount.id);
      if (!bankChartAccount) {
        bankChartAccount = await createChartAccountForBankAccount(bankAccount);
      }

      // 5. Import transactions
      const mappingByFitId = new Map(transactionMappings.map(m => [m.fitId, m]));
      const importBatchId = `wizard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const importedAt = new Date().toISOString();
      const isCreditCard = bankAccount.accountType === 'CREDITCARD' || bankAccount.accountType === 'CREDITLINE';

      const transactionsToAdd: Parameters<typeof db.addBankTransactions>[0] = [];

      for (const tx of parsedData.transactions) {
        const exists = await db.checkTransactionExists(bankAccount.id, tx.fitId);
        if (exists) continue;

        const mapping = mappingByFitId.get(tx.fitId);
        const { month, year } = extractMonthYear(tx.datePosted);

        let flowType: TransactionFlowType;
        if (isCreditCard) {
          flowType = tx.amount > 0 ? 'charge' : 'payment';
        } else {
          flowType = tx.amount >= 0 ? 'credit' : 'debit';
        }

        let category: TransactionCategory = tx.amount >= 0 ? 'revenue' : 'expense';
        let chartAccountId: string | undefined;
        let isIgnored = false;
        let revenueSourceId: number | undefined;

        if (mapping) {
          if (mapping.categoryType === 'TRANSFER') {
            category = 'transfer';
          } else if (mapping.categoryType === 'IGNORE') {
            category = 'ignore';
            isIgnored = true;
          } else {
            category = mapping.categoryType.toLowerCase() as TransactionCategory;
            const matchedAccount = findMatchingChartAccount(mapping, updatedChartAccounts);
            if (matchedAccount) {
              chartAccountId = matchedAccount.id;
            }
            if (mapping.categoryType === 'REVENUE' && mapping.revenueSource) {
              revenueSourceId = revenueSourceNameToId.get(mapping.revenueSource.toLowerCase());
            }
          }
        }

        transactionsToAdd.push({
          accountId: bankAccount.id,
          fitId: tx.fitId,
          type: tx.type,
          flowType,
          amount: tx.amount,
          datePosted: tx.datePosted,
          name: tx.name,
          memo: tx.memo,
          checkNum: tx.checkNum,
          refNum: tx.refNum,
          month,
          year,
          category,
          chartAccountId,
          revenueSourceId,
          isIgnored,
          isReconciled: true,
          importedAt,
          importBatchId,
        });
      }

      // Bulk insert and create journal entries
      let transactionsImported = 0;
      let journalEntriesCreated = 0;

      if (transactionsToAdd.length > 0) {
        const ids = await db.addBankTransactions(transactionsToAdd);
        transactionsImported = ids.length;

        for (let i = 0; i < transactionsToAdd.length; i++) {
          const tx = transactionsToAdd[i];
          const txId = ids[i];

          if (!tx.chartAccountId || tx.category === 'transfer' || tx.category === 'ignore') {
            continue;
          }

          const amount = Math.abs(tx.amount);
          const isCredit = tx.amount > 0;
          const lines: { accountId: string; amount: number; type: 'DEBIT' | 'CREDIT' }[] = [];

          if (isCreditCard) {
            if (isCredit) {
              lines.push({ accountId: tx.chartAccountId, amount, type: 'DEBIT' });
              lines.push({ accountId: bankChartAccount.id, amount, type: 'CREDIT' });
            } else {
              lines.push({ accountId: bankChartAccount.id, amount, type: 'DEBIT' });
              lines.push({ accountId: tx.chartAccountId, amount, type: 'CREDIT' });
            }
          } else {
            if (isCredit) {
              lines.push({ accountId: bankChartAccount.id, amount, type: 'DEBIT' });
              lines.push({ accountId: tx.chartAccountId, amount, type: 'CREDIT' });
            } else {
              lines.push({ accountId: tx.chartAccountId, amount, type: 'DEBIT' });
              lines.push({ accountId: bankChartAccount.id, amount, type: 'CREDIT' });
            }
          }

          try {
            await addJournalEntry({
              date: tx.datePosted.split('T')[0],
              description: tx.name,
              lines,
              bankTransactionId: txId,
              isReconciled: true,
            });
            journalEntriesCreated++;
          } catch (err) {
            console.error('Failed to create journal entry:', err);
          }
        }
      }

      // 6. Save mapping rules
      let rulesCreated = 0;
      const existingRules = await db.getMappingRules();
      const existingPatterns = new Set(existingRules.map(r => r.pattern.toLowerCase()));

      for (let i = 0; i < mappingRules.length; i++) {
        const rule = mappingRules[i];
        if (existingPatterns.has(rule.pattern.toLowerCase())) continue;
        if (rule.categoryType === 'TRANSFER' || rule.categoryType === 'IGNORE') continue;

        const matchedAccount = updatedChartAccounts.find(
          a => a.name.toLowerCase() === rule.categoryName.toLowerCase() && a.isActive
        );
        if (!matchedAccount) continue;

        let revenueSourceId: number | undefined;
        if (rule.categoryType === 'REVENUE' && rule.revenueSource) {
          revenueSourceId = revenueSourceNameToId.get(rule.revenueSource.toLowerCase());
        }

        await db.addMappingRule({
          pattern: rule.pattern,
          matchField: rule.matchField,
          matchType: rule.matchType,
          category: rule.categoryType.toLowerCase() as TransactionCategory,
          chartAccountId: matchedAccount.id,
          revenueSourceId,
          isActive: true,
          priority: 100 - i,
          createdAt: new Date().toISOString(),
        });
        rulesCreated++;
      }

      setImportProgress({
        categoriesCreated,
        categoriesModified,
        revenueSourcesCreated,
        transactionsImported,
        journalEntriesCreated,
        rulesCreated,
      });

      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  }, [parsedData, suggestedCategories, categoryChanges, suggestedRevenueSources, transactionMappings, mappingRules, chartAccounts, addChartAccount, addJournalEntry, createChartAccountForBankAccount, getChartAccountForBankAccount]);

  // ============================================
  // Render
  // ============================================

  const renderUploadStep = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Upload Your Bank Statement</h2>
        <p className="text-muted-foreground mt-1">
          Upload an OFX file and optionally select your business type
        </p>
      </div>

      {/* File drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
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
        <FileText className="size-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-foreground font-medium mb-2">Drop your OFX file here</p>
        <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
        <Button onClick={() => fileInputRef.current?.click()}>Select File</Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {parsedData && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileText className="size-6 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">{file?.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file?.size ?? 0)}</p>
            </div>
            <CheckCircle2 className="size-5 variance-positive" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Building2 className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{parsedData.account.accountType}</p>
                <p className="text-xs text-muted-foreground">****{parsedData.account.accountId.slice(-4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Calendar className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{parsedData.transactions.length} transactions</p>
                <p className="text-xs text-muted-foreground">{parsedData.dateRange.start} - {parsedData.dateRange.end}</p>
              </div>
            </div>
          </div>

          {/* Transaction summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
            {(() => {
              const patterns = analyzeTransactionPatterns(parsedData.transactions);
              const formatAmount = (amount: number) => amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              return (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Income:</span>{' '}
                    <span className="variance-positive font-medium">{patterns.creditCount} ({parsedData.currency} {formatAmount(patterns.totalCredits)})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expenses:</span>{' '}
                    <span className="variance-negative font-medium">{patterns.debitCount} ({parsedData.currency} {formatAmount(patterns.totalDebits)})</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Business type selector */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Business Type <span className="text-muted-foreground font-normal">(optional, helps AI)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setBusinessType(businessType === type.id ? undefined : type.id)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-colors",
                    businessType === type.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAnalyzeStep = () => {
    const hasPreviewData = previewRules.length > 0;
    const isApplied = mappingRules.length > 0;

    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">AI Analysis</h2>
          <p className="text-muted-foreground mt-1">
            Copy the prompt, paste into any AI, then review and apply
          </p>
        </div>

        {/* Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">1. Copy instructions for AI</label>
            <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="bg-muted rounded-lg p-3 max-h-24 overflow-y-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{analysisPrompt.slice(0, 300)}...</pre>
          </div>
        </div>

        {/* Response input */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">2. Paste AI response</label>
          <Textarea
            placeholder='Paste the JSON response from AI here...'
            className="min-h-24 font-mono text-xs"
            value={analysisJson}
            onChange={(e) => setAnalysisJson(e.target.value)}
          />
        </div>

        {/* Parse error */}
        {previewError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{previewError}</p>
          </div>
        )}

        {/* Warnings */}
        {previewWarnings.length > 0 && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <ul className="text-xs text-muted-foreground list-disc list-inside">
              {previewWarnings.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
              {previewWarnings.length > 3 && <li>...and {previewWarnings.length - 3} more</li>}
            </ul>
          </div>
        )}

        {/* Live preview editor */}
        {hasPreviewData && !isApplied && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-3 bg-muted border-b border-border flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">3. Review & remove unwanted items</h4>
              <Button size="sm" onClick={applyAnalysis}>
                <Check className="size-4" />
                Apply ({previewRules.length} rules)
              </Button>
            </div>

            {/* Category Changes */}
            {previewCategoryChanges.length > 0 && (
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection('changes')}
                  className="w-full p-2 flex items-center justify-between hover:bg-muted/50"
                >
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    {collapsedSections.changes ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    Category Updates ({previewCategoryChanges.length})
                  </span>
                </button>
                {!collapsedSections.changes && (
                  <div className="p-2 flex flex-col gap-1">
                    {previewCategoryChanges.map((change, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{change.action}</Badge>
                          <span className="text-muted-foreground">{change.from_name}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-foreground">{change.to_name}</span>
                        </div>
                        <button onClick={() => removeCategoryChange(i)} className="p-1 hover:bg-destructive/10 rounded">
                          <X className="size-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Categories */}
            {previewCategories.length > 0 && (
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection('categories')}
                  className="w-full p-2 flex items-center justify-between hover:bg-muted/50"
                >
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    {collapsedSections.categories ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    New Categories ({previewCategories.length})
                  </span>
                </button>
                {!collapsedSections.categories && (
                  <div className="p-2 flex flex-wrap gap-1">
                    {previewCategories.map((cat, i) => (
                      <Badge key={i} variant={cat.type === 'REVENUE' ? 'default' : 'secondary'} className="text-xs pr-1">
                        {cat.name}
                        <button onClick={() => removeCategory(i)} className="ml-1 p-0.5 hover:bg-white/20 rounded">
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Revenue Sources */}
            {previewRevenueSources.length > 0 && (
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection('sources')}
                  className="w-full p-2 flex items-center justify-between hover:bg-muted/50"
                >
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    {collapsedSections.sources ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    Revenue Sources ({previewRevenueSources.length})
                  </span>
                </button>
                {!collapsedSections.sources && (
                  <div className="p-2 flex flex-wrap gap-1">
                    {previewRevenueSources.map((source, i) => (
                      <Badge key={i} variant="outline" className="text-xs pr-1">
                        {source.name}
                        {source.type === 'foreign' && ' (Intl)'}
                        {source.name !== 'Misc' && (
                          <button onClick={() => removeRevenueSource(i)} className="ml-1 p-0.5 hover:bg-destructive/10 rounded">
                            <X className="size-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rules */}
            <div>
              <button
                onClick={() => toggleSection('rules')}
                className="w-full p-2 flex items-center justify-between hover:bg-muted/50"
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  {collapsedSections.rules ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  Mapping Rules ({previewRules.length})
                </span>
              </button>
              {!collapsedSections.rules && (
                <div className="p-2 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-1">Pattern</th>
                        <th className="pb-1">Category</th>
                        <th className="pb-1">Type</th>
                        <th className="pb-1 w-6"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRules.map((rule, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="py-1 font-mono">{rule.pattern}</td>
                          <td className="py-1 text-muted-foreground">{rule.categoryName}</td>
                          <td className="py-1">
                            <Badge variant={rule.categoryType === 'REVENUE' ? 'default' : 'secondary'} className="text-xs">
                              {rule.categoryType}
                            </Badge>
                          </td>
                          <td className="py-1">
                            <button onClick={() => removeRule(i)} className="p-1 hover:bg-destructive/10 rounded">
                              <X className="size-3 text-destructive" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Applied confirmation */}
        {isApplied && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="size-5 variance-positive" />
              <h4 className="font-medium text-foreground">Analysis Applied</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-foreground">{suggestedCategories.length}</div>
                <div className="text-xs text-muted-foreground">new categories</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-foreground">{categoryChanges.length}</div>
                <div className="text-xs text-muted-foreground">category updates</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-foreground">{mappingRules.length}</div>
                <div className="text-xs text-muted-foreground">rules</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-foreground">{matchStats.matched}/{parsedData?.transactions.length}</div>
                <div className="text-xs text-muted-foreground">matched</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReviewStep = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Review & Import</h2>
        <p className="text-muted-foreground mt-1">Everything looks good. Ready to import!</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-lg text-center">
          <p className="text-2xl font-bold text-foreground">{transactionMappings.length}</p>
          <p className="text-sm text-muted-foreground">Transactions</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg text-center">
          <p className="text-2xl font-bold text-foreground">{mappingRules.length}</p>
          <p className="text-sm text-muted-foreground">Rules</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg text-center">
          <p className="text-2xl font-bold text-foreground">{suggestedCategories.length}</p>
          <p className="text-sm text-muted-foreground">New Categories</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg text-center">
          <p className="text-2xl font-bold text-foreground">{suggestedRevenueSources.length}</p>
          <p className="text-sm text-muted-foreground">Revenue Sources</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-4 gap-2 text-sm">
        {['REVENUE', 'EXPENSE', 'TRANSFER', 'IGNORE'].map(type => {
          const count = transactionMappings.filter(m => m.categoryType === type).length;
          return (
            <div key={type} className="text-center p-2 bg-muted rounded">
              <div className="font-medium text-foreground">{count}</div>
              <div className="text-xs text-muted-foreground">{type.toLowerCase()}</div>
            </div>
          );
        })}
      </div>

      {/* Rules preview */}
      {ruleStats.length > 0 && (
        <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2">Pattern</th>
                <th className="pb-2">Category</th>
                <th className="pb-2 text-right">Matches</th>
              </tr>
            </thead>
            <tbody>
              {ruleStats.slice(0, 10).map((stat, i) => {
                const rule = mappingRules[i];
                return (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 font-mono text-xs">{stat.pattern}</td>
                    <td className="py-1.5">
                      <Badge variant={rule.categoryType === 'REVENUE' ? 'default' : 'secondary'} className="text-xs">
                        {rule.categoryName}
                      </Badge>
                    </td>
                    <td className="py-1.5 text-right font-medium">{stat.matchCount}</td>
                  </tr>
                );
              })}
              {ruleStats.length > 10 && (
                <tr>
                  <td colSpan={3} className="py-1.5 text-center text-muted-foreground">
                    ... and {ruleStats.length - 10} more rules
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Import button */}
      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={handleImport} disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-5" />
              Import Everything
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderCompleteStep = () => (
    <div className="flex flex-col gap-6 text-center py-8">
      <div>
        <CheckCircle2 className="size-16 mx-auto variance-positive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground">Import Complete!</h2>
        <p className="text-muted-foreground mt-1">Your transactions have been imported and categorized</p>
      </div>

      {importProgress && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-lg">
            <p className="text-3xl font-bold variance-positive">{importProgress.transactionsImported}</p>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg">
            <p className="text-3xl font-bold variance-positive">{importProgress.journalEntriesCreated}</p>
            <p className="text-sm text-muted-foreground">Journal Entries</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg">
            <p className="text-3xl font-bold text-foreground">{importProgress.rulesCreated}</p>
            <p className="text-sm text-muted-foreground">Rules Saved</p>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" onClick={() => navigate({ to: '/bank/transactions' })}>
          View Transactions
        </Button>
        <Button onClick={() => navigate({ to: '/accounting' })}>
          Go to Reports
        </Button>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload': return renderUploadStep();
      case 'analyze': return renderAnalyzeStep();
      case 'review': return renderReviewStep();
      case 'complete': return renderCompleteStep();
      default: return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Import Wizard</h1>
        <p className="text-muted-foreground mt-1">Import and categorize your bank transactions with AI</p>
      </div>

      {/* Step indicator */}
      {currentStep !== 'complete' && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isComplete = index < currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "size-10 rounded-full flex items-center justify-center transition-colors",
                        isActive ? "bg-primary text-primary-foreground" :
                        isComplete ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isComplete ? <Check className="size-5" /> : <Icon className="size-5" />}
                    </div>
                    <span className={cn("text-xs mt-2 font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-2", index < currentStepIndex ? "bg-primary/40" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="bg-card border border-border rounded-lg p-6">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      {currentStep !== 'complete' && (
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={goBack} disabled={currentStepIndex === 0}>
            <ArrowLeft className="size-4" />
            Back
          </Button>

          {currentStep !== 'review' && (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Continue
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
