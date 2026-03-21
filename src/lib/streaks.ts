// ABOUTME: Aggregates non-momentum active streaks into a ranked display list for the Clock streak ticker
// ABOUTME: Pure function — filters streaks ≥ 2 days, sorts descending, returns emoji + label + days

export interface ActiveStreak {
  /** Stable key for React rendering. */
  key: string;
  /** Display emoji prefix. */
  emoji: string;
  /** Korean short label. */
  label: string;
  /** Consecutive days count. */
  days: number;
}

export interface ActiveStreaksParams {
  /** Consecutive days with all habits completed. */
  perfectDayStreak?: number;
  /** Consecutive days with intention set & marked done. */
  intentionDoneStreak?: number;
  /** Consecutive days with ≥1 pomodoro session. */
  focusStreak?: number;
  /** Consecutive days meeting pomodoro session goal. */
  pomodoroGoalStreak?: number;
}

// Streak domain definitions in display-priority order (index used as explicit tiebreaker when days are equal).
// Focus uses ⚡ (not 🔥) to avoid collision with the momentum streak badge (🔥Nd) in the Clock date row.
const STREAK_DEFS: ReadonlyArray<{ key: string; emoji: string; label: string; field: keyof ActiveStreaksParams }> = [
  { key: "perfectDay", emoji: "🌟", label: "완벽", field: "perfectDayStreak" },
  { key: "intentionDone", emoji: "✨", label: "의도", field: "intentionDoneStreak" },
  { key: "focus", emoji: "⚡", label: "집중", field: "focusStreak" },
  { key: "pomodoroGoal", emoji: "🎯", label: "포모", field: "pomodoroGoalStreak" },
];

// Maps streak key to its STREAK_DEFS index for explicit sort tiebreaker.
const DEF_INDEX = new Map(STREAK_DEFS.map((d, i) => [d.key, i]));

/**
 * Aggregates active non-momentum streaks into a ranked display list.
 * Returns streaks with days ≥ 2, sorted by days descending (STREAK_DEFS index as explicit tiebreaker).
 * Momentum streak is excluded — it's already displayed separately in the Clock date row.
 * Pure function with no side effects.
 */
export function calcActiveStreaks(params: ActiveStreaksParams): ActiveStreak[] {
  return STREAK_DEFS
    .map(def => ({
      key: def.key,
      emoji: def.emoji,
      label: def.label,
      days: params[def.field] ?? 0,
    }))
    .filter(s => s.days >= 2)
    .sort((a, b) => b.days - a.days || (DEF_INDEX.get(a.key) ?? 0) - (DEF_INDEX.get(b.key) ?? 0));
}
