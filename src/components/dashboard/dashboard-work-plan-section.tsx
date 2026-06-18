"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AssignmentReviewControls } from "@/components/dashboard/assignment-review-controls";
import { DashboardTaskTimerAction, type TaskTimerSnapshot } from "@/components/dashboard/dashboard-task-timer-action";
import { TaskAutoStopNoteModal } from "@/components/dashboard/task-auto-stop-note-modal";
import { TaskCompleteModal, type TaskCompletionPayload } from "@/components/dashboard/task-complete-modal";
import { TaskManageControls } from "@/components/dashboard/task-manage-controls";
import { DASHBOARD_TASKS_CREATED_EVENT, type DashboardLiveTask } from "@/lib/dashboard-live-events";
import {
  readPendingTaskAutoStopNotes,
  removePendingTaskAutoStopNote,
  TASK_AUTO_STOP_NOTE_EVENT,
  type TaskAutoStopNotePayload,
} from "@/lib/task-auto-stop-note";
import { countDashboardTaskStats, filterTodaysWorkPlanTasks } from "@/lib/dashboard-work-plan-filter";
import { extractContinuationMeta } from "@/lib/task-continuation";
import { extractFollowUpMeta } from "@/lib/task-follow-up";
import { getReadableTaskDescription } from "@/lib/report-summary";
import { formatDateTimeInDhaka, toDateOnly } from "@/lib/utils";

export type DashboardWorkPlanTask = {
  id: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: string;
  planDate: string;
  assignedBy?: string | null;
  userId: string;
  departmentName: string;
  updates: Array<{
    status: "done" | "in_progress" | "pending";
    note?: string | null;
    trackedMinutes: number;
    actualStart?: string | null;
    actualEnd?: string | null;
    reportDate?: string | null;
  }>;
  latestReview?: {
    id: string;
    status: "pending" | "approved" | "rejected";
    submitNote: string;
    reviewNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
    requestedById: string;
    reviewerId: string | null;
  } | null;
};

type DashboardWorkPlanSectionProps = {
  tasks: DashboardWorkPlanTask[];
  canEdit: boolean;
  currentUserId: string;
  formattedDate: string;
  onStatsChange?: (stats: {
    plannedTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    visibleTaskIds: string[];
  }) => void;
};

function getPriorityTone(priority: string) {
  if (priority === "high" || priority === "critical") {
    return "border border-rose-200 bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 text-white shadow-[0_6px_14px_rgba(244,63,94,0.2)]";
  }

  if (priority === "normal") {
    return "border border-amber-200 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 text-slate-950 shadow-[0_6px_14px_rgba(245,158,11,0.18)]";
  }

  return "border border-emerald-200 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 text-white shadow-[0_6px_14px_rgba(16,185,129,0.18)]";
}

