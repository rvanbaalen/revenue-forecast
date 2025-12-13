/**
 * OFX Upload Wizard Utilities
 *
 * Provides LLM prompt generation and JSON parsing for guided
 * categorization of bank transactions.
 */

import type { ParsedOFXTransaction, AccountType, ChartAccount } from '../types';

// ============================================
// Types
// ============================================

export type WizardStep = 'upload' | 'categories' | 'mapping' | 'review' | 'complete';

export interface WizardState {
  step: WizardStep;
  file: File | null;
  transactions: ParsedOFXTransaction[];
  suggestedCategories: SuggestedCategory[];
  transactionMappings: TransactionMapping[];
  accountInfo: {
    accountType: string;
    currency: string;
    dateRange: { start: string; end: string };
  } | null;
}

export interface SuggestedCategory {
  name: string;
  type: 'REVENUE' | 'EXPENSE';
  description?: string;
  keywords?: string[];
}

export interface TransactionMapping {
  fitId: string;
  transactionName: string;
  transactionMemo?: string;
  amount: number;
  date: string;
  suggestedCategory: string;
  categoryType: 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE';
}

export interface CategoryImportData {
  categories: SuggestedCategory[];
}

export interface MappingImportData {
  mappings: {
    transaction_identifier: string; // fitId or name+date combo
    category_name: string;
    category_type: 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE';
  }[];
}

// ============================================
// Transaction Analysis Helpers
// ============================================

/**
 * Extract unique transaction names and memos for LLM analysis
 */
export function extractUniqueTransactionInfo(transactions: ParsedOFXTransaction[]): {
  uniqueNames: string[];
  uniqueMemos: string[];
  nameMemoPairs: { name: string; memo?: string; count: number; totalAmount: number }[];
} {
  const nameMap = new Map<string, { count: number; totalAmount: number; memos: Set<string> }>();

  for (const tx of transactions) {
    const key = tx.name.trim();
    const existing = nameMap.get(key) || { count: 0, totalAmount: 0, memos: new Set<string>() };
    existing.count++;
    existing.totalAmount += tx.amount;
    if (tx.memo) {
      existing.memos.add(tx.memo.trim());
    }
    nameMap.set(key, existing);
  }

  const uniqueNames = Array.from(nameMap.keys()).sort();
  const uniqueMemos = Array.from(
    new Set(transactions.filter(t => t.memo).map(t => t.memo!.trim()))
  ).sort();

  const nameMemoPairs = Array.from(nameMap.entries())
    .map(([name, data]) => ({
      name,
      memo: data.memos.size > 0 ? Array.from(data.memos)[0] : undefined,
      count: data.count,
      totalAmount: data.totalAmount,
    }))
    .sort((a, b) => b.count - a.count);

  return { uniqueNames, uniqueMemos, nameMemoPairs };
}

/**
 * Analyze transaction patterns to provide context for LLM
 */
export function analyzeTransactionPatterns(transactions: ParsedOFXTransaction[]): {
  totalCredits: number;
  totalDebits: number;
  creditCount: number;
  debitCount: number;
  avgCreditAmount: number;
  avgDebitAmount: number;
  dateRange: { start: string; end: string };
} {
  const credits = transactions.filter(t => t.amount > 0);
  const debits = transactions.filter(t => t.amount < 0);

  const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = debits.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const dates = transactions.map(t => t.datePosted).sort();

  return {
    totalCredits,
    totalDebits,
    creditCount: credits.length,
    debitCount: debits.length,
    avgCreditAmount: credits.length > 0 ? totalCredits / credits.length : 0,
    avgDebitAmount: debits.length > 0 ? totalDebits / debits.length : 0,
    dateRange: {
      start: dates[0] || '',
      end: dates[dates.length - 1] || '',
    },
  };
}

// ============================================
// LLM Prompt Generation - Step 2 (Categories)
// ============================================

/**
 * Generate a prompt for an LLM to suggest categories based on transaction data
 */
