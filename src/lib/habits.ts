// ABOUTME: Pure helpers for habit statistics — no side effects
// ABOUTME: Covers per-habit weekly trend stats and aggregate daily completion rate

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
