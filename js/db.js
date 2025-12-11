/**
 * IndexedDB Database Module for Revenue Forecasting Tool
 */

const DB_NAME = 'RevenueForecastDB';
const DB_VERSION = 1;
const STORE_NAME = 'revenues';

class RevenueDB {
    constructor() {
        this.db = null;
    }

    /**
     * Initialize the database connection
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create revenues store with indexes
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Create indexes for querying
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('dateCategory', ['date', 'category'], { unique: false });
                }
            };
        });
    }

    /**
     * Add a new revenue entry
     * @param {Object} entry - Revenue entry { date, amount, category, description }
     */
    async addEntry(entry) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const record = {
                ...entry,
                amount: parseFloat(entry.amount),
                createdAt: new Date().toISOString()
            };

            const request = store.add(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to add entry'));
        });
    }

    /**
     * Update an existing revenue entry
     * @param {Object} entry - Revenue entry with id
     */
    async updateEntry(entry) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const record = {
                ...entry,
                amount: parseFloat(entry.amount),
                updatedAt: new Date().toISOString()
            };

            const request = store.put(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to update entry'));
        });
    }

    /**
     * Delete a revenue entry
     * @param {number} id - Entry ID
     */
    async deleteEntry(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete entry'));
        });
    }

    /**
     * Get all revenue entries
     */
    async getAllEntries() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get entries'));
        });
    }

    /**
     * Get entries by date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     */
    async getEntriesByDateRange(startDate, endDate) {
        const allEntries = await this.getAllEntries();
        return allEntries.filter(entry => {
            return entry.date >= startDate && entry.date <= endDate;
        });
    }

    /**
     * Get entries by category
     * @param {string} category - Category name
     */
    async getEntriesByCategory(category) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('category');
            const request = index.getAll(category);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get entries by category'));
        });
    }

    /**
     * Get unique categories
     */
    async getCategories() {
        const entries = await this.getAllEntries();
        const categories = [...new Set(entries.map(e => e.category))];
        return categories.sort();
    }

    /**
     * Export all data as JSON
     */
    async exportData() {
        const entries = await this.getAllEntries();
        return JSON.stringify(entries, null, 2);
    }

    /**
     * Import data from JSON
     * @param {string} jsonData - JSON string of entries
     * @param {boolean} clearExisting - Whether to clear existing data first
     */
    async importData(jsonData, clearExisting = false) {
        const entries = JSON.parse(jsonData);

        if (clearExisting) {
            await this.clearAllData();
        }

        const results = [];
        for (const entry of entries) {
            // Remove id to let IndexedDB generate new ones
            const { id, ...entryWithoutId } = entry;
            const newId = await this.addEntry(entryWithoutId);
            results.push(newId);
        }

        return results;
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to clear data'));
        });
    }

    /**
     * Get monthly aggregated data
     */
    async getMonthlyData() {
        const entries = await this.getAllEntries();
        const monthlyData = {};

        entries.forEach(entry => {
            const monthKey = entry.date.substring(0, 7); // YYYY-MM
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { total: 0, count: 0, categories: {} };
            }
            monthlyData[monthKey].total += entry.amount;
            monthlyData[monthKey].count += 1;

            if (!monthlyData[monthKey].categories[entry.category]) {
                monthlyData[monthKey].categories[entry.category] = 0;
            }
            monthlyData[monthKey].categories[entry.category] += entry.amount;
        });

        return monthlyData;
    }
}

// Export singleton instance
const revenueDB = new RevenueDB();
export default revenueDB;
