// ABOUTME: Pure helpers for habit statistics — no side effects
// ABOUTME: Covers per-habit weekly trend stats, aggregate daily completion rate, and section badge

import type { Habit } from "../types";

// Returns the average daily habit completion rate (%) over a sliding day window.
// Returns null when:
//   - habits array is empty
//   - window is empty
//   - no habit has any check within the window (avoids showing a misleading 0%)
//
// dayWindow: array of YYYY-MM-DD strings (oldest → newest, typically 7 entries)
export function calcHabitsWeekRate(habits: Habit[], dayWindow: string[]): number | null {
  if (habits.length === 0) return null;
  if (dayWindow.length === 0) return null;
  const anyInWindow = habits.some(h => dayWindow.some(day => h.checkHistory?.includes(day)));
  if (!anyInWindow) return null;
  const avgRate = dayWindow.reduce((sum, day) => {
    return sum + habits.filter(h => h.checkHistory?.includes(day)).length / habits.length;
  }, 0) / dayWindow.length;
  return Math.round(avgRate * 100);
}

export interface HabitsBadgeParams {
  /** Total habit count; returns undefined when 0. */
  habitCount: number;
  /** Number of habits with lastChecked === todayStr. */
  doneToday: number;
  /** Number of habits at risk of losing streak (checked yesterday, not yet checked today). */
  atRisk: number;
  /** Average daily completion rate (%) over the last 7 days; null = no data to show. */
  weekRate: number | null;
}

/**
 * Computes the collapsed Streaks section badge string.
 * Returns undefined when there are no habits (habitCount === 0).
 *
 * Format: "N/M[ · 7d·R%][ · ⚠A]" — parts joined with " · "
 * - N/M: habits done today / total habits (e.g. "3/5")
 * - 7d·R%: 7-day avg completion rate (e.g. "7d·80%"); omitted when weekRate is null
 * - ⚠A: at-risk habit count (e.g. "⚠2"); omitted when atRisk === 0
 */
export function calcHabitsBadge(params: HabitsBadgeParams): string | undefined {
  const { habitCount, doneToday, atRisk, weekRate } = params;
  if (habitCount === 0) return undefined;
  return [
    `${doneToday}/${habitCount}`,
    weekRate !== null ? `7d·${weekRate}%` : null,
    atRisk > 0 ? `⚠${atRisk}` : null,
  ].filter(Boolean).join(" · ");
}

// Returns weekly check statistics for a single habit, partitioned from a 14-day window.
// last14Days: 14 YYYY-MM-DD strings ordered oldest→newest.
//   Indices 0–6: previous week; indices 7–13: current week.
// Returns:
//   cur7:  count of checks in the current 7 days
//   prev7: count of checks in the previous 7 days
//   trend: "↑" improving, "↓" declining, "" stable (suppressed when equal to avoid noise)
export function calcHabitWeekStats(
  checkHistory: string[] | undefined,
  last14Days: string[],
): { cur7: number; prev7: number; trend: "↑" | "↓" | "" } {
  const history = checkHistory ?? [];
  const cur7  = last14Days.slice(7).filter(day => history.includes(day)).length;
  const prev7 = last14Days.slice(0, 7).filter(day => history.includes(day)).length;
  const trend = cur7 > prev7 ? "↑" : cur7 < prev7 ? "↓" : "";
  return { cur7, prev7, trend };
}
