import type { ParsedOFXFile, ParsedOFXTransaction, Currency } from '@/types';

/**
 * Represents a detected transfer between two accounts
 */
export interface DetectedTransfer {
  id: string;
  sourceAccount: {
    accountId: string;
    accountHash: string;
    currency: string;
    transaction: ParsedOFXTransaction;
    fileIndex: number;
  };
  targetAccount: {
    accountId: string;
    accountHash: string;
    currency: string;
    transaction: ParsedOFXTransaction;
    fileIndex: number;
  };
  confidence: 'high' | 'medium' | 'low';
  isCrossCurrency: boolean;
  exchangeRate?: number;
  daysDifference: number;
}

/**
 * Configuration for transfer detection
 */
export interface TransferDetectionConfig {
  /** Maximum days between matching transactions */
  maxDaysDifference: number;
  /** Tolerance for cross-currency matching (as percentage, e.g., 0.05 = 5%) */
  crossCurrencyTolerance: number;
  /** Minimum transaction amount to consider */
  minAmount: number;
}

const DEFAULT_CONFIG: TransferDetectionConfig = {
  maxDaysDifference: 3,
  crossCurrencyTolerance: 0.10, // 10% tolerance for exchange rate variations
  minAmount: 1,
};

/**
 * Parse ISO date string to Date object
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Calculate the difference in days between two dates
 */
function daysDifference(date1: string, date2: string): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Create a hash for account identification
 * Simplified version - should match the ofx-parser's hashAccountId
 */
