// ABOUTME: Pure helpers for the Projects section badge — no side effects
// ABOUTME: Derives the collapsed Projects section badge string from project and pomodoro state

import type { Project, PomodoroDay } from "../types";

export interface ProjectsBadgeParams {
  /** All projects (done and non-done). */
  projects: Project[];
  /** 7 YYYY-MM-DD strings oldest→newest representing the last 7 days including today. */
  last7Days: string[];
  /** Local midnight of today — used for overdue deadline calculation. */
  todayMidnight: Date;
  /** Rolling pomodoro session history; absent treated as empty. */
  pomodoroHistory?: PomodoroDay[];
  /**
   * Pre-computed focus project name from the caller.
   * When provided, avoids re-searching projects for the focused entry.
   * When absent, falls back to finding the first non-done isFocus project internally.
   */
  focusProjectName?: string;
}

/**
 * Computes the collapsed Projects section badge string.
 * Returns undefined when there are no non-done projects.
 *
 * Format: "[★ <focusName> · ]N/total · avg%[ · 🍅N·7d][ · ⚠N][ · ✓N·7d]"
 * - ★ prefix: first word (max 12 chars) of the focused non-done project
 * - N/total: running (active|in-progress) count / non-done count
 * - avg%: average progress across running projects (omitted when runningCount === 0)
 * - 🍅N·7d: total focus sessions in the last 7 days (omitted when 0)
 * - ⚠N: non-done projects with deadline ≤ today, including today (days === 0 = due today counts as urgency in the badge for compactness; omitted when 0)
 * - ✓N·7d: projects completed within the last 7 days (omitted when 0)
 */
export function calcProjectsBadge(params: ProjectsBadgeParams): string | undefined {
  const { projects, last7Days, todayMidnight, pomodoroHistory, focusProjectName } = params;

  const nonDoneProjects = projects.filter(p => p.status !== "done");
  if (nonDoneProjects.length === 0) return undefined;

  const runningProjects = nonDoneProjects.filter(
    p => p.status === "active" || p.status === "in-progress",
  );
  const runningCount = runningProjects.length;
  const avgProgress = runningCount > 0
    ? Math.round(runningProjects.reduce((s, p) => s + p.progress, 0) / runningCount)
    : null;

  const todayMs = todayMidnight.getTime();
  const overdueCount = nonDoneProjects.filter(p => {
    if (!p.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) return false;
    const ts = new Date(p.deadline + "T00:00:00").getTime();
    if (isNaN(ts)) return false;
    return Math.floor((ts - todayMs) / 86400000) <= 0;
  }).length;

  const recentlyDoneCount = projects.filter(
    p => p.status === "done" && p.completedDate && last7Days.includes(p.completedDate),
  ).length;

  const history = pomodoroHistory ?? [];
  const weekPomodoroCount = history
    .filter(day => last7Days.includes(day.date))
    .reduce((s, day) => s + day.count, 0);

  // Trim once here so focusBadgeName extraction works on a clean string.
  // nonDoneProjects reused (already filtered above) to keep done-exclusion logic in one place.
  const trimmedFocusName = focusProjectName?.trim() || nonDoneProjects.find(p => p.isFocus)?.name?.trim();
  const focusBadgeName = trimmedFocusName
    ? (trimmedFocusName.split(/\s+/)[0].slice(0, 12) || null)
    : null;

  const runningPart = avgProgress !== null
    ? `${runningCount}/${nonDoneProjects.length} · ${avgProgress}%`
    : `${runningCount}/${nonDoneProjects.length}`;

  return [
    focusBadgeName ? `★ ${focusBadgeName}` : null,
    runningPart,
    weekPomodoroCount > 0 ? `🍅${weekPomodoroCount}·7d` : null,
    overdueCount > 0 ? `⚠${overdueCount}` : null,
    recentlyDoneCount > 0 ? `✓${recentlyDoneCount}·7d` : null,
  ].filter(Boolean).join(" · ");
}
