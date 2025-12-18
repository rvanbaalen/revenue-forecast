import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportPage } from './ImportPage';

// Mock the router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Create a mock context value
const mockImportOFXFile = vi.fn().mockResolvedValue({
  success: true,
  accountId: 'acc-123',
  accountName: 'Checking ****1234',
  isNewAccount: true,
  totalTransactions: 3,
  newTransactions: 3,
  duplicatesSkipped: 0,
  dateRange: { start: '2024-01-01', end: '2024-01-31' },
  errors: [],
});

const mockActiveContext = {
  id: 'ctx-123',
  name: 'Personal',
  createdAt: '2024-01-01',
};

const mockContexts = [mockActiveContext];

const mockCreateContext = vi.fn().mockResolvedValue({
  id: 'ctx-new',
  name: 'New Context',
  createdAt: '2024-01-02',
});

// Mock the AppContext
vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    importOFXFile: mockImportOFXFile,
    activeContext: mockActiveContext,
    contexts: mockContexts,
    createContext: mockCreateContext,
  }),
}));

// Mock the OFX parser
vi.mock('../utils/ofx-parser', () => ({
  parseOFXFile: vi.fn().mockResolvedValue({
    account: {
      bankId: '123456789',
      accountId: '9876543210',
      accountType: 'CHECKING',
    },
    currency: 'USD',
    transactions: [
      {
        fitId: 'tx-1',
        type: 'DEBIT',
        amount: '-50.00',
        datePosted: '2024-01-15',
        name: 'Coffee Shop',
        memo: 'Purchase',
      },
      {
        fitId: 'tx-2',
        type: 'CREDIT',
        amount: '1000.00',
        datePosted: '2024-01-01',
        name: 'Payroll',
        memo: 'Salary',
      },
      {
        fitId: 'tx-3',
        type: 'DEBIT',
        amount: '-25.00',
        datePosted: '2024-01-20',
        name: 'Gas Station',
        memo: '',
      },
    ],
    balance: {
      amount: '5000.00',
      asOf: '2024-01-31',
    },
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31',
    },
  }),
}));

describe('ImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the upload area', () => {
    render(<ImportPage />);

    expect(screen.getByText(/drop your ofx files here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select files/i })).toBeInTheDocument();
  });

  it('should show the import button after adding files', async () => {
    const user = userEvent.setup();

    render(<ImportPage />);

    // Create a mock OFX file
    const ofxContent = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>9876543210
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>tx-1
<NAME>Coffee Shop
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    const file = new File([ofxContent], 'bank-statement.ofx', {
      type: 'application/x-ofx',
    });

    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Simulate file selection
    await user.upload(fileInput, file);

    // Wait for the file to be processed and the import button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /import 3 transactions/i })).toBeInTheDocument();
    });
  });

  it('should allow clicking the import button after adding files', async () => {
    const user = userEvent.setup();

    render(<ImportPage />);

    // Create a mock OFX file
    const file = new File(['mock ofx content'], 'bank-statement.ofx', {
      type: 'application/x-ofx',
    });

    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection
    await user.upload(fileInput, file);

    // Wait for the import button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /import 3 transactions/i })).toBeInTheDocument();
    });

    // Get the import button
    const importButton = screen.getByRole('button', { name: /import 3 transactions/i });

    // Verify the button is not disabled
    expect(importButton).not.toBeDisabled();

    // Click the import button
    await user.click(importButton);

    // Verify the import function was called
    await waitFor(() => {
      expect(mockImportOFXFile).toHaveBeenCalledTimes(1);
    });
  });

  it('should have the import button enabled and respond to clicks', async () => {
    const user = userEvent.setup();

    render(<ImportPage />);

    // Create a mock OFX file
    const file = new File(['mock ofx content'], 'bank-statement.ofx', {
      type: 'application/x-ofx',
    });

    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection
    await user.upload(fileInput, file);

    // Wait for the import button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /import 3 transactions/i })).toBeInTheDocument();
    });

    const importButton = screen.getByRole('button', { name: /import 3 transactions/i });

    // Verify button is clickable
    expect(importButton).toBeEnabled();

    // Check that clicking works
    const clickPromise = user.click(importButton);

    // The click should not throw an error and should complete
    await expect(clickPromise).resolves.not.toThrow();

    // Verify import was triggered
    await waitFor(() => {
      expect(mockImportOFXFile).toHaveBeenCalled();
    });
  });

  it('should have the import button with proper accessibility', async () => {
    const user = userEvent.setup();

    render(<ImportPage />);

    // Create a mock OFX file
    const file = new File(['mock ofx content'], 'bank-statement.ofx', {
      type: 'application/x-ofx',
    });

    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection
    await user.upload(fileInput, file);

    // Wait for the import button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /import 3 transactions/i })).toBeInTheDocument();
    });

    const importButton = screen.getByRole('button', { name: /import 3 transactions/i });

    // Check button type - it should be "button" to prevent form submission issues
    // Currently the Button component doesn't set type by default
    expect(importButton.getAttribute('type')).toBe('button');
  });
});
