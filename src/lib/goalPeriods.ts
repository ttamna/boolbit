// ABOUTME: Pure helpers for goal period key generation — ISO week string, quarter string, weekly/monthly/quarterly/yearly goal streaks, and success rate
// ABOUTME: Exported for unit testing; used by App.tsx to anchor goal expiry, date stamps, streak display, and history panels

import type { GoalEntry } from "../types";

// Returns ISO week string "YYYY-Www" for the given date.
// ISO weeks start on Monday; week 1 contains the first Thursday of the year.
// The YYYY in the result may differ from date.getFullYear() near year boundaries
// (e.g. Dec 29–31 can be W01 of the next year; Jan 1–3 can be W52/W53 of the prior year).
export function isoWeekStr(date: Date): string {
  // Work in UTC to avoid DST distortions: move to Thursday of the ISO week
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// Returns "YYYY-Q1"…"YYYY-Q4" quarter string for the given date.
export function quarterStr(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}

// Returns "YYYY-MM" month string for the given date (zero-padded month).
// Mirrors isoWeekStr and quarterStr for consistent key generation across all period types.
export function monthStr(date: Date): string {
  return date.toLocaleDateString("sv").slice(0, 7);
}

export interface GoalSuccessRate {
  /** Count of history entries with done === true. */
  done: number;
  /** Total history entry count. */
  total: number;
  /** Math.round(done / total * 100) — percentage achieved. */
  pct: number;
}

// Returns aggregate success rate from a goal history array.
// done: count of entries with done === true (absent/false both count as not done — project convention).
// Returns null when history is empty (no data to display).
// Exported for unit testing; pure function with no side effects.
export function calcGoalSuccessRate(history: GoalEntry[]): GoalSuccessRate | null {
  if (history.length === 0) return null;
  const done = history.filter(e => e.done === true).length;
  return { done, total: history.length, pct: Math.round(done / history.length * 100) };
}

// Returns the number of consecutive months (including the current month) for which a monthly goal was set.
// Returns 0 when: monthGoal is absent/empty, monthGoalDate is absent, or monthGoalDate ≠ current "YYYY-MM" (stale).
// Checks history for up to 11 preceding months; stops at the first gap.
// Maximum return value is 12 (current month + 11 history entries).
// now: injected for deterministic testing.
// Exported for unit testing; pure function with no side effects.
export function calcMonthGoalStreak(
  monthGoal: string | undefined,
  monthGoalDate: string | undefined,
  history: GoalEntry[],
  now: Date,
): number {
  if (!monthGoal || !monthGoalDate) return 0;
  if (monthGoalDate !== monthStr(now)) return 0;
  const historySet = new Set(history.map(e => e.date));
  let count = 1;
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-based
  for (let back = 1; back <= 11; back++) {
    month--;
    if (month < 0) { month = 11; year--; }
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    if (historySet.has(key)) count++;
    else break;
  }
  return count;
}

// Returns the number of consecutive quarters (including the current quarter) for which a quarterly goal was set.
// Returns 0 when: quarterGoal is absent/empty, quarterGoalDate is absent, or quarterGoalDate ≠ quarterStr(now) (stale).
// Checks history for up to 7 preceding quarters; stops at the first gap.
// Maximum return value is 8 (current quarter + 7 history entries).
// now: injected for deterministic testing; uses quarterStr internally.
// Exported for unit testing; pure function with no side effects.
export function calcQuarterGoalStreak(
  quarterGoal: string | undefined,
  quarterGoalDate: string | undefined,
  history: GoalEntry[],
  now: Date,
): number {
  if (!quarterGoal || !quarterGoalDate) return 0;
  if (quarterGoalDate !== quarterStr(now)) return 0;
  const historySet = new Set(history.map(e => e.date));
  let count = 1;
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) + 1; // 1-based
  for (let back = 1; back <= 7; back++) {
    quarter--;
    if (quarter <= 0) { quarter = 4; year--; }
    const key = `${year}-Q${quarter}`;
    if (historySet.has(key)) count++;
    else break;
  }
  return count;
}

// Returns the number of consecutive ISO weeks (including the current week) for which a weekly goal was set.
// Returns 0 when: weekGoal is absent/empty, weekGoalDate is absent, or weekGoalDate ≠ isoWeekStr(now) (stale goal).
// Checks history for up to 7 preceding weeks; stops at the first gap.
// Maximum return value is 8 (current week + 7 history entries).
// now: injected for deterministic testing; uses isoWeekStr internally for DST safety.
// Exported for unit testing.
export function calcWeekGoalStreak(
  weekGoal: string | undefined,
  weekGoalDate: string | undefined,
  history: GoalEntry[],
  now: Date,
): number {
  if (!weekGoal || !weekGoalDate) return 0;
  if (weekGoalDate !== isoWeekStr(now)) return 0;
  const historySet = new Set(history.map(e => e.date));
  let count = 1;
  // Use a fixed local-midnight base so setDate arithmetic doesn't drift mid-day.
  const base = new Date(now.toLocaleDateString("sv") + "T00:00:00");
  for (let back = 1; back <= 7; back++) {
    const d = new Date(base);
    d.setDate(d.getDate() - back * 7);
    if (historySet.has(isoWeekStr(d))) count++;
    else break;
  }
  return count;
}

// Returns the number of consecutive years (including the current year) for which a yearly goal was set.
// Returns 0 when: yearGoal is absent/empty, yearGoalDate is absent, or yearGoalDate ≠ current "YYYY" (stale).
// Checks history for up to 4 preceding years; stops at the first gap.
// Maximum return value is 5 (current year + 4 history entries, matching yearGoalHistory cap).
// now: injected for deterministic testing.
// Exported for unit testing; pure function with no side effects.
export function calcYearGoalStreak(
  yearGoal: string | undefined,
  yearGoalDate: string | undefined,
  history: GoalEntry[],
  now: Date,
): number {
  if (!yearGoal || !yearGoalDate) return 0;
  const currentYear = String(now.getFullYear());
  if (yearGoalDate !== currentYear) return 0;
  const historySet = new Set(history.map(e => e.date));
  let count = 1;
  for (let back = 1; back <= 4; back++) {
    const key = String(now.getFullYear() - back);
    if (historySet.has(key)) count++;
    else break;
  }
  return count;
}
