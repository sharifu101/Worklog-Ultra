"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardTaskTimerAction } from "@/components/dashboard/dashboard-task-timer-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TaskManageControls } from "@/components/dashboard/task-manage-controls";
import { getTaskTimerStorageKey } from "@/lib/task-timer-storage";
import { extractContinuationMeta } from "@/lib/task-continuation";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeInDhaka, toDateOnly } from "@/lib/utils";

type HistoryItem = {
  id: string;
  planDate: Date;
  taskTitle: string;
  taskDescription?: string | null;
  department: { name: string };
  updates: Array<{
    status: "done" | "in_progress" | "pending";
    trackedMinutes: number;
    actualStart: Date | null;
    actualEnd: Date | null;
    note?: string | null;
    completionPercent?: number;
    difficultyLevel?: string | null;
  }>;
  latestRequest: {
    id: string;
    status: "pending" | "approved" | "rejected";
    reason: string;
    reviewNote?: string | null;
  } | null;
  isToday: boolean;
  canEmployeeEdit: boolean;
  canRequestEdit: boolean;
};

type PendingRequest = {
  id: string;
  reason: string;
  reviewNote?: string | null;
  createdAt: Date;
  requestedBy: { name: string; department: { name: string } | null };
  dailyTask: {
    id: string;
    taskTitle: string;
    taskDescription?: string | null;
    planDate: Date;
    department?: { name: string } | null;
  };
};

type RequestDraft = {
  reason: string;
  startedAt: string;
  endedAt: string;
  summary: string;
  desiredStatus: "done" | "in_progress" | "pending";
};

type HistoryTheme = "light" | "dark";

function statusVariant(status?: "done" | "in_progress" | "pending") {
  if (status === "done") return "success";
  if (status === "pending") return "warning";
  return "purple";
}

function requestVariant(status?: "pending" | "approved" | "rejected") {
  if (status === "approved") return "success";
  if (status === "rejected") return "warning";
  return "purple";
}

function formatHistoryDateParts(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      day: "--",
      monthYear: "Unknown date",
      weekday: "",
      compact: "Unknown date",
    };
  }

  return {
    day: new Intl.DateTimeFormat("en-BD", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
    }).format(date),
    monthYear: new Intl.DateTimeFormat("en-BD", {
      timeZone: "Asia/Dhaka",
      month: "short",
      year: "numeric",
    }).format(date),
    weekday: new Intl.DateTimeFormat("en-BD", {
      timeZone: "Asia/Dhaka",
      weekday: "long",
    }).format(date),
    compact: new Intl.DateTimeFormat("en-BD", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date),
  };
}

