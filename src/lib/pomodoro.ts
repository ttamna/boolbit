// ABOUTME: Helpers for pomodoro session statistics, phase UI mapping, audio feedback, morning start nudge, evening goal-gap nudge, lifetime milestone notifications, weekly/monthly/quarterly/yearly session reports, per-weekday session average for weak/best day detection, weekly goal-hit day count, goal-met vs not-met momentum correlation, and focus drought detection
// ABOUTME: Covers phase color/label, today-count derivation, 14-day history upsert, date range, week trend, header badge string, focus streak, lifetime format, goal-progress percentage, session-end audio cue, morning reminder, evening reminder, cumulative focus milestone crossing, weekly session report, monthly session report, quarterly session report, yearly session report, goal-streak consecutive past days, recent rolling average sessions (today excluded), ISO-week record pace comparison (current week vs same-length prev-week window), calcDayOfWeekPomodoroAvg/calcWeakPomodoroDay/calcBestPomodoroDay for todayIsWeakPomodoroDay/todayIsBestPomodoroDay insight params, calcPomodoroWeekGoalDays for goal-hit day count (any window: 7-day week or 14-day month), calcPomodoroMomentumCorrelation for goal-met vs not-met momentum gap, calcFocusDroughtDays for consecutive past days without any session

import type { PomodoroDay, MomentumEntry } from "../types";
import { colors } from "../theme";

/** The three phases of a pomodoro cycle. */
export type Phase = "focus" | "break" | "longBreak";

// Returns the accent color token for the given pomodoro phase.
// focus → colors.statusActive (green); break → colors.statusProgress (amber); longBreak → colors.statusLongBreak (sky-blue).
// PomodoroTimer applies a theme-accent override for focus and calls this only for non-focus phases,
// but the function covers all three to form a complete, independently testable contract.
// Exported for unit testing; pure function with no side effects.
export function phaseAccent(p: Phase): string {
  if (p === "focus") return colors.statusActive;
  if (p === "break") return colors.statusProgress;
  return colors.statusLongBreak;
}

// Returns the Korean display label for the given pomodoro phase.
// focus → "집중"; break → "휴식"; longBreak → "긴 휴식".
// Exported for unit testing; pure function with no side effects.
export function phaseLabel(p: Phase): string {
  if (p === "focus") return "집중";
  if (p === "break") return "휴식";
  return "긴 휴식";
}

// Returns the updated today-session count given the persisted state.
// Resets to 1 when sessionDate differs from today (new day); increments by 1 when same day.
// sessionDate: stored 'pomodoroSessionsDate' (YYYY-MM-DD or undefined)
// sessionCount: stored 'pomodoroSessions' (integer or undefined)
// today: current date as YYYY-MM-DD
// Exported for unit testing; pure function with no side effects.
export function calcTodaySessionCount(
  sessionDate: string | undefined,
  sessionCount: number | undefined,
  today: string,
): number {
  return sessionDate === today ? (sessionCount ?? 0) + 1 : 1;
}

// Upserts today's session count into the rolling 14-day history.
// Removes any existing entry for today, appends the new count, sorts chronologically, caps at 14.
// Does not mutate the input history array.
// Exported for unit testing; pure function with no side effects.
export function updatePomodoroHistory(
  history: PomodoroDay[],
  today: string,
  count: number,
): PomodoroDay[] {
  return [...history.filter(d => d.date !== today), { date: today, count }]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

// Returns the last 14 YYYY-MM-DD date strings (oldest → newest) anchored at todayStr.
// Index 0 = 13 days ago; index 13 = today.
// Exported for unit testing; pure function with no side effects.
export function calcLast14Days(todayStr: string): string[] {
  const base = new Date(todayStr + "T00:00:00");
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (13 - i));
    return d.toLocaleDateString("sv");
  });
}

// Returns the session count badge string for the Pomodoro header, or null when there is nothing to show.
// null: sessionsToday === 0 and sessionGoal absent — mirrors the JSX visibility guard.
// "✓N": sessionsToday >= sessionGoal (goal reached or exceeded).
// "×N/G": sessionGoal set but not yet reached.
// "×N": no goal; N sessions completed today.
// Exported for unit testing; pure function with no side effects.
export function calcSessionCountStr(
  sessionsToday: number,
  sessionGoal: number | undefined,
): string | null {
  if (sessionsToday === 0 && sessionGoal == null) return null;
  if (sessionGoal != null) {
    return sessionsToday >= sessionGoal
      ? `✓${sessionsToday}`
      : `×${sessionsToday}/${sessionGoal}`;
  }
  return `×${sessionsToday}`;
}

