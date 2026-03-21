// ABOUTME: calcWeekComparison — cross-domain week-over-week performance comparison
// ABOUTME: Computes per-domain (habits, pomodoro, intention, momentum) deltas, trend detection, overall trend by plurality vote, and Korean summary string

import type { Habit, PomodoroDay, IntentionEntry, MomentumEntry } from "../types";

export type Trend = "up" | "down" | "stable";

export interface DomainComparison {
  thisWeek: number;
  lastWeek: number;
  delta: number;
  trend: Trend;
}

export interface WeekComparisonParams {
  habits: Pick<Habit, "checkHistory">[];
  pomodoroHistory: Pick<PomodoroDay, "date" | "count">[];
  intentionHistory: Pick<IntentionEntry, "date" | "done">[];
  momentumHistory: Pick<MomentumEntry, "date" | "score">[];
  thisWeek: string[];
  lastWeek: string[];
}

export interface WeekComparisonResult {
  habits: DomainComparison | null;
  pomodoro: DomainComparison | null;
  intention: DomainComparison | null;
  momentum: DomainComparison | null;
  overallTrend: Trend | null;
  summary: string;
}

// Rate-based domains (habits %, intention %, momentum avg) use 5pp threshold
const RATE_THRESHOLD = 5;
// Count-based domain (pomodoro sessions) uses 3-session threshold
const COUNT_THRESHOLD = 3;

const TREND_ARROW: Record<Trend, string> = { up: "↑", down: "↓", stable: "→" };

function detectTrend(delta: number, threshold: number): Trend {
  if (delta >= threshold) return "up";
  if (delta <= -threshold) return "down";
  return "stable";
}

// Null when no habits defined; returns 0% for weeks with no check-ins (habits exist but unchecked)
function computeHabits(
  habits: Pick<Habit, "checkHistory">[],
  thisWeek: string[],
  lastWeek: string[],
): DomainComparison | null {
  if (habits.length === 0 || thisWeek.length === 0 || lastWeek.length === 0) return null;

  const thisWeekSet = new Set(thisWeek);
  const lastWeekSet = new Set(lastWeek);
  let thisChecks = 0;
  let lastChecks = 0;

  for (const habit of habits) {
    for (const date of habit.checkHistory ?? []) {
      if (thisWeekSet.has(date)) thisChecks++;
      if (lastWeekSet.has(date)) lastChecks++;
    }
  }

  const thisRate = Math.round((thisChecks / (habits.length * thisWeek.length)) * 100);
  const lastRate = Math.round((lastChecks / (habits.length * lastWeek.length)) * 100);
  const delta = thisRate - lastRate;

  return { thisWeek: thisRate, lastWeek: lastRate, delta, trend: detectTrend(delta, RATE_THRESHOLD) };
}

// Null only when both weeks have zero sessions; one-sided data is valid (count-based, not rate)
function computePomodoro(
  history: Pick<PomodoroDay, "date" | "count">[],
  thisWeek: string[],
  lastWeek: string[],
): DomainComparison | null {
  const thisWeekSet = new Set(thisWeek);
  const lastWeekSet = new Set(lastWeek);
  let thisSum = 0;
  let lastSum = 0;

  for (const entry of history) {
    if (thisWeekSet.has(entry.date)) thisSum += entry.count;
    if (lastWeekSet.has(entry.date)) lastSum += entry.count;
  }

  if (thisSum === 0 && lastSum === 0) return null;

  const delta = thisSum - lastSum;
  return { thisWeek: thisSum, lastWeek: lastSum, delta, trend: detectTrend(delta, COUNT_THRESHOLD) };
}

// Null when either week has no entries; one-sided rate comparison is misleading
function computeIntention(
  history: Pick<IntentionEntry, "date" | "done">[],
  thisWeek: string[],
  lastWeek: string[],
): DomainComparison | null {
  const thisWeekSet = new Set(thisWeek);
  const lastWeekSet = new Set(lastWeek);
  const thisEntries: boolean[] = [];
  const lastEntries: boolean[] = [];

  for (const entry of history) {
    if (thisWeekSet.has(entry.date)) thisEntries.push(entry.done === true);
    if (lastWeekSet.has(entry.date)) lastEntries.push(entry.done === true);
  }

  // Both weeks must have entries for a meaningful comparison
  if (thisEntries.length === 0 || lastEntries.length === 0) return null;

  const thisRate = Math.round((thisEntries.filter(Boolean).length / thisEntries.length) * 100);
  const lastRate = Math.round((lastEntries.filter(Boolean).length / lastEntries.length) * 100);
  const delta = thisRate - lastRate;

  return { thisWeek: thisRate, lastWeek: lastRate, delta, trend: detectTrend(delta, RATE_THRESHOLD) };
}

// Null when either week has no entries; one-sided avg comparison is misleading
function computeMomentum(
  history: Pick<MomentumEntry, "date" | "score">[],
  thisWeek: string[],
  lastWeek: string[],
): DomainComparison | null {
  const thisWeekSet = new Set(thisWeek);
  const lastWeekSet = new Set(lastWeek);
  const thisScores: number[] = [];
  const lastScores: number[] = [];

  for (const entry of history) {
    if (thisWeekSet.has(entry.date)) thisScores.push(entry.score);
    if (lastWeekSet.has(entry.date)) lastScores.push(entry.score);
  }

  // Both weeks must have entries for a meaningful comparison
  if (thisScores.length === 0 || lastScores.length === 0) return null;

  const thisAvg = Math.round(thisScores.reduce((a, b) => a + b, 0) / thisScores.length);
  const lastAvg = Math.round(lastScores.reduce((a, b) => a + b, 0) / lastScores.length);
  const delta = thisAvg - lastAvg;

  return { thisWeek: thisAvg, lastWeek: lastAvg, delta, trend: detectTrend(delta, RATE_THRESHOLD) };
}

/**
 * Cross-domain week-over-week comparison.
 *
 * Computes per-domain metrics (habits completion %, pomodoro session count,
 * intention done-rate %, momentum avg score), detects trend direction per domain,
 * derives an overall trend by plurality vote, and formats a Korean summary string.
 */
export function calcWeekComparison(params: WeekComparisonParams): WeekComparisonResult {
  const habits = computeHabits(params.habits, params.thisWeek, params.lastWeek);
  const pomodoro = computePomodoro(params.pomodoroHistory, params.thisWeek, params.lastWeek);
  const intention = computeIntention(params.intentionHistory, params.thisWeek, params.lastWeek);
  const momentum = computeMomentum(params.momentumHistory, params.thisWeek, params.lastWeek);

  const domains = [
    { value: habits, label: "습관" },
    { value: pomodoro, label: "포모" },
    { value: intention, label: "의도" },
    { value: momentum, label: "모멘텀" },
  ];

  const activeDomains = domains.filter(d => d.value !== null);

  if (activeDomains.length === 0) {
    return { habits, pomodoro, intention, momentum, overallTrend: null, summary: "비교 데이터 부족" };
  }

  // Plurality vote: ups vs downs; stables are neutral. Ties (e.g. 2 up, 2 down) resolve to "stable".
  const ups = activeDomains.filter(d => d.value!.trend === "up").length;
  const downs = activeDomains.filter(d => d.value!.trend === "down").length;
  const overallTrend: Trend = ups > downs ? "up" : downs > ups ? "down" : "stable";

  const summary = activeDomains
    .map(d => `${d.label}${TREND_ARROW[d.value!.trend]}`)
    .join(" · ");

  return { habits, pomodoro, intention, momentum, overallTrend, summary };
}
