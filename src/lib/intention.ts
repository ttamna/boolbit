// ABOUTME: Pure helpers for intention streak calculation — no side effects
// ABOUTME: todayStr anchors all date arithmetic for DST safety

import type { IntentionEntry } from "../types";

// Returns the number of consecutive days (including today) that the user has set an intention.
// Returns 0 when todayIntention is absent or empty.
// Checks intentionHistory for past 6 days (newest first: yesterday → 6 days ago); stops at the first gap.
// Maximum return value is 7 (today + 6 preceding history days).
// todayStr: YYYY-MM-DD local date string used to anchor past-day calculations.
export function calcIntentionStreak(
  todayIntention: string | undefined,
  todayStr: string,
  history: IntentionEntry[],
): number {
  if (todayIntention === undefined || todayIntention === "") return 0;
  const base = new Date(todayStr + "T00:00:00");
  let count = 1;
  for (let back = 1; back <= 6; back++) {
    const d = new Date(base);
    d.setDate(d.getDate() - back);
    const dateStr = d.toLocaleDateString("sv");
    if (history.some(e => e.date === dateStr)) count++;
    else break;
  }
  return count;
}
