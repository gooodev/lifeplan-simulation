import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { LuInfo } from "react-icons/lu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActivePlan } from "@/store/hooks";
import { JsonMenu } from "@/ui/JsonMenu";
import { HOME_NAV_ITEM, NAV_GROUPS, findNavItem } from "@/ui/nav";
import { PlanSwitcher } from "@/ui/PlanSwitcher";
import { ThemeToggle } from "@/ui/ThemeToggle";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const plan = useActivePlan();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentNavItem = findNavItem(pathname);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-between gap-1 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <span className="truncate text-base font-semibold group-data-[collapsible=icon]:hidden">
              ライフプラン
            </span>
            <SidebarTrigger className="shrink-0" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/"}
                    tooltip={HOME_NAV_ITEM.label}
                  >
                    <Link to={HOME_NAV_ITEM.to}>
                      <HOME_NAV_ITEM.icon />
                      <span>{HOME_NAV_ITEM.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>プラン</SidebarGroupLabel>
            <SidebarGroupContent>
              <PlanSwitcher />
            </SidebarGroupContent>
          </SidebarGroup>
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.to}
                        tooltip={item.label}
                      >
                        <Link to={item.to}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <LuInfo className="size-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">データはブラウザ内だけに保存されます</TooltipContent>
          </Tooltip>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex flex-wrap items-center gap-3 border-b p-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {currentNavItem && (
              <currentNavItem.icon className="size-5 shrink-0 text-muted-foreground" />
            )}
            <h1 className="truncate text-lg font-semibold">
              {currentNavItem?.label ?? "ライフプラン"}
            </h1>
          </div>
          <JsonMenu />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-x-auto p-6">
          {!plan ? <p className="text-muted-foreground">読み込み中...</p> : <Outlet />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
