import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEmployee } from "@/lib/auth/server";
import { roleUiTitle } from "@/lib/auth/roles";
import { getWorkspaceDirectoryData } from "@/lib/worklog";

export const dynamic = "force-dynamic";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusVariant(status: string) {
  if (status === "done") return "success";
  if (status === "pending") return "warning";
  if (status === "in_progress") return "purple";
  return "default";
}

export default async function DirectoryPage() {
  await requireEmployee();
  const users = await getWorkspaceDirectoryData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Directory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 border-white/10">
                  {user.avatarUrl ? <AvatarImage alt={user.name} src={user.avatarUrl} /> : null}
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-white">{user.name}</p>
                    <Badge>{roleUiTitle(user.role)}</Badge>
                  </div>
                  <p className="text-sm text-cyan-300">{user.departmentName}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{user.designation ?? roleUiTitle(user.role)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Today’s Planned Work</p>
                  <span className="text-xs text-[var(--muted-foreground)]">{user.todaysPlans.length} task(s)</span>
                </div>
                {user.todaysPlans.length ? (
                  <div className="space-y-2">
                    {user.todaysPlans.map((task) => (
                      <div key={task.id} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-white">{task.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-300">
                              {task.priority}
                            </span>
                            <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">No morning plan added yet for today.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
