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

export interface CategoryImportData {
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
export function generateCategoryPrompt(
  transactions: ParsedOFXTransaction[],
  businessType?: BusinessType
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

  return `# Task: Analyze Bank Transactions and Suggest Chart of Accounts Categories

You are helping a small business owner categorize their bank transactions. Based on the transaction names and memos below, suggest appropriate accounting categories for their Chart of Accounts.

## Our Chart of Accounts Structure

We use a standard accounting code system:
- **REVENUE accounts** use codes 4000-4999 (e.g., 4100 Service Revenue, 4200 Product Sales)
- **EXPENSE accounts** use codes 5000-5999 (e.g., 5100 Operating Expenses, 5200 Professional Services)

Each category needs:
- **code**: A 4-digit number (4xxx for REVENUE, 5xxx for EXPENSE)
- **name**: A clear, concise name (2-4 words)
- **type**: Either "REVENUE" or "EXPENSE"
- **description**: Brief explanation of what goes in this category
${businessContext}
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
4. Assign appropriate account codes following the numbering convention

## Output Format

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):

{
  "categories": [
    {
      "code": "4100",
      "name": "Service Revenue",
      "type": "REVENUE",
      "description": "Income from professional services"
    },
    {
      "code": "4200",
      "name": "Product Sales",
      "type": "REVENUE",
      "description": "Income from product sales"
    },
    {
      "code": "5110",
      "name": "Software & Subscriptions",
      "type": "EXPENSE",
      "description": "Software tools and subscription services"
    },
    {
      "code": "5120",
      "name": "Office Supplies",
      "type": "EXPENSE",
      "description": "Office materials and supplies"
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

Respond with ONLY valid JSON (no markdown, no explanation):

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
  const existingCodes = new Set(existingAccounts.map(a => a.code));

  for (const cat of categories) {
    // Skip if category with same code or name already exists
    const exists = existingAccounts.some(
      a => a.code === cat.code ||
           (a.name.toLowerCase() === cat.name.toLowerCase() && a.type === cat.type)
    );
    if (exists) continue;

    // Skip if we already added this code in this batch
    if (existingCodes.has(cat.code)) continue;

    const type: AccountType = cat.type;
    const parentId = type === 'REVENUE' ? '4000' : '5000';

    existingCodes.add(cat.code);

    result.push({
      code: cat.code,
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
