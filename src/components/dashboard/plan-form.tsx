"use client";

import { ChevronDown, ChevronUp, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OTHER_DEPARTMENT_ID } from "@/lib/recurring-task-templates";
import { CONTINUATION_MARKER, stripContinuationMeta } from "@/lib/task-continuation";
import { toDateOnly } from "@/lib/utils";

type Department = { id: string; name: string };
type AssignableUser = {
  id: string;
  name: string;
  role: string;
  designation: string | null;
  departmentId: string | null;
  departmentName: string;
};
type Suggestion = {
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "critical";
  source: string;
};
type Task = {
  id?: string;
  clientId: string;
  taskTitle: string;
  taskDescription: string;
  priority: string;
  departmentId: string;
  assigneeId: string;
};

type DraftSnapshot = {
  tasks: Task[];
};

function normalizeTaskTitle(value: string) {
  return value.trim().toLowerCase();
}

function makeTask(defaultDepartmentId: string, defaultAssigneeId: string) {
  return {
    clientId: crypto.randomUUID(),
    taskTitle: "",
    taskDescription: "",
    priority: "normal",
    departmentId: defaultDepartmentId,
    assigneeId: defaultAssigneeId,
  };
}

function makeBlankTaskLike(task: Task, fallbackDepartmentId: string, fallbackAssigneeId: string) {
  return makeTask(task.departmentId || fallbackDepartmentId, task.assigneeId || fallbackAssigneeId);
}

function stripAutoDescriptionText(description?: string | null) {
  return stripContinuationMeta(description)
    .replace(/^Predicted from your work pattern and completion history\.?\s*/i, "")
    .trim();
}

function mergeDescriptionWithContinuationMeta(originalDescription: string, nextDescription: string) {
  const markerIndex = originalDescription.indexOf(CONTINUATION_MARKER);

  if (markerIndex === -1) {
    return nextDescription;
  }

  const continuationMeta = originalDescription.slice(markerIndex).trim();
  return [nextDescription.trim(), continuationMeta].filter(Boolean).join("\n\n").trim();
}

