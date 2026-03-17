// ABOUTME: calcDailyScore — computes a 0-100 momentum score from today's habits, pomodoro, and intention
// ABOUTME: updateMomentumHistory — upserts today's score into rolling 31-day history; calcMomentumStreak — consecutive qualifying days (score≥40); calcMomentumWeekAvg — 7-day average score; calcMomentumTrend — 3-day strict monotone trend detection; calcMomentumEveningDigest — end-of-day score summary notification body; calcMomentumMorningReminder — morning notification showing yesterday's score; calcWeeklyMomentumReport — Monday morning last-week avg + tier distribution report; calcMonthlyMomentumReport — 1st-of-month previous calendar month avg + tier distribution report; calcQuarterlyMomentumReport — quarter-start morning previous quarter avg + tier distribution report; calcYearlyMomentumReport — Jan 1 morning previous year avg + tier distribution report; calcDayOfWeekMomentumAvg/calcWeakMomentumDay/calcBestMomentumDay — per-weekday avg score for todayIsWeakMomentumDay/todayIsBestMomentumDay insight params

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

const MOMENTUM_HISTORY_CAP = 31;

/**
 * Upserts today's momentum score into a rolling 31-day history array.
 * - If today's date already exists, updates its score and tier.
 * - Otherwise appends a new entry (newest last).
 * - Caps the array at 31 entries, dropping the oldest when exceeded.
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
 * Returns the rounded average momentum score across the provided history entries.
 * Callers typically pass the full rolling history (up to 31 days) and rely on the average
 * as a "recent weeks" signal — the "Week" in the name reflects the original 7-day contract.
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

// Returns the evening digest notification body summarising today's momentum score.
// score 0 → null (user had no activity; avoids a demoralising "0점" push at end of day).
// Tier determines the tone: high=🔥 celebratory, mid=✅ positive, low=💪 encouraging.
// Exported for unit testing; pure function with no side effects.
export function calcMomentumEveningDigest(score: number, tier: "high" | "mid" | "low"): string | null {
  if (score <= 0) return null;
  if (tier === "high") return `🔥 오늘 모멘텀 ${score}점 — 고점 달성! 이 흐름 유지해요`;
  if (tier === "mid") return `✅ 오늘 모멘텀 ${score}점 — 괜찮은 하루였어요`;
  return `💪 오늘 모멘텀 ${score}점 — 내일은 더 힘내봐요!`;
}

// Returns the morning notification body showing yesterday's momentum score.
// yesterdayStr: YYYY-MM-DD for the previous calendar day (caller derives via toLocaleDateString("sv") of yesterday).
// Returns null when no history entry for yesterdayStr exists, or when score ≤ 0.
// Tier determines the tone: high=🔥 carry momentum forward, mid=✅ encouragement, low=💪 motivational reset.
// Mirrors calcMomentumEveningDigest emoji/tier conventions so the two notifications feel cohesive.
// Hour/date guards live in the caller (App.tsx useEffect) — fires at 09:00+ via momentumMorningRemindDate guard.
// Exported for unit testing; pure function with no side effects.
export function calcMomentumMorningReminder(history: MomentumEntry[], yesterdayStr: string): string | null {
  const entry = history.find(e => e.date === yesterdayStr);
  if (!entry || entry.score <= 0) return null;
  if (entry.tier === "high") return `🔥 어제 모멘텀 ${entry.score}점 — 최고야! 오늘도 이어가요`;
  if (entry.tier === "mid") return `✅ 어제 모멘텀 ${entry.score}점 — 잘 했어요! 오늘도 달려봐요`;
  return `💪 어제 모멘텀 ${entry.score}점 — 오늘은 더 높여봐요!`;
}

/**
 * Returns the Monday morning report for the previous week's average momentum score and tier distribution.
 * last7Days: 7 YYYY-MM-DD strings ending yesterday — caller's responsibility to build this window.
 * history: rolling MomentumEntry array; only entries whose date is in last7Days are used.
 * Returns null when fewer than 3 entries fall within the window (insufficient data for a meaningful report).
 * Tier distribution format: "🔥N ✅N 💪N" — zero-count tiers are omitted.
 * Lead emoji mirrors calcMomentumEveningDigest tier thresholds: avg≥75=🔥, avg≥40=✅, else=💪.
 * Exported for unit testing; pure function with no side effects.
 */
