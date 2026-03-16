// ABOUTME: Helpers for pomodoro session statistics, phase UI mapping, audio feedback, morning start nudge, evening goal-gap nudge, and lifetime milestone notifications
// ABOUTME: Covers phase color/label, today-count derivation, 14-day history upsert, date range, week trend, header badge string, focus streak, lifetime format, goal-progress percentage, session-end audio cue, morning reminder, evening reminder, cumulative focus milestone crossing, and goal-streak consecutive past days

import type { PomodoroDay } from "../types";
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
