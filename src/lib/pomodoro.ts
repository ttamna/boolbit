// ABOUTME: Pure helpers for pomodoro session statistics and phase UI mapping — no side effects
// ABOUTME: Covers phase color/label, today-count derivation, 14-day history upsert, date range, week trend, header badge string, lifetime format, and goal-progress percentage

import type { PomodoroDay } from "../types";
import { colors } from "../theme";

/** The three phases of a pomodoro cycle. */
export type Phase = "focus" | "break" | "longBreak";

// Returns the accent color token for the given pomodoro phase.
// focus → colors.statusActive (green); break → colors.statusProgress (amber); longBreak → colors.statusLongBreak (sky-blue).
// PomodoroTimer applies a theme-accent override for focus and calls this only for non-focus phases,
// but the function covers all three to form a complete, independently testable contract.
// Exported for unit testing; pure function with no side effects.
export function phaseAccent(p: Phase): string {
  if (p === "focus") return colors.statusActive;
  if (p === "break") return colors.statusProgress;
  return colors.statusLongBreak;
}

// Returns the Korean display label for the given pomodoro phase.
// focus → "집중"; break → "휴식"; longBreak → "긴 휴식".
// Exported for unit testing; pure function with no side effects.
export function phaseLabel(p: Phase): string {
  if (p === "focus") return "집중";
  if (p === "break") return "휴식";
  return "긴 휴식";
}

// Returns the updated today-session count given the persisted state.
// Resets to 1 when sessionDate differs from today (new day); increments by 1 when same day.
// sessionDate: stored 'pomodoroSessionsDate' (YYYY-MM-DD or undefined)
// sessionCount: stored 'pomodoroSessions' (integer or undefined)
// today: current date as YYYY-MM-DD
// Exported for unit testing; pure function with no side effects.
export function calcTodaySessionCount(
  sessionDate: string | undefined,
  sessionCount: number | undefined,
  today: string,
): number {
  return sessionDate === today ? (sessionCount ?? 0) + 1 : 1;
}

// Upserts today's session count into the rolling 14-day history.
// Removes any existing entry for today, appends the new count, sorts chronologically, caps at 14.
// Does not mutate the input history array.
// Exported for unit testing; pure function with no side effects.
export function updatePomodoroHistory(
  history: PomodoroDay[],
  today: string,
  count: number,
): PomodoroDay[] {
  return [...history.filter(d => d.date !== today), { date: today, count }]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

// Returns the last 14 YYYY-MM-DD date strings (oldest → newest) anchored at todayStr.
// Index 0 = 13 days ago; index 13 = today.
// Exported for unit testing; pure function with no side effects.
export function calcLast14Days(todayStr: string): string[] {
  const base = new Date(todayStr + "T00:00:00");
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (13 - i));
    return d.toLocaleDateString("sv");
  });
}

// Returns the session count badge string for the Pomodoro header, or null when there is nothing to show.
// null: sessionsToday === 0 and sessionGoal absent — mirrors the JSX visibility guard.
// "✓N": sessionsToday >= sessionGoal (goal reached or exceeded).
// "×N/G": sessionGoal set but not yet reached.
// "×N": no goal; N sessions completed today.
// Exported for unit testing; pure function with no side effects.
export function calcSessionCountStr(
  sessionsToday: number,
  sessionGoal: number | undefined,
): string | null {
  if (sessionsToday === 0 && sessionGoal == null) return null;
  if (sessionGoal != null) {
    return sessionsToday >= sessionGoal
      ? `✓${sessionsToday}`
      : `×${sessionsToday}/${sessionGoal}`;
  }
  return `×${sessionsToday}`;
}

// Formats cumulative focus minutes as "Xh Ym" (≥60 min) or "Xm" (<60 min) for the ∑ badge.
// Exported for unit testing; pure function with no side effects.
export function formatLifetime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Returns the Pomodoro collapsed section badge string, or null when nothing to show.
// Combines the session count indicator (calcSessionCountStr) with today's total focus time.
// null: sessionsToday === 0 and sessionGoal absent — matches the calcSessionCountStr null case.
// "🍅 ✓N · Xm": goal reached or exceeded; N ≥ 1, so time suffix is always present.
// "🍅 ×N/G[ · Xm]": goal set, not yet reached; time suffix included only when N > 0.
// "🍅 ×N · Xm": no goal; N sessions completed today with time.
// focusMins: the configured focus phase duration (minutes per session).
// Exported for unit testing; pure function with no side effects.
export function calcPomodoroBadge(
  sessionsToday: number,
  sessionGoal: number | undefined,
  focusMins: number,
): string | null {
  const countStr = calcSessionCountStr(sessionsToday, sessionGoal);
  if (countStr === null) return null;
  const timeSuffix = sessionsToday > 0 ? ` · ${formatLifetime(sessionsToday * focusMins)}` : "";
  return `🍅 ${countStr}${timeSuffix}`;
}

// Returns percentage progress toward daily session goal, clamped to [0, 100].
// Returns null when goal is absent or zero (guards NaN from 0/0 and undefined access).
// Pure function with no side effects.
export function sessionGoalPct(sessionsToday: number, sessionGoal: number | undefined): number | null {
  if (sessionGoal == null || sessionGoal <= 0) return null;
  return Math.min(100, Math.round((sessionsToday / sessionGoal) * 100));
}

// Returns prev-7/cur-7 session counts, trend arrow, and histMap for the 14-day heatmap.
// last14Days partitioning: indices 0–6 = prev7 (previous week); indices 7–13 = cur7 (current week).
// trend: "↑" improving, "↓" declining, "" stable (suppressed when equal to avoid noise).
// histMap: fast O(1) date→count lookup for heatmap dot rendering.
// Returns null when sessionHistory is empty (no data to display).
export function calcSessionWeekTrend(
  sessionHistory: PomodoroDay[],
  last14Days: string[],
): { cur7: number; prev7: number; trend: "↑" | "↓" | ""; histMap: Map<string, number> } | null {
  if (sessionHistory.length === 0) return null;
  const histMap = new Map<string, number>(sessionHistory.map(d => [d.date, d.count]));
  const cur7  = last14Days.slice(7).reduce((s, d) => s + (histMap.get(d) ?? 0), 0);
  const prev7 = last14Days.slice(0, 7).reduce((s, d) => s + (histMap.get(d) ?? 0), 0);
  const trend: "↑" | "↓" | "" = cur7 > prev7 ? "↑" : cur7 < prev7 ? "↓" : "";
  return { cur7, prev7, trend, histMap };
}
