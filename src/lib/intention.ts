// ABOUTME: Pure helpers for intention streak, consecutive-done streak, 7-day heatmap, week-over-week trend, done-notification, morning reminder, evening reminder, weekly done-rate report, monthly done-rate report, quarterly done-rate report, yearly done-rate report, per-weekday intention done-rate analysis, and current calendar month done rate logic
// ABOUTME: todayStr anchors all date arithmetic for DST safety; notification helpers guard duplicate sends via caller-managed date fields

import type { IntentionEntry } from "../types";

// Returns the number of consecutive days (including today) that the user has set an intention.
// Returns 0 when todayIntention is absent or empty.
// Checks intentionHistory for past 6 days (newest first: yesterday → 6 days ago); stops at the first gap.
// Maximum return value is 7 (today + 6 preceding history days).
// todayStr: YYYY-MM-DD local date string used to anchor past-day calculations.
export function calcIntentionStreak(
  todayIntention: string | undefined,
  todayStr: string,
  history: IntentionEntry[],
): number {
  if (todayIntention === undefined || todayIntention === "") return 0;
  const base = new Date(todayStr + "T00:00:00");
  let count = 1;
  for (let back = 1; back <= 6; back++) {
    const d = new Date(base);
    d.setDate(d.getDate() - back);
    const dateStr = d.toLocaleDateString("sv");
    if (history.some(e => e.date === dateStr)) count++;
    else break;
  }
  return count;
}

export interface IntentionDay {
  date: string;
  set: boolean;
  done: boolean;
}

export interface IntentionWeekResult {
  /** Per-day set/done status, ordered oldest→newest matching the input last7Days order. */
  days: IntentionDay[];
  /** Number of days where set === true. */
  setCount: number;
  /** Number of days where set === true AND done === true. */
  doneCount: number;
}

// Computes 7-day intention heatmap data for the collapsed badge and dot row.
// For today (day === todayStr): set/done derive from todayIntention/todayIntentionDone.
// For past days: set = history entry exists; done = entry.done === true.
// todayStr MUST be the date string for "today" in the same locale as the history entries.
export function calcIntentionWeek(
  last7Days: string[],
  todayStr: string,
  todayIntention: string | undefined,
  todayIntentionDone: boolean | undefined,
  history: IntentionEntry[],
): IntentionWeekResult {
  const days = last7Days.map(day => {
    if (day === todayStr) {
      return { date: day, set: !!(todayIntention), done: todayIntentionDone ?? false };
    }
    const entry = history.find(e => e.date === day);
    return { date: day, set: !!entry, done: entry?.done ?? false };
  });
  const setCount = days.filter(d => d.set).length;
  const doneCount = days.filter(d => d.set && d.done).length;
  return { days, setCount, doneCount };
}

/**
 * Compares intention done rates between the previous 7 days and the current 7 days.
 * last14Days MUST be 14 YYYY-MM-DD strings oldest→newest (last14Days[13] === todayStr).
 * prev7 = last14Days[0..6]; cur7 = last14Days[7..13].
 * Returns null when last14Days.length < 14 or when prev7 has no set intentions (no baseline).
 * Threshold: ≥10pp improvement → "↑"; ≤-10pp → "↓"; within ±10pp → "→".
 */
export function calcIntentionWeekTrend(
  last14Days: string[],
  todayStr: string,
  todayIntention: string | undefined,
  todayIntentionDone: boolean | undefined,
  history: IntentionEntry[],
): "↑" | "↓" | "→" | null {
  if (last14Days.length < 14) return null;
  const prev7 = last14Days.slice(0, 7);
  const cur7 = last14Days.slice(7);
  const prev = calcIntentionWeek(prev7, todayStr, todayIntention, todayIntentionDone, history);
  const cur = calcIntentionWeek(cur7, todayStr, todayIntention, todayIntentionDone, history);
  // No baseline when prev7 had no set intentions
  if (prev.setCount === 0) return null;
  const prevRate = prev.doneCount / prev.setCount;
  // curRate: 0 when no intentions set this week (treated as complete absence → decline)
  const curRate = cur.setCount > 0 ? cur.doneCount / cur.setCount : 0;
  const diff = Math.round((curRate - prevRate) * 100);
  if (diff >= 10) return "↑";
  if (diff <= -10) return "↓";
  return "→";
}

