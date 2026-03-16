// ABOUTME: calcDailyScore — computes a 0-100 momentum score from today's habits, pomodoro, and intention
// ABOUTME: updateMomentumHistory — upserts today's score into rolling 7-day history; calcMomentumStreak — consecutive qualifying days (score≥40); calcMomentumWeekAvg — 7-day average score; calcMomentumTrend — 3-day strict monotone trend detection

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
  /** Raw (pre-rounding) contribution of each component — habits 0–50, pomodoro 0–30, intention 0/8/20 */
  breakdown: {
    habits: number;
    pomodoro: number;
    intention: number;
  };
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

  return { score, tier, breakdown: { habits: habitsScore, pomodoro: pomodoroScore, intention: intentionScore } };
}

const MOMENTUM_HISTORY_CAP = 7;

/**
 * Upserts today's momentum score into a rolling 7-day history array.
 * - If today's date already exists, updates its score and tier.
 * - Otherwise appends a new entry (newest last).
 * - Caps the array at 7 entries, dropping the oldest when exceeded.
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

// Minimum score to count a day as a qualifying momentum day (mid-tier threshold matches calcDailyScore).
const MOMENTUM_STREAK_MIN_SCORE = 40;

/**
 * Returns the number of consecutive qualifying days (score ≥ 40) ending at or before todayStr.
 *
 * - If today's entry is present and score ≥ 40: count includes today.
 * - If today's entry is absent OR score < 40: start from yesterday (streak still alive —
 *   momentum score updates in real-time so a low score early in the day does not conclusively
 *   end the streak; the user still has the rest of today to improve).
 *   Differs from calcFocusStreak: a session count of 0 means "nothing done yet today" (discrete),
 *   whereas a momentum score of e.g. 10 at 9 AM is a live in-progress value (continuous).
 * - Stops at the first day where the entry is absent or score < 40.
 * - Future history entries (date > todayStr) are safely ignored: daysBack starts at 0 (today)
 *   or 1 (yesterday) and walks backward, so later dates are never reached.
 *
 * Pure function with no side effects.
 */
export function calcMomentumStreak(history: MomentumEntry[], todayStr: string): number {
  const dateMap = new Map<string, MomentumEntry>(history.map(e => [e.date, e]));
  const parts = todayStr.split("-").map(Number);
  const [yr, mo, day] = parts;
  const todayEntry = dateMap.get(todayStr);
  // Start from today when score already qualifies; fall back to yesterday otherwise.
  let daysBack = (todayEntry !== undefined && todayEntry.score >= MOMENTUM_STREAK_MIN_SCORE) ? 0 : 1;
  let streak = 0;
  while (true) {
    const cur = new Date(yr, mo - 1, day - daysBack); // local time — no TZ shift risk
    const dateKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    const entry = dateMap.get(dateKey);
    if (!entry || entry.score < MOMENTUM_STREAK_MIN_SCORE) break;
    streak++;
    daysBack++;
  }
  return streak;
}

/**
 * Returns the rounded average momentum score across the provided history window.
 * history is expected to be the rolling 7-day array managed by updateMomentumHistory
 * (capped at MOMENTUM_HISTORY_CAP=7) — the "Week" in the name reflects that contract.
 * Returns null when there are fewer than 2 entries — a single data point does not
 * constitute a meaningful window average.
 */
export function calcMomentumWeekAvg(history: MomentumEntry[]): number | null {
  if (history.length < 2) return null;
  const total = history.reduce((sum, e) => sum + e.score, 0);
  return Math.round(total / history.length);
}

/** "declining" = 3 consecutive days each strictly lower than the day before; "rising" = strictly higher. */
export type MomentumTrend = "declining" | "rising" | "stable";

/**
 * Detects the recent momentum trend by comparing the last 3 consecutive calendar days.
 * Returns null when any of the 3 calendar days lacks a history entry (insufficient data).
 * todayStr is injected for testability (YYYY-MM-DD, local time).
 *
 * Design note: today's live in-progress score is intentionally included (today < yesterday < 2-days-ago
 * = "declining"). An early-morning low score may trigger a transient "declining" that resolves as the
 * day progresses. This is the same trade-off as the sparkline score: real-time feedback over stability.
 * Contrast: calcMomentumStreak falls back to yesterday when today's score is not yet qualifying,
 * because a session count of 0 is discrete ("nothing done"), whereas a momentum score of 10 at 9 AM
 * is a continuous live value ("day not over").
 */
export function calcMomentumTrend(history: MomentumEntry[], todayStr: string): MomentumTrend | null {
  const scoreMap = new Map<string, number>(history.map(e => [e.date, e.score]));
  const [yr, mo, day] = todayStr.split("-").map(Number);
  const scores: number[] = [];
  for (let back = 2; back >= 0; back--) {
    const d = new Date(yr, mo - 1, day - back); // local calendar arithmetic — DST-safe
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const score = scoreMap.get(key);
    if (score === undefined) return null;
    scores.push(score);
  }
  // scores[0]=2daysAgo, scores[1]=yesterday, scores[2]=today
  if (scores[2] < scores[1] && scores[1] < scores[0]) return "declining";
  if (scores[2] > scores[1] && scores[1] > scores[0]) return "rising";
  return "stable";
}
