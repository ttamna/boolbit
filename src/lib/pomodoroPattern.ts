// ABOUTME: Pomodoro usage pattern analysis over a rolling window (default 28 days)
// ABOUTME: Activity rate, goal hit rate, weekday patterns, consistency (CV), trend, 5-tier grade, Korean summary

export interface PomodoroPatternParams {
  /** Pomodoro session history (date + count). Duplicate dates are summed. */
  pomodoroHistory: Array<{ date: string; count: number }>;
  /** Daily session goal; 0 = no goal. */
  pomodoroGoal: number;
  /** YYYY-MM-DD for the current calendar day. */
  todayStr: string;
  /** Analysis window size in days (default 28). */
  windowDays?: number;
}

export type PomodoroConsistency = "steady" | "sporadic" | "bursty";
export type PomodoroTrend = "increasing" | "stable" | "decreasing";
export type PomodoroGrade = "elite" | "strong" | "moderate" | "building" | "inactive";

export interface PomodoroPattern {
  /** Days with ≥1 session in the window. */
  activeDays: number;
  /** Total days in the analysis window. */
  totalDays: number;
  /** activeDays / totalDays × 100, rounded integer. */
  activityRate: number;

  /** Sum of all sessions in the window. */
  totalSessions: number;
  /** totalSessions / activeDays, rounded to 1 decimal. */
  avgPerActiveDay: number;

  /** % of active days meeting the session goal (null when goal = 0). */
  goalHitRate: number | null;
  /** Count of active days meeting the session goal (null when goal = 0). */
  goalHitDays: number | null;

  /** Day-of-week (0=Sun…6=Sat) with highest avg sessions (null when all equal). */
  peakDay: number | null;
  /** Day-of-week with lowest avg sessions (null when all equal). */
  valleyDay: number | null;
  /** Avg sessions per weekday (Mon–Fri), across all weekdays in window. */
  weekdayAvg: number;
  /** Avg sessions per weekend day (Sat–Sun), across all weekend days in window. */
  weekendAvg: number;

  /** Session count variability: steady (CV≤0.5), sporadic (CV>0.5+low activity), bursty (CV>0.5+high activity). */
  consistency: PomodoroConsistency;
  /** First-half vs second-half avg comparison. */
  trend: PomodoroTrend;
  /** 5-tier grade based on activity rate and avg session count. */
  grade: PomodoroGrade;
  /** Korean one-liner summary. */
  summary: string;
}

export const DEFAULT_WINDOW_DAYS = 28;

/** Trend detection threshold (sessions per day). */
const TREND_THRESHOLD = 0.5;

/** CV threshold for consistency classification. */
const CV_THRESHOLD = 0.5;

/** Default pomodoro baseline when no goal is set (mirrors calcDailyScore). */
const DEFAULT_BASELINE = 3;

/**
 * Analyzes pomodoro usage patterns over a rolling window.
 *
 * Computes activity rate, goal hit rate, weekday patterns, consistency
 * (coefficient of variation), trend (first-half vs second-half), and
 * assigns a 5-tier grade.
 *
 * Returns null when no sessions exist within the window.
 * Pure function with no side effects.
 */
