import type { AppConfig, Currency } from '../types';

interface ConfigSectionProps {
  config: AppConfig;
  onUpdateConfig: (updates: Partial<AppConfig>) => void;
  onAddCurrency: () => void;
  onUpdateCurrency: (index: number, field: keyof Currency, value: string | number) => void;
  onRemoveCurrency: (index: number) => void;
}

export function ConfigSection({
  config,
  onUpdateConfig,
  onAddCurrency,
  onUpdateCurrency,
  onRemoveCurrency,
}: ConfigSectionProps) {
  return (
    <section className="glass rounded-2xl p-6 mb-6 fade-in">
      <h2 className="text-lg font-semibold text-slate-300 mb-4">Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Local Profit Tax Rate</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={config.profitTaxRate}
              min={0}
              max={100}
              step={0.1}
              onChange={(e) => onUpdateConfig({ profitTaxRate: parseFloat(e.target.value) || 0 })}
              className="w-24 px-3 py-2 rounded-lg text-slate-200 font-mono text-right"
            />
            <span className="text-slate-400">%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Local VAT Rate</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={config.vatRate}
              min={0}
              max={100}
              step={0.1}
              onChange={(e) => onUpdateConfig({ vatRate: parseFloat(e.target.value) || 0 })}
              className="w-24 px-3 py-2 rounded-lg text-slate-200 font-mono text-right"
            />
            <span className="text-slate-400">%</span>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-slate-400 mb-2">Exchange Rates to Cg</label>
          <div className="flex flex-wrap gap-3">
            {config.currencies.map((currency, index) => (
              <div key={index} className="flex items-center gap-2 glass-light rounded-lg px-3 py-2">
                <input
                  type="text"
                  value={currency.code}
                  maxLength={4}
                  onChange={(e) => onUpdateCurrency(index, 'code', e.target.value.toUpperCase())}
                  className="w-14 px-2 py-1 rounded text-slate-200 text-sm font-mono uppercase"
                  readOnly={currency.code === 'Cg'}
                />
                <input
                  type="text"
                  value={currency.symbol}
                  maxLength={2}
                  onChange={(e) => onUpdateCurrency(index, 'symbol', e.target.value)}
                  className="w-10 px-2 py-1 rounded text-slate-200 text-sm text-center"
                  readOnly={currency.code === 'Cg'}
                />
                <span className="text-slate-500">=</span>
                <input
                  type="number"
                  value={currency.rate}
                  step={0.01}
                  min={0}
                  onChange={(e) => onUpdateCurrency(index, 'rate', parseFloat(e.target.value) || 1)}
                  className="w-20 px-2 py-1 rounded text-slate-200 text-sm font-mono text-right"
                  readOnly={currency.code === 'Cg'}
                />
                <span className="text-slate-400 text-sm">Cg</span>
                {currency.code !== 'Cg' && (
                  <button
                    onClick={() => onRemoveCurrency(index)}
                    className="text-slate-500 hover:text-red-400 ml-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={onAddCurrency}
            className="mt-3 text-sm text-sky-400 hover:text-sky-300 transition-colors"
          >
            + Add currency
          </button>
        </div>
      </div>
    </section>
  );
}
