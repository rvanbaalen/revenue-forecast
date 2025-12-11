import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  Link,
} from '@tanstack/react-router';
import { DashboardPage } from './pages/DashboardPage';
import { ExpectedRevenuePage } from './pages/ExpectedRevenuePage';
import { ActualRevenuePage } from './pages/ActualRevenuePage';
import { SalaryPage } from './pages/SalaryPage';
import { ForecastPage } from './pages/ForecastPage';

// Root layout with navigation
function RootLayout() {
  return (
    <div className="text-slate-200 min-h-screen">
      <nav className="glass sticky top-0 z-40 border-b border-slate-700/50">
        <div className="max-w-[1900px] mx-auto px-4 md:px-8">
          <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-thin">
            <NavLink to="/">Dashboard</NavLink>
            <NavLink to="/expected">Expected Revenue</NavLink>
            <NavLink to="/actual">Actual Revenue</NavLink>
            <NavLink to="/salary">Salaries</NavLink>
            <NavLink to="/forecast">Forecast</NavLink>
          </div>
        </div>
      </nav>
      <main className="p-4 md:p-8">
        <div className="max-w-[1900px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
      activeProps={{
        className: 'bg-sky-500/20 text-sky-300',
      }}
      inactiveProps={{
        className: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
      }}
    >
      {children}
    </Link>
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

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  expectedRoute,
  actualRoute,
  salaryRoute,
  forecastRoute,
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
