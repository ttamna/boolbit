// ABOUTME: calcDailyScore — computes a 0-100 momentum score from today's habits, pomodoro, and intention
// ABOUTME: updateMomentumHistory, calcMomentumStreak, calcMomentumWeekAvg, calcMomentumWeekTrend — history management and derived stats

import type { MomentumEntry } from "../types";

export interface DailyScoreParams {
  /** Habits checked today */
  habitsCheckedToday: number;
  /** Total habit count */
  habitsTotal: number;
  /** Pomodoro focus sessions completed today */
  pomodoroToday: number;
  /** Optional daily pomodoro goal; 0/undefined = no goal (uses 3-session baseline) */
  pomodoroGoal?: number;
  /** Whether today's intention has been marked done */
  intentionDone: boolean;
  /** Whether today's intention was set (regardless of done status) */
  intentionSet: boolean;
}

export type ScoreTier = "high" | "mid" | "low";

export interface DailyScore {
  /** 0–100, integer */
  score: number;
  /** 'high' ≥75, 'mid' 40–74, 'low' <40 */
  tier: ScoreTier;
}

/**
 * Computes a 0–100 momentum score for the current day.
 *
 * Weights:
 *   Habits:    up to 50 pts  (habitsCheckedToday / habitsTotal × 50)
 *   Pomodoro:  up to 30 pts
 *     with goal:    min(sessions, goal) / goal × 30
 *     without goal: min(sessions, 3) / 3 × 30  (3-session baseline)
 *   Intention: done → 20 pts; set-not-done → 8 pts; not set → 0 pts
 */
export function calcDailyScore(params: DailyScoreParams): DailyScore {
  const {
    habitsCheckedToday,
    habitsTotal,
    pomodoroToday,
    pomodoroGoal,
    intentionDone,
    intentionSet,
  } = params;

  // Habits: 50 pts max — 0 habits means no contribution (not a penalty)
  const habitsScore =
    habitsTotal > 0
      ? (Math.min(habitsCheckedToday, habitsTotal) / habitsTotal) * 50
      : 0;

  // Pomodoro: 30 pts max — use explicit goal when set, else 3-session baseline
  const goalN = pomodoroGoal != null && pomodoroGoal > 0 ? pomodoroGoal : 3;
  const pomodoroScore = (Math.min(pomodoroToday, goalN) / goalN) * 30;

  // Intention: 20 pts done, 8 pts set-not-done, 0 pts not set
  const intentionScore = intentionDone ? 20 : intentionSet ? 8 : 0;

  const score = Math.round(Math.min(100, Math.max(0, habitsScore + pomodoroScore + intentionScore)));
  const tier: ScoreTier = score >= 75 ? "high" : score >= 40 ? "mid" : "low";

  return { score, tier };
}

// 14-day cap: last 7 entries = "this week", first 7 = "prev week" for week-over-week comparison.
const MOMENTUM_HISTORY_CAP = 14;

/**
 * Upserts today's momentum score into a rolling 14-day history array.
 * - If today's date already exists, updates its score and tier.
 * - Otherwise appends a new entry (newest last).
 * - Caps the array at 14 entries, dropping the oldest when exceeded.
 */
export function updateMomentumHistory(
  history: MomentumEntry[],
  today: string,
  score: number,
  tier: ScoreTier,
): MomentumEntry[] {
  const idx = history.findIndex(e => e.date === today);
  let next: MomentumEntry[];
  if (idx >= 0) {
    next = history.map((e, i) => i === idx ? { ...e, score, tier } : e);
  } else {
    next = [...history, { date: today, score, tier }];
  }
  // Keep only the most recent MOMENTUM_HISTORY_CAP entries (newest last)
  return next.length > MOMENTUM_HISTORY_CAP ? next.slice(next.length - MOMENTUM_HISTORY_CAP) : next;
}

/**
 * Returns the count of consecutive "high" tier entries with no date gaps ending at the most recent entry.
 * "Consecutive" means both tier==="high" AND adjacent dates differ by exactly 1 calendar day.
 * Returns 0 when: history is empty, the last entry is not "high", or date gaps exist.
 */
export function calcMomentumStreak(history: MomentumEntry[]): number {
  if (history.length === 0) return 0;
  if (history[history.length - 1].tier !== "high") return 0;
  let count = 1;
  for (let i = history.length - 1; i >= 1; i--) {
    const prev = history[i - 1];
    const curr = history[i];
    if (prev.tier !== "high") break;
    // Dates must be exactly 1 calendar day apart (no gaps allowed in a "consecutive" streak).
    // UTC midnight avoids DST-related discrepancies on local timezone transitions.
    const prevTs = new Date(prev.date + "T00:00:00Z").getTime();
    const currTs = new Date(curr.date + "T00:00:00Z").getTime();
    if (Math.round((currTs - prevTs) / 86400000) !== 1) break;
    count++;
  }
  return count;
}

/**
 * Returns the rounded average score for the most recent 7 entries ("this week").
 * Uses slice(-7) so callers passing the full 14-day history get the current-week average only.
 * Returns null when history is empty.
 */
export function calcMomentumWeekAvg(history: MomentumEntry[]): number | null {
  const week = history.slice(-7);
  if (week.length === 0) return null;
  const sum = week.reduce((acc, e) => acc + e.score, 0);
  return Math.round(sum / week.length);
}

/**
 * Returns a week-over-week momentum trend by comparing the most recent 7 entries (this week)
 * to all earlier entries (prev week window).
 * - "↑" when this week avg exceeds prev week avg by more than 2 (noise margin).
 * - "↓" when this week avg is below prev week avg by more than 2.
 * - "→" when the delta is within ±2 (stable, suppresses noise).
 * - null when history has fewer than 8 entries (insufficient data for comparison).
 */
export function calcMomentumWeekTrend(history: MomentumEntry[]): "↑" | "↓" | "→" | null {
  if (history.length < 8) return null;
  const thisWeek = history.slice(-7);
  // Anchored to the 14-day window: positions [-14, -7) regardless of total history length.
  // This keeps "prev week" capped at 7 entries even if the caller passes a longer array.
  const prevWeek = history.slice(-14, -7);
  if (prevWeek.length === 0) return null;
  const thisAvg = Math.round(thisWeek.reduce((s, e) => s + e.score, 0) / thisWeek.length);
  const prevAvg = Math.round(prevWeek.reduce((s, e) => s + e.score, 0) / prevWeek.length);
  const delta = thisAvg - prevAvg;
  if (Math.abs(delta) <= 2) return "→";
  return delta > 0 ? "↑" : "↓";
}
