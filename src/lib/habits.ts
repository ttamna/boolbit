// ABOUTME: Pure helpers for habit statistics and check-in logic, plus audio feedback
// ABOUTME: Covers milestone badges, completion tracking, per-habit weekly trend stats, aggregate week-over-week trend, daily completion rate, section badge, check-in patch, perfect-day streak, habit check-in audio cue, evening reminder, perfect-day streak milestone notifications, and Monday morning weekly habit completion rate report

import type { Habit } from "../types";

// Returns milestone badge emoji for notable streak lengths; null otherwise.
// Thresholds: 7🔥 / 30⭐ / 100💎.
// Exported for unit testing; pure function with no side effects.
export function getMilestone(streak: number): string | null {
  if (streak >= 100) return "💎";
  if (streak >= 30)  return "⭐";
  if (streak >= 7)   return "🔥";
  return null;
}

// Returns next unreached milestone if within threshold days away; null otherwise.
// Note: a non-null result can coexist with a non-null getMilestone result (e.g. streak=27
// has milestone 🔥 and upcoming ⭐ in 3 days). Callers must decide which to display.
// Exported for unit testing; default threshold=3.
export function getUpcomingMilestone(streak: number, threshold = 3): { days: number; badge: string } | null {
  if (streak <= 0) return null;
  const MILESTONES = [
    { at: 7,   badge: "🔥" },
    { at: 30,  badge: "⭐" },
    { at: 100, badge: "💎" },
  ];
  for (const { at, badge } of MILESTONES) {
    const days = at - streak;
    if (days > 0 && days <= threshold) return { days, badge };
  }
  return null;
}

// Returns percentage of habits completed today, clamped to [0, 100].
// Returns null when habits array is empty (guard against division by zero).
// Exported for unit testing; pure function with no side effects.
export function habitsTodayPct(habits: Habit[], todayStr: string): number | null {
  if (habits.length === 0) return null;
  const done = habits.filter(h => h.lastChecked === todayStr).length;
  return Math.min(100, Math.round(done / habits.length * 100));
}

// Returns days since the most recent check-in based on checkHistory (sorted ascending).
// Returns null when: no history, last check was today (0 days), or last check was yesterday (1 day — atRisk already handles this case).
// Returns N (≥2) when the habit has been neglected for N days, giving a quick "⊖Nd" indicator.
// Exported for unit testing; mirrors the pattern of ProjectCard's lastFocusDaysAgo helper.
export function habitLastCheckDaysAgo(checkHistory: string[] | undefined, today: string): number | null {
  if (!checkHistory || checkHistory.length === 0) return null;
  // checkHistory is sorted ascending (YYYY-MM-DD lexicographic = chronological); last entry is most recent
  const lastCheck = checkHistory[checkHistory.length - 1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastCheck)) return null;
  const lastTs = new Date(lastCheck + "T00:00:00").getTime();
  if (isNaN(lastTs)) return null;
  const todayTs = new Date(today + "T00:00:00").getTime();
  if (isNaN(todayTs)) return null;
  const days = Math.floor((todayTs - lastTs) / 86400000);
  // Suppress for today (0) and yesterday (1) — yesterday is already shown as atRisk amber ✓
  // Future lastCheck dates (negative days) also return null safely via the days >= 2 check
  return days >= 2 ? days : null;
}

// Returns the average daily habit completion rate (%) over a sliding day window.
// Returns null when:
//   - habits array is empty
//   - window is empty
//   - no habit has any check within the window (avoids showing a misleading 0%)
//
// dayWindow: array of YYYY-MM-DD strings (oldest → newest, typically 7 entries)
export function calcHabitsWeekRate(habits: Habit[], dayWindow: string[]): number | null {
  if (habits.length === 0) return null;
  if (dayWindow.length === 0) return null;
  const anyInWindow = habits.some(h => dayWindow.some(day => h.checkHistory?.includes(day)));
  if (!anyInWindow) return null;
  const avgRate = dayWindow.reduce((sum, day) => {
    return sum + habits.filter(h => h.checkHistory?.includes(day)).length / habits.length;
  }, 0) / dayWindow.length;
  return Math.round(avgRate * 100);
}

