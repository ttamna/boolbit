// ABOUTME: Detects "keystone habits" by computing conditional completion lift across habit pairs
// ABOUTME: Answers "which habit, when done, most increases the chance of other habits being done?"

export interface HabitSynergyParams {
  habits: Array<{ name: string; checkHistory?: string[] }>;
  /** YYYY-MM-DD strings defining the analysis window (oldest → newest). */
  dayWindow: string[];
}

export interface KeystoneResult {
  /** Name of the keystone habit. */
  habitName: string;
  /** Lift percentage: avgOthersWhenDone - avgOthersWhenNotDone (rounded integer). */
  liftPct: number;
  /** Average % of other habits completed on days this habit IS done (0–100). */
  avgOthersWhenDone: number;
  /** Average % of other habits completed on days this habit is NOT done (0–100). */
  avgOthersWhenNotDone: number;
}

export interface HabitSynergyResult {
  /** The habit with the highest positive lift, or null if no habit qualifies. */
  keystone: KeystoneResult | null;
  /** Korean one-liner for clock/badge display. */
  summary: string;
}

/** Minimum days with any habit activity required for meaningful analysis. */
const MIN_ACTIVE_DAYS = 7;
/** Minimum lift (percentage points) to declare a keystone. */
const MIN_LIFT_PCT = 10;

/**
 * Detects the "keystone habit" — the habit whose completion best predicts
 * other habits being completed on the same day.
 *
 * For each habit H, computes:
 *   avgOthersWhenDone    = avg completion rate of OTHER habits on days H IS done
 *   avgOthersWhenNotDone = avg completion rate of OTHER habits on days H is NOT done
 *   lift = avgOthersWhenDone − avgOthersWhenNotDone
 *
 * The habit with the highest lift above MIN_LIFT_PCT is the keystone.
 *
 * Returns null when: <2 habits, empty window, or insufficient active days.
 * Pure function with no side effects.
 */
export function calcHabitSynergy(params: HabitSynergyParams): HabitSynergyResult | null {
  const { habits, dayWindow } = params;

  if (habits.length < 2 || dayWindow.length === 0) return null;

  const windowSet = new Set(dayWindow);

  // Build per-habit check sets (only dates within window)
  const habitChecks: Set<string>[] = habits.map(h => {
    const s = new Set<string>();
    for (const d of h.checkHistory ?? []) {
      if (windowSet.has(d)) s.add(d);
    }
    return s;
  });

  // Collect active days: days where at least one habit was checked (deduplicated via windowSet)
  const activeDays: string[] = [];
  const seen = new Set<string>();
  for (const day of dayWindow) {
    if (seen.has(day)) continue;
    seen.add(day);
    if (habitChecks.some(s => s.has(day))) {
      activeDays.push(day);
    }
  }

  if (activeDays.length < MIN_ACTIVE_DAYS) return null;

  // Compute lift for each habit
  let bestKeystone: KeystoneResult | null = null;

  for (let i = 0; i < habits.length; i++) {
    const myChecks = habitChecks[i];

    // Split active days into "done" and "not done" for this habit
    const doneDays: string[] = [];
    const notDoneDays: string[] = [];
    for (const day of activeDays) {
      if (myChecks.has(day)) {
        doneDays.push(day);
      } else {
        notDoneDays.push(day);
      }
    }

    // Need both done and not-done days to compute lift
    if (doneDays.length === 0 || notDoneDays.length === 0) continue;

    // Compute avg completion of OTHER habits on done-days vs not-done-days
    const otherIndices = habits.map((_, idx) => idx).filter(idx => idx !== i);

    // Round avg values first, then derive lift to guarantee liftPct === done − notDone
    const avgOthersWhenDone = Math.round(computeAvgOtherCompletion(otherIndices, habitChecks, doneDays));
    const avgOthersWhenNotDone = Math.round(computeAvgOtherCompletion(otherIndices, habitChecks, notDoneDays));
    const liftPct = avgOthersWhenDone - avgOthersWhenNotDone;

    if (liftPct >= MIN_LIFT_PCT && liftPct > (bestKeystone?.liftPct ?? MIN_LIFT_PCT - 1)) {
      bestKeystone = { habitName: habits[i].name, liftPct, avgOthersWhenDone, avgOthersWhenNotDone };
    }
  }

  const summary = bestKeystone
    ? `🔑 '${bestKeystone.habitName}' 할 때 다른 습관 ${bestKeystone.avgOthersWhenDone}% 완료`
    : "습관들이 고르게 독립적";

  return { keystone: bestKeystone, summary };
}

/** Computes average completion % of specified habits across given days. */
function computeAvgOtherCompletion(
  otherIndices: number[],
  habitChecks: Set<string>[],
  days: string[],
): number {
  if (otherIndices.length === 0 || days.length === 0) return 0;

  let totalRate = 0;
  for (const day of days) {
    const doneCount = otherIndices.filter(idx => habitChecks[idx].has(day)).length;
    totalRate += (doneCount / otherIndices.length) * 100;
  }
  return totalRate / days.length;
}
