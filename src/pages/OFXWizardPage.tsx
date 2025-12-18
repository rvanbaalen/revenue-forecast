import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Trash2,
  ArrowLeftRight,
  Plus,
} from 'lucide-react';
import { useBank } from '@/context/BankContext';
import { useAccountingContext } from '@/context/AccountingContext';
import { useRevenue } from '@/context/RevenueContext';
import { parseOFXFile, validateOFXFile, hashAccountId, maskAccountId, extractMonthYear, matchOrCreateCurrency } from '@/utils/ofx-parser';
import {
  type WizardStep,
  type SuggestedChartAccount,
  type TransactionMapping,
  type SuggestedRevenueSource,
  type AccountChange,
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
import {
  detectTransfers,
  getTransferSummary,
  generateTransferAnalysisPrompt,
  type DetectedTransfer,
} from '@/utils/transfer-detection';
import type { ParsedOFXFile, TransactionCategory, TransactionFlowType, Month } from '@/types';
import { MONTHS } from '@/types';
import { db } from '@/store/db';

// Step configuration - now includes transfers step for multi-file import
const STEPS: { id: WizardStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
  { id: 'analyze', label: 'AI Analysis', icon: Sparkles },
  { id: 'review', label: 'Import', icon: ClipboardList },
];

// Parsed file with metadata
interface ParsedFileWithMeta {
  file: File;
  parsed: ParsedOFXFile;
  accountHash: string;
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
  const { config, updateConfig, updateSourceRevenue } = useRevenue();

  // Data reset dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Multi-file state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedFiles, setParsedFiles] = useState<ParsedFileWithMeta[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Transfer detection state
  const [detectedTransfers, setDetectedTransfers] = useState<DetectedTransfer[]>([]);
  const [confirmedTransfers, setConfirmedTransfers] = useState<Set<string>>(new Set());
  const [rejectedTransfers, setRejectedTransfers] = useState<Set<string>>(new Set());

  // Upload step - business type
  const [businessType, setBusinessType] = useState<BusinessType | undefined>(undefined);

  // Analysis step - unified prompt/response
  const [analysisPrompt, setAnalysisPrompt] = useState<string>('');
  const [analysisJson, setAnalysisJson] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Live preview state (editable before applying)
  const [previewChartAccounts, setPreviewChartAccounts] = useState<SuggestedChartAccount[]>([]);
  const [previewAccountChanges, setPreviewAccountChanges] = useState<AccountChange[]>([]);
  const [previewRevenueSources, setPreviewRevenueSources] = useState<SuggestedRevenueSource[]>([]);
  const [previewRules, setPreviewRules] = useState<MappingRuleInput[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Final applied state
  const [suggestedChartAccounts, setSuggestedChartAccounts] = useState<SuggestedChartAccount[]>([]);
  const [accountChanges, setAccountChanges] = useState<AccountChange[]>([]);
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
    revenueSourcesSynced: number;
  } | null>(null);

  // ============================================
  // Check for existing data on mount
  // ============================================

  useEffect(() => {
    async function checkExistingData() {
      const [transactions, accounts, sources] = await Promise.all([
        db.getBankTransactions(),
        db.getBankAccounts(),
        db.getSources(),
      ]);

      const hasData = transactions.length > 0 || accounts.length > 0 || sources.length > 0;

      if (hasData) {
        setShowResetDialog(true);
      }
    }

    checkExistingData();
  }, []);

  // Handle data reset
  const handleResetData = useCallback(async () => {
    setIsResetting(true);
    try {
      await db.clearAllData();
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset data:', err);
      setError('Failed to reset data. Please try again.');
      setIsResetting(false);
    }
  }, []);

  // ============================================
  // Live JSON Parsing
  // ============================================

  useEffect(() => {
    if (!analysisJson.trim()) {
      setPreviewChartAccounts([]);
      setPreviewAccountChanges([]);
      setPreviewRevenueSources([]);
      setPreviewRules([]);
      setPreviewError(null);
      setPreviewWarnings([]);
      return;
    }

    const result = parseUnifiedAnalysisResponse(analysisJson);

    if (!result.success) {
      setPreviewError(result.error || 'Failed to parse');
      setPreviewChartAccounts([]);
      setPreviewAccountChanges([]);
      setPreviewRevenueSources([]);
      setPreviewRules([]);
      setPreviewWarnings([]);
      return;
    }

    setPreviewError(null);
    setPreviewWarnings(result.warnings);
    setPreviewChartAccounts(result.chartAccounts);
    setPreviewAccountChanges(result.accountChanges);
    setPreviewRevenueSources(result.revenueSources);
    setPreviewRules(result.rules);
  }, [analysisJson]);

  // ============================================
  // Step Navigation
  // ============================================

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  // Helper to get combined transactions from all files
  const getAllTransactions = useCallback(() => {
    return parsedFiles.flatMap(pf => pf.parsed.transactions);
  }, [parsedFiles]);

  // Get confirmed transfers for prompting
  const getConfirmedTransferList = useCallback(() => {
    return detectedTransfers.filter(t => confirmedTransfers.has(t.id));
  }, [detectedTransfers, confirmedTransfers]);

  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'upload':
        return parsedFiles.length > 0;
      case 'transfers':
        // Can always proceed from transfers, even with no transfers detected
        return true;
      case 'analyze':
        return mappingRules.length > 0 && transactionMappings.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, parsedFiles, mappingRules, transactionMappings]);

  const goNext = useCallback(() => {
    if (!canGoNext()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex].id;
      setCurrentStep(nextStep);

      // Detect transfers when entering transfers step
      if (nextStep === 'transfers' && parsedFiles.length > 1) {
        const transfers = detectTransfers(
          parsedFiles.map(pf => pf.parsed),
          config.currencies
        );
        setDetectedTransfers(transfers);
        // Auto-confirm high confidence transfers
        const highConfidence = new Set(
          transfers.filter(t => t.confidence === 'high').map(t => t.id)
        );
        setConfirmedTransfers(highConfidence);
      }

      // Generate unified prompt when entering analyze step
      if (nextStep === 'analyze' && parsedFiles.length > 0) {
        const existingCategories = chartAccounts
          .filter(a => (a.type === 'REVENUE' || a.type === 'EXPENSE') && a.isActive)
          .map(a => ({
            code: a.code,
            name: a.name,
            type: a.type as 'REVENUE' | 'EXPENSE',
            description: a.description,
          }));

        const allTransactions = getAllTransactions();
        let prompt = generateUnifiedAnalysisPrompt(allTransactions, businessType, existingCategories);

        // Add transfer detection info to prompt
        const confirmedTransferList = getConfirmedTransferList();
        if (confirmedTransferList.length > 0) {
          prompt += generateTransferAnalysisPrompt(confirmedTransferList);
        }

        setAnalysisPrompt(prompt);
      }
    }
  }, [canGoNext, currentStepIndex, parsedFiles, chartAccounts, businessType, config.currencies, getAllTransactions, getConfirmedTransferList]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  // ============================================
  // Step 1: File Upload (Multi-file support)
  // ============================================

  const handleFilesSelect = useCallback(async (selectedFiles: File[]) => {
    setError(null);

    const validFiles: ParsedFileWithMeta[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      // Skip duplicates
      const existingFile = parsedFiles.find(pf => pf.file.name === file.name);
      if (existingFile) {
        errors.push(`${file.name}: Already added`);
        continue;
      }

      try {
        const parsed = await parseOFXFile(file);
        const validation = validateOFXFile(parsed);

        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Check for duplicate account
        const accountHash = hashAccountId(parsed.account.accountId);
        const existingAccount = parsedFiles.find(pf => pf.accountHash === accountHash);
        if (existingAccount) {
          errors.push(`${file.name}: Same account as ${existingAccount.file.name}`);
          continue;
        }

        validFiles.push({
          file,
          parsed,
          accountHash,
        });
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Failed to parse'}`);
      }
    }

    if (validFiles.length > 0) {
      setParsedFiles(prev => [...prev, ...validFiles]);
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }
  }, [parsedFiles]);

  const removeFile = useCallback((index: number) => {
    setParsedFiles(prev => prev.filter((_, i) => i !== index));
    // Reset transfer detection when files change
    setDetectedTransfers([]);
    setConfirmedTransfers(new Set());
    setRejectedTransfers(new Set());
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.ofx') || f.name.endsWith('.qfx')
    );

    if (files.length === 0) {
      setError('Please drop valid OFX or QFX files');
      return;
    }

    handleFilesSelect(files);
  }, [handleFilesSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(Array.from(files));
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFilesSelect]);

  // Transfer confirmation handlers
  const confirmTransfer = useCallback((transferId: string) => {
    setConfirmedTransfers(prev => {
      const next = new Set(prev);
      next.add(transferId);
      return next;
    });
    setRejectedTransfers(prev => {
      const next = new Set(prev);
      next.delete(transferId);
      return next;
    });
  }, []);

  const rejectTransfer = useCallback((transferId: string) => {
    setRejectedTransfers(prev => {
      const next = new Set(prev);
      next.add(transferId);
      return next;
    });
    setConfirmedTransfers(prev => {
      const next = new Set(prev);
      next.delete(transferId);
      return next;
    });
  }, []);

  const confirmAllTransfers = useCallback(() => {
    setConfirmedTransfers(new Set(detectedTransfers.map(t => t.id)));
    setRejectedTransfers(new Set());
  }, [detectedTransfers]);

  const rejectAllTransfers = useCallback(() => {
    setRejectedTransfers(new Set(detectedTransfers.map(t => t.id)));
    setConfirmedTransfers(new Set());
  }, [detectedTransfers]);

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

  const removeChartAccount = useCallback((index: number) => {
    setPreviewChartAccounts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeAccountChange = useCallback((index: number) => {
    setPreviewAccountChanges(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeRevenueSource = useCallback((index: number) => {
    setPreviewRevenueSources(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeRule = useCallback((index: number) => {
    setPreviewRules(prev => prev.filter((_, i) => i !== index));
  }, []);

  const applyAnalysis = useCallback(() => {
    if (parsedFiles.length === 0 || previewRules.length === 0) return;

    // Commit preview to final state
    setSuggestedChartAccounts(previewChartAccounts);
    setAccountChanges(previewAccountChanges);
    setSuggestedRevenueSources(previewRevenueSources);
    setMappingRules(previewRules);

    // Apply rules to all transactions from all files
    const allTransactions = getAllTransactions();
    const applied = applyMappingRules(allTransactions, previewRules);
    setTransactionMappings(applied.mappings);
    setRuleStats(applied.ruleStats);
    setMatchStats({ matched: applied.matchedCount, unmatched: applied.unmatchedCount });

    setError(null);
  }, [parsedFiles, previewChartAccounts, previewAccountChanges, previewRevenueSources, previewRules, getAllTransactions]);

  // ============================================
  // Step 3: Import
  // ============================================

  const handleImport = useCallback(async () => {
    if (parsedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 0. Apply category changes (rename, merge, update_description)
      let categoriesModified = 0;

      for (const change of accountChanges) {
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
      const newCategories = categoriesToChartAccounts(suggestedChartAccounts, freshChartAccounts);
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

      // 2. Collect all unique currencies and ensure they exist
      const currenciesToAdd = new Set<string>();
      for (const pf of parsedFiles) {
        currenciesToAdd.add(pf.parsed.currency);
      }

      let currentCurrencies = [...config.currencies];
      for (const currencyCode of currenciesToAdd) {
        const { currency: currencyObj, isNew } = matchOrCreateCurrency(currencyCode, currentCurrencies);
        if (isNew) {
          currentCurrencies = [...currentCurrencies, currencyObj];
        }
      }

      if (currentCurrencies.length !== config.currencies.length) {
        await updateConfig({ currencies: currentCurrencies });
      }

      // 3. Create revenue sources
      const existingSources = await db.getSources();
      const existingSourceNames = new Set(existingSources.map(s => s.name.toLowerCase()));
      const revenueSourceNameToId = new Map<string, number>();
      let revenueSourcesCreated = 0;

      for (const source of existingSources) {
        revenueSourceNameToId.set(source.name.toLowerCase(), source.id);
      }

      // Use first file's currency as default for revenue sources
      const defaultCurrency = parsedFiles[0].parsed.currency;

      for (const source of suggestedRevenueSources) {
        if (!existingSourceNames.has(source.name.toLowerCase())) {
          const id = await db.addSource({
            name: source.name,
            type: source.type,
            currency: defaultCurrency,
            isRecurring: false,
            recurringAmount: 0,
            expected: {},
            actual: {},
          });
          revenueSourceNameToId.set(source.name.toLowerCase(), id);
          revenueSourcesCreated++;
        }
      }

      // Build confirmed transfer mapping (fitId -> target account hash)
      const confirmedTransferMap = new Map<string, string>();
      for (const transfer of getConfirmedTransferList()) {
        confirmedTransferMap.set(
          `${transfer.sourceAccount.accountHash}:${transfer.sourceAccount.transaction.fitId}`,
          transfer.targetAccount.accountHash
        );
        confirmedTransferMap.set(
          `${transfer.targetAccount.accountHash}:${transfer.targetAccount.transaction.fitId}`,
          transfer.sourceAccount.accountHash
        );
      }

      // 4. Process each file and create bank accounts + transactions
      const mappingByFitId = new Map(transactionMappings.map(m => [m.fitId, m]));
      const importBatchId = `wizard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const importedAt = new Date().toISOString();

      let totalTransactionsImported = 0;
      let totalJournalEntriesCreated = 0;
      const allTransactionsToAdd: Array<{
        tx: Parameters<typeof db.addBankTransactions>[0][0];
        bankAccountId: number;
        bankChartAccountId: string;
        isCreditCard: boolean;
      }> = [];

      // Store bank account ID by hash for transfer linking
      const bankAccountIdByHash = new Map<string, number>();

      for (const parsedFile of parsedFiles) {
        const { parsed, accountHash } = parsedFile;

        // Create or find bank account
        let bankAccount = await db.getBankAccountByHash(accountHash);

        if (!bankAccount) {
          const accountId = await db.addBankAccount({
            name: `${parsed.account.accountType} ${maskAccountId(parsed.account.accountId)}`,
            bankId: parsed.account.bankId,
            accountId: maskAccountId(parsed.account.accountId),
            accountIdHash: accountHash,
            accountType: parsed.account.accountType,
            currency: parsed.currency,
            createdAt: new Date().toISOString(),
          });
          bankAccount = {
            id: accountId,
            name: `${parsed.account.accountType} ${maskAccountId(parsed.account.accountId)}`,
            bankId: parsed.account.bankId,
            accountId: maskAccountId(parsed.account.accountId),
            accountIdHash: accountHash,
            accountType: parsed.account.accountType,
            currency: parsed.currency,
            createdAt: new Date().toISOString(),
          };
        }

        bankAccountIdByHash.set(accountHash, bankAccount.id);

        // Create chart account for bank account
        let bankChartAccount = getChartAccountForBankAccount(bankAccount.id);
        if (!bankChartAccount) {
          bankChartAccount = await createChartAccountForBankAccount(bankAccount);
        }

        const isCreditCard = bankAccount.accountType === 'CREDITCARD' || bankAccount.accountType === 'CREDITLINE';

        for (const tx of parsed.transactions) {
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

          // Check if this is a confirmed transfer
          const transferKey = `${accountHash}:${tx.fitId}`;
          const isConfirmedTransfer = confirmedTransferMap.has(transferKey);

          let category: TransactionCategory = tx.amount >= 0 ? 'revenue' : 'expense';
          let chartAccountId: string | undefined;
          let isIgnored = false;
          let revenueSourceId: number | undefined;
          let transferAccountId: number | undefined;

          if (isConfirmedTransfer) {
            category = 'transfer';
            const targetHash = confirmedTransferMap.get(transferKey);
            if (targetHash) {
              transferAccountId = bankAccountIdByHash.get(targetHash);
            }
          } else if (mapping) {
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

          allTransactionsToAdd.push({
            tx: {
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
              transferAccountId,
              isIgnored,
              isReconciled: true,
              importedAt,
              importBatchId,
            },
            bankAccountId: bankAccount.id,
            bankChartAccountId: bankChartAccount.id,
            isCreditCard,
          });
        }
      }

      // 5. Bulk insert all transactions and create journal entries
      if (allTransactionsToAdd.length > 0) {
        const txsToInsert = allTransactionsToAdd.map(item => item.tx);
        const ids = await db.addBankTransactions(txsToInsert);
        totalTransactionsImported = ids.length;

        for (let i = 0; i < allTransactionsToAdd.length; i++) {
          const { tx, bankChartAccountId, isCreditCard } = allTransactionsToAdd[i];
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
              lines.push({ accountId: bankChartAccountId, amount, type: 'CREDIT' });
            } else {
              lines.push({ accountId: bankChartAccountId, amount, type: 'DEBIT' });
              lines.push({ accountId: tx.chartAccountId, amount, type: 'CREDIT' });
            }
          } else {
            if (isCredit) {
              lines.push({ accountId: bankChartAccountId, amount, type: 'DEBIT' });
              lines.push({ accountId: tx.chartAccountId, amount, type: 'CREDIT' });
            } else {
              lines.push({ accountId: tx.chartAccountId, amount, type: 'DEBIT' });
              lines.push({ accountId: bankChartAccountId, amount, type: 'CREDIT' });
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
            totalJournalEntriesCreated++;
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

        let ruleRevenueSourceId: number | undefined;
        if (rule.categoryType === 'REVENUE' && rule.revenueSource) {
          ruleRevenueSourceId = revenueSourceNameToId.get(rule.revenueSource.toLowerCase());
        }

        await db.addMappingRule({
          pattern: rule.pattern,
          matchField: rule.matchField,
          matchType: rule.matchType,
          category: rule.categoryType.toLowerCase() as TransactionCategory,
          chartAccountId: matchedAccount.id,
          revenueSourceId: ruleRevenueSourceId,
          isActive: true,
          priority: 100 - i,
          createdAt: new Date().toISOString(),
        });
        rulesCreated++;
      }

      // 7. Sync bank transactions to revenue source actuals
      // Group imported transactions by source and month, update actual values
      let revenueSourcesSynced = 0;
      const transactionsBySourceMonth: Record<number, Record<Month, number>> = {};

      for (const { tx } of allTransactionsToAdd) {
        if (tx.category === 'revenue' && tx.revenueSourceId) {
          if (!transactionsBySourceMonth[tx.revenueSourceId]) {
            transactionsBySourceMonth[tx.revenueSourceId] = {} as Record<Month, number>;
          }
          transactionsBySourceMonth[tx.revenueSourceId][tx.month] =
            (transactionsBySourceMonth[tx.revenueSourceId][tx.month] || 0) + tx.amount;
        }
      }

      // Update each source's actual values
      for (const [sourceId, monthlyTotals] of Object.entries(transactionsBySourceMonth)) {
        revenueSourcesSynced++;
        for (const month of MONTHS) {
          const amount = monthlyTotals[month];
          if (amount !== undefined && amount !== 0) {
            await updateSourceRevenue(Number(sourceId), month, amount, 'actual');
          }
        }
      }

      setImportProgress({
        categoriesCreated,
        categoriesModified,
        revenueSourcesCreated,
        transactionsImported: totalTransactionsImported,
        journalEntriesCreated: totalJournalEntriesCreated,
        rulesCreated,
        revenueSourcesSynced,
      });

      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  }, [parsedFiles, suggestedChartAccounts, accountChanges, suggestedRevenueSources, transactionMappings, mappingRules, chartAccounts, config, addChartAccount, addJournalEntry, createChartAccountForBankAccount, getChartAccountForBankAccount, updateConfig, updateSourceRevenue, getConfirmedTransferList]);

  // ============================================
  // Render
  // ============================================

  const renderUploadStep = () => {
    // Calculate totals across all files
    const totalTransactions = parsedFiles.reduce((sum, pf) => sum + pf.parsed.transactions.length, 0);
    const allTransactions = getAllTransactions();
    const totalPatterns = allTransactions.length > 0 ? analyzeTransactionPatterns(allTransactions) : null;

    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Upload Your Bank Statements</h2>
          <p className="text-muted-foreground mt-1">
            Upload one or more OFX files to import. Multiple files enable transfer detection between accounts.
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
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
          <FileText className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-foreground font-medium mb-2">
            {parsedFiles.length > 0 ? 'Drop more OFX files here' : 'Drop your OFX files here'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">or click to browse (select multiple)</p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Plus className="size-4" />
            {parsedFiles.length > 0 ? 'Add More Files' : 'Select Files'}
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-5 text-destructive mt-0.5 flex-shrink-0" />
              <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
            </div>
          </div>
        )}

        {/* Uploaded files list */}
        {parsedFiles.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {parsedFiles.map((pf, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="size-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate text-sm">{pf.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pf.parsed.account.accountType} ****{pf.parsed.account.accountId.slice(-4)} • {pf.parsed.currency} • {pf.parsed.transactions.length} transactions
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

            {/* Summary across all files */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <Building2 className="size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{parsedFiles.length} account{parsedFiles.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">
                    {[...new Set(parsedFiles.map(pf => pf.parsed.currency))].join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <Calendar className="size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{totalTransactions} transactions</p>
                  <p className="text-xs text-muted-foreground">Across all files</p>
                </div>
              </div>
            </div>

            {/* Transaction summary */}
            {totalPatterns && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Income:</span>{' '}
                    <span className="variance-positive font-medium">
                      {totalPatterns.creditCount} ({totalPatterns.totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expenses:</span>{' '}
                    <span className="variance-negative font-medium">
                      {totalPatterns.debitCount} ({totalPatterns.totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>
                </div>
              </div>
            )}

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
  };

  const renderTransfersStep = () => {
    const summary = getTransferSummary(detectedTransfers);
    const pendingCount = detectedTransfers.length - confirmedTransfers.size - rejectedTransfers.size;

    // Skip to next step if only one file (no transfers possible)
    if (parsedFiles.length <= 1) {
      return (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">Transfer Detection</h2>
            <p className="text-muted-foreground mt-1">
              Transfer detection requires multiple account files.
            </p>
          </div>

          <div className="p-6 bg-muted/50 rounded-lg text-center">
            <ArrowLeftRight className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium">Single account imported</p>
            <p className="text-sm text-muted-foreground mt-1">
              To detect transfers between accounts, upload OFX files from multiple bank accounts.
            </p>
          </div>
        </div>
      );
    }

    if (detectedTransfers.length === 0) {
      return (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">Transfer Detection</h2>
            <p className="text-muted-foreground mt-1">
              No transfers detected between your accounts.
            </p>
          </div>

          <div className="p-6 bg-muted/50 rounded-lg text-center">
            <CheckCircle2 className="size-12 mx-auto variance-positive mb-4" />
            <p className="text-foreground font-medium">No transfers found</p>
            <p className="text-sm text-muted-foreground mt-1">
              We couldn't detect any matching transactions between your {parsedFiles.length} accounts.
              This could mean there were no transfers during this period.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Review Detected Transfers</h2>
          <p className="text-muted-foreground mt-1">
            We found {detectedTransfers.length} potential transfer{detectedTransfers.length !== 1 ? 's' : ''} between your accounts.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium text-foreground">{summary.highConfidence}</div>
            <div className="text-xs text-muted-foreground">High</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium text-foreground">{summary.mediumConfidence}</div>
            <div className="text-xs text-muted-foreground">Medium</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium text-foreground">{summary.lowConfidence}</div>
            <div className="text-xs text-muted-foreground">Low</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium text-foreground">{summary.crossCurrency}</div>
            <div className="text-xs text-muted-foreground">Cross-currency</div>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {confirmedTransfers.size} confirmed, {rejectedTransfers.size} rejected, {pendingCount} pending
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={rejectAllTransfers}>
              Reject All
            </Button>
            <Button variant="outline" size="sm" onClick={confirmAllTransfers}>
              Confirm All
            </Button>
          </div>
        </div>

        {/* Transfer list */}
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {detectedTransfers.map((transfer) => {
            const isConfirmed = confirmedTransfers.has(transfer.id);
            const isRejected = rejectedTransfers.has(transfer.id);

            return (
              <div
                key={transfer.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  isConfirmed ? "border-primary/50 bg-primary/5" :
                  isRejected ? "border-destructive/50 bg-destructive/5 opacity-60" :
                  "border-border bg-card"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={transfer.confidence === 'high' ? 'default' : transfer.confidence === 'medium' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {transfer.confidence}
                      </Badge>
                      {transfer.isCrossCurrency && (
                        <Badge variant="outline" className="text-xs">Cross-currency</Badge>
                      )}
                      {transfer.daysDifference > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {transfer.daysDifference} day{transfer.daysDifference !== 1 ? 's' : ''} apart
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">From ({transfer.sourceAccount.currency})</p>
                        <p className="font-medium text-foreground truncate">
                          {transfer.sourceAccount.transaction.name}
                        </p>
                        <p className="text-destructive font-medium">
                          {transfer.sourceAccount.transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.sourceAccount.accountId} • {new Date(transfer.sourceAccount.transaction.datePosted).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">To ({transfer.targetAccount.currency})</p>
                        <p className="font-medium text-foreground truncate">
                          {transfer.targetAccount.transaction.name}
                        </p>
                        <p className="variance-positive font-medium">
                          +{transfer.targetAccount.transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.targetAccount.accountId} • {new Date(transfer.targetAccount.transaction.datePosted).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => confirmTransfer(transfer.id)}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        isConfirmed ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      )}
                      title="Confirm transfer"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={() => rejectTransfer(transfer.id)}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        isRejected ? "bg-destructive text-destructive-foreground" : "hover:bg-muted"
                      )}
                      title="Reject transfer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {confirmedTransfers.size > 0 && (
          <div className="p-3 bg-primary/10 rounded-lg text-sm">
            <p className="text-foreground">
              {confirmedTransfers.size} transfer{confirmedTransfers.size !== 1 ? 's' : ''} will be marked automatically during import.
            </p>
          </div>
        )}
      </div>
    );
  };

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
            {previewAccountChanges.length > 0 && (
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection('changes')}
                  className="w-full p-2 flex items-center justify-between hover:bg-muted/50"
                >
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    {collapsedSections.changes ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    Category Updates ({previewAccountChanges.length})
                  </span>
                </button>
                {!collapsedSections.changes && (
                  <div className="p-2 flex flex-col gap-1">
                    {previewAccountChanges.map((change, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{change.action}</Badge>
                          <span className="text-muted-foreground">{change.from_name}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-foreground">{change.to_name}</span>
                        </div>
                        <button onClick={() => removeAccountChange(i)} className="p-1 hover:bg-destructive/10 rounded">
                          <X className="size-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Categories */}
            {previewChartAccounts.length > 0 && (
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection('categories')}
                  className="w-full p-2 flex items-center justify-between hover:bg-muted/50"
                >
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    {collapsedSections.categories ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    New Categories ({previewChartAccounts.length})
                  </span>
                </button>
                {!collapsedSections.categories && (
                  <div className="p-2 flex flex-wrap gap-1">
                    {previewChartAccounts.map((cat, i) => (
                      <Badge key={i} variant={cat.type === 'REVENUE' ? 'default' : 'secondary'} className="text-xs pr-1">
                        {cat.name}
                        <button onClick={() => removeChartAccount(i)} className="ml-1 p-0.5 hover:bg-white/20 rounded">
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
                <div className="font-medium text-foreground">{suggestedChartAccounts.length}</div>
                <div className="text-xs text-muted-foreground">new categories</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-foreground">{accountChanges.length}</div>
                <div className="text-xs text-muted-foreground">category updates</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-foreground">{mappingRules.length}</div>
                <div className="text-xs text-muted-foreground">rules</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-foreground">{matchStats.matched}/{getAllTransactions().length}</div>
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
          <p className="text-2xl font-bold text-foreground">{suggestedChartAccounts.length}</p>
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
      case 'transfers': return renderTransfersStep();
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

      {/* Data Reset Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-warning" />
              Existing Data Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              You have existing data in the system. Would you like to:
              <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
                <li><strong>Reset</strong> - Clear all data and start fresh</li>
                <li><strong>Continue</strong> - Keep existing data and add new imports</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Continue</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleResetData();
              }}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Reset All Data
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
