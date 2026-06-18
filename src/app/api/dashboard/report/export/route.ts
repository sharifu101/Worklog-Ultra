import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth/server";
import { buildReportSummary } from "@/lib/report-summary";
import { getHistoryData } from "@/lib/worklog";
import { formatDateTimeInDhaka, formatMinutes, toDateOnly } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRangeDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00+06:00`));
}

function formatRangeLabel(from: string, to: string) {
  if (from === to) {
    return formatRangeDate(from);
  }

  return `${formatRangeDate(from)} to ${formatRangeDate(to)}`;
}

function statusLabel(status: "done" | "in_progress" | "pending") {
  if (status === "done") return "Completed";
  if (status === "in_progress") return "In Progress";
  return "Pending";
}

export async function GET(request: NextRequest) {
  const user = await requireEmployee();
  const requestedFrom = request.nextUrl.searchParams.get("from") || toDateOnly();
  const requestedTo = request.nextUrl.searchParams.get("to") || requestedFrom;
  const from = requestedFrom <= requestedTo ? requestedFrom : requestedTo;
  const to = requestedFrom <= requestedTo ? requestedTo : requestedFrom;
  const historyTasks = await getHistoryData(user.id, from, to);
  const summary = buildReportSummary(historyTasks);

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Worklog Report</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        background: #eef3ff;
        color: #14213d;
      }
      .page {
        max-width: 1080px;
        margin: 32px auto;
        background: #ffffff;
        border-radius: 28px;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(20, 33, 61, 0.12);
      }
      .hero {
        padding: 32px;
        background: linear-gradient(135deg, #102b4f 0%, #4f5ef7 100%);
        color: #ffffff;
      }
      .hero-grid {
        display: grid;
        grid-template-columns: 1.6fr 1fr;
        gap: 24px;
      }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        opacity: 0.8;
      }
      h1 {
        margin: 10px 0 8px;
        font-size: 34px;
      }
      .hero p {
        margin: 0;
        line-height: 1.6;
      }
      .hero-card {
        padding: 18px 20px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.12);
      }
      .hero-card strong {
        display: block;
        margin-top: 8px;
        font-size: 20px;
      }
      .content {
        padding: 28px 32px 36px;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 24px;
      }
      .stat {
        padding: 18px;
        border: 1px solid #dbe4ff;
        border-radius: 20px;
        background: #f8faff;
      }
      .stat-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: #64748b;
      }
      .stat-value {
        margin-top: 10px;
        font-size: 28px;
        font-weight: 700;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #dbe4ff;
        border-radius: 20px;
        overflow: hidden;
      }
      thead {
        background: #f2f6ff;
      }
      th,
      td {
        padding: 14px 16px;
        text-align: left;
        vertical-align: top;
        border-bottom: 1px solid #e8eefc;
      }
      th {
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #64748b;
      }
      td {
        font-size: 14px;
      }
      .task-title {
        font-weight: 700;
        color: #14213d;
      }
      .task-meta {
        margin-top: 6px;
        color: #64748b;
        line-height: 1.5;
      }
      .status {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
      }
      .status-done {
        background: #e8fff3;
        color: #0f8f68;
      }
      .status-in_progress {
        background: #edf4ff;
        color: #295fd6;
      }
      .status-pending {
        background: #fff7e8;
        color: #b7791f;
      }
      .footer {
        margin-top: 20px;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        color: #64748b;
        font-size: 13px;
      }
      @media print {
        body {
          background: #ffffff;
        }
        .page {
          margin: 0;
          box-shadow: none;
          border-radius: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <section class="hero">
        <div class="hero-grid">
          <div>
            <div class="eyebrow">WorkLog Ultra</div>
            <h1>Employee Work Report</h1>
            <p>${escapeHtml(user.name)} • ${escapeHtml(user.designation ?? user.role)}</p>
            <p>${escapeHtml(formatRangeLabel(from, to))}</p>
          </div>
          <div class="hero-card">
            <div class="eyebrow">Generated</div>
            <strong>${escapeHtml(formatDateTimeInDhaka(new Date()))}</strong>
            <p style="margin-top: 10px;">This file is ready to keep, share, or print like an invoice-style activity statement.</p>
          </div>
        </div>
      </section>

      <section class="content">
        <div class="stats">
          <div class="stat">
            <div class="stat-label">Total Tasks</div>
            <div class="stat-value">${summary.totals.totalTasks}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Completed</div>
            <div class="stat-value">${summary.totals.completedTasks}</div>
          </div>
          <div class="stat">
            <div class="stat-label">In Progress</div>
            <div class="stat-value">${summary.totals.inProgressTasks}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Tracked Time</div>
            <div class="stat-value">${escapeHtml(summary.totals.totalTrackedLabel)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Task Details</th>
              <th>Status</th>
              <th>Time</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            ${
              summary.items.length
                ? summary.items
                    .map(
                      (item) => `<tr>
                <td>${escapeHtml(item.date)}</td>
                <td>
                  <div class="task-title">${escapeHtml(item.title)}</div>
                  <div class="task-meta">${escapeHtml(item.departmentName)}</div>
                  ${
                    item.description
                      ? `<div class="task-meta">${escapeHtml(item.description)}</div>`
                      : item.note
                        ? `<div class="task-meta">${escapeHtml(item.note)}</div>`
                        : ""
                  }
                </td>
                <td><span class="status status-${item.status}">${escapeHtml(statusLabel(item.status))}</span></td>
                <td>${escapeHtml(formatMinutes(item.trackedMinutes))}</td>
                <td>${item.completionPercent}%</td>
              </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="5">No report data found for the selected date range.</td></tr>`
            }
          </tbody>
        </table>

        <div class="footer">
          <span>Range: ${escapeHtml(formatRangeLabel(from, to))}</span>
          <span>Generated from WorkLog Ultra</span>
        </div>
      </section>
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="worklog-report-${from}-to-${to}.html"`,
    },
  });
}
