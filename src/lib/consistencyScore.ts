// ABOUTME: Cross-domain consistency index — measures how regularly the user engages across habits, pomodoro, and intention
// ABOUTME: Returns per-domain rates (0-100), overall grade, trend direction, and weakest domain over a rolling window

export interface ConsistencyScoreParams {
  /** Habit objects with optional check-in date arrays. */
  habits: Array<{ checkHistory?: string[] }>;
  /** Pomodoro session history (date + count). */
  pomodoroHistory: Array<{ date: string; count: number }>;
  /** Intention history (date + text + optional done). */
  intentionHistory: Array<{ date: string; text: string; done?: boolean }>;
  /** YYYY-MM-DD for the current calendar day. */
  todayStr: string;
  /** Rolling window size in days (default 28). */
  windowDays?: number;
}

export type ConsistencyGrade =
  | "elite"
  | "strong"
  | "steady"
  | "building"
  | "inconsistent";

export type ConsistencyTrend = "improving" | "declining" | "stable";

export type DomainKey = "habits" | "pomodoro" | "intention";

export interface DomainScore {
  /** Consistency rate as integer percentage (0-100). */
  rate: number;
  /** Number of days the user engaged with this domain. */
  activeDays: number;
  /** Total days in the analysis window. */
  totalDays: number;
}

export interface ConsistencyScore {
  /** Per-domain breakdown (null = user doesn't use this domain). */
  domains: {
    habits: DomainScore | null;
    pomodoro: DomainScore | null;
    intention: DomainScore | null;
  };
  /** Weighted average of active domain rates (0-100, integer). */
  overall: number;
  /** Human-readable grade based on overall score. */
  grade: ConsistencyGrade;
  /** Rolling trend comparing first half vs second half of window. */
  trend: ConsistencyTrend | null;
  /** Domain with the lowest rate (null when ≤1 domain active or all equal). */
  weakestDomain: DomainKey | null;
}

/** Default analysis window: 4 weeks for stable measurement. */
export const DEFAULT_WINDOW_DAYS = 28;

/** Trend threshold: rate difference in percentage points to trigger improving/declining. */
const TREND_THRESHOLD_PP = 10;

/**
 * Computes cross-domain consistency index.
 *
 * For each domain, counts the number of "active days" within the window:
 *   - Habits: at least one habit was checked that day
 *   - Pomodoro: at least one session with count > 0
 *   - Intention: an intention was set (non-empty text)
 *
 * Design: empty domain data is treated as "user doesn't use this feature" → null,
 * not counted toward overall score or weakness detection.
 * Overall score is an unweighted average of active domain rates.
 * Window includes today (partial-day data is acceptable for a 28-day metric).
 *
 * Returns null when no domain has any data at all.
 * Pure function with no side effects.
 */
export function calcConsistencyScore(
  params: ConsistencyScoreParams,
): ConsistencyScore | null {
  const { habits, pomodoroHistory, intentionHistory, todayStr } = params;
  const windowDays = params.windowDays ?? DEFAULT_WINDOW_DAYS;

  const windowDates = buildWindow(todayStr, windowDays);
  const windowSet = new Set(windowDates);

  const habitsDomain = scoreHabits(habits, windowSet, windowDays);
  const pomodoroDomain = scorePomodoro(pomodoroHistory, windowSet, windowDays);
  const intentionDomain = scoreIntention(intentionHistory, windowSet, windowDays);

  const activeDomains: Array<{ key: DomainKey; score: DomainScore }> = [];
  if (habitsDomain) activeDomains.push({ key: "habits", score: habitsDomain });
  if (pomodoroDomain) activeDomains.push({ key: "pomodoro", score: pomodoroDomain });
  if (intentionDomain) activeDomains.push({ key: "intention", score: intentionDomain });

  if (activeDomains.length === 0) return null;

  const overall = Math.round(
    activeDomains.reduce((sum, d) => sum + d.score.rate, 0) / activeDomains.length,
  );

  const grade = gradeFromScore(overall);
  const trend = detectTrend(params, windowDates);
  const weakestDomain = findWeakest(activeDomains);

  return {
    domains: {
      habits: habitsDomain,
      pomodoro: pomodoroDomain,
      intention: intentionDomain,
    },
    overall,
    grade,
    trend,
    weakestDomain,
  };
}

/** Builds an array of YYYY-MM-DD strings for the window [today, today - windowDays + 1]. */
function buildWindow(todayStr: string, windowDays: number): string[] {
  const [y, m, d] = todayStr.split("-").map(Number);
  return Array.from({ length: windowDays }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    return dt.toISOString().slice(0, 10);
  });
}

/** Counts habit active days: days where at least one habit was checked. */
function scoreHabits(
  habits: Array<{ checkHistory?: string[] }>,
  windowSet: Set<string>,
  windowDays: number,
): DomainScore | null {
  const allCheckDates = new Set<string>();
  let hasAnyHistory = false;

  for (const h of habits) {
    if (h.checkHistory && h.checkHistory.length > 0) {
      hasAnyHistory = true;
      for (const d of h.checkHistory) {
        if (windowSet.has(d)) allCheckDates.add(d);
      }
    }
  }

  if (!hasAnyHistory) return null;

  const activeDays = allCheckDates.size;
  return {
    rate: Math.round((activeDays / windowDays) * 100),
    activeDays,
    totalDays: windowDays,
  };
}