export function generateCategoryPrompt(transactions: ParsedOFXTransaction[]): string {
  const { nameMemoPairs } = extractUniqueTransactionInfo(transactions);
  const patterns = analyzeTransactionPatterns(transactions);

  // Build transaction list for the prompt
  const transactionList = nameMemoPairs
    .slice(0, 100) // Limit to top 100 unique names
    .map(item => {
      const direction = item.totalAmount >= 0 ? 'INCOME' : 'EXPENSE';
      const memo = item.memo ? ` (memo: "${item.memo}")` : '';
      return `- "${item.name}"${memo} [${direction}, ${item.count}x, total: ${item.totalAmount.toFixed(2)}]`;
    })
    .join('\n');

  return `# Task: Analyze Bank Transactions and Suggest Categories

You are helping a freelancer/small business owner categorize their bank transactions. Based on the transaction names and memos below, suggest appropriate accounting categories.

## Transaction Summary
- Date range: ${patterns.dateRange.start} to ${patterns.dateRange.end}
- Total income transactions: ${patterns.creditCount} (total: ${patterns.totalCredits.toFixed(2)})
- Total expense transactions: ${patterns.debitCount} (total: ${patterns.totalDebits.toFixed(2)})

## Unique Transaction Names (with frequency and totals)
${transactionList}

## Instructions

1. Analyze the transaction names and memos above
2. Identify patterns that suggest different income sources or expense categories
3. Suggest 5-15 categories that would best organize these transactions
4. For each category, provide:
   - A clear, concise name
   - Whether it's REVENUE or EXPENSE
   - A brief description
   - Keywords that would match transactions to this category

## Output Format

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):

{
  "categories": [
    {
      "name": "Service Revenue",
      "type": "REVENUE",
      "description": "Income from professional services",
      "keywords": ["consulting", "services", "payment from"]
    },
    {
      "name": "Software & Subscriptions",
      "type": "EXPENSE",
      "description": "Software tools and subscription services",
      "keywords": ["adobe", "microsoft", "subscription", "saas"]
    }
  ]
}

## Guidelines

- Keep category names short but descriptive (2-4 words)
- Use standard accounting terminology where appropriate
- Group similar transactions logically
- Consider both business and personal categories if mixed
- Common expense categories: Rent, Utilities, Software, Professional Services, Marketing, Travel, Meals, Bank Fees, Insurance, Taxes
- Common revenue categories: Service Revenue, Product Sales, Consulting, Royalties, Interest Income

Now analyze the transactions and provide your JSON response:`;
}

// ============================================
// LLM Prompt Generation - Step 3 (Mapping)
// ============================================

/**
 * Generate a prompt for an LLM to map transactions to categories
 */
export function generateMappingPrompt(
  transactions: ParsedOFXTransaction[],
  categories: SuggestedCategory[]
): string {
  // Build category list
  const categoryList = categories
    .map(cat => `- "${cat.name}" (${cat.type})${cat.description ? ': ' + cat.description : ''}`)
    .join('\n');

  // Build transaction list with identifiers
  const transactionList = transactions
    .map((tx, index) => {
      const direction = tx.amount >= 0 ? 'CREDIT' : 'DEBIT';
      const memo = tx.memo ? ` | Memo: "${tx.memo}"` : '';
      return `${index + 1}. [${tx.fitId}] "${tx.name}"${memo} | ${direction} ${Math.abs(tx.amount).toFixed(2)} | ${tx.datePosted}`;
    })
    .join('\n');

  return `# Task: Categorize Bank Transactions

You are helping categorize bank transactions into predefined categories. Match each transaction to the most appropriate category.

## Available Categories
${categoryList}

Additionally, you can use these special category types:
- TRANSFER: For transfers between accounts (e.g., "Transfer to Savings", "Credit Card Payment")
- IGNORE: For transactions that should be excluded from reports (e.g., duplicate entries, corrections)

## Transactions to Categorize
${transactionList}

## Instructions

1. For each transaction, determine the best matching category
2. Use the transaction name, memo, and amount direction (CREDIT/DEBIT) to make your decision
3. CREDIT transactions are typically revenue, DEBIT transactions are typically expenses
4. Output the mapping in the exact JSON format below

## Output Format

Respond with ONLY valid JSON (no markdown, no explanation):

{
  "mappings": [
    {
      "transaction_identifier": "fitId-here",
      "category_name": "Category Name",
      "category_type": "REVENUE"
    },
    {
      "transaction_identifier": "fitId-here",
      "category_name": "Category Name",
      "category_type": "EXPENSE"
    },
    {
      "transaction_identifier": "fitId-here",
      "category_name": "Transfer",
      "category_type": "TRANSFER"
    }
  ]
}

## Rules

- Use the exact category names from the Available Categories list
- category_type must be one of: REVENUE, EXPENSE, TRANSFER, IGNORE
- Every transaction must have a mapping
- transaction_identifier should be the fitId shown in brackets [...]
- When uncertain, use your best judgment based on the transaction name

Now categorize all transactions and provide your JSON response:`;
}

