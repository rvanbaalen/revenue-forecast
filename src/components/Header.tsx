import { useRef } from 'react';
import { useRevenue } from '../context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Download, Upload, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export function Header() {
  const { config, exportData, importData, updateConfig } = useRevenue();
  const { time, getYearStatus, getYearOptions } = useTime();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const yearOptions = getYearOptions(7);
  const yearStatus = getYearStatus(config.year);

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

  const handleYearChange = (value: string) => {
    updateConfig({ year: parseInt(value, 10) });
  };

  const handlePreviousYear = () => {
    updateConfig({ year: config.year - 1 });
  };

  const handleNextYear = () => {
    updateConfig({ year: config.year + 1 });
  };

  const goToCurrentYear = () => {
    updateConfig({ year: time.currentYear });
  };

  return (
    <TooltipProvider>
      <header className="mb-8 fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
                Revenue Tracker
              </h1>
              <Badge
                variant={yearStatus}
                className="text-sm"
              >
                {yearStatus === 'current' && 'Current Year'}
                {yearStatus === 'past' && 'Past Year'}
                {yearStatus === 'future' && 'Future Year'}
              </Badge>
            </div>
            <p className="text-slate-400">
              Track revenue, taxes, VAT, and salaries across multiple currencies
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Year Navigation */}
            <div className="flex items-center gap-2 glass rounded-lg p-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousYear}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous Year</TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <Select value={config.year.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[100px] h-8 border-0 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        <span className={
                          year === time.currentYear
                            ? 'text-sky-400 font-semibold'
                            : year < time.currentYear
                              ? 'text-slate-500'
                              : 'text-violet-300'
                        }>
                          {year}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextYear}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next Year</TooltipContent>
              </Tooltip>

              {config.year !== time.currentYear && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToCurrentYear}
                      className="h-8 text-xs"
                    >
                      Today
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Go to {time.currentYear}</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Import/Export */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportClick}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Import data from JSON file</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export data to JSON file</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Current Time Indicator */}
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span>
            Today: {time.currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
          {yearStatus !== 'current' && (
            <span className="text-slate-500">
              (viewing {config.year})
            </span>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