export function calcWeeklyMomentumReport(history: MomentumEntry[], last7Days: string[]): string | null {
  const window = new Set(last7Days);
  const entries = history.filter(e => window.has(e.date));
  if (entries.length < 3) return null;

  const avg = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);

  const highDays = entries.filter(e => e.tier === "high").length;
  const midDays = entries.filter(e => e.tier === "mid").length;
  const lowDays = entries.filter(e => e.tier === "low").length;

  const tierParts = [
    highDays > 0 ? `🔥${highDays}` : null,
    midDays > 0 ? `✅${midDays}` : null,
    lowDays > 0 ? `💪${lowDays}` : null,
  ].filter(Boolean).join(" ");

  const dist = tierParts ? ` (${tierParts})` : "";

  if (avg >= 75) return `🔥 지난주 모멘텀 평균 ${avg}점 — 최고의 한 주!${dist}`;
  if (avg >= 40) return `✅ 지난주 모멘텀 평균 ${avg}점 — 잘 하고 있어요!${dist}`;
  return `💪 지난주 모멘텀 평균 ${avg}점 — 이번 주엔 더 힘내봐요!${dist}`;
}

/**
 * Returns the 1st-of-month morning retrospective for the previous calendar month's momentum.
 * prevMonthDays: YYYY-MM-DD strings for every day of the previous calendar month (28–31 entries).
 * history: rolling MomentumEntry array; only entries whose date is in prevMonthDays are used.
 * Returns null when fewer than 10 entries fall within the window (insufficient data for a meaningful report).
 * Tier distribution format: "🔥N ✅N 💪N" — zero-count tiers are omitted.
 * Lead emoji mirrors calcWeeklyMomentumReport tier thresholds: avg≥75=🔥, avg≥40=✅, else=💪.
 * Hour/day guards (1st of month, getHours() >= 9) live in the caller (App.tsx useEffect).
 * Callers check monthlyMomentumReportDate before invoking to ensure once-per-month delivery.
 * Exported for unit testing; pure function with no side effects.
 */
export function calcMonthlyMomentumReport(history: MomentumEntry[], prevMonthDays: string[]): string | null {
  const window = new Set(prevMonthDays);
  const entries = history.filter(e => window.has(e.date));
  if (entries.length < 10) return null;

  const avg = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);

  const highDays = entries.filter(e => e.tier === "high").length;
  const midDays = entries.filter(e => e.tier === "mid").length;
  const lowDays = entries.filter(e => e.tier === "low").length;

  const tierParts = [
    highDays > 0 ? `🔥${highDays}` : null,
    midDays > 0 ? `✅${midDays}` : null,
    lowDays > 0 ? `💪${lowDays}` : null,
  ].filter(Boolean).join(" ");

  const dist = tierParts ? ` (${tierParts})` : "";

  if (avg >= 75) return `🔥 지난달 모멘텀 평균 ${avg}점 — 최고의 한 달!${dist}`;
  if (avg >= 40) return `✅ 지난달 모멘텀 평균 ${avg}점 — 잘 하고 있어요!${dist}`;
  return `💪 지난달 모멘텀 평균 ${avg}점 — 이번 달엔 더 힘내봐요!${dist}`;
}

