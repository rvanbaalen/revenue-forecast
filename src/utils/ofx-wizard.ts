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

export type WizardStep = 'upload' | 'analyze' | 'review' | 'complete';

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
  code: string;
  name: string;
  type: 'REVENUE' | 'EXPENSE';
  description?: string;
}

// Business type definitions for contextual category suggestions
export type BusinessType =
  | 'saas'
  | 'freelancer'
  | 'ecommerce'
  | 'agency'
  | 'professional'
  | 'restaurant'
  | 'retail'
  | 'construction'
  | 'other';

export interface BusinessTypeInfo {
  id: BusinessType;
  label: string;
  description: string;
  commonCategories: {
    revenue: string[];
    expense: string[];
  };
}

export const BUSINESS_TYPES: BusinessTypeInfo[] = [
  {
    id: 'saas',
    label: 'SaaS / Software',
    description: 'Software as a Service, digital products, apps',
    commonCategories: {
      revenue: ['Subscription Revenue', 'License Sales', 'Setup Fees', 'Support Revenue'],
      expense: ['Cloud Hosting (AWS, GCP, Azure)', 'Domain & DNS Services', 'API Services', 'Development Tools', 'Code Signing & Certificates', 'Error Monitoring (Sentry, etc.)', 'Analytics Tools', 'Customer Support Tools'],
    },
  },
  {
    id: 'freelancer',
    label: 'Freelancer / Consultant',
    description: 'Independent professional services',
    commonCategories: {
      revenue: ['Consulting Revenue', 'Project Revenue', 'Retainer Income', 'Training Revenue'],
      expense: ['Home Office', 'Professional Development', 'Client Entertainment', 'Coworking Space', 'Portfolio/Website', 'Professional Memberships', 'Liability Insurance'],
    },
  },
  {
    id: 'ecommerce',
    label: 'E-commerce / Online Retail',
    description: 'Selling products online',
    commonCategories: {
      revenue: ['Product Sales', 'Shipping Revenue', 'Wholesale Revenue'],
      expense: ['Cost of Goods Sold', 'Shipping & Fulfillment', 'Packaging Materials', 'Marketplace Fees (Amazon, eBay)', 'Payment Processing', 'Inventory Storage', 'Product Photography', 'Returns & Refunds'],
    },
  },
  {
    id: 'agency',
    label: 'Creative / Marketing Agency',
    description: 'Design, marketing, advertising services',
    commonCategories: {
      revenue: ['Project Revenue', 'Retainer Revenue', 'Media Buying Commission'],
      expense: ['Creative Software (Adobe, Figma)', 'Stock Photos/Videos', 'Freelancer/Contractor Payments', 'Ad Spend (on behalf of clients)', 'Project Management Tools', 'Client Gifts'],
    },
  },
  {
    id: 'professional',
    label: 'Professional Services',
    description: 'Legal, accounting, medical, etc.',
    commonCategories: {
      revenue: ['Service Revenue', 'Consultation Fees', 'Retainer Revenue'],
      expense: ['Professional Licenses', 'Continuing Education', 'Malpractice Insurance', 'Practice Management Software', 'Professional Association Dues', 'Reference Materials'],
    },
  },
  {
    id: 'restaurant',
    label: 'Restaurant / Food Service',
    description: 'Restaurants, cafes, catering',
    commonCategories: {
      revenue: ['Food Sales', 'Beverage Sales', 'Catering Revenue', 'Delivery Revenue'],
      expense: ['Food Cost', 'Beverage Cost', 'Kitchen Equipment', 'Delivery Fees', 'POS System', 'Food Delivery Platform Fees', 'Health Permits', 'Uniforms'],
    },
  },
  {
    id: 'retail',
    label: 'Retail / Brick & Mortar',
    description: 'Physical store retail',
    commonCategories: {
      revenue: ['Product Sales', 'Service Revenue'],
      expense: ['Cost of Goods Sold', 'Rent', 'Store Fixtures', 'POS System', 'Security', 'Store Supplies', 'Signage', 'Shopping Bags'],
    },
  },
  {
    id: 'construction',
    label: 'Construction / Trades',
    description: 'Building, plumbing, electrical, etc.',
    commonCategories: {
      revenue: ['Contract Revenue', 'Service Calls', 'Material Markup'],
      expense: ['Materials', 'Equipment Rental', 'Vehicle Expenses', 'Tools', 'Permits & Licenses', 'Safety Equipment', 'Subcontractor Payments', 'Bonding & Insurance'],
    },
  },
  {
    id: 'other',
    label: 'Other / General',
    description: 'General business categories',
    commonCategories: {
      revenue: ['Service Revenue', 'Product Revenue', 'Other Income'],
      expense: ['Office Supplies', 'Software & Subscriptions', 'Professional Services', 'Marketing', 'Travel', 'Meals & Entertainment'],
    },
  },
];

export interface TransactionMapping {
  fitId: string;
  transactionName: string;
  transactionMemo?: string;
  amount: number;
  date: string;
  suggestedCategory: string;
  categoryType: 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE';
  revenueSource?: string; // Name of the revenue source for REVENUE transactions
}

export interface SuggestedRevenueSource {
  name: string;
  type: 'local' | 'foreign'; // local = domestic, foreign = international
  description?: string;
}

export interface CategoryChange {
  action: 'rename' | 'merge' | 'update_description';
  // For rename: the original category name
  // For merge: one of the categories being merged
  from_name: string;
  // For merge: additional categories to merge into the target
  merge_from?: string[];
  // The target category name (new name for rename, target for merge)
  to_name: string;
  // Optional: update the code
  to_code?: string;
  // Optional: update the type (e.g., reclassify from EXPENSE to REVENUE)
  to_type?: 'REVENUE' | 'EXPENSE';
  // Optional: update the description
  to_description?: string;
}

export interface CategoryImportData {
  // Changes to existing categories (rename, merge, update)
  category_changes?: CategoryChange[];
  // New categories to add
  categories: SuggestedCategory[];
}

