/**
 * LLM Prompt Generation for Transaction Categorization
 *
 * Generates a copyable prompt that users paste into their LLM of choice.
 * The LLM responds with JSON that the app parses to apply categorizations.
 */

import type {
  Transaction,
  Subcategory,
  LLMCategorizationResponse,
  LLMCategorizationResult,
  TransactionCategory,
  IncomeType,
} from '../types';
import { formatCurrency } from './decimal';

/**
 * Generate the LLM prompt for categorizing transactions
 */
export function generateCategorizationPrompt(
  transactions: Transaction[],
  existingSubcategories: Subcategory[]
): string {
  // Group existing subcategories by type
  const incomeSubcategories = existingSubcategories
    .filter((s) => s.type === 'income')
    .map((s) => s.name);
  const expenseSubcategories = existingSubcategories
    .filter((s) => s.type === 'expense')
    .map((s) => s.name);

  // Format transactions for the prompt
  const transactionList = transactions.map((t, index) => {
    const amount = parseFloat(t.amount);
    const formatted = formatCurrency(Math.abs(amount), '$', 2);
    const displayAmount = amount >= 0 ? `+${formatted}` : `-${formatted}`;

    let line = `${index + 1}. ${t.date} | ${displayAmount} | ${t.name}`;
    if (t.memo) {
      line += ` | Memo: ${t.memo}`;
    }
    return line;
  });

  const prompt = `I need help categorizing bank transactions. Please analyze each transaction and provide categorization.

EXISTING SUBCATEGORIES (use these when applicable, or suggest new ones):
Income: ${incomeSubcategories.length > 0 ? incomeSubcategories.join(', ') : 'None yet'}
Expense: ${expenseSubcategories.length > 0 ? expenseSubcategories.join(', ') : 'None yet'}

TRANSACTIONS TO CATEGORIZE:
${transactionList.join('\n')}

For each transaction, determine:
- category: "income" | "expense" | "transfer" | "uncategorized"
  - "income" = money received (positive amounts like deposits, payments received)
  - "expense" = money spent (negative amounts like purchases, payments made)
  - "transfer" = movement between own accounts (matching deposits/withdrawals)
  - "uncategorized" = unclear, needs manual review
- subcategory: Use existing subcategory names when applicable, or suggest new short names (2-3 words max)
- incomeType (ONLY for income transactions): "local" or "foreign"
  - "local" = income from domestic/same-country sources, subject to 15% profit tax
  - "foreign" = income from international sources, not subject to profit tax
  - Set to null for non-income transactions

RESPOND IN THIS EXACT JSON FORMAT:
{
  "categorizations": [
    {
      "index": 1,
      "category": "expense",
      "subcategory": "Software Subscriptions",
      "incomeType": null,
      "confidence": "high",
      "reasoning": "Brief explanation of why this categorization was chosen"
    }
  ]
}

IMPORTANT NOTES:
1. The "index" field must match the transaction number (1-based)
2. Use existing subcategory names when the transaction clearly fits
3. Keep new subcategory names short and consistent (e.g., "Bank Fees" not "Monthly bank service charges")
4. For transfers, look for matching amounts between accounts
5. If genuinely unsure, use "uncategorized" with confidence "low"
6. For income, carefully consider if the source is domestic (local) or international (foreign)`;

  return prompt;
}

/**
 * Parse the LLM JSON response
 */