// Returns ↑ when curRate > prevRate, ↓ when curRate < prevRate, → when equal (both non-null).
// Returns null when either rate is null — no baseline exists to compute a meaningful trend.
// Exported for unit testing; pure function with no side effects.
export function calcHabitsWeekTrend(
  curRate: number | null,
  prevRate: number | null,
): "↑" | "↓" | "→" | null {
  if (curRate === null || prevRate === null) return null;
  if (curRate > prevRate) return "↑";
  if (curRate < prevRate) return "↓";
  return "→";
}

export interface HabitsBadgeParams {
  /** Total habit count; returns undefined when 0. */
  habitCount: number;
  /** Number of habits with lastChecked === todayStr. */
  doneToday: number;
  /** Number of habits at risk of losing streak (checked yesterday, not yet checked today). */
  atRisk: number;
  /** Average daily completion rate (%) over the last 7 days; null = no data to show. */
  weekRate: number | null;
  /** Consecutive days where ALL habits were completed; ≥2 triggers N🌟 suffix. */
  perfectStreak?: number;
  /** Week-over-week trend: ↑/↓/→ appended after weekRate when non-null; absent/null = no arrow. */
  weekTrend?: "↑" | "↓" | "→" | null;
}

/**
 * Computes the collapsed Streaks section badge string.
 * Returns undefined when there are no habits (habitCount === 0).
 *
 * Format: "[✓]N/M[ · 7d·R%][ · ⚠A][ · N🌟]" — parts joined with " · "
 * - ✓N/M: all habits done today — prefix signals complete day at a glance when collapsed
 * - N/M: habits done today / total habits (e.g. "3/5"); no prefix when incomplete
 * - 7d·R%: 7-day avg completion rate (e.g. "7d·80%"); omitted when weekRate is null
 * - ⚠A: at-risk habit count (e.g. "⚠2"); omitted when atRisk === 0
 * - N🌟: consecutive all-habits-done days (e.g. "3🌟"); omitted when perfectStreak < 2
 */
export function calcHabitsBadge(params: HabitsBadgeParams): string | undefined {
  const { habitCount, doneToday, atRisk, weekRate, perfectStreak, weekTrend } = params;
  if (habitCount === 0) return undefined;
  const allDone = doneToday >= habitCount;
  const countStr = allDone ? `✓${doneToday}/${habitCount}` : `${doneToday}/${habitCount}`;
  const trendSuffix = weekRate !== null && weekTrend ? weekTrend : "";
  return [
    countStr,
    weekRate !== null ? `7d·${weekRate}%${trendSuffix}` : null,
    atRisk > 0 ? `⚠${atRisk}` : null,
    (perfectStreak ?? 0) >= 2 ? `${perfectStreak}🌟` : null,
  ].filter(Boolean).join(" · ");
}

// Returns the Partial<Habit> patch to apply when checking in a habit today.
// Adds today to checkHistory (deduplicates, sorts ascending, caps at 14 most-recent entries),
// increments streak by 1, sets lastChecked to today, and updates bestStreak when the new
// streak surpasses the previous best (absent bestStreak is treated as 0).
// Exported for unit testing; pure function with no side effects.
export function calcCheckInPatch(habit: Habit, today: string): Partial<Habit> {
  const history = habit.checkHistory ?? [];
  const newHistory = [...new Set([...history, today])].sort().slice(-14);
  const newStreak = habit.streak + 1;
  const patch: Partial<Habit> = {
    streak: newStreak,
    lastChecked: today,
    checkHistory: newHistory,
  };
  if (newStreak > (habit.bestStreak ?? 0)) patch.bestStreak = newStreak;
  return patch;
}