export interface MappingImportData {
  revenue_sources?: {
    name: string;
    type: 'local' | 'foreign';
    description?: string;
  }[];
  mappings: {
    transaction_identifier: string; // fitId or name+date combo
    category_name: string;
    category_type: 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE';
    revenue_source?: string; // Name of the revenue source (for REVENUE transactions)
  }[];
}

// ============================================
// Mapping Rules (New Compact Format)
// ============================================

export interface MappingRuleInput {
  pattern: string;
  matchType: 'exact' | 'contains' | 'startsWith' | 'endsWith';
  matchField: 'name' | 'memo' | 'both';
  categoryName: string;
  categoryType: 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE';
  revenueSource?: string; // For REVENUE transactions
}

export interface MappingRulesImportData {
  revenue_sources?: {
    name: string;
    type: 'local' | 'foreign';
    description?: string;
  }[];
  rules: {
    pattern: string;
    match_type?: 'exact' | 'contains' | 'startsWith' | 'endsWith'; // defaults to 'contains'
    match_field?: 'name' | 'memo' | 'both'; // defaults to 'name'
    category_name: string;
    category_type: 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE';
    revenue_source?: string;
  }[];
}

// ============================================
// Unified Analysis (Single LLM Call)
// ============================================

/**
 * Unified response format for the single LLM analysis step
 * Combines: categories, category changes, mapping rules, and revenue sources
 */
export interface UnifiedAnalysisData {
  // Category changes (rename, merge, update existing categories)
  category_changes?: {
    action: 'rename' | 'merge' | 'update_description';
    from_name: string;
    merge_from?: string[];
    to_name: string;
    to_code?: string;
    to_type?: 'REVENUE' | 'EXPENSE';
    to_description?: string;
  }[];
  // New categories to create
  categories?: {
    code: string;
    name: string;
    type: 'REVENUE' | 'EXPENSE';
    description?: string;
  }[];
  // Revenue sources for tracking income streams
  revenue_sources?: {
    name: string;
    type: 'local' | 'foreign';
    description?: string;
  }[];
  // Mapping rules for auto-categorization
  rules: {
    pattern: string;
    match_type?: 'exact' | 'contains' | 'startsWith' | 'endsWith';
    match_field?: 'name' | 'memo' | 'both';
    category_name: string;
    transaction_type: 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE';
    revenue_source?: string;
  }[];
}

/**
 * Parsed result from unified analysis
 */
