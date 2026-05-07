import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { requireUser } from "@/lib/auth/server";
import { roleUiTitle } from "@/lib/auth/roles";
import { getApprovalNotificationCount, getUnreadMessageCount } from "@/lib/worklog";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const [unreadMessages, pendingApprovals] = await Promise.all([
    getUnreadMessageCount(user.id),
    getApprovalNotificationCount(user),
  ]);

  return (
    <div className="h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex h-screen">
        <Sidebar
          user={{
            name: user.name,
            role: user.role,
            designation: user.designation,
            avatarUrl: user.avatarUrl,
          }}
        />
        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
          <DashboardHeader
            user={{
              name: user.name,
              role: user.role,
              roleTitle: roleUiTitle(user.role),
              designation: user.designation,
              avatarUrl: user.avatarUrl,
              unreadMessages,
              pendingApprovals,
            }}
          />
          <main className="flex-1 px-4 py-5 xl:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
