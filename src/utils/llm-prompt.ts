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
  LLMCategorizationRule,
  LLMRulesetResponse,
  RuleApplicationResult,
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

// ============================================
// Ruleset-Based LLM Categorization (Efficient)
// ============================================

/**
 * Generate an efficient LLM prompt that asks for categorization rules
 * instead of per-transaction categorization. This dramatically reduces
 * token usage for the response.
 */
export function generateRulesetPrompt(
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

  // Format transactions for the prompt - show a sample for context
  const transactionList = transactions.map((t, index) => {
    const amount = parseFloat(t.amount);
    const formatted = formatCurrency(Math.abs(amount), '$', 2);
    const displayAmount = amount >= 0 ? `+${formatted}` : `-${formatted}`;

    let line = `${index + 1}. ${t.date} | ${displayAmount} | ${t.name}`;
    if (t.memo) {
      line += ` | ${t.memo}`;
    }
    return line;
  });

  const prompt = `Analyze these bank transactions and help me categorize them efficiently.

FIRST, ask me clarifying questions about my business to create accurate categorization rules. For example:
- What type of business is this? (freelance, SaaS, agency, e-commerce, etc.)
- Which income sources are LOCAL (domestic, subject to 15% profit tax) vs FOREIGN (international, tax-exempt)?
- Which income is RECURRING (MRR/subscriptions) vs ONE-TIME (project-based, service fees)?
- Are there specific vendors I should know about? (e.g., "STRIPE" = payment processor, not expense)
- Any transactions that look like expenses but are actually refunds or vice versa?

EXISTING SUBCATEGORIES (use these when applicable, or suggest new ones):
Income: ${incomeSubcategories.length > 0 ? incomeSubcategories.join(', ') : 'None yet'}
Expense: ${expenseSubcategories.length > 0 ? expenseSubcategories.join(', ') : 'None yet'}

TRANSACTIONS TO ANALYZE:
${transactionList.join('\n')}

After I answer your questions, create CATEGORIZATION RULES (not per-transaction responses). Each rule matches a pattern and applies to multiple transactions.

SUGGESTED INCOME SUBCATEGORY TYPES:
- "MRR" or "Subscriptions" = recurring revenue
- "Service Revenue" = one-time project/consulting fees
- "Product Sales" = physical or digital product sales
- "Affiliate Income" = referral/affiliate commissions
- "Interest" = bank interest, dividends

SUGGESTED EXPENSE SUBCATEGORY TYPES:
- "Software Subscriptions" = SaaS tools, apps
- "Payment Processing" = Stripe fees, PayPal fees
- "Contractors" = freelancer payments
- "Advertising" = ads, marketing spend
- "Professional Services" = legal, accounting
- "Infrastructure" = hosting, servers, domains

FINAL RESPONSE FORMAT (after clarifying questions are answered):
{
  "rules": [
    {
      "pattern": "GITHUB",
      "matchType": "contains",
      "matchField": "name",
      "category": "expense",
      "subcategory": "Software Subscriptions",
      "incomeType": null,
      "confidence": "high",
      "reasoning": "GitHub is a software development platform subscription"
    },
    {
      "pattern": "STRIPE",
      "matchType": "contains",
      "matchField": "name",
      "category": "income",
      "subcategory": "MRR",
      "incomeType": "foreign",
      "confidence": "high",
      "reasoning": "Stripe payouts from international SaaS customers"
    }
  ]
}

RULE FIELDS:
- pattern: Text to match (e.g., "GITHUB", "AMAZON", "PAYROLL")
- matchType: "contains" (anywhere), "startsWith" (beginning), or "exact" (full match)
- matchField: "name" (transaction name), "memo", or "both"
- category: "income" | "expense" | "transfer" | "uncategorized"
- subcategory: Use existing or suggest new (2-3 words max)
- incomeType: "local" (15% tax) or "foreign" (0% tax) for income, null otherwise
- confidence: "high" | "medium" | "low"
- reasoning: Brief explanation

START by asking me 3-5 clarifying questions about the transactions above, then I'll provide context for accurate categorization.`;

  return prompt;
}

/**
 * Parse the LLM ruleset response
 */
