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
import type { Context } from '../../types';
import { DEFAULT_CURRENCY } from '../../types';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '@/utils/currency';

export function ContextsPage() {
  const {
    contexts,
    activeContext,
    setActiveContext,
    createContext,
    updateContext,
    deleteContext,
  } = useFinancialData();

  const [contextDialog, setContextDialog] = useState<'add' | 'edit' | null>(null);
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const [contextName, setContextName] = useState('');
  const [contextCurrency, setContextCurrency] = useState(DEFAULT_CURRENCY);

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

  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
}