export function parseLLMResponse(jsonString: string): LLMCategorizationResponse | { error: string } {
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = jsonString.match(/\{[\s\S]*"categorizations"[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: 'No valid JSON found in response. Expected format: { "categorizations": [...] }' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.categorizations || !Array.isArray(parsed.categorizations)) {
      return { error: 'Response missing "categorizations" array' };
    }

    // Validate each categorization
    const validCategories: TransactionCategory[] = ['income', 'expense', 'transfer', 'uncategorized'];
    const validConfidence = ['high', 'medium', 'low'];

    const validatedResults: LLMCategorizationResult[] = [];

    for (const item of parsed.categorizations) {
      // Validate required fields
      if (typeof item.index !== 'number') {
        return { error: `Invalid index in categorization: ${JSON.stringify(item)}` };
      }

      if (!validCategories.includes(item.category)) {
        return {
          error: `Invalid category "${item.category}" for index ${item.index}. Must be one of: ${validCategories.join(', ')}`,
        };
      }

      if (typeof item.subcategory !== 'string') {
        return { error: `Missing or invalid subcategory for index ${item.index}` };
      }

      // Validate incomeType only for income category
      if (item.category === 'income') {
        if (!['local', 'foreign'].includes(item.incomeType)) {
          return {
            error: `Income transaction at index ${item.index} must have incomeType "local" or "foreign"`,
          };
        }
      }

      validatedResults.push({
        index: item.index,
        category: item.category as TransactionCategory,
        subcategory: item.subcategory.trim(),
        incomeType: item.category === 'income' ? (item.incomeType as IncomeType) : null,
        confidence: validConfidence.includes(item.confidence) ? item.confidence : 'medium',
        reasoning: item.reasoning || '',
      });
    }

    return { categorizations: validatedResults };
  } catch (err) {
    return { error: `Failed to parse JSON: ${err}` };
  }
}

/**
 * Apply categorizations to transactions
 * Returns updated transactions and any new subcategories detected
 */
export function applyCategorizationsToTransactions(
  transactions: Transaction[],
  categorizations: LLMCategorizationResult[],
  existingSubcategories: Subcategory[]
): {
  updatedTransactions: Transaction[];
  newSubcategories: { name: string; type: 'income' | 'expense' }[];
  appliedCount: number;
  skippedCount: number;
} {
  const existingSubcategoryNames = new Set(existingSubcategories.map((s) => s.name.toLowerCase()));
  const newSubcategoriesMap = new Map<string, 'income' | 'expense'>();
  const updatedTransactions: Transaction[] = [...transactions];

  let appliedCount = 0;
  let skippedCount = 0;

  for (const cat of categorizations) {
    // Index is 1-based, array is 0-based
    const txIndex = cat.index - 1;

    if (txIndex < 0 || txIndex >= transactions.length) {
      console.warn(`Skipping invalid index ${cat.index}`);
      skippedCount++;
      continue;
    }

    const tx = { ...updatedTransactions[txIndex] };

    // Update transaction
    tx.category = cat.category;
    tx.subcategory = cat.subcategory;
    if (cat.category === 'income' && cat.incomeType) {
      tx.incomeType = cat.incomeType;
    } else {
      delete tx.incomeType;
    }

    updatedTransactions[txIndex] = tx;
    appliedCount++;

    // Track new subcategories
    if (
      cat.subcategory &&
      !existingSubcategoryNames.has(cat.subcategory.toLowerCase()) &&
      (cat.category === 'income' || cat.category === 'expense')
    ) {
      newSubcategoriesMap.set(cat.subcategory, cat.category as 'income' | 'expense');
    }
  }

  const newSubcategories = Array.from(newSubcategoriesMap.entries()).map(([name, type]) => ({
    name,
    type,
  }));

  return {
    updatedTransactions,
    newSubcategories,
    appliedCount,
    skippedCount,
  };
}

/**
 * Generate a summary of the categorization results
 */
export function generateCategorizationSummary(
  categorizations: LLMCategorizationResult[]
): {
  byCategory: Record<TransactionCategory, number>;
  byConfidence: Record<string, number>;
  incomeByType: Record<IncomeType, number>;
} {
  const byCategory: Record<TransactionCategory, number> = {
    income: 0,
    expense: 0,
    transfer: 0,
    uncategorized: 0,
  };

  const byConfidence: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  const incomeByType: Record<IncomeType, number> = {
    local: 0,
    foreign: 0,
  };

  for (const cat of categorizations) {
    byCategory[cat.category]++;
    byConfidence[cat.confidence]++;

    if (cat.category === 'income' && cat.incomeType) {
      incomeByType[cat.incomeType]++;
    }
  }

  return { byCategory, byConfidence, incomeByType };
}

/**
 * Create a mapping rule suggestion from a categorization
 */
export function suggestMappingRule(
  transaction: Transaction,
  categorization: LLMCategorizationResult
): {
  pattern: string;
  patternType: 'contains';
  matchField: 'name' | 'memo' | 'both';
  category: TransactionCategory;
  subcategory: string;
  incomeType?: IncomeType;
} | null {
  // Only suggest rules for high-confidence categorizations
  if (categorization.confidence !== 'high') {
    return null;
  }

  // Extract a meaningful pattern from the transaction name
  // Remove common variable parts (numbers, dates, etc.)
  let pattern = transaction.name
    .replace(/\d+/g, '') // Remove numbers
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // If pattern is too short or generic, don't suggest
  if (pattern.length < 3) {
    return null;
  }

  return {
    pattern,
    patternType: 'contains',
    matchField: 'name',
    category: categorization.category,
    subcategory: categorization.subcategory,
    incomeType: categorization.incomeType || undefined,
  };
}
