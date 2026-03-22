// ABOUTME: calcGrowthTrajectory — cross-domain long-term growth trajectory analysis (4-week vs 4-week)
// ABOUTME: Compares current period metrics against previous period across habits, pomodoro, intention, and momentum

export interface GrowthTrajectoryParams {
  /** Habit objects with optional check-in date arrays. */
  habits: Array<{ checkHistory?: string[] }>;
  /** Pomodoro session history (date + count). */
  pomodoroHistory: Array<{ date: string; count: number }>;
  /** Intention history (date + text + optional done). */
  intentionHistory: Array<{ date: string; text: string; done?: boolean }>;
  /** Momentum history (date + score). */
  momentumHistory: Array<{ date: string; score: number }>;
  /** YYYY-MM-DD for the current calendar day. */
  todayStr: string;
  /** Window size in days for each period (default 28 = 4 weeks). */
  windowDays?: number;
}

export type GrowthGrade =
  | "accelerating"
  | "growing"
  | "stable"
  | "slowing"
  | "declining";

export type GrowthTrend = "up" | "down" | "stable";

export type GrowthDomainKey = "habits" | "pomodoro" | "intention" | "momentum";

export interface DomainGrowth {
  /** Metric value for the current period (rate 0-100 or avg count). */
  current: number;
  /** Metric value for the previous period. */
  previous: number;
  /** Change in percentage points (current - previous) for rate domains, absolute delta for count domains. */
  delta: number;
  /** Trend direction based on delta. */
  trend: GrowthTrend;
}

export interface GrowthTrajectory {
  /** Per-domain growth analysis (null = user doesn't use this domain). */
  domains: {
    habits: DomainGrowth | null;
    pomodoro: DomainGrowth | null;
    intention: DomainGrowth | null;
    momentum: DomainGrowth | null;
  };
  /** Composite growth score (-100 to +100, integer). */
  overall: number;
  /** Human-readable grade based on overall score. */
  grade: GrowthGrade;
  /** Domain with the highest positive delta (null when ≤1 domain or all equal). */
  strongestDomain: GrowthDomainKey | null;
  /** Domain with the lowest delta (null when ≤1 domain or all equal). */
  weakestDomain: GrowthDomainKey | null;
  /** Korean one-liner summary. */
  summary: string;
}

/** Default window: 4 weeks per period. */
export const DEFAULT_WINDOW_DAYS = 28;

/** One period length in days. Actual minimum to produce results is 2 × this value (both periods needed). */
export const MIN_WINDOW_DAYS = DEFAULT_WINDOW_DAYS;

/** Trend detection threshold for rate-based domains (percentage points). */
const RATE_TREND_THRESHOLD = 5;

/** Trend detection threshold for count-based domains (sessions). */
const COUNT_TREND_THRESHOLD = 1;

/**
 * Grade boundaries (overall score in pp):
 *   [20, +∞)   accelerating  |  [5, 20)   growing   |  (-5, 5)   stable
 *   (-20, -5]  slowing       |  (-∞, -20] declining
 */
const GRADE_ACCELERATING = 20;
const GRADE_GROWING = 5;
const GRADE_SLOWING = -5;
const GRADE_DECLINING = -20;

/**
 * Computes cross-domain long-term growth trajectory.
 *
 * Splits data into two periods of windowDays each:
 *   - Current period: [today - windowDays + 1 .. today]
 *   - Previous period: [today - 2*windowDays + 1 .. today - windowDays]
 *
 * Per-domain metrics:
 *   - Habits: avg daily completion rate (checks / totalHabits per day, as 0-100%)
 *   - Pomodoro: avg daily session count
 *   - Intention: done rate (done entries / total entries, as 0-100%)
 *   - Momentum: avg daily score (0-100)
 *
 * Returns null when no domain has sufficient data spanning both periods.
 * Pure function with no side effects.
 */
