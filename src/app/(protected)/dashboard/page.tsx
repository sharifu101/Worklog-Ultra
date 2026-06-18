import Image from "next/image";
import Link from "next/link";
import { Check, CheckCircle2, CircleAlert, ClipboardList, Clock3, PlayCircle, TimerReset } from "lucide-react";
import { DashboardProgressCard } from "@/components/dashboard/dashboard-progress-card";
import { DashboardRecurringQuickAdd } from "@/components/dashboard/dashboard-recurring-quick-add";
import { DashboardTaskNotifier } from "@/components/dashboard/dashboard-task-notifier";
import { DashboardTimeSummary } from "@/components/dashboard/dashboard-time-summary";
import { DashboardWorkdayTimer } from "@/components/dashboard/dashboard-workday-timer";
import { DashboardWorkPlanSection } from "@/components/dashboard/dashboard-work-plan-section";
import { DashboardWorkspaceModal } from "@/components/dashboard/dashboard-workspace-modal";
import { requireUser } from "@/lib/auth/server";
import { extractAssignmentReviewReason } from "@/lib/assignment-review";
import { filterTodaysWorkPlanTasks } from "@/lib/dashboard-work-plan-filter";
import { canUserEditReportDate, getAssignableUsers, getCurrentUserAttendanceSnapshot, getDashboardData, getDepartments, getPlanSuggestions, getPlanWithReports } from "@/lib/worklog";
import { formatDateTimeInDhaka, isTenderDepartmentName, toDateOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statCardStyles = [
  {
    icon: ClipboardList,
    iconWrap: "bg-[#eef2ff] text-[#3148d8]",
    card: "bg-white",
    border: "border-[#d8e2ff]",
    shadow: "shadow-[0_22px_42px_rgba(79,94,247,0.14)]",
    accent: "bg-[#4f5ef7]",
    label: "Planned flow",
    art: "/vectors/Planned%20Tasks.png",
  },
  {
    icon: CheckCircle2,
    iconWrap: "bg-[#e8fbf4] text-[#0f8f68]",
    card: "bg-white",
    border: "border-[#d5f7e9]",
    shadow: "shadow-[0_22px_42px_rgba(16,185,129,0.14)]",
    accent: "bg-[#17b26a]",
    label: "Completed",
    art: "/vectors/Completed%20Tasks.png",
  },
  {
    icon: PlayCircle,
    iconWrap: "bg-[#fff5e6] text-[#dc7f07]",
    card: "bg-white",
    border: "border-[#ffe0ab]",
    shadow: "shadow-[0_22px_42px_rgba(245,158,11,0.14)]",
    accent: "bg-[#f59e0b]",
    label: "Running now",
    art: "/vectors/In%20Progress%20Tasks.png",
  },
  {
    icon: TimerReset,
    iconWrap: "bg-[#fff0f4] text-[#d91c4a]",
    card: "bg-white",
    border: "border-[#ffd0da]",
    shadow: "shadow-[0_22px_42px_rgba(244,63,94,0.14)]",
    accent: "bg-[#f43f5e]",
    label: "Need action",
    art: "/vectors/Pending%20Tasks.png",
  },
  {
    icon: Clock3,
    iconWrap: "bg-[#f3eeff] text-[#7041e6]",
    card: "bg-white",
    border: "border-[#e1d6ff]",
    shadow: "shadow-[0_22px_42px_rgba(139,92,246,0.14)]",
    accent: "bg-[#8b5cf6]",
    label: "Work time",
    art: "/vectors/Actual%20Work%20Time.png",
  },
];

const notices = [
  "Save today's tasks before the first work block starts.",
  "Complete your report before day close.",
  "Keep high-priority tasks updated so progress stays visible.",
];

function priorityRank(priority: string) {
  if (priority === "critical") return 0;
  if (priority === "high") return 1;
  if (priority === "normal") return 2;
  return 3;
}

function formatHoursAndMinutes(hoursLabel: string) {
  const numericHours = Number(hoursLabel.replace("h", ""));

  if (!Number.isFinite(numericHours) || numericHours <= 0) {
    return "0h 00m";
  }

  const hours = Math.floor(numericHours);
  const minutes = Math.round((numericHours - hours) * 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatDashboardDate(value: Date) {
  return new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatTimeOnly(value?: Date | null) {
  if (!value) return "--:-- --";
  return formatDateTimeInDhaka(value).split(", ").pop() ?? "--:-- --";
}

function getMotivationalMessage(input: {
  name: string;
  role: "employee" | "hr" | "manager" | "admin";
  plannedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  trackedMinutes: number;
}) {
  function buildHash(value: string) {
    return value.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 17), 0);
  }

  const dayKey = toDateOnly();
  const seed = `${input.name}-${input.role}-${dayKey}-${input.plannedTasks}-${input.completedTasks}-${input.pendingTasks}-${input.trackedMinutes}`;

  if (input.role === "manager" || input.role === "admin") {
    return {
      message: `Hello ${input.name}, hope your day goes well today.`,
    };
  }

  if (input.role === "hr") {
    const hrPool = [
      `Hello ${input.name}, hope your day goes smoothly today.`,
      `Hello ${input.name}, wishing you a calm and productive day.`,
      `Hello ${input.name}, hope today moves well for you.`,
      `Hello ${input.name}, wishing you a good day ahead.`,
    ];

    return {
      message: hrPool[buildHash(seed) % hrPool.length],
    };
  }

  const employeePool = [
    `Hello ${input.name}, your next good step can make today count.`,
    `Hello ${input.name}, stay steady today and your work will speak for you.`,
    `Hello ${input.name}, one focused effort today can change the whole day.`,
    `Hello ${input.name}, keep moving today, your progress is building.`,
    `Hello ${input.name}, today is a good day to finish something meaningful.`,
    `Hello ${input.name}, your consistency today can put you ahead.`,
    `Hello ${input.name}, keep your pace today and good results will follow.`,
    `Hello ${input.name}, one smart move today can set the tone for everything else.`,
    `Hello ${input.name}, keep your head clear today and the work will flow better.`,
    `Hello ${input.name}, your effort today can become tomorrow's advantage.`,
    `Hello ${input.name}, small wins today can build a very strong day.`,
    `Hello ${input.name}, stay locked in today, you are capable of more than enough.`,
  ];

  return {
    message: employeePool[buildHash(seed) % employeePool.length],
  };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const reportDate = toDateOnly();

  const [data, attendance, departments, reportTasks, suggestions, assignableUsers] = await Promise.all([
    getDashboardData(user.id, user.role, user.departmentId),
    getCurrentUserAttendanceSnapshot(user.id),
    getDepartments(),
    getPlanWithReports(user.id),
    getPlanSuggestions(user.id, user.departmentId),
    getAssignableUsers(),
  ]);

  const editAccess = await canUserEditReportDate(
    { id: user.id, role: user.role },
    new Date(reportDate),
    (reportTasks ?? []).map((task) => task.id),
  );

  const today = new Date();
  const completedTasks = data.tasks.filter((task) => task.updates[0]?.status === "done").length;
  const inProgressTasks = data.tasks.filter((task) => task.updates[0]?.status === "in_progress").length;
  const pendingTasks = Math.max(0, data.kpis.pendingItems - inProgressTasks);
  const plannedTasks = data.kpis.tasksPlanned;
  const workedMinutes = data.tasks.reduce((sum, task) => sum + (task.updates[0]?.trackedMinutes ?? 0), 0);
  const targetMinutes = Math.max(plannedTasks * 60, 8 * 60);
  const remainingMinutes = Math.max(targetMinutes - workedMinutes, 0);
  const activeTasks = filterTodaysWorkPlanTasks(data.tasks).sort(
    (left, right) => priorityRank(left.priority) - priorityRank(right.priority) || left.taskTitle.localeCompare(right.taskTitle),
  );
  const urgentTasks = activeTasks.filter((task) => ["high", "critical"].includes(task.priority)).slice(0, 3);
  const attendanceStatusLabel =
    attendance?.checkInAt && !attendance?.checkOutAt
      ? "You are checked in"
      : attendance?.checkInAt && attendance?.checkOutAt
        ? "Attendance completed"
        : "No attendance logged yet";
  const motivation = getMotivationalMessage({
    name: user.name,
    role: user.role,
    plannedTasks,
    completedTasks,
    pendingTasks,
    trackedMinutes: workedMinutes,
  });
  const isTenderDepartment = isTenderDepartmentName(user.department?.name);

  const statCards = [
    {
      title: "Planned Tasks",
      value: plannedTasks,
      linkLabel: "View all",
      href: "/dashboard/plan",
    },
    {
      title: "Completed Tasks",
      value: completedTasks,
      linkLabel: "View all",
      href: "/dashboard/report",
    },
    {
      title: "In Progress Tasks",
      value: inProgressTasks,
      linkLabel: "View all",
      href: "/dashboard/report",
    },
    {
      title: "Pending Tasks",
      value: pendingTasks,
      linkLabel: "View all",
      href: "/dashboard/report",
    },
    {
      title: "Actual Work Time",
      value: formatHoursAndMinutes(data.kpis.worklogHours),
      linkLabel: "View details",
      href: "/dashboard/history",
    },
  ];

  return (
    <div className="space-y-4">
      <DashboardTaskNotifier
        tasks={(data.tasks ?? []).map((task) => ({
          id: task.id,
          title: task.taskTitle,
          status: task.updates[0]?.status ?? "pending",
          trackedMinutes: task.updates[0]?.trackedMinutes ?? 0,
          actualEnd: task.updates[0]?.actualEnd?.toISOString() ?? null,
          taskDescription: task.taskDescription,
        }))}
      />
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between" data-page-section>
        <div>
          <h1 className="max-w-4xl text-lg font-semibold leading-tight text-[var(--foreground)] md:text-xl">
            {motivation.message}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-[var(--muted-foreground)]">{formatDashboardDate(today)}</p>
        </div>
        <div className="flex w-full flex-wrap gap-3 md:w-auto md:justify-end xl:flex-nowrap">
          <DashboardWorkspaceModal
            canEditReport={editAccess.allowed}
            currentUserId={user.id}
            departments={departments}
            initialTasks={[]}
            isTenderDepartment={isTenderDepartment}
            assignableUsers={assignableUsers}
            reportDate={reportDate}
            reportTasks={(reportTasks ?? []).map((task) => ({
              id: task.id,
              taskTitle: task.taskTitle,
              updates: (task.updates ?? []).map((update) => ({
                status: update.status,
                note: update.note,
                completionPercent: update.completionPercent,
                trackedMinutes: update.trackedMinutes,
                actualStart: update.actualStart,
                actualEnd: update.actualEnd,
                difficultyLevel: update.difficultyLevel,
              })),
            }))}
            role={user.role}
            suggestions={suggestions ?? []}
            userDepartmentId={user.departmentId}
          />
          <div className="shrink-0">
            <DashboardWorkdayTimer
              currentUserId={user.id}
              initialAttendance={
                attendance
                  ? {
                      status: attendance.status,
                      note: attendance.note ?? "",
                      breakMinutes: attendance.breakMinutes ?? 0,
                      checkInAt: attendance.checkInAt?.toISOString() ?? null,
                      checkOutAt: attendance.checkOutAt?.toISOString() ?? null,
                    }
                  : null
              }
              mode="button"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" data-page-section>
        {statCards.map((item, index) => {
          const style = statCardStyles[index % statCardStyles.length];
          const Icon = style.icon;

          return (
            <Link
              className={`group relative overflow-hidden rounded-[22px] border p-4 transition hover:-translate-y-0.5 ${style.card} ${style.border} ${style.shadow}`}
              data-dashboard-card
              href={item.href}
              key={item.title}
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 ${style.accent}`} />
              <div className="pointer-events-none absolute inset-y-1 right-0 w-[54%]">
                <Image
                  alt={item.title}
                  className="object-contain object-right-center"
                  data-dashboard-float="soft"
                  fill
                  sizes="(max-width: 1280px) 190px, 250px"
                  src={style.art}
                />
              </div>
              <div className="relative flex items-center justify-between gap-3">
                <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] shadow-sm ${style.iconWrap}`}>
                  <Icon className="relative h-6 w-6" />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {style.label}
                </span>
              </div>
              <div className="relative mt-4">
                <p className="text-[1.7rem] font-bold leading-none text-slate-900">{item.value}</p>
                <p className="mt-1.5 max-w-[44%] text-sm font-semibold text-slate-700">{item.title}</p>
              </div>
              <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.accent}`} />
                  <span className="h-2.5 w-8 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-14 rounded-full bg-slate-200" />
                </div>
                <div className="text-sm font-semibold text-slate-600 transition group-hover:text-slate-900">
                  {item.linkLabel}
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.82fr)_360px]" data-page-section>
        <div className="space-y-4">
          <DashboardRecurringQuickAdd
            allowOtherDepartment={user.role === "admin"}
            currentUserDepartmentId={user.departmentId || departments[0]?.id || ""}
            isTenderDepartment={isTenderDepartment}
            currentUserId={user.id}
            departments={departments ?? []}
            existingTaskTitles={(activeTasks ?? []).map((task) => task.taskTitle)}
          />

          <DashboardWorkPlanSection
            canEdit={editAccess.allowed}
            currentUserId={user.id}
            formattedDate={formatDashboardDate(today)}
            tasks={(data.tasks ?? []).map((task) => ({
              id: task.id,
              taskTitle: task.taskTitle,
              taskDescription: task.taskDescription,
              priority: task.priority,
              planDate: toDateOnly(task.planDate),
              assignedBy: task.assignedBy,
              userId: task.userId,
              departmentName: task.user.department?.name ?? "General",
              updates: (task.updates ?? []).map((update) => ({
                status: update.status,
                note: update.note,
                trackedMinutes: update.trackedMinutes,
                actualStart: update.actualStart?.toISOString() ?? null,
                actualEnd: update.actualEnd?.toISOString() ?? null,
                reportDate: toDateOnly(update.reportDate),
              })),
              latestReview: task.editRequests[0]
                ? {
                    id: task.editRequests[0].id,
                    status: task.editRequests[0].status as "pending" | "approved" | "rejected",
                    submitNote: extractAssignmentReviewReason(task.editRequests[0].reason) ?? "",
                    reviewNote: task.editRequests[0].reviewNote ?? null,
                    createdAt: task.editRequests[0].createdAt.toISOString(),
                    reviewedAt: task.editRequests[0].reviewedAt?.toISOString() ?? null,
                    requestedById: task.editRequests[0].requestedById,
                    reviewerId: task.editRequests[0].reviewerId ?? null,
                  }
                : null,
            }))}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[26px] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]" data-dashboard-panel>
              <div className="flex items-center gap-2">
                <CircleAlert className="h-5 w-5 text-rose-500" />
                <h3 className="text-xl font-bold text-[var(--foreground)]">High Priority Tasks</h3>
              </div>
              <div className="mt-5 space-y-4">
                {urgentTasks.length ? (
                  urgentTasks.map((task) => (
                    <div className="flex items-start justify-between gap-4" key={task.id}>
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{task.taskTitle}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{task.user.department?.name ?? "General"}</p>
                      </div>
                      <span className="text-sm font-medium text-rose-500">High</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">No high-priority tasks right now.</p>
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]" data-dashboard-panel>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-[var(--foreground)]">Recent Notices</h3>
                <Link className="text-sm font-semibold text-[#4f5ef7] hover:text-[#3f4ede]" href="/dashboard/help">
                  View all
                </Link>
              </div>
              <div className="mt-5 space-y-4">
                {notices.map((notice, index) => (
                  <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] pb-3 last:border-b-0 last:pb-0" key={notice}>
                    <p className="text-sm font-medium text-[var(--foreground)]">{notice}</p>
                    <span className="shrink-0 text-xs font-medium text-[var(--muted-foreground)]">0{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <DashboardProgressCard
            completedTasks={completedTasks}
            inProgressTasks={inProgressTasks}
            pendingTasks={pendingTasks}
            plannedTasks={plannedTasks}
          />

          <DashboardTimeSummary
            plannedTasks={plannedTasks}
            tasks={(data.tasks ?? []).map((task) => ({
              id: task.id,
              trackedMinutes: task.updates[0]?.trackedMinutes ?? 0,
            }))}
          />

          <div className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]" data-dashboard-panel>
            <h3 className="text-[1.05rem] font-bold text-[var(--foreground)]">Attendance</h3>
            <div className="mt-3 overflow-hidden rounded-[20px] border border-[var(--panel-border)]">
              <div className="grid grid-cols-2 divide-x divide-[var(--panel-border)]">
                <div className="px-4 py-3.5">
                  <p className="text-[13px] text-[var(--muted-foreground)]">Check In</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-4 w-4" />
                    </span>
                    <p className="text-[1.55rem] font-bold tracking-[-0.03em] text-[var(--foreground)]">{formatTimeOnly(attendance?.checkInAt)}</p>
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <p className="text-[13px] text-[var(--muted-foreground)]">Check Out</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-alt)] text-[var(--muted-foreground)]">
                      <Clock3 className="h-4 w-4" />
                    </span>
                    <p className="text-[1.55rem] font-bold tracking-[-0.03em] text-[var(--foreground)]">{formatTimeOnly(attendance?.checkOutAt)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700">{attendanceStatusLabel}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