export interface UnifiedAnalysisResult {
  success: boolean;
  categories: SuggestedCategory[];
  categoryChanges: CategoryChange[];
  revenueSources: SuggestedRevenueSource[];
  rules: MappingRuleInput[];
  error?: string;
  warnings: string[];
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
// Unified LLM Prompt (Single Step Analysis)
// ============================================

/**
 * Generate a single unified prompt for the LLM to:
 * 1. Analyze transactions and suggest categories (new or changes to existing)
 * 2. Create mapping rules for auto-categorization
 * 3. Identify revenue sources
 */
export function generateUnifiedAnalysisPrompt(
  transactions: ParsedOFXTransaction[],
  businessType?: BusinessType,
  existingCategories?: { code: string; name: string; type: 'REVENUE' | 'EXPENSE'; description?: string }[]
): string {
  const { nameMemoPairs } = extractUniqueTransactionInfo(transactions);
  const patterns = analyzeTransactionPatterns(transactions);

  // Group by income vs expense
  const incomePatterns = nameMemoPairs.filter(p => p.totalAmount >= 0);
  const expensePatterns = nameMemoPairs.filter(p => p.totalAmount < 0);

  // Format patterns for display
  const formatPatternList = (items: typeof nameMemoPairs, limit = 50) =>
    items
      .slice(0, limit)
      .map(item => {
        const memo = item.memo ? ` | memo: "${item.memo}"` : '';
        const avgAmount = Math.abs(item.totalAmount / item.count).toFixed(2);
        return `- "${item.name}"${memo} [${item.count}x, avg: ${avgAmount}]`;
      })
      .join('\n');

  // Business type context
  let businessContext = '';
  if (businessType) {
    const typeInfo = BUSINESS_TYPES.find(t => t.id === businessType);
    if (typeInfo) {
      businessContext = `
## Business Type: ${typeInfo.label}
${typeInfo.description}

Common categories for this business:
- Revenue: ${typeInfo.commonCategories.revenue.slice(0, 5).join(', ')}
- Expenses: ${typeInfo.commonCategories.expense.slice(0, 5).join(', ')}
`;
    }
  }

  // Existing categories section
  let existingSection = '';
  if (existingCategories && existingCategories.length > 0) {
    const revenue = existingCategories.filter(c => c.type === 'REVENUE');
    const expense = existingCategories.filter(c => c.type === 'EXPENSE');
    existingSection = `
## Existing Categories (use these in rules, or suggest changes)

**Revenue (${revenue.length}):** ${revenue.map(c => c.name).join(', ') || 'none'}
**Expense (${expense.length}):** ${expense.map(c => c.name).join(', ') || 'none'}

You can rename, merge, or update existing categories using "category_changes".
`;
  }

  const hasMoreIncome = incomePatterns.length > 50;
  const hasMoreExpense = expensePatterns.length > 50;

  return `# Analyze Bank Transactions

## Important: Ask Questions First!

Before providing the JSON response, please ask any clarifying questions you have about:
- The nature of the business (if not clear from transactions)
- Ambiguous transaction patterns that could be categorized multiple ways
- Whether certain recurring patterns are personal or business expenses
- How to handle unclear income sources

Once I answer your questions, then provide the JSON response.

---

Analyze these transactions and provide:
1. **Categories** - New accounting categories needed (or changes to existing ones)
2. **Rules** - Pattern-matching rules to auto-categorize transactions
3. **Revenue Sources** - Distinct income streams (clients, platforms, etc.)
${businessContext}${existingSection}
## Transaction Summary
- Total: ${transactions.length} transactions
- Income: ${patterns.creditCount} (${patterns.totalCredits.toFixed(2)})
- Expenses: ${patterns.debitCount} (${patterns.totalDebits.toFixed(2)})
- Period: ${patterns.dateRange.start} to ${patterns.dateRange.end}

## Transaction Patterns

### Income (${incomePatterns.length} unique patterns)
${formatPatternList(incomePatterns)}${hasMoreIncome ? `\n... and ${incomePatterns.length - 50} more` : ''}

### Expenses (${expensePatterns.length} unique patterns)
${formatPatternList(expensePatterns)}${hasMoreExpense ? `\n... and ${expensePatterns.length - 50} more` : ''}

## Response Format

Respond with JSON in a code block:

\`\`\`json
{
  ${existingCategories?.length ? `"category_changes": [
    {"action": "rename", "from_name": "Old Name", "to_name": "Better Name", "to_description": "..."},
    {"action": "merge", "from_name": "Keep This", "merge_from": ["Merge This", "And This"], "to_name": "Combined"}
  ],
  ` : ''}"categories": [
    {"code": "4100", "name": "Service Revenue", "type": "REVENUE", "description": "Income from services"},
    {"code": "5100", "name": "Software & Tools", "type": "EXPENSE", "description": "Software subscriptions"}
  ],
  "revenue_sources": [
    {"name": "Stripe", "type": "local", "description": "Online payments"},
    {"name": "International Clients", "type": "foreign", "description": "Overseas income"}
  ],
  "rules": [
    {"pattern": "STRIPE", "match_type": "contains", "category_name": "Service Revenue", "transaction_type": "REVENUE", "revenue_source": "Stripe"},
    {"pattern": "AMAZON WEB", "match_type": "contains", "category_name": "Cloud Hosting", "transaction_type": "EXPENSE"},
    {"pattern": "TRANSFER", "match_type": "contains", "category_name": "Transfer", "transaction_type": "TRANSFER"}
  ]
}
\`\`\`

## Key Points

**Categories (Chart of Accounts):** Only REVENUE or EXPENSE account types allowed. Use codes 4xxx for REVENUE, 5xxx for EXPENSE. Do NOT create categories for transfers.

**Rules:** Create general patterns that match multiple transactions:
- "contains" (default): Pattern appears anywhere
- "startsWith"/"endsWith": Pattern at start/end
- "exact": Exact match only
- transaction_type: REVENUE, EXPENSE, TRANSFER, or IGNORE

**Revenue Sources:** Group income by source (Stripe, PayPal, Client X, etc.). Use "Misc" for uncategorized.

**Transaction Types:**
- REVENUE: Income transaction, links to a revenue category
- EXPENSE: Spending transaction, links to an expense category
- TRANSFER: Money moving between accounts (no category needed)
- IGNORE: Skip this transaction (duplicates, corrections)

Now analyze and respond with JSON:`;
}

/**
 * Parse the unified analysis response from LLM
 */
export function parseUnifiedAnalysisResponse(jsonString: string): UnifiedAnalysisResult {
  const warnings: string[] = [];

  try {
    // Extract JSON from markdown code blocks
    let cleanJson = jsonString.trim();
    const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1].trim();
    }
    const objectMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      cleanJson = objectMatch[0];
    }

    const data = JSON.parse(cleanJson) as UnifiedAnalysisData;

    // Parse categories
    const categories: SuggestedCategory[] = [];
    const usedCodes = new Set<string>();

    if (data.categories && Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        if (!cat.name || typeof cat.name !== 'string') continue;

        const type = (cat.type || '').toUpperCase();
        if (type !== 'REVENUE' && type !== 'EXPENSE') {
          warnings.push(`Invalid type for "${cat.name}": ${cat.type}`);
          continue;
        }

        let code = (cat.code || '').toString().trim();
        if (!code || !/^\d{4}$/.test(code)) {
          let codeNum = type === 'REVENUE' ? 4100 : 5100;
          while (usedCodes.has(String(codeNum))) codeNum += 10;
          code = String(codeNum);
        }

        if (type === 'REVENUE' && !code.startsWith('4')) code = '4' + code.slice(1);
        else if (type === 'EXPENSE' && !code.startsWith('5')) code = '5' + code.slice(1);

        usedCodes.add(code);
        categories.push({
          code,
          name: cat.name.trim(),
          type: type as 'REVENUE' | 'EXPENSE',
          description: cat.description?.trim(),
        });
      }
    }

    // Parse category changes
    const categoryChanges: CategoryChange[] = [];
    if (data.category_changes && Array.isArray(data.category_changes)) {
      for (const change of data.category_changes) {
        if (!change.action || !change.from_name || !change.to_name) continue;
        const action = change.action.toLowerCase();
        if (!['rename', 'merge', 'update_description'].includes(action)) continue;

        categoryChanges.push({
          action: action as CategoryChange['action'],
          from_name: change.from_name.trim(),
          merge_from: change.merge_from?.map((n: string) => n.trim()),
          to_name: change.to_name.trim(),
          to_code: change.to_code?.toString().trim(),
          to_type: change.to_type,
          to_description: change.to_description?.trim(),
        });
      }
    }

    // Parse revenue sources
    const revenueSources: SuggestedRevenueSource[] = [];
    const revenueSourceNames = new Set<string>();

    if (data.revenue_sources && Array.isArray(data.revenue_sources)) {
      for (const source of data.revenue_sources) {
        if (source.name && !revenueSourceNames.has(source.name.toLowerCase())) {
          revenueSourceNames.add(source.name.toLowerCase());
          revenueSources.push({
            name: source.name,
            type: source.type === 'foreign' ? 'foreign' : 'local',
            description: source.description,
          });
        }
      }
    }

    // Ensure Misc source exists
    if (!revenueSourceNames.has('misc')) {
      revenueSources.push({ name: 'Misc', type: 'local', description: 'Uncategorized revenue' });
    }

    // Parse rules
    const rules: MappingRuleInput[] = [];

    if (!data.rules || !Array.isArray(data.rules)) {
      return {
        success: false,
        categories: [],
        categoryChanges: [],
        revenueSources: [],
        rules: [],
        error: 'Missing "rules" array in response',
        warnings,
      };
    }

    for (const rule of data.rules) {
      if (!rule.pattern || !rule.category_name) {
        warnings.push(`Invalid rule: missing pattern or category_name`);
        continue;
      }

      const transactionType = (rule.transaction_type || '').toUpperCase();
      if (!['REVENUE', 'EXPENSE', 'TRANSFER', 'IGNORE'].includes(transactionType)) {
        warnings.push(`Invalid transaction_type "${rule.transaction_type}" for "${rule.pattern}"`);
        continue;
      }

      let matchType: 'exact' | 'contains' | 'startsWith' | 'endsWith' = 'contains';
      if (rule.match_type) {
        const mt = rule.match_type.toLowerCase();
        if (['exact', 'contains', 'startswith', 'endswith'].includes(mt)) {
          matchType = mt === 'startswith' ? 'startsWith' : mt === 'endswith' ? 'endsWith' : mt as 'exact' | 'contains';
        }
      }

      let matchField: 'name' | 'memo' | 'both' = 'name';
      if (rule.match_field) {
        const mf = rule.match_field.toLowerCase();
        if (['name', 'memo', 'both'].includes(mf)) {
          matchField = mf as 'name' | 'memo' | 'both';
        }
      }

      let revenueSource: string | undefined;
      if (transactionType === 'REVENUE') {
        if (rule.revenue_source) {
          if (!revenueSourceNames.has(rule.revenue_source.toLowerCase())) {
            revenueSources.push({ name: rule.revenue_source, type: 'local' });
            revenueSourceNames.add(rule.revenue_source.toLowerCase());
          }
          revenueSource = rule.revenue_source;
        } else {
          revenueSource = 'Misc';
        }
      }

      rules.push({
        pattern: rule.pattern,
        matchType,
        matchField,
        categoryName: rule.category_name.trim(),
        categoryType: transactionType as 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE',
        revenueSource,
      });
    }

    if (rules.length === 0) {
      return {
        success: false,
        categories,
        categoryChanges,
        revenueSources,
        rules: [],
        error: 'No valid rules found',
        warnings,
      };
    }

    return { success: true, categories, categoryChanges, revenueSources, rules, warnings };
  } catch (err) {
    return {
      success: false,
      categories: [],
      categoryChanges: [],
      revenueSources: [],
      rules: [],
      error: `JSON parse error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      warnings: [],
    };
  }
}

// ============================================
// LLM Prompt Generation - Step 2 (Categories)
// ============================================

/**
 * Generate a prompt for an LLM to suggest categories based on transaction data
 * Supports both initial setup and iterative refinement of existing categories
 */
export function generateCategoryPrompt(
  transactions: ParsedOFXTransaction[],
  businessType?: BusinessType,
  existingCategories?: { code: string; name: string; type: 'REVENUE' | 'EXPENSE'; description?: string }[]
): string {
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

  // Build business type context if provided
  let businessContext = '';
  if (businessType) {
    const typeInfo = BUSINESS_TYPES.find(t => t.id === businessType);
    if (typeInfo) {
      businessContext = `
## Business Type Context

This is a **${typeInfo.label}** business (${typeInfo.description}).

**Common revenue categories for this business type:**
${typeInfo.commonCategories.revenue.map(c => `- ${c}`).join('\n')}

**Common expense categories for this business type:**
${typeInfo.commonCategories.expense.map(c => `- ${c}`).join('\n')}

Consider these industry-specific categories when analyzing the transactions, but also include general categories as needed.
`;
    }
  }

  // Build existing categories section if provided
  let existingCategoriesSection = '';
  let categoryChangeInstructions = '';

  if (existingCategories && existingCategories.length > 0) {
    const revenueCategories = existingCategories.filter(c => c.type === 'REVENUE');
    const expenseCategories = existingCategories.filter(c => c.type === 'EXPENSE');

    existingCategoriesSection = `
## Existing Categories

The following categories already exist in the system. You can suggest improvements to these.

**Revenue Categories (${revenueCategories.length}):**
${revenueCategories.map(c => `- [${c.code}] ${c.name}${c.description ? ': ' + c.description : ''}`).join('\n') || '(none)'}

**Expense Categories (${expenseCategories.length}):**
${expenseCategories.map(c => `- [${c.code}] ${c.name}${c.description ? ': ' + c.description : ''}`).join('\n') || '(none)'}
`;

    categoryChangeInstructions = `
## Category Changes (Optional)

If you see opportunities to improve the existing categories, you can suggest changes:

- **rename**: Rename a category to something more descriptive
- **merge**: Combine similar categories into one (moves all transactions)
- **update_description**: Update a category's description for clarity

Add a "category_changes" array to your response:

{
  "category_changes": [
    {
      "action": "rename",
      "from_name": "Old Name",
      "to_name": "Better Name",
      "to_description": "Updated description"
    },
    {
      "action": "merge",
      "from_name": "Category A",
      "merge_from": ["Category B", "Category C"],
      "to_name": "Combined Category",
      "to_description": "Merged description"
    }
  ],
  "categories": [/* new categories only */]
}

**Important**: Only include genuinely NEW categories in the "categories" array. Use "category_changes" for modifications to existing ones.
`;
  }

  return `# Task: Analyze Bank Transactions and ${existingCategories?.length ? 'Refine' : 'Suggest'} Chart of Accounts Categories

You are helping a small business owner ${existingCategories?.length ? 'refine their existing' : 'set up'} accounting categories. Based on the transaction names and memos below, ${existingCategories?.length ? 'suggest improvements and any new categories needed' : 'suggest appropriate accounting categories for their Chart of Accounts'}.

## Our Chart of Accounts Structure

We use a standard accounting code system:
- **REVENUE accounts** use codes 4000-4999 (e.g., 4100 Service Revenue, 4200 Product Sales)
- **EXPENSE accounts** use codes 5000-5999 (e.g., 5100 Operating Expenses, 5200 Professional Services)

Each category needs:
- **code**: A 4-digit number (4xxx for REVENUE, 5xxx for EXPENSE)
- **name**: A clear, concise name (2-4 words)
- **type**: Either "REVENUE" or "EXPENSE"
- **description**: Brief explanation of what goes in this category
${existingCategoriesSection}${businessContext}
## Transaction Summary
- Date range: ${patterns.dateRange.start} to ${patterns.dateRange.end}
- Total income transactions: ${patterns.creditCount} (total: ${patterns.totalCredits.toFixed(2)})
- Total expense transactions: ${patterns.debitCount} (total: ${patterns.totalDebits.toFixed(2)})

## Unique Transaction Names (with frequency and totals)
${transactionList}

## Instructions

1. Analyze the transaction names and memos above
${existingCategories?.length ? `2. Review the existing categories - suggest renames/merges if names could be clearer
3. Only add NEW categories if the existing ones don't cover these transactions
4. Don't duplicate existing categories - use category_changes to modify them` : `2. Identify patterns that suggest different income sources or expense categories
3. Suggest 5-15 categories that would best organize these transactions
4. Assign appropriate account codes following the numbering convention`}

## Output Format

Respond with valid JSON wrapped in a code block:

\`\`\`json
{${existingCategories?.length ? `
  "category_changes": [
    {
      "action": "rename",
      "from_name": "Old Category Name",
      "to_name": "Better Category Name",
      "to_description": "Clearer description"
    }
  ],` : ''}
  "categories": [
    {
      "code": "4100",
      "name": "Service Revenue",
      "type": "REVENUE",
      "description": "Income from professional services"
    },
    {
      "code": "5110",
      "name": "Software & Subscriptions",
      "type": "EXPENSE",
      "description": "Software tools and subscription services"
    }
  ]
}
\`\`\`
${categoryChangeInstructions}
## Guidelines

- Keep category names short but descriptive (2-4 words)
- Use standard accounting terminology where appropriate
- Group similar transactions logically
${existingCategories?.length ? `- Prefer modifying existing categories over creating duplicates
- Only add truly new categories that aren't covered by existing ones` : `- Consider both business and personal categories if mixed`}
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

  return `# Task: Categorize Bank Transactions and Identify Revenue Sources

You are helping categorize bank transactions into predefined categories AND identify distinct revenue sources for revenue tracking.

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
4. **For REVENUE transactions**: Identify which revenue source (client/customer/platform) the payment is from
5. Group similar revenue by source (e.g., all payments from "Stripe" are one source, all payments from "Client ABC" are one source)
6. Output the mapping in the exact JSON format below

## Output Format

Respond with valid JSON wrapped in a code block:

\`\`\`json
{
  "revenue_sources": [
    {
      "name": "Source Name",
      "type": "local",
      "description": "Brief description of this revenue source"
    }
  ],
  "mappings": [
    {
      "transaction_identifier": "fitId-here",
      "category_name": "Category Name",
      "category_type": "REVENUE",
      "revenue_source": "Source Name"
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
\`\`\`

## Rules

- Use the exact category names from the Available Categories list
- category_type must be one of: REVENUE, EXPENSE, TRANSFER, IGNORE
- Every transaction must have a mapping
- transaction_identifier should be the fitId shown in brackets [...]
- **Revenue Source Rules**:
  - revenue_sources: List all unique revenue sources you identify
  - type: "local" for domestic sources, "foreign" for international sources
  - For each REVENUE transaction, include "revenue_source" matching one of the names in revenue_sources
  - If a revenue transaction doesn't clearly belong to a specific source, use "Misc" as the source name
- When uncertain, use your best judgment based on the transaction name

Now categorize all transactions, identify revenue sources, and provide your JSON response:`;
}

/**
 * Generate a prompt for an LLM to create MAPPING RULES (compact format)
 * Instead of mapping each transaction individually, this creates reusable rules
 * that can apply to multiple transactions and future imports.
 */
export function generateMappingRulesPrompt(
  transactions: ParsedOFXTransaction[],
  categories: SuggestedCategory[]
): string {
  // Build category list
  const revenueCategories = categories.filter(c => c.type === 'REVENUE');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  // Get unique transaction patterns with stats
  const { nameMemoPairs } = extractUniqueTransactionInfo(transactions);
  const patterns = analyzeTransactionPatterns(transactions);

  // Group by income vs expense based on amount direction
  const incomePatterns = nameMemoPairs.filter(p => p.totalAmount >= 0);
  const expensePatterns = nameMemoPairs.filter(p => p.totalAmount < 0);

  // Format patterns for display
  const formatPatternList = (items: typeof nameMemoPairs, limit = 50) =>
    items
      .slice(0, limit)
      .map(item => {
        const memo = item.memo ? ` | memo: "${item.memo}"` : '';
        const avgAmount = Math.abs(item.totalAmount / item.count).toFixed(2);
        return `- "${item.name}"${memo} [${item.count}x, avg: ${avgAmount}]`;
      })
      .join('\n');

  const hasMoreIncome = incomePatterns.length > 50;
  const hasMoreExpense = expensePatterns.length > 50;

  return `# Task: Create Transaction Categorization RULES

You are helping create reusable categorization RULES for bank transactions. Instead of categorizing each transaction individually, create RULES that match patterns and can apply to multiple transactions.

## Available Categories

**Revenue Categories (income):**
${revenueCategories.map(c => `- "${c.name}": ${c.description || 'No description'}`).join('\n') || '(none defined)'}

**Expense Categories (spending):**
${expenseCategories.map(c => `- "${c.name}": ${c.description || 'No description'}`).join('\n') || '(none defined)'}

**Special Categories:**
- TRANSFER: For transfers between accounts (e.g., "Transfer to Savings", "Credit Card Payment")
- IGNORE: For transactions that should be excluded from reports

## Transaction Summary
- Total transactions: ${transactions.length}
- Income transactions: ${patterns.creditCount} (total: ${patterns.totalCredits.toFixed(2)})
- Expense transactions: ${patterns.debitCount} (total: ${patterns.totalDebits.toFixed(2)})

## Unique Transaction Patterns

### Income Patterns (${incomePatterns.length} unique)
${formatPatternList(incomePatterns)}${hasMoreIncome ? `\n... and ${incomePatterns.length - 50} more` : ''}

### Expense Patterns (${expensePatterns.length} unique)
${formatPatternList(expensePatterns)}${hasMoreExpense ? `\n... and ${expensePatterns.length - 50} more` : ''}

## Instructions

1. Analyze the transaction patterns above
2. Create RULES that match groups of similar transactions
3. Use pattern matching to cover multiple transactions with one rule
4. Identify revenue sources for income transactions

## Rule Format

Each rule has:
- **pattern**: Text to match (e.g., "STRIPE", "AMAZON", "UBER EATS")
- **match_type**: How to match (default: "contains")
  - "exact": Pattern must match exactly
  - "contains": Pattern can appear anywhere in text
  - "startsWith": Text must start with pattern
  - "endsWith": Text must end with pattern
- **match_field**: What to match against (default: "name")
  - "name": Match transaction name only
  - "memo": Match memo only
  - "both": Match either name or memo
- **category_name**: The category to assign
- **category_type**: One of REVENUE, EXPENSE, TRANSFER, IGNORE
- **revenue_source**: (For REVENUE only) Name of the revenue source

## Output Format

Respond with valid JSON wrapped in a code block:

\`\`\`json
{
  "revenue_sources": [
    {
      "name": "Stripe Payments",
      "type": "local",
      "description": "Online payment processor"
    },
    {
      "name": "International Clients",
      "type": "foreign",
      "description": "Payments from overseas clients"
    }
  ],
  "rules": [
    {
      "pattern": "STRIPE",
      "match_type": "contains",
      "category_name": "Service Revenue",
      "category_type": "REVENUE",
      "revenue_source": "Stripe Payments"
    },
    {
      "pattern": "AMAZON WEB SERVICES",
      "match_type": "contains",
      "category_name": "Cloud Hosting",
      "category_type": "EXPENSE"
    },
    {
      "pattern": "TRANSFER",
      "match_type": "contains",
      "category_name": "Transfer",
      "category_type": "TRANSFER"
    }
  ]
}
\`\`\`

## Guidelines

- Create rules that are GENERAL enough to match multiple transactions
- Use "contains" for common vendor names (e.g., "UBER" matches "UBER EATS" and "UBER RIDE")
- Use "startsWith" when transaction names have a common prefix
- Use "exact" only for very specific transaction names
- Create revenue sources for distinct income streams (clients, platforms, products)
- Use "type": "local" for domestic sources, "foreign" for international
- Aim for ${Math.min(30, Math.ceil(nameMemoPairs.length / 3))} to ${Math.min(50, nameMemoPairs.length)} rules to cover the patterns
- Rules are applied in order, so put more specific patterns before general ones
- If a revenue transaction doesn't have a specific source, use "Misc" as revenue_source

Now analyze the patterns and create your categorization rules:`;
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
  categoryChanges: CategoryChange[];
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

    // Parse category changes if present
    const categoryChanges: CategoryChange[] = [];
    if (data.category_changes && Array.isArray(data.category_changes)) {
      for (const change of data.category_changes) {
        if (!change.action || !change.from_name || !change.to_name) {
          continue;
        }

        const action = change.action.toLowerCase();
        if (!['rename', 'merge', 'update_description'].includes(action)) {
          continue;
        }

        categoryChanges.push({
          action: action as CategoryChange['action'],
          from_name: change.from_name.trim(),
          merge_from: change.merge_from?.map((n: string) => n.trim()),
          to_name: change.to_name.trim(),
          to_code: change.to_code?.toString().trim(),
          to_type: change.to_type,
          to_description: change.to_description?.trim(),
        });
      }
    }

    // Categories array can be empty if only changes are provided
    if (!data.categories) {
      data.categories = [];
    }

    if (!Array.isArray(data.categories)) {
      return {
        success: false,
        categories: [],
        categoryChanges: [],
        error: 'Invalid format: expected "categories" array',
      };
    }

    // Validate and normalize each category
    const categories: SuggestedCategory[] = [];
    const errors: string[] = [];
    const usedCodes = new Set<string>();

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

      // Validate code format (4xxx for REVENUE, 5xxx for EXPENSE)
      let code = (cat.code || '').toString().trim();
      if (!code || !/^\d{4}$/.test(code)) {
        // Auto-generate code if missing or invalid
        let codeNum = type === 'REVENUE' ? 4100 : 5100;
        while (usedCodes.has(String(codeNum))) {
          codeNum += 10;
        }
        code = String(codeNum);
      }

      // Validate code matches type
      if (type === 'REVENUE' && !code.startsWith('4')) {
        code = '4' + code.slice(1);
      } else if (type === 'EXPENSE' && !code.startsWith('5')) {
        code = '5' + code.slice(1);
      }

      usedCodes.add(code);

      categories.push({
        code,
        name: cat.name.trim(),
        type: type as 'REVENUE' | 'EXPENSE',
        description: cat.description?.trim(),
      });
    }

    // Allow success if we have either categories or changes
    if (categories.length === 0 && categoryChanges.length === 0) {
      return {
        success: false,
        categories: [],
        categoryChanges: [],
        error: errors.length > 0 ? errors.join('; ') : 'No valid categories or changes found',
      };
    }

    return { success: true, categories, categoryChanges };
  } catch (err) {
    return {
      success: false,
      categories: [],
      categoryChanges: [],
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
  revenueSources: SuggestedRevenueSource[];
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
        revenueSources: [],
        error: 'Invalid format: expected "mappings" array',
        warnings: [],
      };
    }

    // Parse revenue sources
    const revenueSources: SuggestedRevenueSource[] = [];
    const revenueSourceNames = new Set<string>();

    if (data.revenue_sources && Array.isArray(data.revenue_sources)) {
      for (const source of data.revenue_sources) {
        if (source.name && !revenueSourceNames.has(source.name.toLowerCase())) {
          revenueSourceNames.add(source.name.toLowerCase());
          revenueSources.push({
            name: source.name,
            type: source.type === 'foreign' ? 'foreign' : 'local',
            description: source.description,
          });
        }
      }
    }

    // Always ensure "Misc" source exists for unassigned revenue
    if (!revenueSourceNames.has('misc')) {
      revenueSources.push({
        name: 'Misc',
        type: 'local',
        description: 'Miscellaneous or uncategorized revenue',
      });
    }

    // Create lookup maps
    const txByFitId = new Map(transactions.map(tx => [tx.fitId, tx]));
    const categoryNames = new Set(categories.map(c => c.name.toLowerCase()));
    const validSourceNames = new Set(revenueSources.map(s => s.name.toLowerCase()));

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

      // Handle revenue source for REVENUE transactions
      let revenueSource: string | undefined;
      if (categoryType === 'REVENUE') {
        if (mapping.revenue_source) {
          // Validate the source exists
          if (validSourceNames.has(mapping.revenue_source.toLowerCase())) {
            // Find the canonical name (with proper casing)
            revenueSource = revenueSources.find(
              s => s.name.toLowerCase() === mapping.revenue_source!.toLowerCase()
            )?.name;
          } else {
            // Unknown source - add it
            revenueSources.push({
              name: mapping.revenue_source,
              type: 'local',
            });
            validSourceNames.add(mapping.revenue_source.toLowerCase());
            revenueSource = mapping.revenue_source;
          }
        } else {
          // No source specified - use Misc
          revenueSource = 'Misc';
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
        revenueSource,
      });
    }

    // Check for unmapped transactions
    const unmapped = transactions.filter(tx => !mappedFitIds.has(tx.fitId));
    if (unmapped.length > 0) {
      warnings.push(`${unmapped.length} transaction(s) not mapped by LLM response`);

      // Auto-map unmapped transactions based on amount direction
      for (const tx of unmapped) {
        const isRevenue = tx.amount >= 0;
        mappings.push({
          fitId: tx.fitId,
          transactionName: tx.name,
          transactionMemo: tx.memo,
          amount: tx.amount,
          date: tx.datePosted,
          suggestedCategory: isRevenue ? 'Uncategorized Income' : 'Uncategorized Expense',
          categoryType: isRevenue ? 'REVENUE' : 'EXPENSE',
          revenueSource: isRevenue ? 'Misc' : undefined,
        });
      }
    }

    return { success: true, mappings, revenueSources, warnings };
  } catch (err) {
    return {
      success: false,
      mappings: [],
      revenueSources: [],
      error: `JSON parse error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      warnings: [],
    };
  }
}

/**
 * Parse and validate mapping RULES JSON from LLM response
 */
export function parseMappingRulesResponse(jsonString: string): {
  success: boolean;
  rules: MappingRuleInput[];
  revenueSources: SuggestedRevenueSource[];
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

    const data = JSON.parse(cleanJson) as MappingRulesImportData;

    if (!data.rules || !Array.isArray(data.rules)) {
      return {
        success: false,
        rules: [],
        revenueSources: [],
        error: 'Invalid format: expected "rules" array',
        warnings: [],
      };
    }

    // Parse revenue sources
    const revenueSources: SuggestedRevenueSource[] = [];
    const revenueSourceNames = new Set<string>();

    if (data.revenue_sources && Array.isArray(data.revenue_sources)) {
      for (const source of data.revenue_sources) {
        if (source.name && !revenueSourceNames.has(source.name.toLowerCase())) {
          revenueSourceNames.add(source.name.toLowerCase());
          revenueSources.push({
            name: source.name,
            type: source.type === 'foreign' ? 'foreign' : 'local',
            description: source.description,
          });
        }
      }
    }

    // Always ensure "Misc" source exists for unassigned revenue
    if (!revenueSourceNames.has('misc')) {
      revenueSources.push({
        name: 'Misc',
        type: 'local',
        description: 'Miscellaneous or uncategorized revenue',
      });
    }

    // Parse rules
    const rules: MappingRuleInput[] = [];

    for (const rule of data.rules) {
      if (!rule.pattern) {
        warnings.push('Rule missing pattern, skipping');
        continue;
      }

      if (!rule.category_name) {
        warnings.push(`Rule for "${rule.pattern}" missing category_name, skipping`);
        continue;
      }

      const categoryType = (rule.category_type || '').toUpperCase();
      if (!['REVENUE', 'EXPENSE', 'TRANSFER', 'IGNORE'].includes(categoryType)) {
        warnings.push(`Invalid category_type "${rule.category_type}" for "${rule.pattern}", skipping`);
        continue;
      }

      // Validate match_type
      let matchType: 'exact' | 'contains' | 'startsWith' | 'endsWith' = 'contains';
      if (rule.match_type) {
        const mt = rule.match_type.toLowerCase();
        if (['exact', 'contains', 'startswith', 'endswith'].includes(mt)) {
          matchType = mt === 'startswith' ? 'startsWith' :
                      mt === 'endswith' ? 'endsWith' :
                      mt as 'exact' | 'contains';
        }
      }

      // Validate match_field
      let matchField: 'name' | 'memo' | 'both' = 'name';
      if (rule.match_field) {
        const mf = rule.match_field.toLowerCase();
        if (['name', 'memo', 'both'].includes(mf)) {
          matchField = mf as 'name' | 'memo' | 'both';
        }
      }

      // Handle revenue source for REVENUE rules
      let revenueSource: string | undefined;
      if (categoryType === 'REVENUE') {
        if (rule.revenue_source) {
          // Add source if it doesn't exist
          if (!revenueSourceNames.has(rule.revenue_source.toLowerCase())) {
            revenueSources.push({
              name: rule.revenue_source,
              type: 'local',
            });
            revenueSourceNames.add(rule.revenue_source.toLowerCase());
          }
          revenueSource = rule.revenue_source;
        } else {
          // Default to Misc for revenue without explicit source
          revenueSource = 'Misc';
        }
      }

      rules.push({
        pattern: rule.pattern,
        matchType,
        matchField,
        categoryName: rule.category_name.trim(),
        categoryType: categoryType as 'REVENUE' | 'EXPENSE' | 'TRANSFER' | 'IGNORE',
        revenueSource,
      });
    }

    if (rules.length === 0) {
      return {
        success: false,
        rules: [],
        revenueSources: [],
        error: 'No valid rules found in response',
        warnings,
      };
    }

    return { success: true, rules, revenueSources, warnings };
  } catch (err) {
    return {
      success: false,
      rules: [],
      revenueSources: [],
      error: `JSON parse error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      warnings: [],
    };
  }
}

