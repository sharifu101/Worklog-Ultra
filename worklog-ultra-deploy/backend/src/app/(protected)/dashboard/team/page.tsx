import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserStatusToggle } from "@/components/admin/user-status-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { roleUiTitle } from "@/lib/auth/roles";
import { requireHrAnalyticsAccess } from "@/lib/auth/server";
import { getTeamData } from "@/lib/worklog";
import { formatCurrency, formatDateTimeInDhaka, formatHours, formatMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function TeamPage() {
  const user = await requireHrAnalyticsAccess();
  const tasks = await getTeamData(user.role, user.departmentId);
  const canViewComp = user.role === "manager" || user.role === "admin";
  const canManageUsers = user.role === "manager" || user.role === "admin";

  const employeeSummaries = Array.from(
    tasks.reduce((map, task) => {
      const existing = map.get(task.user.id) ?? {
        id: task.user.id,
        name: task.user.name,
        role: task.user.role,
        isActive: task.user.isActive,
        avatarUrl: task.user.avatarUrl ?? null,
        departmentName: task.department.name,
        tasksPlanned: 0,
        completedTasks: 0,
        trackedMinutes: 0,
        overtimeMinutes: 0,
        workValue: 0,
        hourlyRate: task.hourlyRate,
        dailyRate: task.dailyRate,
        weeklyRate: task.weeklyRate,
        monthlySalary: Number(task.user.monthlySalary ?? 0),
        firstStart: null as Date | null,
        lastEnd: null as Date | null,
      };

      const update = task.updates[0];
      existing.tasksPlanned += 1;
      existing.completedTasks += update?.status === "done" ? 1 : 0;
      existing.trackedMinutes += update?.trackedMinutes ?? 0;
      existing.overtimeMinutes += task.overtimeMinutes;
      existing.workValue += task.workValue;

      if (update?.actualStart && (!existing.firstStart || update.actualStart < existing.firstStart)) {
        existing.firstStart = update.actualStart;
      }

      if (update?.actualEnd && (!existing.lastEnd || update.actualEnd > existing.lastEnd)) {
        existing.lastEnd = update.actualEnd;
      }

      map.set(task.user.id, existing);
      return map;
    }, new Map<string, {
      id: string;
      name: string;
      role: "employee" | "hr" | "manager" | "admin";
      isActive: boolean;
      avatarUrl: string | null;
      departmentName: string;
      tasksPlanned: number;
      completedTasks: number;
      trackedMinutes: number;
      overtimeMinutes: number;
      workValue: number;
      hourlyRate: number;
      dailyRate: number;
      weeklyRate: number;
      monthlySalary: number;
      firstStart: Date | null;
      lastEnd: Date | null;
    }>())
      .values(),
  ).sort((a, b) => b.workValue - a.workValue || b.trackedMinutes - a.trackedMinutes);

  const totalDailyBaseline = employeeSummaries.reduce((sum, item) => sum + item.dailyRate, 0);
  const totalWeeklyBaseline = employeeSummaries.reduce((sum, item) => sum + item.weeklyRate, 0);
  const totalTrackedValue = employeeSummaries.reduce((sum, item) => sum + item.workValue, 0);
  const totalTrackedMinutes = employeeSummaries.reduce((sum, item) => sum + item.trackedMinutes, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Plans & Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 overflow-x-auto">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Daily Pay Baseline</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(totalDailyBaseline)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Weekly Pay Baseline</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(totalWeeklyBaseline)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Today’s Work Value</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(totalTrackedValue)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Tracked Time Today</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatMinutes(totalTrackedMinutes)}</p>
          </div>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Employee</TH>
              <TH>Department</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>Tasks Today</TH>
              <TH>Started</TH>
              <TH>Ended</TH>
              <TH>Tracked Today</TH>
              {canViewComp ? <TH>Hourly Rate</TH> : null}
              {canViewComp ? <TH>Daily Salary</TH> : null}
              {canViewComp ? <TH>Weekly Salary</TH> : null}
              {canViewComp ? <TH>Monthly Salary</TH> : null}
              {canViewComp ? <TH>Overtime</TH> : null}
              {canViewComp ? <TH>Today’s Work Value</TH> : null}
              {canManageUsers ? <TH>Action</TH> : null}
            </TR>
          </THead>
          <TBody>
            {employeeSummaries.map((employee) => (
              <TR key={employee.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border-white/10">
                      {employee.avatarUrl ? <AvatarImage alt={employee.name} src={employee.avatarUrl} /> : null}
                      <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-white">{employee.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {employee.completedTasks}/{employee.tasksPlanned} completed
                      </p>
                    </div>
                  </div>
                </TD>
                <TD>{employee.departmentName}</TD>
                <TD>{roleUiTitle(employee.role)}</TD>
                <TD>
                  <Badge variant={employee.isActive ? "success" : "secondary"}>
                    {employee.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TD>
                <TD>
                  <div className="space-y-1">
                    <div className="text-white">{employee.tasksPlanned} planned</div>
                    <Badge variant={employee.completedTasks === employee.tasksPlanned ? "success" : "purple"}>
                      {employee.completedTasks} done
                    </Badge>
                  </div>
                </TD>
                <TD>{formatDateTimeInDhaka(employee.firstStart)}</TD>
                <TD>{formatDateTimeInDhaka(employee.lastEnd)}</TD>
                <TD>{formatMinutes(employee.trackedMinutes)}</TD>
                {canViewComp ? <TD>{formatCurrency(employee.hourlyRate)}/hr</TD> : null}
                {canViewComp ? <TD>{formatCurrency(employee.dailyRate)}</TD> : null}
                {canViewComp ? <TD>{formatCurrency(employee.weeklyRate)}</TD> : null}
                {canViewComp ? <TD>{formatCurrency(employee.monthlySalary)}</TD> : null}
                {canViewComp ? <TD>{formatHours(employee.overtimeMinutes)}</TD> : null}
                {canViewComp ? (
                  <TD>
                    <div className="space-y-1">
                      <div className="font-semibold text-white">{formatCurrency(employee.workValue)}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">for {formatMinutes(employee.trackedMinutes)}</div>
                    </div>
                  </TD>
                ) : null}
                {canManageUsers ? (
                  <TD>
                    {employee.role === "manager" && user.role === "manager" ? null : (
                      <UserStatusToggle
                        isActive={employee.isActive}
                        userId={employee.id}
                        userName={employee.name}
                      />
                    )}
                  </TD>
                ) : null}
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
