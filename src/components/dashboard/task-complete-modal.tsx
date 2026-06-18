"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDateOnly } from "@/lib/utils";

export type TaskCompletionPayload = {
  completionStatus: "done" | "partial";
  completionNote: string;
  needFollowUp: boolean;
  followUpDate: string;
  followUpTime: string;
  followUpNote: string;
};

type TaskCompleteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  saving?: boolean;
  onSave: (payload: TaskCompletionPayload) => Promise<void>;
};

export function TaskCompleteModal({
  open,
  onOpenChange,
  taskTitle,
  saving = false,
  onSave,
}: TaskCompleteModalProps) {
  const [completionStatus, setCompletionStatus] = useState<"done" | "partial">("done");
  const [completionNote, setCompletionNote] = useState("");
  const [needFollowUp, setNeedFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("10:00");
  const [followUpNote, setFollowUpNote] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setCompletionStatus("done");
    setCompletionNote("");
    setNeedFollowUp(false);
    setFollowUpDate("");
    setFollowUpTime("10:00");
    setFollowUpNote("");
  }, [open, taskTitle]);

  const showFollowUpFields = needFollowUp || completionStatus === "partial";

  async function handleSave() {
    if (showFollowUpFields && (!followUpDate || !followUpTime)) {
      return;
    }

    await onSave({
      completionStatus,
      completionNote: completionNote.trim(),
      needFollowUp: showFollowUpFields,
      followUpDate,
      followUpTime,
      followUpNote: followUpNote.trim(),
    });
  }

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] px-6 py-5">
            <div>
              <Dialog.Title className="text-xl font-semibold text-[var(--foreground)]">Complete Task</Dialog.Title>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{taskTitle}</p>
            </div>
            <Dialog.Close asChild>
              <Button disabled={saving} size="icon" type="button" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-5 px-6 py-6">
            <div>
              <Label className="mb-2 block">Task completion status</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    completionStatus === "done"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--foreground)] hover:border-emerald-200"
                  }`}
                  onClick={() => setCompletionStatus("done")}
                  type="button"
                >
                  Done / Fully Completed
                </button>
                <button
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    completionStatus === "partial"
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--foreground)] hover:border-amber-200"
                  }`}
                  onClick={() => {
                    setCompletionStatus("partial");
                    setNeedFollowUp(true);
                    if (!followUpDate) {
                      setFollowUpDate(toDateOnly());
                    }
                  }}
                  type="button"
                >
                  Partially Done / Need Follow-up
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="completion-note">Completion note</Label>
              <Textarea
                id="completion-note"
                onChange={(event) => setCompletionNote(event.target.value)}
                placeholder="Add any notes about what was completed..."
                rows={4}
                value={completionNote}
              />
            </div>

            {completionStatus === "done" ? (
              <div>
                <Label className="mb-2 block">Need to work on this again?</Label>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      needFollowUp
                        ? "border-[#4f5ef7] bg-[#eef2ff] text-[#3148d8]"
                        : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--foreground)]"
                    }`}
                    onClick={() => setNeedFollowUp(true)}
                    type="button"
                  >
                    Yes
                  </button>
                  <button
                    className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      !needFollowUp
                        ? "border-slate-300 bg-slate-100 text-slate-800"
                        : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--foreground)]"
                    }`}
                    onClick={() => setNeedFollowUp(false)}
                    type="button"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : null}

            {showFollowUpFields ? (
              <div className="space-y-4 rounded-2xl border border-[#dbe4ff] bg-[#f8faff] p-4">
                <p className="text-sm font-semibold text-[#3148d8]">Follow-up reminder</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="follow-up-date">Follow-up date</Label>
                    <Input
                      id="follow-up-date"
                      min={toDateOnly()}
                      onChange={(event) => setFollowUpDate(event.target.value)}
                      type="date"
                      value={followUpDate}
                    />
                  </div>
                  <div>
                    <Label htmlFor="follow-up-time">Follow-up time</Label>
                    <Input
                      id="follow-up-time"
                      onChange={(event) => setFollowUpTime(event.target.value)}
                      type="time"
                      value={followUpTime}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="follow-up-note">Reminder note (optional)</Label>
                  <Textarea
                    id="follow-up-note"
                    onChange={(event) => setFollowUpNote(event.target.value)}
                    placeholder="What should you remember for the follow-up?"
                    rows={3}
                    value={followUpNote}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--panel-border)] px-6 py-5">
            <Dialog.Close asChild>
              <Button disabled={saving} type="button" variant="outline">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              className="button-force-white"
              disabled={saving || (showFollowUpFields && (!followUpDate || !followUpTime))}
              onClick={handleSave}
              type="button"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
