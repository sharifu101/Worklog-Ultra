import { PlanForm } from "@/components/dashboard/plan-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEmployee } from "@/lib/auth/server";
import { getDepartments, getPlanSuggestions, getPlanWithReports } from "@/lib/worklog";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await requireEmployee();
  if (user.role === "admin") {
    redirect("/admin");
  }
  const [departments, tasks, suggestions] = await Promise.all([
    getDepartments(),
    getPlanWithReports(user.id),
    getPlanSuggestions(user.id, user.departmentId),
  ]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Plan Your Morning</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">
            Build today’s task list with department-aware entries and clear priorities.
          </p>
        </CardContent>
      </Card>
      <PlanForm
        departments={departments}
        initialTasks={tasks.map((task) => ({
          taskTitle: task.taskTitle,
          taskDescription: task.taskDescription ?? "",
          priority: task.priority,
          departmentId: task.departmentId,
        }))}
        suggestions={suggestions}
        userDepartmentId={user.departmentId}
        role={user.role}
      />
    </div>
  );
}