export function calcPomodoroPattern(
  params: PomodoroPatternParams,
): PomodoroPattern | null {
  const { todayStr, pomodoroGoal } = params;
  const windowDays = params.windowDays ?? DEFAULT_WINDOW_DAYS;

  // Build the set of dates in the window
  const windowDates = buildWindow(todayStr, windowDays);
  const windowSet = new Set(windowDates);

  // Aggregate sessions per date (sum duplicates, filter to window)
  const dateMap = aggregateSessions(params.pomodoroHistory, windowSet);

  // Filter out zero-count dates
  for (const [date, count] of dateMap) {
    if (count <= 0) dateMap.delete(date);
  }

  if (dateMap.size === 0) return null;

  // ── Activity metrics ─────────────────────────────────────────────────────

  const activeDays = dateMap.size;
  const totalDays = windowDays;
  const activityRate = Math.round((activeDays / totalDays) * 100);

  let totalSessions = 0;
  for (const count of dateMap.values()) totalSessions += count;

  const avgPerActiveDay = round1(totalSessions / activeDays);

  // ── Goal hit rate ────────────────────────────────────────────────────────
  // Denominator is activeDays (not totalDays) — measures goal discipline on days the user
  // actually works, not overall. Use alongside activityRate for the full picture.

  let goalHitRate: number | null = null;
  let goalHitDays: number | null = null;
  if (pomodoroGoal > 0) {
    let hits = 0;
    for (const count of dateMap.values()) {
      if (count >= pomodoroGoal) hits++;
    }
    goalHitDays = hits;
    goalHitRate = Math.round((hits / activeDays) * 100);
  }

  // ── Weekly pattern ───────────────────────────────────────────────────────

  const { peakDay, valleyDay, weekdayAvg, weekendAvg } =
    computeWeeklyPattern(windowDates, dateMap);

  // ── Consistency (CV of daily counts, including zero-days) ────────────────

  const consistency = computeConsistency(windowDates, dateMap, activityRate);

  // ── Trend (first half vs second half) ────────────────────────────────────

  const trend = computeTrend(windowDates, dateMap);

  // ── Grade ────────────────────────────────────────────────────────────────

  const grade = computeGrade(activityRate, avgPerActiveDay, pomodoroGoal, activeDays);

  // ── Summary ──────────────────────────────────────────────────────────────

  const summary = buildSummary(grade, activityRate, avgPerActiveDay, trend);

  return {
    activeDays,
    totalDays,
    activityRate,
    totalSessions,
    avgPerActiveDay,
    goalHitRate,
    goalHitDays,
    peakDay,
    valleyDay,
    weekdayAvg,
    weekendAvg,
    consistency,
    trend,
    grade,
    summary,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Builds YYYY-MM-DD strings for a window ending at todayStr (inclusive). Newest first. */
function buildWindow(todayStr: string, windowDays: number): string[] {
  const [y, m, d] = todayStr.split("-").map(Number);
  return Array.from({ length: windowDays }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    return dt.toISOString().slice(0, 10);
  });
}

/** Aggregates pomodoroHistory into a Map<date, totalCount>, filtering to windowSet. */
function aggregateSessions(
  history: Array<{ date: string; count: number }>,
  windowSet: Set<string>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of history) {
    if (!windowSet.has(e.date)) continue;
    map.set(e.date, (map.get(e.date) ?? 0) + e.count);
  }
  return map;
}

