import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Building2,
  FileText,
  Settings,
  Upload,
  HardDrive,
  ChevronRight,
  FolderOpen,
  Coins,
  Tag,
  Wand2,
  PieChart,
  Scale,
  ArrowLeftRight,
  Wallet,
} from 'lucide-react';
import { useFinancialData } from '@/stores';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Accounts', icon: Building2 },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/import', label: 'Import', icon: Upload },
];

const REPORTS_ITEMS = [
  { path: '/reports/profit-loss', label: 'P&L', icon: PieChart },
  { path: '/reports/balance-sheet', label: 'Balance Sheet', icon: Scale },
  { path: '/reports/cash-flow', label: 'Cash Flow', icon: ArrowLeftRight },
  { path: '/reports/spending', label: 'Spending', icon: Wallet },
];

const SETTINGS_ITEMS = [
  { path: '/settings/contexts', label: 'Contexts', icon: FolderOpen },
  { path: '/settings/currencies', label: 'Currencies', icon: Coins },
  { path: '/settings/categories', label: 'Categories', icon: Tag },
  { path: '/settings/rules', label: 'Rules', icon: Wand2 },
];

function ContextSelector() {
  const { contexts, activeContext, setActiveContext } = useFinancialData();

  if (contexts.length <= 1) {
    return null;
  }

  return (
    <div className="px-2 group-data-[collapsible=icon]:hidden">
      <select
        value={activeContext?.id || ''}
        onChange={(e) => setActiveContext(e.target.value)}
        className="w-full text-sm bg-sidebar-accent border-0 rounded px-2 py-1.5 text-sidebar-foreground"
      >
        {contexts.map((ctx) => (
          <option key={ctx.id} value={ctx.id}>
            {ctx.name}
          </option>
        ))}
      </select>
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
  const { setOpenMobile } = useSidebar();

  const isReportsActive = currentPath.startsWith('/reports');
  const isSettingsActive = currentPath.startsWith('/settings');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <TrendingUp className="size-4" />
              </div>
              <span className="font-semibold truncate">Finance</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <ContextSelector />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Regular nav items */}
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/'
                    ? currentPath === '/'
                    : currentPath === item.path || currentPath.startsWith(item.path + '/');
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link to={item.path} onClick={() => setOpenMobile(false)}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Reports with sub-items */}
              <Collapsible asChild defaultOpen={isReportsActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Reports" isActive={isReportsActive}>
                      <FileText className="size-4" />
                      <span>Reports</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {REPORTS_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPath === item.path;
                        return (
                          <SidebarMenuSubItem key={item.path}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link to={item.path} onClick={() => setOpenMobile(false)}>
                                <Icon className="size-4" />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Settings with sub-items */}
              <Collapsible asChild defaultOpen={isSettingsActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Settings" isActive={isSettingsActive}>
                      <Settings className="size-4" />
                      <span>Settings</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {SETTINGS_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPath === item.path;
                        return (
                          <SidebarMenuSubItem key={item.path}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link to={item.path} onClick={() => setOpenMobile(false)}>
                                <Icon className="size-4" />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
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
