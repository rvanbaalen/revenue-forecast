# Revenue Forecast

A client-side revenue forecasting tool built with React 19, TypeScript, and Tailwind CSS v4. All data is stored locally using IndexedDB - no server required.

## Features

- **Revenue Tracking**: Track both expected (budgeted) and actual revenue
- **Multiple Currency Support**: Caribbean Guilder (Cg, ƒ) and US Dollar (USD, $) with configurable exchange rates
- **Local vs Foreign Revenue**: Distinguish between local and foreign revenue for tax calculations
- **Monthly Recurring Revenue (MRR)**: Define recurring monthly revenue sources
- **VAT Calculation**: Automatic VAT calculation for local revenue
- **Profit Tax Tracking**: Track local profit tax liability
- **Salary Management**: Track employee salaries and payroll taxes
- **Expected vs Actual Variance**: Compare budgeted revenue against actual performance
- **Import/Export**: Backup and restore data using JSON files
- **Offline Support**: Works entirely in the browser with no internet required after initial load

## Getting Started

### Option 1: GitHub Pages (Recommended)

Visit the deployed version at: `https://[username].github.io/revenue-forecast`

### Option 2: Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/[username]/revenue-forecast.git
   cd revenue-forecast
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173/revenue-forecast/` in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage

### Configuration

Set up your tax rates and currencies in the Configuration section:
- **Local Profit Tax Rate**: Tax rate for local revenue (default: 16%)
- **Local VAT Rate**: VAT rate for local revenue (default: 6%)
- **Exchange Rates**: Configure currencies and their exchange rates to Cg

### Revenue Sources

1. Add revenue sources with the "+ Add Source" button
2. Configure each source:
   - **Name**: Descriptive name for the revenue source
   - **Type**: Local or Foreign (affects tax calculations)
   - **Currency**: Select from configured currencies
   - **MRR**: Check for Monthly Recurring Revenue and set the amount

3. Enter expected (budgeted) revenue in the "Expected Revenue" section
4. Enter actual revenue as it comes in the "Actual Revenue" section

### Salaries

Track employee salaries and payroll taxes:
- Add employees with monthly salary amounts
- Configure tax type (percentage or fixed amount)
- View gross salary and tax totals

### Summary Dashboard

View at-a-glance metrics:
- Expected vs Actual revenue comparison
- Variance calculations
- Net margins

### Import/Export Data

- **Export**: Click "Export" to download your data as JSON
- **Import**: Click "Import" to load data from a previously exported JSON file

## Data Storage

All data is stored locally in your browser using IndexedDB. This means:
- Your data never leaves your device
- No account or server required
- Data persists between browser sessions
- Clear browser data to reset the application

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite 7** - Build tool
- **Tailwind CSS v4** - Styling
- **IndexedDB** - Local data storage

## Browser Support

Supports all modern browsers with IndexedDB support:
- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+

## License

MIT License