/** Rounds a number to 1 decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Weekly pattern ───────────────────────────────────────────────────────────

function computeWeeklyPattern(
  windowDates: string[],
  dateMap: Map<string, number>,
): { peakDay: number | null; valleyDay: number | null; weekdayAvg: number; weekendAvg: number } {
  // Count total sessions and total days per day-of-week
  const dowSessions: number[] = [0, 0, 0, 0, 0, 0, 0]; // indexed 0=Sun..6=Sat
  const dowDayCount: number[] = [0, 0, 0, 0, 0, 0, 0];

  for (const dateStr of windowDates) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    dowDayCount[dow]++;
    dowSessions[dow] += dateMap.get(dateStr) ?? 0;
  }

  // Avg per day-of-week
  const dowAvg: number[] = dowDayCount.map((cnt, i) =>
    cnt > 0 ? dowSessions[i] / cnt : 0,
  );

  // Find peak and valley among DOWs actually present in the window.
  // DOWs with dowDayCount[i] === 0 are excluded — they don't exist in this window.
  const presentAvgs: Array<{ dow: number; avg: number }> = [];
  for (let i = 0; i < 7; i++) {
    if (dowDayCount[i] > 0) presentAvgs.push({ dow: i, avg: dowAvg[i] });
  }

  let peakDay: number | null = null;
  let valleyDay: number | null = null;

  const allEqual = presentAvgs.length <= 1 ||
    presentAvgs.every(d => d.avg === presentAvgs[0].avg);

  if (!allEqual) {
    let maxAvg = -1;
    let minAvg = Infinity;
    for (const { dow, avg } of presentAvgs) {
      if (avg > maxAvg) { maxAvg = avg; peakDay = dow; }
      if (avg < minAvg) { minAvg = avg; valleyDay = dow; }
    }
  }

  // Weekday (Mon=1..Fri=5) vs Weekend (Sun=0, Sat=6) averages
  let weekdaySessions = 0;
  let weekdayDays = 0;
  let weekendSessions = 0;
  let weekendDays = 0;

  for (let i = 0; i < 7; i++) {
    if (i === 0 || i === 6) {
      weekendSessions += dowSessions[i];
      weekendDays += dowDayCount[i];
    } else {
      weekdaySessions += dowSessions[i];
      weekdayDays += dowDayCount[i];
    }
  }

  const weekdayAvg = weekdayDays > 0 ? round1(weekdaySessions / weekdayDays) : 0;
  const weekendAvg = weekendDays > 0 ? round1(weekendSessions / weekendDays) : 0;

  return { peakDay, valleyDay, weekdayAvg, weekendAvg };
}

// ── Consistency (coefficient of variation) ───────────────────────────────────

function computeConsistency(
  windowDates: string[],
  dateMap: Map<string, number>,
  activityRate: number,
): PomodoroConsistency {
  const n = windowDates.length;
  if (n <= 1) return "steady";

  // Build daily counts array (including zero-days).
  // Invariant: dateMap is non-empty at this call site (caller returns null when empty),
  // so mean > 0 is guaranteed. No zero-mean guard needed.
  const counts = windowDates.map(d => dateMap.get(d) ?? 0);
  const mean = counts.reduce((s, v) => s + v, 0) / n;

  const variance = counts.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const cv = Math.sqrt(variance) / mean;

  if (cv <= CV_THRESHOLD) return "steady";
  return activityRate < 50 ? "sporadic" : "bursty";
}

// ── Trend (first half vs second half) ────────────────────────────────────────

function computeTrend(
  windowDates: string[],
  dateMap: Map<string, number>,
): PomodoroTrend {
  const n = windowDates.length;
  if (n < 2) return "stable";

  const halfSize = Math.floor(n / 2);

  // windowDates[0] is most recent (today), windowDates[n-1] is oldest.
  // "recent half" = windowDates[0..halfSize-1]
  // "older half"  = windowDates[n-halfSize..n-1]
  // For odd n, the middle day is excluded from both halves (intentional: symmetric comparison).
  let recentSum = 0;
  let olderSum = 0;

  for (let i = 0; i < halfSize; i++) {
    recentSum += dateMap.get(windowDates[i]) ?? 0;
  }
  for (let i = n - halfSize; i < n; i++) {
    olderSum += dateMap.get(windowDates[i]) ?? 0;
  }

  const recentAvg = recentSum / halfSize;
  const olderAvg = olderSum / halfSize;
  const delta = recentAvg - olderAvg;

  if (delta > TREND_THRESHOLD) return "increasing";
  if (delta < -TREND_THRESHOLD) return "decreasing";
  return "stable";
}

// ── Grade ────────────────────────────────────────────────────────────────────
// Elite requires meeting the user's own goal (or baseline 3 when no goal is set).
// Strong/moderate/building use absolute thresholds — these represent general
// productivity levels independent of the user's specific goal setting.

function computeGrade(
  activityRate: number,
  avgPerActiveDay: number,
  pomodoroGoal: number,
  activeDays: number,
): PomodoroGrade {
  const effectiveGoal = pomodoroGoal > 0 ? pomodoroGoal : DEFAULT_BASELINE;

  if (activityRate >= 80 && avgPerActiveDay >= effectiveGoal) return "elite";
  if (activityRate >= 60 && avgPerActiveDay >= 2) return "strong";
  if (activityRate >= 40) return "moderate";
  if (activeDays >= 3) return "building";
  return "inactive";
}

// ── Summary ──────────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<PomodoroGrade, string> = {
  elite: "엘리트",
  strong: "우수",
  moderate: "보통",
  building: "시작",
  inactive: "비활성",
};

const GRADE_EMOJI: Record<PomodoroGrade, string> = {
  elite: "🔥",
  strong: "💪",
  moderate: "📊",
  building: "🌱",
  inactive: "💤",
};

const TREND_ARROWS: Record<PomodoroTrend, string> = {
  increasing: "↑",
  stable: "→",
  decreasing: "↓",
};

function buildSummary(
  grade: PomodoroGrade,
  activityRate: number,
  avgPerActiveDay: number,
  trend: PomodoroTrend,
): string {
  const emoji = GRADE_EMOJI[grade];
  const label = GRADE_LABELS[grade];
  const arrow = TREND_ARROWS[trend];

  return `${emoji} 포모도로 패턴: ${label} · 활동률 ${activityRate}% · 일평균 ${avgPerActiveDay}회${arrow}`;
}
