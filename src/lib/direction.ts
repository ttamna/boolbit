// ABOUTME: Pure helpers for the Direction section badge — formats goal status, urgency, and intention streak
// ABOUTME: Builds the collapsed Direction section badge string from goal state and period data

export interface DirectionBadgeParams {
  yearGoal?: string;
  yearGoalDone?: boolean;
  quarterGoal?: string;
  quarterGoalDone?: boolean;
  monthGoal?: string;
  monthGoalDone?: boolean;
  weekGoal?: string;
  weekGoalDone?: boolean;
  todayIntention?: string;
  todayIntentionDone?: boolean;
  /** Consecutive days the user has set an intention (including today); ≥2 triggers streak display. */
  intentionConsecutiveDays: number;
  /** Number of quotes in the quotes array; appended as "Nq" when > 0. */
  quotesCount: number;
  /** Days remaining in the current calendar year (including today); urgency suffix when ≤ 30. */
  daysLeftYear: number;
  /** Days remaining in the current calendar quarter (including today); urgency suffix when ≤ 14. */
  daysLeftQuarter: number;
  /** Days remaining in the current calendar month (including today); urgency suffix when ≤ 7. */
  daysLeftMonth: number;
  /** Days remaining in the current ISO week (including today); urgency suffix when ≤ 3. */
  daysLeftWeek: number;
}

/**
 * Computes the collapsed Direction section badge string.
 * Returns undefined when there is nothing to show (no goals, no quotes).
 *
 * Format per goal: "<prefix>✓[✓][·Nd]"
 * - Double ✓ when marked done; single ✓ when set but not done.
 * - Urgency "·Nd" appended when period end is near:
 *   year ≤30d, quarter ≤14d, month ≤7d, week ≤3d.
 * Intention: "✓[✓][·N🔥]" — streak suffix when consecutiveDays ≥ 2.
 * Parts joined by " · ".
 */
export function calcDirectionBadge(params: DirectionBadgeParams): string | undefined {
  const {
    yearGoal, yearGoalDone,
    quarterGoal, quarterGoalDone,
    monthGoal, monthGoalDone,
    weekGoal, weekGoalDone,
    todayIntention, todayIntentionDone,
    intentionConsecutiveDays,
    quotesCount,
    daysLeftYear, daysLeftQuarter, daysLeftMonth, daysLeftWeek,
  } = params;

  const parts: string[] = [];

  if (yearGoal) {
    const base = yearGoalDone ? "Y✓✓" : "Y✓";
    parts.push(daysLeftYear <= 30 ? `${base}·${daysLeftYear}d` : base);
  }
  if (quarterGoal) {
    const base = quarterGoalDone ? "Q✓✓" : "Q✓";
    parts.push(daysLeftQuarter <= 14 ? `${base}·${daysLeftQuarter}d` : base);
  }
  if (monthGoal) {
    const base = monthGoalDone ? "M✓✓" : "M✓";
    parts.push(daysLeftMonth <= 7 ? `${base}·${daysLeftMonth}d` : base);
  }
  if (weekGoal) {
    const base = weekGoalDone ? "W✓✓" : "W✓";
    parts.push(daysLeftWeek <= 3 ? `${base}·${daysLeftWeek}d` : base);
  }
  if (todayIntention) {
    const base = todayIntentionDone ? "✓✓" : "✓";
    parts.push(intentionConsecutiveDays >= 2 ? `${base}·${intentionConsecutiveDays}🔥` : base);
  }
  if (quotesCount > 0) parts.push(`${quotesCount}q`);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}