// Formats cumulative focus minutes as "Xh Ym" (≥60 min) or "Xm" (<60 min) for the ∑ badge.
// Exported for unit testing; pure function with no side effects.
export function formatLifetime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Returns the Pomodoro collapsed section badge string, or null when nothing to show.
// Combines the session count indicator (calcSessionCountStr) with today's total focus time.
// null: sessionsToday === 0 and sessionGoal absent — matches the calcSessionCountStr null case.
// "🍅 ✓N · Xm": goal reached or exceeded; N ≥ 1, so time suffix is always present.
// "🍅 ×N/G[ · Xm]": goal set, not yet reached; time suffix included only when N > 0.
// "🍅 ×N · Xm": no goal; N sessions completed today with time.
// focusMins: the configured focus phase duration (minutes per session).
// weekSessions: total sessions in the current 7-day window; absent/null/0 = omit week suffix.
// weekTrend: "↑"/"↓"/"" appended to weekSessions when provided; "" (stable) suppresses arrow.
// Exported for unit testing; pure function with no side effects.
export function calcPomodoroBadge(
  sessionsToday: number,
  sessionGoal: number | undefined,
  focusMins: number,
  focusStreak?: number,
  weekSessions?: number | null,
  weekTrend?: "↑" | "↓" | "",
): string | null {
  const countStr = calcSessionCountStr(sessionsToday, sessionGoal);
  if (countStr === null) return null;
  const timeSuffix = sessionsToday > 0 ? ` · ${formatLifetime(sessionsToday * focusMins)}` : "";
  const streakSuffix = focusStreak != null && focusStreak >= 2 ? ` · 🔥${focusStreak}d` : "";
  const weekSuffix = (weekSessions ?? 0) > 0
    ? ` · 7d·${weekSessions}${weekTrend ?? ""}`
    : "";
  return `🍅 ${countStr}${timeSuffix}${streakSuffix}${weekSuffix}`;
}

// Returns the number of consecutive days (including today) ending at todayStr with at least 1 pomodoro session.
// Counts backward from todayStr; stops at the first day with no sessions or a missing entry.
// Returns 0 when history is empty or there is a gap before today (or yesterday).
// Pure function with no side effects.
export function calcFocusStreak(history: PomodoroDay[], todayStr: string): number {
  // No early-exit on history.length === 0 alone: count=0 entries are valid and handled by the loop.
  const dateMap = new Map<string, number>(history.map(e => [e.date, e.count]));
  const parts = todayStr.split("-").map(Number);
  const [yr, mo, day] = parts; // local year/month/day — named distinctly to avoid shadowing inside loop
  let streak = 0;
  // If today has no sessions yet, start from yesterday (streak is still alive — user has rest of today).
  // If yesterday also has no sessions (count=0 or absent), the streak is 0.
  const todayCount = dateMap.get(todayStr) ?? 0;
  let daysBack = todayCount > 0 ? 0 : 1;
  // Walk backward using local Date arithmetic to avoid UTC offset issues
  while (true) {
    const cur = new Date(yr, mo - 1, day - daysBack); // local time — no TZ shift risk
    const dateKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    const count = dateMap.get(dateKey) ?? 0;
    if (count <= 0) break;
    streak++;
    daysBack++;
  }
  return streak;
}

// Returns percentage progress toward daily session goal, clamped to [0, 100].
// Returns null when goal is absent or zero (guards NaN from 0/0 and undefined access).
// Pure function with no side effects.
export function sessionGoalPct(sessionsToday: number, sessionGoal: number | undefined): number | null {
  if (sessionGoal == null || sessionGoal <= 0) return null;
  return Math.min(100, Math.round((sessionsToday / sessionGoal) * 100));
}