export function calcGrowthTrajectory(
  params: GrowthTrajectoryParams,
): GrowthTrajectory | null {
  const { todayStr } = params;
  const windowDays = params.windowDays ?? DEFAULT_WINDOW_DAYS;

  // Build date windows
  const currentDates = buildWindow(todayStr, windowDays, 0);
  const previousDates = buildWindow(todayStr, windowDays, windowDays);
  const currentSet = new Set(currentDates);
  const previousSet = new Set(previousDates);

  // Compute per-domain growth
  const habits = computeHabitsGrowth(params.habits, currentSet, previousSet, windowDays);
  const pomodoro = computePomodoroGrowth(params.pomodoroHistory, currentSet, previousSet);
  const intention = computeIntentionGrowth(params.intentionHistory, currentSet, previousSet);
  const momentum = computeMomentumGrowth(params.momentumHistory, currentSet, previousSet);

  // Collect active domains (those with data in both periods)
  const activeDomains: Array<{ key: GrowthDomainKey; growth: DomainGrowth }> = [];
  if (habits) activeDomains.push({ key: "habits", growth: habits });
  if (pomodoro) activeDomains.push({ key: "pomodoro", growth: pomodoro });
  if (intention) activeDomains.push({ key: "intention", growth: intention });
  if (momentum) activeDomains.push({ key: "momentum", growth: momentum });

  if (activeDomains.length === 0) return null;

  // Normalize deltas to a common scale for composite scoring.
  // Rate-based domains (habits, intention, momentum) are already in pp (0-100).
  // Count-based domain (pomodoro) is normalized: delta mapped to pp-equivalent.
  const normalizedDeltas = activeDomains.map(d => normalizeDelta(d.key, d.growth));
  const overall = Math.round(
    Math.max(-100, Math.min(100,
      normalizedDeltas.reduce((s, v) => s + v, 0) / normalizedDeltas.length,
    )),
  );

  const grade = gradeFromScore(overall);
  const { strongest, weakest } = findExtremes(activeDomains);

  const summary = buildSummary(grade, overall, activeDomains, windowDays);

  return {
    domains: { habits, pomodoro, intention, momentum },
    overall,
    grade,
    strongestDomain: strongest,
    weakestDomain: weakest,
    summary,
  };
}

// ── Window construction ──────────────────────────────────────────────────────

/** Builds YYYY-MM-DD strings for a window ending `offsetDays` before today. */
function buildWindow(todayStr: string, windowDays: number, offsetDays: number): string[] {
  const [y, m, d] = todayStr.split("-").map(Number);
  return Array.from({ length: windowDays }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d - offsetDays - i));
    return dt.toISOString().slice(0, 10);
  });
}

// ── Per-domain growth computation ────────────────────────────────────────────

function computeHabitsGrowth(
  habits: Array<{ checkHistory?: string[] }>,
  currentSet: Set<string>,
  previousSet: Set<string>,
  windowDays: number,
): DomainGrowth | null {
  // Count checks per period, tracking which habits actually have in-window data
  let currentChecks = 0;
  let previousChecks = 0;
  let hasCurrentData = false;
  let hasPreviousData = false;
  let activeHabitCount = 0;

  for (const h of habits) {
    if (!h.checkHistory || h.checkHistory.length === 0) continue;
    let contributed = false;
    for (const date of h.checkHistory) {
      if (currentSet.has(date)) { currentChecks++; hasCurrentData = true; contributed = true; }
      if (previousSet.has(date)) { previousChecks++; hasPreviousData = true; contributed = true; }
    }
    if (contributed) activeHabitCount++;
  }

  if (activeHabitCount === 0) return null;
  if (!hasCurrentData || !hasPreviousData) return null;

  // Rate = checks / (activeHabits × windowDays) × 100
  const maxChecks = activeHabitCount * windowDays;
  const currentRate = Math.round((currentChecks / maxChecks) * 100);
  const previousRate = Math.round((previousChecks / maxChecks) * 100);
  const delta = currentRate - previousRate;

  return {
    current: currentRate,
    previous: previousRate,
    delta,
    trend: rateTrend(delta),
  };
}