function formatPriority(priority: string) {
  if (priority === "critical") return "High";
  if (priority === "normal") return "Medium";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function priorityRank(priority: string) {
  if (priority === "critical") return 0;
  if (priority === "high") return 1;
  if (priority === "normal") return 2;
  return 3;
}

function getStatusMeta(status: "done" | "in_progress" | "pending") {
  if (status === "done") {
    return { label: "Completed", chip: "border border-emerald-200 bg-emerald-50 text-emerald-700" };
  }

  if (status === "in_progress") {
    return { label: "In Progress", chip: "border border-blue-200 bg-blue-50 text-blue-700" };
  }

  return { label: "Pending", chip: "border border-amber-200 bg-amber-50 text-amber-700" };
}

function formatTimeOnly(value?: string | null) {
  if (!value) return "--:--";
  return formatDateTimeInDhaka(value).split(", ").pop() ?? "--:--";
}

function formatPlannedTime(task: DashboardWorkPlanTask) {
  const update = task.updates[0];
  const start = update?.actualStart;
  const end = update?.actualEnd;

  if (start && end) {
    return `${formatTimeOnly(start)} - ${formatTimeOnly(end)}`;
  }

  if (start) {
    return `${formatTimeOnly(start)} - --:--`;
  }

  return "--:-- --";
}

function parseResponse(raw: string) {
  try {
    return raw ? JSON.parse(raw) : { message: "Task update failed." };
  } catch {
    return { message: "The server returned an unexpected response." };
  }
}

type TaskTimerActionWrapperProps = {
  task: DashboardWorkPlanTask;
  canEdit: boolean;
  onDoneClick: (taskId: string) => void;
  onSnapshotChange: (taskId: string, snapshot: TaskTimerSnapshot) => void;
  afterDoneSlot?: ReactNode;
};

const TaskTimerActionWrapper = ({
  task,
  canEdit,
  onDoneClick,
  onSnapshotChange,
  afterDoneSlot,
}: TaskTimerActionWrapperProps) => {
  const handleDone = useCallback(() => {
    onDoneClick(task.id);
  }, [task.id, onDoneClick]);

  const handleSnapshot = useCallback(
    (snapshot: TaskTimerSnapshot) => {
      onSnapshotChange(task.id, snapshot);
    },
    [task.id, onSnapshotChange]
  );

  const status = task.updates[0]?.status ?? "pending";

  return (
    <DashboardTaskTimerAction
      canEdit={canEdit}
      compact
      initialActualEnd={task.updates[0]?.actualEnd ?? null}
      initialActualStart={task.updates[0]?.actualStart ?? null}
      initialStatus={status}
      initialTrackedMinutes={task.updates[0]?.trackedMinutes ?? 0}
      afterDoneSlot={afterDoneSlot}
      onDoneClick={handleDone}
      onSnapshotChange={handleSnapshot}
      reportDate={toDateOnly(task.planDate)}
      taskId={task.id}
    />
  );
};

function emitDashboardStats(
  allTasks: DashboardWorkPlanTask[],
  onStatsChange?: DashboardWorkPlanSectionProps["onStatsChange"],
) {
  const stats = countDashboardTaskStats(allTasks);
  onStatsChange?.({
    plannedTasks: stats.plannedTasks,
    completedTasks: stats.completedTasks,
    inProgressTasks: stats.inProgressTasks,
    pendingTasks: stats.pendingTasks,
    visibleTaskIds: stats.visibleTasks.map((task) => task.id),
  });

  if (typeof window !== "undefined") {
    // Defer event dispatch to after render completes to avoid "Cannot update a component while rendering" error
    queueMicrotask(() => {
      window.dispatchEvent(
        new CustomEvent("dashboard:stats-updated", {
          detail: {
            plannedTasks: stats.plannedTasks,
            completedTasks: stats.completedTasks,
            inProgressTasks: stats.inProgressTasks,
            pendingTasks: stats.pendingTasks,
            visibleTaskIds: stats.visibleTasks.map((task) => task.id),
          },
        }),
      );
    });
  }
}

export function DashboardWorkPlanSection({
  tasks: initialTasks,
  canEdit,
  currentUserId,
  formattedDate,
  onStatsChange,
}: DashboardWorkPlanSectionProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [completeTaskId, setCompleteTaskId] = useState<string | null>(null);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [autoStopQueue, setAutoStopQueue] = useState<TaskAutoStopNotePayload[]>([]);
  const [savingAutoStopNote, setSavingAutoStopNote] = useState(false);
  const timerSnapshotsRef = useRef<Record<string, TaskTimerSnapshot>>({});

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    emitDashboardStats(tasks, onStatsChange);
  }, [onStatsChange, tasks]);

  useEffect(() => {
    function handleTasksCreated(event: Event) {
      const detail = (event as CustomEvent<{ tasks?: DashboardLiveTask[] }>).detail;
      const createdTasks = detail?.tasks ?? [];

      if (!createdTasks.length) {
        return;
      }

      setTasks((current) => {
        const currentIds = new Set(current.map((task) => task.id));
        const nextTasks = [
          ...createdTasks
            .filter((task) => !currentIds.has(task.id))
            .map((task) => ({
              ...task,
              updates: [],
              latestReview: null,
            })),
          ...current,
        ];

        return nextTasks;
      });
    }

    window.addEventListener(DASHBOARD_TASKS_CREATED_EVENT, handleTasksCreated);
    return () => window.removeEventListener(DASHBOARD_TASKS_CREATED_EVENT, handleTasksCreated);
  }, []);

  useEffect(() => {
    setAutoStopQueue(readPendingTaskAutoStopNotes());

    function handleAutoStopNoteNeeded(event: Event) {
      const detail = (event as CustomEvent<TaskAutoStopNotePayload>).detail;
      if (!detail?.taskId || !detail?.reportDate) {
        return;
      }

      setAutoStopQueue((current) => {
        const withoutDuplicate = current.filter(
          (entry) => !(entry.taskId === detail.taskId && entry.reportDate === detail.reportDate),
        );

        return [...withoutDuplicate, detail].sort((left, right) => left.timestamp - right.timestamp);
      });
    }

    window.addEventListener(TASK_AUTO_STOP_NOTE_EVENT, handleAutoStopNoteNeeded);
    return () => window.removeEventListener(TASK_AUTO_STOP_NOTE_EVENT, handleAutoStopNoteNeeded);
  }, []);

  const handleSnapshotChange = useCallback((taskId: string, snapshot: TaskTimerSnapshot) => {
    timerSnapshotsRef.current = {
      ...timerSnapshotsRef.current,
      [taskId]: snapshot,
    };
  }, []);

  const handleDoneClick = useCallback((taskId: string) => {
    setCompleteTaskId(taskId);
  }, []);

  const handleModalOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCompleteTaskId(null);
    }
  }, []);

  const visibleTasks = useMemo(
    () =>
      filterTodaysWorkPlanTasks(tasks)
        .sort(
          (left, right) =>
            priorityRank(left.priority) - priorityRank(right.priority) ||
            left.taskTitle.localeCompare(right.taskTitle),
        )
        .slice(0, 6),
    [tasks],
  );

  const completingTask = tasks.find((task) => task.id === completeTaskId) ?? null;
  const activeAutoStopPrompt = autoStopQueue[0] ?? null;
  const activeAutoStopTask = activeAutoStopPrompt
    ? tasks.find((task) => task.id === activeAutoStopPrompt.taskId) ?? null
    : null;

  function removeTaskFromToday(taskId: string) {
    setTasks((current) => {
      return current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          updates: [
            {
              ...(task.updates[0] ?? {
                trackedMinutes: 0,
                actualStart: null,
                actualEnd: null,
                note: null,
                reportDate: toDateOnly(),
              }),
              status: "done" as const,
            },
          ],
        };
      });
    });
  }

  function dismissAutoStopPrompt(taskId: string, reportDate: string) {
    removePendingTaskAutoStopNote(reportDate, taskId);
    setAutoStopQueue((current) =>
      current.filter((entry) => !(entry.taskId === taskId && entry.reportDate === reportDate)),
    );
  }

  async function handleCompleteSave(payload: TaskCompletionPayload) {
    if (!completingTask) {
      return;
    }

    const snapshot = timerSnapshotsRef.current[completingTask.id];
    setSavingCompletion(true);

    const response = await fetch(`/api/dashboard/tasks/${completingTask.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete_task",
        completionStatus: payload.completionStatus,
        completionNote: payload.completionNote,
        needFollowUp: payload.needFollowUp,
        followUpDate: payload.followUpDate,
        followUpTime: payload.followUpTime,
        followUpNote: payload.followUpNote,
        trackedMinutes: Number(snapshot?.trackedMinutes ?? completingTask.updates[0]?.trackedMinutes ?? 0),
        actualStart: snapshot?.actualStart || completingTask.updates[0]?.actualStart || "",
        actualEnd: snapshot?.actualEnd || completingTask.updates[0]?.actualEnd || "",
      }),
    });

    const result = parseResponse(await response.text());
    setSavingCompletion(false);

    if (!response.ok) {
      toast.error(result.message ?? "Could not complete task.");
      return;
    }

    toast.success(result.message ?? "Task completed.");
    setCompleteTaskId(null);
    removeTaskFromToday(completingTask.id);

    if (typeof window !== "undefined") {
      const todayKey = toDateOnly();
      window.sessionStorage.setItem(
        `task-popup-completed-event:${todayKey}`,
        JSON.stringify({
          taskId: completingTask.id,
          taskTitle: completingTask.taskTitle,
          timestamp: Date.now(),
          trackedMinutes: Number(result.trackedMinutes ?? snapshot?.trackedMinutes ?? 0),
        }),
      );
    }
  }

  async function handleAutoStopNoteSave(note: string) {
    if (!activeAutoStopPrompt) {
      return;
    }

    const currentTask = tasks.find((task) => task.id === activeAutoStopPrompt.taskId) ?? activeAutoStopTask;
    const snapshot = timerSnapshotsRef.current[activeAutoStopPrompt.taskId];
    const nextStatus = snapshot?.status || currentTask?.updates[0]?.status || "in_progress";
    const nextTrackedMinutes = Math.max(
      0,
      Number(
        snapshot?.trackedMinutes ??
          activeAutoStopPrompt.trackedMinutes ??
          currentTask?.updates[0]?.trackedMinutes ??
          0,
      ),
    );
    const nextActualStart =
      snapshot?.actualStart || activeAutoStopPrompt.actualStart || currentTask?.updates[0]?.actualStart || "";
    const nextActualEnd =
      snapshot?.actualEnd || activeAutoStopPrompt.actualEnd || currentTask?.updates[0]?.actualEnd || "";

    setSavingAutoStopNote(true);
    const response = await fetch("/api/dashboard/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportDate: activeAutoStopPrompt.reportDate,
        updates: [
          {
            dailyTaskId: activeAutoStopPrompt.taskId,
            status: nextStatus,
            note,
            completionPercent: nextStatus === "done" ? 100 : 0,
            trackedMinutes: nextTrackedMinutes,
            actualStart: nextActualStart,
            actualEnd: nextActualEnd,
            difficultyLevel: "",
          },
        ],
      }),
    });

    const result = parseResponse(await response.text());
    setSavingAutoStopNote(false);

    if (!response.ok) {
      toast.error(result.message ?? "Could not save auto-stop note.");
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === activeAutoStopPrompt.taskId
          ? {
              ...task,
              updates: [
                {
                  ...(task.updates[0] ?? {
                    status: nextStatus,
                    trackedMinutes: nextTrackedMinutes,
                    actualStart: nextActualStart || null,
                    actualEnd: nextActualEnd || null,
                    reportDate: activeAutoStopPrompt.reportDate,
                  }),
                  status: nextStatus,
                  trackedMinutes: nextTrackedMinutes,
                  actualStart: nextActualStart || null,
                  actualEnd: nextActualEnd || null,
                  note,
                },
              ],
            }
          : task,
      ),
    );

    toast.success("Auto-stop note saved.");
    dismissAutoStopPrompt(activeAutoStopPrompt.taskId, activeAutoStopPrompt.reportDate);
  }

  return (
    <>
      <div className="overflow-hidden rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] shadow-[var(--shadow)]" data-dashboard-panel>
        <div className="flex flex-col gap-2 border-b border-[var(--panel-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">Today&apos;s Work Plan</h2>
          </div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">{formattedDate}</p>
        </div>

        <div className="space-y-1 p-3 sm:p-4">
          {visibleTasks.length ? (
            visibleTasks.map((task) => {
              const status = task.updates[0]?.status ?? "pending";
              const statusMeta = getStatusMeta(status);
              const continuationMeta = extractContinuationMeta(task.taskDescription);
              const followUpMeta = extractFollowUpMeta(task.taskDescription);
              const taskDescription = getReadableTaskDescription(task.taskDescription);

              return (
                <article
                  className="group rounded-[22px] border border-[#E4EAF5] bg-[#F8FAFF] p-3 transition hover:border-[#d5dff3] hover:bg-white hover:shadow-[0_10px_26px_rgba(79,94,247,0.12)]"
                  data-dashboard-row
                  key={task.id}
                >
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-sm font-semibold leading-6 text-[var(--foreground)]">{task.taskTitle}</h3>
                        {followUpMeta ? (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">
                            Follow-up
                          </span>
                        ) : null}
                        {continuationMeta ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">
                            Continued
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{task.departmentName}</p>
                    </div>

                    {taskDescription ? (
                      <p className="min-w-0 rounded-lg bg-white/60 px-2 py-1.5 text-xs leading-5 text-slate-600 transition-colors break-words">
                        {taskDescription}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-1 xl:justify-center">
                      <span
                        className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${getPriorityTone(task.priority)}`}
                      >
                        {formatPriority(task.priority)}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusMeta.chip}`}>
                        {statusMeta.label}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{formatPlannedTime(task)}</span>
                    </div>

                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-1 xl:min-w-[280px]">
                      <TaskTimerActionWrapper
                        task={task}
                        canEdit={canEdit}
                        afterDoneSlot={
                          <TaskManageControls
                            compact
                            hideDoneAction
                            task={{
                              id: task.id,
                              taskTitle: task.taskTitle,
                              taskDescription: task.taskDescription,
                              priority: task.priority as "low" | "normal" | "high" | "critical",
                            }}
                          />
                        }
                        onDoneClick={handleDoneClick}
                        onSnapshotChange={handleSnapshotChange}
                      />
                      <div className="flex items-center gap-1.5">
                        {task.assignedBy && task.userId === currentUserId ? (
                          <AssignmentReviewControls
                            latestReview={task.latestReview ?? null}
                            mode="assignee"
                            taskId={task.id}
                            taskTitle={task.taskTitle}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)] px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">
              No tasks added yet for today. Start by creating today&apos;s work plan.
            </div>
          )}
        </div>

        <div className="border-t border-[var(--panel-border)] px-5 py-3 text-center">
          <Link className="text-sm font-semibold text-[#4f5ef7] hover:text-[#3f4ede]" href="/dashboard/plan">
            View All Tasks
          </Link>
        </div>
      </div>

      <TaskCompleteModal
        onOpenChange={handleModalOpenChange}
        onSave={handleCompleteSave}
        open={Boolean(completeTaskId)}
        saving={savingCompletion}
        taskTitle={completingTask?.taskTitle ?? ""}
      />

      <TaskAutoStopNoteModal
        initialNote={activeAutoStopTask?.updates[0]?.note ?? ""}
        onOpenChange={(open) => {
          if (!open && activeAutoStopPrompt) {
            dismissAutoStopPrompt(activeAutoStopPrompt.taskId, activeAutoStopPrompt.reportDate);
          }
        }}
        onSave={handleAutoStopNoteSave}
        open={Boolean(activeAutoStopPrompt)}
        saving={savingAutoStopNote}
        stoppedAt={activeAutoStopPrompt?.actualEnd ?? ""}
        taskTitle={activeAutoStopTask?.taskTitle ?? "Stopped task"}
      />
    </>
  );
}
