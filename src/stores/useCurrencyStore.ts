/**
 * Currency Store - Currency management
 *
 * Manages user-defined currencies with exchange rates.
 * Used for multi-currency support and conversion.
 */

import { create } from 'zustand';
import type { Currency } from '../types';
import { db } from '../store/db';

interface CurrencyState {
  currencies: Currency[];
}

interface CurrencyActions {
  // Data loading
  loadCurrencies: () => Promise<void>;
  setCurrencies: (currencies: Currency[]) => void;

  // CRUD operations
  addCurrency: (
    code: string,
    symbol: string,
    name: string,
    exchangeRate?: string
  ) => Promise<Currency>;
  updateCurrency: (currency: Currency) => Promise<void>;
  deleteCurrency: (id: string) => Promise<void>;

  // Queries
  getCurrencyByCode: (code: string) => Currency | undefined;
}

type CurrencyStore = CurrencyState & CurrencyActions;

export const useCurrencyStore = create<CurrencyStore>((set, get) => ({
  // State
  currencies: [],

  // Data loading
  loadCurrencies: async () => {
    const currencies = await db.getCurrencies();
    set({ currencies });
  },

  setCurrencies: (currencies) => set({ currencies }),

  // CRUD operations
  addCurrency: async (code, symbol, name, exchangeRate = '1') => {
    const currency: Currency = {
      id: crypto.randomUUID(),
      code: code.toUpperCase(),
      symbol,
      name,
      exchangeRate,
      createdAt: new Date().toISOString(),
    };

    await db.addCurrency(currency);
    set((state) => ({
      currencies: [...state.currencies, currency],
    }));

    return currency;
  },

  updateCurrency: async (currency) => {
    await db.updateCurrency(currency);
    set((state) => ({
      currencies: state.currencies.map((c) =>
        c.id === currency.id ? currency : c
      ),
    }));
  },

  deleteCurrency: async (id) => {
    await db.deleteCurrency(id);
    set((state) => ({
      currencies: state.currencies.filter((c) => c.id !== id),
    }));
  },

  // Queries
  getCurrencyByCode: (code) => {
    return get().currencies.find(
      (c) => c.code.toUpperCase() === code.toUpperCase()
    );
  },
}));

// Selectors
export const selectCurrencies = (state: CurrencyStore) => state.currencies;
export const selectCurrencyByCode = (code: string) => (state: CurrencyStore) =>
  state.currencies.find((c) => c.code.toUpperCase() === code.toUpperCase());