// Returns the desktop notification body when todayIntention is absent or empty (not yet set), null when already set.
// Hour/date guards live in the caller (App.tsx useEffect) — this function is pure and stateless.
// Callers should check intentionMorningRemindDate before invoking to ensure once-per-day delivery.
export function calcMorningIntentionReminder(
  todayIntention: string | undefined,
): string | null {
  if (todayIntention?.trim()) return null;
  return "☀️ 오늘의 의도를 설정해보세요!";
}

// Returns the desktop notification body for the evening check-in when user set intention today but hasn't marked it done.
// Returns null when: intention is absent/whitespace, already done, or set on a different day (intentionDate !== todayStr).
// Hour/date guards live in the caller (App.tsx useEffect) — fires after 18:00 via intentionEveningRemindDate guard.
// Exported for unit testing; pure function with no side effects.
export function calcIntentionEveningReminder(
  todayIntention: string | undefined,
  todayIntentionDone: boolean | undefined,
  intentionDate: string | undefined,
  todayStr: string,
): string | null {
  const trimmed = todayIntention?.trim();
  if (!trimmed) return null;
  if (todayIntentionDone) return null;
  if (intentionDate !== todayStr) return null;
  return `🌙 오늘의 의도를 달성했나요? "${trimmed}"`;
}

/**
 * Returns the number of consecutive days (including today if done) on which the user marked their
 * daily intention as accomplished (done === true in intentionHistory).
 *
 * - If todayIntentionDone === true: streak starts at 1 (today) then walks up to 6 past days → max 7.
 * - If todayIntentionDone is absent/false: streak starts at 0 then walks up to 6 past days → max 6.
 * - Stops at the first past day absent from history or present with done !== true.
 * - Returns 0 when no consecutive done day is reachable.
 *
 * Pure function with no side effects; todayStr injected for DST-safe date arithmetic.
 */
export function calcIntentionDoneStreak(
  history: IntentionEntry[],
  todayIntentionDone: boolean | undefined,
  todayStr: string,
): number {
  // Only store done=true dates; absent and done=false both resolve to "not done"
  const doneSet = new Set<string>(history.filter(e => e.done === true).map(e => e.date));
  const base = new Date(todayStr + "T00:00:00");
  let streak = todayIntentionDone === true ? 1 : 0;
  for (let back = 1; back <= 6; back++) {
    const d = new Date(base);
    d.setDate(d.getDate() - back);
    const dateStr = d.toLocaleDateString("sv");
    if (!doneSet.has(dateStr)) break;
    streak++;
  }
  return streak;
}

// Returns the weekly intention done-rate report notification body for an arbitrary date window.
// last7Days: array of YYYY-MM-DD strings defining the report window (typically 7 days ending yesterday).
// Deduplicates by date so duplicate history entries do not inflate setCount.
// Returns null when fewer than 2 distinct dates with set intentions exist in the window (insufficient data).
// Thresholds: 100% → 완벽; ≥70% → 훌륭; ≥40% → 이번 주엔 더 실천; <40% → 의도 실천 독려
// Callers should check weeklyIntentionReportDate before invoking to ensure once-per-Monday delivery.
export function calcWeeklyIntentionReport(
  history: IntentionEntry[],
  last7Days: string[],
): string | null {
  const dateWindow = new Set(last7Days);
  // Deduplicate by date (first occurrence wins) to guard against duplicate history entries.
  const seen = new Set<string>();
  const relevant = history.filter(e => {
    if (!dateWindow.has(e.date) || seen.has(e.date)) return false;
    seen.add(e.date);
    return true;
  });
  const setCount = relevant.length;
  if (setCount < 2) return null;
  const doneCount = relevant.filter(e => e.done === true).length;
  const pct = Math.round((doneCount / setCount) * 100);
  if (pct === 100) return `🌟 지난주 의도 달성률 100% — 완벽한 한 주! (${setCount}/${setCount})`;
  if (pct >= 70) return `✅ 지난주 의도 달성률 ${pct}% — 훌륭해요! (${doneCount}/${setCount})`;
  if (pct >= 40) return `💡 지난주 의도 달성률 ${pct}% — 이번 주엔 더 실천해봐요! (${doneCount}/${setCount})`;
  return `⚠️ 지난주 의도 달성률 ${pct}% — 의도를 실천하는 것이 중요해요! (${doneCount}/${setCount})`;
}

