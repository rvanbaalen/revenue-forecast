import { Header, ConfigSection, SummaryDashboard } from '../components';

export function DashboardPage() {
  return (
    <>
      <Header />
      <ConfigSection />
      <SummaryDashboard />

      <footer className="text-center text-slate-500 text-sm pb-4 mt-8">
        Data stored locally in your browser using IndexedDB
      </footer>
    </>
  );
}