function computePomodoroGrowth(
  pomodoroHistory: Array<{ date: string; count: number }>,
  currentSet: Set<string>,
  previousSet: Set<string>,
): DomainGrowth | null {
  let currentSum = 0;
  let previousSum = 0;
  let currentDays = 0;
  let previousDays = 0;

  // Deduplicate by date, sum counts per period
  const currentDateCounts = new Map<string, number>();
  const previousDateCounts = new Map<string, number>();

  for (const e of pomodoroHistory) {
    if (currentSet.has(e.date)) {
      currentDateCounts.set(e.date, (currentDateCounts.get(e.date) ?? 0) + e.count);
    }
    if (previousSet.has(e.date)) {
      previousDateCounts.set(e.date, (previousDateCounts.get(e.date) ?? 0) + e.count);
    }
  }

  for (const count of currentDateCounts.values()) { currentSum += count; currentDays++; }
  for (const count of previousDateCounts.values()) { previousSum += count; previousDays++; }

  // Both periods needed for growth comparison
  if (currentDays === 0 || previousDays === 0) return null;

  // Avg daily sessions (using actual data days, not window size — handles gaps)
  const currentAvg = Math.round(currentSum / currentDays);
  const previousAvg = Math.round(previousSum / previousDays);

  const delta = currentAvg - previousAvg;

  return {
    current: currentAvg,
    previous: previousAvg,
    delta,
    trend: countTrend(delta),
  };
}

function computeIntentionGrowth(
  intentionHistory: Array<{ date: string; text: string; done?: boolean }>,
  currentSet: Set<string>,
  previousSet: Set<string>,
): DomainGrowth | null {
  if (intentionHistory.length === 0) return null;

  let currentDone = 0;
  let currentTotal = 0;
  let previousDone = 0;
  let previousTotal = 0;

  for (const e of intentionHistory) {
    if (!e.text) continue;
    if (currentSet.has(e.date)) {
      currentTotal++;
      if (e.done) currentDone++;
    }
    if (previousSet.has(e.date)) {
      previousTotal++;
      if (e.done) previousDone++;
    }
  }

  // Need data in both periods
  if (currentTotal === 0 || previousTotal === 0) return null;

  const currentRate = Math.round((currentDone / currentTotal) * 100);
  const previousRate = Math.round((previousDone / previousTotal) * 100);
  const delta = currentRate - previousRate;

  return {
    current: currentRate,
    previous: previousRate,
    delta,
    trend: rateTrend(delta),
  };
}

function computeMomentumGrowth(
  momentumHistory: Array<{ date: string; score: number }>,
  currentSet: Set<string>,
  previousSet: Set<string>,
): DomainGrowth | null {
  const currentScores: number[] = [];
  const previousScores: number[] = [];

  // Deduplicate: keep latest score per date
  const currentMap = new Map<string, number>();
  const previousMap = new Map<string, number>();

  for (const e of momentumHistory) {
    if (currentSet.has(e.date)) currentMap.set(e.date, e.score);
    if (previousSet.has(e.date)) previousMap.set(e.date, e.score);
  }

  for (const score of currentMap.values()) currentScores.push(score);
  for (const score of previousMap.values()) previousScores.push(score);

  // Need data in both periods
  if (currentScores.length === 0 || previousScores.length === 0) return null;

  const currentAvg = Math.round(
    currentScores.reduce((s, v) => s + v, 0) / currentScores.length,
  );
  const previousAvg = Math.round(
    previousScores.reduce((s, v) => s + v, 0) / previousScores.length,
  );
  const delta = currentAvg - previousAvg;

  return {
    current: currentAvg,
    previous: previousAvg,
    delta,
    trend: rateTrend(delta),
  };
}

