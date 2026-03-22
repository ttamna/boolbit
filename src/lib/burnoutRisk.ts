// ABOUTME: Cross-domain burnout early-warning — combines momentum crash, habit erosion, focus drought, and intention disconnect
// ABOUTME: Returns 0-100 risk score with level (low/moderate/high/critical) and active factor list

export interface BurnoutRiskParams {
  /** Rolling momentum history (up to 31 days, newest last or any order). */
  momentumHistory: Array<{ date: string; score: number }>;
  /** Current habit states (only streak is used for erosion scoring). */
  habits: Array<{ streak: number }>;
  /** Recent pomodoro day entries (only days with sessions). */
  pomodoroHistory: Array<{ date: string; count: number }>;
  /** Recent intention entries. */
  intentionHistory: Array<{ date: string; text: string; done?: boolean }>;
  /** YYYY-MM-DD for the current calendar day. */
  todayStr: string;
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export type BurnoutFactor = "momentum_crash" | "habit_erosion" | "focus_drought" | "intention_disconnect";

export interface BurnoutRisk {
  /** 0–100, integer. Higher = more risk. */
  score: number;
  /** Categorized risk level. */
  level: RiskLevel;
  /** Active contributing factors (empty when score = 0). */
  factors: BurnoutFactor[];
}

/** Minimum momentum history entries required for analysis. */
export const MIN_HISTORY_DAYS = 7;

// Signal weight caps
const MOMENTUM_CRASH_CAP = 35;
const HABIT_EROSION_CAP = 25;
const FOCUS_DROUGHT_CAP = 25;
const INTENTION_DISCONNECT_CAP = 15;

// Momentum crash: minimum drop to register as a factor
const MOMENTUM_CRASH_THRESHOLD = 10;

// Focus drought: minimum consecutive dry days to register
const FOCUS_DROUGHT_THRESHOLD = 3;

// Intention disconnect: minimum gap days (out of 7) to register
const INTENTION_DISCONNECT_THRESHOLD = 4;

// Focus drought: max lookback days from yesterday
const DROUGHT_LOOKBACK = 7;

// Intention analysis window (days)
const INTENTION_WINDOW = 7;

/**
 * Detects burnout risk by combining 4 cross-domain signals.
 *
 * Signals:
 *   1. Momentum crash (0-35):  avg(recent 3 days) vs avg(prior days) drop
 *   2. Habit erosion (0-25):   proportion of habits with streak = 0
 *   3. Focus drought (0-25):   consecutive days without pomodoro sessions
 *   4. Intention disconnect (0-15): days without intention set or done in last 7
 *
 * Design: empty domain data (no habits, no pomodoro, no intentions) is treated as
 * "user doesn't use this feature" → 0 contribution, not a risk signal.
 *
 * Returns null when momentum history has fewer than MIN_HISTORY_DAYS entries.
 * Pure function with no side effects.
 */
export function calcBurnoutRisk(params: BurnoutRiskParams): BurnoutRisk | null {
  const { momentumHistory, habits, pomodoroHistory, intentionHistory, todayStr } = params;

  if (momentumHistory.length < MIN_HISTORY_DAYS) return null;

  const factors: BurnoutFactor[] = [];

  const s1 = scoreMomentumCrash(momentumHistory, todayStr);
  if (s1 > 0) factors.push("momentum_crash");

  const s2 = scoreHabitErosion(habits);
  if (s2 > 0) factors.push("habit_erosion");

  const s3 = scoreFocusDrought(pomodoroHistory, todayStr);
  if (s3 > 0) factors.push("focus_drought");

  const s4 = scoreIntentionDisconnect(intentionHistory, todayStr);
  if (s4 > 0) factors.push("intention_disconnect");

  const score = Math.min(100, Math.round(s1 + s2 + s3 + s4));
  const level: RiskLevel =
    score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "moderate" : "low";

  return { score, level, factors };
}

/** Returns YYYY-MM-DD for N days before todayStr. */
function dateBack(todayStr: string, n: number): string {
  const [y, m, d] = todayStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - n));
  return dt.toISOString().slice(0, 10);
}

/**
 * Signal 1: Momentum crash (0-35).
 * Compares avg of most recent 3 calendar days vs avg of prior days (day 4+).
 * A 1-point drop contributes 1 point to the score; capped at 35.
 * Only fires when drop ≥ MOMENTUM_CRASH_THRESHOLD (10).
 */
