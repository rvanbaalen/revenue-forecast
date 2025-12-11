# Revenue Forecast

A client-side revenue forecasting tool built with HTML, JavaScript, and TailwindCSS. All data is stored locally using IndexedDB - no server required.

## Features

- **Revenue Tracking**: Add, edit, and delete revenue entries with date, amount, category, and description
- **Dashboard**: Visual overview with charts showing revenue trends and category breakdowns
- **Forecasting**: Multiple forecasting methods including:
  - Simple Moving Average
  - Weighted Moving Average
  - Exponential Smoothing
  - Linear Regression
- **Analytics**: Statistical analysis including min/max, average, median, standard deviation, and growth rates
- **Category Performance**: Track performance across different revenue categories
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

2. Serve the files with any static server. For example:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js (npx)
   npx serve

   # Using PHP
   php -S localhost:8000
   ```

3. Open `http://localhost:8000` in your browser

## Usage

### Adding Revenue Entries

1. Navigate to the "Revenue Entries" tab
2. Click "Add Entry"
3. Fill in the date, amount, category, and optional description
4. Click "Save Entry"

### Generating Forecasts

1. Navigate to the "Forecast" tab
2. Select a forecasting method:
   - **Weighted Moving Avg**: Gives more weight to recent data
   - **Simple Moving Avg**: Equal weight to all periods
   - **Exponential Smoothing**: Smooths out fluctuations
   - **Linear Regression**: Projects based on trend line
3. Select the number of periods to forecast (3, 6, or 12 months)
4. Click "Generate Forecast"

### Import/Export Data

- **Export**: Click "Export" in the navigation bar to download your data as JSON
- **Import**: Click "Import" to load data from a previously exported JSON file

## Data Storage

All data is stored locally in your browser using IndexedDB. This means:
- Your data never leaves your device
- No account or server required
- Data persists between browser sessions
- Clear browser data to reset the application

## Tech Stack

- **HTML5** - Structure
- **TailwindCSS** (CDN) - Styling
- **Chart.js** - Data visualization
- **IndexedDB** - Local data storage
- **ES6 Modules** - JavaScript module system

## Deployment

This project is configured for automatic deployment to GitHub Pages. Push to the `main` branch to trigger deployment.

To set up GitHub Pages:
1. Go to repository Settings > Pages
2. Under "Build and deployment", select "GitHub Actions"
3. Push changes to trigger the workflow

## Browser Support

Supports all modern browsers with IndexedDB support:
- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+

## License

MIT License
