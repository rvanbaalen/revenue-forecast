/**
 * Tests for LLM Prompt utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseRulesetResponse,
  applyRulesToTransactions,
  convertLLMRuleToMappingRule,
} from './llm-prompt';
import type { LLMCategorizationRule, Transaction, Subcategory } from '../types';

describe('LLM Prompt Utilities', () => {
  describe('parseRulesetResponse', () => {
    it('should parse valid JSON response with rules', () => {
      const response = JSON.stringify({
        rules: [
          {
            pattern: 'GITHUB',
            matchType: 'contains',
            matchField: 'name',
            category: 'expense',
            subcategory: 'Software Subscriptions',
            incomeType: null,
            confidence: 'high',
            reasoning: 'GitHub subscription',
          },
        ],
      });

      const result = parseRulesetResponse(response);
      expect('rules' in result).toBe(true);
      if ('rules' in result) {
        expect(result.rules).toHaveLength(1);
        expect(result.rules[0].pattern).toBe('GITHUB');
      }
    });

    it('should extract JSON from text with surrounding content', () => {
      const response = `Here are the rules:
      {
        "rules": [
          {
            "pattern": "STRIPE",
            "matchType": "contains",
            "matchField": "name",
            "category": "income",
            "subcategory": "MRR",
            "incomeType": "foreign",
            "confidence": "high",
            "reasoning": "Stripe payout"
          }
        ]
      }
      Let me know if you need changes.`;

      const result = parseRulesetResponse(response);
      expect('rules' in result).toBe(true);
      if ('rules' in result) {
        expect(result.rules).toHaveLength(1);
        expect(result.rules[0].pattern).toBe('STRIPE');
        expect(result.rules[0].incomeType).toBe('foreign');
      }
    });

    it('should return error for invalid JSON', () => {
      const result = parseRulesetResponse('not valid json');
      expect('error' in result).toBe(true);
    });

    it('should return error for missing rules array', () => {
      const result = parseRulesetResponse('{"data": []}');
      expect('error' in result).toBe(true);
    });

    it('should validate income rules require incomeType', () => {
      const response = JSON.stringify({
        rules: [
          {
            pattern: 'PAYMENT',
            matchType: 'contains',
            matchField: 'name',
            category: 'income',
            subcategory: 'Revenue',
            incomeType: null, // Should fail - income needs local or foreign
            confidence: 'high',
            reasoning: 'Payment received',
          },
        ],
      });

      const result = parseRulesetResponse(response);
      expect('error' in result).toBe(true);
    });

    it('should accept valid income rules with incomeType', () => {
      const response = JSON.stringify({
        rules: [
          {
            pattern: 'PAYMENT',
            matchType: 'contains',
            matchField: 'name',
            category: 'income',
            subcategory: 'Revenue',
            incomeType: 'local',
            confidence: 'high',
            reasoning: 'Payment received',
          },
        ],
      });

      const result = parseRulesetResponse(response);
      expect('rules' in result).toBe(true);
    });
  });

  describe('applyRulesToTransactions', () => {
    const createTransaction = (
      id: string,
      name: string,
      memo: string = ''
    ): Transaction => ({
      id,
      accountId: 'acc-1',
      fitId: `fit-${id}`,
      date: '2024-01-15',
      amount: '-50.00',
      name,
      memo,
      type: 'DEBIT',
      category: 'uncategorized',
      subcategory: '',
      importBatchId: 'batch-1',
      createdAt: '2024-01-15T00:00:00Z',
    });

    const subcategories: Subcategory[] = [
      { id: '1', contextId: 'ctx-1', name: 'Software Subscriptions', type: 'expense', createdAt: '' },
    ];

    it('should apply rules to matching transactions', () => {
      const transactions = [
        createTransaction('1', 'GITHUB INC'),
        createTransaction('2', 'AMAZON WEB SERVICES'),
        createTransaction('3', 'COFFEE SHOP'),
      ];

      const rules: LLMCategorizationRule[] = [
        {
          pattern: 'GITHUB',
          matchType: 'contains',
          matchField: 'name',
          category: 'expense',
          subcategory: 'Software Subscriptions',
          incomeType: null,
          confidence: 'high',
          reasoning: 'GitHub subscription',
        },
      ];

      const result = applyRulesToTransactions(transactions, rules, subcategories);

      expect(result.appliedCount).toBe(1);
      expect(result.unmatchedCount).toBe(2);
      expect(result.updatedTransactions[0].category).toBe('expense');
      expect(result.updatedTransactions[0].subcategory).toBe('Software Subscriptions');
    });

    it('should apply first matching rule only', () => {
      const transactions = [createTransaction('1', 'GITHUB COPILOT')];

      const rules: LLMCategorizationRule[] = [
        {
          pattern: 'GITHUB',
          matchType: 'contains',
          matchField: 'name',
          category: 'expense',
          subcategory: 'Software Subscriptions',
          incomeType: null,
          confidence: 'high',
          reasoning: 'GitHub',
        },
        {
          pattern: 'COPILOT',
          matchType: 'contains',
          matchField: 'name',
          category: 'expense',
          subcategory: 'AI Tools',
          incomeType: null,
          confidence: 'high',
          reasoning: 'AI',
        },
      ];

      const result = applyRulesToTransactions(transactions, rules, subcategories);

      expect(result.appliedCount).toBe(1);
      // First rule should win
      expect(result.updatedTransactions[0].subcategory).toBe('Software Subscriptions');
    });

    it('should handle startsWith match type', () => {
      const transactions = [
        createTransaction('1', 'STRIPE PAYOUT'),
        createTransaction('2', 'PAY WITH STRIPE'),
      ];

      const rules: LLMCategorizationRule[] = [
        {
          pattern: 'STRIPE',
          matchType: 'startsWith',
          matchField: 'name',
          category: 'income',
          subcategory: 'Revenue',
          incomeType: 'foreign',
          confidence: 'high',
          reasoning: 'Stripe payout',
        },
      ];

      const result = applyRulesToTransactions(transactions, rules, subcategories);

      // Only the first one starts with STRIPE
      expect(result.appliedCount).toBe(1);
      expect(result.updatedTransactions[0].category).toBe('income');
      expect(result.updatedTransactions[0].incomeType).toBe('foreign');
    });

    it('should match on memo field', () => {
      const transactions = [createTransaction('1', 'PAYMENT', 'Invoice #123 ACME Corp')];

      const rules: LLMCategorizationRule[] = [
        {
          pattern: 'ACME',
          matchType: 'contains',
          matchField: 'memo',
          category: 'income',
          subcategory: 'Client Revenue',
          incomeType: 'local',
          confidence: 'high',
          reasoning: 'ACME client',
        },
      ];

      const result = applyRulesToTransactions(transactions, rules, subcategories);

      expect(result.appliedCount).toBe(1);
      expect(result.updatedTransactions[0].subcategory).toBe('Client Revenue');
    });

    it('should track new subcategories', () => {
      const transactions = [createTransaction('1', 'NEW SERVICE')];

      const rules: LLMCategorizationRule[] = [
        {
          pattern: 'NEW SERVICE',
          matchType: 'contains',
          matchField: 'name',
          category: 'expense',
          subcategory: 'New Category',
          incomeType: null,
          confidence: 'high',
          reasoning: 'New category',
        },
      ];

      const result = applyRulesToTransactions(transactions, rules, []);

      expect(result.newSubcategories).toHaveLength(1);
      expect(result.newSubcategories[0].name).toBe('New Category');
      expect(result.newSubcategories[0].type).toBe('expense');
    });
  });

  describe('convertLLMRuleToMappingRule', () => {
    const contextId = 'ctx-123';

    it('should convert contains matchType correctly', () => {
      const llmRule: LLMCategorizationRule = {
        pattern: 'GITHUB',
        matchType: 'contains',
        matchField: 'name',
        category: 'expense',
        subcategory: 'Software Subscriptions',
        incomeType: null,
        confidence: 'high',
        reasoning: 'GitHub subscription',
      };

      const result = convertLLMRuleToMappingRule(llmRule, contextId, 10);

      expect(result.pattern).toBe('GITHUB');
      expect(result.patternType).toBe('contains');
      expect(result.matchField).toBe('name');
      expect(result.category).toBe('expense');
      expect(result.subcategory).toBe('Software Subscriptions');
      expect(result.priority).toBe(10);
      expect(result.isActive).toBe(true);
      expect(result.contextId).toBe(contextId);
    });

    it('should convert exact matchType correctly', () => {
      const llmRule: LLMCategorizationRule = {
        pattern: 'PAYROLL',
        matchType: 'exact',
        matchField: 'name',
        category: 'expense',
        subcategory: 'Salaries',
        incomeType: null,
        confidence: 'high',
        reasoning: 'Exact payroll match',
      };

      const result = convertLLMRuleToMappingRule(llmRule, contextId, 5);

      expect(result.pattern).toBe('PAYROLL');
      expect(result.patternType).toBe('exact');
    });

    it('should convert startsWith matchType to regex', () => {
      const llmRule: LLMCategorizationRule = {
        pattern: 'STRIPE',
        matchType: 'startsWith',
        matchField: 'name',
        category: 'income',
        subcategory: 'Revenue',
        incomeType: 'foreign',
        confidence: 'high',
        reasoning: 'Stripe payout',
      };

      const result = convertLLMRuleToMappingRule(llmRule, contextId, 1);

      expect(result.pattern).toBe('^STRIPE');
      expect(result.patternType).toBe('regex');
    });

    it('should handle income type for income category', () => {
      const llmRule: LLMCategorizationRule = {
        pattern: 'CLIENT',
        matchType: 'contains',
        matchField: 'both',
        category: 'income',
        subcategory: 'Consulting',
        incomeType: 'local',
        confidence: 'high',
        reasoning: 'Local client',
      };

      const result = convertLLMRuleToMappingRule(llmRule, contextId, 1);

      expect(result.incomeType).toBe('local');
      expect(result.matchField).toBe('both');
    });

    it('should handle null incomeType by setting undefined', () => {
      const llmRule: LLMCategorizationRule = {
        pattern: 'EXPENSE',
        matchType: 'contains',
        matchField: 'name',
        category: 'expense',
        subcategory: 'General',
        incomeType: null,
        confidence: 'high',
        reasoning: 'Expense',
      };

      const result = convertLLMRuleToMappingRule(llmRule, contextId, 1);

      expect(result.incomeType).toBeUndefined();
    });

    it('should preserve priority for rule ordering', () => {
      const llmRule: LLMCategorizationRule = {
        pattern: 'TEST',
        matchType: 'contains',
        matchField: 'name',
        category: 'expense',
        subcategory: 'Test',
        incomeType: null,
        confidence: 'high',
        reasoning: 'Test',
      };

      const result1 = convertLLMRuleToMappingRule(llmRule, contextId, 100);
      const result2 = convertLLMRuleToMappingRule(llmRule, contextId, 1);

      expect(result1.priority).toBe(100);
      expect(result2.priority).toBe(1);
    });
  });
});