// Returns the Partial<Habit> patch to apply when undoing today's check-in.
// Removes today from checkHistory (returns undefined when the filtered list is empty so
// JSON.stringify omits the field — consistent with Rust serde(default) yielding None),
// decrements streak by 1 (min 0), and clears lastChecked to undefined.
// bestStreak is intentionally not decremented — it records the all-time high.
// Precondition: callers must verify h.lastChecked === today before calling; if today is absent
// from checkHistory the function still decrements streak, which would corrupt data.
// Exported for unit testing; pure function with no side effects.
export function calcUndoCheckInPatch(habit: Habit, today: string): Partial<Habit> {
  const filtered = (habit.checkHistory ?? []).filter(d => d !== today);
  return {
    streak: Math.max(0, habit.streak - 1),
    lastChecked: undefined,
    checkHistory: filtered.length > 0 ? filtered : undefined,
  };
}

// Returns the count of consecutive days (ending today or yesterday) on which ALL habits were checked.
// dayWindow: YYYY-MM-DD strings, oldest → newest (today = last element).
// If today is a perfect day (all habits checked), starts the streak from today.
// If today is not perfect, falls back to yesterday so habits in progress don't reset the display.
// Returns 0 when: habits is empty, window is empty, or neither today nor yesterday is perfect.
// Note: because checkHistory is capped at 14 entries (see calcCheckInPatch), the returned streak
// is implicitly bounded by the window length — typically 14 days maximum.
// Exported for unit testing; pure function with no side effects.
export function calcPerfectDayStreak(habits: Habit[], dayWindow: string[]): number {
  if (habits.length === 0 || dayWindow.length === 0) return 0;

  const isPerfect = (day: string): boolean =>
    habits.every(h => !!(h.checkHistory?.includes(day)));

  // Start from today if perfect; otherwise fall back to yesterday
  let startIdx: number;
  if (isPerfect(dayWindow[dayWindow.length - 1])) {
    startIdx = dayWindow.length - 1;
  } else {
    startIdx = dayWindow.length - 2;
    if (startIdx < 0 || !isPerfect(dayWindow[startIdx])) return 0;
  }

  // Count consecutive perfect days going backwards from startIdx
  let streak = 0;
  for (let i = startIdx; i >= 0; i--) {
    if (isPerfect(dayWindow[i])) streak++;
    else break;
  }
  return streak;
}

// Returns percentage progress toward the user-defined target streak goal, clamped to [0, 100].
// Returns undefined when: targetStreak is absent/0/negative (no valid goal) or streak is 0 or negative (not started).
// Separates "no goal" from "goal at 0%" so callers can gate progress bar visibility cleanly.
// Exported for unit testing; pure function with no side effects.
export function calcTargetStreakPct(streak: number, targetStreak: number | undefined): number | undefined {
  const target = targetStreak ?? 0;
  if (target <= 0 || streak <= 0) return undefined;
  return Math.min(100, Math.round(streak / target * 100));
}

// Returns weekly check statistics for a single habit, partitioned from a 14-day window.
// last14Days: 14 YYYY-MM-DD strings ordered oldest→newest.
//   Indices 0–6: previous week; indices 7–13: current week.
// Returns:
//   cur7:  count of checks in the current 7 days
//   prev7: count of checks in the previous 7 days
//   trend: "↑" improving, "↓" declining, "" stable (suppressed when equal to avoid noise)
export function calcHabitWeekStats(
  checkHistory: string[] | undefined,
  last14Days: string[],
): { cur7: number; prev7: number; trend: "↑" | "↓" | "" } {
  const history = checkHistory ?? [];
  const cur7  = last14Days.slice(7).filter(day => history.includes(day)).length;
  const prev7 = last14Days.slice(0, 7).filter(day => history.includes(day)).length;
  const trend = cur7 > prev7 ? "↑" : cur7 < prev7 ? "↓" : "";
  return { cur7, prev7, trend };
}

// Returns the list of habits not yet checked today, or null when all are done or no habits exist.
// Used to trigger a one-per-day evening desktop notification reminding the user to check in.
// Input shape uses only the fields relevant for the reminder — callers pass full Habit objects.
// Exported for unit testing; pure function with no side effects.
export function calcEveningHabitReminder(
  habits: Array<{ name: string; lastChecked?: string }>,
  todayStr: string,
): { uncheckedCount: number; uncheckedNames: string[] } | null {
  if (habits.length === 0) return null;
  const unchecked = habits.filter(h => h.lastChecked !== todayStr);
  if (unchecked.length === 0) return null;
  return { uncheckedCount: unchecked.length, uncheckedNames: unchecked.map(h => h.name) };
}