export function parseRulesetResponse(jsonString: string): LLMRulesetResponse | { error: string } {
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = jsonString.match(/\{[\s\S]*"rules"[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: 'No valid JSON found in response. Expected format: { "rules": [...] }' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.rules || !Array.isArray(parsed.rules)) {
      return { error: 'Response missing "rules" array' };
    }

    // Validate each rule
    const validCategories: TransactionCategory[] = ['income', 'expense', 'transfer', 'uncategorized'];
    const validMatchTypes = ['contains', 'startsWith', 'exact'];
    const validMatchFields = ['name', 'memo', 'both'];
    const validConfidence = ['high', 'medium', 'low'];

    const validatedRules: LLMCategorizationRule[] = [];

    for (let i = 0; i < parsed.rules.length; i++) {
      const rule = parsed.rules[i];

      // Validate required fields
      if (typeof rule.pattern !== 'string' || rule.pattern.trim() === '') {
        return { error: `Rule ${i + 1}: Missing or empty pattern` };
      }

      if (!validMatchTypes.includes(rule.matchType)) {
        return {
          error: `Rule ${i + 1}: Invalid matchType "${rule.matchType}". Must be one of: ${validMatchTypes.join(', ')}`,
        };
      }

      if (!validMatchFields.includes(rule.matchField)) {
        return {
          error: `Rule ${i + 1}: Invalid matchField "${rule.matchField}". Must be one of: ${validMatchFields.join(', ')}`,
        };
      }

      if (!validCategories.includes(rule.category)) {
        return {
          error: `Rule ${i + 1}: Invalid category "${rule.category}". Must be one of: ${validCategories.join(', ')}`,
        };
      }

      if (typeof rule.subcategory !== 'string') {
        return { error: `Rule ${i + 1}: Missing or invalid subcategory` };
      }

      // Validate incomeType only for income category
      if (rule.category === 'income') {
        if (!['local', 'foreign'].includes(rule.incomeType)) {
          return {
            error: `Rule ${i + 1}: Income rules must have incomeType "local" or "foreign"`,
          };
        }
      }

      validatedRules.push({
        pattern: rule.pattern.trim(),
        matchType: rule.matchType as 'contains' | 'startsWith' | 'exact',
        matchField: rule.matchField as 'name' | 'memo' | 'both',
        category: rule.category as TransactionCategory,
        subcategory: rule.subcategory.trim(),
        incomeType: rule.category === 'income' ? (rule.incomeType as IncomeType) : null,
        confidence: validConfidence.includes(rule.confidence) ? rule.confidence : 'medium',
        reasoning: rule.reasoning || '',
      });
    }

    return { rules: validatedRules };
  } catch (err) {
    return { error: `Failed to parse JSON: ${err}` };
  }
}

/**
 * Check if a transaction matches a rule pattern
 */
function matchesRule(transaction: Transaction, rule: LLMCategorizationRule): boolean {
  const pattern = rule.pattern.toLowerCase();

  const checkMatch = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    switch (rule.matchType) {
      case 'contains':
        return lowerText.includes(pattern);
      case 'startsWith':
        return lowerText.startsWith(pattern);
      case 'exact':
        return lowerText === pattern;
      default:
        return false;
    }
  };

  switch (rule.matchField) {
    case 'name':
      return checkMatch(transaction.name);
    case 'memo':
      return checkMatch(transaction.memo || '');
    case 'both':
      return checkMatch(transaction.name) || checkMatch(transaction.memo || '');
    default:
      return false;
  }
}

/**
 * Apply categorization rules to transactions
 * Returns updated transactions and details about which rules matched
 */
export function applyRulesToTransactions(
  transactions: Transaction[],
  rules: LLMCategorizationRule[],
  existingSubcategories: Subcategory[]
): {
  updatedTransactions: Transaction[];
  newSubcategories: { name: string; type: 'income' | 'expense' }[];
  appliedCount: number;
  unmatchedCount: number;
  ruleApplications: RuleApplicationResult[];
} {
  const existingSubcategoryNames = new Set(existingSubcategories.map((s) => s.name.toLowerCase()));
  const newSubcategoriesMap = new Map<string, 'income' | 'expense'>();
  const updatedTransactions: Transaction[] = [...transactions];
  const matchedTxIds = new Set<string>();
  const ruleApplications: RuleApplicationResult[] = [];

  // Apply rules in order - first match wins
  for (const rule of rules) {
    const matchedIds: string[] = [];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      // Skip if already matched by a previous rule
      if (matchedTxIds.has(tx.id)) {
        continue;
      }

      if (matchesRule(tx, rule)) {
        // Update transaction
        const updatedTx = { ...updatedTransactions[i] };
        updatedTx.category = rule.category;
        updatedTx.subcategory = rule.subcategory;
        if (rule.category === 'income' && rule.incomeType) {
          updatedTx.incomeType = rule.incomeType;
        } else {
          delete updatedTx.incomeType;
        }
        updatedTransactions[i] = updatedTx;

        matchedTxIds.add(tx.id);
        matchedIds.push(tx.id);

        // Track new subcategories
        if (
          rule.subcategory &&
          !existingSubcategoryNames.has(rule.subcategory.toLowerCase()) &&
          (rule.category === 'income' || rule.category === 'expense')
        ) {
          newSubcategoriesMap.set(rule.subcategory, rule.category as 'income' | 'expense');
        }
      }
    }

    if (matchedIds.length > 0) {
      ruleApplications.push({
        rule,
        matchedTransactionIds: matchedIds,
        matchedCount: matchedIds.length,
      });
    }
  }

  const newSubcategories = Array.from(newSubcategoriesMap.entries()).map(([name, type]) => ({
    name,
    type,
  }));

  return {
    updatedTransactions,
    newSubcategories,
    appliedCount: matchedTxIds.size,
    unmatchedCount: transactions.length - matchedTxIds.size,
    ruleApplications,
  };
}

/**
 * Generate a summary of ruleset application results
 */
export function generateRulesetSummary(
  ruleApplications: RuleApplicationResult[]
): {
  totalRules: number;
  effectiveRules: number;
  byCategory: Record<TransactionCategory, number>;
  byConfidence: Record<string, number>;
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

  let effectiveRules = 0;

  for (const app of ruleApplications) {
    if (app.matchedCount > 0) {
      effectiveRules++;
      byCategory[app.rule.category] += app.matchedCount;
      byConfidence[app.rule.confidence] += app.matchedCount;
    }
  }

  return {
    totalRules: ruleApplications.length,
    effectiveRules,
    byCategory,
    byConfidence,
  };
}
