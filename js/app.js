/**
 * Revenue Forecast Application
 * Main application logic and UI management
 */

import revenueDB from './db.js';
import RevenueForecast from './forecast.js';

class RevenueApp {
    constructor() {
        this.charts = {};
        this.currentDeleteId = null;
        this.entries = [];
        this.monthlyData = {};
    }

    async init() {
        try {
            await revenueDB.init();
            this.setupEventListeners();
            await this.loadData();
            this.showToast('Application loaded successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('Failed to initialize application', 'error');
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Add entry button
        document.getElementById('addEntryBtn').addEventListener('click', () => this.openEntryModal());

        // Entry form
        document.getElementById('entryForm').addEventListener('submit', (e) => this.handleEntrySubmit(e));
        document.getElementById('cancelEntryBtn').addEventListener('click', () => this.closeEntryModal());

        // Delete modal
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());

        // Import/Export
        document.getElementById('importBtn').addEventListener('click', () => this.openImportModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('cancelImportBtn').addEventListener('click', () => this.closeImportModal());
        document.getElementById('confirmImportBtn').addEventListener('click', () => this.importData());

        // Filters
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());

        // Forecast
        document.getElementById('generateForecast').addEventListener('click', () => this.generateForecast());
        document.getElementById('forecastMethodSelect').addEventListener('change', () => this.generateForecast());
        document.getElementById('forecastPeriods').addEventListener('change', () => this.generateForecast());

        // Close modals on outside click
        ['entryModal', 'deleteModal', 'importModal'].forEach(modalId => {
            document.getElementById(modalId).addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.closeAllModals();
                }
            });
        });

        // Set default date to today
        document.getElementById('entryDate').valueAsDate = new Date();
    }

    async loadData() {
        this.entries = await revenueDB.getAllEntries();
        this.monthlyData = await revenueDB.getMonthlyData();

        this.updateStats();
        this.updateEntriesTable();
        this.updateCategoryFilter();
        this.updateCharts();
        this.updateAnalytics();
        this.generateForecast();
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-active');
            btn.classList.add('text-gray-500');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('tab-active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.remove('text-gray-500');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');

        // Refresh charts when switching to relevant tabs
        if (tabName === 'dashboard') {
            this.updateCharts();
        } else if (tabName === 'forecast') {
            this.generateForecast();
        }
    }

    updateStats() {
        const total = this.entries.reduce((sum, e) => sum + e.amount, 0);
        document.getElementById('totalRevenue').textContent = this.formatCurrency(total);
        document.getElementById('totalEntriesCount').textContent = `${this.entries.length} entries`;

        // This month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = now.getMonth() === 0
            ? `${now.getFullYear() - 1}-12`
            : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

        const thisMonthData = this.monthlyData[currentMonth] || { total: 0 };
        const lastMonthData = this.monthlyData[lastMonth] || { total: 0 };

        document.getElementById('thisMonthRevenue').textContent = this.formatCurrency(thisMonthData.total);

        // Month change
        const changeEl = document.getElementById('monthChange');
        if (lastMonthData.total > 0) {
            const change = ((thisMonthData.total - lastMonthData.total) / lastMonthData.total) * 100;
            const changeText = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
            const changeClass = change >= 0 ? 'text-green-600' : 'text-red-600';
            changeEl.innerHTML = `<span class="${changeClass}">${changeText}</span> vs last month`;
        } else {
            changeEl.innerHTML = `<span class="text-gray-500">No data for comparison</span>`;
        }

        // Average monthly
        const months = Object.keys(this.monthlyData);
        const avgMonthly = months.length > 0
            ? Object.values(this.monthlyData).reduce((sum, m) => sum + m.total, 0) / months.length
            : 0;
        document.getElementById('avgMonthly').textContent = this.formatCurrency(avgMonthly);
        document.getElementById('monthsTracked').textContent = `${months.length} months tracked`;
    }

    updateEntriesTable(filteredEntries = null) {
        const entries = filteredEntries || this.entries;
        const tbody = document.getElementById('entriesTableBody');
        const noEntriesMsg = document.getElementById('noEntriesMessage');

        if (entries.length === 0) {
            tbody.innerHTML = '';
            noEntriesMsg.classList.remove('hidden');
            return;
        }

        noEntriesMsg.classList.add('hidden');

        // Sort by date descending
        const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

        tbody.innerHTML = sorted.map(entry => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.formatDate(entry.date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${this.formatCurrency(entry.amount)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                        ${this.escapeHtml(entry.category)}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    ${this.escapeHtml(entry.description || '-')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button onclick="app.openEntryModal(${entry.id})" class="text-primary-600 hover:text-primary-900 mr-3">
                        Edit
                    </button>
                    <button onclick="app.openDeleteModal(${entry.id})" class="text-red-600 hover:text-red-900">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async updateCategoryFilter() {
        const categories = await revenueDB.getCategories();
        const select = document.getElementById('filterCategory');
        const datalist = document.getElementById('categoryList');

        // Update filter dropdown
        select.innerHTML = '<option value="">All Categories</option>' +
            categories.map(cat => `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>`).join('');

        // Update datalist for entry form
        datalist.innerHTML = categories.map(cat =>
            `<option value="${this.escapeHtml(cat)}">`
        ).join('');
    }

    updateCharts() {
        this.updateRevenueChart();
        this.updateCategoryChart();
    }

    updateRevenueChart() {
        const ctx = document.getElementById('revenueChart').getContext('2d');

        // Prepare data - last 12 months
        const months = Object.keys(this.monthlyData).sort();
        const recentMonths = months.slice(-12);

        const labels = recentMonths.map(m => {
            const [year, month] = m.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });

        const data = recentMonths.map(m => this.monthlyData[m]?.total || 0);

        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Revenue',
                    data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '$' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    updateCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');

        // Aggregate by category
        const categoryTotals = {};
        this.entries.forEach(entry => {
            if (!categoryTotals[entry.category]) {
                categoryTotals[entry.category] = 0;
            }
            categoryTotals[entry.category] += entry.amount;
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        // Generate colors
        const colors = this.generateColors(labels.length);

        if (this.charts.category) {
            this.charts.category.destroy();
        }

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    generateForecast() {
        const method = document.getElementById('forecastMethodSelect').value;
        const periods = parseInt(document.getElementById('forecastPeriods').value);

        // Prepare historical data
        const months = Object.keys(this.monthlyData).sort();
        const historicalData = months.map(month => ({
            month,
            total: this.monthlyData[month].total
        }));

        if (historicalData.length === 0) {
            document.getElementById('forecastNext').textContent = '$0';
            document.getElementById('forecastMethod').textContent = this.getMethodName(method);
            this.updateForecastChart([], []);
            this.updateForecastTable([]);
            return;
        }

        // Generate forecast
        const forecasts = RevenueForecast.generateForecast(historicalData, periods, method);

        // Update UI
        if (forecasts.length > 0) {
            document.getElementById('forecastNext').textContent = this.formatCurrency(forecasts[0].predicted);
        }
        document.getElementById('forecastMethod').textContent = this.getMethodName(method);

        this.updateForecastChart(historicalData, forecasts);
        this.updateForecastTable(forecasts);
    }

    updateForecastChart(historical, forecasts) {
        const ctx = document.getElementById('forecastChart').getContext('2d');

        // Combine historical and forecast data
        const historicalLabels = historical.map(h => {
            const [year, month] = h.month.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });

        const forecastLabels = forecasts.map(f => {
            const [year, month] = f.month.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });

        const labels = [...historicalLabels, ...forecastLabels];
        const historicalData = [...historical.map(h => h.total), ...new Array(forecasts.length).fill(null)];
        const forecastData = [...new Array(historical.length - 1).fill(null),
            historical.length > 0 ? historical[historical.length - 1].total : null,
            ...forecasts.map(f => f.predicted)];

        if (this.charts.forecast) {
            this.charts.forecast.destroy();
        }

        this.charts.forecast = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Historical',
                        data: historicalData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Forecast',
                        data: forecastData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderDash: [5, 5],
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '$' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    updateForecastTable(forecasts) {
        const tbody = document.getElementById('forecastTableBody');

        if (forecasts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="px-6 py-4 text-center text-gray-500">
                        No forecast data available. Add revenue entries to generate forecasts.
                    </td>
                </tr>
            `;
            return;
        }

        let cumulative = 0;
        tbody.innerHTML = forecasts.map(f => {
            cumulative += f.predicted;
            const [year, month] = f.month.split('-');
            const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${monthName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ${this.formatCurrency(f.predicted)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${this.formatCurrency(cumulative)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateAnalytics() {
        if (this.entries.length === 0) {
            return;
        }

        // Monthly statistics
        const monthlyTotals = Object.values(this.monthlyData).map(m => m.total);
        const stats = RevenueForecast.getStatistics(monthlyTotals);

        document.getElementById('statMin').textContent = this.formatCurrency(stats.min);
        document.getElementById('statMax').textContent = this.formatCurrency(stats.max);
        document.getElementById('statAvg').textContent = this.formatCurrency(stats.avg);
        document.getElementById('statMedian').textContent = this.formatCurrency(stats.median);
        document.getElementById('statStdDev').textContent = this.formatCurrency(stats.stdDev);
        document.getElementById('statTotal').textContent = this.formatCurrency(stats.total);

        // Growth rate
        const growthRate = RevenueForecast.calculateGrowthRate(monthlyTotals);
        document.getElementById('avgGrowthRate').textContent = `${(growthRate * 100).toFixed(1)}%`;
        document.getElementById('avgGrowthRate').className = `font-medium ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`;

        // Best/Worst months
        const months = Object.keys(this.monthlyData).sort();
        let bestMonth = null, worstMonth = null;
        let maxTotal = -Infinity, minTotal = Infinity;

        months.forEach(month => {
            const total = this.monthlyData[month].total;
            if (total > maxTotal) {
                maxTotal = total;
                bestMonth = month;
            }
            if (total < minTotal) {
                minTotal = total;
                worstMonth = month;
            }
        });

        if (bestMonth) {
            const [y, m] = bestMonth.split('-');
            document.getElementById('bestMonth').textContent =
                `${new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${this.formatCurrency(maxTotal)})`;
        }

        if (worstMonth) {
            const [y, m] = worstMonth.split('-');
            document.getElementById('worstMonth').textContent =
                `${new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${this.formatCurrency(minTotal)})`;
        }

        // Seasonality
        const seasonality = RevenueForecast.detectSeasonality(monthlyTotals);
        document.getElementById('seasonalityStatus').textContent = seasonality.hasSeasonality ? 'Yes' : 'No';

        // Category performance
        this.updateCategoryPerformance();
    }

    updateCategoryPerformance() {
        const categoryData = {};
        const total = this.entries.reduce((sum, e) => sum + e.amount, 0);

        this.entries.forEach(entry => {
            if (!categoryData[entry.category]) {
                categoryData[entry.category] = { total: 0, count: 0 };
            }
            categoryData[entry.category].total += entry.amount;
            categoryData[entry.category].count += 1;
        });

        const tbody = document.getElementById('categoryPerformanceBody');
        const sortedCategories = Object.entries(categoryData)
            .sort((a, b) => b[1].total - a[1].total);

        if (sortedCategories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-center text-gray-500">
                        No category data available.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sortedCategories.map(([category, data]) => {
            const percentage = total > 0 ? (data.total / total * 100).toFixed(1) : 0;
            const avgPerEntry = data.count > 0 ? data.total / data.count : 0;

            return `
                <tr class="border-b">
                    <td class="py-2 text-sm text-gray-900">${this.escapeHtml(category)}</td>
                    <td class="py-2 text-sm text-gray-900 text-right">${this.formatCurrency(data.total)}</td>
                    <td class="py-2 text-sm text-gray-500 text-right">${data.count}</td>
                    <td class="py-2 text-sm text-gray-500 text-right">${this.formatCurrency(avgPerEntry)}</td>
                    <td class="py-2 text-sm text-gray-500 text-right">${percentage}%</td>
                </tr>
            `;
        }).join('');
    }

    applyFilters() {
        const startDate = document.getElementById('filterDateStart').value;
        const endDate = document.getElementById('filterDateEnd').value;
        const category = document.getElementById('filterCategory').value;

        let filtered = [...this.entries];

        if (startDate) {
            filtered = filtered.filter(e => e.date >= startDate);
        }
        if (endDate) {
            filtered = filtered.filter(e => e.date <= endDate);
        }
        if (category) {
            filtered = filtered.filter(e => e.category === category);
        }

        this.updateEntriesTable(filtered);
    }

    // Modal handlers
    async openEntryModal(id = null) {
        const modal = document.getElementById('entryModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('entryForm');

        form.reset();
        document.getElementById('entryDate').valueAsDate = new Date();

        if (id) {
            title.textContent = 'Edit Revenue Entry';
            const entry = this.entries.find(e => e.id === id);
            if (entry) {
                document.getElementById('entryId').value = entry.id;
                document.getElementById('entryDate').value = entry.date;
                document.getElementById('entryAmount').value = entry.amount;
                document.getElementById('entryCategory').value = entry.category;
                document.getElementById('entryDescription').value = entry.description || '';
            }
        } else {
            title.textContent = 'Add Revenue Entry';
            document.getElementById('entryId').value = '';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    closeEntryModal() {
        const modal = document.getElementById('entryModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    async handleEntrySubmit(e) {
        e.preventDefault();

        const id = document.getElementById('entryId').value;
        const entry = {
            date: document.getElementById('entryDate').value,
            amount: parseFloat(document.getElementById('entryAmount').value),
            category: document.getElementById('entryCategory').value.trim(),
            description: document.getElementById('entryDescription').value.trim()
        };

        try {
            if (id) {
                entry.id = parseInt(id);
                await revenueDB.updateEntry(entry);
                this.showToast('Entry updated successfully');
            } else {
                await revenueDB.addEntry(entry);
                this.showToast('Entry added successfully');
            }

            this.closeEntryModal();
            await this.loadData();
        } catch (error) {
            console.error('Failed to save entry:', error);
            this.showToast('Failed to save entry', 'error');
        }
    }

    openDeleteModal(id) {
        this.currentDeleteId = id;
        const modal = document.getElementById('deleteModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        this.currentDeleteId = null;
    }

    async confirmDelete() {
        if (this.currentDeleteId) {
            try {
                await revenueDB.deleteEntry(this.currentDeleteId);
                this.showToast('Entry deleted successfully');
                this.closeDeleteModal();
                await this.loadData();
            } catch (error) {
                console.error('Failed to delete entry:', error);
                this.showToast('Failed to delete entry', 'error');
            }
        }
    }

    openImportModal() {
        const modal = document.getElementById('importModal');
        document.getElementById('importFile').value = '';
        document.getElementById('clearBeforeImport').checked = false;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    closeImportModal() {
        const modal = document.getElementById('importModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    async importData() {
        const fileInput = document.getElementById('importFile');
        const clearExisting = document.getElementById('clearBeforeImport').checked;

        if (!fileInput.files || !fileInput.files[0]) {
            this.showToast('Please select a file to import', 'error');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const jsonData = e.target.result;
                await revenueDB.importData(jsonData, clearExisting);
                this.showToast('Data imported successfully');
                this.closeImportModal();
                await this.loadData();
            } catch (error) {
                console.error('Failed to import data:', error);
                this.showToast('Failed to import data. Invalid file format.', 'error');
            }
        };

        reader.readAsText(file);
    }

    async exportData() {
        try {
            const jsonData = await revenueDB.exportData();
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `revenue-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('Data exported successfully');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showToast('Failed to export data', 'error');
        }
    }

    closeAllModals() {
        this.closeEntryModal();
        this.closeDeleteModal();
        this.closeImportModal();
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatDate(dateStr) {
        const [year, month, day] = dateStr.split('-');
        return new Date(year, month - 1, day).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateColors(count) {
        const baseColors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
        ];

        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    }

    getMethodName(method) {
        const names = {
            'simple': 'Simple Moving Avg',
            'weighted': 'Weighted Moving Avg',
            'exponential': 'Exponential Smoothing',
            'linear': 'Linear Regression'
        };
        return names[method] || method;
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        toastMessage.textContent = message;
        toast.className = toast.className.replace(/bg-\w+-\d+/g, '');
        toast.classList.add(type === 'error' ? 'bg-red-600' : 'bg-gray-900');

        toast.classList.remove('translate-y-full', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');

        setTimeout(() => {
            toast.classList.add('translate-y-full', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        }, 3000);
    }
}

// Initialize the app
const app = new RevenueApp();
window.app = app; // Make available globally for onclick handlers
app.init();
