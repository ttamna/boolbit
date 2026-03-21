// ABOUTME: Cross-domain weekday productivity profile — unifies habit/pomodoro/intention/momentum per-weekday data
// ABOUTME: Computes composite score per weekday and identifies overall best/worst days; pure function

export interface WeekdaySlot {
  /** Habit completion rate (0-100) for this weekday, or null if insufficient data. */
  habitRate: number | null;
  /** Average pomodoro sessions for this weekday (raw count, not normalized), or null. */
  pomodoroAvg: number | null;
  /** Intention done rate (0-100) for this weekday, or null. */
  intentionRate: number | null;
  /** Average momentum score (0-100) for this weekday, or null. */
  momentumAvg: number | null;
  /** Composite productivity score (0-100): average of available normalized domain metrics. null when no domain has data. */
  composite: number | null;
}

export interface WeekdayProfile {
  /** Per-weekday data, keyed 0 (Sunday) through 6 (Saturday). */
  days: Record<number, WeekdaySlot>;
  /** Weekday (0-6) with highest composite. null when no weekday has a composite. Ties prefer lower weekday. */
  bestDay: number | null;
  /** Weekday (0-6) with lowest composite. null when no weekday has a composite. Ties prefer lower weekday. */
  worstDay: number | null;
}

export interface WeekdayProfileParams {
  /** Per-weekday habit completion rates (0-100 or null), keyed 0-6. From calcDayOfWeekHabitRates. */
  habitRates: Record<number, number | null>;
  /** Per-weekday average pomodoro session counts (or null), keyed 0-6. From calcDayOfWeekPomodoroAvg. */
  pomodoroAvgs: Record<number, number | null>;
  /** Per-weekday intention done rates (0-100 or null), keyed 0-6. From calcDayOfWeekIntentionDoneRate. */
  intentionRates: Record<number, number | null>;
  /** Per-weekday average momentum scores (0-100 or null), keyed 0-6. From calcDayOfWeekMomentumAvg. */
  momentumAvgs: Record<number, number | null>;
  /** Pomodoro session goal for normalization. 0/absent/null = default 3 (matches calcDailyScore). */
  pomodoroGoal?: number;
}

// Default pomodoro session baseline when no explicit goal is set.
// Mirrors calcDailyScore in momentum.ts: `pomodoroGoal != null && pomodoroGoal > 0 ? pomodoroGoal : 3`.
const DEFAULT_POMODORO_GOAL = 3;

/**
 * Builds a unified weekday productivity profile from per-domain day-of-week data.
 *
 * Each weekday slot contains the raw per-domain values plus a composite score.
 * Composite: rounded average of available normalized metrics (all on 0-100 scale).
 * Pomodoro is normalized via `min(avg / goal, 1) * 100`; other domains are already 0-100.
 *
 * bestDay/worstDay: weekdays with highest/lowest composite. Ties prefer lower weekday number.
 * Pure function with no side effects.
 */
export function calcWeekdayProfile(params: WeekdayProfileParams): WeekdayProfile {
  const { habitRates, pomodoroAvgs, intentionRates, momentumAvgs, pomodoroGoal } = params;
  const goalN = pomodoroGoal != null && pomodoroGoal > 0 ? pomodoroGoal : DEFAULT_POMODORO_GOAL;

  const days: Record<number, WeekdaySlot> = {};

  for (let dow = 0; dow <= 6; dow++) {
    // Defensive: upstream calcs always populate keys 0-6, but sparse records are valid TS input.
    const habit = habitRates[dow] ?? null;
    const pomodoro = pomodoroAvgs[dow] ?? null;
    const intention = intentionRates[dow] ?? null;
    const momentum = momentumAvgs[dow] ?? null;

    // Collect available normalized values for composite
    const normalized: number[] = [];
    if (habit !== null) normalized.push(habit);
    if (pomodoro !== null) normalized.push(Math.min(pomodoro / goalN, 1) * 100);
    if (intention !== null) normalized.push(intention);
    if (momentum !== null) normalized.push(momentum);

    const composite = normalized.length > 0
      ? Math.round(normalized.reduce((s, v) => s + v, 0) / normalized.length)
      : null;

    days[dow] = { habitRate: habit, pomodoroAvg: pomodoro, intentionRate: intention, momentumAvg: momentum, composite };
  }

  // Find best (max composite) and worst (min composite); ties prefer lower weekday number.
  let bestDay: number | null = null;
  let worstDay: number | null = null;
  let bestScore = -Infinity;
  let worstScore = Infinity;

  for (let dow = 0; dow <= 6; dow++) {
    const c = days[dow].composite;
    if (c === null) continue;
    if (c > bestScore) { bestScore = c; bestDay = dow; }
    if (c < worstScore) { worstScore = c; worstDay = dow; }
  }

  return { days, bestDay, worstDay };
}
