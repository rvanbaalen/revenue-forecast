import { useRevenue } from '../context/RevenueContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Percent, Coins } from 'lucide-react';

export function SettingsPage() {
  const {
    config,
    updateConfig,
    addCurrency,
    updateCurrency,
    removeCurrency,
  } = useRevenue();

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-zinc-500 mt-1">Configure tax rates and currencies</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tax Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="w-4 h-4 text-indigo-600" />
              Tax Rates
            </CardTitle>
            <CardDescription>
              Applied to local revenue sources only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profitTax">Profit Tax Rate</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="profitTax"
                  type="number"
                  value={config.profitTaxRate}
                  min={0}
                  max={100}
                  step={0.1}
                  onChange={(e) => updateConfig({ profitTaxRate: parseFloat(e.target.value) || 0 })}
                  className="w-24 text-right font-mono"
                />
                <span className="text-zinc-500">%</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="vatRate">VAT Rate</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="vatRate"
                  type="number"
                  value={config.vatRate}
                  min={0}
                  max={100}
                  step={0.1}
                  onChange={(e) => updateConfig({ vatRate: parseFloat(e.target.value) || 0 })}
                  className="w-24 text-right font-mono"
                />
                <span className="text-zinc-500">%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currencies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="w-4 h-4 text-indigo-600" />
              Currencies
            </CardTitle>
            <CardDescription>
              Exchange rates to base currency (Cg)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.currencies.map((currency, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg"
              >
                <Input
                  type="text"
                  value={currency.code}
                  maxLength={4}
                  onChange={(e) => updateCurrency(index, 'code', e.target.value.toUpperCase())}
                  className="w-16 text-center font-mono uppercase"
                  readOnly={currency.code === 'Cg'}
                  placeholder="CODE"
                />
                <Input
                  type="text"
                  value={currency.symbol}
                  maxLength={2}
                  onChange={(e) => updateCurrency(index, 'symbol', e.target.value)}
                  className="w-12 text-center"
                  readOnly={currency.code === 'Cg'}
                  placeholder="$"
                />
                <span className="text-zinc-400">=</span>
                <Input
                  type="number"
                  value={currency.rate}
                  step={0.01}
                  min={0}
                  onChange={(e) => updateCurrency(index, 'rate', parseFloat(e.target.value) || 1)}
                  className="w-20 text-right font-mono"
                  readOnly={currency.code === 'Cg'}
                />
                <span className="text-zinc-500 text-sm">Cg</span>

                {currency.code !== 'Cg' ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCurrency(index)}
                    className="h-8 w-8 text-zinc-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ) : (
                  <span className="text-xs text-zinc-400 px-2">Base</span>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addCurrency}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Currency
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="bg-indigo-50 border-indigo-100">
        <CardContent className="py-4">
          <p className="text-sm text-indigo-700">
            Data is stored locally in your browser using IndexedDB.
            Use the Export function in the sidebar to backup your data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