// Returns the monthly intention done-rate report notification body for the previous calendar month's window.
// prevMonthDays: array of YYYY-MM-DD strings covering all days of the previous month (e.g. all 28/29/30/31 days).
// Deduplicates by date so duplicate history entries do not inflate setCount.
// Returns null when fewer than 2 distinct dates with set intentions exist in the window (insufficient data).
// Thresholds mirror calcWeeklyIntentionReport: 100% → 완벽; ≥70% → 훌륭; ≥40% → 이번 달엔 더 실천; <40% → 의도 실천 독려
// Callers should check monthlyIntentionReportDate before invoking to ensure once-per-month-start delivery.
export function calcMonthlyIntentionReport(
  history: IntentionEntry[],
  prevMonthDays: string[],
): string | null {
  const dateWindow = new Set(prevMonthDays);
  // Deduplicate by date (first occurrence wins) to guard against duplicate history entries.
  const seen = new Set<string>();
  const relevant = history.filter(e => {
    if (!dateWindow.has(e.date) || seen.has(e.date)) return false;
    seen.add(e.date);
    return true;
  });
  const setCount = relevant.length;
  if (setCount < 2) return null;
  const doneCount = relevant.filter(e => e.done === true).length;
  const pct = Math.round((doneCount / setCount) * 100);
  if (pct === 100) return `🌟 지난달 의도 달성률 100% — 완벽한 한 달! (${setCount}/${setCount})`;
  if (pct >= 70) return `✅ 지난달 의도 달성률 ${pct}% — 훌륭해요! (${doneCount}/${setCount})`;
  if (pct >= 40) return `💡 지난달 의도 달성률 ${pct}% — 이번 달엔 더 실천해봐요! (${doneCount}/${setCount})`;
  return `⚠️ 지난달 의도 달성률 ${pct}% — 의도를 실천하는 것이 중요해요! (${doneCount}/${setCount})`;
}

// Returns the quarterly intention done-rate report notification body for the previous calendar quarter's window.
// prevQtrDays: array of YYYY-MM-DD strings covering all days of the previous quarter (90–92 days).
// Deduplicates by date so duplicate history entries do not inflate setCount.
// Returns null when fewer than 2 distinct dates with set intentions exist in the window (insufficient data).
// Thresholds mirror calcMonthlyIntentionReport: 100% → 완벽; ≥70% → 훌륭; ≥40% → 이번 분기엔 더 실천; <40% → 의도 실천 독려
// Callers should check quarterlyIntentionReportDate before invoking to ensure once-per-quarter delivery.
export function calcQuarterlyIntentionReport(
  history: IntentionEntry[],
  prevQtrDays: string[],
): string | null {
  const dateWindow = new Set(prevQtrDays);
  // Deduplicate by date (first occurrence wins) to guard against duplicate history entries.
  const seen = new Set<string>();
  const relevant = history.filter(e => {
    if (!dateWindow.has(e.date) || seen.has(e.date)) return false;
    seen.add(e.date);
    return true;
  });
  const setCount = relevant.length;
  if (setCount < 2) return null;
  const doneCount = relevant.filter(e => e.done === true).length;
  const pct = Math.round((doneCount / setCount) * 100);
  if (pct === 100) return `🌟 지난 분기 의도 달성률 100% — 완벽한 분기! (${setCount}/${setCount})`;
  if (pct >= 70) return `✅ 지난 분기 의도 달성률 ${pct}% — 훌륭해요! (${doneCount}/${setCount})`;
  if (pct >= 40) return `💡 지난 분기 의도 달성률 ${pct}% — 이번 분기엔 더 실천해봐요! (${doneCount}/${setCount})`;
  return `⚠️ 지난 분기 의도 달성률 ${pct}% — 의도를 실천하는 것이 중요해요! (${doneCount}/${setCount})`;
}

