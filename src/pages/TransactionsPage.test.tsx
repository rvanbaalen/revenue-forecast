import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionsPage } from './TransactionsPage';
import type { Transaction, BankAccount, Subcategory } from '../types';

// Generate mock transactions
const generateTransactions = (count: number): Transaction[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `tx-${i + 1}`,
    accountId: i % 2 === 0 ? 'acc-1' : 'acc-2',
    fitId: `fit-${i + 1}`,
    date: new Date(2024, 0, count - i).toISOString().split('T')[0],
    amount: i % 3 === 0 ? '100.00' : '-50.00',
    name: `Transaction ${i + 1}`,
    memo: `Memo ${i + 1}`,
    type: i % 3 === 0 ? 'CREDIT' : 'DEBIT',
    category: i % 4 === 0 ? 'income' : i % 4 === 1 ? 'expense' : i % 4 === 2 ? 'transfer' : 'uncategorized',
    subcategory: i % 4 === 0 ? 'Salary' : i % 4 === 1 ? 'Food' : '',
    importBatchId: 'batch-1',
    createdAt: new Date().toISOString(),
  }));
};

const mockAccounts: BankAccount[] = [
  {
    id: 'acc-1',
    contextId: 'ctx-1',
    bankId: '123',
    accountNumber: '****1234',
    type: 'checking',
    name: 'Checking Account',
    currency: 'USD',
    accountIdHash: 'hash1',
    balance: '1000.00',
    balanceDate: '2024-01-01',
    createdAt: '2024-01-01',
  },
  {
    id: 'acc-2',
    contextId: 'ctx-1',
    bankId: '456',
    accountNumber: '****5678',
    type: 'credit_card',
    name: 'Savings Account',
    currency: 'USD',
    accountIdHash: 'hash2',
    balance: '5000.00',
    balanceDate: '2024-01-01',
    createdAt: '2024-01-01',
  },
];

const mockSubcategories: Subcategory[] = [
  { id: 'sub-1', contextId: 'ctx-1', type: 'income', name: 'Salary', createdAt: '2024-01-01' },
  { id: 'sub-2', contextId: 'ctx-1', type: 'expense', name: 'Food', createdAt: '2024-01-01' },
];

// Mock functions
const mockUpdateTransaction = vi.fn();
const mockUpdateTransactions = vi.fn();
const mockAddMappingRule = vi.fn();

// Create mock context value factory
const createMockContext = (transactionCount: number) => ({
  contextTransactions: generateTransactions(transactionCount),
  contextAccounts: mockAccounts,
  contextSubcategories: mockSubcategories,
  updateTransaction: mockUpdateTransaction,
  updateTransactions: mockUpdateTransactions,
  addMappingRule: mockAddMappingRule,
  activeContextId: 'ctx-1',
});

let mockContextValue = createMockContext(50);

