// ABOUTME: Classifies each habit into a portfolio state (record/milestone_near/risk/growing/recovering/dormant)
// ABOUTME: Returns per-habit status, aggregate counts, and a compact one-line summary for Clock display

export type HabitState = "record" | "milestone_near" | "risk" | "growing" | "recovering" | "dormant";

export interface HabitStatus {
  /** Habit name. */
  name: string;
  /** Classified portfolio state. */
  state: HabitState;
  /** Current consecutive-day streak. */
  streak: number;
}

export interface HabitPortfolio {
  /** Per-habit classification in input order. */
  habits: HabitStatus[];
  /** Count of habits in each state. */
  counts: Record<HabitState, number>;
  /** Compact one-line summary with emoji counts (e.g. "🏆2 · 📈3 · ⚠️1"). Empty string when no habits. */
  summary: string;
}

export interface HabitPortfolioParams {
  habits: Array<{ name: string; streak: number; bestStreak?: number; lastChecked?: string }>;
  /** YYYY-MM-DD for the current calendar day. */
  todayStr: string;
}

// Streak milestones — aligned with insight.ts HABIT_STREAK_MILESTONES for full coverage.
// getUpcomingMilestone in habits.ts uses [7, 30, 100] (badge-worthy only); we include 14 and 50
// so milestone_near also fires for those intermediate approach thresholds.
const MILESTONES = [7, 14, 30, 50, 100];

// Maximum distance (days) from a milestone to classify as "milestone_near".
const MILESTONE_NEAR_THRESHOLD = 2;

// Minimum streak to classify as "risk" when not checked today.
const RISK_STREAK_THRESHOLD = 7;

// Minimum bestStreak to qualify as "record". Prevents spurious 🏆 on first-ever check-in
// where streak=1 trivially equals bestStreak=1. Aligned with insight.ts bestStreak > 3 guard.
const MIN_RECORD_BEST_STREAK = 4;

// Emoji mappings for summary display. Only states with count > 0 appear.
const STATE_EMOJI: ReadonlyArray<{ state: HabitState; emoji: string }> = [
  { state: "record", emoji: "🏆" },
  { state: "milestone_near", emoji: "🎯" },
  { state: "risk", emoji: "⚠️" },
  { state: "growing", emoji: "📈" },
  { state: "recovering", emoji: "🔄" },
  { state: "dormant", emoji: "💤" },
];

/**
 * Classifies each habit into a portfolio state based on streak, bestStreak, and today's check-in.
 *
 * Priority chain (first match wins per habit):
 *   1. record:         streak === bestStreak ≥ 4 AND checked today (at personal best)
 *   2. risk:           streak ≥ 7 AND NOT checked today (long streak in danger)
 *   3. milestone_near: within 1-2 days of next milestone [7, 14, 30, 50, 100] AND streak > 0
 *                      (fires even when not checked today for streaks < 7 — motivates "check today to hit milestone!")
 *   4. growing:        streak > 0 AND checked today (healthy active habit)
 *   5. recovering:     streak > 0 AND NOT checked today AND streak < 7 (small streak, lower urgency)
 *   6. dormant:        streak === 0 (inactive)
 *
 * Pure function with no side effects.
 */
export function calcHabitPortfolio(params: HabitPortfolioParams): HabitPortfolio {
  const { habits, todayStr } = params;

  const counts: Record<HabitState, number> = {
    record: 0,
    milestone_near: 0,
    risk: 0,
    growing: 0,
    recovering: 0,
    dormant: 0,
  };

  if (habits.length === 0) {
    return { habits: [], counts, summary: "" };
  }

  const classified: HabitStatus[] = habits.map(h => {
    const checkedToday = h.lastChecked === todayStr;
    const bestStreak = h.bestStreak ?? 0;
    const state = classifyHabit(h.streak, bestStreak, checkedToday);
    return { name: h.name, state, streak: h.streak };
  });

  for (const h of classified) {
    counts[h.state]++;
  }

  const summary = STATE_EMOJI
    .filter(e => counts[e.state] > 0)
    .map(e => `${e.emoji}${counts[e.state]}`)
    .join(" · ");

  return { habits: classified, counts, summary };
}

/** Determines the state of a single habit (first-match-wins priority chain). */
function classifyHabit(streak: number, bestStreak: number, checkedToday: boolean): HabitState {
  // 1. Record: at meaningful personal best AND checked today
  if (streak > 0 && streak === bestStreak && bestStreak >= MIN_RECORD_BEST_STREAK && checkedToday) {
    return "record";
  }

  // 2. Risk: long streak not yet checked today
  if (streak >= RISK_STREAK_THRESHOLD && !checkedToday) {
    return "risk";
  }

  // 3. Milestone near: within 1-2 days of next milestone
  if (streak > 0 && isNearMilestone(streak)) {
    return "milestone_near";
  }

  // 4. Growing: active streak, checked today
  if (streak > 0 && checkedToday) {
    return "growing";
  }

  // 5. Recovering: small streak, not checked today
  if (streak > 0 && !checkedToday) {
    return "recovering";
  }

  // 6. Dormant: no streak
  return "dormant";
}

/** Returns true when the streak is within MILESTONE_NEAR_THRESHOLD of the next milestone. */
function isNearMilestone(streak: number): boolean {
  for (const milestone of MILESTONES) {
    const gap = milestone - streak;
    if (gap >= 1 && gap <= MILESTONE_NEAR_THRESHOLD) return true;
  }
  return false;
}