// Returns prev-7/cur-7 session counts, trend arrow, and histMap for the 14-day heatmap.
// last14Days partitioning: indices 0–6 = prev7 (previous week); indices 7–13 = cur7 (current week).
// trend: "↑" improving, "↓" declining, "" stable (suppressed when equal to avoid noise).
// histMap: fast O(1) date→count lookup for heatmap dot rendering.
// Returns null when sessionHistory is empty (no data to display).
export function calcSessionWeekTrend(
  sessionHistory: PomodoroDay[],
  last14Days: string[],
): { cur7: number; prev7: number; trend: "↑" | "↓" | ""; histMap: Map<string, number> } | null {
  if (sessionHistory.length === 0) return null;
  const histMap = new Map<string, number>(sessionHistory.map(d => [d.date, d.count]));
  const cur7  = last14Days.slice(7).reduce((s, d) => s + (histMap.get(d) ?? 0), 0);
  const prev7 = last14Days.slice(0, 7).reduce((s, d) => s + (histMap.get(d) ?? 0), 0);
  const trend: "↑" | "↓" | "" = cur7 > prev7 ? "↑" : cur7 < prev7 ? "↓" : "";
  return { cur7, prev7, trend, histMap };
}

// Plays a short audio cue when a Pomodoro phase ends using the Web Audio API.
// focus done: 3 ascending tones (C5→E5→G5) — celebratory "achievement" feel.
// break/longBreak done: 2 descending tones (G5→E5) — gentle "back to work" signal.
// Resolves immediately when AudioContext is unavailable (jsdom, restricted iframe, etc.).
// Not a pure function — has audio side effects; exported for integration in PomodoroTimer.
export async function playPhaseDone(phase: Phase): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx() as AudioContext;
    // focus: ascending C5→E5→G5 (523→659→784 Hz); break/longBreak: descending G5→E5 (784→659 Hz)
    const freqs: number[] = phase === "focus" ? [523, 659, 784] : [784, 659];
    const toneDuration = 0.12; // seconds per tone
    const toneGap = 0.04;     // silence between tones

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * (toneDuration + toneGap);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + toneDuration);
      osc.start(t);
      osc.stop(t + toneDuration);
    });

    // Wait until the last tone finishes: (N-1) gaps between tones + last tone duration + tiny pad.
    const totalMs = ((freqs.length - 1) * (toneDuration + toneGap) + toneDuration + 0.05) * 1000;
    await new Promise<void>(resolve => setTimeout(resolve, totalMs));
    await ctx.close();
  } catch {
    // Graceful fallback: AudioContext unavailable or restricted
  }
}

// Cumulative focus time milestones in minutes: 1h, 5h, 10h, 25h, 50h, 100h.
const LIFETIME_MILESTONE_MINS = [60, 300, 600, 1500, 3000, 6000] as const;
type LifetimeMilestone = (typeof LIFETIME_MILESTONE_MINS)[number];
const LIFETIME_MILESTONE_LABELS: Record<LifetimeMilestone, string> = {
  60:   "1시간",
  300:  "5시간",
  600:  "10시간",
  1500: "25시간",
  3000: "50시간",
  6000: "100시간",
};

// Returns the desktop notification body when cumulative focus time crosses a major milestone.
// Compares prevMins (before the session) to newMins (after) and fires on the highest threshold crossed.
// Returns null when no milestone was crossed (prevMins >= newMins, or both in the same milestone band).
// Exported for unit testing; pure function with no side effects.
export function calcPomodoroLifetimeMilestone(
  prevMins: number,
  newMins: number,
): string | null {
  if (newMins <= prevMins) return null;
  const crossed = LIFETIME_MILESTONE_MINS
    .filter(m => prevMins < m && newMins >= m)
    .sort((a, b) => b - a)[0];
  if (crossed == null) return null;
  return `🎉 누적 집중 ${LIFETIME_MILESTONE_LABELS[crossed]} 달성!`;
}

/**
 * Returns the Monday morning report for the previous week's total pomodoro sessions and active-day count.
 * last7Days: 7 YYYY-MM-DD strings ending yesterday — caller's responsibility to build this window.
 * history: rolling PomodoroDay array; only entries whose date is in last7Days and count > 0 are used.
 * Returns null when fewer than 3 days with sessions fall within the window (insufficient data for a report).
 * Lead emoji mirrors calcMomentumEveningDigest tier thresholds for consistency: ≥25 sessions=🔥, ≥10=✅, else=💪.
 * Exported for unit testing; pure function with no side effects.
 */
