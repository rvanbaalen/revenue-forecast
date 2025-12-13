import { useState, useCallback, useRef } from 'react';
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
  FolderTree,
  Tags,
  ClipboardList,
  Building2,
  Calendar,
  Download,
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
  generateCategoryPrompt,
  generateMappingRulesPrompt,
  parseCategoryResponse,
  parseMappingRulesResponse,
  applyMappingRules,
  analyzeTransactionPatterns,
  categoriesToChartAccounts,
  findMatchingChartAccount,
} from '@/utils/ofx-wizard';
import type { ParsedOFXFile, TransactionCategory, TransactionFlowType } from '@/types';
import { db } from '@/store/db';

// Step configuration
const STEPS: { id: WizardStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upload', label: 'Upload OFX', icon: Upload },
  { id: 'categories', label: 'Define Categories', icon: FolderTree },
  { id: 'mapping', label: 'Map Transactions', icon: Tags },
  { id: 'review', label: 'Review & Import', icon: ClipboardList },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OFXWizardPage() {
  const navigate = useNavigate();
  useBank(); // Hook provides context but we use db directly for import
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

  // Step 2: Categories
  const [businessType, setBusinessType] = useState<BusinessType | undefined>(undefined);
  const [categoryPrompt, setCategoryPrompt] = useState<string>('');
  const [categoryJson, setCategoryJson] = useState<string>('');
  const [suggestedCategories, setSuggestedCategories] = useState<SuggestedCategory[]>([]);
  const [categoryChanges, setCategoryChanges] = useState<CategoryChange[]>([]);
  const [copiedCategory, setCopiedCategory] = useState(false);

  // Step 3: Mapping Rules
  const [mappingPrompt, setMappingPrompt] = useState<string>('');
  const [mappingJson, setMappingJson] = useState<string>('');
  const [mappingRules, setMappingRules] = useState<MappingRuleInput[]>([]);
  const [transactionMappings, setTransactionMappings] = useState<TransactionMapping[]>([]);
  const [suggestedRevenueSources, setSuggestedRevenueSources] = useState<SuggestedRevenueSource[]>([]);
  const [copiedMapping, setCopiedMapping] = useState(false);
  const [mappingWarnings, setMappingWarnings] = useState<string[]>([]);
  const [ruleStats, setRuleStats] = useState<{ pattern: string; matchCount: number }[]>([]);
  const [matchStats, setMatchStats] = useState<{ matched: number; unmatched: number }>({ matched: 0, unmatched: 0 });

  // Step 4: Import
  const [importProgress, setImportProgress] = useState<{
    categoriesCreated: number;
    categoriesModified: number;
    revenueSourcesCreated: number;
    transactionsImported: number;
    journalEntriesCreated: number;
    rulesCreated: number;
  } | null>(null);

  // ============================================
  // Step Navigation
  // ============================================

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'upload':
        return parsedData !== null;
      case 'categories':
        // Allow continuing if we have new categories OR category changes
        return suggestedCategories.length > 0 || categoryChanges.length > 0;
      case 'mapping':
        // Rules must be defined and applied to transactions
        return mappingRules.length > 0 && transactionMappings.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, parsedData, suggestedCategories, categoryChanges, mappingRules, transactionMappings]);

  const goNext = useCallback(() => {
    if (!canGoNext()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex].id;
      setCurrentStep(nextStep);

      // Generate prompts when entering steps
      if (nextStep === 'categories' && parsedData) {
        // Get existing revenue/expense categories for refinement
        const existingCategories = chartAccounts
          .filter(a => (a.type === 'REVENUE' || a.type === 'EXPENSE') && a.isActive)
          .map(a => ({
            code: a.code,
            name: a.name,
            type: a.type as 'REVENUE' | 'EXPENSE',
            description: a.description,
          }));
        const prompt = generateCategoryPrompt(parsedData.transactions, businessType, existingCategories);
        setCategoryPrompt(prompt);
      } else if (nextStep === 'mapping' && parsedData && suggestedCategories.length > 0) {
        // Use rules-based prompt (compact format)
        const prompt = generateMappingRulesPrompt(parsedData.transactions, suggestedCategories);
        setMappingPrompt(prompt);
      }
    }
  }, [canGoNext, currentStepIndex, parsedData, suggestedCategories, chartAccounts, businessType]);

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
  // Step 2: Category Handling
  // ============================================

  const handleCopyPrompt = useCallback(async (prompt: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleBusinessTypeChange = useCallback((type: BusinessType | undefined) => {
    setBusinessType(type);
    // Regenerate prompt with new business type context
    if (parsedData) {
      const existingCategories = chartAccounts
        .filter(a => (a.type === 'REVENUE' || a.type === 'EXPENSE') && a.isActive)
        .map(a => ({
          code: a.code,
          name: a.name,
          type: a.type as 'REVENUE' | 'EXPENSE',
          description: a.description,
        }));
      const prompt = generateCategoryPrompt(parsedData.transactions, type, existingCategories);
      setCategoryPrompt(prompt);
    }
  }, [parsedData, chartAccounts]);

  const handleCategoryJsonPaste = useCallback(() => {
    setError(null);
    const result = parseCategoryResponse(categoryJson);

    if (!result.success) {
      setError(result.error || 'Failed to parse categories');
      return;
    }

    setSuggestedCategories(result.categories);
    setCategoryChanges(result.categoryChanges);
  }, [categoryJson]);

  // ============================================
  // Step 3: Mapping Handling
  // ============================================

  const handleMappingJsonPaste = useCallback(() => {
    if (!parsedData) return;
    setError(null);

    // Parse the rules from LLM response
    const result = parseMappingRulesResponse(mappingJson);

    if (!result.success) {
      setError(result.error || 'Failed to parse mapping rules');
      return;
    }

    // Store the rules
    setMappingRules(result.rules);
    setSuggestedRevenueSources(result.revenueSources);
    setMappingWarnings(result.warnings);

    // Apply rules to transactions to generate mappings
    const applied = applyMappingRules(parsedData.transactions, result.rules);
    setTransactionMappings(applied.mappings);
    setRuleStats(applied.ruleStats);
    setMatchStats({ matched: applied.matchedCount, unmatched: applied.unmatchedCount });

    // Add warning if there are unmatched transactions
    if (applied.unmatchedCount > 0) {
      setMappingWarnings(prev => [
        ...prev,
        `${applied.unmatchedCount} transaction(s) did not match any rule and will be marked as uncategorized`,
      ]);
    }
  }, [mappingJson, parsedData]);

  // ============================================
  // Step 4: Import
  // ============================================

  const handleImport = useCallback(async () => {
    if (!parsedData) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 0. Apply category changes (rename, merge, update_description)
      let categoriesModified = 0;
      const categoryNameMap = new Map<string, string>(); // old name -> new name for mapping updates

      for (const change of categoryChanges) {
        const existingAccount = chartAccounts.find(
          a => a.name.toLowerCase() === change.from_name.toLowerCase() &&
               (a.type === 'REVENUE' || a.type === 'EXPENSE')
        );

        if (!existingAccount) {
          console.warn(`Category not found for change: ${change.from_name}`);
          continue;
        }

        if (change.action === 'rename' || change.action === 'update_description') {
          // Update the category
          const updatedAccount = {
            ...existingAccount,
            name: change.to_name || existingAccount.name,
            code: change.to_code || existingAccount.code,
            description: change.to_description ?? existingAccount.description,
            updatedAt: new Date().toISOString(),
          };
          await db.updateChartAccount(updatedAccount);
          categoriesModified++;

          // Track name change for mapping updates
          if (change.to_name && change.to_name !== existingAccount.name) {
            categoryNameMap.set(existingAccount.name.toLowerCase(), change.to_name);
          }
        } else if (change.action === 'merge' && change.merge_from) {
          // Merge: move all transactions from merge_from accounts to this account
          const targetAccount = existingAccount;

          for (const sourceName of change.merge_from) {
            const sourceAccount = chartAccounts.find(
              a => a.name.toLowerCase() === sourceName.toLowerCase() &&
                   (a.type === 'REVENUE' || a.type === 'EXPENSE')
            );

            if (sourceAccount && sourceAccount.id !== targetAccount.id) {
              // Update all transactions with sourceAccount to use targetAccount
              await db.updateTransactionsCategory(sourceAccount.id, targetAccount.id);

              // Update all journal entries
              await db.updateJournalEntriesAccount(sourceAccount.id, targetAccount.id);

              // Update mapping rules
              await db.updateMappingRulesCategory(sourceAccount.id, targetAccount.id);

              // Deactivate the source account
              await db.updateChartAccount({
                ...sourceAccount,
                isActive: false,
                updatedAt: new Date().toISOString(),
              });

              categoriesModified++;
              categoryNameMap.set(sourceName.toLowerCase(), change.to_name);
            }
          }

          // Update target account name if changed
          if (change.to_name !== targetAccount.name || change.to_description) {
            await db.updateChartAccount({
              ...targetAccount,
              name: change.to_name,
              description: change.to_description ?? targetAccount.description,
              updatedAt: new Date().toISOString(),
            });
            categoryNameMap.set(existingAccount.name.toLowerCase(), change.to_name);
          }
        }
      }

      // 1. Create new categories in chart of accounts
      const newCategories = categoriesToChartAccounts(suggestedCategories, chartAccounts);
      let categoriesCreated = 0;

      for (const category of newCategories) {
        await addChartAccount(category);
        categoriesCreated++;
      }

      // Reload chart accounts to get IDs
      const updatedChartAccounts = await db.getChartAccounts();

      // 1b. Create revenue sources (avoid duplicates)
      const existingSources = await db.getSources();
      const existingSourceNames = new Set(existingSources.map(s => s.name.toLowerCase()));
      const revenueSourceNameToId = new Map<string, number>();
      let revenueSourcesCreated = 0;

      // Map existing sources by name
      for (const source of existingSources) {
        revenueSourceNameToId.set(source.name.toLowerCase(), source.id);
      }

      // Create new revenue sources
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

      // 2. Create or find bank account
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

      // 2b. Create or find chart account for the bank account (needed for journal entries)
      let bankChartAccount = getChartAccountForBankAccount(bankAccount.id);
      if (!bankChartAccount) {
        bankChartAccount = await createChartAccountForBankAccount(bankAccount);
      }

      // 3. Create mapping from fitId to mapping data
      const mappingByFitId = new Map(transactionMappings.map(m => [m.fitId, m]));

      // 4. Import transactions with categorization
      const importBatchId = `wizard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const importedAt = new Date().toISOString();

      const transactionsToAdd: Parameters<typeof db.addBankTransactions>[0] = [];
      const isCreditCard = bankAccount.accountType === 'CREDITCARD' || bankAccount.accountType === 'CREDITLINE';

      for (const tx of parsedData.transactions) {
        // Check for duplicates
        const exists = await db.checkTransactionExists(bankAccount.id, tx.fitId);
        if (exists) continue;

        const mapping = mappingByFitId.get(tx.fitId);
        const { month, year } = extractMonthYear(tx.datePosted);

        // Determine flow type
        let flowType: TransactionFlowType;
        if (isCreditCard) {
          flowType = tx.amount > 0 ? 'charge' : 'payment';
        } else {
          flowType = tx.amount >= 0 ? 'credit' : 'debit';
        }

        // Determine category
        let category: TransactionCategory = tx.amount >= 0 ? 'revenue' : 'expense';
        let chartAccountId: string | undefined;
        let isIgnored = false;

        // Lookup revenue source ID for revenue transactions
        let revenueSourceId: number | undefined;

        if (mapping) {
          if (mapping.categoryType === 'TRANSFER') {
            category = 'transfer';
          } else if (mapping.categoryType === 'IGNORE') {
            category = 'ignore';
            isIgnored = true;
          } else {
            category = mapping.categoryType.toLowerCase() as TransactionCategory;

            // Find matching chart account
            const matchedAccount = findMatchingChartAccount(mapping, updatedChartAccounts);
            if (matchedAccount) {
              chartAccountId = matchedAccount.id;
            }

            // Get revenue source ID for revenue transactions
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
          isReconciled: true, // Already categorized via wizard
          importedAt,
          importBatchId,
        });
      }

      // Bulk insert transactions
      let transactionsImported = 0;
      let journalEntriesCreated = 0;
      if (transactionsToAdd.length > 0) {
        const ids = await db.addBankTransactions(transactionsToAdd);
        transactionsImported = ids.length;

        // 5. Create journal entries for categorized transactions
        const isCreditCard = bankAccount.accountType === 'CREDITCARD' || bankAccount.accountType === 'CREDITLINE';

        for (let i = 0; i < transactionsToAdd.length; i++) {
          const tx = transactionsToAdd[i];
          const txId = ids[i];

          // Only create journal entries for transactions with categories (not transfers or ignored)
          if (!tx.chartAccountId || tx.category === 'transfer' || tx.category === 'ignore') {
            continue;
          }

          const amount = Math.abs(tx.amount);
          const isCredit = tx.amount > 0;

          // Build journal lines based on account type and transaction direction
          const lines: { accountId: string; amount: number; type: 'DEBIT' | 'CREDIT' }[] = [];

          if (isCreditCard) {
            // Credit card: charges (positive) increase liability and expense
            if (isCredit) {
              // Charge = expense
              lines.push({ accountId: tx.chartAccountId, amount, type: 'DEBIT' }); // Increase expense
              lines.push({ accountId: bankChartAccount.id, amount, type: 'CREDIT' }); // Increase liability
            } else {
              // Payment = decrease liability
              lines.push({ accountId: bankChartAccount.id, amount, type: 'DEBIT' }); // Decrease liability
              lines.push({ accountId: tx.chartAccountId, amount, type: 'CREDIT' }); // From cash
            }
          } else {
            // Bank account (asset)
            if (isCredit) {
              // Money in = revenue
              lines.push({ accountId: bankChartAccount.id, amount, type: 'DEBIT' }); // Increase asset
              lines.push({ accountId: tx.chartAccountId, amount, type: 'CREDIT' }); // Increase revenue
            } else {
              // Money out = expense
              lines.push({ accountId: tx.chartAccountId, amount, type: 'DEBIT' }); // Increase expense
              lines.push({ accountId: bankChartAccount.id, amount, type: 'CREDIT' }); // Decrease asset
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

      // 6. Create mapping rules from the imported rules
      let rulesCreated = 0;
      const existingRules = await db.getMappingRules();
      const existingPatterns = new Set(existingRules.map(r => r.pattern.toLowerCase()));

      for (let i = 0; i < mappingRules.length; i++) {
        const rule = mappingRules[i];

        // Skip if rule already exists
        if (existingPatterns.has(rule.pattern.toLowerCase())) {
          continue;
        }

        // Skip TRANSFER and IGNORE rules (they don't need chart accounts)
        if (rule.categoryType === 'TRANSFER' || rule.categoryType === 'IGNORE') {
          continue;
        }

        // Find matching chart account for this rule
        const matchedAccount = updatedChartAccounts.find(
          a => a.name.toLowerCase() === rule.categoryName.toLowerCase() && a.isActive
        );
        if (!matchedAccount) {
          continue;
        }

        // Get revenue source ID if applicable
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
          priority: 100 - i, // Higher priority for earlier rules
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
  // Render Step Content
  // ============================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return renderUploadStep();
      case 'categories':
        return renderCategoriesStep();
      case 'mapping':
        return renderMappingStep();
      case 'review':
        return renderReviewStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  const renderUploadStep = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Upload Your Bank Statement</h2>
        <p className="text-muted-foreground mt-1">
          Start by uploading an OFX or QFX file from your bank
        </p>
      </div>

      {/* File drop zone */}
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
        <FileText className="size-12 mx-auto text-muted-foreground mb-4" />
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

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* File preview */}
      {parsedData && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileText className="size-6 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">{file?.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file?.size ?? 0)}
              </p>
            </div>
            <CheckCircle2 className="size-5 variance-positive" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Building2 className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {parsedData.account.accountType}
                </p>
                <p className="text-xs text-muted-foreground">
                  ****{parsedData.account.accountId.slice(-4)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Calendar className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {parsedData.transactions.length} transactions
                </p>
                <p className="text-xs text-muted-foreground">
                  {parsedData.dateRange.start} - {parsedData.dateRange.end}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction summary */}
          {parsedData && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">Transaction Summary</h4>
              {(() => {
                const patterns = analyzeTransactionPatterns(parsedData.transactions);
                const formatAmount = (amount: number) =>
                  amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Credits:</span>{' '}
                      <span className="variance-positive font-medium">
                        {patterns.creditCount} ({parsedData.currency} {formatAmount(patterns.totalCredits)})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Debits:</span>{' '}
                      <span className="variance-negative font-medium">
                        {patterns.debitCount} ({parsedData.currency} {formatAmount(patterns.totalDebits)})
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderCategoriesStep = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Define Your Categories</h2>
        <p className="text-muted-foreground mt-1">
          Use AI to analyze your transactions and suggest categories
        </p>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Sparkles className="size-4 text-info" />
          How it works
        </h4>
        <ol className="text-sm text-muted-foreground list-decimal list-inside flex flex-col gap-1">
          <li>Optionally select your business type below for better suggestions</li>
          <li>Copy the instructions below</li>
          <li>Paste them into ChatGPT, Claude, or any LLM of your choice</li>
          <li>Copy the JSON response from the AI</li>
          <li>Paste the JSON in the input below</li>
        </ol>
      </div>

      {/* Business type selector */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Business Type <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {BUSINESS_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleBusinessTypeChange(businessType === type.id ? undefined : type.id)}
              className={cn(
                "p-3 rounded-lg border text-left transition-colors",
                businessType === type.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <p className="text-sm font-medium text-foreground">{type.label}</p>
              <p className="text-xs text-muted-foreground">{type.description}</p>
            </button>
          ))}
        </div>
        {businessType && (
          <p className="text-xs text-muted-foreground mt-2">
            The LLM prompt includes industry-specific category suggestions for your business type.
          </p>
        )}
      </div>

      {/* Prompt display */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">LLM Instructions</label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopyPrompt(categoryPrompt, setCopiedCategory)}
          >
            {copiedCategory ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiedCategory ? 'Copied!' : 'Copy Instructions'}
          </Button>
        </div>
        <div className="bg-muted rounded-lg p-4 max-h-48 overflow-y-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
            {categoryPrompt.slice(0, 500)}...
          </pre>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {categoryPrompt.length.toLocaleString()} characters • Click &quot;Copy Instructions&quot; to get the full prompt
        </p>
      </div>

      {/* JSON input */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Paste AI Response (JSON)
        </label>
        <Textarea
          placeholder='{"categories": [...]}'
          className="min-h-32 font-mono text-sm"
          value={categoryJson}
          onChange={(e) => setCategoryJson(e.target.value)}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Paste the JSON response from your AI assistant
          </p>
          <Button
            onClick={handleCategoryJsonPaste}
            disabled={!categoryJson.trim()}
          >
            <Download className="size-4" />
            Import Categories
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Category changes preview */}
      {categoryChanges.length > 0 && (
        <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-3">
            {categoryChanges.length} category change(s) to apply
          </h4>
          <div className="flex flex-col gap-2 text-sm">
            {categoryChanges.map((change, i) => (
              <div key={i} className="flex items-center gap-2">
                {change.action === 'rename' && (
                  <>
                    <Badge variant="outline">Rename</Badge>
                    <span className="text-muted-foreground">{change.from_name}</span>
                    <span>→</span>
                    <span className="font-medium">{change.to_name}</span>
                  </>
                )}
                {change.action === 'merge' && (
                  <>
                    <Badge variant="outline">Merge</Badge>
                    <span className="text-muted-foreground">
                      {change.from_name}, {change.merge_from?.join(', ')}
                    </span>
                    <span>→</span>
                    <span className="font-medium">{change.to_name}</span>
                  </>
                )}
                {change.action === 'update_description' && (
                  <>
                    <Badge variant="outline">Update</Badge>
                    <span className="font-medium">{change.to_name}</span>
                    <span className="text-muted-foreground">(description)</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New categories preview */}
      {suggestedCategories.length > 0 && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="size-5 variance-positive" />
            <h4 className="font-medium text-foreground">
              {suggestedCategories.length} new categories to create
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedCategories.map((cat, i) => (
              <Badge
                key={i}
                variant={cat.type === 'REVENUE' ? 'default' : 'secondary'}
              >
                {cat.code} - {cat.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Success message when no new categories but have changes */}
      {suggestedCategories.length === 0 && categoryChanges.length > 0 && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 variance-positive" />
            <span className="text-sm text-foreground">
              Existing categories will be updated. No new categories needed.
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderMappingStep = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Create Categorization Rules</h2>
        <p className="text-muted-foreground mt-1">
          Use AI to create reusable rules that categorize your transactions
        </p>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Sparkles className="size-4 text-info" />
          How it works
        </h4>
        <ol className="text-sm text-muted-foreground list-decimal list-inside flex flex-col gap-1">
          <li>Copy the instructions below (includes your categories and transaction patterns)</li>
          <li>Paste them into ChatGPT, Claude, or any LLM of your choice</li>
          <li>The AI will create RULES that match patterns (e.g., &quot;STRIPE&quot; → Revenue)</li>
          <li>Rules apply to multiple transactions and future imports automatically</li>
        </ol>
      </div>

      {/* Prompt display */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">LLM Instructions</label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopyPrompt(mappingPrompt, setCopiedMapping)}
          >
            {copiedMapping ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiedMapping ? 'Copied!' : 'Copy Instructions'}
          </Button>
        </div>
        <div className="bg-muted rounded-lg p-4 max-h-48 overflow-y-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
            {mappingPrompt.slice(0, 500)}...
          </pre>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {mappingPrompt.length.toLocaleString()} characters • Click &quot;Copy Instructions&quot; to get the full prompt
        </p>
      </div>

      {/* JSON input */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Paste AI Response (JSON)
        </label>
        <Textarea
          placeholder='{"rules": [...], "revenue_sources": [...]}'
          className="min-h-32 font-mono text-sm"
          value={mappingJson}
          onChange={(e) => setMappingJson(e.target.value)}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Paste the JSON response from your AI assistant
          </p>
          <Button
            onClick={handleMappingJsonPaste}
            disabled={!mappingJson.trim()}
          >
            <Download className="size-4" />
            Import Rules
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {mappingWarnings.length > 0 && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <h4 className="text-sm font-medium text-warning mb-2">Warnings</h4>
          <ul className="text-sm text-muted-foreground list-disc list-inside">
            {mappingWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Rules preview */}
      {mappingRules.length > 0 && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="size-5 variance-positive" />
            <h4 className="font-medium text-foreground">
              {mappingRules.length} rules created
            </h4>
            <span className="text-sm text-muted-foreground">
              ({matchStats.matched} matched, {matchStats.unmatched} unmatched)
            </span>
          </div>

          {/* Rule stats table */}
          <div className="bg-background/50 rounded-lg p-3 max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2">Pattern</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Matches</th>
                </tr>
              </thead>
              <tbody>
                {ruleStats.map((stat, i) => {
                  const rule = mappingRules[i];
                  return (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 font-mono text-xs">{stat.pattern}</td>
                      <td className="py-1.5">
                        <Badge variant={rule.categoryType === 'REVENUE' ? 'default' : 'secondary'} className="text-xs">
                          {rule.categoryType}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-muted-foreground">{rule.categoryName}</td>
                      <td className="py-1.5 text-right font-medium">{stat.matchCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction summary by type */}
      {transactionMappings.length > 0 && (
        <div className="p-4 border border-border rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Transaction Summary
          </h4>
          <div className="grid grid-cols-4 gap-2 text-sm">
            {['REVENUE', 'EXPENSE', 'TRANSFER', 'IGNORE'].map(type => {
              const count = transactionMappings.filter(m => m.categoryType === type).length;
              return (
                <div key={type} className="text-center">
                  <div className="font-medium text-foreground">{count}</div>
                  <div className="text-xs text-muted-foreground">{type.toLowerCase()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revenue sources preview */}
      {suggestedRevenueSources.length > 0 && (
        <div className="p-4 border border-border rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Revenue Sources ({suggestedRevenueSources.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {suggestedRevenueSources.map((source, i) => {
              const revenueCount = transactionMappings.filter(
                m => m.categoryType === 'REVENUE' && m.revenueSource === source.name
              ).length;
              return (
                <Badge key={i} variant={source.name === 'Misc' ? 'secondary' : 'default'}>
                  {source.name}
                  {source.type === 'foreign' && ' (Intl)'}
                  {revenueCount > 0 && ` (${revenueCount})`}
                </Badge>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            These revenue sources will be created to track income by source
          </p>
        </div>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Review & Import</h2>
        <p className="text-muted-foreground mt-1">
          Review your setup and import everything
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-lg text-center">
          <p className="text-3xl font-bold text-foreground">
            {suggestedCategories.length}
          </p>
          <p className="text-sm text-muted-foreground">New Categories</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg text-center">
          <p className="text-3xl font-bold text-foreground">
            {mappingRules.length}
          </p>
          <p className="text-sm text-muted-foreground">Mapping Rules</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg text-center">
          <p className="text-3xl font-bold text-foreground">
            {transactionMappings.length}
          </p>
          <p className="text-sm text-muted-foreground">Transactions</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg text-center">
          <p className="text-3xl font-bold text-foreground">
            {parsedData?.currency}
          </p>
          <p className="text-sm text-muted-foreground">Currency</p>
        </div>
      </div>

      {/* Categories list */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Categories to Create</h3>
        <div className="bg-muted rounded-lg p-4 max-h-40 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {suggestedCategories.map((cat, i) => (
              <Badge
                key={i}
                variant={cat.type === 'REVENUE' ? 'default' : 'secondary'}
              >
                {cat.code} - {cat.name} ({cat.type})
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction breakdown by category */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Transactions by Category</h3>
        <div className="bg-muted rounded-lg p-4 max-h-60 overflow-y-auto">
          {(() => {
            // Group transactions by category
            const grouped = transactionMappings.reduce((acc, m) => {
              const key = `${m.suggestedCategory} (${m.categoryType})`;
              if (!acc[key]) {
                acc[key] = { count: 0, total: 0 };
              }
              acc[key].count++;
              acc[key].total += m.amount;
              return acc;
            }, {} as Record<string, { count: number; total: number }>);

            return (
              <div className="flex flex-col gap-2">
                {Object.entries(grouped)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([category, data]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{category}</span>
                      <span className="text-muted-foreground">
                        {data.count} txns • {parsedData?.currency} {data.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Import button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleImport}
          disabled={isProcessing}
        >
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

      {/* Error display */}
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
        <p className="text-muted-foreground mt-1">
          Your transactions have been imported and categorized
        </p>
      </div>

      {importProgress && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-3xl font-bold variance-positive">
                {importProgress.categoriesCreated}
              </p>
              <p className="text-sm text-muted-foreground">Categories Created</p>
            </div>
            {importProgress.categoriesModified > 0 && (
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-3xl font-bold text-info">
                  {importProgress.categoriesModified}
                </p>
                <p className="text-sm text-muted-foreground">Categories Modified</p>
              </div>
            )}
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-3xl font-bold variance-positive">
                {importProgress.revenueSourcesCreated}
              </p>
              <p className="text-sm text-muted-foreground">Revenue Sources</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-3xl font-bold variance-positive">
                {importProgress.transactionsImported}
              </p>
              <p className="text-sm text-muted-foreground">Transactions</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-3xl font-bold variance-positive">
                {importProgress.journalEntriesCreated}
              </p>
              <p className="text-sm text-muted-foreground">Journal Entries</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-3xl font-bold text-foreground">
                {importProgress.rulesCreated}
              </p>
              <p className="text-sm text-muted-foreground">Auto-Rules Created</p>
            </div>
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

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Setup Wizard</h1>
        <p className="text-muted-foreground mt-1">
          Import your bank transactions and set up categories in a few easy steps
        </p>
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
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isComplete
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isComplete ? (
                        <Check className="size-5" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-2 font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-2",
                        index < currentStepIndex ? "bg-primary/40" : "bg-border"
                      )}
                    />
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
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          {currentStep !== 'review' && (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
