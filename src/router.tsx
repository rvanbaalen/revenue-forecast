import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router';
import { TrendingUp, Menu } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { AccountsPage } from './pages/AccountsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ImportPage } from './pages/ImportPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';
import { Separator } from './components/ui/separator';

function RootLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile header with sidebar trigger */}
        <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger>
            <Menu className="size-5" />
            <span className="sr-only">Toggle menu</span>
          </SidebarTrigger>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <TrendingUp className="size-3.5" />
            </div>
            <span className="font-semibold">Finance</span>
          </div>
        </header>
        <div className="p-6 max-w-[1600px]">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Create root route
const rootRoute = createRootRoute({
  component: RootLayout,
});

// Dashboard (index)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

// Accounts
const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounts',
  component: AccountsPage,
});

// Transactions
interface TransactionsSearchParams {
  account?: string;
  category?: string;
  q?: string;
}

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  component: TransactionsPage,
  validateSearch: (search: Record<string, unknown>): TransactionsSearchParams => {
    return {
      account: typeof search.account === 'string' ? search.account : undefined,
      category: typeof search.category === 'string' ? search.category : undefined,
      q: typeof search.q === 'string' ? search.q : undefined,
    };
  },
});

// Import
const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import',
  component: ImportPage,
});

// Reports
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
});

// Settings
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  accountsRoute,
  transactionsRoute,
  importRoute,
  reportsRoute,
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
