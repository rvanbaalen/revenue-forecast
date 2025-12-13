import type { AppConfig, RevenueSource, Salary, SalaryTax, BankAccount, BankTransaction, TransactionMappingRule, ChartAccount, JournalEntry } from '../types';
import { DEFAULT_CONFIG, DEFAULT_SOURCES, DEFAULT_SALARIES, DEFAULT_SALARY_TAXES, DEFAULT_CHART_OF_ACCOUNTS } from '../types';

const DB_NAME = 'RevenueTracker2026';
const DB_VERSION = 4;

class RevenueDB {
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
        const oldVersion = event.oldVersion;

        if (!database.objectStoreNames.contains('config')) {
          database.createObjectStore('config', { keyPath: 'id' });
        }

        if (!database.objectStoreNames.contains('sources')) {
          database.createObjectStore('sources', { keyPath: 'id', autoIncrement: true });
        }

        if (!database.objectStoreNames.contains('salaries')) {
          database.createObjectStore('salaries', { keyPath: 'id', autoIncrement: true });
        }

        // Version 2: Add salary taxes store
        if (!database.objectStoreNames.contains('salaryTaxes')) {
          const taxStore = database.createObjectStore('salaryTaxes', { keyPath: 'id', autoIncrement: true });
          taxStore.createIndex('salaryId', 'salaryId', { unique: false });
        }

        // Version 3: Add bank-related stores
        if (!database.objectStoreNames.contains('bankAccounts')) {
          database.createObjectStore('bankAccounts', { keyPath: 'id', autoIncrement: true });
        }

        if (!database.objectStoreNames.contains('bankTransactions')) {
          const txStore = database.createObjectStore('bankTransactions', { keyPath: 'id', autoIncrement: true });
          txStore.createIndex('accountId', 'accountId', { unique: false });
          txStore.createIndex('accountId_fitId', ['accountId', 'fitId'], { unique: true });
          txStore.createIndex('year_month', ['year', 'month'], { unique: false });
          txStore.createIndex('revenueSourceId', 'revenueSourceId', { unique: false });
          txStore.createIndex('importBatchId', 'importBatchId', { unique: false });
          txStore.createIndex('category', 'category', { unique: false });
        }

        if (!database.objectStoreNames.contains('mappingRules')) {
          const ruleStore = database.createObjectStore('mappingRules', { keyPath: 'id', autoIncrement: true });
          ruleStore.createIndex('accountId', 'accountId', { unique: false });
          ruleStore.createIndex('priority', 'priority', { unique: false });
        }

        // Version 4: Add accounting stores
        if (!database.objectStoreNames.contains('chartAccounts')) {
          const chartStore = database.createObjectStore('chartAccounts', { keyPath: 'id' });
          chartStore.createIndex('code', 'code', { unique: true });
          chartStore.createIndex('type', 'type', { unique: false });
          chartStore.createIndex('parentId', 'parentId', { unique: false });
          chartStore.createIndex('bankAccountId', 'bankAccountId', { unique: false });
        }

        if (!database.objectStoreNames.contains('journalEntries')) {
          const journalStore = database.createObjectStore('journalEntries', { keyPath: 'id' });
          journalStore.createIndex('date', 'date', { unique: false });
          journalStore.createIndex('bankTransactionId', 'bankTransactionId', { unique: false });
          journalStore.createIndex('isReconciled', 'isReconciled', { unique: false });
        }

