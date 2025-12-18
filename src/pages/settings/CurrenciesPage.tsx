import { useState } from 'react';
import { useFinancialData } from '../../stores';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Currency } from '../../types';
import { SUPPORTED_CURRENCIES } from '@/utils/currency';

export function CurrenciesPage() {
  const {
    currencies,
    addCurrency,
    updateCurrency,
    deleteCurrency,
  } = useFinancialData();

  const [currencyDialog, setCurrencyDialog] = useState<'add' | 'edit' | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [currencyName, setCurrencyName] = useState('');
  const [currencyExchangeRate, setCurrencyExchangeRate] = useState('1');

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

  const handleCurrencyCodeChange = (code: string) => {
    setCurrencyCode(code);
    if (currencyDialog === 'add') {
      const predefined = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
      if (predefined) {
        setCurrencySymbol(predefined.symbol);
        setCurrencyName(predefined.name);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
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