function hashAccountId(accountId: string): string {
  // Use a simple hash for quick matching
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) {
    const char = accountId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Mask account ID for display (show last 4 digits)
 */
function maskAccountId(accountId: string): string {
  if (accountId.length <= 4) return accountId;
  return '****' + accountId.slice(-4);
}

/**
 * Detect transfers between accounts in multiple OFX files
 *
 * A transfer is detected when:
 * 1. One transaction is a credit and another is a debit
 * 2. The amounts match (or are close for cross-currency)
 * 3. The dates are within maxDaysDifference
 * 4. The transactions are from different accounts
 */
export function detectTransfers(
  parsedFiles: ParsedOFXFile[],
  currencies: Currency[],
  config: Partial<TransferDetectionConfig> = {}
): DetectedTransfer[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const transfers: DetectedTransfer[] = [];
  const usedTransactions = new Set<string>();

  // Build a list of all transactions with their file context
  interface TransactionContext {
    transaction: ParsedOFXTransaction;
    fileIndex: number;
    accountId: string;
    accountHash: string;
    currency: string;
  }

  const allTransactions: TransactionContext[] = [];

  for (let fileIndex = 0; fileIndex < parsedFiles.length; fileIndex++) {
    const file = parsedFiles[fileIndex];
    const accountHash = hashAccountId(file.account.accountId);

    for (const tx of file.transactions) {
      // Only consider transactions with significant amounts
      if (Math.abs(tx.amount) < finalConfig.minAmount) continue;

      allTransactions.push({
        transaction: tx,
        fileIndex,
        accountId: file.account.accountId,
        accountHash,
        currency: file.currency,
      });
    }
  }

  // Find currency exchange rates
  const currencyRates: Record<string, number> = {};
  for (const currency of currencies) {
    currencyRates[currency.code] = currency.rate;
  }

  // Compare all transaction pairs from different accounts
  for (let i = 0; i < allTransactions.length; i++) {
    const txA = allTransactions[i];

    // Skip if already used in a transfer
    const txAKey = `${txA.accountHash}:${txA.transaction.fitId}`;
    if (usedTransactions.has(txAKey)) continue;

    // Only look at debits (money going out) as source
    if (txA.transaction.amount >= 0) continue;

    for (let j = 0; j < allTransactions.length; j++) {
      if (i === j) continue;

      const txB = allTransactions[j];

      // Skip if same account
      if (txA.accountHash === txB.accountHash) continue;

      // Skip if already used
      const txBKey = `${txB.accountHash}:${txB.transaction.fitId}`;
      if (usedTransactions.has(txBKey)) continue;

      // Only look at credits (money coming in) as target
      if (txB.transaction.amount <= 0) continue;

      // Check date difference
      const dateDiff = daysDifference(txA.transaction.datePosted, txB.transaction.datePosted);
      if (dateDiff > finalConfig.maxDaysDifference) continue;

      // Check if amounts match
      const sourceAmount = Math.abs(txA.transaction.amount);
      const targetAmount = txB.transaction.amount;

      const isSameCurrency = txA.currency === txB.currency;
      let isMatch = false;
      let exchangeRate: number | undefined;
      let confidence: 'high' | 'medium' | 'low' = 'low';

      if (isSameCurrency) {
        // Same currency - amounts should match exactly (within small tolerance for rounding)
        const diff = Math.abs(sourceAmount - targetAmount);
        const tolerance = Math.max(sourceAmount, targetAmount) * 0.001; // 0.1% tolerance

        if (diff <= tolerance) {
          isMatch = true;
          confidence = dateDiff === 0 ? 'high' : dateDiff <= 1 ? 'medium' : 'low';
        }
      } else {
        // Cross-currency - calculate expected exchange rate
        const rateA = currencyRates[txA.currency] || 1;
        const rateB = currencyRates[txB.currency] || 1;

        // Convert both to base currency
        const sourceInBase = sourceAmount / rateA;
        const targetInBase = targetAmount / rateB;

        // Check if they match within tolerance
        const diff = Math.abs(sourceInBase - targetInBase);
        const avgInBase = (sourceInBase + targetInBase) / 2;
        const diffPercent = diff / avgInBase;

        if (diffPercent <= finalConfig.crossCurrencyTolerance) {
          isMatch = true;
          exchangeRate = targetAmount / sourceAmount;

          // Lower confidence for cross-currency due to rate uncertainty
          if (diffPercent <= 0.02) {
            confidence = dateDiff === 0 ? 'medium' : 'low';
          } else {
            confidence = 'low';
          }
        }
      }

      if (isMatch) {
        // Check for additional matching signals to boost confidence
        const nameMatch = hasNameSimilarity(txA.transaction.name, txB.transaction.name);
        if (nameMatch) {
          confidence = confidence === 'low' ? 'medium' : 'high';
        }

        transfers.push({
          id: `transfer-${i}-${j}`,
          sourceAccount: {
            accountId: maskAccountId(txA.accountId),
            accountHash: txA.accountHash,
            currency: txA.currency,
            transaction: txA.transaction,
            fileIndex: txA.fileIndex,
          },
          targetAccount: {
            accountId: maskAccountId(txB.accountId),
            accountHash: txB.accountHash,
            currency: txB.currency,
            transaction: txB.transaction,
            fileIndex: txB.fileIndex,
          },
          confidence,
          isCrossCurrency: !isSameCurrency,
          exchangeRate,
          daysDifference: dateDiff,
        });

        // Mark both transactions as used
        usedTransactions.add(txAKey);
        usedTransactions.add(txBKey);

        // Move to next source transaction
        break;
      }
    }
  }

  // Sort by confidence (high first) then by date
  transfers.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    if (confidenceOrder[a.confidence] !== confidenceOrder[b.confidence]) {
      return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    }
    return new Date(a.sourceAccount.transaction.datePosted).getTime() -
           new Date(b.sourceAccount.transaction.datePosted).getTime();
  });

  return transfers;
}

/**
 * Check if two transaction names have similarity (e.g., both reference a transfer)
 */
