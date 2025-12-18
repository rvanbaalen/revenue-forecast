import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  FolderOpen,
  Tag,
  Wand2,
  Coins,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db } from '@/store/db';
import type { Context, Subcategory, MappingRule, TransactionCategory, Currency } from '../types';
import { DEFAULT_CURRENCY } from '../types';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '@/utils/currency';

export function SettingsPage() {
  const {
    contexts,
    activeContext,
    setActiveContext,
    createContext,
    updateContext,
    deleteContext,
    contextSubcategories: subcategories,
    addSubcategory,
    deleteSubcategory,
    contextMappingRules: mappingRules,
    addMappingRule,
    updateMappingRule,
    deleteMappingRule,
    currencies,
    addCurrency,
    updateCurrency,
    deleteCurrency,
  } = useApp();

  // Context state
  const [contextDialog, setContextDialog] = useState<'add' | 'edit' | null>(null);
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const [contextName, setContextName] = useState('');
  const [contextCurrency, setContextCurrency] = useState(DEFAULT_CURRENCY);

  // Subcategory state
  const [subcategoryDialog, setSubcategoryDialog] = useState<'add' | 'edit' | null>(null);
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryCategory, setSubcategoryCategory] = useState<'income' | 'expense'>('expense');

  // Mapping rule state
  const [ruleDialog, setRuleDialog] = useState<'add' | 'edit' | null>(null);
  const [editingRule, setEditingRule] = useState<MappingRule | null>(null);
  const [rulePattern, setRulePattern] = useState('');
  const [ruleCategory, setRuleCategory] = useState<TransactionCategory>('expense');
  const [ruleSubcategory, setRuleSubcategory] = useState('');
  const [ruleIncomeType, setRuleIncomeType] = useState<'local' | 'foreign'>('local');

  // Currency state
  const [currencyDialog, setCurrencyDialog] = useState<'add' | 'edit' | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [currencyName, setCurrencyName] = useState('');
  const [currencyExchangeRate, setCurrencyExchangeRate] = useState('1');

  // Clear data state
  const [isClearing, setIsClearing] = useState(false);

  // Context handlers
  const openAddContext = () => {
    setContextName('');
    setContextCurrency(DEFAULT_CURRENCY);
    setContextDialog('add');
  };

  const openEditContext = (ctx: Context) => {
    setEditingContext(ctx);
    setContextName(ctx.name);
    setContextCurrency(ctx.currency || DEFAULT_CURRENCY);
    setContextDialog('edit');
  };

  const saveContext = async () => {
    if (!contextName.trim()) return;

    if (contextDialog === 'add') {
      await createContext(contextName.trim(), contextCurrency);
    } else if (contextDialog === 'edit' && editingContext) {
      await updateContext({ ...editingContext, name: contextName.trim(), currency: contextCurrency });
    }

    setContextDialog(null);
    setEditingContext(null);
    setContextName('');
    setContextCurrency(DEFAULT_CURRENCY);
  };

  const handleDeleteContext = async (ctx: Context) => {
    await deleteContext(ctx.id);
  };

  // Subcategory handlers
  const openAddSubcategory = () => {
    setSubcategoryName('');
    setSubcategoryCategory('expense');
    setSubcategoryDialog('add');
  };

  const openEditSubcategory = (sub: Subcategory) => {
    // Edit not supported - just delete and re-add
    setSubcategoryName(sub.name);
    setSubcategoryCategory(sub.type);
    setSubcategoryDialog('edit');
  };

  const saveSubcategory = async () => {
    if (!subcategoryName.trim()) return;

    // Only support adding new subcategories (edit not supported)
    if (subcategoryDialog === 'add') {
      await addSubcategory(subcategoryName.trim(), subcategoryCategory);
    }

    setSubcategoryDialog(null);
    setSubcategoryName('');
  };

  const handleDeleteSubcategory = async (sub: Subcategory) => {
    await deleteSubcategory(sub.id);
  };

  // Mapping rule handlers
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

  // Currency handlers
  const openAddCurrency = () => {
    setCurrencyCode('');
    setCurrencySymbol('');
    setCurrencyName('');
    setCurrencyExchangeRate('1');
    setCurrencyDialog('add');
  };

  const openEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    setCurrencyCode(currency.code);
    setCurrencySymbol(currency.symbol);
    setCurrencyName(currency.name);
    setCurrencyExchangeRate(currency.exchangeRate);
    setCurrencyDialog('edit');
  };

  const saveCurrency = async () => {
    if (!currencyCode.trim() || !currencySymbol.trim() || !currencyName.trim()) return;

    const rate = currencyExchangeRate.trim() || '1';

    if (currencyDialog === 'add') {
      await addCurrency(currencyCode.trim().toUpperCase(), currencySymbol.trim(), currencyName.trim(), rate);
    } else if (currencyDialog === 'edit' && editingCurrency) {
      await updateCurrency({
        ...editingCurrency,
        code: currencyCode.trim().toUpperCase(),
        symbol: currencySymbol.trim(),
        name: currencyName.trim(),
        exchangeRate: rate,
      });
    }

    setCurrencyDialog(null);
    setEditingCurrency(null);
    setCurrencyCode('');
    setCurrencySymbol('');
    setCurrencyName('');
    setCurrencyExchangeRate('1');
  };

  const handleDeleteCurrency = async (currency: Currency) => {
    await deleteCurrency(currency.id);
  };

  // Autofill currency info from predefined list when code changes
  const handleCurrencyCodeChange = (code: string) => {
    setCurrencyCode(code);
    // If in add mode, autofill from predefined list
    if (currencyDialog === 'add') {
      const predefined = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
      if (predefined) {
        setCurrencySymbol(predefined.symbol);
        setCurrencyName(predefined.name);
      }
    }
  };

  // Clear data
  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await db.clearAllData();
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert(error instanceof Error ? error.message : 'Failed to clear data');
      setIsClearing(false);
    }
  };

  // Get subcategories for current category (only income/expense have subcategories)
  const relevantSubcategories = subcategories.filter(
    (s) => s.type === ruleCategory
  );

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage contexts, categories, and mapping rules
        </p>
      </div>

      <Tabs defaultValue="contexts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contexts">
            <FolderOpen className="size-4" />
            Contexts
          </TabsTrigger>
          <TabsTrigger value="currencies">
            <Coins className="size-4" />
            Currencies
          </TabsTrigger>
          <TabsTrigger value="subcategories">
            <Tag className="size-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Wand2 className="size-4" />
            Rules
          </TabsTrigger>
        </TabsList>

        {/* Contexts Tab */}
        <TabsContent value="contexts" className="flex flex-col gap-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Contexts help organize your finances (e.g., Personal, Business 1)
            </p>
            <Button onClick={openAddContext}>
              <Plus className="size-4" />
              Add Context
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contexts.map((ctx) => (
                  <TableRow key={ctx.id}>
                    <TableCell className="font-medium">{ctx.name}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {getCurrencySymbol(ctx.currency || DEFAULT_CURRENCY)} ({ctx.currency || DEFAULT_CURRENCY})
                      </span>
                    </TableCell>
                    <TableCell>
                      {ctx.id === activeContext?.id && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ctx.id !== activeContext?.id && (
                            <DropdownMenuItem onClick={() => setActiveContext(ctx.id)}>
                              Set as Active
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEditContext(ctx)}>
                            <Pencil className="size-4" />
                            Rename
                          </DropdownMenuItem>
                          {contexts.length > 1 && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteContext(ctx)}
                              className="text-destructive"
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value="currencies" className="flex flex-col gap-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Define currencies and exchange rates for multi-currency reports
            </p>
            <Button onClick={openAddCurrency}>
              <Plus className="size-4" />
              Add Currency
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Exchange Rate (to USD)</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No currencies defined. Import an OFX file or add currencies manually.
                    </TableCell>
                  </TableRow>
                ) : (
                  currencies.map((currency) => (
                    <TableRow key={currency.id}>
                      <TableCell className="font-mono font-medium">{currency.code}</TableCell>
                      <TableCell className="text-lg">{currency.symbol}</TableCell>
                      <TableCell>{currency.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currency.exchangeRate}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditCurrency(currency)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCurrency(currency)}
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

          <p className="text-xs text-muted-foreground">
            Exchange rates are used to convert amounts to your context&apos;s currency in reports.
            Set rate as: 1 [currency] = [rate] USD (e.g., 1 EUR = 1.08 USD, so rate = 1.08)
          </p>
        </TabsContent>

        {/* Subcategories Tab */}
        <TabsContent value="subcategories" className="flex flex-col gap-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Subcategories for income and expense transactions
            </p>
            <Button onClick={openAddSubcategory}>
              <Plus className="size-4" />
              Add Category
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No subcategories yet
                    </TableCell>
                  </TableRow>
                ) : (
                  subcategories.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>
                        <Badge variant={sub.type === 'income' ? 'default' : 'secondary'}>
                          {sub.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditSubcategory(sub)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteSubcategory(sub)}
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
        </TabsContent>

        {/* Mapping Rules Tab */}
        <TabsContent value="rules" className="flex flex-col gap-4 mt-6">
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
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <div className="border border-destructive/50 rounded-lg p-6 mt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Irreversible actions that affect all your data
            </p>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="font-medium text-foreground">Clear all data</p>
                <p className="text-sm text-muted-foreground">
                  Delete all contexts, accounts, transactions, and settings
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isClearing}>
                    <Trash2 className="size-4" />
                    {isClearing ? 'Clearing...' : 'Clear Data'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your data including:
                      <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
                        <li>All contexts</li>
                        <li>All bank accounts and transactions</li>
                        <li>All subcategories and mapping rules</li>
                      </ul>
                      <p className="mt-3 font-medium">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearData}>
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      {/* Context Dialog */}
      <Dialog open={!!contextDialog} onOpenChange={() => setContextDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contextDialog === 'add' ? 'Add Context' : 'Edit Context'}
            </DialogTitle>
            <DialogDescription>
              {contextDialog === 'add'
                ? 'Create a new context to organize your finances'
                : 'Update the context settings'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contextName">Name</Label>
              <Input
                id="contextName"
                value={contextName}
                onChange={(e) => setContextName(e.target.value)}
                placeholder="e.g., Personal, Business"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contextCurrency">Default Currency</Label>
              <Select value={contextCurrency} onValueChange={setContextCurrency}>
                <SelectTrigger id="contextCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} - {currency.code} ({currency.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This currency will be used to format amounts in reports
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContextDialog(null)}>
              Cancel
            </Button>
            <Button onClick={saveContext} disabled={!contextName.trim()}>
              {contextDialog === 'add' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={!!subcategoryDialog} onOpenChange={() => setSubcategoryDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {subcategoryDialog === 'add' ? 'Add Category' : 'Edit Category'}
            </DialogTitle>
            <DialogDescription>
              Categories help organize your income and expenses
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="subcategoryName">Name</Label>
              <Input
                id="subcategoryName"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
                placeholder="e.g., Salary, Utilities, Rent"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select
                value={subcategoryCategory}
                onValueChange={(v) => setSubcategoryCategory(v as 'income' | 'expense')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubcategoryDialog(null)}>
              Cancel
            </Button>
            <Button onClick={saveSubcategory} disabled={!subcategoryName.trim()}>
              {subcategoryDialog === 'add' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Currency Dialog */}
      <Dialog open={!!currencyDialog} onOpenChange={() => setCurrencyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currencyDialog === 'add' ? 'Add Currency' : 'Edit Currency'}
            </DialogTitle>
            <DialogDescription>
              Define a currency with its code, symbol, and exchange rate to USD
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="currencyCode">Currency Code</Label>
              <Input
                id="currencyCode"
                value={currencyCode}
                onChange={(e) => handleCurrencyCodeChange(e.target.value.toUpperCase())}
                placeholder="e.g., USD, EUR, AWG"
                className="font-mono uppercase"
                maxLength={3}
              />
              <p className="text-xs text-muted-foreground">
                3-letter ISO 4217 code. Known codes will auto-fill symbol and name.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="currencySymbol">Symbol</Label>
                <Input
                  id="currencySymbol"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="e.g., $, €, ƒ"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="currencyExchangeRate">Exchange Rate</Label>
                <Input
                  id="currencyExchangeRate"
                  type="number"
                  step="0.0001"
                  value={currencyExchangeRate}
                  onChange={(e) => setCurrencyExchangeRate(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currencyName">Name</Label>
              <Input
                id="currencyName"
                value={currencyName}
                onChange={(e) => setCurrencyName(e.target.value)}
                placeholder="e.g., US Dollar, Euro"
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Exchange rate: How many USD equals 1 unit of this currency.
              <br />
              Example: If 1 AWG = 0.56 USD, enter 0.56
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrencyDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveCurrency}
              disabled={!currencyCode.trim() || !currencySymbol.trim() || !currencyName.trim()}
            >
              {currencyDialog === 'add' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
