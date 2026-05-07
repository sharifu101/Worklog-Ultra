"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Building2, CalendarCheck2, ClipboardList, FileClock, FolderTree, HelpCircle, LayoutDashboard, ListTodo, Menu, MessageSquareMore, Settings, Shield, UserRoundSearch, Users, X } from "lucide-react";
import { roleBadgeUpper, roleUiTitle } from "@/lib/auth/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/plan", icon: ClipboardList, label: "Morning Plan" },
  { href: "/dashboard/report", icon: FileClock, label: "Evening Report" },
  { href: "/dashboard/attendance", icon: CalendarCheck2, label: "Attendance" },
  { href: "/dashboard/history", icon: BriefcaseBusiness, label: "History" },
  { href: "/dashboard/requests", icon: ListTodo, label: "Requests" },
  { href: "/dashboard/directory", icon: UserRoundSearch, label: "Directory" },
  { href: "/dashboard/team", icon: Users, label: "Team" },
  { href: "/dashboard/messages", icon: MessageSquareMore, label: "Messages" },
  { href: "/admin", icon: Shield, label: "Admin" },
  { href: "/admin/departments", icon: FolderTree, label: "Departments" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  { href: "/dashboard/help", icon: HelpCircle, label: "Help" },
];

type SidebarUser = {
  name: string;
  role: "employee" | "hr" | "manager" | "admin";
  designation: string | null;
  avatarUrl?: string | null;
};

function SidebarContent({
  user,
  pathname,
  mobile = false,
}: {
  user: SidebarUser;
  pathname: string;
  mobile?: boolean;
}) {
  return (
    <>
      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-alt)] p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            {user.avatarUrl ? <AvatarImage alt={user.name} src={user.avatarUrl} /> : null}
            <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-white">{user.name}</p>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{roleBadgeUpper(user.role)}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{user.designation ?? roleUiTitle(user.role)}</p>
          </div>
        </div>
      </div>
      <nav className="mt-6 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const hiddenForEmployee =
            ["/admin", "/admin/departments"].includes(item.href) && !["manager", "admin"].includes(user.role);
          const hiddenForTeam = item.href === "/dashboard/team" && user.role === "employee";
          const hiddenForAdminWorkerFlow =
            user.role === "admin" &&
            ["/dashboard/plan", "/dashboard/report", "/dashboard/attendance", "/dashboard/history", "/dashboard/requests"].includes(item.href);
          const hiddenRequestInboxForAdmin = user.role === "admin" && item.href === "/dashboard/requests";

          if (hiddenForEmployee || hiddenForTeam || hiddenForAdminWorkerFlow || hiddenRequestInboxForAdmin) return null;

          const linkNode = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[var(--sidebar-foreground)] transition-colors",
                active ? "bg-[#158a74] text-white" : "hover:bg-[var(--panel-alt)]",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );

          if (mobile) {
            return (
              <Dialog.Close asChild key={item.href}>
                {linkNode}
              </Dialog.Close>
            );
          }

          return linkNode;
        })}
      </nav>
      <div className={cn("mt-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-alt)] p-4", mobile && "mb-6")}>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted-foreground)]">Enterprise</p>
        <div className="mt-3 flex items-center gap-3">
          <Building2 className="h-5 w-5 text-cyan-300" />
          <p className="text-sm text-white">Mugnee enterprise workspace</p>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 border-r border-[var(--panel-border)] bg-[var(--sidebar)] p-4 lg:flex lg:flex-col">
      <SidebarContent pathname={pathname} user={user} />
    </aside>
  );
}

export function MobileSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          aria-label="Open navigation menu"
          className="h-12 w-12 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] text-[var(--foreground)] shadow-[0_12px_30px_rgba(4,10,20,0.2)] hover:bg-[var(--panel-alt)] lg:hidden"
          size="icon"
          variant="outline"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(3,8,18,0.72)] backdrop-blur-sm lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[320px] flex-col overflow-y-auto border-r border-[var(--panel-border)] bg-[var(--sidebar)] p-4 shadow-[0_30px_90px_rgba(3,8,18,0.45)] outline-none lg:hidden">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Workspace Menu
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                aria-label="Close navigation menu"
                className="h-11 w-11 rounded-2xl"
                size="icon"
                variant="ghost"
              >
                <X className="h-5 w-5" />
              </Button>
            </Dialog.Close>
          </div>
          <SidebarContent mobile pathname={pathname} user={user} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
