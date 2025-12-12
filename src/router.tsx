import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  Link,
  useRouterState,
} from '@tanstack/react-router';
import { useRevenue } from './context/RevenueContext';
import { useTime } from './hooks/useTime';
import { DashboardPage } from './pages/DashboardPage';
import { ExpectedRevenuePage } from './pages/ExpectedRevenuePage';
import { ActualRevenuePage } from './pages/ActualRevenuePage';
import { SalaryPage } from './pages/SalaryPage';
import { ForecastPage } from './pages/ForecastPage';
import { SettingsPage } from './pages/SettingsPage';
import { BankPage } from './pages/BankPage';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Users,
  LineChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Building2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from './lib/utils';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/expected', label: 'Expected', icon: TrendingUp },
  { path: '/actual', label: 'Actual', icon: Receipt },
  { path: '/bank', label: 'Bank', icon: Building2 },
  { path: '/salary', label: 'Salaries', icon: Users },
  { path: '/forecast', label: 'Forecast', icon: LineChart },
  { path: '/settings', label: 'Settings', icon: Settings },
];

function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { config, updateConfig, exportData, importData } = useRevenue();
  const { time } = useTime();
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${config.year}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await importData(event.target?.result as string);
      } catch {
        alert('Failed to import data');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside className={cn(
      "sidebar fixed left-0 top-0 h-screen flex flex-col transition-all duration-200 z-50",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground truncate">Revenue</span>
          )}
        </div>
      </div>

      {/* Year selector */}
      <div className="p-3 border-b border-border">
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <button
            onClick={() => updateConfig({ year: config.year - 1 })}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {!collapsed && (
            <span className={cn(
              "text-sm font-medium tabular-nums",
              config.year === time.currentYear ? "text-foreground" : "text-muted-foreground"
            )}>
              {config.year}
            </span>
          )}
          <button
            onClick={() => updateConfig({ year: config.year + 1 })}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!collapsed && config.year !== time.currentYear && (
          <button
            onClick={() => updateConfig({ year: time.currentYear })}
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Go to {time.currentYear}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "nav-link",
                isActive && "nav-link-active",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Import/Export */}
      <div className="p-3 border-t border-border space-y-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "nav-link w-full",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Import" : undefined}
        >
          <Upload className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Import</span>}
        </button>
        <button
          onClick={handleExport}
          className={cn(
            "nav-link w-full",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Export" : undefined}
        >
          <Download className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Export</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "nav-link w-full",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function RootLayout() {
  const [sidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={cn(
        "transition-all duration-200 min-h-screen",
        sidebarCollapsed ? "ml-16" : "ml-56"
      )}>
        <div className="p-6 max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Create root route
const rootRoute = createRootRoute({
  component: RootLayout,
});

// Create child routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const expectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/expected',
  component: ExpectedRevenuePage,
});

const actualRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/actual',
  component: ActualRevenuePage,
});

const salaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/salary',
  component: SalaryPage,
});

const forecastRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forecast',
  component: ForecastPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

interface BankSearchParams {
  account?: string;
}

const bankRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bank',
  component: BankPage,
  validateSearch: (search: Record<string, unknown>): BankSearchParams => {
    return {
      account: typeof search.account === 'string' ? search.account : undefined,
    };
  },
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  expectedRoute,
  actualRoute,
  bankRoute,
  salaryRoute,
  forecastRoute,
  settingsRoute,
]);

// Create router
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  basepath: import.meta.env.BASE_URL,
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
