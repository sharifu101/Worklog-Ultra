import { BellRing, CalendarClock, ClipboardCheck, FileSpreadsheet, Users } from "lucide-react";
import { RecentTrendChart } from "@/components/dashboard/recent-trend-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { roleUiTitle } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/server";
import { getGreetingInDhaka } from "@/lib/utils";
import { getDashboardData } from "@/lib/worklog";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id, user.role, user.departmentId);
  const completion = data.kpis.tasksPlanned
    ? Math.round((data.kpis.reportsSubmitted / data.kpis.tasksPlanned) * 100)
    : 0;
  const tasksHref = "/dashboard/directory";
  const reportsHref = user.role === "employee" ? "/dashboard/history" : "/dashboard/team";
  const hoursHref = user.role === "employee" ? "/dashboard/history" : "/dashboard/team";
  const pendingHref = user.role === "employee" ? "/dashboard/report" : "/dashboard/team";

  return (
    <div className="space-y-5">
      <Card className="rounded-[28px] bg-[#162033]">
        <CardContent className="grid gap-4 p-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
              {roleUiTitle(user.role)} Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-white">
              {getGreetingInDhaka()}, {user.name}
            </h1>
            <p className="mt-3 max-w-3xl text-[15px] text-[var(--muted-foreground)]">
              {user.role === "admin"
                ? "Here is your executive control view for staffing, reporting quality, payroll signals, and department-wide execution."
                : "Here's what's happening across your daily planning workspace today. Plans, reporting, and team signals all stay inside one compact control layer."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="bg-[rgba(255,255,255,0.04)]">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  Active Staff
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">{data.kpis.activeStaff}</p>
              </CardContent>
            </Card>
            <Card className="bg-[rgba(255,255,255,0.04)]">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  Role
                </p>
                <p className="mt-2 text-xl font-semibold text-white">{roleUiTitle(user.role)}</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Tasks Planned Today"
              value={data.kpis.tasksPlanned}
              subtitle="Today's task entries"
              tone="blue"
              href={tasksHref}
            />
            <StatCard
              title="Reports Submitted"
              value={data.kpis.reportsSubmitted}
              subtitle="Evening updates captured"
              tone="green"
              href={reportsHref}
            />
            <StatCard
              title="Worklog Hours"
              value={data.kpis.worklogHours}
              subtitle="Tracked for today"
              tone="amber"
              href={hoursHref}
            />
            <StatCard
              title="Pending Items"
              value={data.kpis.pendingItems}
              subtitle="Need completion or follow-up"
              tone="purple"
              href={pendingHref}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Worklog Volume</CardTitle>
              <CardDescription>Tasks captured in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentTrendChart data={data.recentTrend} />
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Plan & Report Today</CardTitle>
                <CardDescription>Morning plan coverage and evening completion progress.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Morning Work Plan</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {data.kpis.tasksPlanned} tasks loaded for the day.
                      </p>
                    </div>
                    <ClipboardCheck className="h-5 w-5 text-cyan-300" />
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Evening Work Report</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {data.kpis.reportsSubmitted} reports submitted so far.
                      </p>
                    </div>
                    <FileSpreadsheet className="h-5 w-5 text-emerald-300" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Daily progress</span>
                    <span className="text-white">{completion}%</span>
                  </div>
                  <Progress value={completion} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{user.role === "employee" ? "Personal Pulse" : "Team Overview"}</CardTitle>
                <CardDescription>Compact signals for the day.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: Users, label: "Tasks in motion", value: `${data.tasks.length}` },
                  { icon: BellRing, label: "Notifications", value: "2" },
                  {
                    icon: CalendarClock,
                    label: "Upcoming deadlines",
                    value: `${Math.max(data.kpis.pendingItems, 1)}`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-cyan-300" />
                      <p className="text-sm text-white">{item.label}</p>
                    </div>
                    <Badge variant="default">{item.value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Morning plan is live and ready for edits.",
                "Daily report window closes at 11:59 PM.",
                "Department analytics refresh every 15 minutes.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4 text-sm text-[var(--muted-foreground)]"
                >
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