export function calcWeeklyPomodoroReport(
  history: PomodoroDay[],
  last7Days: string[],
): string | null {
  const dateWindow = new Set(last7Days);
  const active = history.filter(e => dateWindow.has(e.date) && e.count > 0);
  if (active.length < 3) return null;

  const total = active.reduce((s, e) => s + e.count, 0);
  const days = active.length;

  if (total >= 25) return `🔥 지난주 포모도로 ${total}세션 — 집중력 최고! (${days}일 활성)`;
  if (total >= 10) return `✅ 지난주 포모도로 ${total}세션 — 잘 집중했어요 (${days}일 활성)`;
  return `💪 지난주 포모도로 ${total}세션 — 이번 주엔 더 집중해봐요 (${days}일 활성)`;
}

/**
 * Returns a desktop-notification body summarising last month's pomodoro sessions from available history.
 * Fires on the 1st of each month at 09:00+ via the monthlyPomodoroReportDate guard in App.tsx.
 * prevMonthDays: all calendar days of the previous month — caller uses calcLastNDays(yesterday, yesterday.getDate())
 *   so the window length matches the actual month length (28/29/30/31) rather than a fixed 30 days.
 * Data constraint: pomodoroHistory is capped at 14 days by updatePomodoroHistory, so this function
 *   aggregates at most the last 14 days of the previous month (same constraint as calcMonthlyHabitReport).
 *   The report is a useful approximation of recent effort, not a full-month total.
 * Returns null when fewer than 3 active days (count > 0) are found within the window.
 * Thresholds: ≥100 sessions=🔥, ≥40=✅, else=💪.
 * Exported for unit testing; pure function with no side effects.
 */
export function calcMonthlyPomodoroReport(
  history: PomodoroDay[],
  prevMonthDays: string[],
): string | null {
  const dateWindow = new Set(prevMonthDays);
  const active = history.filter(e => dateWindow.has(e.date) && e.count > 0);
  if (active.length < 3) return null;

  const total = active.reduce((s, e) => s + e.count, 0);
  const days = active.length;

  if (total >= 100) return `🔥 지난달 포모도로 ${total}세션 — 집중력 최고! (${days}일 활성)`;
  if (total >= 40) return `✅ 지난달 포모도로 ${total}세션 — 잘 집중했어요 (${days}일 활성)`;
  return `💪 지난달 포모도로 ${total}세션 — 이번 달엔 더 집중해봐요 (${days}일 활성)`;
}

// Returns a desktop-notification body summarising last quarter's total pomodoro session count.
// Fires on the first day of each quarter (Jan 1, Apr 1, Jul 1, Oct 1) at 09:00+ via the
//   quarterlyPomodoroReportDate guard in App.tsx.
// prevQtrDays: all calendar days of the previous quarter — caller uses
//   calcLastNDays(yesterday, totalDaysInQuarter(yesterday)) so the window covers exactly Q1–Q4.
// Note: pomodoroHistory is capped at 14 days, so only the last ≤14 days of the quarter will match.
//   For this reason the session-count thresholds (≥100=🔥, ≥40=✅) match calcMonthlyPomodoroReport
//   rather than being scaled by quarter length (×3); the effective data window is the same ≤14 days.
// Returns null when fewer than 3 active (count > 0) days fall within the window.
// Exported for unit testing; pure function with no side effects.
export function calcQuarterlyPomodoroReport(
  history: PomodoroDay[],
  prevQtrDays: string[],
): string | null {
  const dateWindow = new Set(prevQtrDays);
  const active = history.filter(e => dateWindow.has(e.date) && e.count > 0);
  if (active.length < 3) return null;

  const total = active.reduce((s, e) => s + e.count, 0);
  const days = active.length;

  if (total >= 100) return `🔥 지난 분기 포모도로 ${total}세션 — 집중력 최고! (${days}일 활성)`;
  if (total >= 40) return `✅ 지난 분기 포모도로 ${total}세션 — 잘 집중했어요 (${days}일 활성)`;
  return `💪 지난 분기 포모도로 ${total}세션 — 이번 분기엔 더 집중해봐요 (${days}일 활성)`;
}

