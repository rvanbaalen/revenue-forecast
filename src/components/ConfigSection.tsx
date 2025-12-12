import { useRevenue } from '../context/RevenueContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, X, Percent, DollarSign } from 'lucide-react';

export function ConfigSection() {
  const {
    config,
    updateConfig,
    addCurrency,
    updateCurrency,
    removeCurrency,
  } = useRevenue();

  return (
    <TooltipProvider>
      <Card className="mb-6 fade-in">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-300 flex items-center gap-2">
            Configuration
            <Badge variant="outline" className="text-xs">
              Year {config.year}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Profit Tax Rate */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-amber-400" />
                Local Profit Tax Rate
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.profitTaxRate}
                  min={0}
                  max={100}
                  step={0.1}
                  onChange={(e) => updateConfig({ profitTaxRate: parseFloat(e.target.value) || 0 })}
                  className="w-24 text-right font-mono"
                />
                <span className="text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500">
                Applied to local revenue sources
              </p>
            </div>

            {/* VAT Rate */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-400" />
                Local VAT Rate
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.vatRate}
                  min={0}
                  max={100}
                  step={0.1}
                  onChange={(e) => updateConfig({ vatRate: parseFloat(e.target.value) || 0 })}
                  className="w-24 text-right font-mono"
                />
                <span className="text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500">
                Value Added Tax on local revenue
              </p>
            </div>

            {/* Exchange Rates */}
            <div className="md:col-span-2 space-y-3">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-sky-400" />
                Exchange Rates to Base Currency (Cg)
              </Label>

              <div className="flex flex-wrap gap-3">
                {config.currencies.map((currency, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          type="text"
                          value={currency.code}
                          maxLength={4}
                          onChange={(e) => updateCurrency(index, 'code', e.target.value.toUpperCase())}
                          className="w-14 h-8 text-sm font-mono uppercase text-center"
                          readOnly={currency.code === 'Cg'}
                        />
                      </TooltipTrigger>
                      <TooltipContent>Currency code</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          type="text"
                          value={currency.symbol}
                          maxLength={2}
                          onChange={(e) => updateCurrency(index, 'symbol', e.target.value)}
                          className="w-10 h-8 text-sm text-center"
                          readOnly={currency.code === 'Cg'}
                        />
                      </TooltipTrigger>
                      <TooltipContent>Currency symbol</TooltipContent>
                    </Tooltip>

                    <Separator orientation="vertical" className="h-6" />

                    <span className="text-slate-500">=</span>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          type="number"
                          value={currency.rate}
                          step={0.01}
                          min={0}
                          onChange={(e) => updateCurrency(index, 'rate', parseFloat(e.target.value) || 1)}
                          className="w-20 h-8 text-sm font-mono text-right"
                          readOnly={currency.code === 'Cg'}
                        />
                      </TooltipTrigger>
                      <TooltipContent>Exchange rate to Cg</TooltipContent>
                    </Tooltip>

                    <span className="text-slate-400 text-sm">Cg</span>

                    {currency.code !== 'Cg' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCurrency(index)}
                            className="h-6 w-6 text-slate-500 hover:text-red-400"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove currency</TooltipContent>
                      </Tooltip>
                    )}

                    {currency.code === 'Cg' && (
                      <Badge variant="secondary" className="text-xs">
                        Base
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={addCurrency}
                className="text-sky-400 hover:text-sky-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add currency
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
