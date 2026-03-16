// ABOUTME: Pure helpers for the Projects section — badge, sort, progress, deadline, age, and staleness logic
// ABOUTME: All functions are side-effect-free; time-dependent ones accept injected dates for testing

import type { Project, PomodoroDay } from "../types";
import { colors } from "../theme";

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

// Returns a human-readable relative time string ("30m ago", "2h ago", "3d ago") for an ISO timestamp.
// Returns "—" for invalid input. Pure with respect to injected Date.now() via vi.setSystemTime.
export function relativeTime(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (isNaN(ts)) return "—";
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Returns a color token based on how stale the last commit is.
// Uses statusPaused for >7 days, statusProgress for 2-7 days, textDim otherwise.
// Pure with respect to injected Date.now() via vi.setSystemTime.
export function staleColor(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (isNaN(ts)) return colors.textDim;
  const days = Math.max(0, (Date.now() - ts) / 86400000);
  if (days > 7) return colors.statusPaused;
  if (days > 2) return colors.statusProgress;
  return colors.textDim;
}

// Returns days remaining until deadline relative to local midnight.
// Requires strict YYYY-MM-DD format; returns null for invalid/empty strings.
// Uses T00:00:00 for local-midnight parsing (avoids UTC off-by-one).
// Uses Math.floor so DST days (23h) count as 0 remaining, not 1.
// Pure with respect to injected today via vi.setSystemTime.
export function deadlineDays(dateStr: string): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const ts = new Date(dateStr + "T00:00:00").getTime();
  if (isNaN(ts)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((ts - today.getTime()) / 86400000);
}

// Returns a relative deadline label: "D-5", "오늘 마감", "5d 초과", or "—" if invalid.
export function deadlineRelative(dateStr: string): string {
  const days = deadlineDays(dateStr);
  if (days === null) return "—";
  if (days === 0) return "오늘 마감";
  if (days > 0) return `D-${days}`;
  return `${-days}d 초과`;
}

// Returns days elapsed since lastFocusDate relative to local midnight; null if today or invalid.
// Used to show "⊖ Nd" stale-focus indicator on project cards.
// Pure with respect to injected today via vi.setSystemTime.
export function lastFocusDaysAgo(dateStr: string | undefined): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const ts = new Date(dateStr + "T00:00:00").getTime();
  if (isNaN(ts)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - ts) / 86400000);
  return days > 0 ? days : null; // null if today (no stale indicator needed)
}

// Returns a compact age/duration label: "Nd", "Nw", "Nmo", or null if invalid/absent.
// asOfDate: optional end-point (YYYY-MM-DD) — defaults to today when absent.
// Used for active projects (today anchor → age) and done projects (completedDate anchor → duration).
export function projectAgeLabel(dateStr: string | undefined, asOfDate?: string): string | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const ts = new Date(dateStr + "T00:00:00").getTime();
  if (isNaN(ts)) return null;
  let end: number;
  if (asOfDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) return null;
    end = new Date(asOfDate + "T00:00:00").getTime();
    if (isNaN(end)) return null;
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end = today.getTime();
  }
  const days = Math.floor((end - ts) / 86400000);
  if (days <= 0) return null; // same day or future — no label yet
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

// Returns a compact human-readable label for a deadline offset in days.
// Prefers month units (30-day multiples), then weeks (7-day multiples), then raw days.
export function deadlinePresetLabel(days: number): string {
  if (days % 30 === 0) return `+${days / 30}달`;
  if (days % 7 === 0) return `+${days / 7}주`;
  return `+${days}일`;
}

// Returns the percentage of time elapsed from createdDate to deadline, clamped to [0, 100].
// Both dates use T00:00:00 local-midnight parsing for DST safety.
// Returns null when either date is absent/invalid or deadline ≤ createdDate (degenerate range).
// today: optional injection for deterministic testing; defaults to local midnight when omitted.
export function timeElapsedPct(createdDate: string | undefined, deadline: string | undefined, today?: Date): number | null {
  if (!createdDate || !deadline) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(createdDate) || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const start = new Date(createdDate + "T00:00:00").getTime();
  const end = new Date(deadline + "T00:00:00").getTime();
  if (end <= start) return null;
  const todayMidnight = (() => { const d = today ? new Date(today) : new Date(); d.setHours(0, 0, 0, 0); return d; })();
  return Math.min(100, Math.max(0, Math.round((todayMidnight.getTime() - start) / (end - start) * 100)));
}

// Returns a YYYY-MM-DD local date string for `from + n days`.
// `from` defaults to today when omitted; inject for deterministic testing.
export function dateAfterDays(n: number, from?: Date): string {
  const d = from ? new Date(from) : new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv");
}

// Returns schedule efficiency { gap, timePct } or null when too early or dates are invalid.
// gap = Math.round(progress - timePct): positive = ahead, negative = behind, 0 = on track.
// Suppresses result when timePct < 10 to avoid jarring badge at project start.
// today: optional injection for deterministic testing.
export function calcScheduleGap(
  progress: number,
  createdDate: string | undefined,
  deadline: string | undefined,
  today?: Date,
): { gap: number; timePct: number } | null {
  const timePct = timeElapsedPct(createdDate, deadline, today);
  if (timePct === null || timePct < 10) return null;
  return { gap: Math.round(progress - timePct), timePct };
}

export interface CompletionForecast {
  /** Projected completion date (YYYY-MM-DD) based on current velocity (progress / days elapsed). */
  forecastDate: string;
  /** Days from forecast to deadline: positive = ahead, negative = behind. null when no deadline. */
  daysVsDeadline: number | null;
}

