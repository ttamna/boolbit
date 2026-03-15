// ABOUTME: Pure helpers for habit statistics and check-in logic — no side effects
// ABOUTME: Covers per-habit weekly trend stats, aggregate daily completion rate, section badge, check-in patch, and perfect-day streak

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
  /** Consecutive days where ALL habits were completed; ≥2 triggers N🌟 suffix. */
  perfectStreak?: number;
}

/**
 * Computes the collapsed Streaks section badge string.
 * Returns undefined when there are no habits (habitCount === 0).
 *
 * Format: "[✓]N/M[ · 7d·R%][ · ⚠A][ · N🌟]" — parts joined with " · "
 * - ✓N/M: all habits done today — prefix signals complete day at a glance when collapsed
 * - N/M: habits done today / total habits (e.g. "3/5"); no prefix when incomplete
 * - 7d·R%: 7-day avg completion rate (e.g. "7d·80%"); omitted when weekRate is null
 * - ⚠A: at-risk habit count (e.g. "⚠2"); omitted when atRisk === 0
 * - N🌟: consecutive all-habits-done days (e.g. "3🌟"); omitted when perfectStreak < 2
 */
export function calcHabitsBadge(params: HabitsBadgeParams): string | undefined {
  const { habitCount, doneToday, atRisk, weekRate, perfectStreak } = params;
  if (habitCount === 0) return undefined;
  const allDone = doneToday >= habitCount;
  const countStr = allDone ? `✓${doneToday}/${habitCount}` : `${doneToday}/${habitCount}`;
  return [
    countStr,
    weekRate !== null ? `7d·${weekRate}%` : null,
    atRisk > 0 ? `⚠${atRisk}` : null,
    (perfectStreak ?? 0) >= 2 ? `${perfectStreak}🌟` : null,
  ].filter(Boolean).join(" · ");
}

// Returns the Partial<Habit> patch to apply when checking in a habit today.
// Adds today to checkHistory (deduplicates, sorts ascending, caps at 14 most-recent entries),
// increments streak by 1, sets lastChecked to today, and updates bestStreak when the new
// streak surpasses the previous best (absent bestStreak is treated as 0).
// Exported for unit testing; pure function with no side effects.
export function calcCheckInPatch(habit: Habit, today: string): Partial<Habit> {
  const history = habit.checkHistory ?? [];
  const newHistory = [...new Set([...history, today])].sort().slice(-14);
  const newStreak = habit.streak + 1;
  const patch: Partial<Habit> = {
    streak: newStreak,
    lastChecked: today,
    checkHistory: newHistory,
  };
  if (newStreak > (habit.bestStreak ?? 0)) patch.bestStreak = newStreak;
  return patch;
}

// Returns the Partial<Habit> patch to apply when undoing today's check-in.
// Removes today from checkHistory (returns undefined when the filtered list is empty so
// JSON.stringify omits the field — consistent with Rust serde(default) yielding None),
// decrements streak by 1 (min 0), and clears lastChecked to undefined.
// bestStreak is intentionally not decremented — it records the all-time high.
// Precondition: callers must verify h.lastChecked === today before calling; if today is absent
// from checkHistory the function still decrements streak, which would corrupt data.
// Exported for unit testing; pure function with no side effects.
export function calcUndoCheckInPatch(habit: Habit, today: string): Partial<Habit> {
  const filtered = (habit.checkHistory ?? []).filter(d => d !== today);
  return {
    streak: Math.max(0, habit.streak - 1),
    lastChecked: undefined,
    checkHistory: filtered.length > 0 ? filtered : undefined,
  };
}

// Returns the count of consecutive days (ending today or yesterday) on which ALL habits were checked.
// dayWindow: YYYY-MM-DD strings, oldest → newest (today = last element).
// If today is a perfect day (all habits checked), starts the streak from today.
// If today is not perfect, falls back to yesterday so habits in progress don't reset the display.
// Returns 0 when: habits is empty, window is empty, or neither today nor yesterday is perfect.
// Note: because checkHistory is capped at 14 entries (see calcCheckInPatch), the returned streak
// is implicitly bounded by the window length — typically 14 days maximum.
// Exported for unit testing; pure function with no side effects.
export function calcPerfectDayStreak(habits: Habit[], dayWindow: string[]): number {
  if (habits.length === 0 || dayWindow.length === 0) return 0;

  const isPerfect = (day: string): boolean =>
    habits.every(h => !!(h.checkHistory?.includes(day)));

  // Start from today if perfect; otherwise fall back to yesterday
  let startIdx: number;
  if (isPerfect(dayWindow[dayWindow.length - 1])) {
    startIdx = dayWindow.length - 1;
  } else {
    startIdx = dayWindow.length - 2;
    if (startIdx < 0 || !isPerfect(dayWindow[startIdx])) return 0;
  }

  // Count consecutive perfect days going backwards from startIdx
  let streak = 0;
  for (let i = startIdx; i >= 0; i--) {
    if (isPerfect(dayWindow[i])) streak++;
    else break;
  }
  return streak;
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
