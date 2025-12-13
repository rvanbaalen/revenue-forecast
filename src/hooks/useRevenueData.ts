import { useState, useEffect, useCallback } from 'react';
import type { AppConfig, RevenueSource, Salary, SalaryTax, Currency, Month } from '../types';
import { MONTHS, DEFAULT_CONFIG } from '../types';
import db from '../store/db';

export function useRevenueData() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [sources, setSources] = useState<RevenueSource[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [salaryTaxes, setSalaryTaxes] = useState<SalaryTax[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize data from IndexedDB
  useEffect(() => {
    async function loadData() {
      try {
        await db.init();
        const [configData, sourcesData, salariesData, salaryTaxesData] = await Promise.all([
          db.getConfig(),
          db.getSources(),
          db.getSalaries(),
          db.getSalaryTaxes(),
        ]);
        setConfig(configData);
        setSources(sourcesData);
        setSalaries(salariesData);
        setSalaryTaxes(salaryTaxesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Config operations
  const updateConfig = useCallback(async (updates: Partial<AppConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await db.saveConfig(newConfig);
  }, [config]);

  // Currency operations
  const addCurrency = useCallback(async () => {
    const newCurrencies = [...config.currencies, { code: 'NEW', symbol: '?', rate: 1 }];
    await updateConfig({ currencies: newCurrencies });
  }, [config.currencies, updateConfig]);

  const updateCurrency = useCallback(async (index: number, field: keyof Currency, value: string | number) => {
    const newCurrencies = [...config.currencies];
    newCurrencies[index] = { ...newCurrencies[index], [field]: value };
    await updateConfig({ currencies: newCurrencies });
  }, [config.currencies, updateConfig]);

  const removeCurrency = useCallback(async (index: number) => {
    const code = config.currencies[index].code;
    const newCurrencies = config.currencies.filter((_, i) => i !== index);

    // Update sources that use this currency to Cg
    const updatedSources = sources.map(s =>
      s.currency === code ? { ...s, currency: 'Cg' } : s
    );

    await updateConfig({ currencies: newCurrencies });
    setSources(updatedSources);
    await db.saveSources(updatedSources);
  }, [config.currencies, sources, updateConfig]);

  const getRate = useCallback((code: string): number => {
    const currency = config.currencies.find(c => c.code === code);
    return currency?.rate ?? 1;
  }, [config.currencies]);

  const getCurrencySymbol = useCallback((code: string): string => {
    const currency = config.currencies.find(c => c.code === code);
    return currency?.symbol ?? code;
  }, [config.currencies]);

  // Revenue source operations
  const addSource = useCallback(async () => {
    const newSource: Omit<RevenueSource, 'id'> = {
      name: `Source ${sources.length + 1}`,
      type: 'local',
      currency: 'Cg',
      isRecurring: false,
      recurringAmount: 0,
      expected: {},
      actual: {},
    };
    const id = await db.addSource(newSource);
    setSources([...sources, { ...newSource, id }]);
  }, [sources]);

  const updateSource = useCallback(async (id: number, updates: Partial<RevenueSource>) => {
    const updatedSources = sources.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    setSources(updatedSources);
    const source = updatedSources.find(s => s.id === id);
    if (source) {
      await db.updateSource(source);
    }
  }, [sources]);

  const updateSourceRevenue = useCallback(async (
    id: number,
    month: Month,
    value: number,
    type: 'expected' | 'actual'
  ) => {
    // Use functional update to avoid stale closure issues when called multiple times
    let updated: RevenueSource | undefined;

    setSources(prevSources => {
      const source = prevSources.find(s => s.id === id);
      if (!source) return prevSources;

      updated = {
        ...source,
        [type]: { ...source[type], [month]: value || 0 }
      };

      return prevSources.map(s => s.id === id ? updated! : s);
    });

    // Persist to database (need to get fresh data if source wasn't in state)
    if (updated) {
      await db.updateSource(updated);
    } else {
      // Source might not be in state yet (e.g., just created), fetch from DB
      const freshSource = await db.getSourceById(id);
      if (freshSource) {
        const updatedSource = {
          ...freshSource,
          [type]: { ...freshSource[type], [month]: value || 0 }
        };
        await db.updateSource(updatedSource);
        // Also update state with the new source
        setSources(prevSources => {
          const exists = prevSources.some(s => s.id === id);
          if (exists) {
            return prevSources.map(s => s.id === id ? updatedSource : s);
          }
          return [...prevSources, updatedSource];
        });
      }
    }
  }, []);

  const deleteSource = useCallback(async (id: number) => {
    setSources(sources.filter(s => s.id !== id));
    await db.deleteSource(id);
  }, [sources]);

  // Confirm monthly revenue - copy expected to actual for all sources in a month
  const confirmMonthlyRevenue = useCallback(async (month: Month) => {
    const updatedSources = sources.map(source => {
      const expectedValue = source.isRecurring ? source.recurringAmount : (source.expected[month] || 0);
      return {
        ...source,
        actual: { ...source.actual, [month]: expectedValue }
      };
    });

    setSources(updatedSources);
    await db.saveSources(updatedSources);
  }, [sources]);

  // Salary operations
  const addSalary = useCallback(async () => {
    const newSalary: Omit<Salary, 'id'> = {
      name: `Employee ${salaries.length + 1}`,
      amounts: {},
    };
    const id = await db.addSalary(newSalary);
    setSalaries([...salaries, { ...newSalary, id }]);
  }, [salaries]);

  const updateSalary = useCallback(async (id: number, updates: Partial<Salary>) => {
    const updatedSalaries = salaries.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    setSalaries(updatedSalaries);
    const salary = updatedSalaries.find(s => s.id === id);
    if (salary) {
      await db.updateSalary(salary);
    }
  }, [salaries]);

  const updateSalaryAmount = useCallback(async (id: number, month: Month, value: number) => {
    const salary = salaries.find(s => s.id === id);
    if (!salary) return;

    const updated = {
      ...salary,
      amounts: { ...salary.amounts, [month]: value || 0 }
    };

    const updatedSalaries = salaries.map(s => s.id === id ? updated : s);
    setSalaries(updatedSalaries);
    await db.updateSalary(updated);
  }, [salaries]);

  const deleteSalary = useCallback(async (id: number) => {
    setSalaries(salaries.filter(s => s.id !== id));
    // Also remove taxes for this salary from local state
    setSalaryTaxes(salaryTaxes.filter(t => t.salaryId !== id));
    await db.deleteSalary(id);
  }, [salaries, salaryTaxes]);

  // Salary tax operations
  const addSalaryTax = useCallback(async (salaryId: number) => {
    const newTax: Omit<SalaryTax, 'id'> = {
      salaryId,
      name: 'New Tax',
      type: 'percentage',
      value: 0,
    };
    const id = await db.addSalaryTax(newTax);
    setSalaryTaxes([...salaryTaxes, { ...newTax, id }]);
  }, [salaryTaxes]);

  const updateSalaryTax = useCallback(async (id: number, updates: Partial<SalaryTax>) => {
    const updatedTaxes = salaryTaxes.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    setSalaryTaxes(updatedTaxes);
    const tax = updatedTaxes.find(t => t.id === id);
    if (tax) {
      await db.updateSalaryTax(tax);
    }
  }, [salaryTaxes]);

  const deleteSalaryTax = useCallback(async (id: number) => {
    setSalaryTaxes(salaryTaxes.filter(t => t.id !== id));
    await db.deleteSalaryTax(id);
  }, [salaryTaxes]);

  const getTaxesForSalary = useCallback((salaryId: number): SalaryTax[] => {
    return salaryTaxes.filter(t => t.salaryId === salaryId);
  }, [salaryTaxes]);

  // Calculation helpers
  const getSourceValue = useCallback((source: RevenueSource, month: Month, type: 'expected' | 'actual'): number => {
    if (source.isRecurring && type === 'expected') {
      return source.recurringAmount;
    }
    return source[type][month] || 0;
  }, []);

  const getSourceTotal = useCallback((source: RevenueSource, type: 'expected' | 'actual'): number => {
    return MONTHS.reduce((sum, month) => sum + getSourceValue(source, month, type), 0);
  }, [getSourceValue]);

  const getSourceTotalCg = useCallback((source: RevenueSource, type: 'expected' | 'actual'): number => {
    return getSourceTotal(source, type) * getRate(source.currency);
  }, [getSourceTotal, getRate]);

  const getProfitTax = useCallback((source: RevenueSource, type: 'expected' | 'actual'): number => {
    if (source.type !== 'local') return 0;
    return getSourceTotalCg(source, type) * (config.profitTaxRate / 100);
  }, [getSourceTotalCg, config.profitTaxRate]);

  const getSourceVat = useCallback((source: RevenueSource, type: 'expected' | 'actual'): number => {
    if (source.type !== 'local') return 0;
    return getSourceTotalCg(source, type) * (config.vatRate / 100);
  }, [getSourceTotalCg, config.vatRate]);

  const getMonthlyTotal = useCallback((month: Month, type: 'expected' | 'actual'): number => {
    return sources.reduce((sum, source) =>
      sum + getSourceValue(source, month, type) * getRate(source.currency), 0
    );
  }, [sources, getSourceValue, getRate]);

  const getMonthlyVat = useCallback((month: Month, type: 'expected' | 'actual'): number => {
    return sources.reduce((sum, source) => {
      if (source.type !== 'local') return sum;
      return sum + getSourceValue(source, month, type) * getRate(source.currency) * (config.vatRate / 100);
    }, 0);
  }, [sources, getSourceValue, getRate, config.vatRate]);

  const getSalaryTotal = useCallback((salary: Salary): number => {
    return MONTHS.reduce((sum, month) => sum + (salary.amounts[month] || 0), 0);
  }, []);

  const getSalaryTaxCg = useCallback((salary: Salary): number => {
    const total = getSalaryTotal(salary);
    const taxes = salaryTaxes.filter(t => t.salaryId === salary.id);
    const monthsWorked = MONTHS.filter(m => (salary.amounts[m] || 0) > 0).length;

    return taxes.reduce((sum, tax) => {
      if (tax.type === 'percentage') {
        return sum + total * (tax.value / 100);
      }
      // Fixed amount per month worked
      return sum + tax.value * monthsWorked;
    }, 0);
  }, [getSalaryTotal, salaryTaxes]);

  const getMonthlySalary = useCallback((month: Month): number => {
    return salaries.reduce((sum, s) => sum + (s.amounts[month] || 0), 0);
  }, [salaries]);

  // Grand totals
  const getTotals = useCallback((type: 'expected' | 'actual') => {
    const totalRevenue = sources.reduce((sum, s) => sum + getSourceTotalCg(s, type), 0);
    const totalProfitTax = sources.reduce((sum, s) => sum + getProfitTax(s, type), 0);
    const totalVat = sources.reduce((sum, s) => sum + getSourceVat(s, type), 0);
    const totalSalaryGross = salaries.reduce((sum, s) => sum + getSalaryTotal(s), 0);
    const totalSalaryTax = salaries.reduce((sum, s) => sum + getSalaryTaxCg(s), 0);
    const net = totalRevenue - totalVat - totalProfitTax - totalSalaryGross - totalSalaryTax;

    return {
      totalRevenue,
      totalProfitTax,
      totalVat,
      totalSalaryGross,
      totalSalaryTax,
      net,
    };
  }, [sources, salaries, getSourceTotalCg, getProfitTax, getSourceVat, getSalaryTotal, getSalaryTaxCg]);

  // Backup/Restore
  const exportData = useCallback(async () => {
    return await db.exportData();
  }, []);

  const validateBackup = useCallback((jsonData: string) => {
    return db.validateBackup(jsonData);
  }, []);

  const importData = useCallback(async (jsonData: string, clearExisting = true) => {
    await db.importData(jsonData, clearExisting);
    // Reload data
    const [configData, sourcesData, salariesData, salaryTaxesData] = await Promise.all([
      db.getConfig(),
      db.getSources(),
      db.getSalaries(),
      db.getSalaryTaxes(),
    ]);
    setConfig(configData);
    setSources(sourcesData);
    setSalaries(salariesData);
    setSalaryTaxes(salaryTaxesData);
  }, []);

  return {
    // State
    config,
    sources,
    salaries,
    salaryTaxes,
    loading,

    // Config operations
    updateConfig,

    // Currency operations
    addCurrency,
    updateCurrency,
    removeCurrency,
    getRate,
    getCurrencySymbol,

    // Source operations
    addSource,
    updateSource,
    updateSourceRevenue,
    deleteSource,
    confirmMonthlyRevenue,

    // Salary operations
    addSalary,
    updateSalary,
    updateSalaryAmount,
    deleteSalary,

    // Salary tax operations
    addSalaryTax,
    updateSalaryTax,
    deleteSalaryTax,
    getTaxesForSalary,

    // Calculations
    getSourceValue,
    getSourceTotal,
    getSourceTotalCg,
    getProfitTax,
    getSourceVat,
    getMonthlyTotal,
    getMonthlyVat,
    getSalaryTotal,
    getSalaryTaxCg,
    getMonthlySalary,
    getTotals,

    // Backup/Restore
    exportData,
    validateBackup,
    importData,
  };
}
