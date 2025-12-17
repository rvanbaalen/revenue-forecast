import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Users,
  LineChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Building2,
  Calculator,
  Wand2,
  Braces,
} from 'lucide-react';
import { useRevenue } from '@/context/RevenueContext';
import { useTime } from '@/hooks/useTime';
import { BackupRestoreModal } from '@/components/BackupRestoreModal';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/setup', label: 'Setup Wizard', icon: Wand2 },
  { path: '/expected', label: 'Expected', icon: TrendingUp },
  { path: '/actual', label: 'Actual', icon: Receipt },
  { path: '/bank', label: 'Bank', icon: Building2 },
  { path: '/accounting', label: 'Accounting', icon: Calculator },
  { path: '/salary', label: 'Salaries', icon: Users },
  { path: '/forecast', label: 'Forecast', icon: LineChart },
  { path: '/json', label: 'JSON Beautifier', icon: Braces },
  { path: '/settings', label: 'Settings', icon: Settings },
];

function YearSelector() {
  const { config, updateConfig } = useRevenue();
  const { time } = useTime();

  return (
    <div className="px-2 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between">
        <button
          onClick={() => updateConfig({ year: config.year - 1 })}
          className="p-1.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/70"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span
          className={cn(
            'text-sm font-medium tabular-nums',
            config.year === time.currentYear
              ? 'text-sidebar-foreground'
              : 'text-sidebar-foreground/70'
          )}
        >
          {config.year}
        </span>
        <button
          onClick={() => updateConfig({ year: config.year + 1 })}
          className="p-1.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/70"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {config.year !== time.currentYear && (
        <button
          onClick={() => updateConfig({ year: time.currentYear })}
          className="w-full mt-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground"
        >
          Go to {time.currentYear}
        </button>
      )}
    </div>
  );
}

function BackupRestoreButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsModalOpen(true)}
                tooltip="Backup & Restore"
              >
                <HardDrive className="size-4" />
                <span>Backup & Restore</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <BackupRestoreModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

export function AppSidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <TrendingUp className="size-4" />
              </div>
              <span className="font-semibold truncate">Revenue</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <YearSelector />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentPath === item.path ||
                  currentPath.startsWith(item.path + '/');
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link to={item.path}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <BackupRestoreButton />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