// Returns the desktop notification body when no pomodoro sessions have been completed today, null otherwise.
// Hour/date guards live in the caller (App.tsx useEffect) — fires after 10:00 via pomodoroMorningRemindDate guard.
// Callers should check pomodoroMorningRemindDate before invoking to ensure once-per-day delivery.
// sessionsToday: caller guarantees ≥0 (derived from calcTodaySessionCount or direct ?? 0 guard); negative treated as 0.
export function calcPomodoroMorningReminder(
  sessionsToday: number,
): string | null {
  if (sessionsToday > 0) return null;
  return "🍅 오늘 집중 세션을 시작해보세요!";
}

// Returns the number of consecutive PAST days (not including today) where sessions met or exceeded sessionGoal.
// Absent history entries are treated as 0 sessions (goal not met — same convention as calcFocusStreak).
// Returns 0 when sessionGoal ≤ 0 or yesterday did not meet the goal.
// Only past days are counted — today's sessions are intentionally excluded so this is stable until end-of-day.
// Loop termination: any absent date → count=0 < sessionGoal → immediate break; history is capped at 14 days
// (via updatePomodoroHistory) so in practice the loop runs at most 14 iterations. Same pattern as calcFocusStreak.
export function calcPomodoroGoalStreak(
  history: PomodoroDay[],
  sessionGoal: number,
  todayStr: string,
): number {
  if (sessionGoal <= 0) return 0;
  const dateMap = new Map<string, number>(history.map(e => [e.date, e.count]));
  const [yr, mo, day] = todayStr.split("-").map(Number);
  let streak = 0;
  let daysBack = 1; // start from yesterday; today is excluded
  while (true) {
    const cur = new Date(yr, mo - 1, day - daysBack); // local time — no TZ shift risk
    const dateKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    const count = dateMap.get(dateKey) ?? 0;
    if (count < sessionGoal) break;
    streak++;
    daysBack++;
  }
  return streak;
}

// Returns the average sessions per calendar day across all past entries in history (today excluded).
// Only days present in the history array are counted — absent days are not treated as zero.
// Zero-count entries (days with count=0) are included in the average, pulling the baseline down;
// this is intentional — a day with zero sessions is a valid low-productivity data point.
// History is capped at 14 days by updatePomodoroHistory; today is typically present in the array
// (written by the pomodoro session-complete handler), so today-exclusion via todayStr is load-bearing.
// Returns 0 when history has no past-day entries (first use or all entries are from today).
// Exported for unit testing; pure function with no side effects.
export function calcPomodoroRecentAvg(
  history: PomodoroDay[],
  todayStr: string,
): number {
  const past = history.filter(d => d.date !== todayStr);
  if (past.length === 0) return 0;
  return past.reduce((sum, d) => sum + d.count, 0) / past.length;
}

// Returns the desktop notification body when the daily pomodoro goal has not been reached by evening.
// When sessionGoal is set (>0): returns null once sessions >= sessionGoal; otherwise returns the remaining-session count with progress context.
// When sessionGoal is absent/0: returns null once any session has been completed; otherwise returns a generic no-session nudge.
// Hour/date guards live in the caller (App.tsx useEffect) — fires after 17:00 via pomodoroEveningRemindDate guard.
// Callers should check pomodoroEveningRemindDate before invoking to ensure once-per-day delivery.
// sessionsToday: caller guarantees ≥0; negative values are clamped to 0 in both goal-set and no-goal paths.
// sessionGoal: absent/0 = no daily goal (1-session threshold applies); positive integer = explicit goal.
export function calcPomodoroEveningReminder(
  sessionsToday: number,
  sessionGoal: number | undefined,
): string | null {
  const sessions = Math.max(0, sessionsToday); // clamp: negative values treated as 0 — caller guarantees ≥0
  const hasGoal = sessionGoal != null && sessionGoal > 0;
  if (hasGoal) {
    if (sessions >= sessionGoal!) return null;
    const remaining = sessionGoal! - sessions;
    return `🍅 목표까지 ${remaining}세션 남았어요! (${sessions}/${sessionGoal})`;
  }
  if (sessions > 0) return null;
  return "🍅 오늘 아직 집중 세션이 없어요!";
}