// Returns the Sunday evening weekly review notification body.
// Three variants based on weekGoal state:
//   - no goal (absent/empty/whitespace): generic "review + plan next week" nudge
//   - goal set, not done: includes goal text, prompts reflection on progress
//   - goal set, done: congratulates achievement, nudges next-week planning
// Hour/day guard (Sunday, getHours() >= 18) lives in the caller (App.tsx useEffect).
// Callers check weeklyReviewRemindDate before invoking to ensure once-per-Sunday delivery.
// Exported for unit testing; pure function with no side effects.
export function calcWeeklyReviewReminder(
  weekGoal: string | undefined,
  weekGoalDone: boolean | undefined,
): string {
  const trimmed = weekGoal?.trim();
  if (!trimmed) return "📋 주간 회고: 이번 주를 정리하고 다음 주 목표를 세워보세요!";
  if (weekGoalDone) return `✅ 주간 회고: '${trimmed}' 달성! 다음 주 목표도 세워보세요.`;
  return `📋 주간 회고: '${trimmed}' — 이번 주를 마무리해보세요.`;
}

// Returns approach alerts for habits within threshold days of their next streak milestone (7🔥/30⭐/100💎).
// Maps getUpcomingMilestone over all habits; only habits within threshold (default 3) appear.
// Returns empty array when habits is empty or no habits are approaching a milestone — use .length to gate notification.
// habits: input shape uses only name + streak (callers pass full Habit objects).
// Exported for unit testing; pure function with no side effects.
export function calcHabitMilestoneApproachNotify(
  habits: Array<{ name: string; streak: number }>,
  threshold = 3,
): { name: string; daysLeft: number; badge: string }[] {
  return habits.flatMap(habit => {
    const upcoming = getUpcomingMilestone(habit.streak, threshold);
    if (!upcoming) return [];
    return [{ name: habit.name, daysLeft: upcoming.days, badge: upcoming.badge }];
  });
}

// Perfect-day consecutive streak milestones: 7, 14, 30, 50, 100 days.
// Each value marks a significant sustained commitment threshold worth a dedicated notification.
const PERFECT_DAY_MILESTONES: number[] = [7, 14, 30, 50, 100];

// Returns the desktop notification body when the perfect-day streak hits a significant milestone.
// A "perfect day" means all habits were completed on that calendar day.
// Fires on exact milestone values (7, 14, 30, 50, 100); returns null for all other streak lengths.
// Callers should invoke this inside the habitsAllDoneDate effect — once-per-day delivery is already
// guaranteed by that guard, so no additional persistent state is needed here.
// Exported for unit testing; pure function with no side effects.
export function calcPerfectDayMilestoneNotify(streak: number): string | null {
  if (!PERFECT_DAY_MILESTONES.includes(streak)) return null;
  return `🌟 완벽한 날 ${streak}일 연속! 모든 습관을 ${streak}일 달성했어요`;
}

// Returns a Monday morning desktop notification body with last week's habit completion rate.
// last7Days: 7 consecutive date strings ending with yesterday (the completed Sun–Sat week).
// Thresholds: 100% → 완벽한 한 주; ≥80% → 훌륭해요; ≥60% → 이번 주엔 더 해봐요; <60% → 다시 도전해봐요.
// Returns null when habits is empty or no habit has any check within the window (no data to report).
// Delegates rate calculation to calcHabitsWeekRate for consistency with the habits badge.
// Exported for unit testing; pure function with no side effects.
export function calcWeeklyHabitReport(habits: Habit[], last7Days: string[]): string | null {
  const rate = calcHabitsWeekRate(habits, last7Days);
  if (rate === null) return null;
  if (rate === 100) return `🌟 지난주 습관 완료율 100% — 완벽한 한 주!`;
  if (rate >= 80) return `✅ 지난주 습관 완료율 ${rate}% — 훌륭해요!`;
  if (rate >= 60) return `📊 지난주 습관 완료율 ${rate}% — 이번 주엔 더 해봐요!`;
  return `⚠️ 지난주 습관 완료율 ${rate}% — 다시 도전해봐요!`;
}

