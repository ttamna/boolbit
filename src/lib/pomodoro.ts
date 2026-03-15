// ABOUTME: Pure helpers for pomodoro session statistics — no side effects
// ABOUTME: Covers today-count derivation, 14-day history upsert, date range, and week trend calculation

import type { PomodoroDay } from "../types";

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

// Returns prev-7/cur-7 session counts, trend arrow, and histMap for the 14-day heatmap.
// last14Days partitioning: indices 0–6 = prev7 (previous week); indices 7–13 = cur7 (current week).
// trend: "↑" improving, "↓" declining, "" stable (suppressed when equal to avoid noise).
// histMap: fast O(1) date→count lookup for heatmap dot rendering.
// Returns null when sessionHistory is empty (no data to display).
// Exported for unit testing; pure function with no side effects.
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
