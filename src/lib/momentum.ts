// ABOUTME: calcDailyScore — computes a 0-100 momentum score from today's habits, pomodoro, and intention
// ABOUTME: Pure function; combines habit completion rate, pomodoro progress, and intention state

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
