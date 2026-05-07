import { UserStatusToggle } from "@/components/admin/user-status-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { roleUiTitle } from "@/lib/auth/roles";
import { requireAdminOrManager } from "@/lib/auth/server";
import { getAdminOverview } from "@/lib/worklog";
import { formatCurrency, formatDateTimeInDhaka, formatMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const actor = await requireAdminOrManager();
  const { users, departments, latestReportSummaries, metrics } = await getAdminOverview();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-3">
        <a href="/admin/departments">
          <Button type="button" variant="secondary">
            Manage Departments
          </Button>
        </a>
        <a href="/api/dashboard/analytics/export">
          <Button type="button" variant="secondary">
            Export Performance CSV
          </Button>
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-gradient-blue">
          <CardHeader>
            <CardTitle className="text-white">Tracked Work</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{formatMinutes(metrics.totalTrackedMinutes)}</p>
          </CardContent>
        </Card>
        <Card className="card-gradient-green">
          <CardHeader>
            <CardTitle className="text-white">Work Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{formatCurrency(metrics.totalWorkValue)}</p>
          </CardContent>
        </Card>
        <Card className="card-gradient-purple">
          <CardHeader>
            <CardTitle className="text-white">Weekly Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{formatCurrency(metrics.totalWeeklyPayroll)}</p>
          </CardContent>
        </Card>
        <Card className="card-gradient-amber">
          <CardHeader>
            <CardTitle className="text-white">Daily Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{formatCurrency(metrics.totalDailyPayroll)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Users & Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.slice(0, 6).map((user) => (
              <div key={user.id} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{user.email}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatCurrency(Number(user.monthlySalary ?? 0))} monthly - {formatCurrency(user.weeklyRate)}/week
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatCurrency(user.dailyRate)}/day - {formatCurrency(user.hourlyRate)}/hour
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant={user.isActive ? "success" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge>{roleUiTitle(user.role)}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  {user.id === actor.id || (actor.role === "manager" && user.role === "manager") ? null : (
                    <UserStatusToggle isActive={user.isActive} userId={user.id} userName={user.name} />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments.map((department) => (
              <div key={department.id} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4 text-white">
                {department.name}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestReportSummaries.map((report) => (
              <div key={report.userId} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11">
                    {report.avatarUrl ? <AvatarImage alt={report.name} src={report.avatarUrl} /> : null}
                    <AvatarFallback>{report.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{report.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{report.departmentName}</p>
                      </div>
                      <Badge>{roleUiTitle(report.role)}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm text-[var(--muted-foreground)]">{report.latestTaskTitle}</p>
                    <div className="mt-3 grid gap-1 text-xs text-[var(--muted-foreground)]">
                      <p>{report.totalReports} reports - {report.totalTrackedMinutes} min tracked</p>
                      <p>{formatCurrency(report.totalWorkValue)} today - {formatCurrency(report.hourlyRate)}/hour</p>
                      <p>{formatCurrency(report.dailyRate)}/day - {formatCurrency(report.weeklyRate)}/week</p>
                      <p>Start: {formatDateTimeInDhaka(report.latestStart)} - End: {formatDateTimeInDhaka(report.latestEnd)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