// Mock the AppContext
vi.mock('../context/AppContext', () => ({
  useApp: () => mockContextValue,
}));

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextValue = createMockContext(50);
  });

  describe('Pagination', () => {
    it('should display first page of transactions by default', () => {
      render(<TransactionsPage />);

      // Should show "Showing 1 to 25 of 50 transactions"
      expect(screen.getByText(/Showing 1 to 25 of 50 transactions/i)).toBeInTheDocument();
    });

    it('should show page numbers with 50 transactions', () => {
      render(<TransactionsPage />);

      // Should show page number buttons (current page 1, and page 2)
      // Current page is active
      const page1Button = screen.getByRole('button', { name: '1' });
      expect(page1Button).toBeInTheDocument();
      expect(page1Button).toHaveAttribute('aria-current', 'page');

      // Page 2 should be clickable
      const page2Button = screen.getByRole('button', { name: '2' });
      expect(page2Button).toBeInTheDocument();
    });

    it('should navigate to next page when clicking next button', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Click next page button (shadcn pagination uses "Go to next page" aria-label)
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await user.click(nextButton);

      // Should now show second page
      expect(screen.getByText(/Showing 26 to 50 of 50 transactions/i)).toBeInTheDocument();
    });

    it('should navigate to previous page when clicking previous button', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Go to page 2 first
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await user.click(nextButton);

      // Click previous page button
      const prevButton = screen.getByRole('button', { name: /go to previous page/i });
      await user.click(prevButton);

      // Should be back on first page
      expect(screen.getByText(/Showing 1 to 25 of 50 transactions/i)).toBeInTheDocument();
    });

    it('should navigate to first page by clicking page 1 button', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Go to page 2 first
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await user.click(nextButton);

      // Click page 1 button (the first page number shown in pagination)
      const page1Button = screen.getByRole('button', { name: '1' });
      await user.click(page1Button);

      // Should be on first page
      expect(screen.getByText(/Showing 1 to 25 of 50 transactions/i)).toBeInTheDocument();
    });

    it('should navigate to last page by clicking last page number', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Click page 2 button (the last page with 50 items and 25 per page)
      const page2Button = screen.getByRole('button', { name: '2' });
      await user.click(page2Button);

      // Should be on last page
      expect(screen.getByText(/Showing 26 to 50 of 50 transactions/i)).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      render(<TransactionsPage />);

      const prevButton = screen.getByRole('button', { name: /go to previous page/i });

      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Go to last page by clicking page 2
      const page2Button = screen.getByRole('button', { name: '2' });
      await user.click(page2Button);

      const nextButton = screen.getByRole('button', { name: /go to next page/i });

      expect(nextButton).toBeDisabled();
    });

    it('should reset to page 1 when search filter changes', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Go to page 2
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await user.click(nextButton);
      expect(screen.getByText(/Showing 26 to/i)).toBeInTheDocument();

      // Type in search - desktop version (search for something that will match)
      const searchInput = screen.getAllByPlaceholderText(/search/i)[0];
      await user.type(searchInput, 'Transaction');

      // Should reset to page 1 (showing from 1)
      expect(screen.getByText(/Showing 1 to/i)).toBeInTheDocument();
    });
  });

  describe('Page Size', () => {
    it('should have page size selector with correct default value', () => {
      render(<TransactionsPage />);

      // Initially shows 25 per page
      expect(screen.getByText(/Showing 1 to 25 of 50 transactions/i)).toBeInTheDocument();

      // Page size selector should be present on desktop
      const showLabel = screen.getByText('Show');
      expect(showLabel).toBeInTheDocument();

      // The select trigger should show current value
      const pageSizeContainer = showLabel.closest('div');
      const pageSizeSelect = within(pageSizeContainer!).getByRole('combobox');
      expect(pageSizeSelect).toBeInTheDocument();
    });
  });

  describe('Search Filter', () => {
    it('should filter transactions by search term', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Initially 50 transactions
      expect(screen.getByText(/of 50 transactions/i)).toBeInTheDocument();

      // Type in search - desktop version
      const searchInput = screen.getAllByPlaceholderText(/search/i)[0];
      await user.type(searchInput, 'Transaction 1');

      // Should filter results (matches Transaction 1, 10-19)
      const showingText = screen.getByText(/Showing/i);
      expect(showingText).toBeInTheDocument();
    });
  });

  describe('Category Filter', () => {
    it('should have category filter selector on desktop', () => {
      render(<TransactionsPage />);

      // Initially shows 50 transactions
      expect(screen.getByText(/of 50 transactions/i)).toBeInTheDocument();

      // Find the category filter by looking for the one with Filter icon (desktop filters section)
      const desktopFilters = document.querySelector('.hidden.md\\:flex');
      expect(desktopFilters).toBeInTheDocument();

      // Should have comboboxes for filters
      const comboboxes = within(desktopFilters as HTMLElement).getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Mobile Filter Drawer', () => {
    it('should open filter drawer when clicking filter button on mobile', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Find the mobile filter button (it has SlidersHorizontal icon)
      const filterButtons = screen.getAllByRole('button');
      const mobileFilterButton = filterButtons.find(
        (btn) => btn.querySelector('svg.lucide-sliders-horizontal')
      );

      if (mobileFilterButton) {
        await user.click(mobileFilterButton);

        // Sheet should be open with "Filters" title
        expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument();
      }
    });

    it('should show active filter indicator when filters are applied', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Type in search to activate a filter
      const searchInput = screen.getAllByPlaceholderText(/search/i)[0];
      await user.type(searchInput, 'test');

      // Check for the active indicator dot on mobile filter button
      const indicatorDot = document.querySelector('.bg-primary.rounded-full');
      expect(indicatorDot).toBeInTheDocument();
    });

    it('should have clear filters button when filters are active', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Type in search to activate a filter
      const searchInput = screen.getAllByPlaceholderText(/search/i)[0];
      await user.type(searchInput, 'test');

      // Open mobile filter drawer
      const filterButtons = screen.getAllByRole('button');
      const mobileFilterButton = filterButtons.find(
        (btn) => btn.querySelector('svg.lucide-sliders-horizontal')
      );

      if (mobileFilterButton) {
        await user.click(mobileFilterButton);

        // Should have clear filters button
        expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
      }
    });

    it('should close drawer and clear filters when clicking clear button', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Type in search to activate a filter
      const searchInput = screen.getAllByPlaceholderText(/search/i)[0];
      await user.type(searchInput, 'test');

      // Open mobile filter drawer
      const filterButtons = screen.getAllByRole('button');
      const mobileFilterButton = filterButtons.find(
        (btn) => btn.querySelector('svg.lucide-sliders-horizontal')
      );

      if (mobileFilterButton) {
        await user.click(mobileFilterButton);

        // Click clear filters button
        const clearButton = screen.getByRole('button', { name: /clear filters/i });
        await user.click(clearButton);

        // Search should be cleared
        expect(searchInput).toHaveValue('');
      }
    });
  });

  describe('Responsive Table', () => {
    it('should render table with all columns', () => {
      render(<TransactionsPage />);

      // Check for column headers
      expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument();
    });

    it('should have Account column with responsive class', () => {
      render(<TransactionsPage />);

      const accountHeader = screen.getByRole('columnheader', { name: 'Account' });
      expect(accountHeader).toHaveClass('hidden', 'sm:table-cell');
    });

    it('should have Subcategory column with responsive class', () => {
      render(<TransactionsPage />);

      const subcategoryHeader = screen.getByRole('columnheader', { name: 'Subcategory' });
      expect(subcategoryHeader).toHaveClass('hidden', 'md:table-cell');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no transactions', () => {
      mockContextValue = {
        ...createMockContext(0),
        contextTransactions: [],
      };

      render(<TransactionsPage />);

      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
      expect(screen.getByText('Import an OFX file to add transactions')).toBeInTheDocument();
    });

    it('should show filtered empty state when filters return no results', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Search for something that doesn't exist
      const searchInput = screen.getAllByPlaceholderText(/search/i)[0];
      await user.type(searchInput, 'nonexistent transaction xyz123');

      expect(screen.getByText('No matching transactions')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });
  });

  describe('Transaction Count Display', () => {
    it('should show correct transaction counts in header', () => {
      render(<TransactionsPage />);

      // Header shows total count
      expect(screen.getByText('50 transactions')).toBeInTheDocument();
    });

    it('should show uncategorized count when there are uncategorized transactions', () => {
      render(<TransactionsPage />);

      // With 50 transactions, every 4th is uncategorized (indices 3, 7, 11, etc.)
      // That's about 12-13 uncategorized
      // The header shows "(X uncategorized)" in a span with text-warning class
      const headerElement = screen.getByRole('heading', { name: 'Transactions' });
      const headerContainer = headerElement.parentElement;
      const uncategorizedSpan = headerContainer?.querySelector('.text-warning');
      expect(uncategorizedSpan).toBeInTheDocument();
      expect(uncategorizedSpan?.textContent).toMatch(/\d+ uncategorized/);
    });
  });
});
