// ABOUTME: Predicts daily routine completion probability from historical rates and current progress
// ABOUTME: Multiplies per-pillar (intention × habits × pomodoro) confidence; done-today pillars contribute 100%

export interface CompletionConfidenceParams {
  /** Habits array with lastChecked and checkHistory for rate computation. */
  habits: Array<{ lastChecked?: string; checkHistory?: string[] }>;
  /** Past intention entries with date and text. Empty text = intention not set. */
  intentionHistory: Array<{ date: string; text: string; done?: boolean }>;
  /** Past pomodoro day entries with date and session count. */
  pomodoroHistory: Array<{ date: string; count: number }>;
  /** Daily pomodoro session goal; 0 = no goal → pomodoro pillar excluded. */
  pomodoroGoal: number;
  /** YYYY-MM-DD for the current calendar day. */
  todayStr: string;
  /**
   * Today's intention text; falsy = not set.
   * The intention pillar tracks "set" (not "done") — aligned with the nextAction chain
   * where setting the intention is the daily routine step. The separate todayIntentionDone
   * flag in WidgetData measures goal accomplishment, which is a different concept.
   */
  intentionText?: string;
  /** Date when intention was last set. */
  intentionDate?: string;
  /** Number of pomodoro sessions completed (may be stale if pomodoroSessionsDate !== todayStr). */
  pomodoroSessions: number;
  /** Date the pomodoroSessions count belongs to. */
  pomodoroSessionsDate?: string;
}

export interface CompletionConfidence {
  /** Overall confidence 0–100 (integer, rounded). */
  pct: number;
}

/** Past days to consider for rate computation. */
export const LOOKBACK_DAYS = 14;
/** Minimum distinct active days in the window to produce a non-null result. */
export const MIN_ACTIVE_DAYS = 3;

/**
 * Predicts the probability (0–100) of completing all daily routines today.
 *
 * Model: for each active pillar, compute its historical completion rate over
 * the past LOOKBACK_DAYS. If the pillar is already done today, its factor is 1.0;
 * otherwise the historical rate is used. Overall confidence = product of all factors.
 *
 * Denominator: all rates share the same reference population (union of active days
 * across all pillars). This is intentional — the product of per-pillar frequencies
 * over the same population estimates the joint probability under independence.
 * Per-pillar denominators would make the product statistically meaningless since each
 * factor would condition on a different reference set.
 *
 * Returns null when fewer than MIN_ACTIVE_DAYS distinct dates have trackable
 * activity in the lookback window (insufficient data for a meaningful prediction).
 *
 * Pure function with no side effects.
 */
export function calcCompletionConfidence(params: CompletionConfidenceParams): CompletionConfidence | null {
  const {
    habits,
    intentionHistory,
    pomodoroHistory,
    pomodoroGoal,
    todayStr,
    intentionText,
    intentionDate,
    pomodoroSessions,
    pomodoroSessionsDate,
  } = params;

  // Build the set of dates in the lookback window (yesterday … todayStr − LOOKBACK_DAYS).
  // Today is excluded — it's the day being predicted.
  const windowDates = buildWindowDates(todayStr, LOOKBACK_DAYS);

  // Collect all distinct active dates (dates with any tracked activity) within the window.
  // Only count intentions where text is truthy — mirrors the today-done check (!!intentionText).
  const intentionDates = new Set(intentionHistory.filter(e => e.text).map(e => e.date).filter(d => windowDates.has(d)));
  const pomodoroDates = new Set(pomodoroHistory.map(e => e.date).filter(d => windowDates.has(d)));

  // Pre-build Sets per habit for O(1) lookups instead of scanning checkHistory arrays.
  const habitCheckSets = habits.map(h => new Set(h.checkHistory ?? []));
  const habitDates = new Set<string>();
  for (const checkSet of habitCheckSets) {
    for (const d of checkSet) {
      if (windowDates.has(d)) habitDates.add(d);
    }
  }

  const activeDays = new Set([...intentionDates, ...pomodoroDates, ...habitDates]);
  if (activeDays.size < MIN_ACTIVE_DAYS) return null;

  const totalDays = activeDays.size;

  // ── Per-pillar rates ──────────────────────────────────────────────────────

  // Intention: count active days where an intention was set (not "done" — see intentionText JSDoc).
  const intentionRate = intentionDates.size / totalDays;

  // Habits: count active days where ALL current habits were checked.
  // Only meaningful when habits.length > 0.
  let habitsRate = 0;
  const hasHabits = habits.length > 0;
  if (hasHabits) {
    let allCheckedCount = 0;
    for (const day of activeDays) {
      if (habitCheckSets.every(s => s.has(day))) {
        allCheckedCount++;
      }
    }
    habitsRate = allCheckedCount / totalDays;
  }

  // Pomodoro: count active days where session count >= goal.
  // Only meaningful when pomodoroGoal > 0.
  let pomodoroRate = 0;
  const hasPomodoroGoal = pomodoroGoal > 0;
  if (hasPomodoroGoal) {
    const pomodoroMap = new Map(pomodoroHistory.map(e => [e.date, e.count]));
    let metCount = 0;
    for (const day of activeDays) {
      if ((pomodoroMap.get(day) ?? 0) >= pomodoroGoal) metCount++;
    }
    pomodoroRate = metCount / totalDays;
  }

  // ── Today's done status ───────────────────────────────────────────────────

  // Intention pillar: "set" (text present today), not "done" (goal accomplished).
  const intentionDoneToday = intentionDate === todayStr && !!intentionText;
  const allHabitsDoneToday = hasHabits && habits.every(h => h.lastChecked === todayStr);
  const todaySessions = pomodoroSessionsDate === todayStr ? pomodoroSessions : 0;
  const pomodoroGoalMetToday = hasPomodoroGoal && todaySessions >= pomodoroGoal;

  // ── Multiply factors ──────────────────────────────────────────────────────

  // Each active pillar contributes either 1.0 (done today) or its historical rate.
  let confidence = 1.0;

  // Intention is always an active pillar.
  confidence *= intentionDoneToday ? 1.0 : intentionRate;

  if (hasHabits) {
    confidence *= allHabitsDoneToday ? 1.0 : habitsRate;
  }

  if (hasPomodoroGoal) {
    confidence *= pomodoroGoalMetToday ? 1.0 : pomodoroRate;
  }

  return { pct: Math.round(confidence * 100) };
}

/** Builds a Set of YYYY-MM-DD strings for the past `days` days (excluding today). */
function buildWindowDates(todayStr: string, days: number): Set<string> {
  const dates = new Set<string>();
  const [y, m, d] = todayStr.split("-").map(Number);
  const baseMs = Date.UTC(y, m - 1, d);
  const MS_PER_DAY = 86_400_000;
  for (let i = 1; i <= days; i++) {
    dates.add(new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10));
  }
  return dates;
}