// ============================================
// JSON Parsing and Validation
// ============================================

/**
 * Parse and validate category JSON from LLM response
 */
export function parseCategoryResponse(jsonString: string): {
  success: boolean;
  categories: SuggestedCategory[];
  error?: string;
} {
  try {
    // Try to extract JSON from potential markdown code blocks
    let cleanJson = jsonString.trim();

    // Remove markdown code blocks if present
    const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1].trim();
    }

    // Try to find JSON object if there's surrounding text
    const objectMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      cleanJson = objectMatch[0];
    }

    const data = JSON.parse(cleanJson) as CategoryImportData;

    if (!data.categories || !Array.isArray(data.categories)) {
      return {
        success: false,
        categories: [],
        error: 'Invalid format: expected "categories" array',
      };
    }

    // Validate and normalize each category
    const categories: SuggestedCategory[] = [];
    const errors: string[] = [];

    for (const cat of data.categories) {
      if (!cat.name || typeof cat.name !== 'string') {
        errors.push('Category missing name');
        continue;
      }

      const type = (cat.type || '').toUpperCase();
      if (type !== 'REVENUE' && type !== 'EXPENSE') {
        errors.push(`Invalid type for "${cat.name}": ${cat.type}`);
        continue;
      }

      categories.push({
        name: cat.name.trim(),
        type: type as 'REVENUE' | 'EXPENSE',
        description: cat.description?.trim(),
        keywords: Array.isArray(cat.keywords)
          ? cat.keywords.filter(k => typeof k === 'string').map(k => k.toLowerCase().trim())
          : undefined,
      });
    }

    if (categories.length === 0) {
      return {
        success: false,
        categories: [],
        error: errors.length > 0 ? errors.join('; ') : 'No valid categories found',
      };
    }

    return { success: true, categories };
  } catch (err) {
    return {
      success: false,
      categories: [],
      error: `JSON parse error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse and validate mapping JSON from LLM response
 */
export function parseMappingResponse(
  jsonString: string,
  transactions: ParsedOFXTransaction[],
  categories: SuggestedCategory[]
): {
  success: boolean;
  mappings: TransactionMapping[];
  error?: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  try {
    // Try to extract JSON from potential markdown code blocks
    let cleanJson = jsonString.trim();

    const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1].trim();
    }

    const objectMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      cleanJson = objectMatch[0];
    }

    const data = JSON.parse(cleanJson) as MappingImportData;

    if (!data.mappings || !Array.isArray(data.mappings)) {
      return {
        success: false,
        mappings: [],
        error: 'Invalid format: expected "mappings" array',
        warnings: [],
      };
    }

    // Create lookup maps
    const txByFitId = new Map(transactions.map(tx => [tx.fitId, tx]));
    const categoryNames = new Set(categories.map(c => c.name.toLowerCase()));

    const mappings: TransactionMapping[] = [];
    const mappedFitIds = new Set<string>();

    for (const mapping of data.mappings) {
      if (!mapping.transaction_identifier) {
        warnings.push('Mapping missing transaction_identifier');
        continue;
      }

      const tx = txByFitId.get(mapping.transaction_identifier);
      if (!tx) {
        warnings.push(`Transaction not found: ${mapping.transaction_identifier}`);
        continue;
      }

      const categoryType = (mapping.category_type || '').toUpperCase();
      if (!['REVENUE', 'EXPENSE', 'TRANSFER', 'IGNORE'].includes(categoryType)) {
        warnings.push(`Invalid category_type for ${mapping.transaction_identifier}: ${mapping.category_type}`);
        continue;
      }

      // For TRANSFER and IGNORE, we don't need a valid category name
      let categoryName = mapping.category_name?.trim() || '';
      if (categoryType === 'TRANSFER') {
        categoryName = 'Transfer';
      } else if (categoryType === 'IGNORE') {
        categoryName = 'Ignored';
      } else {
        // Validate category exists
        if (!categoryNames.has(categoryName.toLowerCase())) {
          warnings.push(`Unknown category "${categoryName}" for ${tx.name}, using as-is`);
        }
      }

      mappedFitIds.add(tx.fitId);
      mappings.push({
        fitId: tx.fitId,
        transactionName: tx.name,
        transactionMemo: tx.memo,
        amount: tx.amount,
        date: tx.datePosted,
        suggestedCategory: categoryName,
        categoryType: categoryType as 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE',
      });
    }

    // Check for unmapped transactions
    const unmapped = transactions.filter(tx => !mappedFitIds.has(tx.fitId));
    if (unmapped.length > 0) {
      warnings.push(`${unmapped.length} transaction(s) not mapped by LLM response`);

      // Auto-map unmapped transactions based on amount direction
      for (const tx of unmapped) {
        mappings.push({
          fitId: tx.fitId,
          transactionName: tx.name,
          transactionMemo: tx.memo,
          amount: tx.amount,
          date: tx.datePosted,
          suggestedCategory: tx.amount >= 0 ? 'Uncategorized Income' : 'Uncategorized Expense',
          categoryType: tx.amount >= 0 ? 'REVENUE' : 'EXPENSE',
        });
      }
    }

    return { success: true, mappings, warnings };
  } catch (err) {
    return {
      success: false,
      mappings: [],
      error: `JSON parse error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      warnings: [],
    };
  }
}

