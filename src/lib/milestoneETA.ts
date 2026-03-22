// ABOUTME: Streak milestone probability forecasting — predicts days-to-milestone with survival probability
// ABOUTME: calcDailySuccessRate computes adherence from checkHistory; calcMilestoneETA projects p^n survival to next milestone

export interface MilestoneETA {
  /** The milestone threshold (e.g. 30 for a 30-day streak). */
  target: number;
  /** Days remaining to reach the milestone from the current streak. Always >= 3. */
  daysRemaining: number;
  /** Probability of sustaining the streak for daysRemaining days (p^n, geometric survival). */
  probability: number;
  /** Display badge emoji for the target milestone (e.g. "⭐"). */
  badge: string;
}

/**
 * Computes the daily success rate from a habit's checkHistory within a given window.
 * Returns the fraction of windowDays that appear in checkHistory (0–1).
 * Returns null when windowDays is empty (no window to measure against).
 * Returns 0 when checkHistory is empty/undefined (no check-ins at all).
 * History entries outside the window are ignored.
 */
export function calcDailySuccessRate(
  checkHistory: string[] | undefined,
  windowDays: string[],
): number | null {
  if (windowDays.length === 0) return null;
  if (!checkHistory || checkHistory.length === 0) return 0;

  const windowSet = new Set(windowDays);
  const hits = checkHistory.filter(d => windowSet.has(d)).length;
  return hits / windowDays.length;
}

// Minimum probability threshold — forecasts below this are too unlikely to be motivating.
const MIN_PROBABILITY = 0.10;

// Minimum days remaining — 1-2 days are already covered by approach badges.
const MIN_DAYS_REMAINING = 3;

/**
 * Predicts when the user will reach the next streak milestone based on historical daily success rate.
 * Uses geometric survival model: probability = dailySuccessRate^daysRemaining.
 *
 * Returns null when:
 * - No next milestone exists (current streak >= all milestones)
 * - Next milestone is 1-2 days away (handled by approach badges)
 * - Probability falls below 10% (unrealistic forecast)
 * - Empty milestones array
 *
 * Milestones must be sorted ascending by `at` value.
 */
export function calcMilestoneETA(
  currentStreak: number,
  milestones: ReadonlyArray<{ at: number; badge: string }>,
  dailySuccessRate: number,
): MilestoneETA | null {
  // Find the next milestone above the current streak.
  const next = milestones.find(m => m.at > currentStreak);
  if (!next) return null;

  const daysRemaining = next.at - currentStreak;
  if (daysRemaining < MIN_DAYS_REMAINING) return null;

  const probability = dailySuccessRate ** daysRemaining;
  if (probability < MIN_PROBABILITY) return null;

  return {
    target: next.at,
    daysRemaining,
    probability,
    badge: next.badge,
  };
}
