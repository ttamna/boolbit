// ABOUTME: Pure helpers for goal period key generation — ISO week string, quarter string, goal streaks, success rate, and goal heatmaps
// ABOUTME: Exported for unit testing; used by App.tsx to anchor goal expiry, date stamps, streak display, history panels, and goal heatmap dot rows

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

// Returns the "YYYY-MM" string for one calendar month before the given "YYYY-MM".
// Uses integer arithmetic to avoid Date overflow (e.g., Jan 31 → Feb 31 → Mar 3 drift).
function prevMonthStr(ym: string): string {
  const year = parseInt(ym.slice(0, 4), 10);
  const month = parseInt(ym.slice(5, 7), 10);
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`;
}

// Returns the "YYYY-QN" string for one calendar quarter before the given "YYYY-QN".
// Handles Q1 → Q4 of prior year boundary.
function prevQuarterStr(q: string): string {
  const year = parseInt(q.slice(0, 4), 10);
  const qnum = parseInt(q.slice(6, 7), 10);
  return qnum === 1 ? `${year - 1}-Q4` : `${year}-Q${qnum - 1}`;
}

// Returns the number of consecutive calendar months (including the current month) for which a monthly goal was set.
// Returns 0 when: monthGoal is absent/empty, monthGoalDate is absent, or monthGoalDate ≠ current "YYYY-MM" (stale).
// Checks history for up to 7 preceding months; stops at the first gap.
// Maximum return value is 8 (current month + 7 history entries).
// now: injected for deterministic testing; uses sv locale for DST-safe "YYYY-MM".
// Exported for unit testing.
export function calcMonthGoalStreak(
  monthGoal: string | undefined,
  monthGoalDate: string | undefined,
  history: GoalEntry[],
  now: Date,
): number {
  if (!monthGoal || !monthGoalDate) return 0;
  const currentMonth = now.toLocaleDateString("sv").slice(0, 7);
  if (monthGoalDate !== currentMonth) return 0;
  const historySet = new Set(history.map(e => e.date));
  let count = 1;
  let prev = currentMonth;
  for (let back = 1; back <= 7; back++) {
    prev = prevMonthStr(prev);
    if (historySet.has(prev)) count++;
    else break;
  }
  return count;
}

// Returns the number of consecutive calendar quarters (including the current quarter) for which a quarterly goal was set.
// Returns 0 when: quarterGoal is absent/empty, quarterGoalDate is absent, or quarterGoalDate ≠ quarterStr(now) (stale).
// Checks history for up to 7 preceding quarters; stops at the first gap.
// Maximum return value is 8 (current quarter + 7 history entries; cap matches goalExpiry slice(-8)).
// now: injected for deterministic testing.
// Exported for unit testing.
export function calcQuarterGoalStreak(
  quarterGoal: string | undefined,
  quarterGoalDate: string | undefined,
  history: GoalEntry[],
  now: Date,
): number {
  if (!quarterGoal || !quarterGoalDate) return 0;
  const currentQuarter = quarterStr(now);
  if (quarterGoalDate !== currentQuarter) return 0;
  const historySet = new Set(history.map(e => e.date));
  let count = 1;
  let prev = currentQuarter;
  for (let back = 1; back <= 7; back++) {
    prev = prevQuarterStr(prev);
    if (historySet.has(prev)) count++;
    else break;
  }
  return count;
}

// Returns the number of consecutive calendar years (including the current year) for which a yearly goal was set.
// Returns 0 when: yearGoal is absent/empty, yearGoalDate is absent, or yearGoalDate ≠ current "YYYY" (stale).
// Checks history for up to 5 preceding years; stops at the first gap.
// Maximum return value is 6 (current year + 5 history entries; cap matches goalExpiry slice(-5)).
// now: injected for deterministic testing; uses sv locale for DST-safe "YYYY".
// Exported for unit testing.
export function calcYearGoalStreak(
  yearGoal: string | undefined,
  yearGoalDate: string | undefined,
  history: GoalEntry[],
  now: Date,
): number {
  if (!yearGoal || !yearGoalDate) return 0;
  const currentYear = now.toLocaleDateString("sv").slice(0, 4);
  if (yearGoalDate !== currentYear) return 0;
  const historySet = new Set(history.map(e => e.date));
  let count = 1;
  let prev = currentYear;
  for (let back = 1; back <= 5; back++) {
    prev = String(parseInt(prev, 10) - 1);
    if (historySet.has(prev)) count++;
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

// Returns N ISO week strings (oldest → newest), with index 0 = (N-1) weeks ago and index N-1 = current week.
// todayStr: YYYY-MM-DD local date to anchor calculation — same DST-safe pattern as calcLastNDays.
// Exported for unit testing; pure function with no side effects.
export function calcLastNWeeks(todayStr: string, n: number): string[] {
  const base = new Date(todayStr + "T00:00:00");
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (n - 1 - i) * 7);
    return isoWeekStr(d);
  });
}

export interface WeekGoalEntry {
  week: string;   // ISO week "YYYY-Www"
  set: boolean;   // true when a goal was set for this week
  done: boolean;  // true when the goal was marked accomplished
}

export interface WeekGoalHeatmapResult {
  /** Per-week set/done status, ordered oldest→newest matching the input last7Weeks order. */
  weeks: WeekGoalEntry[];
  /** Number of weeks where set === true. */
  setCount: number;
  /** Number of weeks where set === true AND done === true. */
  doneCount: number;
}

// Computes 7-week goal heatmap for the week goal dot row (mirrors calcIntentionWeek but uses ISO week keys).
// For the current week: set/done derive from weekGoal/weekGoalDone.
// For past weeks: set = history entry exists; done = entry.done === true.
// currentWeek: ISO week string "YYYY-Www" for the current week.
// Exported for unit testing; pure function with no side effects.
export function calcWeekGoalHeatmap(
  last7Weeks: string[],
  currentWeek: string,
  weekGoal: string | undefined,
  weekGoalDone: boolean | undefined,
  history: GoalEntry[],
): WeekGoalHeatmapResult {
  const weeks = last7Weeks.map(week => {
    if (week === currentWeek) {
      const set = !!(weekGoal);
      return { week, set, done: set && (weekGoalDone ?? false) };
    }
    const entry = history.find(e => e.date === week);
    return { week, set: !!entry, done: entry?.done ?? false };
  });
  const setCount = weeks.filter(w => w.set).length;
  const doneCount = weeks.filter(w => w.set && w.done).length;
  return { weeks, setCount, doneCount };
}

// Returns N "YYYY-MM" strings (oldest → newest), anchored at todayStr.
// Index 0 = (N-1) months ago; index N-1 = current month.
// Uses prevMonthStr (integer arithmetic) to avoid Date.setMonth() overflow
// (e.g. Jan 31 → setMonth(Feb) → Mar 3 on 31-day months).
// Exported for unit testing; pure function with no side effects.
export function calcLastNMonths(todayStr: string, n: number): string[] {
  const currentMonth = todayStr.slice(0, 7); // "YYYY-MM"
  const months: string[] = [];
  let m = currentMonth;
  for (let i = 0; i < n; i++) {
    months.unshift(m);
    m = prevMonthStr(m);
  }
  return months;
}

export interface MonthGoalEntry {
  month: string;   // "YYYY-MM"
  set: boolean;    // true when a goal was set for this month
  done: boolean;   // true when the goal was marked accomplished
}

export interface MonthGoalHeatmapResult {
  /** Per-month set/done status, ordered oldest→newest matching the input lastNMonths order. */
  months: MonthGoalEntry[];
  /** Number of months where set === true. */
  setCount: number;
  /** Number of months where set === true AND done === true. */
  doneCount: number;
}

// Computes N-month goal heatmap for the month goal dot row (mirrors calcWeekGoalHeatmap but uses "YYYY-MM" keys).
// For the current month: set/done derive from monthGoal/monthGoalDone.
// For past months: set = history entry exists; done = entry.done === true.
// currentMonth: "YYYY-MM" string for the current month.
// Exported for unit testing; pure function with no side effects.
export function calcMonthGoalHeatmap(
  lastNMonths: string[],
  currentMonth: string,
  monthGoal: string | undefined,
  monthGoalDone: boolean | undefined,
  history: GoalEntry[],
): MonthGoalHeatmapResult {
  const months = lastNMonths.map(month => {
    if (month === currentMonth) {
      const set = !!(monthGoal);
      return { month, set, done: set && (monthGoalDone ?? false) };
    }
    const entry = history.find(e => e.date === month);
    return { month, set: !!entry, done: entry?.done ?? false };
  });
  const setCount = months.filter(m => m.set).length;
  const doneCount = months.filter(m => m.set && m.done).length;
  return { months, setCount, doneCount };
}

// Returns N "YYYY-QN" quarter strings (oldest → newest), anchored at todayStr.
// Index 0 = (N-1) quarters ago; index N-1 = current quarter.
// Uses pure string/integer arithmetic (same pattern as calcLastNMonths/calcLastNYears) — no Date object.
// Exported for unit testing; pure function with no side effects.
export function calcLastNQuarters(todayStr: string, n: number): string[] {
  const year = todayStr.slice(0, 4);
  const q = Math.floor((parseInt(todayStr.slice(5, 7), 10) - 1) / 3) + 1;
  const currentQuarter = `${year}-Q${q}`;
  const quarters: string[] = [];
  let qStr = currentQuarter;
  for (let i = 0; i < n; i++) {
    quarters.unshift(qStr);
    qStr = prevQuarterStr(qStr);
  }
  return quarters;
}

export interface QuarterGoalEntry {
  quarter: string;  // "YYYY-Q1"..."YYYY-Q4"
  set: boolean;     // true when a goal was set for this quarter
  done: boolean;    // true when the goal was marked accomplished
}

export interface QuarterGoalHeatmapResult {
  /** Per-quarter set/done status, ordered oldest→newest matching the input lastNQuarters order. */
  quarters: QuarterGoalEntry[];
  /** Number of quarters where set === true. */
  setCount: number;
  /** Number of quarters where set === true AND done === true. */
  doneCount: number;
}

// Computes N-quarter goal heatmap for the quarter goal dot row (mirrors calcMonthGoalHeatmap but uses "YYYY-QN" keys).
// For the current quarter: set/done derive from quarterGoal/quarterGoalDone.
// For past quarters: set = history entry exists; done = entry.done === true.
// currentQuarter: "YYYY-QN" string for the current quarter.
// Exported for unit testing; pure function with no side effects.
export function calcQuarterGoalHeatmap(
  lastNQuarters: string[],
  currentQuarter: string,
  quarterGoal: string | undefined,
  quarterGoalDone: boolean | undefined,
  history: GoalEntry[],
): QuarterGoalHeatmapResult {
  const quarters = lastNQuarters.map(quarter => {
    if (quarter === currentQuarter) {
      const set = !!(quarterGoal);
      return { quarter, set, done: set && (quarterGoalDone ?? false) };
    }
    const entry = history.find(e => e.date === quarter);
    return { quarter, set: !!entry, done: entry?.done ?? false };
  });
  const setCount = quarters.filter(q => q.set).length;
  const doneCount = quarters.filter(q => q.set && q.done).length;
  return { quarters, setCount, doneCount };
}

// Returns N "YYYY" year strings (oldest → newest), anchored at todayStr.
// Index 0 = (N-1) years ago; index N-1 = current year.
// Exported for unit testing; pure function with no side effects.
export function calcLastNYears(todayStr: string, n: number): string[] {
  const currentYear = parseInt(todayStr.slice(0, 4), 10);
  return Array.from({ length: n }, (_, i) => String(currentYear - (n - 1 - i)));
}

export interface YearGoalEntry {
  year: string;     // "YYYY"
  set: boolean;     // true when a goal was set for this year
  done: boolean;    // true when the goal was marked accomplished
}

export interface YearGoalHeatmapResult {
  /** Per-year set/done status, ordered oldest→newest matching the input lastNYears order. */
  years: YearGoalEntry[];
  /** Number of years where set === true. */
  setCount: number;
  /** Number of years where set === true AND done === true. */
  doneCount: number;
}

// Computes N-year goal heatmap for the year goal dot row (mirrors calcQuarterGoalHeatmap but uses "YYYY" keys).
// For the current year: set/done derive from yearGoal/yearGoalDone.
// For past years: set = history entry exists; done = entry.done === true.
// currentYear: "YYYY" string for the current year.
// Exported for unit testing; pure function with no side effects.
export function calcYearGoalHeatmap(
  lastNYears: string[],
  currentYear: string,
  yearGoal: string | undefined,
  yearGoalDone: boolean | undefined,
  history: GoalEntry[],
): YearGoalHeatmapResult {
  const years = lastNYears.map(year => {
    if (year === currentYear) {
      const set = !!(yearGoal);
      return { year, set, done: set && (yearGoalDone ?? false) };
    }
    const entry = history.find(e => e.date === year);
    return { year, set: !!entry, done: entry?.done ?? false };
  });
  const setCount = years.filter(y => y.set).length;
  const doneCount = years.filter(y => y.set && y.done).length;
  return { years, setCount, doneCount };
}
