import { useRef } from 'react';
import { useRevenue } from '../context/RevenueContext';

export function Header() {
  const { config, exportData, importData } = useRevenue();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-tracker-${config.year}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result as string;
        await importData(data);
        alert('Data imported successfully!');
      } catch {
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <header className="mb-8 fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
            {config.year} Revenue Tracker
          </h1>
          <p className="text-slate-400 mt-2">
            Track revenue, taxes, VAT, and salaries across multiple currencies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white glass-light rounded-lg transition-colors"
          >
            Import
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white glass-light rounded-lg transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </header>
  );
}
