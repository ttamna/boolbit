// ABOUTME: calcMomentumForecast — 7-day momentum score prediction ("productivity weather forecast")
// ABOUTME: Blends weekday-historical averages (60%) with recent trend (40%) to forecast upcoming week performance

import type { MomentumEntry } from "../types";

export interface MomentumForecastParams {
  /** Rolling momentum history entries (date + score). */
  momentumHistory: Pick<MomentumEntry, "date" | "score">[];
  /** YYYY-MM-DD for the current calendar day. */
  todayStr: string;
}

export interface DayForecast {
  /** YYYY-MM-DD */
  date: string;
  /** 0 (Sun) – 6 (Sat) */
  weekday: number;
  /** 0–100 predicted momentum score (integer, rounded). */
  predicted: number;
  /** Data density for this weekday: high (≥3 samples), medium (2), low (≤1 or no weekday-specific data). */
  confidence: "high" | "medium" | "low";
  /** Weather-metaphor emoji reflecting the predicted score tier. */
  emoji: string;
}

export type ForecastTrend = "improving" | "declining" | "stable";

export interface MomentumForecast {
  /** Forecasts for the next 7 days (tomorrow → +7). */
  days: DayForecast[];
  /** Average of the 7 predicted scores (integer, rounded). */
  weekAvg: number;
  /** Trend comparing recent-week actual avg vs prior-week actual avg. */
  trend: ForecastTrend;
  /** Korean one-liner summary. */
  summary: string;
}

/** Minimum history entries required to produce a forecast. */
export const MIN_HISTORY_DAYS = 7;

const MS_PER_DAY = 86_400_000;

/** Blend weights: weekday historical average vs recent average. */
const WEEKDAY_WEIGHT = 0.6;
const RECENT_WEIGHT = 0.4;

/** Number of recent days to compute the recency average and trend. */
const RECENT_WINDOW = 7;

/** Trend detection threshold (percentage points). */
const TREND_THRESHOLD = 5;

/**
 * Predicts the next 7 days' momentum scores based on historical patterns.
 *
 * Model:
 * 1. Group history by weekday → compute per-weekday average.
 * 2. Compute recent 7-day average (recency signal).
 * 3. Compute trend adjustment from the difference between recent-week and prior-week averages.
 * 4. For each forecast day: blend = weekdayAvg × 0.6 + recentAvg × 0.4 + trendAdjust, clamped 0–100.
 *
 * Returns null when fewer than MIN_HISTORY_DAYS entries exist.
 * Pure function with no side effects.
 */
export function calcMomentumForecast(params: MomentumForecastParams): MomentumForecast | null {
  const { momentumHistory, todayStr } = params;

  if (momentumHistory.length < MIN_HISTORY_DAYS) return null;

  // Deduplicate: keep latest score for each date.
  const dateMap = new Map<string, number>();
  for (const entry of momentumHistory) {
    dateMap.set(entry.date, entry.score);
  }

  const entries = Array.from(dateMap.entries())
    .map(([date, score]) => ({ date, score }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (entries.length < MIN_HISTORY_DAYS) return null;

  // ── Per-weekday averages ───────────────────────────────────────────────

  const weekdayBuckets: Map<number, number[]> = new Map();
  for (const { date, score } of entries) {
    const wd = utcWeekday(date);
    if (!weekdayBuckets.has(wd)) weekdayBuckets.set(wd, []);
    weekdayBuckets.get(wd)!.push(score);
  }

  const weekdayAvg = new Map<number, number>();
  for (const [wd, scores] of weekdayBuckets) {
    weekdayAvg.set(wd, scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // Overall average (fallback for weekdays with no history).
  const overallAvg = entries.reduce((s, e) => s + e.score, 0) / entries.length;

  // ── Recent & prior window averages ──────────────────────────────────────

  const recentEntries = entries.slice(-RECENT_WINDOW);
  const recentAvg = recentEntries.reduce((s, e) => s + e.score, 0) / recentEntries.length;

  // Prior window must be at least RECENT_WINDOW entries for a symmetric comparison.
  // Asymmetric windows (e.g. 3 vs 7) produce misleading trend deltas.
  const priorEntries = entries.length >= RECENT_WINDOW * 2
    ? entries.slice(-RECENT_WINDOW * 2, -RECENT_WINDOW)
    : [];
  const priorAvg = priorEntries.length >= RECENT_WINDOW
    ? priorEntries.reduce((s, e) => s + e.score, 0) / priorEntries.length
    : recentAvg; // Insufficient prior data → treat as stable.

  // Trend adjustment: half of the recent-vs-prior delta, capped at ±10.
  const rawTrendDelta = recentAvg - priorAvg;
  const trendAdjust = Math.max(-10, Math.min(10, rawTrendDelta * 0.5));

  // ── Classify trend ──────────────────────────────────────────────────────

  const trend: ForecastTrend =
    rawTrendDelta >= TREND_THRESHOLD ? "improving" :
    rawTrendDelta <= -TREND_THRESHOLD ? "declining" :
    "stable";

  // ── Build 7-day forecast ─────────────────────────────────────────────────

  const [y, m, d] = todayStr.split("-").map(Number);
  const todayMs = Date.UTC(y, m - 1, d);

  const days: DayForecast[] = [];
  for (let i = 1; i <= 7; i++) {
    const dateMs = todayMs + i * MS_PER_DAY;
    const dateStr = new Date(dateMs).toISOString().slice(0, 10);
    const weekday = new Date(dateMs).getUTCDay();

    const wdAvg = weekdayAvg.get(weekday) ?? overallAvg;
    const blended = wdAvg * WEEKDAY_WEIGHT + recentAvg * RECENT_WEIGHT + trendAdjust;
    const predicted = Math.round(Math.max(0, Math.min(100, blended)));

    const samples = weekdayBuckets.get(weekday)?.length ?? 0;
    const confidence: DayForecast["confidence"] =
      samples >= 3 ? "high" : samples === 2 ? "medium" : "low";

    days.push({
      date: dateStr,
      weekday,
      predicted,
      confidence,
      emoji: scoreToEmoji(predicted),
    });
  }

  const weekAvg = Math.round(days.reduce((s, d) => s + d.predicted, 0) / 7);

  // ── Korean summary ───────────────────────────────────────────────────────

  const trendText =
    trend === "improving" ? "상승세" :
    trend === "declining" ? "하락세" :
    "안정적";

  const bestDay = days.reduce((best, d) => d.predicted > best.predicted ? d : best, days[0]);
  const worstDay = days.reduce((worst, d) => d.predicted < worst.predicted ? d : worst, days[0]);

  const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

  const summary =
    `주간 예측 ${weekAvg}점(${trendText}) · ` +
    `최고 ${WEEKDAY_NAMES[bestDay.weekday]}(${bestDay.predicted}) · ` +
    `최저 ${WEEKDAY_NAMES[worstDay.weekday]}(${worstDay.predicted})`;

  return { days, weekAvg, trend, summary };
}

/** Converts a YYYY-MM-DD string to UTC weekday (0=Sun..6=Sat). */
function utcWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Maps a predicted score to a weather-metaphor emoji. */
function scoreToEmoji(score: number): string {
  if (score >= 75) return "☀️";
  if (score >= 60) return "🌤️";
  if (score >= 45) return "⛅";
  if (score >= 30) return "☁️";
  return "🌧️";
}
