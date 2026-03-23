// ABOUTME: calcMomentumCalendar — builds a 28-day rolling momentum history grid
// ABOUTME: Returns null when fewer than 7 active days in the window (insufficient history)

import type { MomentumEntry } from "../types";

export interface MomentumDay {
  /** YYYY-MM-DD local date string */
  date: string;
  /** Momentum score 0–100; null = no data recorded for this day */
  score: number | null;
  /** Tier derived from score; null when score is null */
  tier: "high" | "mid" | "low" | null;
}

export interface MomentumCalendar {
  /** 28 day objects ordered oldest-first; always exactly 28 entries */
  days: MomentumDay[];
  /** Count of days with a recorded score in the window; always ≥ 7 */
  activeDays: number;
  /** Mean score over active days; always a number (activeDays is always ≥ 7 here) */
  avgScore: number;
}

/** Score → tier boundary constants — must match the rest of the momentum system */
export const HIGH_THRESHOLD = 65;
export const MID_THRESHOLD = 40;

function scoreTier(score: number): "high" | "mid" | "low" {
  if (score >= HIGH_THRESHOLD) return "high";
  if (score >= MID_THRESHOLD) return "mid";
  return "low";
}

/**
 * Builds a 28-day momentum history calendar from persisted MomentumEntry[].
 *
 * Returns null when:
 * - The history array is empty
 * - Fewer than 7 entries fall within the 28-day window (too little data to be useful)
 *
 * todayStr: YYYY-MM-DD local date string used as the window end date.
 * Pure function — no side effects.
 */
export function calcMomentumCalendar(
  momentumHistory: MomentumEntry[],
  todayStr: string,
): MomentumCalendar | null {
  if (momentumHistory.length === 0) return null;

  // Build lookup: date → last entry (duplicate dates: last-seen wins)
  const lookup = new Map<string, MomentumEntry>();
  for (const entry of momentumHistory) {
    lookup.set(entry.date, entry);
  }

  // Generate 28-day window: today and the 27 preceding days
  const todayMs = new Date(todayStr + "T12:00:00").getTime();
  const days: MomentumDay[] = [];
  let activeDays = 0;
  let scoreSum = 0;

  for (let offset = 27; offset >= 0; offset--) {
    const d = new Date(todayMs);
    d.setDate(d.getDate() - offset);
    const date = d.toLocaleDateString("sv");
    const entry = lookup.get(date) ?? null;

    if (entry !== null) {
      activeDays++;
      scoreSum += entry.score;
      days.push({ date, score: entry.score, tier: scoreTier(entry.score) });
    } else {
      days.push({ date, score: null, tier: null });
    }
  }

  // Require at least 7 active days for a meaningful chart
  if (activeDays < 7) return null;

  return {
    days,
    activeDays,
    avgScore: scoreSum / activeDays, // activeDays >= 7 guaranteed by early return above
  };
}
