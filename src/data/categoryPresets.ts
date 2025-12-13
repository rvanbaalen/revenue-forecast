import type { ChartAccount } from '../types';

export interface CategoryPreset {
  id: string;
  name: string;
  description: string;
  accounts: Omit<ChartAccount, 'createdAt' | 'updatedAt'>[];
}

// Base accounts that all business types share
const BASE_ACCOUNTS: Omit<ChartAccount, 'createdAt' | 'updatedAt'>[] = [
  // ASSETS (1000s)
  { id: '1000', code: '1000', name: 'Assets', type: 'ASSET', isSystem: true, isActive: true },
  { id: '1100', code: '1100', name: 'Cash & Bank', type: 'ASSET', parentId: '1000', subtype: 'Cash', isSystem: true, isActive: true },
  { id: '1110', code: '1110', name: 'Checking Account', type: 'ASSET', parentId: '1100', subtype: 'Cash', isSystem: false, isActive: true },
  { id: '1120', code: '1120', name: 'Savings Account', type: 'ASSET', parentId: '1100', subtype: 'Cash', isSystem: false, isActive: true },

  // LIABILITIES (2000s)
  { id: '2000', code: '2000', name: 'Liabilities', type: 'LIABILITY', isSystem: true, isActive: true },
  { id: '2100', code: '2100', name: 'Credit Cards', type: 'LIABILITY', parentId: '2000', subtype: 'Credit Card', isSystem: true, isActive: true },
  { id: '2110', code: '2110', name: 'Credit Card', type: 'LIABILITY', parentId: '2100', subtype: 'Credit Card', isSystem: false, isActive: true },
  { id: '2200', code: '2200', name: 'Tax Liabilities', type: 'LIABILITY', parentId: '2000', isSystem: true, isActive: true },
  { id: '2210', code: '2210', name: 'VAT Payable', type: 'LIABILITY', parentId: '2200', isSystem: false, isActive: true },

  // EQUITY (3000s)
  { id: '3000', code: '3000', name: 'Equity', type: 'EQUITY', isSystem: true, isActive: true },
  { id: '3100', code: '3100', name: "Owner's Equity", type: 'EQUITY', parentId: '3000', isSystem: true, isActive: true },
  { id: '3200', code: '3200', name: 'Retained Earnings', type: 'EQUITY', parentId: '3000', isSystem: true, isActive: true },
];

