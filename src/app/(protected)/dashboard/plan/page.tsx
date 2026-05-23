import { PlanForm } from "@/components/dashboard/plan-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEmployee } from "@/lib/auth/server";
import { getAssignableUsers, getDepartments, getPlanSuggestions } from "@/lib/worklog";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await requireEmployee();
  const [departments, suggestions, assignableUsers] = await Promise.all([
    getDepartments(),
    getPlanSuggestions(user.id, user.departmentId),
    getAssignableUsers(),
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
        assignableUsers={assignableUsers ?? []}
        currentUserId={user.id}
        departments={departments ?? []}
        initialTasks={[]}
        suggestions={suggestions ?? []}
        userDepartmentId={user.departmentId}
        role={user.role}
      />
    </div>
  );
}
