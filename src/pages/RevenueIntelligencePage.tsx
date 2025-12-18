import { useRevenue } from '../context/RevenueContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from '@/components/revenue-intelligence/OverviewTab';
import { MonthlyAnalysisTab } from '@/components/revenue-intelligence/MonthlyAnalysisTab';
import { SourcePerformanceTab } from '@/components/revenue-intelligence/SourcePerformanceTab';
import { ForecastTab } from '@/components/revenue-intelligence/ForecastTab';
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

export function RevenueIntelligencePage() {
  const { config } = useRevenue();

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Revenue Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive revenue analysis and forecasting for {config.year}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2">
            <Calendar className="size-4" />
            Monthly Analysis
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <BarChart3 className="size-4" />
            Source Performance
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-2">
            <TrendingUp className="size-4" />
            Forecast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyAnalysisTab />
        </TabsContent>

        <TabsContent value="sources">
          <SourcePerformanceTab />
        </TabsContent>

        <TabsContent value="forecast">
          <ForecastTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
