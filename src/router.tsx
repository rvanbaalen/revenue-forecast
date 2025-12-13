import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { DashboardPage } from './pages/DashboardPage';
import { ExpectedRevenuePage } from './pages/ExpectedRevenuePage';
import { ActualRevenuePage } from './pages/ActualRevenuePage';
import { SalaryPage } from './pages/SalaryPage';
import { ForecastPage } from './pages/ForecastPage';
import { SettingsPage } from './pages/SettingsPage';
import { OFXWizardPage } from './pages/OFXWizardPage';
import { BankLayout, BankAccountsPage, BankTransactionsPage, BankMappingRulesPage } from './pages/bank';
import { AccountingLayout, AccountingOverviewPage, ChartOfAccountsPage, BudgetPage, ReportsPage } from './pages/accounting';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';

function RootLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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

const wizardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: OFXWizardPage,
});

// Bank routes with nested structure
const bankRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bank',
  component: BankLayout,
  beforeLoad: ({ location }) => {
    // Redirect /bank to /bank/accounts
    if (location.pathname === '/bank') {
      throw redirect({ to: '/bank/accounts' });
    }
  },
});

const bankAccountsRoute = createRoute({
  getParentRoute: () => bankRoute,
  path: '/accounts',
  component: BankAccountsPage,
});

interface BankTransactionsSearchParams {
  account?: string;
  category?: string;
  mapped?: string;
  q?: string;
}

const bankTransactionsRoute = createRoute({
  getParentRoute: () => bankRoute,
  path: '/transactions',
  component: BankTransactionsPage,
  validateSearch: (search: Record<string, unknown>): BankTransactionsSearchParams => {
    return {
      account: typeof search.account === 'string' ? search.account : undefined,
      category: typeof search.category === 'string' ? search.category : undefined,
      mapped: typeof search.mapped === 'string' ? search.mapped : undefined,
      q: typeof search.q === 'string' ? search.q : undefined,
    };
  },
});

const bankMappingRoute = createRoute({
  getParentRoute: () => bankRoute,
  path: '/transactions/mapping',
  component: BankMappingRulesPage,
});

// Accounting routes with nested structure
const accountingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounting',
  component: AccountingLayout,
});

const accountingOverviewRoute = createRoute({
  getParentRoute: () => accountingRoute,
  path: '/',
  component: AccountingOverviewPage,
});

const accountingCategoriesRoute = createRoute({
  getParentRoute: () => accountingRoute,
  path: '/categories',
  component: ChartOfAccountsPage,
});

const accountingBudgetRoute = createRoute({
  getParentRoute: () => accountingRoute,
  path: '/budget',
  component: BudgetPage,
});

const accountingReportsRoute = createRoute({
  getParentRoute: () => accountingRoute,
  path: '/reports',
  component: ReportsPage,
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  expectedRoute,
  actualRoute,
  bankRoute.addChildren([
    bankAccountsRoute,
    bankTransactionsRoute,
    bankMappingRoute,
  ]),
  accountingRoute.addChildren([
    accountingOverviewRoute,
    accountingCategoriesRoute,
    accountingBudgetRoute,
    accountingReportsRoute,
  ]),
  salaryRoute,
  forecastRoute,
  settingsRoute,
  wizardRoute,
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