function formatHistoryTimeParts(value?: Date | string | null) {
  if (!value) {
    return {
      time: "Not set",
      meridiem: "",
      date: "Waiting for update",
      isSet: false,
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      time: "Not set",
      meridiem: "",
      date: "Waiting for update",
      isSet: false,
    };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "--";
  const meridiem = parts.find((part) => part.type === "dayPeriod")?.value ?? "";

  return {
    time: `${hour}:${minute}`,
    meridiem,
    date: new Intl.DateTimeFormat("en-BD", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date),
    isSet: true,
  };
}

function formatTrackedMinutes(totalMinutes: number) {
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${totalMinutes} min`;
}

function formatMinutesAsHours(totalMinutes: number) {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function getContinuationOverview(task: HistoryItem) {
  const continuationMeta = extractContinuationMeta(task.taskDescription);

  if (!continuationMeta) {
    return null;
  }

  const previousDayLog =
    continuationMeta.dailyLogs.length > 0
      ? continuationMeta.dailyLogs[continuationMeta.dailyLogs.length - 1]
      : null;
  const currentTrackedMinutes = task.updates[0]?.trackedMinutes ?? 0;
  const currentProgress = task.updates[0]?.completionPercent ?? 0;
  const previousTrackedMinutes = (continuationMeta.dailyLogs ?? []).reduce((sum, entry) => sum + entry.trackedMinutes, 0);
  const totalDays = Math.max(continuationMeta.daysActive || 0, continuationMeta.dailyLogs.length, 1);

  return {
    sourceDate: continuationMeta.sourceDate,
    previousDayLog,
    currentTrackedMinutes,
    currentProgress,
    totalDays,
    overallTrackedMinutes: previousTrackedMinutes + currentTrackedMinutes,
    lastNote: continuationMeta.note,
    dailyLogs: continuationMeta.dailyLogs,
  };
}

function getTrackedTone(totalMinutes: number) {
  if (totalMinutes >= 180) return "bg-emerald-50 text-emerald-700";
  if (totalMinutes >= 60) return "bg-blue-50 text-blue-700";
  if (totalMinutes > 0) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function getRecencyMeta(task: HistoryItem) {
  const referenceDate = task.updates[0]?.actualEnd ?? task.planDate;
  const entryDay = toDateOnly(referenceDate);
  const today = toDateOnly();
  const yesterday = toDateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (entryDay === today) {
    return {
      label: "Today",
      chip: "bg-violet-50 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
      row: "history-row history-row-recent",
      tone: "recent" as const,
    };
  }

  if (entryDay === yesterday) {
    return {
      label: "Yesterday",
      chip: "bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
      row: "history-row history-row-yesterday",
      tone: "yesterday" as const,
    };
  }

  return {
    label: null,
    chip: "",
    row: "history-row history-row-default",
    tone: "default" as const,
  };
}

function getThemeStyles(theme: HistoryTheme) {
  if (theme === "light") {
    return {
      shell: {
        background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
      } satisfies CSSProperties,
      defaultRow: {
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(241, 247, 255, 0.98) 100%)",
        borderColor: "rgba(148, 163, 184, 0.24)",
        boxShadow: "0 14px 30px rgba(148, 163, 184, 0.16)",
      } satisfies CSSProperties,
      recentRow: {
        background: "linear-gradient(135deg, rgba(239, 246, 255, 0.99) 0%, rgba(224, 238, 255, 0.99) 100%)",
        borderColor: "rgba(96, 165, 250, 0.32)",
        boxShadow: "0 14px 32px rgba(96, 165, 250, 0.16)",
      } satisfies CSSProperties,
      yesterdayRow: {
        background: "linear-gradient(135deg, rgba(248, 250, 252, 0.98) 0%, rgba(235, 243, 255, 0.96) 100%)",
        borderColor: "rgba(125, 211, 252, 0.28)",
        boxShadow: "0 14px 30px rgba(125, 211, 252, 0.12)",
      } satisfies CSSProperties,
      departmentChip: {
        background: "rgba(255, 255, 255, 0.62)",
        borderColor: "rgba(251, 146, 60, 0.28)",
        color: "var(--foreground)",
      } satisfies CSSProperties,
      dailyLogChip: {
        background: "rgba(255, 255, 255, 0.16)",
      } satisfies CSSProperties,
    };
  }

  return {
    shell: {
      background: "linear-gradient(180deg, rgba(19, 29, 45, 0.96) 0%, rgba(15, 23, 37, 0.98) 100%)",
    } satisfies CSSProperties,
    defaultRow: {
      background: "linear-gradient(135deg, rgba(41, 30, 12, 0.96) 0%, rgba(67, 33, 13, 0.94) 100%)",
      borderColor: "rgba(180, 124, 38, 0.38)",
      boxShadow: "0 14px 34px rgba(0, 0, 0, 0.26)",
    } satisfies CSSProperties,
    recentRow: {
      background: "linear-gradient(135deg, rgba(76, 29, 12, 0.98) 0%, rgba(120, 53, 15, 0.94) 100%)",
      borderColor: "rgba(245, 158, 11, 0.34)",
      boxShadow: "0 16px 36px rgba(0, 0, 0, 0.3)",
    } satisfies CSSProperties,
    yesterdayRow: {
      background: "linear-gradient(135deg, rgba(51, 65, 85, 0.96) 0%, rgba(120, 53, 15, 0.84) 100%)",
      borderColor: "rgba(148, 163, 184, 0.3)",
      boxShadow: "0 14px 34px rgba(0, 0, 0, 0.26)",
    } satisfies CSSProperties,
    departmentChip: {
      background: "rgba(255, 255, 255, 0.1)",
      borderColor: "rgba(255, 255, 255, 0.2)",
      color: "var(--foreground)",
    } satisfies CSSProperties,
    dailyLogChip: {
      background: "rgba(255, 255, 255, 0.1)",
    } satisfies CSSProperties,
  };
}

function getRowStyle(theme: HistoryTheme, tone: "default" | "recent" | "yesterday") {
  const styles = getThemeStyles(theme);

  if (tone === "recent") return styles.recentRow;
  if (tone === "yesterday") return styles.yesterdayRow;
  return styles.defaultRow;
}

function getReasonSections(reason: string) {
  return reason
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        return { label: "Details", value: line };
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      };
    });
}

function parseActionResponse(raw: string) {
  try {
    return raw ? JSON.parse(raw) : { message: "Action failed." };
  } catch {
    return { message: "The server returned an unexpected response." };
  }
}

export function HistoryTable({
  history = [],
  role,
  pendingApprovals = [],
  mode = "history",
  initialTaskId,
  initialRequestId,
}: {
  history: HistoryItem[];
  role: "employee" | "hr" | "manager" | "admin";
  pendingApprovals: PendingRequest[];
  mode?: "history" | "requests";
  initialTaskId?: string;
  initialRequestId?: string;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<HistoryTheme>("dark");
  const [requestDrafts, setRequestDrafts] = useState<Record<string, RequestDraft>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<HistoryItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);

  const visibleHistory = useMemo(() => {
    return history;
  }, [history, mode, role]);

  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (initialRequestId) {
      const matchingRequest = pendingApprovals.find((request) => request.id === initialRequestId);
      if (matchingRequest) {
        setSelectedRequest(matchingRequest);
        return;
      }
    }

    if (initialTaskId) {
      const matchingTask = history.find((task) => task.id === initialTaskId);
      if (matchingTask) {
        setSelectedTask(matchingTask);
      }
    }
  }, [history, initialRequestId, initialTaskId, pendingApprovals]);

  function getDraft(taskId: string): RequestDraft {
    return (
      requestDrafts[taskId] ?? {
        reason: "",
        startedAt: "",
        endedAt: "",
        summary: "",
        desiredStatus: "done",
      }
    );
  }

  function patchDraft(taskId: string, key: keyof RequestDraft, value: string) {
    setRequestDrafts((current) => ({
      ...current,
      [taskId]: {
        ...getDraft(taskId),
        [key]: value as RequestDraft[keyof RequestDraft],
      },
    }));
  }

  async function submitRequest(taskId: string) {
    const draft = getDraft(taskId);
    const reason = draft.reason.trim();

    if (!reason) {
      toast.error("Explain clearly why you missed the report and what you need to edit.");
      return;
    }

    const formattedReason = [
      `Reason: ${reason}`,
      `Requested Status Change: ${draft.desiredStatus}`,
      draft.startedAt ? `Remembered Start Time: ${draft.startedAt}` : null,
      draft.endedAt ? `Remembered End Time: ${draft.endedAt}` : null,
      draft.summary.trim() ? `Work Summary: ${draft.summary.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    setLoadingId(taskId);
    const response = await fetch("/api/dashboard/report-edit-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyTaskId: taskId, reason: formattedReason }),
    });
    const result = await response.json();
    setLoadingId(null);

    if (!response.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setRequestDrafts((current) => ({
      ...current,
      [taskId]: {
        reason: "",
        startedAt: "",
        endedAt: "",
        summary: "",
        desiredStatus: "done",
      },
    }));
    setSelectedTask(null);
    router.refresh();
  }

  async function reviewRequest(requestId: string, decision: "approved" | "rejected") {
    setLoadingId(requestId);
    const response = await fetch(`/api/dashboard/report-edit-requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        reviewNote: reviewNotes[requestId] ?? "",
      }),
    });
    const result = await response.json();
    setLoadingId(null);

    if (!response.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setReviewNotes((current) => ({ ...current, [requestId]: "" }));
    setSelectedRequest(null);
    router.refresh();
  }

  async function restoreTaskToDashboard(task: HistoryItem, options?: { autoStart?: boolean }) {
    setLoadingId(task.id);
    const response = await fetch(`/api/dashboard/tasks/${task.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore_to_dashboard" }),
    });
    const raw = await response.text();
    const result = parseActionResponse(raw) as { message?: string; taskId?: string; reportDate?: string };
    setLoadingId(null);

    if (!response.ok) {
      toast.error(result.message ?? "Task could not be restored.");
      return;
    }

    if (typeof window !== "undefined" && result.taskId && result.reportDate) {
      window.localStorage.removeItem(getTaskTimerStorageKey(result.reportDate, result.taskId));
      if (options?.autoStart) {
        window.sessionStorage.setItem(
          "dashboard-task-autostart",
          JSON.stringify({
            taskId: result.taskId,
            reportDate: result.reportDate,
            timestamp: Date.now(),
          }),
        );
      }
    }

    toast.success(options?.autoStart ? "Task moved to dashboard and ready to resume." : result.message ?? "Task returned to dashboard.");
    setSelectedTask(null);
    router.push("/dashboard");
    router.refresh();
  }

  function renderAction(task: HistoryItem) {
    const reportDate = toDateOnly(task.planDate);

    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setSelectedTask(task)} size="sm" variant="secondary">
          View Details
        </Button>
        <Link href={`/dashboard/report?date=${reportDate}&taskId=${task.id}`}>
          <Button size="sm" variant="outline">
            Open Editor
          </Button>
        </Link>
        <Button disabled={loadingId === task.id} onClick={() => restoreTaskToDashboard(task, { autoStart: true })} size="sm" variant="outline">
          Return To Dashboard
        </Button>
        <TaskManageControls
          compact
          hideDoneAction
          showInlineDelete
          task={{
            id: task.id,
            taskTitle: task.taskTitle,
            taskDescription: task.taskDescription,
            priority: (task as { priority?: "low" | "normal" | "high" | "critical" }).priority ?? "normal",
          }}
          timerPanel={
            task.isToday && task.canEmployeeEdit && task.updates[0]?.status === "in_progress" ? (
              <DashboardTaskTimerAction
                canEdit
                initialActualEnd={task.updates[0]?.actualEnd ?? null}
                initialActualStart={task.updates[0]?.actualStart ?? null}
                initialStatus={task.updates[0]?.status ?? "pending"}
                initialTrackedMinutes={task.updates[0]?.trackedMinutes ?? 0}
                reportDate={reportDate}
                taskId={task.id}
              />
            ) : null
          }
        />
      </div>
    );
  }

  const selectedTaskDraft = selectedTask ? getDraft(selectedTask.id) : null;
  const selectedTaskReasonSections = selectedTask?.latestRequest ? getReasonSections(selectedTask.latestRequest.reason) : [];
  const selectedRequestReasonSections = selectedRequest ? getReasonSections(selectedRequest.reason) : [];
  const themeStyles = getThemeStyles(theme);

  return (
    <div className="space-y-5">
      {!(mode === "requests" && role === "manager") ? (
        <div className="history-table-shell overflow-x-auto rounded-[24px] border border-[var(--panel-border)] p-2" style={themeStyles.shell}>
          <Table className="border-separate border-spacing-y-3">
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Task Details</TH>
                <TH>Action</TH>
              </TR>
            </THead>
            <TBody>
              {(visibleHistory ?? []).map((task) => {
                const latestStatus = task.updates[0]?.status;
                const recency = getRecencyMeta(task);
                const rowStyle = getRowStyle(theme, recency.tone ?? "default");
                const dateParts = formatHistoryDateParts(task.planDate);
                const startedParts = formatHistoryTimeParts(task.updates[0]?.actualStart);
                const endedParts = formatHistoryTimeParts(task.updates[0]?.actualEnd);

                return (
                  <TR
                    key={task.id}
                    className="align-top border-0"
                  >
                    <TD className={`${recency.row} rounded-l-[22px] border border-r-0 px-4 py-5 text-[var(--foreground)]`} style={rowStyle}>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                            {dateParts.weekday}
                          </p>
                          <div className="mt-2 flex items-end gap-2">
                            <span className="text-3xl font-black leading-none text-[var(--foreground)]">{dateParts.day}</span>
                            <span className="pb-1 text-sm font-semibold text-[var(--muted-foreground)]">{dateParts.monthYear}</span>
                          </div>
                        </div>
                        {recency.label ? <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${recency.chip}`}>{recency.label}</span> : null}
                      </div>
                    </TD>
                    <TD className={`${recency.row} space-y-2 border-y px-4 py-5 text-[var(--foreground)]`} style={rowStyle}>
                      <div className="space-y-2">
                        <div className="text-lg font-bold leading-snug text-[var(--foreground)]">{task.taskTitle}</div>
                        <p className="text-sm font-medium text-[var(--muted-foreground)]">
                          Created for {dateParts.compact}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]" style={themeStyles.departmentChip}>
                          {task.department.name}
                        </span>
                        <Badge variant={statusVariant(latestStatus)}>{latestStatus ?? "planned"}</Badge>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTrackedTone(task.updates[0]?.trackedMinutes ?? 0)}`}>
                          {formatTrackedMinutes(task.updates[0]?.trackedMinutes ?? 0)}
                        </span>
                      </div>
                      {extractContinuationMeta(task.taskDescription) ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="purple">Continued</Badge>
                          <span className="text-sm font-medium text-[var(--muted-foreground)]">
                            Running from {extractContinuationMeta(task.taskDescription)?.sourceDate}
                          </span>
                        </div>
                      ) : null}
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/35 px-4 py-3 dark:bg-white/5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Started</span>
                          <div className="mt-2 flex items-end gap-2">
                            <p className={`text-xl font-black leading-none ${startedParts.isSet ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                              {startedParts.time}
                            </p>
                            {startedParts.meridiem ? (
                              <span className="mb-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                                {startedParts.meridiem}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">{startedParts.date}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/35 px-4 py-3 dark:bg-white/5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Ended</span>
                          <div className="mt-2 flex items-end gap-2">
                            <p className={`text-xl font-black leading-none ${endedParts.isSet ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                              {endedParts.time}
                            </p>
                            {endedParts.meridiem ? (
                              <span className="mb-0.5 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-300">
                                {endedParts.meridiem}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">{endedParts.date}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className={`${recency.row} min-w-[220px] rounded-r-[22px] border border-l-0 px-4 py-5 text-[var(--foreground)]`} style={rowStyle}>
                      {renderAction(task)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      ) : null}

      {selectedTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                  {mode === "requests" ? "Request Details" : "Report Preview"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{selectedTask.taskTitle}</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {selectedTask.department.name} - {toDateOnly(selectedTask.planDate)}
                </p>
              </div>
              <Button onClick={() => setSelectedTask(null)} size="icon" type="button" variant="ghost">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Status</p>
                  <div className="mt-2">
                    <Badge variant={statusVariant(selectedTask.updates[0]?.status)}>
                      {selectedTask.updates[0]?.status ?? "planned"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Tracked</p>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedTask.updates[0]?.trackedMinutes ?? 0} min</p>
                </div>
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Started</p>
                  <p className="mt-2 text-xl font-bold text-white">{formatHistoryTimeParts(selectedTask.updates[0]?.actualStart).time}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{formatHistoryTimeParts(selectedTask.updates[0]?.actualStart).date}</p>
                </div>
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Ended</p>
                  <p className="mt-2 text-xl font-bold text-white">{formatHistoryTimeParts(selectedTask.updates[0]?.actualEnd).time}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{formatHistoryTimeParts(selectedTask.updates[0]?.actualEnd).date}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Completion</p>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedTask.updates[0]?.completionPercent ?? 0}%</p>
                </div>
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Difficulty</p>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedTask.updates[0]?.difficultyLevel || "Not set"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Work Note</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--foreground)] dark:text-white/90">
                  {selectedTask.updates[0]?.note || "No extra note added for this report."}
                </p>
              </div>

              {extractContinuationMeta(selectedTask.taskDescription) ? (
                <div className="rounded-2xl border border-violet-300/40 bg-violet-50 p-4 dark:border-violet-400/30 dark:bg-violet-500/10">
                  <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">Continuation</p>
                  {(() => {
                    const continuationOverview = getContinuationOverview(selectedTask);

                    if (!continuationOverview) {
                      return null;
                    }

                    return (
                      <div className="mt-3 space-y-4 text-sm text-slate-700 dark:text-white/90">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-violet-200 bg-white/80 px-3 py-3 dark:border-violet-300/20 dark:bg-slate-950/20">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">Previous Day</p>
                            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                              {continuationOverview.previousDayLog
                                ? formatMinutesAsHours(continuationOverview.previousDayLog.trackedMinutes)
                                : "0h 00m"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-white/70">
                              {continuationOverview.previousDayLog?.date ?? "No saved day log"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-sky-200 bg-white/80 px-3 py-3 dark:border-sky-300/20 dark:bg-slate-950/20">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-200">Current Day</p>
                            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                              {formatMinutesAsHours(continuationOverview.currentTrackedMinutes)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-white/70">
                              Progress {continuationOverview.currentProgress}%
                            </p>
                          </div>
                          <div className="rounded-2xl border border-emerald-200 bg-white/80 px-3 py-3 dark:border-emerald-300/20 dark:bg-slate-950/20">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">Overall Work</p>
                            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                              {formatMinutesAsHours(continuationOverview.overallTrackedMinutes)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-white/70">
                              {continuationOverview.totalDays} active day{continuationOverview.totalDays > 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-amber-200 bg-white/80 px-3 py-3 dark:border-amber-300/20 dark:bg-slate-950/20">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">Started From</p>
                            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                              {continuationOverview.sourceDate || "Previous day"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-white/70">
                              Latest progress {continuationOverview.currentProgress}%
                            </p>
                          </div>
                        </div>
                        {continuationOverview.lastNote ? (
                          <div className="rounded-2xl border border-violet-200 bg-white/70 px-3 py-3 text-sm text-slate-700 dark:border-violet-300/20 dark:bg-slate-950/20 dark:text-white/85">
                            <span className="font-semibold text-violet-700 dark:text-violet-200">Last Note:</span>{" "}
                            {continuationOverview.lastNote}
                          </div>
                        ) : null}
                        {continuationOverview.dailyLogs.length ? (
                      <div className="rounded-2xl border border-violet-200 bg-white/75 p-3 dark:border-violet-300/20 dark:bg-slate-950/20">
                        <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-100">Daily Work Log</p>
                        <div className="mt-2 space-y-2">
                          {(continuationOverview.dailyLogs ?? []).map((entry) => (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-white/85" key={`${selectedTask.id}-${entry.date}`}>
                              <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-800 dark:bg-white/10 dark:text-white/85">{entry.date}</span>
                              <span>{entry.progress}% done</span>
                              <span>{entry.trackedMinutes} min</span>
                              {entry.note ? <span className="text-slate-500 dark:text-white/70">Note: {entry.note}</span> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <Button disabled={loadingId === selectedTask.id} onClick={() => restoreTaskToDashboard(selectedTask, { autoStart: true })} size="sm" variant="outline">
                  Resume On Dashboard
                </Button>
                <TaskManageControls
                  hideDoneAction
                  task={{
                    id: selectedTask.id,
                    taskTitle: selectedTask.taskTitle,
                    taskDescription: selectedTask.taskDescription,
                    priority: (selectedTask as { priority?: "low" | "normal" | "high" | "critical" }).priority ?? "normal",
                  }}
                />
                <Link href={`/dashboard/report?date=${toDateOnly(selectedTask.planDate)}&taskId=${selectedTask.id}`}>
                  <Button size="sm" variant="secondary">
                    Open Full Editor
                  </Button>
                </Link>
                <Button onClick={() => setSelectedTask(null)} size="sm" type="button">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Pending Approval</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{selectedRequest.dailyTask.taskTitle}</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {selectedRequest.requestedBy.name} - {selectedRequest.requestedBy.department?.name ?? "No department"} - {toDateOnly(selectedRequest.dailyTask.planDate)}
                </p>
              </div>
              <Button onClick={() => setSelectedRequest(null)} size="icon" type="button" variant="ghost">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Employee Request</p>
                <div className="mt-3 space-y-3">
                  {(selectedRequestReasonSections ?? []).map((section, index) => (
                    <div key={`${section.label}-${index}`}>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{section.label}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-[var(--foreground)] dark:text-white/90">{section.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Textarea
                placeholder="Optional note for the employee. Example: approved, update final time carefully."
                value={reviewNotes[selectedRequest.id] ?? ""}
                onChange={(event) => setReviewNotes((current) => ({ ...current, [selectedRequest.id]: event.target.value }))}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  disabled={loadingId === selectedRequest.id}
                  onClick={() => reviewRequest(selectedRequest.id, "approved")}
                  size="sm"
                  type="button"
                >
                  Approve
                </Button>
                <Button
                  disabled={loadingId === selectedRequest.id}
                  onClick={() => reviewRequest(selectedRequest.id, "rejected")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