// Plays a short audio cue when a habit is checked in using the Web Audio API.
// Regular check: single E5 tone (659 Hz) — crisp, positive confirmation.
// All done (allDone=true): ascending D5→G5 two-tone (587→784 Hz) — celebratory "all complete" signal.
// Resolves immediately when AudioContext is unavailable (jsdom, restricted iframe, etc.).
// Not a pure function — has audio side effects; exported for use in HabitStreak.
export async function playHabitCheck(allDone = false): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx() as AudioContext;
    // allDone: ascending D5→G5 (587→784 Hz); regular: single E5 (659 Hz)
    const freqs: number[] = allDone ? [587, 784] : [659];
    const toneDuration = 0.1;
    const toneGap = 0.04;

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * (toneDuration + toneGap);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + toneDuration);
      osc.start(t);
      osc.stop(t + toneDuration);
    });

    const totalMs = ((freqs.length - 1) * (toneDuration + toneGap) + toneDuration + 0.05) * 1000;
    await new Promise<void>(resolve => setTimeout(resolve, totalMs));
    await ctx.close();
  } catch {
    // Graceful fallback: AudioContext unavailable or restricted
  }
}

// Minimum occurrences a weekday must have in the window to produce a reliable rate.
// Fewer than 2 data points is insufficient to establish a pattern.
const MIN_DOW_APPEARANCES = 2;

// Minimum daily completion rate (%) below which a weekday is considered "weak".
// 60% is the same numeric threshold used in calcWeeklyHabitReport, but applies to
// per-weekday averages rather than weekly aggregates — coincidental, not a shared dependency.
const WEAK_DAY_THRESHOLD = 60;

// Computes average habit completion rate per weekday (0=Sun … 6=Sat) over the given day window.
// Rate is the mean of (habits checked / total habits) across all occurrences of that weekday.
// Returns null for weekdays with fewer than MIN_DOW_APPEARANCES occurrences — insufficient data.
// Returns null for all weekdays when habits is empty or dayWindow is empty.
// Exported for unit testing; pure function with no side effects.
export function calcDayOfWeekHabitRates(
  habits: Array<{ checkHistory?: string[] }>,
  dayWindow: string[],
): Record<number, number | null> {
  const result: Record<number, number | null> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };

  if (habits.length === 0 || dayWindow.length === 0) return result;

  // Group day window dates by weekday
  const byDow: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const day of dayWindow) {
    const dow = new Date(day + "T00:00:00").getDay();
    byDow[dow].push(day);
  }

  for (let dow = 0; dow <= 6; dow++) {
    const days = byDow[dow];
    if (days.length < MIN_DOW_APPEARANCES) continue; // insufficient data → leave null

    const sumRate = days.reduce((sum, day) => {
      const checkedCount = habits.filter(h => h.checkHistory?.includes(day)).length;
      return sum + checkedCount / habits.length;
    }, 0);

    result[dow] = Math.round((sumRate / days.length) * 100);
  }

  return result;
}

// Returns the weekday (0–6) with the lowest non-null rate strictly below WEAK_DAY_THRESHOLD (60%).
// When multiple weekdays share the minimum rate, returns the lowest weekday number for stability.
// Returns null when no weekday has a non-null rate below the threshold.
// Exported for unit testing; pure function with no side effects.
export function calcWeakDayOfWeek(
  rates: Record<number, number | null>,
): number | null {
  let weakestDow: number | null = null;
  let weakestRate = WEAK_DAY_THRESHOLD; // strictly-below threshold: must be < WEAK_DAY_THRESHOLD

  for (let dow = 0; dow <= 6; dow++) {
    const rate = rates[dow];
    if (rate === null) continue;
    if (rate < weakestRate) {
      weakestRate = rate;
      weakestDow = dow;
    }
  }

  return weakestDow;
}