/**
 * Check if a transaction matches a rule
 */
function matchesRule(
  transaction: ParsedOFXTransaction,
  rule: MappingRuleInput
): boolean {
  const pattern = rule.pattern.toLowerCase();
  const name = transaction.name.toLowerCase();
  const memo = transaction.memo?.toLowerCase() || '';

  const checkMatch = (text: string): boolean => {
    switch (rule.matchType) {
      case 'exact':
        return text === pattern;
      case 'startsWith':
        return text.startsWith(pattern);
      case 'endsWith':
        return text.endsWith(pattern);
      case 'contains':
      default:
        return text.includes(pattern);
    }
  };

  switch (rule.matchField) {
    case 'memo':
      return checkMatch(memo);
    case 'both':
      return checkMatch(name) || checkMatch(memo);
    case 'name':
    default:
      return checkMatch(name);
  }
}

/**
 * Apply mapping rules to transactions and return TransactionMapping[]
 * This converts rules into individual mappings for compatibility with the import process
 */
export function applyMappingRules(
  transactions: ParsedOFXTransaction[],
  rules: MappingRuleInput[]
): {
  mappings: TransactionMapping[];
  matchedCount: number;
  unmatchedCount: number;
  ruleStats: { pattern: string; matchCount: number }[];
} {
  const mappings: TransactionMapping[] = [];
  const ruleStats = rules.map(r => ({ pattern: r.pattern, matchCount: 0 }));
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const tx of transactions) {
    let matched = false;

    // Try each rule in order (first match wins)
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (matchesRule(tx, rule)) {
        mappings.push({
          fitId: tx.fitId,
          transactionName: tx.name,
          transactionMemo: tx.memo,
          amount: tx.amount,
          date: tx.datePosted,
          suggestedCategory: rule.categoryName,
          categoryType: rule.categoryType,
          revenueSource: rule.revenueSource,
        });
        ruleStats[i].matchCount++;
        matchedCount++;
        matched = true;
        break;
      }
    }

    // Handle unmatched transactions
    if (!matched) {
      const isRevenue = tx.amount >= 0;
      mappings.push({
        fitId: tx.fitId,
        transactionName: tx.name,
        transactionMemo: tx.memo,
        amount: tx.amount,
        date: tx.datePosted,
        suggestedCategory: isRevenue ? 'Uncategorized Income' : 'Uncategorized Expense',
        categoryType: isRevenue ? 'REVENUE' : 'EXPENSE',
        revenueSource: isRevenue ? 'Misc' : undefined,
      });
      unmatchedCount++;
    }
  }

  return { mappings, matchedCount, unmatchedCount, ruleStats };
}

