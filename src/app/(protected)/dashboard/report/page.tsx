import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEmployee } from "@/lib/auth/server";
import { buildReportSummary } from "@/lib/report-summary";
import { getHistoryData } from "@/lib/worklog";
import { formatMinutes, toDateOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";

function normalizeDateParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return normalizeDateParam(value[0]);
  }

  if (!value) {
    return null;
  }

  const normalized = toDateOnly(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function formatRangeDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00+06:00`));
}

function formatRangeLabel(from: string, to: string) {
  if (from === to) {
    return formatRangeDate(from);
  }

  return `${formatRangeDate(from)} to ${formatRangeDate(to)}`;
}

function statusTone(status: "done" | "in_progress" | "pending") {
  if (status === "done") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "in_progress") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

function statusLabel(status: "done" | "in_progress" | "pending") {
  if (status === "done") return "Completed";
  if (status === "in_progress") return "In Progress";
  return "Pending";
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string | string[];
    from?: string | string[];
    to?: string | string[];
    taskId?: string | string[];
  }>;
}) {
  const user = await requireEmployee();
  const { date, from, to, taskId } = await searchParams;

  const selectedDate = normalizeDateParam(date) ?? toDateOnly();
  const requestedFrom = normalizeDateParam(from) ?? selectedDate;
  const requestedTo = normalizeDateParam(to) ?? selectedDate;
  const exactDateView = Boolean(taskId) || (!from && !to);
  const focusedFrom = exactDateView ? selectedDate : requestedFrom;
  const focusedTo = exactDateView ? selectedDate : requestedTo;

  const rangeFrom = focusedFrom <= focusedTo ? focusedFrom : focusedTo;
  const rangeTo = focusedFrom <= focusedTo ? focusedTo : focusedFrom;
  const historyTasks = await getHistoryData(user.id, rangeFrom, rangeTo);
  const summary = buildReportSummary(historyTasks);
  const downloadHref = `/api/dashboard/report/export?from=${encodeURIComponent(rangeFrom)}&to=${encodeURIComponent(rangeTo)}`;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Downloadable Work Report</CardTitle>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Range: {formatRangeLabel(rangeFrom, rangeTo)}
            </p>
          </div>
          <form
            action="/dashboard/report"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_160px_auto_auto]"
            method="get"
          >
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                From
              </label>
              <input
                className="h-11 w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 text-sm text-[var(--foreground)] outline-none"
                defaultValue={rangeFrom}
                name="from"
                type="date"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                To
              </label>
              <input
                className="h-11 w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 text-sm text-[var(--foreground)] outline-none"
                defaultValue={rangeTo}
                name="to"
                type="date"
              />
            </div>
            <button
              className="button-force-white h-11 rounded-2xl bg-[#4f5ef7] px-4 text-sm font-semibold text-white"
              type="submit"
            >
              View Report
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 text-sm font-semibold text-[var(--foreground)]"
              href={downloadHref}
            >
              Download
            </Link>
          </form>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Tasks</p>
              <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{summary.totals.totalTasks}</p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Completed</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{summary.totals.completedTasks}</p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">In Progress</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">{summary.totals.inProgressTasks}</p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Tracked Time</p>
              <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{summary.totals.totalTrackedLabel}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[var(--panel-border)]">
            <div className="grid grid-cols-[120px_minmax(0,1.2fr)_120px_120px] gap-3 bg-[var(--panel-muted)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              <span>Date</span>
              <span>Task</span>
              <span>Status</span>
              <span>Time</span>
            </div>
            <div className="divide-y divide-[var(--panel-border)]">
              {summary.items.length ? (
                summary.items.map((item) => (
                  <div className="grid grid-cols-[120px_minmax(0,1.2fr)_120px_120px] gap-3 px-4 py-3" key={item.id}>
                    <p className="text-sm font-medium text-[var(--muted-foreground)]">{item.date}</p>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                      <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                        {[item.departmentName, item.description || item.note || "No extra details"].join(" • ")}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{formatMinutes(item.trackedMinutes)}</p>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                No report data found for the selected date range.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
