import { AttendancePanel } from "@/components/dashboard/attendance-panel";
import { requireUser } from "@/lib/auth/server";
import { getAttendanceData } from "@/lib/worklog";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await requireUser();
  if (user.role === "admin") {
    redirect("/admin");
  }
  const items = await getAttendanceData(user);

  return <AttendancePanel currentUserId={user.id} items={items} userRole={user.role} />;
}
