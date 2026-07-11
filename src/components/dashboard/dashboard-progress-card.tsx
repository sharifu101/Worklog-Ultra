"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type DashboardStats = {
  plannedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
};

export function DashboardProgressCard({
  plannedTasks: initialPlannedTasks,
  completedTasks: initialCompletedTasks,
  inProgressTasks: initialInProgressTasks,
  pendingTasks: initialPendingTasks,
}: {
  plannedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
}) {
  const [stats, setStats] = useState<DashboardStats>({
    plannedTasks: initialPlannedTasks,
    completedTasks: initialCompletedTasks,
    inProgressTasks: initialInProgressTasks,
    pendingTasks: initialPendingTasks,
  });

  useEffect(() => {
    setStats({
      plannedTasks: initialPlannedTasks,
      completedTasks: initialCompletedTasks,
      inProgressTasks: initialInProgressTasks,
      pendingTasks: initialPendingTasks,
    });
  }, [initialCompletedTasks, initialInProgressTasks, initialPendingTasks, initialPlannedTasks]);

  useEffect(() => {
    function handleStatsUpdated(event: Event) {
      const detail = (event as CustomEvent<DashboardStats>).detail;
      if (!detail) {
        return;
      }

      setStats(detail);
    }

    window.addEventListener("dashboard:stats-updated", handleStatsUpdated);
    return () => window.removeEventListener("dashboard:stats-updated", handleStatsUpdated);
  }, []);

  const { plannedTasks, completedTasks, inProgressTasks, pendingTasks } = stats;
  const items = [
    { label: "Completed", value: completedTasks, color: "bg-emerald-500" },
    { label: "In Progress", value: inProgressTasks, color: "bg-blue-500" },
    { label: "Pending", value: pendingTasks, color: "bg-amber-400" },
  ];
  const totalTasks = Math.max(plannedTasks, completedTasks + inProgressTasks + pendingTasks);
  const completedDegrees = totalTasks ? (completedTasks / totalTasks) * 360 : 0;
  const inProgressDegrees = totalTasks ? (inProgressTasks / totalTasks) * 360 : 0;
  const pendingDegrees = Math.max(0, 360 - completedDegrees - inProgressDegrees);
  const ringBackground =
    totalTasks > 0
      ? `conic-gradient(#34c38f 0deg ${completedDegrees}deg, #3b82f6 ${completedDegrees}deg ${completedDegrees + inProgressDegrees}deg, #fbbf24 ${completedDegrees + inProgressDegrees}deg ${completedDegrees + inProgressDegrees + pendingDegrees}deg, #e8eef8 ${completedDegrees + inProgressDegrees + pendingDegrees}deg 360deg)`
      : "conic-gradient(#e8eef8 0deg 360deg)";

  return (
    <motion.div
      className="rounded-[22px] border border-[var(--panel-border)] bg-[var(--panel)] p-3.5 sm:p-4 shadow-[var(--shadow)]"
      data-dashboard-panel
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      whileHover={{ y: -3, boxShadow: "0 24px 52px rgba(87, 113, 150, 0.18)" }}
    >
      <h3 className="text-[1rem] font-bold text-[var(--foreground)] sm:text-[1.05rem]">Today&apos;s Progress</h3>
      <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:gap-4">
        <motion.div
          className="dashboard-progress-ring mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-full sm:h-28 sm:w-28 2xl:mx-0"
          key={`${plannedTasks}-${completedTasks}-${inProgressTasks}-${pendingTasks}`}
          layout
          transition={{ duration: 0.42, ease: "easeOut" }}
          style={{ background: ringBackground }}
        >
          <div className="flex h-[66px] w-[66px] flex-col items-center justify-center rounded-full bg-[var(--panel)] sm:h-[76px] sm:w-[76px]">
            <motion.p
              className="text-[1.45rem] font-bold leading-none text-[var(--foreground)] sm:text-[1.8rem]"
              key={plannedTasks}
              initial={{ opacity: 0.45, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.26 }}
            >
              {plannedTasks}
            </motion.p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)] sm:text-xs">Total Tasks</p>
          </div>
        </motion.div>
        <div className="min-w-0 flex-1 space-y-2">
          {items.map((item) => (
            <motion.div
              className="grid grid-cols-1 gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-2 text-[0.84rem] sm:text-sm"
              key={`${item.label}-${item.value}`}
              layout
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.24 }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3 ${item.color}`} />
                <span className="min-w-0 font-medium leading-snug text-[var(--muted-foreground)]">{item.label}</span>
              </div>
              <span className="pl-4 text-left font-semibold leading-snug text-[var(--foreground)]">
                {item.value} ({plannedTasks ? Math.round((item.value / plannedTasks) * 100) : 0}%)
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