// Computes a forward-looking completion forecast based on observed progress velocity.
// velocity = progress% / daysElapsed; forecastDate = today + remaining% / velocity.
// Returns null when: progress ≤ 0 or ≥ 100 (not in-flight), createdDate absent, or < 3 days elapsed (too early).
// today: optional injection for deterministic testing.
export function calcCompletionForecast(
  progress: number,
  createdDate: string | undefined,
  deadline: string | undefined,
  today?: Date,
): CompletionForecast | null {
  if (!createdDate || !/^\d{4}-\d{2}-\d{2}$/.test(createdDate) || progress <= 0 || progress >= 100) return null;

  const now = today ? new Date(today) : new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const created = new Date(createdDate + "T00:00:00").getTime();
  const daysElapsed = (todayMidnight - created) / 86400000;

  if (daysElapsed < 3) return null; // too early to establish a reliable velocity

  const velocity = progress / daysElapsed; // % per day
  const remaining = 100 - progress;
  const daysToComplete = remaining / velocity;

  const forecastMs = todayMidnight + daysToComplete * 86400000;
  const forecastDate = new Date(forecastMs).toLocaleDateString("sv");

  let daysVsDeadline: number | null = null;
  if (deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    const deadlineMs = new Date(deadline + "T00:00:00").getTime();
    daysVsDeadline = Math.round((deadlineMs - forecastMs) / 86400000);
  }

  return { forecastDate, daysVsDeadline };
}

// Returns urgency color: red if today or overdue (days ≤ 0), yellow if ≤7 days, dim otherwise.
export function deadlineColor(dateStr: string): string {
  const days = deadlineDays(dateStr);
  if (days === null) return colors.textPhantom;
  if (days <= 0) return colors.statusPaused;
  if (days <= 7) return colors.statusProgress;
  return colors.textSubtle;
}

// Returns average progress (0–100, rounded) of running projects (active + in-progress).
// Uses the same positive filter as calcProjectsBadge so both reflect the same "running" definition —
// a single source of truth for this domain concept even as status values expand.
// Clamps to [0, 100] to guard against out-of-range values from manual edits or deserialization.
// Returns null when no running projects exist (guards against division by zero).
// Exported for unit testing; pure function with no side effects.
export function avgRunningProgressPct(projects: Project[]): number | null {
  const running = projects.filter(p => p.status === "active" || p.status === "in-progress");
  if (running.length === 0) return null;
  const avg = running.reduce((s, p) => s + p.progress, 0) / running.length;
  return Math.min(100, Math.max(0, Math.round(avg)));
}

// Sorts projects: isFocus first → deadline urgency (soonest first, no/invalid deadline = last) → done last.
// Done projects are excluded from sorting and appended at the end in their original relative order.
// Paused projects sort alongside active/in-progress — view-level filters handle visual grouping.
// Uses stable sort so equal-priority items preserve their input order.
// today is injectable for testing; defaults to local midnight of the current day when absent.
// Exported for unit testing; pure function — does not mutate the input array.
export function sortProjects(projects: Project[], today?: Date): Project[] {
  const d = today ? new Date(today) : new Date();
  d.setHours(0, 0, 0, 0);
  const todayMidnight = d.getTime();
  const urgency = (p: Project): number => {
    if (!p.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) return Infinity;
    return Math.floor((new Date(p.deadline + "T00:00:00").getTime() - todayMidnight) / 86400000);
  };
  const active = projects.filter(p => p.status !== "done");
  const done = projects.filter(p => p.status === "done");
  const sortedActive = [...active].sort((a, b) => {
    const aFocus = a.isFocus ? 0 : 1;
    const bFocus = b.isFocus ? 0 : 1;
    if (aFocus !== bFocus) return aFocus - bFocus;
    return urgency(a) - urgency(b);
  });
  return [...sortedActive, ...done];
}

const MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const;
const MILESTONE_LABELS: Record<25 | 50 | 75 | 100, string> = {
  25:  "🚀 25% 돌파!",
  50:  "🎯 절반 완료!",
  75:  "💪 75% 달성!",
  100: "🎉 100% 달성!",
};

export interface ProjectMilestone {
  /** The milestone threshold that was just crossed (25, 50, 75, or 100). */
  milestone: 25 | 50 | 75 | 100;
  /** Display label for desktop notification body. */
  label: string;
}

// Returns the desktop notification body when a project transitions to "done" status for the first time.
// Returns null when prevStatus is already "done", when newStatus is not "done", or when newStatus is absent.
// Returns null when projectName is empty to avoid a meaningless notification body.
// Exported for unit testing; pure function with no side effects.
export function calcProjectCompletionNotify(
  prevStatus: Project["status"] | undefined,
  newStatus: Project["status"] | undefined,
  projectName: string,
): string | null {
  if (newStatus !== "done") return null;
  if (prevStatus === "done") return null;
  if (!projectName.trim()) return null;
  return `✅ ${projectName} 완료! 수고하셨습니다 🎉`;
}

// Returns the highest milestone threshold crossed when progress moves from prevProgress to newProgress.
// A threshold M is "crossed" when prevProgress < M and newProgress >= M.
// Returns null when progress decreases, stays equal, or no threshold is newly crossed.
// Exported for unit testing; pure function with no side effects.
export function calcProjectMilestone(prevProgress: number, newProgress: number): ProjectMilestone | null {
  if (newProgress <= prevProgress) return null;
  const crossed = MILESTONE_THRESHOLDS.filter(m => prevProgress < m && newProgress >= m);
  if (crossed.length === 0) return null;
  // MILESTONE_THRESHOLDS is declared ascending (25→100), so filter preserves ascending order;
  // the last element is always the highest crossed threshold.
  const milestone = crossed[crossed.length - 1];
  return { milestone, label: MILESTONE_LABELS[milestone] };
}
