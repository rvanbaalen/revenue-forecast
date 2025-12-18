import { useState } from 'react';
import { useFinancialData } from '../../stores';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MappingRule, TransactionCategory } from '../../types';

export function RulesPage() {
  const {
    activeContext,
    contextSubcategories: subcategories,
    contextMappingRules: mappingRules,
    addMappingRule,
    updateMappingRule,
    deleteMappingRule,
  } = useFinancialData();

  const [ruleDialog, setRuleDialog] = useState<'add' | 'edit' | null>(null);
  const [editingRule, setEditingRule] = useState<MappingRule | null>(null);
  const [rulePattern, setRulePattern] = useState('');
  const [ruleCategory, setRuleCategory] = useState<TransactionCategory>('expense');
  const [ruleSubcategory, setRuleSubcategory] = useState('');
  const [ruleIncomeType, setRuleIncomeType] = useState<'local' | 'foreign'>('local');

  const relevantSubcategories = subcategories.filter(
    (s) => s.type === ruleCategory
  );

  const openAddRule = () => {
    setRulePattern('');
    setRuleCategory('expense');
    setRuleSubcategory('');
    setRuleIncomeType('local');
    setRuleDialog('add');
  };

  const openEditRule = (rule: MappingRule) => {
    setEditingRule(rule);
    setRulePattern(rule.pattern);
    setRuleCategory(rule.category);
    setRuleSubcategory(rule.subcategory);
    setRuleIncomeType(rule.incomeType || 'local');
    setRuleDialog('edit');
  };

  const saveRule = async () => {
    if (!rulePattern.trim()) return;

    if (ruleDialog === 'add' && activeContext) {
      await addMappingRule({
        contextId: activeContext.id,
        pattern: rulePattern.trim(),
        patternType: 'contains',
        matchField: 'both',
        category: ruleCategory,
        subcategory: ruleSubcategory,
        incomeType: ruleCategory === 'income' ? ruleIncomeType : undefined,
        priority: 0,
        isActive: true,
      });
    } else if (ruleDialog === 'edit' && editingRule) {
      await updateMappingRule({
        ...editingRule,
        pattern: rulePattern.trim(),
        category: ruleCategory,
        subcategory: ruleSubcategory,
        incomeType: ruleCategory === 'income' ? ruleIncomeType : undefined,
      });
    }

    setRuleDialog(null);
    setEditingRule(null);
    setRulePattern('');
  };

  const handleDeleteRule = async (rule: MappingRule) => {
    await deleteMappingRule(rule.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Rules automatically categorize imported transactions
        </p>
        <Button onClick={openAddRule}>
          <Plus className="size-4" />
          Add Rule
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pattern</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Subcategory</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappingRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No mapping rules yet
                </TableCell>
              </TableRow>
            ) : (
              mappingRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-mono text-sm">{rule.pattern}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        rule.category === 'income'
                          ? 'default'
                          : rule.category === 'expense'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {rule.category}
                      {rule.category === 'income' && rule.incomeType === 'foreign' && (
                        <span className="ml-1 opacity-70">(intl)</span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.subcategory || '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditRule(rule)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRule(rule)}
                          className="text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mapping Rule Dialog */}
      <Dialog open={!!ruleDialog} onOpenChange={() => setRuleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {ruleDialog === 'add' ? 'Add Mapping Rule' : 'Edit Mapping Rule'}
            </DialogTitle>
            <DialogDescription>
              Rules automatically categorize transactions matching the pattern
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rulePattern">Pattern</Label>
              <Input
                id="rulePattern"
                value={rulePattern}
                onChange={(e) => setRulePattern(e.target.value)}
                placeholder="e.g., AMAZON, NETFLIX, SALARY"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Transactions containing this text will be matched
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select
                value={ruleCategory}
                onValueChange={(v) => setRuleCategory(v as TransactionCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ruleCategory === 'income' && (
              <div className="flex flex-col gap-2">
                <Label>Income Type</Label>
                <Select
                  value={ruleIncomeType}
                  onValueChange={(v) => setRuleIncomeType(v as 'local' | 'foreign')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local (15% tax)</SelectItem>
                    <SelectItem value="foreign">Foreign (exempt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(ruleCategory === 'income' || ruleCategory === 'expense') && (
              <div className="flex flex-col gap-2">
                <Label>Subcategory</Label>
                {relevantSubcategories.length > 0 ? (
                  <Select value={ruleSubcategory} onValueChange={setRuleSubcategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {relevantSubcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.name}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={ruleSubcategory}
                    onChange={(e) => setRuleSubcategory(e.target.value)}
                    placeholder="Enter subcategory"
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialog(null)}>
              Cancel
            </Button>
            <Button onClick={saveRule} disabled={!rulePattern.trim()}>
              {ruleDialog === 'add' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
