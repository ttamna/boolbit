// ABOUTME: Pure helper that detects stale period goals and builds log-before-clear history patches
// ABOUTME: Replaces duplicated stale-check + history-patch logic in App.tsx initial load and midnight interval

import type { WidgetData, GoalEntry } from "../types";
import { isoWeekStr, quarterStr } from "./goalPeriods";

export interface GoalExpiryResult {
  intentionStale: boolean;
  weekGoalStale: boolean;
  monthGoalStale: boolean;
  quarterGoalStale: boolean;
  yearGoalStale: boolean;
  /**
   * Partial<WidgetData> with history arrays updated for expiring goals.
   * Spread this into the next data snapshot before clearing the expired goal fields.
   * Empty object when no goals are expiring.
   */
  historyPatch: Partial<WidgetData>;
}

/**
 * Determines which period goals have expired relative to `now` and builds the
 * log-before-clear history patch for any expiring entries.
 *
 * Stale rules (each requires both the goal text AND the date field to be set):
 * - intention: todayIntentionDate < YYYY-MM-DD of now
 * - weekGoal: weekGoalDate < isoWeekStr(now)
 * - monthGoal: monthGoalDate < "YYYY-MM" of now
 * - quarterGoal: quarterGoalDate < quarterStr(now)  ("YYYY-Q1"…"YYYY-Q4")
 * - yearGoal: yearGoalDate < "YYYY" of now
 *
 * historyPatch includes an entry for each non-intention stale goal, preserving done:true
 * when set. History arrays are capped: week/quarter 8, month 12, year 5.
 * Note: intentionHistory is NOT included — App.tsx manages it separately via updateIntention.
 *
 * Pure function: no side effects. Used by both the initial-load and midnight-reset effects.
 */
export function calcGoalExpiry(data: Partial<WidgetData>, now: Date): GoalExpiryResult {
  const todayStr = now.toLocaleDateString("sv"); // YYYY-MM-DD local
  const currentWeek = isoWeekStr(now);
  const currentMonth = todayStr.slice(0, 7); // "YYYY-MM"
  const currentQuarter = quarterStr(now);    // "YYYY-Q1"…"YYYY-Q4"
  const currentYear = todayStr.slice(0, 4);  // "YYYY"

  const intentionStale = !!(data.todayIntention && data.todayIntentionDate && data.todayIntentionDate < todayStr);
  const weekGoalStale = !!(data.weekGoal && data.weekGoalDate && data.weekGoalDate < currentWeek);
  const monthGoalStale = !!(data.monthGoal && data.monthGoalDate && data.monthGoalDate < currentMonth);
  const quarterGoalStale = !!(data.quarterGoal && data.quarterGoalDate && data.quarterGoalDate < currentQuarter);
  const yearGoalStale = !!(data.yearGoal && data.yearGoalDate && data.yearGoalDate < currentYear);

  const historyPatch: Partial<WidgetData> = {};

  if (weekGoalStale && data.weekGoal && data.weekGoalDate) {
    const entry: GoalEntry = { date: data.weekGoalDate, text: data.weekGoal, ...(data.weekGoalDone ? { done: true } : {}) };
    const prev: GoalEntry[] = data.weekGoalHistory ?? [];
    historyPatch.weekGoalHistory = [...prev.filter(e => e.date !== entry.date), entry].slice(-8);
  }
  if (monthGoalStale && data.monthGoal && data.monthGoalDate) {
    const entry: GoalEntry = { date: data.monthGoalDate, text: data.monthGoal, ...(data.monthGoalDone ? { done: true } : {}) };
    const prev: GoalEntry[] = data.monthGoalHistory ?? [];
    historyPatch.monthGoalHistory = [...prev.filter(e => e.date !== entry.date), entry].slice(-12);
  }
  if (quarterGoalStale && data.quarterGoal && data.quarterGoalDate) {
    const entry: GoalEntry = { date: data.quarterGoalDate, text: data.quarterGoal, ...(data.quarterGoalDone ? { done: true } : {}) };
    const prev: GoalEntry[] = data.quarterGoalHistory ?? [];
    historyPatch.quarterGoalHistory = [...prev.filter(e => e.date !== entry.date), entry].slice(-8);
  }
  if (yearGoalStale && data.yearGoal && data.yearGoalDate) {
    const entry: GoalEntry = { date: data.yearGoalDate, text: data.yearGoal, ...(data.yearGoalDone ? { done: true } : {}) };
    const prev: GoalEntry[] = data.yearGoalHistory ?? [];
    historyPatch.yearGoalHistory = [...prev.filter(e => e.date !== entry.date), entry].slice(-5);
  }

  return {
    intentionStale,
    weekGoalStale,
    monthGoalStale,
    quarterGoalStale,
    yearGoalStale,
    historyPatch,
  };
}
