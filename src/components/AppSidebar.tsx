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
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
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
  useSidebar,
} from '@/components/ui/sidebar';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Accounts', icon: Building2 },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/import', label: 'Import', icon: Upload },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

function ContextSelector() {
  const { contexts, activeContext, setActiveContext } = useApp();

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
