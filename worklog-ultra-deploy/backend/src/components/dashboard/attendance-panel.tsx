"use client";

import { Clock3, LogIn, LogOut, TimerReset } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDateOnly, toDateTimeInputValue } from "@/lib/utils";

type AttendanceItem = {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  departmentName: string;
  attendance: {
    id: string;
    status: "present" | "late" | "half_day" | "absent" | "remote";
    checkInAt: Date | null;
    checkOutAt: Date | null;
    breakMinutes: number;
    workingMinutes: number;
    note: string | null;
  } | null;
};

type AttendanceStatusValue = "present" | "late" | "half_day" | "absent" | "remote";

export function AttendancePanel({
  userRole,
  currentUserId,
  items,
}: {
  userRole: "employee" | "hr" | "manager" | "admin";
  currentUserId: string;
  items: AttendanceItem[];
}) {
  const router = useRouter();
  const me = items.find((item) => item.userId === currentUserId);
  const [status, setStatus] = useState<AttendanceStatusValue>(me?.attendance?.status ?? "present");
  const [checkInAt, setCheckInAt] = useState(me?.attendance?.checkInAt ? toDateTimeInputValue(me.attendance.checkInAt) : "");
  const [checkOutAt, setCheckOutAt] = useState(me?.attendance?.checkOutAt ? toDateTimeInputValue(me.attendance.checkOutAt) : "");
  const [breakMinutes, setBreakMinutes] = useState(String(me?.attendance?.breakMinutes ?? 0));
  const [note, setNote] = useState(me?.attendance?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);

  async function saveAttendance(next: {
    nextStatus?: AttendanceStatusValue;
    nextCheckIn?: string;
    nextCheckOut?: string;
  } = {}) {
    setSaving(true);
    const response = await fetch("/api/dashboard/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendanceDate: toDateOnly(),
        status: next.nextStatus ?? status,
        note,
        checkInAt: next.nextCheckIn ?? checkInAt,
        checkOutAt: next.nextCheckOut ?? checkOutAt,
        breakMinutes,
      }),
    });

    const raw = await response.text();
    const result = raw ? JSON.parse(raw) : { message: "Attendance update failed." };
    setSaving(false);

    if (!response.ok) {
      toast.error(result.message);
      return;
    }

    if (next.nextStatus) setStatus(next.nextStatus);
    if (next.nextCheckIn !== undefined) setCheckInAt(next.nextCheckIn);
    if (next.nextCheckOut !== undefined) setCheckOutAt(next.nextCheckOut);
    toast.success(result.message);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Break Minutes</Label>
                <Input min="0" onChange={(event) => setBreakMinutes(event.target.value)} type="number" value={breakMinutes} />
              </div>
              <div>
                <Label>Check In</Label>
                <Input onChange={(event) => setCheckInAt(event.target.value)} type="datetime-local" value={checkInAt} />
              </div>
              <div>
                <Label>Check Out</Label>
                <Input onChange={(event) => setCheckOutAt(event.target.value)} type="datetime-local" value={checkOutAt} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 xl:flex-col">
              <Button disabled={saving} onClick={() => saveAttendance({ nextStatus: "present", nextCheckIn: toDateTimeInputValue() })} type="button">
                <LogIn className="h-4 w-4" /> Check In
              </Button>
              <Button disabled={saving} onClick={() => saveAttendance({ nextCheckOut: toDateTimeInputValue() })} type="button" variant="secondary">
                <LogOut className="h-4 w-4" /> Check Out
              </Button>
              <Button
                disabled={saving}
                onClick={() => {
                  setCheckInAt("");
                  setCheckOutAt("");
                  setBreakMinutes("0");
                  setStatus("present");
                }}
                type="button"
                variant="ghost"
              >
                <TimerReset className="h-4 w-4" /> Reset Draft
              </Button>
            </div>
          </div>
          <div>
            <Label>Attendance Note</Label>
            <Textarea onChange={(event) => setNote(event.target.value)} placeholder="Optional attendance note for today." value={note} />
          </div>
          <Button className="w-full" disabled={saving} onClick={() => saveAttendance()} type="button">
            {saving ? "Saving attendance..." : "Save Attendance"}
          </Button>
        </CardContent>
      </Card>

      {userRole !== "employee" ? (
        <Card>
          <CardHeader>
            <CardTitle>Team Attendance Today</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 xl:grid-cols-2">
            {items.map((item) => (
              <div key={item.userId} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{item.departmentName}</p>
                  </div>
                  <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
                    {item.attendance?.status ?? "missing"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[var(--muted-foreground)] md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em]">In</p>
                    <p className="mt-1 text-white">{item.attendance?.checkInAt ? toDateTimeInputValue(item.attendance.checkInAt).replace("T", " ") : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em]">Out</p>
                    <p className="mt-1 text-white">{item.attendance?.checkOutAt ? toDateTimeInputValue(item.attendance.checkOutAt).replace("T", " ") : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em]">Worked</p>
                    <p className="mt-1 text-white">{item.attendance ? `${item.attendance.workingMinutes} min` : "0 min"}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Reminder Automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--muted-foreground)]">
          Morning reminder logic now supports attendance and work plan follow-up, and evening reminder logic supports pending report follow-up. Trigger the automation route
          <span className="mx-1 rounded bg-[var(--panel-muted)] px-2 py-1 font-mono text-cyan-300">POST /api/automation/reminders</span>
          from cron or your scheduler to send smart email reminders automatically.
          {userRole !== "employee" ? (
            <div>
              <Button
                disabled={triggering}
                onClick={async () => {
                  setTriggering(true);
                  const response = await fetch("/api/automation/reminders", { method: "POST" });
                  const raw = await response.text();
                  const result = raw ? JSON.parse(raw) : { message: "Reminder run failed." };
                  setTriggering(false);
                  if (!response.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success(result.message);
                }}
                type="button"
                variant="secondary"
              >
                <Clock3 className="h-4 w-4" /> {triggering ? "Sending reminders..." : "Run Reminder Emails"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
