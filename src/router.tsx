import {
  createRouter,
  createRootRoute,
  createRoute,
  createHashHistory,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { TrendingUp, Menu } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { AccountsPage } from './pages/AccountsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ImportPage } from './pages/ImportPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  ProfitLossPage,
  BalanceSheetPage,
  CashFlowPage,
  SpendingPage,
} from './pages/reports';
import {
  ContextsPage,
  CurrenciesPage,
  CategoriesPage,
  RulesPage,
} from './pages/settings';
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
  subcategory?: string;
  startDate?: string;
  endDate?: string;
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
      subcategory: typeof search.subcategory === 'string' ? search.subcategory : undefined,
      startDate: typeof search.startDate === 'string' ? search.startDate : undefined,
      endDate: typeof search.endDate === 'string' ? search.endDate : undefined,
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

// Reports (layout)
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
});

// Reports sub-routes
const reportsIndexRoute = createRoute({
  getParentRoute: () => reportsRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/reports/profit-loss' });
  },
});

const profitLossRoute = createRoute({
  getParentRoute: () => reportsRoute,
  path: '/profit-loss',
  component: ProfitLossPage,
});

const balanceSheetRoute = createRoute({
  getParentRoute: () => reportsRoute,
  path: '/balance-sheet',
  component: BalanceSheetPage,
});

const cashFlowRoute = createRoute({
  getParentRoute: () => reportsRoute,
  path: '/cash-flow',
  component: CashFlowPage,
});

const spendingRoute = createRoute({
  getParentRoute: () => reportsRoute,
  path: '/spending',
  component: SpendingPage,
});

// Settings (layout)
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

// Settings sub-routes
const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/settings/contexts' });
  },
});

const contextsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/contexts',
  component: ContextsPage,
});

const currenciesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/currencies',
  component: CurrenciesPage,
});

const categoriesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/categories',
  component: CategoriesPage,
});

const rulesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/rules',
  component: RulesPage,
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  accountsRoute,
  transactionsRoute,
  importRoute,
  reportsRoute.addChildren([
    reportsIndexRoute,
    profitLossRoute,
    balanceSheetRoute,
    cashFlowRoute,
    spendingRoute,
  ]),
  settingsRoute.addChildren([
    settingsIndexRoute,
    contextsRoute,
    currenciesRoute,
    categoriesRoute,
    rulesRoute,
  ]),
]);

// Create hash history for GitHub Pages compatibility
const hashHistory = createHashHistory();

// Create router
export const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultPreload: 'intent',
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
