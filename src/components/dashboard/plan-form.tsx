"use client";

import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Department = { id: string; name: string };
type Suggestion = {
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "critical";
  source: string;
};
type Task = { clientId: string; taskTitle: string; taskDescription: string; priority: string; departmentId: string };

function makeTask(defaultDepartmentId: string) {
  return {
    clientId: crypto.randomUUID(),
    taskTitle: "",
    taskDescription: "",
    priority: "normal",
    departmentId: defaultDepartmentId,
  };
}

export function PlanForm({
  departments,
  suggestions,
  userDepartmentId,
  role,
}: {
  departments: Department[];
  initialTasks: Omit<Task, "clientId">[];
  suggestions: Suggestion[];
  userDepartmentId?: string | null;
  role: "employee" | "hr" | "manager" | "admin";
}) {
  const router = useRouter();
  const fallbackDepartmentId = userDepartmentId || departments[0]?.id || "";
  const [tasks, setTasks] = useState<Task[]>([makeTask(fallbackDepartmentId)]);
  const [loading, setLoading] = useState(false);
  const [lastSuggestedTitle, setLastSuggestedTitle] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const activeDepartmentId = useMemo(
    () => tasks[0]?.departmentId || fallbackDepartmentId,
    [fallbackDepartmentId, tasks],
  );
  const activeDepartmentName = departments.find((department) => department.id === activeDepartmentId)?.name ?? "your department";
  const lockDepartment = role === "employee" && Boolean(userDepartmentId);

  function updateTask(index: number, key: keyof Task, value: string) {
    setTasks((current) =>
      current.map((task, taskIndex) => (taskIndex === index ? { ...task, [key]: value } : task)),
    );
  }

  function addBlankTask() {
    setTasks((current) => [...current, makeTask(current[0]?.departmentId || fallbackDepartmentId)]);
  }

  function addSuggestedTask(suggestion: Suggestion) {
    setTasks((current) => [
      ...current,
      {
        clientId: crypto.randomUUID(),
        taskTitle: suggestion.title,
        taskDescription: suggestion.description,
        priority: suggestion.priority,
        departmentId: current[0]?.departmentId || fallbackDepartmentId,
      },
    ]);
    setLastSuggestedTitle(suggestion.title);
    toast.success(`Added to editable plan form: ${suggestion.title}`);
  }

  async function save() {
    setLoading(true);
    const response = await fetch("/api/dashboard/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planDate: new Date().toISOString(),
        tasks: tasks.map((task) => ({
          taskTitle: task.taskTitle,
          taskDescription: task.taskDescription,
          priority: task.priority,
          departmentId: task.departmentId,
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
    setTasks([makeTask(fallbackDepartmentId)]);
    router.refresh();
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
            <Button onClick={() => setShowSuggestions((current) => !current)} type="button" variant="secondary">
              {showSuggestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showSuggestions ? "Collapse" : "Expand"}
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
                suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.source}-${suggestion.title}`}
                    className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 text-left transition-colors hover:border-cyan-400/40 hover:bg-[var(--panel)]"
                    onClick={() => addSuggestedTask(suggestion)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{suggestion.title}</p>
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
                            Added below
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/5 px-2.5 py-1 font-medium text-white/80">
                            Click to add
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
              Your department is auto-selected from account information, but you can still change it for any task.
            </p>
          </div>
          <Button onClick={addBlankTask} type="button" variant="secondary">
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task, index) => (
            <div key={task.clientId} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Task Title</Label>
                  <Input
                    placeholder="Enter task title"
                    value={task.taskTitle}
                    onChange={(event) => updateTask(index, "taskTitle", event.target.value)}
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  {lockDepartment ? (
                    <div className="flex h-11 items-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 text-sm text-white">
                      {departments.find((department) => department.id === task.departmentId)?.name ?? activeDepartmentName}
                    </div>
                  ) : (
                    <Select value={task.departmentId} onValueChange={(value) => updateTask(index, "departmentId", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                <div className="flex items-end justify-end">
                  <Button
                    onClick={() => setTasks((current) => current.filter((_, taskIndex) => taskIndex !== index))}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <Label>Description</Label>
                <Textarea
                  placeholder="Add a short task description"
                  value={task.taskDescription}
                  onChange={(event) => updateTask(index, "taskDescription", event.target.value)}
                />
              </div>
            </div>
          ))}
          <Button className="w-full" disabled={loading} onClick={save} type="button">
            {loading ? "Saving plan..." : "Add To Today's Plan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
