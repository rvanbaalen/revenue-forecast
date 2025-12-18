/**
 * IndexedDB Database for Financial Reports
 *
 * Simple schema focused on:
 * - Contexts (workspaces)
 * - Bank accounts (checking, credit_card)
 * - Transactions with categorization
 * - Subcategories for organizing
 * - Mapping rules for auto-categorization
 */

import type {
  Context,
  BankAccount,
  Transaction,
  Subcategory,
  MappingRule,
  Reconciliation,
  Currency,
} from '../types';

const DB_NAME = 'FinancialReports';
const DB_VERSION = 3;

class FinancialDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;

        // Contexts store
        if (!database.objectStoreNames.contains('contexts')) {
          database.createObjectStore('contexts', { keyPath: 'id' });
        }

        // Accounts store
        if (!database.objectStoreNames.contains('accounts')) {
          const accountStore = database.createObjectStore('accounts', { keyPath: 'id' });
          accountStore.createIndex('contextId', 'contextId', { unique: false });
          accountStore.createIndex('accountIdHash', 'accountIdHash', { unique: true });
        }

        // Transactions store
        if (!database.objectStoreNames.contains('transactions')) {
          const txStore = database.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('accountId', 'accountId', { unique: false });
          txStore.createIndex('accountId_fitId', ['accountId', 'fitId'], { unique: true });
          txStore.createIndex('category', 'category', { unique: false });
          txStore.createIndex('date', 'date', { unique: false });
          txStore.createIndex('importBatchId', 'importBatchId', { unique: false });
        }

        // Subcategories store
        if (!database.objectStoreNames.contains('subcategories')) {
          const subStore = database.createObjectStore('subcategories', { keyPath: 'id' });
          subStore.createIndex('contextId', 'contextId', { unique: false });
          subStore.createIndex('contextId_name', ['contextId', 'name'], { unique: true });
        }

        // Mapping rules store
        if (!database.objectStoreNames.contains('mappingRules')) {
          const ruleStore = database.createObjectStore('mappingRules', { keyPath: 'id' });
          ruleStore.createIndex('contextId', 'contextId', { unique: false });
          ruleStore.createIndex('priority', 'priority', { unique: false });
        }

        // Reconciliations store (added in v2)
        if (!database.objectStoreNames.contains('reconciliations')) {
          const reconStore = database.createObjectStore('reconciliations', { keyPath: 'id' });
          reconStore.createIndex('accountId', 'accountId', { unique: false });
          reconStore.createIndex('reconciledDate', 'reconciledDate', { unique: false });
        }

        // Currencies store (added in v3)
        if (!database.objectStoreNames.contains('currencies')) {
          const currencyStore = database.createObjectStore('currencies', { keyPath: 'id' });
          currencyStore.createIndex('code', 'code', { unique: true });
        }
      };
    });
  }

  private ensureDb(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // ============================================
  // Context operations
  // ============================================

  async getContexts(): Promise<Context[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('contexts', 'readonly');
      const request = tx.objectStore('contexts').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getContextById(id: string): Promise<Context | undefined> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('contexts', 'readonly');
      const request = tx.objectStore('contexts').get(id);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async addContext(context: Context): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contexts', 'readwrite');
      const request = tx.objectStore('contexts').add(context);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateContext(context: Context): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('contexts', 'readwrite');
      tx.objectStore('contexts').put(context);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteContext(id: string): Promise<void> {
    const db = this.ensureDb();

    // Get all accounts for this context to delete their transactions
    const accounts = await this.getAccountsByContext(id);
    const accountIds = accounts.map((a) => a.id);

    return new Promise((resolve) => {
      const tx = db.transaction(
        ['contexts', 'accounts', 'transactions', 'subcategories', 'mappingRules'],
        'readwrite'
      );

      // Delete context
      tx.objectStore('contexts').delete(id);

      // Delete accounts for this context
      const accountStore = tx.objectStore('accounts');
      const accountIndex = accountStore.index('contextId');
      accountIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete transactions for all accounts in this context
      const txStore = tx.objectStore('transactions');
      const txIndex = txStore.index('accountId');
      for (const accountId of accountIds) {
        txIndex.openCursor(IDBKeyRange.only(accountId)).onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      }

      // Delete subcategories for this context
      const subStore = tx.objectStore('subcategories');
      const subIndex = subStore.index('contextId');
      subIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete mapping rules for this context
      const ruleStore = tx.objectStore('mappingRules');
      const ruleIndex = ruleStore.index('contextId');
      ruleIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
    });
  }

  // ============================================
  // Account operations
  // ============================================

  async getAccounts(): Promise<BankAccount[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('accounts', 'readonly');
      const request = tx.objectStore('accounts').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getAccountsByContext(contextId: string): Promise<BankAccount[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('accounts', 'readonly');
      const index = tx.objectStore('accounts').index('contextId');
      const request = index.getAll(IDBKeyRange.only(contextId));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getAccountById(id: string): Promise<BankAccount | undefined> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('accounts', 'readonly');
      const request = tx.objectStore('accounts').get(id);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAccountByHash(accountIdHash: string): Promise<BankAccount | undefined> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('accounts', 'readonly');
      const index = tx.objectStore('accounts').index('accountIdHash');
      const request = index.get(accountIdHash);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async addAccount(account: BankAccount): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('accounts', 'readwrite');
      const request = tx.objectStore('accounts').add(account);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateAccount(account: BankAccount): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('accounts', 'readwrite');
      tx.objectStore('accounts').put(account);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteAccount(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction(['accounts', 'transactions', 'reconciliations'], 'readwrite');

      // Delete account
      tx.objectStore('accounts').delete(id);

      // Delete all transactions for this account
      const txStore = tx.objectStore('transactions');
      const txIndex = txStore.index('accountId');
      txIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete all reconciliations for this account
      const reconStore = tx.objectStore('reconciliations');
      const reconIndex = reconStore.index('accountId');
      reconIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
    });
  }

  // ============================================
  // Transaction operations
  // ============================================

  async getTransactions(): Promise<Transaction[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readonly');
      const request = tx.objectStore('transactions').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readonly');
      const index = tx.objectStore('transactions').index('accountId');
      const request = index.getAll(IDBKeyRange.only(accountId));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getTransactionsByContext(contextId: string): Promise<Transaction[]> {
    // Get all accounts for context, then get transactions
    const accounts = await this.getAccountsByContext(contextId);
    const accountIds = new Set(accounts.map((a) => a.id));

    const allTransactions = await this.getTransactions();
    return allTransactions.filter((t) => accountIds.has(t.accountId));
  }

  async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readonly');
      const index = tx.objectStore('transactions').index('category');
      const request = index.getAll(IDBKeyRange.only(category));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readonly');
      const index = tx.objectStore('transactions').index('date');
      const request = index.getAll(IDBKeyRange.bound(startDate, endDate));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readonly');
      const request = tx.objectStore('transactions').get(id);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async checkTransactionExists(accountId: string, fitId: string): Promise<boolean> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readonly');
      const index = tx.objectStore('transactions').index('accountId_fitId');
      const request = index.get([accountId, fitId]);
      request.onsuccess = () => resolve(!!request.result);
    });
  }

  async addTransaction(transaction: Transaction): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readwrite');
      const request = tx.objectStore('transactions').add(transaction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addTransactions(transactions: Transaction[]): Promise<{ added: number; skipped: number }> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      let added = 0;
      let skipped = 0;

      for (const transaction of transactions) {
        const request = store.add(transaction);
        request.onsuccess = () => {
          added++;
        };
        request.onerror = () => {
          // Skip duplicates (constraint error on accountId_fitId)
          if (request.error?.name === 'ConstraintError') {
            skipped++;
          }
          // Prevent transaction abort on constraint error
          request.onerror = null;
        };
      }

      tx.oncomplete = () => resolve({ added, skipped });
      tx.onerror = () => resolve({ added, skipped }); // Still resolve with counts
    });
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readwrite');
      tx.objectStore('transactions').put(transaction);
      tx.oncomplete = () => resolve();
    });
  }

  async updateTransactions(transactions: Transaction[]): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      for (const t of transactions) {
        store.put(t);
      }
      tx.oncomplete = () => resolve();
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readwrite');
      tx.objectStore('transactions').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  // ============================================
  // Subcategory operations
  // ============================================

  async getSubcategories(): Promise<Subcategory[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('subcategories', 'readonly');
      const request = tx.objectStore('subcategories').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getSubcategoriesByContext(contextId: string): Promise<Subcategory[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('subcategories', 'readonly');
      const index = tx.objectStore('subcategories').index('contextId');
      const request = index.getAll(IDBKeyRange.only(contextId));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async addSubcategory(subcategory: Subcategory): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('subcategories', 'readwrite');
      const request = tx.objectStore('subcategories').add(subcategory);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateSubcategory(subcategory: Subcategory): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('subcategories', 'readwrite');
      tx.objectStore('subcategories').put(subcategory);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteSubcategory(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('subcategories', 'readwrite');
      tx.objectStore('subcategories').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  async initDefaultSubcategories(
    contextId: string,
    incomeNames: string[],
    expenseNames: string[]
  ): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();

    return new Promise((resolve) => {
      const tx = db.transaction('subcategories', 'readwrite');
      const store = tx.objectStore('subcategories');

      // Add income subcategories
      for (const name of incomeNames) {
        const sub: Subcategory = {
          id: crypto.randomUUID(),
          contextId,
          name,
          type: 'income',
          createdAt: now,
        };
        store.add(sub);
      }

      // Add expense subcategories
      for (const name of expenseNames) {
        const sub: Subcategory = {
          id: crypto.randomUUID(),
          contextId,
          name,
          type: 'expense',
          createdAt: now,
        };
        store.add(sub);
      }

      tx.oncomplete = () => resolve();
    });
  }

  // ============================================
  // Mapping Rule operations
  // ============================================

  async getMappingRules(): Promise<MappingRule[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('mappingRules', 'readonly');
      const request = tx.objectStore('mappingRules').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getMappingRulesByContext(contextId: string): Promise<MappingRule[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('mappingRules', 'readonly');
      const index = tx.objectStore('mappingRules').index('contextId');
      const request = index.getAll(IDBKeyRange.only(contextId));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async addMappingRule(rule: MappingRule): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mappingRules', 'readwrite');
      const request = tx.objectStore('mappingRules').add(rule);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateMappingRule(rule: MappingRule): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('mappingRules', 'readwrite');
      tx.objectStore('mappingRules').put(rule);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteMappingRule(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('mappingRules', 'readwrite');
      tx.objectStore('mappingRules').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  // ============================================
  // Reconciliation operations
  // ============================================

  async getReconciliations(): Promise<Reconciliation[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('reconciliations', 'readonly');
      const request = tx.objectStore('reconciliations').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getReconciliationsByAccount(accountId: string): Promise<Reconciliation[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('reconciliations', 'readonly');
      const index = tx.objectStore('reconciliations').index('accountId');
      const request = index.getAll(IDBKeyRange.only(accountId));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getLatestReconciliation(accountId: string): Promise<Reconciliation | undefined> {
    const reconciliations = await this.getReconciliationsByAccount(accountId);
    if (reconciliations.length === 0) return undefined;
    // Sort by reconciledDate descending and return the latest
    return reconciliations.sort((a, b) =>
      b.reconciledDate.localeCompare(a.reconciledDate)
    )[0];
  }

  async addReconciliation(reconciliation: Reconciliation): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reconciliations', 'readwrite');
      const request = tx.objectStore('reconciliations').add(reconciliation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReconciliation(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('reconciliations', 'readwrite');
      tx.objectStore('reconciliations').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteReconciliationsByAccount(accountId: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('reconciliations', 'readwrite');
      const store = tx.objectStore('reconciliations');
      const index = store.index('accountId');
      index.openCursor(IDBKeyRange.only(accountId)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
    });
  }

  // ============================================
  // Currency operations
  // ============================================

  async getCurrencies(): Promise<Currency[]> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('currencies', 'readonly');
      const request = tx.objectStore('currencies').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getCurrencyByCode(code: string): Promise<Currency | undefined> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('currencies', 'readonly');
      const index = tx.objectStore('currencies').index('code');
      const request = index.get(code.toUpperCase());
      request.onsuccess = () => resolve(request.result);
    });
  }

  async addCurrency(currency: Currency): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('currencies', 'readwrite');
      const request = tx.objectStore('currencies').add(currency);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateCurrency(currency: Currency): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('currencies', 'readwrite');
      tx.objectStore('currencies').put(currency);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteCurrency(id: string): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve) => {
      const tx = db.transaction('currencies', 'readwrite');
      tx.objectStore('currencies').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  async getOrCreateCurrency(code: string, symbol: string, name: string, exchangeRate = '1'): Promise<Currency> {
    const existing = await this.getCurrencyByCode(code);
    if (existing) {
      return existing;
    }
    const currency: Currency = {
      id: crypto.randomUUID(),
      code: code.toUpperCase(),
      symbol,
      name,
      exchangeRate, // Default to 1 (1:1 with USD)
      createdAt: new Date().toISOString(),
    };
    await this.addCurrency(currency);
    return currency;
  }

  // ============================================
  // Export/Import operations
  // ============================================

  async exportData(): Promise<string> {
    const contexts = await this.getContexts();
    const accounts = await this.getAccounts();
    const transactions = await this.getTransactions();
    const subcategories = await this.getSubcategories();
    const mappingRules = await this.getMappingRules();
    const reconciliations = await this.getReconciliations();
    const currencies = await this.getCurrencies();

    return JSON.stringify(
      {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        data: {
          contexts,
          accounts,
          transactions,
          subcategories,
          mappingRules,
          reconciliations,
          currencies,
        },
      },
      null,
      2
    );
  }

  async importData(jsonData: string, clearExisting = true): Promise<{ success: boolean; error?: string }> {
    try {
      const parsed = JSON.parse(jsonData);
      const data = parsed.data || parsed;

      if (clearExisting) {
        await this.clearAllData();
      }

      // Import contexts
      if (data.contexts) {
        for (const context of data.contexts) {
          await this.addContext(context);
        }
      }

      // Import accounts
      if (data.accounts) {
        for (const account of data.accounts) {
          try {
            await this.addAccount(account);
          } catch {
            // Skip duplicates
          }
        }
      }

      // Import transactions
      if (data.transactions) {
        await this.addTransactions(data.transactions);
      }

      // Import subcategories
      if (data.subcategories) {
        for (const sub of data.subcategories) {
          try {
            await this.addSubcategory(sub);
          } catch {
            // Skip duplicates
          }
        }
      }

      // Import mapping rules
      if (data.mappingRules) {
        for (const rule of data.mappingRules) {
          await this.addMappingRule(rule);
        }
      }

      // Import reconciliations
      if (data.reconciliations) {
        for (const reconciliation of data.reconciliations) {
          try {
            await this.addReconciliation(reconciliation);
          } catch {
            // Skip duplicates
          }
        }
      }

      // Import currencies
      if (data.currencies) {
        for (const currency of data.currencies) {
          try {
            await this.addCurrency(currency);
          } catch {
            // Skip duplicates
          }
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async clearAllData(): Promise<void> {
    const db = this.ensureDb();
    const storeNames = ['contexts', 'accounts', 'transactions', 'subcategories', 'mappingRules', 'reconciliations', 'currencies'];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();

      for (const storeName of storeNames) {
        tx.objectStore(storeName).clear();
      }
    });
  }
}

export const db = new FinancialDB();
export default db;