// ============================================
// Category Creation Helpers
// ============================================

/**
 * Generate the next available code for a given type
 */
function getNextAvailableCode(
  type: 'REVENUE' | 'EXPENSE',
  usedCodes: Set<string>
): string {
  const startCode = type === 'REVENUE' ? 4100 : 5100;
  const maxCode = type === 'REVENUE' ? 4999 : 5999;

  let code = startCode;
  while (usedCodes.has(String(code)) && code <= maxCode) {
    code += 10;
  }

  // If we've exhausted standard codes, try filling gaps
  if (code > maxCode) {
    const rangeStart = type === 'REVENUE' ? 4100 : 5100;
    for (let c = rangeStart; c <= maxCode; c++) {
      if (!usedCodes.has(String(c))) {
        return String(c);
      }
    }
    // Fallback - should never happen in practice
    return String(startCode);
  }

  return String(code);
}

/**
 * Convert suggested categories to ChartAccount format for import
 * Automatically generates unique codes when conflicts occur
 */
export function categoriesToChartAccounts(
  categories: SuggestedCategory[],
  existingAccounts: ChartAccount[]
): Omit<ChartAccount, 'id' | 'createdAt' | 'updatedAt'>[] {
  const result: Omit<ChartAccount, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const usedCodes = new Set(existingAccounts.map(a => a.code));
  const existingNamesByType = new Map<string, Set<string>>();

  // Build lookup of existing names by type
  for (const account of existingAccounts) {
    if (!existingNamesByType.has(account.type)) {
      existingNamesByType.set(account.type, new Set());
    }
    existingNamesByType.get(account.type)!.add(account.name.toLowerCase());
  }

  for (const cat of categories) {
    // Skip if category with same name and type already exists
    const namesForType = existingNamesByType.get(cat.type);
    if (namesForType?.has(cat.name.toLowerCase())) {
      continue;
    }

    // Determine the code to use
    let code = cat.code;

    // If code already exists, generate a new unique one
    if (usedCodes.has(code)) {
      code = getNextAvailableCode(cat.type, usedCodes);
    }

    // Ensure code matches the type (4xxx for REVENUE, 5xxx for EXPENSE)
    if (cat.type === 'REVENUE' && !code.startsWith('4')) {
      code = '4' + code.slice(1);
      if (usedCodes.has(code)) {
        code = getNextAvailableCode(cat.type, usedCodes);
      }
    } else if (cat.type === 'EXPENSE' && !code.startsWith('5')) {
      code = '5' + code.slice(1);
      if (usedCodes.has(code)) {
        code = getNextAvailableCode(cat.type, usedCodes);
      }
    }

    const type: AccountType = cat.type;
    const parentId = type === 'REVENUE' ? '4000' : '5000';

    usedCodes.add(code);

    // Track the name we're adding
    if (!existingNamesByType.has(type)) {
      existingNamesByType.set(type, new Set());
    }
    existingNamesByType.get(type)!.add(cat.name.toLowerCase());

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