// Compares the current ISO-week total (Mon through today) against the same-length window one week ago.
// Uses the ISO week convention: Monday = position 1, Sunday = position 7.
// sessionsToday is the authoritative count for today; history entries for today's date are ignored.
// Returns { currentWeekTotal, prevWeekTotal } always — callers decide whether to show an insight based on these values.
// currentWeekTotal: sum of sessions from Monday to today (history for past days + sessionsToday for today).
// prevWeekTotal: sum of sessions from the same Mon-to-same-day window one ISO week earlier (7 days back).
// Exported for unit testing; pure function with no side effects.
export function calcPomodoroWeekRecord(
  history: PomodoroDay[],
  sessionsToday: number,
  todayStr: string,
): { currentWeekTotal: number; prevWeekTotal: number } {
  const base = new Date(todayStr + "T00:00:00");
  const jsDay = base.getDay();
  const isoPos = jsDay === 0 ? 7 : jsDay; // Mon=1 … Sun=7
  const daysSinceMonday = isoPos - 1;     // Mon→0, Tue→1, …, Sun→6

  const dateMap = new Map<string, number>(history.map(e => [e.date, e.count]));
  let currentWeekTotal = 0;
  let prevWeekTotal = 0;

  // Anchor to Monday of the current week; setDate handles month-boundary rollback automatically.
  const monday = new Date(base);
  monday.setDate(base.getDate() - daysSinceMonday);

  for (let offset = 0; offset <= daysSinceMonday; offset++) {
    const curDay = new Date(monday);
    curDay.setDate(monday.getDate() + offset);
    const curKey = curDay.toLocaleDateString("sv"); // YYYY-MM-DD

    const prevDay = new Date(curDay);
    prevDay.setDate(curDay.getDate() - 7);
    const prevKey = prevDay.toLocaleDateString("sv");

    // For today (last iteration) use sessionsToday as the authoritative count; history may be stale.
    currentWeekTotal += offset === daysSinceMonday ? sessionsToday : (dateMap.get(curKey) ?? 0);
    prevWeekTotal += dateMap.get(prevKey) ?? 0;
  }

  return { currentWeekTotal, prevWeekTotal };
}

// Returns a desktop-notification body summarising last year's total pomodoro session count.
// Fires on January 1st each year at 09:00+ via the yearlyPomodoroReportDate guard in App.tsx.
// prevYearDays: all calendar days of the previous year — caller uses
//   calcLastNDays(yesterday, totalDaysInYear(yesterday)) so the window covers exactly Jan 1–Dec 31.
// Note: pomodoroHistory is capped at 14 days, so only the last ≤14 days of the year will match.
//   For this reason the session-count thresholds (≥100=🔥, ≥40=✅) match calcQuarterlyPomodoroReport
//   rather than being scaled by year length; the effective data window is the same ≤14 days.
// Returns null when fewer than 3 active (count > 0) days fall within the window.
// Exported for unit testing; pure function with no side effects.
export function calcYearlyPomodoroReport(
  history: PomodoroDay[],
  prevYearDays: string[],
): string | null {
  const dateWindow = new Set(prevYearDays);
  const active = history.filter(e => dateWindow.has(e.date) && e.count > 0);
  if (active.length < 3) return null;

  const total = active.reduce((s, e) => s + e.count, 0);
  const days = active.length;

  if (total >= 100) return `🔥 지난 해 포모도로 ${total}세션 — 집중력 최고! (${days}일 활성)`;
  if (total >= 40) return `✅ 지난 해 포모도로 ${total}세션 — 잘 집중했어요 (${days}일 활성)`;
  return `💪 지난 해 포모도로 ${total}세션 — 올해엔 더 집중해봐요 (${days}일 활성)`;
}

// Minimum appearances per weekday required to include that day in the analysis.
const MIN_DOW_POMODORO_APPEARANCES = 2;
// Average sessions/day must be below this threshold to flag a day as "weak".
const WEAK_POMODORO_DAY_THRESHOLD = 1;
// Average sessions/day must meet or exceed this threshold to flag a day as "best".
const BEST_POMODORO_DAY_THRESHOLD = 3;