// ── Trend & Grade helpers ────────────────────────────────────────────────────

function rateTrend(delta: number): GrowthTrend {
  if (delta >= RATE_TREND_THRESHOLD) return "up";
  if (delta <= -RATE_TREND_THRESHOLD) return "down";
  return "stable";
}

function countTrend(delta: number): GrowthTrend {
  if (delta >= COUNT_TREND_THRESHOLD) return "up";
  if (delta <= -COUNT_TREND_THRESHOLD) return "down";
  return "stable";
}

/**
 * Normalizes a domain's delta to a common pp scale for composite scoring.
 * Rate domains (habits, intention, momentum) already express delta in pp (0-100).
 * Count domain (pomodoro) maps session-count delta to pp: ×5 factor chosen so that
 * a typical daily change of ±2-4 sessions maps to ±10-20pp, matching the sensitivity
 * range of rate domains. Capped at ±100 (same ceiling as rate domains).
 */
function normalizeDelta(key: GrowthDomainKey, growth: DomainGrowth): number {
  if (key === "pomodoro") {
    return Math.max(-100, Math.min(100, growth.delta * 5));
  }
  return growth.delta;
}

function gradeFromScore(overall: number): GrowthGrade {
  if (overall >= GRADE_ACCELERATING) return "accelerating";
  if (overall >= GRADE_GROWING) return "growing";
  if (overall > GRADE_SLOWING) return "stable";
  if (overall > GRADE_DECLINING) return "slowing";
  return "declining";
}

/** Finds the domain with the highest and lowest normalized delta. */
function findExtremes(
  activeDomains: Array<{ key: GrowthDomainKey; growth: DomainGrowth }>,
): { strongest: GrowthDomainKey | null; weakest: GrowthDomainKey | null } {
  if (activeDomains.length <= 1) return { strongest: null, weakest: null };

  const normalized = activeDomains.map(d => ({
    key: d.key,
    value: normalizeDelta(d.key, d.growth),
  }));

  // Check if all deltas are equal
  const allEqual = normalized.every(d => d.value === normalized[0].value);
  if (allEqual) return { strongest: null, weakest: null };

  let strongest = normalized[0];
  let weakest = normalized[0];
  for (const d of normalized) {
    if (d.value > strongest.value) strongest = d;
    if (d.value < weakest.value) weakest = d;
  }

  return { strongest: strongest.key, weakest: weakest.key };
}

// ── Summary ──────────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<GrowthGrade, string> = {
  accelerating: "급성장",
  growing: "성장",
  stable: "안정",
  slowing: "둔화",
  declining: "하락",
};

const GRADE_EMOJI: Record<GrowthGrade, string> = {
  accelerating: "🚀",
  growing: "📈",
  stable: "➡️",
  slowing: "📉",
  declining: "⚠️",
};

const DOMAIN_LABELS: Record<GrowthDomainKey, string> = {
  habits: "습관",
  pomodoro: "포모도로",
  intention: "의도",
  momentum: "모멘텀",
};

function buildSummary(
  grade: GrowthGrade,
  overall: number,
  activeDomains: Array<{ key: GrowthDomainKey; growth: DomainGrowth }>,
  windowDays: number,
): string {
  const emoji = GRADE_EMOJI[grade];
  const label = GRADE_LABELS[grade];
  const weeks = Math.round(windowDays / 7);

  const domainSummaries = activeDomains.map(d => {
    const arrow = d.growth.trend === "up" ? "↑" : d.growth.trend === "down" ? "↓" : "→";
    return `${DOMAIN_LABELS[d.key]}${arrow}`;
  });

  const sign = overall > 0 ? "+" : "";
  return `${emoji} ${weeks}주 성장 궤적: ${label}(${sign}${overall}pp) · ${domainSummaries.join(" · ")}`;
}
