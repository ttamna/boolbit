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
  /** Number of intentions set in the last 7 days; shows "·N/M" completion suffix when > 0. */
  intentionSetCount7?: number;
  /** Number of intentions marked done in the last 7 days; paired with intentionSetCount7. */
  intentionDoneCount7?: number;
  /** Week-over-week intention done-rate trend; null = no baseline or insufficient data. */
  intentionWeekTrend?: "↑" | "↓" | "→" | null;
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
  /** Past consecutive ISO weeks where a weekly goal was set AND marked done; ≥ 2 triggers streak suffix. */
  weekGoalPastDoneStreak?: number;
  /** Past consecutive calendar months where a monthly goal was set AND marked done; ≥ 2 triggers streak suffix. */
  monthGoalPastDoneStreak?: number;
  /** Past consecutive calendar quarters where a quarterly goal was set AND marked done; ≥ 2 triggers streak suffix. */
  quarterGoalPastDoneStreak?: number;
  /** Past consecutive calendar years where a yearly goal was set AND marked done; ≥ 2 triggers streak suffix. */
  yearGoalPastDoneStreak?: number;
}

/**
 * Computes the collapsed Direction section badge string.
 * Returns undefined when there is nothing to show (no goals, no quotes).
 *
 * Format per goal: "<prefix>✓[✓][·Nd]"
 * - Double ✓ when marked done; single ✓ when set but not done.
 * - Urgency "·Nd" appended when period end is near:
 *   year ≤30d, quarter ≤14d, month ≤7d, week ≤3d.
 * Intention: "✓[✓][·N🔥][·D/S[↑↓→]]" — streak suffix when consecutiveDays ≥ 2;
 *   week suffix "·D/S" (done/set) appended when intentionSetCount7 > 0;
 *   trend arrow (↑/↓/→) appended to week suffix when intentionWeekTrend is non-null.
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
    intentionSetCount7, intentionDoneCount7, intentionWeekTrend,
    quotesCount,
    daysLeftYear, daysLeftQuarter, daysLeftMonth, daysLeftWeek,
    yearGoalPastDoneStreak, quarterGoalPastDoneStreak,
    monthGoalPastDoneStreak, weekGoalPastDoneStreak,
  } = params;

  const parts: string[] = [];

  if (yearGoal) {
    const base = yearGoalDone ? "Y✓✓" : "Y✓";
    if (daysLeftYear <= 30) parts.push(`${base}·${daysLeftYear}d`);
    else if ((yearGoalPastDoneStreak ?? 0) >= 2) parts.push(`${base}·${yearGoalPastDoneStreak!}y`);
    else parts.push(base);
  }
  if (quarterGoal) {
    const base = quarterGoalDone ? "Q✓✓" : "Q✓";
    if (daysLeftQuarter <= 14) parts.push(`${base}·${daysLeftQuarter}d`);
    else if ((quarterGoalPastDoneStreak ?? 0) >= 2) parts.push(`${base}·${quarterGoalPastDoneStreak!}q`);
    else parts.push(base);
  }
  if (monthGoal) {
    const base = monthGoalDone ? "M✓✓" : "M✓";
    if (daysLeftMonth <= 7) parts.push(`${base}·${daysLeftMonth}d`);
    else if ((monthGoalPastDoneStreak ?? 0) >= 2) parts.push(`${base}·${monthGoalPastDoneStreak!}m`);
    else parts.push(base);
  }
  if (weekGoal) {
    const base = weekGoalDone ? "W✓✓" : "W✓";
    if (daysLeftWeek <= 3) parts.push(`${base}·${daysLeftWeek}d`);
    else if ((weekGoalPastDoneStreak ?? 0) >= 2) parts.push(`${base}·${weekGoalPastDoneStreak!}w`);
    else parts.push(base);
  }
  if (todayIntention) {
    const base = todayIntentionDone ? "✓✓" : "✓";
    const streakSuffix = intentionConsecutiveDays >= 2 ? `·${intentionConsecutiveDays}🔥` : "";
    const weekSuffix = (intentionSetCount7 !== undefined && intentionSetCount7 > 0)
      ? `·${intentionDoneCount7 ?? 0}/${intentionSetCount7}${intentionWeekTrend ?? ""}`
      : "";
    parts.push(`${base}${streakSuffix}${weekSuffix}`);
  }
  if (quotesCount > 0) parts.push(`${quotesCount}q`);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}