// Returns average pomodoro sessions per calendar day for each weekday (0=Sun … 6=Sat).
// Days in dayWindow not present in history are treated as 0 sessions (user was active but did no pomodoro).
// Returns null for a given weekday when it has fewer than MIN_DOW_POMODORO_APPEARANCES occurrences
// in dayWindow — insufficient data for a meaningful pattern.
// Returns all-null when dayWindow is empty OR when history has no entries with count > 0 (no session
// data recorded yet — avoids producing spurious all-zero averages that would trigger a false weak-day badge).
// Note: unlike calcDayOfWeekHabitRates, a 0-avg weekday is only meaningful when the user HAS some
// recorded session data; an entirely empty history produces null to signal "no data", not "0 sessions".
// Exported for unit testing; pure function with no side effects.
export function calcDayOfWeekPomodoroAvg(
  history: PomodoroDay[],
  dayWindow: string[],
): Record<number, number | null> {
  const result: Record<number, number | null> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  if (dayWindow.length === 0) return result;
  // No recorded sessions in any history entry → insufficient data; return all-null to avoid
  // spurious weak-day detection on users who haven't started using the pomodoro timer yet.
  if (!history.some(e => e.count > 0)) return result;
  const historyMap = new Map(history.map(h => [h.date, h.count]));
  const byDow: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const day of dayWindow) {
    const dow = new Date(day + "T00:00:00").getDay();
    byDow[dow].push(day);
  }
  for (let dow = 0; dow <= 6; dow++) {
    const days = byDow[dow];
    if (days.length < MIN_DOW_POMODORO_APPEARANCES) continue;
    const sum = days.reduce((acc, day) => acc + (historyMap.get(day) ?? 0), 0);
    result[dow] = sum / days.length;
  }
  return result;
}

// Returns the weekday (0–6) with the lowest non-null average strictly below WEAK_POMODORO_DAY_THRESHOLD (1).
// When multiple weekdays share the minimum average, returns the lowest weekday number for stability.
// Returns null when no weekday has a non-null average below the threshold.
// Exported for unit testing; pure function with no side effects.
export function calcWeakPomodoroDay(avgMap: Record<number, number | null>): number | null {
  let weakestDow: number | null = null;
  let weakestAvg = WEAK_POMODORO_DAY_THRESHOLD;
  for (let dow = 0; dow <= 6; dow++) {
    const avg = avgMap[dow];
    if (avg === null) continue;
    if (avg < weakestAvg) { weakestAvg = avg; weakestDow = dow; }
  }
  return weakestDow;
}

// Returns the weekday (0–6) with the highest non-null average at or above BEST_POMODORO_DAY_THRESHOLD (3).
// When multiple weekdays share the maximum average, returns the lowest weekday number for stability
// (strict > means the first/lowest DoW encountered in the 0→6 loop wins on a tie).
// Returns null when no weekday has a non-null average at or above the threshold.
// Exported for unit testing; pure function with no side effects.
export function calcBestPomodoroDay(avgMap: Record<number, number | null>): number | null {
  let bestDow: number | null = null;
  let bestAvg: number | null = null;
  for (let dow = 0; dow <= 6; dow++) {
    const avg = avgMap[dow];
    if (avg === null || avg < BEST_POMODORO_DAY_THRESHOLD) continue;
    if (bestAvg === null || avg > bestAvg) { bestAvg = avg; bestDow = dow; }
  }
  return bestDow;
}

// Minimum samples per bucket required for calcPomodoroMomentumCorrelation to fire.
// Mirrors MIN_CORRELATION_SAMPLES in habits.ts and intention.ts — keeps the threshold consistent.
const MIN_CORRELATION_SAMPLES = 5;

// Counts how many days in last7Days had session count >= sessionGoal.
// For today (todayStr), uses the live sessionsToday value rather than the persisted history entry
// so the badge responds to the current session even before the history is flushed.
// sessionGoal <= 0 always returns 0 (no meaningful goal to track).
// Days missing from history are treated as 0 sessions (not counted as goal-met).
// Exported for unit testing; pure function with no side effects.
export function calcPomodoroWeekGoalDays(
  history: PomodoroDay[],
  sessionGoal: number,
  last7Days: string[],
  sessionsToday: number,
  todayStr: string,
): number {
  if (sessionGoal <= 0) return 0;
  const dateMap = new Map<string, number>(history.map(e => [e.date, e.count]));
  let count = 0;
  for (const day of last7Days) {
    const sessions = day === todayStr ? sessionsToday : (dateMap.get(day) ?? 0);
    if (sessions >= sessionGoal) count++;
  }
  return count;
}

