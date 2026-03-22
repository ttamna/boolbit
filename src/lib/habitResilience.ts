// ABOUTME: Per-habit recovery resilience profiling — measures how quickly each habit bounces back after a streak break
// ABOUTME: Grades habits as elastic/moderate/slow/fragile based on median gap days between consecutive checks

export interface HabitResilienceParams {
  habits: Array<{ name: string; checkHistory?: string[] }>;
  /** YYYY-MM-DD strings defining the analysis window (oldest → newest). */
  dayWindow: string[];
}

export type ResilienceGrade = "elastic" | "moderate" | "slow" | "fragile";

export interface HabitResilienceProfile {
  /** Habit name. */
  name: string;
  /** Number of streak-break events (gaps > 0 between consecutive checks). */
  breakCount: number;
  /** Median gap days across all breaks (0 when no breaks). */
  medianGapDays: number;
  /** Longest gap in days (0 when no breaks). */
  maxGapDays: number;
  /** Classification based on recovery speed. */
  grade: ResilienceGrade;
}

export interface HabitResilienceResult {
  /** Per-habit resilience profiles (only habits with ≥ 2 checks in window). */
  habits: HabitResilienceProfile[];
  /** Korean one-liner with emoji grade counts for clock/badge display. */
  summary: string;
}

/** Minimum checks within window to include a habit in analysis. */
const MIN_CHECKS = 2;

export const GRADE_EMOJI: Record<ResilienceGrade, string> = {
  elastic: "🧬",
  moderate: "⏳",
  slow: "🐌",
  fragile: "💔",
};

/**
 * Profiles each habit's recovery resilience by analysing gaps between
 * consecutive check-in dates within the given day window.
 *
 * For each habit with ≥ MIN_CHECKS in the window:
 *   1. Filter + deduplicate + sort check dates within window
 *   2. Compute gaps between consecutive dates (gap = dayDiff − 1)
 *   3. Derive breakCount, medianGapDays, maxGapDays
 *   4. Classify into grade based on median gap
 *
 * Returns null when: no habits, empty window, or no habit qualifies.
 * Pure function with no side effects.
 */
export function calcHabitResilience(params: HabitResilienceParams): HabitResilienceResult | null {
  const { habits, dayWindow } = params;

  if (habits.length === 0 || dayWindow.length === 0) return null;

  const windowSet = new Set(dayWindow);

  const profiles: HabitResilienceProfile[] = [];

  for (const habit of habits) {
    const checks = habit.checkHistory ?? [];
    if (checks.length === 0) continue;

    // Filter to window, deduplicate, sort chronologically
    const inWindow = [...new Set(checks.filter(d => windowSet.has(d)))].sort();

    if (inWindow.length < MIN_CHECKS) continue;

    // Compute gaps between consecutive checks
    const gaps: number[] = [];
    for (let i = 1; i < inWindow.length; i++) {
      const gap = dayDiff(inWindow[i - 1], inWindow[i]) - 1;
      if (gap > 0) gaps.push(gap);
    }

    const breakCount = gaps.length;
    const medianGapDays = breakCount === 0 ? 0 : median(gaps);
    const maxGapDays = breakCount === 0 ? 0 : Math.max(...gaps);
    // No breaks → always elastic regardless of grade thresholds
    const grade = breakCount === 0 ? "elastic" as const : classifyGrade(medianGapDays);

    profiles.push({ name: habit.name, breakCount, medianGapDays, maxGapDays, grade });
  }

  if (profiles.length === 0) return null;

  return { habits: profiles, summary: buildSummary(profiles) };
}

/** Calendar-day difference between two YYYY-MM-DD strings. */
function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000;
}

/** Median of a non-empty numeric array. */
function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Grade thresholds: elastic ≤2, moderate 3–5, slow 6–13, fragile ≥14. */
function classifyGrade(medianGap: number): ResilienceGrade {
  if (medianGap <= 2) return "elastic";
  if (medianGap <= 5) return "moderate";
  if (medianGap <= 13) return "slow";
  return "fragile";
}

/** Builds emoji-count summary string (e.g. "🧬2 · 🐌1"). */
function buildSummary(profiles: HabitResilienceProfile[]): string {
  const order: ResilienceGrade[] = ["elastic", "moderate", "slow", "fragile"];
  const parts: string[] = [];

  for (const grade of order) {
    const count = profiles.filter(p => p.grade === grade).length;
    if (count > 0) parts.push(`${GRADE_EMOJI[grade]}${count}`);
  }

  return parts.join(" · ");
}