        // Migration from v1: Convert old salary.taxType/taxValue to separate salaryTaxes
        if (oldVersion < 2 && oldVersion > 0) {
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          const salaryStore = transaction.objectStore('salaries');
          const taxStore = transaction.objectStore('salaryTaxes');

          salaryStore.openCursor().onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const salary = cursor.value;
              // Migrate old tax data to new salaryTaxes store
              if (salary.taxType !== undefined && salary.taxValue !== undefined) {
                taxStore.add({
                  salaryId: salary.id,
                  name: 'Payroll Tax',
                  type: salary.taxType,
                  value: salary.taxValue,
                });
                // Remove old tax fields from salary
                delete salary.taxType;
                delete salary.taxValue;
                cursor.update(salary);
              }
              cursor.continue();
            }
          };
        }
      };
    });
  }

  // Config operations
  async getConfig(): Promise<AppConfig> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('config', 'readonly');
      const request = tx.objectStore('config').get('main');
      request.onsuccess = () => resolve(request.result || { ...DEFAULT_CONFIG });
    });
  }

  async saveConfig(config: AppConfig): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('config', 'readwrite');
      tx.objectStore('config').put({ ...config, id: 'main' });
      tx.oncomplete = () => resolve();
    });
  }

  // Revenue sources operations
  async getSources(): Promise<RevenueSource[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('sources', 'readonly');
      const request = tx.objectStore('sources').getAll();
      request.onsuccess = () => {
        const result = request.result;
        if (result.length === 0) {
          // Initialize with defaults
          this.initDefaultSources().then(resolve);
        } else {
          resolve(result);
        }
      };
    });
  }

  private async initDefaultSources(): Promise<RevenueSource[]> {
    const sources: RevenueSource[] = DEFAULT_SOURCES.map((s, i) => ({ ...s, id: i + 1 }));
    await this.saveSources(sources);
    return sources;
  }

  async saveSources(sources: RevenueSource[]): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('sources', 'readwrite');
      const store = tx.objectStore('sources');
      store.clear();
      sources.forEach(s => store.put(s));
      tx.oncomplete = () => resolve();
    });
  }

  async addSource(source: Omit<RevenueSource, 'id'>): Promise<number> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('sources', 'readwrite');
      const request = tx.objectStore('sources').add(source);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  async updateSource(source: RevenueSource): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('sources', 'readwrite');
      tx.objectStore('sources').put(source);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteSource(id: number): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('sources', 'readwrite');
      tx.objectStore('sources').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  // Salary operations
  async getSalaries(): Promise<Salary[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaries', 'readonly');
      const request = tx.objectStore('salaries').getAll();
      request.onsuccess = () => {
        const result = request.result;
        if (result.length === 0) {
          this.initDefaultSalaries().then(resolve);
        } else {
          resolve(result);
        }
      };
    });
  }

  private async initDefaultSalaries(): Promise<Salary[]> {
    const salaries: Salary[] = DEFAULT_SALARIES.map((s, i) => ({ ...s, id: i + 1 }));
    await this.saveSalaries(salaries);
    return salaries;
  }

  async saveSalaries(salaries: Salary[]): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaries', 'readwrite');
      const store = tx.objectStore('salaries');
      store.clear();
      salaries.forEach(s => store.put(s));
      tx.oncomplete = () => resolve();
    });
  }

  async addSalary(salary: Omit<Salary, 'id'>): Promise<number> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaries', 'readwrite');
      const request = tx.objectStore('salaries').add(salary);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  async updateSalary(salary: Salary): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaries', 'readwrite');
      tx.objectStore('salaries').put(salary);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteSalary(id: number): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction(['salaries', 'salaryTaxes'], 'readwrite');
      tx.objectStore('salaries').delete(id);
      // Also delete all taxes for this salary
      const taxStore = tx.objectStore('salaryTaxes');
      const index = taxStore.index('salaryId');
      index.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
    });
  }

  // Salary tax operations
  async getSalaryTaxes(): Promise<SalaryTax[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaryTaxes', 'readonly');
      const request = tx.objectStore('salaryTaxes').getAll();
      request.onsuccess = () => {
        const result = request.result;
        if (result.length === 0) {
          this.initDefaultSalaryTaxes().then(resolve);
        } else {
          resolve(result);
        }
      };
    });
  }

  private async initDefaultSalaryTaxes(): Promise<SalaryTax[]> {
    const taxes: SalaryTax[] = DEFAULT_SALARY_TAXES.map((t, i) => ({ ...t, id: i + 1 }));
    await this.saveSalaryTaxes(taxes);
    return taxes;
  }

  async saveSalaryTaxes(taxes: SalaryTax[]): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaryTaxes', 'readwrite');
      const store = tx.objectStore('salaryTaxes');
      store.clear();
      taxes.forEach(t => store.put(t));
      tx.oncomplete = () => resolve();
    });
  }

  async addSalaryTax(tax: Omit<SalaryTax, 'id'>): Promise<number> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaryTaxes', 'readwrite');
      const request = tx.objectStore('salaryTaxes').add(tax);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  async updateSalaryTax(tax: SalaryTax): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaryTaxes', 'readwrite');
      tx.objectStore('salaryTaxes').put(tax);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteSalaryTax(id: number): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaryTaxes', 'readwrite');
      tx.objectStore('salaryTaxes').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  async getSalaryTaxesBySalaryId(salaryId: number): Promise<SalaryTax[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('salaryTaxes', 'readonly');
      const index = tx.objectStore('salaryTaxes').index('salaryId');
      const request = index.getAll(IDBKeyRange.only(salaryId));
      request.onsuccess = () => resolve(request.result);
    });
  }

  // ============================================
  // Bank Account operations
  // ============================================

  async getBankAccounts(): Promise<BankAccount[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankAccounts', 'readonly');
      const request = tx.objectStore('bankAccounts').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async addBankAccount(account: Omit<BankAccount, 'id'>): Promise<number> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankAccounts', 'readwrite');
      const request = tx.objectStore('bankAccounts').add(account);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  async updateBankAccount(account: BankAccount): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankAccounts', 'readwrite');
      tx.objectStore('bankAccounts').put(account);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteBankAccount(id: number): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction(['bankAccounts', 'bankTransactions'], 'readwrite');
      tx.objectStore('bankAccounts').delete(id);
      // Also delete all transactions for this account
      const txStore = tx.objectStore('bankTransactions');
      const index = txStore.index('accountId');
      index.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
    });
  }

  async getBankAccountByHash(accountIdHash: string): Promise<BankAccount | undefined> {
    const accounts = await this.getBankAccounts();
    return accounts.find(a => a.accountIdHash === accountIdHash);
  }

  // ============================================
  // Bank Transaction operations
  // ============================================

  async getBankTransactions(): Promise<BankTransaction[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankTransactions', 'readonly');
      const request = tx.objectStore('bankTransactions').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getBankTransactionsByAccount(accountId: number): Promise<BankTransaction[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankTransactions', 'readonly');
      const index = tx.objectStore('bankTransactions').index('accountId');
      const request = index.getAll(IDBKeyRange.only(accountId));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getBankTransactionsByYearMonth(year: number, month: string): Promise<BankTransaction[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankTransactions', 'readonly');
      const index = tx.objectStore('bankTransactions').index('year_month');
      const request = index.getAll(IDBKeyRange.only([year, month]));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getBankTransactionsBySourceId(sourceId: number): Promise<BankTransaction[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankTransactions', 'readonly');
      const index = tx.objectStore('bankTransactions').index('revenueSourceId');
      const request = index.getAll(IDBKeyRange.only(sourceId));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async addBankTransaction(transaction: Omit<BankTransaction, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('bankTransactions', 'readwrite');
      const request = tx.objectStore('bankTransactions').add(transaction);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async addBankTransactions(transactions: Omit<BankTransaction, 'id'>[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('bankTransactions', 'readwrite');
      const store = tx.objectStore('bankTransactions');
      const ids: number[] = [];

      transactions.forEach(transaction => {
        const request = store.add(transaction);
        request.onsuccess = () => ids.push(request.result as number);
        request.onerror = () => {
          // Silently skip duplicates (constraint error on accountId_fitId)
          if (request.error?.name !== 'ConstraintError') {
            reject(request.error);
          }
        };
      });

      tx.oncomplete = () => resolve(ids);
      tx.onerror = () => {
        // Don't reject on constraint errors
        if (tx.error?.name !== 'ConstraintError') {
          reject(tx.error);
        } else {
          resolve(ids);
        }
      };
    });
  }

  async updateBankTransaction(transaction: BankTransaction): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankTransactions', 'readwrite');
      tx.objectStore('bankTransactions').put(transaction);
      tx.oncomplete = () => resolve();
    });
  }

  async updateBankTransactions(transactions: BankTransaction[]): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankTransactions', 'readwrite');
      const store = tx.objectStore('bankTransactions');
      transactions.forEach(t => store.put(t));
      tx.oncomplete = () => resolve();
    });
  }

  async deleteBankTransaction(id: number): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankTransactions', 'readwrite');
      tx.objectStore('bankTransactions').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  async checkTransactionExists(accountId: number, fitId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankTransactions', 'readonly');
      const index = tx.objectStore('bankTransactions').index('accountId_fitId');
      const request = index.get([accountId, fitId]);
      request.onsuccess = () => resolve(!!request.result);
    });
  }

  // ============================================
  // Mapping Rule operations
  // ============================================

  async getMappingRules(): Promise<TransactionMappingRule[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('mappingRules', 'readonly');
      const request = tx.objectStore('mappingRules').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getMappingRulesByAccount(accountId: number): Promise<TransactionMappingRule[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('mappingRules', 'readonly');
      const index = tx.objectStore('mappingRules').index('accountId');
      const request = index.getAll(IDBKeyRange.only(accountId));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async addMappingRule(rule: Omit<TransactionMappingRule, 'id'>): Promise<number> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('mappingRules', 'readwrite');
      const request = tx.objectStore('mappingRules').add(rule);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  async updateMappingRule(rule: TransactionMappingRule): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('mappingRules', 'readwrite');
      tx.objectStore('mappingRules').put(rule);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteMappingRule(id: number): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('mappingRules', 'readwrite');
      tx.objectStore('mappingRules').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  // Export all data
  async exportData(): Promise<string> {
    const config = await this.getConfig();
    const sources = await this.getSources();
    const salaries = await this.getSalaries();
    const salaryTaxes = await this.getSalaryTaxes();
    const bankAccounts = await this.getBankAccounts();
    const bankTransactions = await this.getBankTransactions();
    const mappingRules = await this.getMappingRules();
    const chartAccounts = await this.getChartAccounts();
    const journalEntries = await this.getJournalEntries();
    return JSON.stringify({
      config,
      sources,
      salaries,
      salaryTaxes,
      bankAccounts,
      bankTransactions,
      mappingRules,
      chartAccounts,
      journalEntries,
    }, null, 2);
  }

  // Import data
  async importData(jsonData: string, clearExisting = true): Promise<void> {
    const data = JSON.parse(jsonData);

    if (data.config) {
      await this.saveConfig(data.config);
    }

    if (data.sources) {
      if (clearExisting) {
        await this.saveSources(data.sources);
      } else {
        for (const source of data.sources) {
          await this.addSource(source);
        }
      }
    }

    if (data.salaries) {
      if (clearExisting) {
        await this.saveSalaries(data.salaries);
      } else {
        for (const salary of data.salaries) {
          await this.addSalary(salary);
        }
      }
    }

    if (data.salaryTaxes) {
      if (clearExisting) {
        await this.saveSalaryTaxes(data.salaryTaxes);
      } else {
        for (const tax of data.salaryTaxes) {
          await this.addSalaryTax(tax);
        }
      }
    }

    // Import bank data if present
    if (data.bankAccounts) {
      if (clearExisting) {
        await this.clearBankAccounts();
      }
      for (const account of data.bankAccounts) {
        await this.addBankAccount(account);
      }
    }

    if (data.bankTransactions) {
      if (clearExisting) {
        await this.clearBankTransactions();
      }
      for (const tx of data.bankTransactions) {
        try {
          await this.addBankTransaction(tx);
        } catch {
          // Skip duplicates silently
        }
      }
    }

    if (data.mappingRules) {
      if (clearExisting) {
        await this.clearMappingRules();
      }
      for (const rule of data.mappingRules) {
        await this.addMappingRule(rule);
      }
    }

    // Import accounting data if present
    if (data.chartAccounts) {
      if (clearExisting) {
        await this.clearChartAccounts();
      }
      for (const account of data.chartAccounts) {
        try {
          await this.addChartAccount(account);
        } catch {
          // Skip duplicates
        }
      }
    }

    if (data.journalEntries) {
      if (clearExisting) {
        await this.clearJournalEntries();
      }
      for (const entry of data.journalEntries) {
        try {
          await this.addJournalEntry(entry);
        } catch {
          // Skip duplicates
        }
      }
    }
  }

  // Clear operations for import
  private async clearBankAccounts(): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankAccounts', 'readwrite');
      tx.objectStore('bankAccounts').clear();
      tx.oncomplete = () => resolve();
    });
  }

  private async clearBankTransactions(): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('bankTransactions', 'readwrite');
      tx.objectStore('bankTransactions').clear();
      tx.oncomplete = () => resolve();
    });
  }

  private async clearMappingRules(): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('mappingRules', 'readwrite');
      tx.objectStore('mappingRules').clear();
      tx.oncomplete = () => resolve();
    });
  }

  // ============================================
  // Chart of Accounts operations
  // ============================================

  async getChartAccounts(): Promise<ChartAccount[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('chartAccounts', 'readonly');
      const request = tx.objectStore('chartAccounts').getAll();
      request.onsuccess = () => {
        const result = request.result;
        if (result.length === 0) {
          this.initDefaultChartAccounts().then(resolve);
        } else {
          resolve(result);
        }
      };
    });
  }

  private async initDefaultChartAccounts(): Promise<ChartAccount[]> {
    const now = new Date().toISOString();
    const accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS.map(a => ({
      ...a,
      createdAt: now,
      updatedAt: now,
    }));
    await this.saveChartAccounts(accounts);
    return accounts;
  }

  async saveChartAccounts(accounts: ChartAccount[]): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('chartAccounts', 'readwrite');
      const store = tx.objectStore('chartAccounts');
      store.clear();
      accounts.forEach(a => store.put(a));
      tx.oncomplete = () => resolve();
    });
  }

  async addChartAccount(account: ChartAccount): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('chartAccounts', 'readwrite');
      const request = tx.objectStore('chartAccounts').add(account);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateChartAccount(account: ChartAccount): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('chartAccounts', 'readwrite');
      tx.objectStore('chartAccounts').put(account);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteChartAccount(id: string): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('chartAccounts', 'readwrite');
      tx.objectStore('chartAccounts').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  async getChartAccountById(id: string): Promise<ChartAccount | undefined> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('chartAccounts', 'readonly');
      const request = tx.objectStore('chartAccounts').get(id);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getChartAccountByBankAccountId(bankAccountId: number): Promise<ChartAccount | undefined> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('chartAccounts', 'readonly');
      const index = tx.objectStore('chartAccounts').index('bankAccountId');
      const request = index.get(bankAccountId);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getChartAccountsByType(type: string): Promise<ChartAccount[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('chartAccounts', 'readonly');
      const index = tx.objectStore('chartAccounts').index('type');
      const request = index.getAll(IDBKeyRange.only(type));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // ============================================
  // Journal Entry operations
  // ============================================

  async getJournalEntries(): Promise<JournalEntry[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('journalEntries', 'readonly');
      const request = tx.objectStore('journalEntries').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getJournalEntriesByDateRange(startDate: string, endDate: string): Promise<JournalEntry[]> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('journalEntries', 'readonly');
      const index = tx.objectStore('journalEntries').index('date');
      const request = index.getAll(IDBKeyRange.bound(startDate, endDate));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getJournalEntryByBankTransaction(bankTransactionId: number): Promise<JournalEntry | undefined> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('journalEntries', 'readonly');
      const index = tx.objectStore('journalEntries').index('bankTransactionId');
      const request = index.get(bankTransactionId);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async addJournalEntry(entry: JournalEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('journalEntries', 'readwrite');
      const request = tx.objectStore('journalEntries').add(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateJournalEntry(entry: JournalEntry): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('journalEntries', 'readwrite');
      tx.objectStore('journalEntries').put(entry);
      tx.oncomplete = () => resolve();
    });
  }

  async deleteJournalEntry(id: string): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('journalEntries', 'readwrite');
      tx.objectStore('journalEntries').delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  async getJournalEntryById(id: string): Promise<JournalEntry | undefined> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('journalEntries', 'readonly');
      const request = tx.objectStore('journalEntries').get(id);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async clearChartAccounts(): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('chartAccounts', 'readwrite');
      tx.objectStore('chartAccounts').clear();
      tx.oncomplete = () => resolve();
    });
  }

  private async clearJournalEntries(): Promise<void> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction('journalEntries', 'readwrite');
      tx.objectStore('journalEntries').clear();
      tx.oncomplete = () => resolve();
    });
  }

  // ============================================
  // Category-Only Export/Import operations
  // ============================================

  // Export only chart accounts as JSON
  async exportChartAccounts(): Promise<string> {
    const chartAccounts = await this.getChartAccounts();
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      accounts: chartAccounts.map(({ createdAt, updatedAt, ...rest }) => rest),
    }, null, 2);
  }

  // Import chart accounts from JSON (replaces all existing)
  async importChartAccounts(jsonData: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(jsonData);
      const accounts = data.accounts || data;

      if (!Array.isArray(accounts)) {
        throw new Error('Invalid data format: expected an array of accounts');
      }

      // Clear existing accounts
      await this.clearChartAccounts();

      const now = new Date().toISOString();

      // Import each account
      for (const account of accounts) {
        try {
          if (!account.id || !account.code || !account.name || !account.type) {
            errors.push(`Skipping invalid account: missing required fields`);
            continue;
          }

          const fullAccount: ChartAccount = {
            ...account,
            isActive: account.isActive !== false,
            isSystem: account.isSystem || false,
            createdAt: now,
            updatedAt: now,
          };

          await this.addChartAccount(fullAccount);
          imported++;
        } catch (err) {
          errors.push(`Failed to import account ${account.code}: ${err}`);
        }
      }
    } catch (err) {
      errors.push(`Failed to parse JSON: ${err}`);
    }

    return { imported, errors };
  }

  // Replace chart accounts with a preset
  async replaceChartAccountsWithPreset(accounts: Omit<ChartAccount, 'createdAt' | 'updatedAt'>[]): Promise<void> {
    await this.clearChartAccounts();

    const now = new Date().toISOString();
    for (const account of accounts) {
      const fullAccount: ChartAccount = {
        ...account,
        createdAt: now,
        updatedAt: now,
      };
      await this.addChartAccount(fullAccount);
    }
  }

  // ============================================
  // Mapping Rules Export/Import operations
  // ============================================

  // Export mapping rules as JSON
  async exportMappingRules(): Promise<string> {
    const mappingRules = await this.getMappingRules();
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      rules: mappingRules.map(({ id, createdAt, ...rest }) => rest),
    }, null, 2);
  }

  // Import mapping rules from JSON (replaces all existing)
  async importMappingRules(jsonData: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(jsonData);
      const rules = data.rules || data;

      if (!Array.isArray(rules)) {
        throw new Error('Invalid data format: expected an array of rules');
      }

      // Clear existing rules
      await this.clearMappingRules();

      const now = new Date().toISOString();

      // Import each rule
      for (const rule of rules) {
        try {
          if (!rule.pattern || !rule.matchField || !rule.category) {
            errors.push(`Skipping invalid rule: missing required fields (pattern, matchField, or category)`);
            continue;
          }

          const fullRule: Omit<TransactionMappingRule, 'id'> = {
            pattern: rule.pattern,
            matchField: rule.matchField,
            category: rule.category,
            accountId: rule.accountId,
            revenueSourceId: rule.revenueSourceId,
            transferAccountId: rule.transferAccountId,
            chartAccountId: rule.chartAccountId,
            isActive: rule.isActive !== false,
            priority: rule.priority ?? 0,
            createdAt: now,
          };

          await this.addMappingRule(fullRule);
          imported++;
        } catch (err) {
          errors.push(`Failed to import rule "${rule.pattern}": ${err}`);
        }
      }
    } catch (err) {
      errors.push(`Failed to parse JSON: ${err}`);
    }

    return { imported, errors };
  }

  // Clear all data and reinitialize with defaults
  async clearAllData(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const storeNames = [
      'config',
      'sources',
      'salaries',
      'salaryTaxes',
      'bankAccounts',
      'bankTransactions',
      'mappingRules',
      'chartAccounts',
      'journalEntries',
    ];

    // Clear all stores in a single transaction
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeNames, 'readwrite');

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();

      for (const storeName of storeNames) {
        tx.objectStore(storeName).clear();
      }
    });
  }
}

export const db = new RevenueDB();
export default db;