// Returns the rounded momentum-score gap between days where the pomodoro session goal was met
// (count >= sessionGoal) and days where it was not met (count < sessionGoal, including missing = 0).
// Today is excluded so in-progress data doesn't skew the historical correlation.
// Returns null when: sessionGoal is absent or ≤ 0, momentumHistory is empty,
// or either bucket has fewer than MIN_CORRELATION_SAMPLES past entries.
// Returns null (not the raw gap) when the gap < 15 — only statistically meaningful gaps surface.
// Mirrors calcHabitMomentumCorrelation (habits.ts) and calcIntentionMomentumCorrelation (intention.ts).
// Exported for unit testing; pure function with no side effects.
export function calcPomodoroMomentumCorrelation(
  history: PomodoroDay[],
  momentumHistory: MomentumEntry[],
  sessionGoal: number | undefined,
  todayStr: string,
): number | null {
  if (sessionGoal == null || sessionGoal <= 0) return null;
  if (momentumHistory.length === 0) return null;

  // Build a date → session count map; dates absent from history default to 0 (no sessions that day).
  const countMap = new Map<string, number>(history.map(e => [e.date, e.count]));

  let goalMetTotal = 0, goalMetCount = 0;
  let notGoalMetTotal = 0, notGoalMetCount = 0;

  for (const entry of momentumHistory) {
    if (entry.date >= todayStr) continue; // exclude today's in-progress score and any future dates
    const count = countMap.get(entry.date) ?? 0;
    if (count >= sessionGoal) {
      goalMetTotal += entry.score;
      goalMetCount++;
    } else {
      notGoalMetTotal += entry.score;
      notGoalMetCount++;
    }
  }

  if (goalMetCount < MIN_CORRELATION_SAMPLES || notGoalMetCount < MIN_CORRELATION_SAMPLES) return null;
  const gap = Math.round(goalMetTotal / goalMetCount - notGoalMetTotal / notGoalMetCount);
  return gap >= 15 ? gap : null;
}

// Minimum consecutive past days without any pomodoro session before a focus drought warning fires.
// Mirrors MIN_INTENTION_MISS_DAYS in intention.ts for threshold symmetry with intention_gap_warning.
const MIN_FOCUS_DROUGHT_DAYS = 3;
// Maximum days to look back; matches the 14-day rolling history cap so the lookback is bounded.
const FOCUS_DROUGHT_LOOKBACK = 14;

// Returns the number of consecutive past days (ending yesterday) with no pomodoro sessions.
// Guard: returns null when there are no past entries at any count level (user has never opened the panel).
// Drought chain: a past day breaks the drought only when count > 0; absent days and count=0 days extend it.
// Returns null when the consecutive drought span is shorter than MIN_FOCUS_DROUGHT_DAYS (3).
// Does not consider today — the caller guards with sessionsToday === 0 before surfacing a badge.
// Mirrors calcIntentionConsecutiveMiss guard semantics: any past entry (not just count>0) satisfies the guard.
// Pure function with no side effects.
export function calcFocusDroughtDays(history: PomodoroDay[], todayStr: string): number | null {
  // Guard: any past entry means the user has engaged with the feature (mirrors calcIntentionConsecutiveMiss).
  const pastDates = new Set(history.filter(e => e.date < todayStr).map(e => e.date));
  if (pastDates.size === 0) return null;
  // activeDates: past days with actual completed sessions — used only to break the drought chain.
  const activeDates = new Set(history.filter(e => e.date < todayStr && e.count > 0).map(e => e.date));
  const base = new Date(todayStr + "T00:00:00");
  let count = 0;
  for (let i = 1; i <= FOCUS_DROUGHT_LOOKBACK; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    if (activeDates.has(d.toLocaleDateString("sv"))) break;
    count++;
  }
  return count >= MIN_FOCUS_DROUGHT_DAYS ? count : null;
}

