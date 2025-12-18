/**
 * LLMCategorizeDialog - AI categorization dialog
 *
 * Allows copying a prompt for an LLM and pasting the response
 * to automatically categorize transactions.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transaction, Subcategory } from '../../types';
import type { RuleApplicationResult } from '../../types';
import {
  generateRulesetPrompt,
  parseRulesetResponse,
  applyRulesToTransactions,
  convertLLMRuleToMappingRule,
} from '../../utils/llm-prompt';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './constants';

interface LLMCategorizeDialogProps {
  open: boolean;
  onClose: () => void;
  uncategorizedTransactions: Transaction[];
  subcategories: Subcategory[];
  activeContextId: string | null;
  onUpdateTransactions: (transactions: Transaction[]) => Promise<void>;
  onAddSubcategory: (name: string, type: 'income' | 'expense') => Promise<Subcategory>;
  onAddMappingRule: (rule: Parameters<typeof convertLLMRuleToMappingRule>[0], contextId: string, priority: number) => Promise<void>;
}

interface ApplyResults {
  appliedCount: number;
  unmatchedCount: number;
  ruleApplications: RuleApplicationResult[];
}

export function LLMCategorizeDialog({
  open,
  onClose,
  uncategorizedTransactions,
  subcategories,
  activeContextId,
  onUpdateTransactions,
  onAddSubcategory,
  onAddMappingRule,
}: LLMCategorizeDialogProps) {
  const [llmPrompt] = useState(() =>
    generateRulesetPrompt(uncategorizedTransactions, subcategories)
  );
  const [llmResponse, setLlmResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applyResults, setApplyResults] = useState<ApplyResults | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(llmPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = async () => {
    const result = parseRulesetResponse(llmResponse);
    if ('error' in result) {
      setParseError(result.error);
      return;
    }

    setIsApplying(true);
    try {
      const {
        updatedTransactions,
        newSubcategories,
        appliedCount,
        unmatchedCount,
        ruleApplications,
      } = applyRulesToTransactions(uncategorizedTransactions, result.rules, subcategories);

      setApplyResults({ appliedCount, unmatchedCount, ruleApplications });

      if (appliedCount > 0) {
        await onUpdateTransactions(updatedTransactions);

        // Add any new subcategories
        for (const newSub of newSubcategories) {
          await onAddSubcategory(newSub.name, newSub.type);
        }

        // Save rules as mapping rules
        if (activeContextId) {
          for (let i = 0; i < ruleApplications.length; i++) {
            await onAddMappingRule(
              ruleApplications[i].rule,
              activeContextId,
              ruleApplications.length - i
            );
          }
        }
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setLlmResponse('');
    setParseError(null);
    setApplyResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Categorization</DialogTitle>
          <DialogDescription>
            The AI will first ask clarifying questions about your business, then generate
            efficient categorization rules. Have a conversation to define local/foreign
            income, recurring vs one-time revenue, and expense categories.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {!applyResults ? (
            <>
              {/* Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>1. Copy this prompt</Label>
                  <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="bg-muted rounded-lg p-3 max-h-32 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {llmPrompt.slice(0, 500)}...
                  </pre>
                </div>
              </div>

              {/* Response */}
              <div>
                <Label className="mb-2 block">2. Paste AI response (rules JSON)</Label>
                <Textarea
                  placeholder='Paste the JSON response with "rules" array here...'
                  className="min-h-32 font-mono text-xs"
                  value={llmResponse}
                  onChange={(e) => {
                    setLlmResponse(e.target.value);
                    setParseError(null);
                  }}
                />
              </div>

              {parseError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{parseError}</p>
                </div>
              )}
            </>
          ) : (
            /* Results view */
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 p-3 bg-green-500/10 rounded-lg text-center">
                  <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
                    {applyResults.appliedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Categorized</p>
                </div>
                {applyResults.unmatchedCount > 0 && (
                  <div className="flex-1 p-3 bg-yellow-500/10 rounded-lg text-center">
                    <p className="text-2xl font-semibold text-yellow-700 dark:text-yellow-400">
                      {applyResults.unmatchedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Unmatched</p>
                  </div>
                )}
                <div className="flex-1 p-3 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
                    {applyResults.ruleApplications.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Rules Applied</p>
                </div>
              </div>

              {applyResults.ruleApplications.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pattern</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Matched</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applyResults.ruleApplications.map((app, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">
                              {app.rule.pattern}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn('gap-1', CATEGORY_COLORS[app.rule.category])}
                              >
                                {CATEGORY_ICONS[app.rule.category]}
                                {app.rule.subcategory}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {app.matchedCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          {!applyResults ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isApplying}>
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={!llmResponse.trim() || isApplying}
              >
                {isApplying ? 'Applying...' : 'Apply Rules'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