// ============================================
// Category Creation Helpers
// ============================================

/**
 * Convert suggested categories to ChartAccount format for import
 */
export function categoriesToChartAccounts(
  categories: SuggestedCategory[],
  existingAccounts: ChartAccount[]
): Omit<ChartAccount, 'id' | 'createdAt' | 'updatedAt'>[] {
  const result: Omit<ChartAccount, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  // Find highest existing codes for each type
  const revenueCodes = existingAccounts
    .filter(a => a.code.startsWith('4'))
    .map(a => parseInt(a.code))
    .filter(n => !isNaN(n));
  const expenseCodes = existingAccounts
    .filter(a => a.code.startsWith('5'))
    .map(a => parseInt(a.code))
    .filter(n => !isNaN(n));

  let nextRevenueCode = Math.max(4100, ...revenueCodes) + 10;
  let nextExpenseCode = Math.max(5100, ...expenseCodes) + 10;

  for (const cat of categories) {
    // Skip if category already exists
    const exists = existingAccounts.some(
      a => a.name.toLowerCase() === cat.name.toLowerCase() && a.type === cat.type
    );
    if (exists) continue;

    const type: AccountType = cat.type;
    const parentId = type === 'REVENUE' ? '4000' : '5000';
    const code = type === 'REVENUE'
      ? String(nextRevenueCode++).padStart(4, '0')
      : String(nextExpenseCode++).padStart(4, '0');

    result.push({
      code,
      name: cat.name,
      type,
      parentId,
      isSystem: false,
      isActive: true,
      description: cat.description,
    });
  }

  return result;
}

/**
 * Match transaction mapping to existing chart account
 */
export function findMatchingChartAccount(
  mapping: TransactionMapping,
  chartAccounts: ChartAccount[]
): ChartAccount | undefined {
  // Direct name match
  const directMatch = chartAccounts.find(
    a => a.name.toLowerCase() === mapping.suggestedCategory.toLowerCase() &&
         a.isActive
  );
  if (directMatch) return directMatch;

  // Try to match by type
  const typeFilter = mapping.categoryType === 'REVENUE' ? 'REVENUE' : 'EXPENSE';
  const typeMatches = chartAccounts.filter(a => a.type === typeFilter && a.isActive);

  // Fuzzy match on name
  const fuzzyMatch = typeMatches.find(
    a => a.name.toLowerCase().includes(mapping.suggestedCategory.toLowerCase()) ||
         mapping.suggestedCategory.toLowerCase().includes(a.name.toLowerCase())
  );

  return fuzzyMatch;
}