// Returns the yearly intention done-rate notification body for New Year's morning (Jan 1, 9:00+).
// prevYearDays: YYYY-MM-DD strings for every day of the previous calendar year (365 or 366 in leap years).
// Deduplicates by date (first occurrence wins) to guard against duplicate history entries.
// Returns null when fewer than 2 distinct entries fall within prevYearDays.
// Design: intentionHistory is capped at 35 days, so only the last ≤35 days of prevYearDays will match —
//   the preceding ~330 days of the previous year are not stored and are absent from the calculation.
// Exported for unit testing; pure function with no side effects.
export function calcYearlyIntentionReport(
  history: IntentionEntry[],
  prevYearDays: string[],
): string | null {
  const dateWindow = new Set(prevYearDays);
  // Deduplicate by date (first occurrence wins) to guard against duplicate history entries.
  const seen = new Set<string>();
  const relevant = history.filter(e => {
    if (!dateWindow.has(e.date) || seen.has(e.date)) return false;
    seen.add(e.date);
    return true;
  });
  const setCount = relevant.length;
  if (setCount < 2) return null;
  const doneCount = relevant.filter(e => e.done === true).length;
  const pct = Math.round((doneCount / setCount) * 100);
  if (pct === 100) return `🌟 지난 해 의도 달성률 100% — 완벽한 한 해! (${setCount}/${setCount})`;
  if (pct >= 70) return `✅ 지난 해 의도 달성률 ${pct}% — 훌륭해요! (${doneCount}/${setCount})`;
  if (pct >= 40) return `💡 지난 해 의도 달성률 ${pct}% — 올해엔 더 실천해봐요! (${doneCount}/${setCount})`;
  return `⚠️ 지난 해 의도 달성률 ${pct}% — 의도를 실천하는 것이 중요해요! (${doneCount}/${setCount})`;
}

// Returns the desktop notification body when todayIntentionDone transitions from falsy to true, null otherwise.
// Includes the intention text in quotes when non-empty; falls back to bare message for absent/whitespace-only text.
// Callers should pass the PREVIOUS value of todayIntentionDone to detect the false→true transition.
// Exported for unit testing; pure function with no side effects.
export function calcIntentionDoneNotify(
  done: boolean,
  prevDone: boolean | undefined,
  intentionText: string | undefined,
): string | null {
  if (!done || prevDone) return null;
  const trimmed = intentionText?.trim();
  return trimmed ? `✨ 오늘의 의도 달성! "${trimmed}"` : "✨ 오늘의 의도 달성!";
}

// Minimum number of days with a set intention required for a weekday's rate to be computed.
// Mirrors MIN_DOW_APPEARANCES in habits.ts — prevents spurious results from single-occurrence data.
const MIN_INTENTION_DOW_APPEARANCES = 2;

// Minimum intention done rate (0–100) for a weekday to qualify as "weak".
// 50% (vs. habits.ts WEAK_DAY_THRESHOLD=60): intentions are optional — a user setting an intention
// on only half their typical days for a weekday and failing >50% signals a genuine execution gap.
// Habits are tracked every day; intentions are discretionary, making a lower threshold appropriate.
const WEAK_INTENTION_DAY_THRESHOLD = 50;

// Minimum intention done rate (0–100) for a weekday to qualify as the "best" day.
// 80% mirrors BEST_DAY_THRESHOLD from habits.ts — a high-success rate signals a reliable execution day.
const BEST_INTENTION_DAY_THRESHOLD = 80;

// Computes intention done rate per weekday (0=Sun … 6=Sat) over the given day window.
// Rate = (done count / set count) * 100 for each weekday where a set intention was found in history.
// Days in dayWindow with no history entry are counted as "no intention set" (not as 0%-done).
// Deduplicates by date (first occurrence wins, mirrors all calcXxxIntentionReport functions) to
// guard against duplicate intentionHistory entries.
// Returns null for weekdays with fewer than MIN_INTENTION_DOW_APPEARANCES set intentions in the window.
// Returns all-null when history is empty or dayWindow is empty.
// Exported for unit testing; pure function with no side effects.
export function calcDayOfWeekIntentionDoneRate(
  history: IntentionEntry[],
  dayWindow: string[],
): Record<number, number | null> {
  const result: Record<number, number | null> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  if (history.length === 0 || dayWindow.length === 0) return result;

  // First occurrence wins (consistent with calcWeeklyIntentionReport and other report functions).
  const historyMap = new Map<string, IntentionEntry>();
  for (const e of history) {
    if (!historyMap.has(e.date)) historyMap.set(e.date, e);
  }

  const byDow: Record<number, { setCount: number; doneCount: number }> = {
    0: { setCount: 0, doneCount: 0 },
    1: { setCount: 0, doneCount: 0 },
    2: { setCount: 0, doneCount: 0 },
    3: { setCount: 0, doneCount: 0 },
    4: { setCount: 0, doneCount: 0 },
    5: { setCount: 0, doneCount: 0 },
    6: { setCount: 0, doneCount: 0 },
  };

  for (const day of dayWindow) {
    const entry = historyMap.get(day);
    if (!entry) continue; // no intention set on this day → skip
    const dow = new Date(day + "T00:00:00").getDay();
    byDow[dow].setCount++;
    if (entry.done === true) byDow[dow].doneCount++;
  }

  for (let dow = 0; dow <= 6; dow++) {
    const { setCount, doneCount } = byDow[dow];
    if (setCount < MIN_INTENTION_DOW_APPEARANCES) continue;
    result[dow] = Math.round((doneCount / setCount) * 100);
  }

  return result;
}