// SaaS Business Preset
export const SAAS_PRESET: CategoryPreset = {
  id: 'saas',
  name: 'SaaS / Software',
  description: 'Software-as-a-Service businesses with infrastructure, DevOps, and operational service costs',
  accounts: [
    ...BASE_ACCOUNTS,

    // REVENUE (4000s) - SaaS specific
    { id: '4000', code: '4000', name: 'Revenue', type: 'REVENUE', isSystem: true, isActive: true },
    { id: '4100', code: '4100', name: 'Subscription Revenue', type: 'REVENUE', parentId: '4000', isSystem: true, isActive: true },
    { id: '4110', code: '4110', name: 'Monthly Subscriptions (MRR)', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4120', code: '4120', name: 'Annual Subscriptions (ARR)', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4130', code: '4130', name: 'Enterprise Contracts', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4200', code: '4200', name: 'Usage-Based Revenue', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },
    { id: '4210', code: '4210', name: 'API Usage Fees', type: 'REVENUE', parentId: '4200', isSystem: false, isActive: true },
    { id: '4220', code: '4220', name: 'Overage Charges', type: 'REVENUE', parentId: '4200', isSystem: false, isActive: true },
    { id: '4300', code: '4300', name: 'Professional Services', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },
    { id: '4310', code: '4310', name: 'Implementation Services', type: 'REVENUE', parentId: '4300', isSystem: false, isActive: true },
    { id: '4320', code: '4320', name: 'Custom Development', type: 'REVENUE', parentId: '4300', isSystem: false, isActive: true },
    { id: '4330', code: '4330', name: 'Training & Support', type: 'REVENUE', parentId: '4300', isSystem: false, isActive: true },
    { id: '4900', code: '4900', name: 'Other Income', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },

    // EXPENSES (5000s) - SaaS specific
    { id: '5000', code: '5000', name: 'Expenses', type: 'EXPENSE', isSystem: true, isActive: true },

    // Infrastructure & DevOps (5100s)
    { id: '5100', code: '5100', name: 'Infrastructure & DevOps', type: 'EXPENSE', parentId: '5000', subtype: 'Infrastructure', isSystem: true, isActive: true },
    { id: '5110', code: '5110', name: 'Cloud Hosting (AWS/GCP/Azure)', type: 'EXPENSE', parentId: '5100', subtype: 'Infrastructure', isSystem: false, isActive: true },
    { id: '5120', code: '5120', name: 'Database Services', type: 'EXPENSE', parentId: '5100', subtype: 'Infrastructure', isSystem: false, isActive: true },
    { id: '5130', code: '5130', name: 'CDN & Bandwidth', type: 'EXPENSE', parentId: '5100', subtype: 'Infrastructure', isSystem: false, isActive: true },
    { id: '5140', code: '5140', name: 'Monitoring & Observability', type: 'EXPENSE', parentId: '5100', subtype: 'Infrastructure', isSystem: false, isActive: true },
    { id: '5150', code: '5150', name: 'CI/CD & DevOps Tools', type: 'EXPENSE', parentId: '5100', subtype: 'Infrastructure', isSystem: false, isActive: true },
    { id: '5160', code: '5160', name: 'Security & Compliance Tools', type: 'EXPENSE', parentId: '5100', subtype: 'Infrastructure', isSystem: false, isActive: true },

    // Operational Services (5200s)
    { id: '5200', code: '5200', name: 'Operational Services', type: 'EXPENSE', parentId: '5000', subtype: 'Operations', isSystem: true, isActive: true },
    { id: '5210', code: '5210', name: 'Payment Processing (Stripe/etc)', type: 'EXPENSE', parentId: '5200', subtype: 'Operations', isSystem: false, isActive: true },
    { id: '5220', code: '5220', name: 'Email Services (SendGrid/etc)', type: 'EXPENSE', parentId: '5200', subtype: 'Operations', isSystem: false, isActive: true },
    { id: '5230', code: '5230', name: 'Customer Support Tools', type: 'EXPENSE', parentId: '5200', subtype: 'Operations', isSystem: false, isActive: true },
    { id: '5240', code: '5240', name: 'Analytics & BI Tools', type: 'EXPENSE', parentId: '5200', subtype: 'Operations', isSystem: false, isActive: true },
    { id: '5250', code: '5250', name: 'Authentication Services', type: 'EXPENSE', parentId: '5200', subtype: 'Operations', isSystem: false, isActive: true },

    // Software & Subscriptions (5300s)
    { id: '5300', code: '5300', name: 'Software & Subscriptions', type: 'EXPENSE', parentId: '5000', subtype: 'Software', isSystem: true, isActive: true },
    { id: '5310', code: '5310', name: 'Development Tools & IDEs', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },
    { id: '5320', code: '5320', name: 'Project Management Tools', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },
    { id: '5330', code: '5330', name: 'Design & Prototyping Tools', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },
    { id: '5340', code: '5340', name: 'Communication Tools', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },

    // Marketing (5400s)
    { id: '5400', code: '5400', name: 'Marketing & Growth', type: 'EXPENSE', parentId: '5000', subtype: 'Marketing', isSystem: true, isActive: true },
    { id: '5410', code: '5410', name: 'Digital Advertising', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5420', code: '5420', name: 'Content Marketing', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5430', code: '5430', name: 'SEO & SEM', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5440', code: '5440', name: 'Marketing Automation', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5450', code: '5450', name: 'Events & Conferences', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },

    // Professional Services (5500s)
    { id: '5500', code: '5500', name: 'Professional Services', type: 'EXPENSE', parentId: '5000', subtype: 'Professional', isSystem: true, isActive: true },
    { id: '5510', code: '5510', name: 'Legal', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },
    { id: '5520', code: '5520', name: 'Accounting', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },
    { id: '5530', code: '5530', name: 'Consulting', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },

    // Payroll (5600s)
    { id: '5600', code: '5600', name: 'Payroll & Contractors', type: 'EXPENSE', parentId: '5000', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5610', code: '5610', name: 'Salaries & Wages', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5620', code: '5620', name: 'Payroll Taxes', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5630', code: '5630', name: 'Contractor Payments', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: false, isActive: true },
    { id: '5640', code: '5640', name: 'Benefits & Insurance', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: false, isActive: true },

    // Operating Expenses (5700s)
    { id: '5700', code: '5700', name: 'General & Administrative', type: 'EXPENSE', parentId: '5000', subtype: 'Operating', isSystem: true, isActive: true },
    { id: '5710', code: '5710', name: 'Office & Coworking', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5720', code: '5720', name: 'Equipment & Hardware', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5730', code: '5730', name: 'Travel & Transportation', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5740', code: '5740', name: 'Meals & Entertainment', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },

    // Bank & Financial (5800s)
    { id: '5800', code: '5800', name: 'Bank Fees & Interest', type: 'EXPENSE', parentId: '5000', subtype: 'Banking', isSystem: true, isActive: true },
    { id: '5810', code: '5810', name: 'Bank Fees', type: 'EXPENSE', parentId: '5800', subtype: 'Banking', isSystem: false, isActive: true },
    { id: '5820', code: '5820', name: 'Interest Expense', type: 'EXPENSE', parentId: '5800', subtype: 'Banking', isSystem: false, isActive: true },
    { id: '5830', code: '5830', name: 'Currency Exchange Fees', type: 'EXPENSE', parentId: '5800', subtype: 'Banking', isSystem: false, isActive: true },

    // Taxes (5900s)
    { id: '5900', code: '5900', name: 'Taxes', type: 'EXPENSE', parentId: '5000', subtype: 'Tax', isSystem: true, isActive: true },
    { id: '5910', code: '5910', name: 'VAT Expense', type: 'EXPENSE', parentId: '5900', subtype: 'Tax', isSystem: false, isActive: true },
    { id: '5920', code: '5920', name: 'Corporate Tax', type: 'EXPENSE', parentId: '5900', subtype: 'Tax', isSystem: false, isActive: true },
  ],
};

// E-commerce Business Preset
export const ECOMMERCE_PRESET: CategoryPreset = {
  id: 'ecommerce',
  name: 'E-commerce / Retail',
  description: 'Online retail businesses with inventory, fulfillment, and marketplace costs',
  accounts: [
    ...BASE_ACCOUNTS,

    // REVENUE (4000s) - E-commerce specific
    { id: '4000', code: '4000', name: 'Revenue', type: 'REVENUE', isSystem: true, isActive: true },
    { id: '4100', code: '4100', name: 'Product Sales', type: 'REVENUE', parentId: '4000', isSystem: true, isActive: true },
    { id: '4110', code: '4110', name: 'Direct Sales (Website)', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4120', code: '4120', name: 'Marketplace Sales (Amazon/eBay)', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4130', code: '4130', name: 'Wholesale Sales', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4200', code: '4200', name: 'Service Revenue', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },
    { id: '4210', code: '4210', name: 'Shipping Revenue', type: 'REVENUE', parentId: '4200', isSystem: false, isActive: true },
    { id: '4220', code: '4220', name: 'Extended Warranties', type: 'REVENUE', parentId: '4200', isSystem: false, isActive: true },
    { id: '4900', code: '4900', name: 'Other Income', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },

    // EXPENSES (5000s) - E-commerce specific
    { id: '5000', code: '5000', name: 'Expenses', type: 'EXPENSE', isSystem: true, isActive: true },

    // Cost of Goods Sold (5100s)
    { id: '5100', code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE', parentId: '5000', subtype: 'COGS', isSystem: true, isActive: true },
    { id: '5110', code: '5110', name: 'Product Purchases', type: 'EXPENSE', parentId: '5100', subtype: 'COGS', isSystem: false, isActive: true },
    { id: '5120', code: '5120', name: 'Manufacturing Costs', type: 'EXPENSE', parentId: '5100', subtype: 'COGS', isSystem: false, isActive: true },
    { id: '5130', code: '5130', name: 'Packaging & Materials', type: 'EXPENSE', parentId: '5100', subtype: 'COGS', isSystem: false, isActive: true },
    { id: '5140', code: '5140', name: 'Import Duties & Tariffs', type: 'EXPENSE', parentId: '5100', subtype: 'COGS', isSystem: false, isActive: true },

    // Fulfillment & Shipping (5200s)
    { id: '5200', code: '5200', name: 'Fulfillment & Shipping', type: 'EXPENSE', parentId: '5000', subtype: 'Fulfillment', isSystem: true, isActive: true },
    { id: '5210', code: '5210', name: 'Shipping & Postage', type: 'EXPENSE', parentId: '5200', subtype: 'Fulfillment', isSystem: false, isActive: true },
    { id: '5220', code: '5220', name: 'Warehouse & Storage', type: 'EXPENSE', parentId: '5200', subtype: 'Fulfillment', isSystem: false, isActive: true },
    { id: '5230', code: '5230', name: '3PL Services', type: 'EXPENSE', parentId: '5200', subtype: 'Fulfillment', isSystem: false, isActive: true },
    { id: '5240', code: '5240', name: 'Returns Processing', type: 'EXPENSE', parentId: '5200', subtype: 'Fulfillment', isSystem: false, isActive: true },

    // Platform & Marketplace Fees (5300s)
    { id: '5300', code: '5300', name: 'Platform & Marketplace Fees', type: 'EXPENSE', parentId: '5000', subtype: 'Platform', isSystem: true, isActive: true },
    { id: '5310', code: '5310', name: 'E-commerce Platform (Shopify/etc)', type: 'EXPENSE', parentId: '5300', subtype: 'Platform', isSystem: false, isActive: true },
    { id: '5320', code: '5320', name: 'Marketplace Fees (Amazon/eBay)', type: 'EXPENSE', parentId: '5300', subtype: 'Platform', isSystem: false, isActive: true },
    { id: '5330', code: '5330', name: 'Payment Processing', type: 'EXPENSE', parentId: '5300', subtype: 'Platform', isSystem: false, isActive: true },

    // Marketing (5400s)
    { id: '5400', code: '5400', name: 'Marketing & Advertising', type: 'EXPENSE', parentId: '5000', subtype: 'Marketing', isSystem: true, isActive: true },
    { id: '5410', code: '5410', name: 'Paid Advertising (Google/Meta)', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5420', code: '5420', name: 'Influencer & Affiliate Marketing', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5430', code: '5430', name: 'Email Marketing', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5440', code: '5440', name: 'Photography & Content', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },

    // Professional Services (5500s)
    { id: '5500', code: '5500', name: 'Professional Services', type: 'EXPENSE', parentId: '5000', subtype: 'Professional', isSystem: true, isActive: true },
    { id: '5510', code: '5510', name: 'Legal', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },
    { id: '5520', code: '5520', name: 'Accounting', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },

    // Payroll (5600s)
    { id: '5600', code: '5600', name: 'Payroll', type: 'EXPENSE', parentId: '5000', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5610', code: '5610', name: 'Salaries & Wages', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5620', code: '5620', name: 'Payroll Taxes', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },

    // Operating Expenses (5700s)
    { id: '5700', code: '5700', name: 'Operating Expenses', type: 'EXPENSE', parentId: '5000', subtype: 'Operating', isSystem: true, isActive: true },
    { id: '5710', code: '5710', name: 'Office & Rent', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5720', code: '5720', name: 'Software & Subscriptions', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5730', code: '5730', name: 'Insurance', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },

    // Bank & Financial (5800s)
    { id: '5800', code: '5800', name: 'Bank Fees & Interest', type: 'EXPENSE', parentId: '5000', subtype: 'Banking', isSystem: true, isActive: true },
    { id: '5810', code: '5810', name: 'Bank Fees', type: 'EXPENSE', parentId: '5800', subtype: 'Banking', isSystem: false, isActive: true },
    { id: '5820', code: '5820', name: 'Interest Expense', type: 'EXPENSE', parentId: '5800', subtype: 'Banking', isSystem: false, isActive: true },

    // Taxes (5900s)
    { id: '5900', code: '5900', name: 'Taxes', type: 'EXPENSE', parentId: '5000', subtype: 'Tax', isSystem: true, isActive: true },
    { id: '5910', code: '5910', name: 'Sales Tax', type: 'EXPENSE', parentId: '5900', subtype: 'Tax', isSystem: false, isActive: true },
    { id: '5920', code: '5920', name: 'VAT Expense', type: 'EXPENSE', parentId: '5900', subtype: 'Tax', isSystem: false, isActive: true },
    { id: '5930', code: '5930', name: 'Corporate Tax', type: 'EXPENSE', parentId: '5900', subtype: 'Tax', isSystem: false, isActive: true },
  ],
};

// Agency / Creative Services Preset
export const AGENCY_PRESET: CategoryPreset = {
  id: 'agency',
  name: 'Agency / Creative',
  description: 'Marketing agencies, design studios, and creative service businesses',
  accounts: [
    ...BASE_ACCOUNTS,

    // REVENUE (4000s) - Agency specific
    { id: '4000', code: '4000', name: 'Revenue', type: 'REVENUE', isSystem: true, isActive: true },
    { id: '4100', code: '4100', name: 'Project Revenue', type: 'REVENUE', parentId: '4000', isSystem: true, isActive: true },
    { id: '4110', code: '4110', name: 'Design Projects', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4120', code: '4120', name: 'Development Projects', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4130', code: '4130', name: 'Marketing Campaigns', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4140', code: '4140', name: 'Strategy & Consulting', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4200', code: '4200', name: 'Retainer Revenue', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },
    { id: '4210', code: '4210', name: 'Monthly Retainers', type: 'REVENUE', parentId: '4200', isSystem: false, isActive: true },
    { id: '4220', code: '4220', name: 'Managed Services', type: 'REVENUE', parentId: '4200', isSystem: false, isActive: true },
    { id: '4300', code: '4300', name: 'Media & Ad Spend Revenue', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },
    { id: '4900', code: '4900', name: 'Other Income', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },

    // EXPENSES (5000s) - Agency specific
    { id: '5000', code: '5000', name: 'Expenses', type: 'EXPENSE', isSystem: true, isActive: true },

    // Subcontractors & Freelancers (5100s)
    { id: '5100', code: '5100', name: 'Subcontractors & Freelancers', type: 'EXPENSE', parentId: '5000', subtype: 'Contractors', isSystem: true, isActive: true },
    { id: '5110', code: '5110', name: 'Freelance Designers', type: 'EXPENSE', parentId: '5100', subtype: 'Contractors', isSystem: false, isActive: true },
    { id: '5120', code: '5120', name: 'Freelance Developers', type: 'EXPENSE', parentId: '5100', subtype: 'Contractors', isSystem: false, isActive: true },
    { id: '5130', code: '5130', name: 'Copywriters & Content', type: 'EXPENSE', parentId: '5100', subtype: 'Contractors', isSystem: false, isActive: true },
    { id: '5140', code: '5140', name: 'Video & Photography', type: 'EXPENSE', parentId: '5100', subtype: 'Contractors', isSystem: false, isActive: true },
    { id: '5150', code: '5150', name: 'Specialized Consultants', type: 'EXPENSE', parentId: '5100', subtype: 'Contractors', isSystem: false, isActive: true },

    // Client Media Spend (5200s)
    { id: '5200', code: '5200', name: 'Client Media Spend', type: 'EXPENSE', parentId: '5000', subtype: 'Media', isSystem: true, isActive: true },
    { id: '5210', code: '5210', name: 'Google Ads (Pass-through)', type: 'EXPENSE', parentId: '5200', subtype: 'Media', isSystem: false, isActive: true },
    { id: '5220', code: '5220', name: 'Meta Ads (Pass-through)', type: 'EXPENSE', parentId: '5200', subtype: 'Media', isSystem: false, isActive: true },
    { id: '5230', code: '5230', name: 'Other Paid Media', type: 'EXPENSE', parentId: '5200', subtype: 'Media', isSystem: false, isActive: true },

    // Software & Tools (5300s)
    { id: '5300', code: '5300', name: 'Software & Tools', type: 'EXPENSE', parentId: '5000', subtype: 'Software', isSystem: true, isActive: true },
    { id: '5310', code: '5310', name: 'Design Software (Adobe/Figma)', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },
    { id: '5320', code: '5320', name: 'Project Management', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },
    { id: '5330', code: '5330', name: 'Marketing Tools', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },
    { id: '5340', code: '5340', name: 'Stock Assets & Licenses', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },

    // Marketing (5400s)
    { id: '5400', code: '5400', name: 'Agency Marketing', type: 'EXPENSE', parentId: '5000', subtype: 'Marketing', isSystem: true, isActive: true },
    { id: '5410', code: '5410', name: 'Agency Website & Portfolio', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5420', code: '5420', name: 'Business Development', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5430', code: '5430', name: 'Awards & Competitions', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },

    // Professional Services (5500s)
    { id: '5500', code: '5500', name: 'Professional Services', type: 'EXPENSE', parentId: '5000', subtype: 'Professional', isSystem: true, isActive: true },
    { id: '5510', code: '5510', name: 'Legal', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },
    { id: '5520', code: '5520', name: 'Accounting', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },

    // Payroll (5600s)
    { id: '5600', code: '5600', name: 'Payroll', type: 'EXPENSE', parentId: '5000', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5610', code: '5610', name: 'Salaries & Wages', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5620', code: '5620', name: 'Payroll Taxes', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5630', code: '5630', name: 'Benefits', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: false, isActive: true },

    // Operating Expenses (5700s)
    { id: '5700', code: '5700', name: 'Operating Expenses', type: 'EXPENSE', parentId: '5000', subtype: 'Operating', isSystem: true, isActive: true },
    { id: '5710', code: '5710', name: 'Office & Studio Space', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5720', code: '5720', name: 'Equipment & Supplies', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5730', code: '5730', name: 'Client Entertainment', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5740', code: '5740', name: 'Travel', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },

    // Bank & Financial (5800s)
    { id: '5800', code: '5800', name: 'Bank Fees & Interest', type: 'EXPENSE', parentId: '5000', subtype: 'Banking', isSystem: true, isActive: true },
    { id: '5810', code: '5810', name: 'Bank Fees', type: 'EXPENSE', parentId: '5800', subtype: 'Banking', isSystem: false, isActive: true },
    { id: '5820', code: '5820', name: 'Payment Processing', type: 'EXPENSE', parentId: '5800', subtype: 'Banking', isSystem: false, isActive: true },

    // Taxes (5900s)
    { id: '5900', code: '5900', name: 'Taxes', type: 'EXPENSE', parentId: '5000', subtype: 'Tax', isSystem: true, isActive: true },
    { id: '5910', code: '5910', name: 'VAT Expense', type: 'EXPENSE', parentId: '5900', subtype: 'Tax', isSystem: false, isActive: true },
    { id: '5920', code: '5920', name: 'Corporate Tax', type: 'EXPENSE', parentId: '5900', subtype: 'Tax', isSystem: false, isActive: true },
  ],
};

// Consulting / Professional Services Preset
export const CONSULTING_PRESET: CategoryPreset = {
  id: 'consulting',
  name: 'Consulting / Professional Services',
  description: 'Management consulting, IT consulting, and professional service firms',
  accounts: [
    ...BASE_ACCOUNTS,

    // REVENUE (4000s) - Consulting specific
    { id: '4000', code: '4000', name: 'Revenue', type: 'REVENUE', isSystem: true, isActive: true },
    { id: '4100', code: '4100', name: 'Consulting Fees', type: 'REVENUE', parentId: '4000', isSystem: true, isActive: true },
    { id: '4110', code: '4110', name: 'Hourly Consulting', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4120', code: '4120', name: 'Project-Based Fees', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4130', code: '4130', name: 'Retainer Fees', type: 'REVENUE', parentId: '4100', isSystem: false, isActive: true },
    { id: '4200', code: '4200', name: 'Training & Workshops', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },
    { id: '4210', code: '4210', name: 'Corporate Training', type: 'REVENUE', parentId: '4200', isSystem: false, isActive: true },
    { id: '4220', code: '4220', name: 'Public Workshops', type: 'REVENUE', parentId: '4200', isSystem: false, isActive: true },
    { id: '4300', code: '4300', name: 'Speaking & Events', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },
    { id: '4900', code: '4900', name: 'Other Income', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },

    // EXPENSES (5000s) - Consulting specific
    { id: '5000', code: '5000', name: 'Expenses', type: 'EXPENSE', isSystem: true, isActive: true },

    // Subcontractors (5100s)
    { id: '5100', code: '5100', name: 'Subcontractors', type: 'EXPENSE', parentId: '5000', subtype: 'Contractors', isSystem: true, isActive: true },
    { id: '5110', code: '5110', name: 'Associate Consultants', type: 'EXPENSE', parentId: '5100', subtype: 'Contractors', isSystem: false, isActive: true },
    { id: '5120', code: '5120', name: 'Research Assistants', type: 'EXPENSE', parentId: '5100', subtype: 'Contractors', isSystem: false, isActive: true },
    { id: '5130', code: '5130', name: 'Specialized Experts', type: 'EXPENSE', parentId: '5100', subtype: 'Contractors', isSystem: false, isActive: true },

    // Professional Development (5200s)
    { id: '5200', code: '5200', name: 'Professional Development', type: 'EXPENSE', parentId: '5000', subtype: 'Development', isSystem: true, isActive: true },
    { id: '5210', code: '5210', name: 'Certifications & Courses', type: 'EXPENSE', parentId: '5200', subtype: 'Development', isSystem: false, isActive: true },
    { id: '5220', code: '5220', name: 'Industry Conferences', type: 'EXPENSE', parentId: '5200', subtype: 'Development', isSystem: false, isActive: true },
    { id: '5230', code: '5230', name: 'Books & Research', type: 'EXPENSE', parentId: '5200', subtype: 'Development', isSystem: false, isActive: true },
    { id: '5240', code: '5240', name: 'Professional Memberships', type: 'EXPENSE', parentId: '5200', subtype: 'Development', isSystem: false, isActive: true },

    // Software & Tools (5300s)
    { id: '5300', code: '5300', name: 'Software & Tools', type: 'EXPENSE', parentId: '5000', subtype: 'Software', isSystem: true, isActive: true },
    { id: '5310', code: '5310', name: 'Office Software', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },
    { id: '5320', code: '5320', name: 'Project Management', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },
    { id: '5330', code: '5330', name: 'Research & Data Tools', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },
    { id: '5340', code: '5340', name: 'Communication Tools', type: 'EXPENSE', parentId: '5300', subtype: 'Software', isSystem: false, isActive: true },

    // Marketing (5400s)
    { id: '5400', code: '5400', name: 'Business Development', type: 'EXPENSE', parentId: '5000', subtype: 'Marketing', isSystem: true, isActive: true },
    { id: '5410', code: '5410', name: 'Website & Branding', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5420', code: '5420', name: 'Content Marketing', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5430', code: '5430', name: 'Networking & Events', type: 'EXPENSE', parentId: '5400', subtype: 'Marketing', isSystem: false, isActive: true },

    // Professional Services (5500s)
    { id: '5500', code: '5500', name: 'Professional Services', type: 'EXPENSE', parentId: '5000', subtype: 'Professional', isSystem: true, isActive: true },
    { id: '5510', code: '5510', name: 'Legal', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },
    { id: '5520', code: '5520', name: 'Accounting', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },
    { id: '5530', code: '5530', name: 'Insurance (E&O/Professional)', type: 'EXPENSE', parentId: '5500', subtype: 'Professional', isSystem: false, isActive: true },

    // Payroll (5600s)
    { id: '5600', code: '5600', name: 'Payroll', type: 'EXPENSE', parentId: '5000', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5610', code: '5610', name: 'Salaries & Wages', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5620', code: '5620', name: 'Payroll Taxes', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },

    // Operating Expenses (5700s)
    { id: '5700', code: '5700', name: 'Operating Expenses', type: 'EXPENSE', parentId: '5000', subtype: 'Operating', isSystem: true, isActive: true },
    { id: '5710', code: '5710', name: 'Office & Coworking', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5720', code: '5720', name: 'Travel & Transportation', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5730', code: '5730', name: 'Client Meals & Entertainment', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5740', code: '5740', name: 'Office Supplies', type: 'EXPENSE', parentId: '5700', subtype: 'Operating', isSystem: false, isActive: true },

    // Bank & Financial (5800s)
    { id: '5800', code: '5800', name: 'Bank Fees & Interest', type: 'EXPENSE', parentId: '5000', subtype: 'Banking', isSystem: true, isActive: true },
    { id: '5810', code: '5810', name: 'Bank Fees', type: 'EXPENSE', parentId: '5800', subtype: 'Banking', isSystem: false, isActive: true },
    { id: '5820', code: '5820', name: 'Payment Processing', type: 'EXPENSE', parentId: '5800', subtype: 'Banking', isSystem: false, isActive: true },

    // Taxes (5900s)
    { id: '5900', code: '5900', name: 'Taxes', type: 'EXPENSE', parentId: '5000', subtype: 'Tax', isSystem: true, isActive: true },
    { id: '5910', code: '5910', name: 'VAT Expense', type: 'EXPENSE', parentId: '5900', subtype: 'Tax', isSystem: false, isActive: true },
    { id: '5920', code: '5920', name: 'Corporate Tax', type: 'EXPENSE', parentId: '5900', subtype: 'Tax', isSystem: false, isActive: true },
  ],
};

// Freelancer / Sole Proprietor Preset (Default)
export const FREELANCER_PRESET: CategoryPreset = {
  id: 'freelancer',
  name: 'Freelancer / General',
  description: 'General purpose categories for freelancers and small businesses',
  accounts: [
    ...BASE_ACCOUNTS,

    // REVENUE (4000s)
    { id: '4000', code: '4000', name: 'Revenue', type: 'REVENUE', isSystem: true, isActive: true },
    { id: '4100', code: '4100', name: 'Service Revenue', type: 'REVENUE', parentId: '4000', isSystem: true, isActive: true },
    { id: '4200', code: '4200', name: 'Product Revenue', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },
    { id: '4900', code: '4900', name: 'Other Income', type: 'REVENUE', parentId: '4000', isSystem: false, isActive: true },

    // EXPENSES (5000s)
    { id: '5000', code: '5000', name: 'Expenses', type: 'EXPENSE', isSystem: true, isActive: true },

    // Operating Expenses (5100s)
    { id: '5100', code: '5100', name: 'Operating Expenses', type: 'EXPENSE', parentId: '5000', subtype: 'Operating', isSystem: true, isActive: true },
    { id: '5110', code: '5110', name: 'Rent', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5120', code: '5120', name: 'Utilities', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5130', code: '5130', name: 'Software & Subscriptions', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5140', code: '5140', name: 'Office Supplies', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5150', code: '5150', name: 'Internet & Phone', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },
    { id: '5160', code: '5160', name: 'Insurance', type: 'EXPENSE', parentId: '5100', subtype: 'Operating', isSystem: false, isActive: true },

    // Professional Services (5200s)
    { id: '5200', code: '5200', name: 'Professional Services', type: 'EXPENSE', parentId: '5000', subtype: 'Professional', isSystem: true, isActive: true },
    { id: '5210', code: '5210', name: 'Legal', type: 'EXPENSE', parentId: '5200', subtype: 'Professional', isSystem: false, isActive: true },
    { id: '5220', code: '5220', name: 'Accounting', type: 'EXPENSE', parentId: '5200', subtype: 'Professional', isSystem: false, isActive: true },
    { id: '5230', code: '5230', name: 'Consulting', type: 'EXPENSE', parentId: '5200', subtype: 'Professional', isSystem: false, isActive: true },

    // Marketing & Advertising (5300s)
    { id: '5300', code: '5300', name: 'Marketing & Advertising', type: 'EXPENSE', parentId: '5000', subtype: 'Marketing', isSystem: true, isActive: true },
    { id: '5310', code: '5310', name: 'Online Advertising', type: 'EXPENSE', parentId: '5300', subtype: 'Marketing', isSystem: false, isActive: true },
    { id: '5320', code: '5320', name: 'Content & Design', type: 'EXPENSE', parentId: '5300', subtype: 'Marketing', isSystem: false, isActive: true },

    // Travel & Entertainment (5400s)
    { id: '5400', code: '5400', name: 'Travel & Entertainment', type: 'EXPENSE', parentId: '5000', subtype: 'Travel', isSystem: true, isActive: true },
    { id: '5410', code: '5410', name: 'Travel', type: 'EXPENSE', parentId: '5400', subtype: 'Travel', isSystem: false, isActive: true },
    { id: '5420', code: '5420', name: 'Meals & Entertainment', type: 'EXPENSE', parentId: '5400', subtype: 'Travel', isSystem: false, isActive: true },

    // Bank Fees & Interest (5500s)
    { id: '5500', code: '5500', name: 'Bank Fees & Interest', type: 'EXPENSE', parentId: '5000', subtype: 'Banking', isSystem: true, isActive: true },
    { id: '5510', code: '5510', name: 'Bank Fees', type: 'EXPENSE', parentId: '5500', subtype: 'Banking', isSystem: false, isActive: true },
    { id: '5520', code: '5520', name: 'Interest Expense', type: 'EXPENSE', parentId: '5500', subtype: 'Banking', isSystem: false, isActive: true },
    { id: '5530', code: '5530', name: 'Payment Processing Fees', type: 'EXPENSE', parentId: '5500', subtype: 'Banking', isSystem: false, isActive: true },

    // Payroll (5600s)
    { id: '5600', code: '5600', name: 'Payroll', type: 'EXPENSE', parentId: '5000', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5610', code: '5610', name: 'Salaries & Wages', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },
    { id: '5620', code: '5620', name: 'Payroll Taxes', type: 'EXPENSE', parentId: '5600', subtype: 'Payroll', isSystem: true, isActive: true },

    // Cost of Goods Sold (5700s)
    { id: '5700', code: '5700', name: 'Cost of Goods Sold', type: 'EXPENSE', parentId: '5000', subtype: 'COGS', isSystem: true, isActive: true },

    // Taxes (5800s)
    { id: '5800', code: '5800', name: 'Taxes', type: 'EXPENSE', parentId: '5000', subtype: 'Tax', isSystem: true, isActive: true },
    { id: '5810', code: '5810', name: 'VAT Expense', type: 'EXPENSE', parentId: '5800', subtype: 'Tax', isSystem: false, isActive: true },
    { id: '5820', code: '5820', name: 'Corporate Tax', type: 'EXPENSE', parentId: '5800', subtype: 'Tax', isSystem: false, isActive: true },

    // Other Expenses (5900s)
    { id: '5900', code: '5900', name: 'Other Expenses', type: 'EXPENSE', parentId: '5000', isSystem: true, isActive: true },
  ],
};

// All available presets
export const CATEGORY_PRESETS: CategoryPreset[] = [
  SAAS_PRESET,
  ECOMMERCE_PRESET,
  AGENCY_PRESET,
  CONSULTING_PRESET,
  FREELANCER_PRESET,
];

// Export/Import format for categories
export interface CategoryExportData {
  version: string;
  exportedAt: string;
  presetId?: string;
  presetName?: string;
  accounts: Omit<ChartAccount, 'createdAt' | 'updatedAt'>[];
}

export function exportCategoriesToJson(
  accounts: ChartAccount[],
  presetId?: string,
  presetName?: string
): string {
  const exportData: CategoryExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    presetId,
    presetName,
    accounts: accounts.map(({ createdAt, updatedAt, ...rest }) => rest),
  };
  return JSON.stringify(exportData, null, 2);
}

export function parseImportedCategories(jsonData: string): CategoryExportData {
  const data = JSON.parse(jsonData);

  // Validate required fields
  if (!data.accounts || !Array.isArray(data.accounts)) {
    throw new Error('Invalid category data: missing accounts array');
  }

  // Validate each account has required fields
  for (const account of data.accounts) {
    if (!account.id || !account.code || !account.name || !account.type) {
      throw new Error('Invalid account data: missing required fields (id, code, name, type)');
    }
  }

  return {
    version: data.version || '1.0',
    exportedAt: data.exportedAt || new Date().toISOString(),
    presetId: data.presetId,
    presetName: data.presetName,
    accounts: data.accounts,
  };
}