function hasNameSimilarity(nameA: string, nameB: string): boolean {
  const lowerA = nameA.toLowerCase();
  const lowerB = nameB.toLowerCase();

  // Check for common transfer keywords
  const transferKeywords = [
    'transfer', 'xfer', 'trf', 'trn',
    'internal', 'inter-account',
    'from account', 'to account',
    'bank transfer', 'wire',
  ];

  const hasTransferKeywordA = transferKeywords.some(kw => lowerA.includes(kw));
  const hasTransferKeywordB = transferKeywords.some(kw => lowerB.includes(kw));

  if (hasTransferKeywordA && hasTransferKeywordB) {
    return true;
  }

  // Check for matching account numbers in the names
  const accountPattern = /\d{4,}/g;
  const accountsA = lowerA.match(accountPattern) || [];
  const accountsB = lowerB.match(accountPattern) || [];

  for (const accA of accountsA) {
    for (const accB of accountsB) {
      // Check if account numbers reference each other
      if (accA.endsWith(accB.slice(-4)) || accB.endsWith(accA.slice(-4))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get a summary of detected transfers for display
 */
export function getTransferSummary(transfers: DetectedTransfer[]): {
  total: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  crossCurrency: number;
  sameCurrency: number;
} {
  return {
    total: transfers.length,
    highConfidence: transfers.filter(t => t.confidence === 'high').length,
    mediumConfidence: transfers.filter(t => t.confidence === 'medium').length,
    lowConfidence: transfers.filter(t => t.confidence === 'low').length,
    crossCurrency: transfers.filter(t => t.isCrossCurrency).length,
    sameCurrency: transfers.filter(t => !t.isCrossCurrency).length,
  };
}

/**
 * Convert detected transfers to mapping rules format
 * Returns rules for both sides of each transfer
 */
export function transfersToMappingRules(
  transfers: DetectedTransfer[],
  accountIdMapping: Map<string, number> // accountHash -> bankAccountId
): { sourceRules: Map<string, number>; targetRules: Map<string, number> } {
  const sourceRules = new Map<string, number>(); // fitId -> targetAccountId
  const targetRules = new Map<string, number>(); // fitId -> sourceAccountId

  for (const transfer of transfers) {
    const sourceAccountId = accountIdMapping.get(transfer.sourceAccount.accountHash);
    const targetAccountId = accountIdMapping.get(transfer.targetAccount.accountHash);

    if (sourceAccountId !== undefined && targetAccountId !== undefined) {
      sourceRules.set(
        `${transfer.sourceAccount.accountHash}:${transfer.sourceAccount.transaction.fitId}`,
        targetAccountId
      );
      targetRules.set(
        `${transfer.targetAccount.accountHash}:${transfer.targetAccount.transaction.fitId}`,
        sourceAccountId
      );
    }
  }

  return { sourceRules, targetRules };
}

/**
 * Generates AI prompt additions for transfer detection
 */
export function generateTransferAnalysisPrompt(
  transfers: DetectedTransfer[]
): string {
  if (transfers.length === 0) {
    return '';
  }

  let prompt = `\n\n## DETECTED INTER-ACCOUNT TRANSFERS\n\n`;
  prompt += `The following ${transfers.length} transaction(s) appear to be transfers between accounts. `;
  prompt += `Please mark them as TRANSFER type in your mapping rules:\n\n`;

  for (const transfer of transfers) {
    prompt += `- From ${transfer.sourceAccount.accountId} (${transfer.sourceAccount.currency}): `;
    prompt += `"${transfer.sourceAccount.transaction.name}" ${transfer.sourceAccount.transaction.amount} `;
    prompt += `→ To ${transfer.targetAccount.accountId} (${transfer.targetAccount.currency}): `;
    prompt += `"${transfer.targetAccount.transaction.name}" +${transfer.targetAccount.transaction.amount}`;
    if (transfer.isCrossCurrency && transfer.exchangeRate) {
      prompt += ` (rate: ${transfer.exchangeRate.toFixed(4)})`;
    }
    prompt += ` [${transfer.confidence} confidence]\n`;
  }

  return prompt;
}
