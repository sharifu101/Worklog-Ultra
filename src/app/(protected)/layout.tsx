import { AssignmentNotificationLive } from "@/components/dashboard/assignment-notification-live";
import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TaskTimerAutoCloser } from "@/components/dashboard/task-timer-auto-closer";
import { WorkspaceNoticeLive } from "@/components/dashboard/workspace-notice-live";
import { DashboardMotionShell } from "@/components/motion/dashboard-motion-shell";
import { requireUser } from "@/lib/auth/server";
import { roleUiTitle } from "@/lib/auth/roles";
import type { DashboardHeaderUser, DashboardSidebarUser } from "@/lib/contracts/user";
import {
  getAssignmentNotificationCount,
  getIncomingAssignmentNotificationCount,
  getCurrentUserAttendanceSnapshot,
  getNoticeNotificationCount,
  getRequestNotificationCount,
  getUnreadMessageCount,
} from "@/lib/worklog";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const [unreadMessages, requestNotifications, assignmentNotifications, incomingAssignmentNotifications, noticeNotifications, attendanceSnapshot] = await Promise.all([
    getUnreadMessageCount(user.id),
    getRequestNotificationCount(user),
    getAssignmentNotificationCount(user.id),
    getIncomingAssignmentNotificationCount(user.id),
    getNoticeNotificationCount({ id: user.id, departmentId: user.departmentId }),
    getCurrentUserAttendanceSnapshot(user.id),
  ]);
  const sidebarUser: DashboardSidebarUser = {
    name: user.name,
    role: user.role,
    designation: user.designation,
    avatarUrl: user.avatarUrl,
    extraAccess: user.extraAccess,
    assignmentNotifications: incomingAssignmentNotifications,
  };
  const headerUser: DashboardHeaderUser = {
    name: user.name,
    role: user.role,
    roleTitle: roleUiTitle(user.role),
    designation: user.designation,
    avatarUrl: user.avatarUrl,
    unreadMessages,
    requestNotifications,
    assignmentNotifications,
    noticeNotifications,
    attendanceSnapshot: attendanceSnapshot
      ? {
          status: attendanceSnapshot.status,
          note: attendanceSnapshot.note ?? "",
          breakMinutes: attendanceSnapshot.breakMinutes ?? 0,
          checkInAt: attendanceSnapshot.checkInAt?.toISOString() ?? null,
          checkOutAt: attendanceSnapshot.checkOutAt?.toISOString() ?? null,
        }
      : null,
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex h-screen">
        <Sidebar user={sidebarUser} />
        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
          <DashboardHeader user={headerUser} />
          <main className="flex-1 px-4 py-5 xl:px-6">
            <AssignmentNotificationLive />
            <TaskTimerAutoCloser />
            <WorkspaceNoticeLive />
            <DashboardMotionShell>{children}</DashboardMotionShell>
          </main>
        </div>
      </div>
    </div>
  );
}