/**
 * Returns the quarter-start morning retrospective for the previous quarter's momentum.
 * prevQtrDays: YYYY-MM-DD strings for every day of the previous quarter (90–92 entries).
 * history: rolling MomentumEntry array; only entries whose date is in prevQtrDays are used.
 * Returns null when fewer than 10 entries fall within the window (insufficient data for a meaningful report).
 * Tier distribution format: "🔥N ✅N 💪N" — zero-count tiers are omitted.
 * Lead emoji mirrors calcMonthlyMomentumReport tier thresholds: avg≥75=🔥, avg≥40=✅, else=💪.
 * Design note: momentumHistory is capped at 31 days (MOMENTUM_HISTORY_CAP), so at most the last ≤31
 *   days of the quarter will match — effective data window is the same ≤31 entries as calcMonthlyMomentumReport.
 *   The minimum-entry threshold (10) is shared with calcMonthlyMomentumReport for this reason.
 * Hour/day guards (quarter-start, getHours() >= 9) live in the caller (App.tsx useEffect).
 * Callers check quarterlyMomentumReportDate before invoking to ensure once-per-quarter delivery.
 * Exported for unit testing; pure function with no side effects.
 */
export function calcQuarterlyMomentumReport(history: MomentumEntry[], prevQtrDays: string[]): string | null {
  const window = new Set(prevQtrDays);
  const entries = history.filter(e => window.has(e.date));
  if (entries.length < 10) return null;

  const avg = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);

  const highDays = entries.filter(e => e.tier === "high").length;
  const midDays = entries.filter(e => e.tier === "mid").length;
  const lowDays = entries.filter(e => e.tier === "low").length;

  const tierParts = [
    highDays > 0 ? `🔥${highDays}` : null,
    midDays > 0 ? `✅${midDays}` : null,
    lowDays > 0 ? `💪${lowDays}` : null,
  ].filter(Boolean).join(" ");

  const dist = tierParts ? ` (${tierParts})` : "";

  if (avg >= 75) return `🔥 지난 분기 모멘텀 평균 ${avg}점 — 최고의 한 분기!${dist}`;
  if (avg >= 40) return `✅ 지난 분기 모멘텀 평균 ${avg}점 — 잘 하고 있어요!${dist}`;
  return `💪 지난 분기 모멘텀 평균 ${avg}점 — 이번 분기엔 더 힘내봐요!${dist}`;
}

/**
 * Returns the New Year's morning retrospective for the previous year's momentum.
 * prevYearDays: YYYY-MM-DD strings for every day of the previous calendar year (365 or 366 in leap years).
 * history: rolling MomentumEntry array; only entries whose date is in prevYearDays are used.
 * Returns null when fewer than 10 entries fall within the window (insufficient data for a meaningful report).
 * Tier distribution format: "🔥N ✅N 💪N" — zero-count tiers are omitted.
 * Lead emoji mirrors calcQuarterlyMomentumReport tier thresholds: avg≥75=🔥, avg≥40=✅, else=💪.
 * Design note: momentumHistory is capped at 31 days (MOMENTUM_HISTORY_CAP), so at most the last ≤31
 *   days of the year will match — effective data window is the same ≤31 entries as calcMonthlyMomentumReport.
 *   The minimum-entry threshold (10) is shared with calcMonthlyMomentumReport for this reason.
 * Hour/day guards (Jan 1, getHours() >= 9) live in the caller (App.tsx useEffect).
 * Callers check yearlyMomentumReportDate before invoking to ensure once-per-year delivery.
 * Exported for unit testing; pure function with no side effects.
 */
export function calcYearlyMomentumReport(history: MomentumEntry[], prevYearDays: string[]): string | null {
  const window = new Set(prevYearDays);
  const entries = history.filter(e => window.has(e.date));
  if (entries.length < 10) return null;

  const avg = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);

  const highDays = entries.filter(e => e.tier === "high").length;
  const midDays = entries.filter(e => e.tier === "mid").length;
  const lowDays = entries.filter(e => e.tier === "low").length;

  const tierParts = [
    highDays > 0 ? `🔥${highDays}` : null,
    midDays > 0 ? `✅${midDays}` : null,
    lowDays > 0 ? `💪${lowDays}` : null,
  ].filter(Boolean).join(" ");

  const dist = tierParts ? ` (${tierParts})` : "";

  if (avg >= 75) return `🔥 지난 해 모멘텀 평균 ${avg}점 — 최고의 한 해!${dist}`;
  if (avg >= 40) return `✅ 지난 해 모멘텀 평균 ${avg}점 — 잘 하고 있어요!${dist}`;
  return `💪 지난 해 모멘텀 평균 ${avg}점 — 이번 해엔 더 힘내봐요!${dist}`;
}