function scoreMomentumCrash(
  history: Array<{ date: string; score: number }>,
  todayStr: string,
): number {
  const scoreMap = new Map<string, number>();
  for (const e of history) scoreMap.set(e.date, e.score);

  // Recent 3 days: today, yesterday, 2 days ago
  const recentDates = [0, 1, 2].map(n => dateBack(todayStr, n));
  const recentScores = recentDates.map(d => scoreMap.get(d)).filter((s): s is number => s !== undefined);

  // Prior days: day 3+ backwards (all remaining history entries not in recent window)
  const recentSet = new Set(recentDates);
  const priorScores = history.filter(e => !recentSet.has(e.date)).map(e => e.score);

  if (recentScores.length === 0 || priorScores.length === 0) return 0;

  const recentAvg = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;
  const priorAvg = priorScores.reduce((s, v) => s + v, 0) / priorScores.length;

  const drop = priorAvg - recentAvg;
  if (drop < MOMENTUM_CRASH_THRESHOLD) return 0;

  // Scale: drop of 10 → ~10pts, drop of 35+ → 35pts (cap)
  return Math.min(drop, MOMENTUM_CRASH_CAP);
}

/**
 * Signal 2: Habit erosion (0-25).
 * Score = (dormant habits / total habits) * 25.
 * No habits → 0 (feature unused, not a risk signal).
 */
function scoreHabitErosion(habits: Array<{ streak: number }>): number {
  if (habits.length === 0) return 0;

  const dormantCount = habits.filter(h => h.streak === 0).length;
  if (dormantCount === 0) return 0;

  return Math.round((dormantCount / habits.length) * HABIT_EROSION_CAP);
}

/**
 * Signal 3: Focus drought (0-25).
 * Counts consecutive days (from yesterday backwards) with no pomodoro entry.
 * Score = min(consecutiveDryDays * 5, 25). Only fires at ≥ FOCUS_DROUGHT_THRESHOLD days.
 * Empty pomodoroHistory → 0 (feature unused, not a drought).
 */
function scoreFocusDrought(
  pomodoroHistory: Array<{ date: string; count: number }>,
  todayStr: string,
): number {
  // No history with actual sessions = user doesn't use pomodoro → not a drought signal
  const pomoDates = new Set(pomodoroHistory.filter(e => e.count > 0).map(e => e.date));
  if (pomoDates.size === 0) return 0;

  let consecutiveDry = 0;
  for (let i = 1; i <= DROUGHT_LOOKBACK; i++) {
    const d = dateBack(todayStr, i);
    if (pomoDates.has(d)) break;
    consecutiveDry++;
  }

  if (consecutiveDry < FOCUS_DROUGHT_THRESHOLD) return 0;

  return Math.min(consecutiveDry * 5, FOCUS_DROUGHT_CAP);
}

/**
 * Signal 4: Intention disconnect (0-15).
 * In the past INTENTION_WINDOW days (excluding today): count days without intention set or done.
 * Excludes today to avoid false positives before the user opens the widget (matches scoreFocusDrought).
 * Score = min(gapDays * (15/7), 15). Only fires at ≥ INTENTION_DISCONNECT_THRESHOLD gap days.
 * Empty intentionHistory → 0 (feature unused, not a disconnect).
 */
function scoreIntentionDisconnect(
  intentionHistory: Array<{ date: string; text: string; done?: boolean }>,
  todayStr: string,
): number {
  if (intentionHistory.length === 0) return 0;

  // Build window of past INTENTION_WINDOW days (yesterday backwards — excludes today)
  const windowDates = new Set<string>();
  for (let i = 1; i <= INTENTION_WINDOW; i++) {
    windowDates.add(dateBack(todayStr, i));
  }

  const intentionMap = new Map<string, { text: string; done?: boolean }>();
  for (const e of intentionHistory) {
    if (windowDates.has(e.date)) intentionMap.set(e.date, e);
  }

  // Count gap days: no entry, empty text, or explicitly not done (done === false).
  // done === undefined on past days is treated as not done (user never marked completion).
  let gapDays = 0;
  for (const date of windowDates) {
    const entry = intentionMap.get(date);
    if (!entry || !entry.text || !entry.done) {
      gapDays++;
    }
  }

  if (gapDays < INTENTION_DISCONNECT_THRESHOLD) return 0;

  return Math.min(Math.round(gapDays * (INTENTION_DISCONNECT_CAP / INTENTION_WINDOW)), INTENTION_DISCONNECT_CAP);
}