export function PlanForm({
  departments = [],
  initialTasks = [],
  suggestions = [],
  userDepartmentId,
  role,
  assignableUsers = [],
  currentUserId,
  clearDraftOnMount = false,
  onSaved,
}: {
  departments: Department[];
  initialTasks: Omit<Task, "clientId">[];
  suggestions: Suggestion[];
  userDepartmentId?: string | null;
  role: "employee" | "hr" | "manager" | "admin";
  assignableUsers: AssignableUser[];
  currentUserId: string;
  clearDraftOnMount?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const fallbackDepartmentId = userDepartmentId || departments[0]?.id || "";
  const fallbackAssigneeId = currentUserId;
  const validInitialTaskIds = useMemo(
    () => new Set((initialTasks ?? []).map((task) => task.id).filter(Boolean)),
    [initialTasks],
  );
  const planDraftStorageKey = useMemo(() => `worklog-plan-draft:${currentUserId}:${toDateOnly()}`, [currentUserId]);
  const serverTasks = useMemo(
    () =>
      (initialTasks ?? []).length
        ? (initialTasks ?? []).map((task) => ({
            clientId: crypto.randomUUID(),
            ...task,
          }))
        : [makeTask(fallbackDepartmentId, fallbackAssigneeId)],
    [fallbackAssigneeId, fallbackDepartmentId, initialTasks],
  );
  const [tasks, setTasks] = useState<Task[]>(() => serverTasks);
  const [loading, setLoading] = useState(false);
  const [lastSuggestedTitle, setLastSuggestedTitle] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const activeDepartmentId = useMemo(
    () => tasks[0]?.departmentId || fallbackDepartmentId,
    [fallbackDepartmentId, tasks],
  );
  const activeDepartmentName =
    departments.find((department) => department.id === activeDepartmentId)?.name ?? "your department";
  const allowOtherDepartment = role === "admin";

  useEffect(() => {
    if (!clearDraftOnMount || typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(planDraftStorageKey);
    setTasks([makeTask(fallbackDepartmentId, fallbackAssigneeId)]);
  }, [clearDraftOnMount, fallbackAssigneeId, fallbackDepartmentId, planDraftStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || clearDraftOnMount) {
      return;
    }

    const raw = window.localStorage.getItem(planDraftStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as DraftSnapshot;
      const validDraftTasks = (parsed.tasks ?? []).filter((task) => !task.id || validInitialTaskIds.has(task.id));

      if (!validDraftTasks.length) {
        return;
      }

      setTasks(validDraftTasks);
    } catch {
      window.localStorage.removeItem(planDraftStorageKey);
      setTasks(serverTasks);
    }
  }, [clearDraftOnMount, planDraftStorageKey, serverTasks, validInitialTaskIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      planDraftStorageKey,
      JSON.stringify({
        tasks,
      } satisfies DraftSnapshot),
    );
  }, [planDraftStorageKey, tasks]);

  function updateTask(index: number, key: keyof Task, value: string) {
    setTasks((current) =>
      current.map((task, taskIndex) => (taskIndex === index ? { ...task, [key]: value } : task)),
    );
  }

  function firstBlankTaskIndex(source: Task[]) {
    return source.findIndex(
      (task) => !task.taskTitle.trim() && !task.taskDescription.trim() && task.priority === "normal",
    );
  }

  function addBlankTask() {
    setTasks((current) => [
      makeTask(current[0]?.departmentId || fallbackDepartmentId, current[0]?.assigneeId || fallbackAssigneeId),
      ...current,
    ]);
  }

  function removeTask(index: number) {
    setTasks((current) => current.filter((_, taskIndex) => taskIndex !== index));
  }

  function removeTaskFromDraft(task: Task) {
    setTasks((current) => {
      const filtered = current.filter(
        (item) => item.clientId !== task.clientId && (!task.id || item.id !== task.id),
      );

      return filtered.length ? filtered : [makeBlankTaskLike(task, fallbackDepartmentId, fallbackAssigneeId)];
    });
  }

  function addSuggestedTask(suggestion: Suggestion) {
    const normalizedSuggestionTitle = normalizeTaskTitle(suggestion.title);

    if (tasks.some((task) => normalizeTaskTitle(task.taskTitle) === normalizedSuggestionTitle)) {
      toast.error("This task is already in today's plan.");
      return;
    }

    setTasks((current) => {
      const blankIndex = firstBlankTaskIndex(current);

      if (blankIndex !== -1) {
        return current.map((task, index) =>
          index === blankIndex
            ? {
                ...task,
                taskTitle: suggestion.title,
                taskDescription: suggestion.description,
                priority: suggestion.priority,
              }
            : task,
        );
      }

      return [
        {
          clientId: crypto.randomUUID(),
          taskTitle: suggestion.title,
          taskDescription: suggestion.description,
          priority: suggestion.priority,
          departmentId: current[0]?.departmentId || fallbackDepartmentId,
          assigneeId: current[0]?.assigneeId || fallbackAssigneeId,
        },
        ...current,
      ];
    });
    setLastSuggestedTitle(suggestion.title);
    toast.success(`Suggestion loaded for edit: ${suggestion.title}`);
  }

  async function save() {
    const normalizedTitles = tasks.map((task) => normalizeTaskTitle(task.taskTitle)).filter(Boolean);
    if (normalizedTitles.length !== new Set(normalizedTitles).size) {
      toast.error("Same task was added more than once. Remove the duplicate task first.");
      return;
    }

    const tasksToCreate = tasks.filter((task) => !task.id);

    if (!tasksToCreate.length) {
      toast.success("These tasks are already in today's plan.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/dashboard/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planDate: new Date().toISOString(),
        tasks: tasksToCreate.map((task) => ({
          taskTitle: task.taskTitle,
          taskDescription: task.taskDescription,
          priority: task.priority,
          departmentId: task.departmentId,
          assigneeId: task.assigneeId,
        })),
      }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    tasksToCreate.forEach((task) => removeTaskFromDraft(task));
    setTasks([makeTask(fallbackDepartmentId, fallbackAssigneeId)]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(planDraftStorageKey);
    }
    router.refresh();
    onSaved?.();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WandSparkles className="h-5 w-5 text-cyan-300" />
                Suggested Tasks For {activeDepartmentName}
              </CardTitle>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Smart ideas for your department. Expand only when you want quick task suggestions.
              </p>
            </div>
            <Button
              className={showSuggestions ? "button-force-white bg-[#4f5ef7] hover:bg-[#4453eb]" : undefined}
              onClick={() => setShowSuggestions((current) => !current)}
              type="button"
              variant={showSuggestions ? "default" : "secondary"}
            >
              {showSuggestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showSuggestions ? "Hide Suggestions" : "Suggest Work"}
            </Button>
          </div>
        </CardHeader>
        {showSuggestions ? (
          <CardContent>
            <div className="mb-4 flex justify-end">
              <Button
                aria-label="Collapse suggested tasks"
                className="h-10 w-10 rounded-xl"
                onClick={() => setShowSuggestions(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {suggestions.length ? (
                (suggestions ?? []).map((suggestion) => (
                  <button
                    key={`${suggestion.source}-${suggestion.title}`}
                    className="cursor-pointer rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-[var(--panel)] hover:shadow-[0_14px_28px_rgba(34,211,238,0.12)]"
                    onClick={() => addSuggestedTask(suggestion)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{suggestion.title}</p>
                        <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{suggestion.description}</p>
                      </div>
                      <Sparkles className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 font-medium uppercase tracking-[0.18em] text-cyan-300">
                          {suggestion.priority}
                        </span>
                        {lastSuggestedTitle === suggestion.title ? (
                          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 font-medium text-emerald-300">
                            Loaded for edit
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--panel)] px-2.5 py-1 font-medium text-[var(--muted-foreground)]">
                            Load to edit
                          </span>
                        )}
                      </div>
                      <span className="text-[var(--muted-foreground)]">{suggestion.source}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)] p-5 text-sm text-[var(--muted-foreground)]">
                  No smart suggestion found yet. Save a few daily plans and this panel will start predicting stronger quick tasks for your department.
                </div>
              )}
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Morning Work Plan</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Add your tasks here first. After saving, start time from the dashboard.
            </p>
          </div>
          <Button
            className="button-force-white bg-[#4f5ef7] hover:bg-[#4453eb]"
            onClick={addBlankTask}
            type="button"
            variant="default"
          >
            New Task
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(tasks ?? []).map((task, index) => (
            <div key={task.clientId} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Task {index + 1}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Fill this task, or add another one below if needed.</p>
                </div>
                {tasks.length > 1 ? (
                  <Button
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => removeTask(index)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Task Title</Label>
                  <Input
                    onChange={(event) => updateTask(index, "taskTitle", event.target.value)}
                    placeholder="Enter task title"
                    value={task.taskTitle}
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={task.departmentId} onValueChange={(value) => updateTask(index, "departmentId", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowOtherDepartment ? <SelectItem value={OTHER_DEPARTMENT_ID}>Other</SelectItem> : null}
                      {(departments ?? []).map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={task.priority} onValueChange={(value) => updateTask(index, "priority", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["low", "normal", "high", "critical"].map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <Label>Description</Label>
                <Textarea
                  onChange={(event) =>
                    updateTask(
                      index,
                      "taskDescription",
                      mergeDescriptionWithContinuationMeta(task.taskDescription, event.target.value),
                    )
                  }
                  placeholder="Add a short task description"
                  value={stripAutoDescriptionText(task.taskDescription)}
                />
              </div>
            </div>
          ))}

          <Button className="button-force-white w-full" disabled={loading} onClick={save} type="button">
            {loading ? "Saving plan..." : "Add To Today's Plan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