/** Counts pomodoro active days: days with at least one session (count > 0). */
function scorePomodoro(
  pomodoroHistory: Array<{ date: string; count: number }>,
  windowSet: Set<string>,
  windowDays: number,
): DomainScore | null {
  const activeDates = new Set<string>();
  let hasPositiveEntry = false;

  for (const e of pomodoroHistory) {
    if (e.count > 0) {
      hasPositiveEntry = true;
      if (windowSet.has(e.date)) activeDates.add(e.date);
    }
  }

  if (!hasPositiveEntry) return null;

  const activeDays = activeDates.size;
  return {
    rate: Math.round((activeDays / windowDays) * 100),
    activeDays,
    totalDays: windowDays,
  };
}

/** Counts intention active days: days with a non-empty intention text. */
function scoreIntention(
  intentionHistory: Array<{ date: string; text: string; done?: boolean }>,
  windowSet: Set<string>,
  windowDays: number,
): DomainScore | null {
  if (intentionHistory.length === 0) return null;

  const activeDates = new Set<string>();
  for (const e of intentionHistory) {
    if (e.text && windowSet.has(e.date)) activeDates.add(e.date);
  }

  if (activeDates.size === 0) return null;

  const activeDays = activeDates.size;
  return {
    rate: Math.round((activeDays / windowDays) * 100),
    activeDays,
    totalDays: windowDays,
  };
}

/** Maps overall score to a human-readable grade. */
function gradeFromScore(score: number): ConsistencyGrade {
  if (score >= 90) return "elite";
  if (score >= 75) return "strong";
  if (score >= 60) return "steady";
  if (score >= 40) return "building";
  return "inconsistent";
}

/**
 * Compares consistency in the first half vs second half of the window.
 * "First half" = older days (farther from today).
 * "Second half" = recent days (closer to today).
 * If the second half rate exceeds first half by > TREND_THRESHOLD_PP → improving.
 * If the first half rate exceeds second half by > TREND_THRESHOLD_PP → declining.
 * Otherwise → stable.
 */
function detectTrend(
  params: ConsistencyScoreParams,
  windowDates: string[],
): ConsistencyTrend | null {
  const halfSize = Math.floor(windowDates.length / 2);
  if (halfSize === 0) return null;

  // Recent half: indices 0..halfSize-1 (closer to today)
  const recentHalf = new Set(windowDates.slice(0, halfSize));
  // Older half: same size as recent, starting from halfSize (drop remainder for odd windows)
  const olderHalf = new Set(windowDates.slice(halfSize, halfSize * 2));

  const recentRate = computeHalfRate(params, recentHalf, halfSize);
  const olderRate = computeHalfRate(params, olderHalf, halfSize);

  if (recentRate === null || olderRate === null) return null;

  const diff = recentRate - olderRate;
  if (diff > TREND_THRESHOLD_PP) return "improving";
  if (diff < -TREND_THRESHOLD_PP) return "declining";
  return "stable";
}

/** Computes the average active-day rate across all active domains for a given subset of dates. */
function computeHalfRate(
  params: ConsistencyScoreParams,
  dateSet: Set<string>,
  totalDays: number,
): number | null {
  const rates: number[] = [];

  // Habits
  const habitDays = new Set<string>();
  let hasHabitHistory = false;
  for (const h of params.habits) {
    if (h.checkHistory && h.checkHistory.length > 0) {
      hasHabitHistory = true;
      for (const d of h.checkHistory) {
        if (dateSet.has(d)) habitDays.add(d);
      }
    }
  }
  if (hasHabitHistory) rates.push((habitDays.size / totalDays) * 100);

  // Pomodoro
  const pomoDays = new Set<string>();
  let hasPomoHistory = false;
  for (const e of params.pomodoroHistory) {
    if (e.count > 0) {
      hasPomoHistory = true;
      if (dateSet.has(e.date)) pomoDays.add(e.date);
    }
  }
  if (hasPomoHistory) rates.push((pomoDays.size / totalDays) * 100);

  // Intention: only contribute when there are actual active days in this half
  if (params.intentionHistory.length > 0) {
    const intentionDays = new Set<string>();
    for (const e of params.intentionHistory) {
      if (e.text && dateSet.has(e.date)) intentionDays.add(e.date);
    }
    if (intentionDays.size > 0) {
      rates.push((intentionDays.size / totalDays) * 100);
    }
  }

  if (rates.length === 0) return null;
  return rates.reduce((s, v) => s + v, 0) / rates.length;
}

/** Finds the domain with the lowest rate. Returns null if ≤1 domain or all equal. */
function findWeakest(
  activeDomains: Array<{ key: DomainKey; score: DomainScore }>,
): DomainKey | null {
  if (activeDomains.length <= 1) return null;

  let minRate = Infinity;
  let minKey: DomainKey | null = null;
  let allEqual = true;
  const firstRate = activeDomains[0].score.rate;

  for (const d of activeDomains) {
    if (d.score.rate !== firstRate) allEqual = false;
    if (d.score.rate < minRate) {
      minRate = d.score.rate;
      minKey = d.key;
    }
  }

  return allEqual ? null : minKey;
}
