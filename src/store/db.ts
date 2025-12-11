import type { AppConfig, RevenueSource, Salary, SalaryTax } from '../types';
import { DEFAULT_CONFIG, DEFAULT_SOURCES, DEFAULT_SALARIES, DEFAULT_SALARY_TAXES } from '../types';

const DB_NAME = 'RevenueTracker2026';
const DB_VERSION = 2;

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

  // Export all data
  async exportData(): Promise<string> {
    const config = await this.getConfig();
    const sources = await this.getSources();
    const salaries = await this.getSalaries();
    const salaryTaxes = await this.getSalaryTaxes();
    return JSON.stringify({ config, sources, salaries, salaryTaxes }, null, 2);
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
  }
}

export const db = new RevenueDB();
export default db;