// Minimum history entries per weekday required to include that day in the analysis.
const MIN_DOW_MOMENTUM_APPEARANCES = 2;
// Average momentum score must be strictly below this threshold to flag a day as "weak".
// Mirrors the low-tier boundary (score < 40) from calcDailyScore tier logic.
const WEAK_MOMENTUM_DAY_THRESHOLD = 40;
// Average momentum score must meet or exceed this threshold to flag a day as "best".
// Chosen above the mid-tier midpoint to select reliably high-performing days.
const BEST_MOMENTUM_DAY_THRESHOLD = 65;

// Returns average momentum score per calendar day for each weekday (0=Sun … 6=Sat).
// Only days in dayWindow that have a history entry are counted; absent days are not treated as 0
// (unlike pomodoro, a missing momentum entry signals no data, not zero productivity).
// Returns null for a given weekday when it has fewer than MIN_DOW_MOMENTUM_APPEARANCES history entries
// in dayWindow — insufficient data for a meaningful pattern.
// Returns all-null when dayWindow is empty or history is empty.
// Exported for unit testing; pure function with no side effects.
export function calcDayOfWeekMomentumAvg(
  history: MomentumEntry[],
  dayWindow: string[],
): Record<number, number | null> {
  const result: Record<number, number | null> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  if (history.length === 0 || dayWindow.length === 0) return result;

  const historyMap = new Map<string, number>();
  for (const e of history) {
    if (!historyMap.has(e.date)) historyMap.set(e.date, e.score);
  }

  const byDow: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  const windowSet = new Set(dayWindow);
  for (const [date, score] of historyMap) {
    if (!windowSet.has(date)) continue;
    const dow = new Date(date + "T00:00:00").getDay();
    byDow[dow].push(score);
  }

  for (let dow = 0; dow <= 6; dow++) {
    const scores = byDow[dow];
    if (scores.length < MIN_DOW_MOMENTUM_APPEARANCES) continue;
    result[dow] = scores.reduce((s, v) => s + v, 0) / scores.length;
  }

  return result;
}

// Returns the weekday (0–6) with the lowest non-null average strictly below WEAK_MOMENTUM_DAY_THRESHOLD (40).
// When multiple weekdays share the minimum average, returns the lowest weekday number for stability.
// Returns null when no weekday has a non-null average below the threshold.
// Exported for unit testing; pure function with no side effects.
export function calcWeakMomentumDay(avgMap: Record<number, number | null>): number | null {
  let weakestDow: number | null = null;
  let weakestAvg = WEAK_MOMENTUM_DAY_THRESHOLD;
  for (let dow = 0; dow <= 6; dow++) {
    const avg = avgMap[dow];
    if (avg === null) continue;
    if (avg < weakestAvg) { weakestAvg = avg; weakestDow = dow; }
  }
  return weakestDow;
}

// Returns the weekday (0–6) with the highest non-null average at or above BEST_MOMENTUM_DAY_THRESHOLD (65).
// When multiple weekdays share the maximum average, returns the lowest weekday number for stability
// (strict > means the first/lowest DoW encountered in the 0→6 loop wins on a tie).
// Returns null when no weekday has a non-null average at or above the threshold.
// Exported for unit testing; pure function with no side effects.
export function calcBestMomentumDay(avgMap: Record<number, number | null>): number | null {
  let bestDow: number | null = null;
  let bestAvg: number | null = null;
  for (let dow = 0; dow <= 6; dow++) {
    const avg = avgMap[dow];
    if (avg === null || avg < BEST_MOMENTUM_DAY_THRESHOLD) continue;
    if (bestAvg === null || avg > bestAvg) { bestAvg = avg; bestDow = dow; }
  }
  return bestDow;
}
