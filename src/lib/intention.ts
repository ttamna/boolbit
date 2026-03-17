// ABOUTME: Pure helpers for intention streak, consecutive-done streak, 7-day heatmap, week-over-week trend, done-notification, morning reminder, and evening reminder logic
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