// Returns the weekday (0–6) with the lowest non-null done rate strictly below WEAK_INTENTION_DAY_THRESHOLD (50%).
// When multiple weekdays share the minimum rate, returns the lowest weekday number for stability.
// Returns null when no weekday has a non-null done rate below the threshold.
// Exported for unit testing; pure function with no side effects.
export function calcWeakIntentionDay(rates: Record<number, number | null>): number | null {
  let weakestDow: number | null = null;
  let weakestRate = WEAK_INTENTION_DAY_THRESHOLD; // strictly-below: must be < WEAK_INTENTION_DAY_THRESHOLD
  for (let dow = 0; dow <= 6; dow++) {
    const rate = rates[dow];
    if (rate === null) continue;
    if (rate < weakestRate) { weakestRate = rate; weakestDow = dow; }
  }
  return weakestDow;
}

// Returns the weekday (0–6) with the highest non-null done rate at or above BEST_INTENTION_DAY_THRESHOLD (80%).
// When multiple weekdays share the maximum rate, returns the lowest weekday number for stability.
// Returns null when no weekday has a non-null done rate at or above the threshold.
// Exported for unit testing; pure function with no side effects.
export function calcBestIntentionDay(rates: Record<number, number | null>): number | null {
  let bestDow: number | null = null;
  let bestRate: number | null = null;
  for (let dow = 0; dow <= 6; dow++) {
    const rate = rates[dow];
    if (rate === null || rate < BEST_INTENTION_DAY_THRESHOLD) continue;
    if (bestRate === null || rate > bestRate) { bestRate = rate; bestDow = dow; }
  }
  return bestDow;
}

/**
 * Computes the current calendar month's intention done rate (0–100 rounded integer).
 * Returns undefined when fewer than 14 intentions were set this month (insufficient sample).
 *
 * Counts entries in intentionHistory whose date matches the current YYYY-MM month prefix,
 * excluding todayStr (today's live state is provided separately via todayIntention/todayIntentionDone
 * to avoid double-counting — intentionHistory may include today's entry when it was persisted).
 * Adds today's live data when todayStr is within the current month and todayIntention is non-empty.
 *
 * MIN_MONTH_INTENTION_SETCOUNT = 14: same guard as habit_month_perfect; avoids early-month noise.
 * Exported for unit testing; pure function with no side effects.
 */
const MIN_MONTH_INTENTION_SETCOUNT = 14;
export function calcIntentionMonthDoneRate(
  history: IntentionEntry[],
  todayStr: string,
  todayIntention: string | undefined,
  todayIntentionDone: boolean | undefined,
): number | undefined {
  const monthPrefix = todayStr.slice(0, 7);
  // Exclude today: intentionHistory may already contain today's persisted entry.
  // Live state (todayIntention/todayIntentionDone) is the authoritative source for today.
  const monthHistory = history.filter(e => e.date.startsWith(monthPrefix) && e.date !== todayStr);
  const todaySet = !!(todayIntention?.trim());
  const todayDone = todaySet && todayIntentionDone === true;
  const setCount = monthHistory.length + (todaySet ? 1 : 0);
  const doneCount = monthHistory.filter(e => e.done === true).length + (todayDone ? 1 : 0);
  if (setCount < MIN_MONTH_INTENTION_SETCOUNT) return undefined;
  return Math.round((doneCount / setCount) * 100);
}
