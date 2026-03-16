// ABOUTME: calcTodayInsight — context-aware daily insight engine for the Clock badge
// ABOUTME: Priority chain: streak risk > deadline critical > milestone > perfect day > intention > period_start (year/quarter/month/week) > no_focus_project > pomodoro > deadline soon > project behind (≥20% gap) > goal expiry (week≤2d > month≤2d > quarter≤7d > year≤14d) > goal midpoint (Thu/mid-month/mid-quarter/mid-year, cascade year>quarter>month>week) > momentum decline > project stale > streak recession (≥7d broken yesterday) > habit consecutive miss (≥3d) > momentum rise > goal done (year>quarter>month>week, daysLeft above expiry threshold) > project ahead (≥20% ahead of schedule) > personal best

import { getUpcomingMilestone } from "./habits";
import { calcMomentumTrend } from "./momentum";
import { calcScheduleGap } from "./projects";
import type { Project, MomentumEntry } from "../types";

export type InsightLevel = "success" | "warning" | "info";

export interface TodayInsight {
  text: string;
  level: InsightLevel;
}

interface InsightParams {
  habits: Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number; checkHistory?: string[] }>;
  todayStr: string;
  nowHour: number;
  todayIntentionDate: string | undefined;
  sessionsToday: number;
  sessionGoal: number | undefined;
  habitsAllDoneDate: string | undefined;
  /**
   * Active/in-progress projects to surface deadline warnings, behind-schedule alerts, stale-focus alerts, and focus-selection nudge; absent = no project context.
   * `createdDate`, `progress`, and `isFocus` are optional for backwards compatibility with test fixtures that omit them;
   * projects without createdDate+progress are explicitly excluded from the behind-schedule check (not silently skipped).
   */
  projects?: Array<Pick<Project, "name" | "deadline" | "status" | "lastFocusDate"> & { createdDate?: string; progress?: number; isFocus?: boolean }>;
  /** Weekly goal text; absent/empty = no goal set. */
  weekGoal?: string;
  /** True when weekly goal has been marked done; absent/false = not done. */
  weekGoalDone?: boolean;
  /** Days remaining in the current ISO week (Mon–Sun) including today; Monday=7, Thursday=4, Sunday=1.
   *  Caller MUST use an ISO-week (Monday-start) calculation — e.g. daysLeftInWeek() from datePeriods.ts.
   *  A Sunday-start calendar would shift the Thursday mid-week trigger to Wednesday. */
  daysLeftWeek?: number;
  /** Monthly goal text; absent/empty = no goal set. */
  monthGoal?: string;
  /** True when monthly goal has been marked done; absent/false = not done. */
  monthGoalDone?: boolean;
  /** Days remaining in the current calendar month (including today); 1 = last day of the month. */
  daysLeftMonth?: number;
  /** Quarterly goal text; absent/empty = no goal set. */
  quarterGoal?: string;
  /** True when quarterly goal has been marked done; absent/false = not done. */
  quarterGoalDone?: boolean;
  /** Days remaining in the current calendar quarter (including today); 1 = last day of the quarter. */
  daysLeftQuarter?: number;
  /** Yearly goal text; absent/empty = no goal set. */
  yearGoal?: string;
  /** True when yearly goal has been marked done; absent/false = not done. */
  yearGoalDone?: boolean;
  /** Days remaining in the current calendar year (including today); 1 = last day of the year. */
  daysLeftYear?: number;
  /** Rolling 7-day momentum score history; used to detect a 3-consecutive-day decline. */
  momentumHistory?: MomentumEntry[];
}

// Habit streak milestones at which a personal-best celebration is shown (mirrors getUpcomingMilestone targets).
// Restricting to these values prevents the insight from firing every day while on a continuous best-streak run.
const PERSONAL_BEST_MILESTONES = [7, 30, 100];

// Minimum consecutive days a habit must be unchecked before a re-engagement nudge is surfaced.
const MIN_MISS_DAYS = 3;
// How many calendar days to scan backward when counting consecutive missed check-ins.
// Matches the maximum checkHistory window defined on the Habit type.
const MISS_LOOKBACK_DAYS = 14;

// Scans habit checkHistory to find the most consecutively neglected habit.
// Counts backward from yesterday — today is excluded because the user can still check in.
// Returns the worst offender if at least MIN_MISS_DAYS consecutive days were missed; null otherwise.
function calcHabitConsecutiveMiss(
  habits: Array<{ name: string; checkHistory?: string[] }>,
  todayStr: string
): { name: string; missedDays: number } | null {
  const base = new Date(todayStr + "T00:00:00");
  let worst: { name: string; missedDays: number } | null = null;

  for (const habit of habits) {
    // Skip habits without checkHistory — absent data ≠ absent check-ins
    if (!habit.checkHistory) continue;
    const history = new Set(habit.checkHistory);
    let count = 0;
    for (let i = 1; i <= MISS_LOOKBACK_DAYS; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      if (history.has(d.toLocaleDateString("sv"))) break;
      count++;
    }
    if (count >= MIN_MISS_DAYS && (!worst || count > worst.missedDays)) {
      worst = { name: habit.name, missedDays: count };
    }
  }

  return worst;
}

// Returns days from todayStr until deadline (0 = today, positive = future). Uses injected todayStr for testability.
function daysUntil(deadline: string, todayStr: string): number | null {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const d = new Date(deadline + "T00:00:00").getTime();
  const t = new Date(todayStr + "T00:00:00").getTime();
  if (isNaN(d) || isNaN(t)) return null;
  return Math.floor((d - t) / 86400000);
}

// Returns the single most relevant actionable insight for the user right now, or null if nothing notable.
// Priority order: streak_at_risk > deadline_critical > milestone_near > perfect_day > intention_missing > period_start > no_focus_project > pomodoro_last_one > deadline_soon > goal_expiry > momentum_decline > project_stale > streak_recession > habit_consecutive_miss > momentum_rise > goal_done > personal_best.
export function calcTodayInsight(params: InsightParams): TodayInsight | null {
  const {
    habits, todayStr, nowHour, todayIntentionDate, sessionsToday, sessionGoal, habitsAllDoneDate, projects,
    weekGoal, weekGoalDone, daysLeftWeek,
    monthGoal, monthGoalDone, daysLeftMonth,
    quarterGoal, quarterGoalDone, daysLeftQuarter,
    yearGoal, yearGoalDone, daysLeftYear,
    momentumHistory,
  } = params;

  // 1. Streak at risk: evening (≥ 18h) + high streak (≥ 7) + not yet checked today
  if (nowHour >= 18) {
    const atRisk = habits
      .filter(h => h.streak >= 7 && h.lastChecked !== todayStr)
      .sort((a, b) => b.streak - a.streak)[0];
    if (atRisk) {
      return { text: `⚠️ ${atRisk.name} ${atRisk.streak}일 스트릭 위험`, level: "warning" };
    }
  }

  // 2. Deadline critical: active/in-progress project deadline within 0–3 days
  if (projects && projects.length > 0) {
    const critical = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && p.deadline)
      .map(p => ({ name: p.name, days: daysUntil(p.deadline!, todayStr) }))
      .filter((p): p is { name: string; days: number } => p.days !== null && p.days >= 0 && p.days <= 3)
      .sort((a, b) => a.days - b.days)[0];
    if (critical) {
      const label = critical.days === 0 ? "D-Day" : `D-${critical.days}`;
      return { text: `⚡ ${critical.name} ${label}`, level: "warning" };
    }
  }

  // 3. Milestone 1 day away: checking in today would reach the next milestone
  const milestoneCandidate = habits
    .filter(h => h.streak > 0 && h.lastChecked !== todayStr)
    .map(h => ({ habit: h, ms: getUpcomingMilestone(h.streak, 1) }))
    .find(({ ms }) => ms !== null);
  if (milestoneCandidate && milestoneCandidate.ms) {
    const { habit, ms } = milestoneCandidate;
    return { text: `🎯 ${habit.name} ${ms.badge} 1일 전!`, level: "info" };
  }

  // 4. Perfect day: all habits completed today
  if (habitsAllDoneDate === todayStr) {
    return { text: "✨ 오늘 완벽한 습관 달성!", level: "success" };
  }

  // 5. Intention missing: morning (< 12h) and today's intention not yet set
  if (nowHour < 12 && todayIntentionDate !== todayStr) {
    return { text: "✍️ 오늘의 의도를 설정해보세요", level: "info" };
  }

  // 6. Period start: morning + first day of a new period + no goal set yet.
  // Cascade: year > quarter > month > week — largest period takes precedence on overlapping start dates.
  // Excludes days when intention_missing already fired (nowHour < 12 but intention not set).
  if (nowHour < 12 && todayIntentionDate === todayStr) {
    const [yr, mo, day] = todayStr.split("-").map(Number);
    const wday = new Date(yr, mo - 1, day).getDay(); // 0 = Sunday, 1 = Monday, 6 = Saturday
    if (mo === 1 && day === 1 && !yearGoal) {
      return { text: "🎯 새 해! 연간 목표를 세워보세요", level: "info" };
    }
    if ((mo === 1 || mo === 4 || mo === 7 || mo === 10) && day === 1 && !quarterGoal) {
      return { text: "📋 새 분기! 분기 목표를 세워보세요", level: "info" };
    }
    if (day === 1 && !monthGoal) {
      return { text: "📅 새 달! 월간 목표를 세워보세요", level: "info" };
    }
    if (wday === 1 && !weekGoal) {
      return { text: "🗓️ 새 주! 주간 목표를 세워보세요", level: "info" };
    }
  }

  // 6.5. No focus project: morning (< noon) + intention already set + active/in-progress projects + none starred.
  // Requires todayIntentionDate === todayStr (mirrors period_start gate at 6) so the nudge only fires
  // after the user has set their daily intention — preserving the intention → goal → focus planning sequence.
  // isFocus === true is the only "focused" state; undefined and false both mean "not focused"
  // (Project type has no explicit "user removed focus" state — see src/types.ts).
  if (nowHour < 12 && todayIntentionDate === todayStr && projects && projects.length > 0) {
    const active = projects.filter(p => p.status !== "done" && p.status !== "paused");
    if (active.length > 0 && !active.some(p => p.isFocus === true)) {
      return { text: `🎯 오늘 집중 프로젝트를 선택하세요 · ${active.length}개 진행 중`, level: "info" };
    }
  }

  // 7. Pomodoro: one session away from daily goal
  if (sessionGoal !== undefined && sessionsToday === sessionGoal - 1) {
    return { text: "🍅 포모도로 목표까지 1세션!", level: "info" };
  }

  // 8. Deadline soon: active/in-progress project deadline within 4–7 days
  if (projects && projects.length > 0) {
    const soon = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && p.deadline)
      .map(p => ({ name: p.name, days: daysUntil(p.deadline!, todayStr) }))
      .filter((p): p is { name: string; days: number } => p.days !== null && p.days >= 4 && p.days <= 7)
      .sort((a, b) => a.days - b.days)[0];
    if (soon) {
      return { text: `📅 ${soon.name} D-${soon.days}`, level: "info" };
    }
  }

  // 8.5. Project behind schedule: deadline > 7 days away but progress is ≥ 20% behind timeline plan.
  // Uses calcScheduleGap (gap = progress% - timePct%); fires when gap ≤ -20.
  // Skipped when deadline ≤ 7 days — deadline_critical/deadline_soon already cover those urgent cases.
  // today injected via todayStr for deterministic testing.
  if (projects && projects.length > 0) {
    const todayForSchedule = new Date(todayStr + "T00:00:00");
    const behind = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && p.deadline && p.progress != null && p.createdDate)
      .filter(p => { const days = daysUntil(p.deadline!, todayStr); return days !== null && days > 7; })
      .map(p => {
        const sg = calcScheduleGap(p.progress!, p.createdDate, p.deadline, todayForSchedule);
        return sg !== null && sg.gap <= -20 ? { name: p.name, gap: sg.gap } : null;
      })
      .filter((p): p is { name: string; gap: number } => p !== null)
      .sort((a, b) => a.gap - b.gap)[0]; // most behind first
    if (behind) {
      return { text: `⏳ ${behind.name} 일정 ${Math.abs(behind.gap)}% 뒤처짐`, level: "warning" };
    }
  }

  // 9. Goal expiry: personal goal period ending soon and not yet marked done.
  // Priority: week (≤2d) > month (≤2d) > quarter (≤7d) > year (≤14d) — shorter cycle = higher urgency.
  if (weekGoal && !weekGoalDone && daysLeftWeek != null && daysLeftWeek <= 2) {
    const suffix = daysLeftWeek <= 1 ? "오늘 마감" : `${daysLeftWeek}일`;
    return { text: `📋 주간 목표 마감 임박 (${suffix})`, level: "warning" };
  }
  if (monthGoal && !monthGoalDone && daysLeftMonth != null && daysLeftMonth <= 2) {
    const suffix = daysLeftMonth <= 1 ? "오늘 마감" : `${daysLeftMonth}일`;
    return { text: `📋 월간 목표 마감 임박 (${suffix})`, level: "warning" };
  }
  if (quarterGoal && !quarterGoalDone && daysLeftQuarter != null && daysLeftQuarter <= 7) {
    const suffix = daysLeftQuarter <= 1 ? "오늘 마감" : `${daysLeftQuarter}일`;
    return { text: `📋 분기 목표 마감 임박 (${suffix})`, level: "warning" };
  }
  if (yearGoal && !yearGoalDone && daysLeftYear != null && daysLeftYear <= 14) {
    const suffix = daysLeftYear <= 1 ? "오늘 마감" : `${daysLeftYear}일`;
    return { text: `📋 연간 목표 마감 임박 (${suffix})`, level: "warning" };
  }

  // 9.3. Goal midpoint: goal period halfway through and not yet marked done — soft mid-term check-in nudge.
  // Fires once per period at the exact midpoint day; complementary to goal_expiry (9) which handles end-of-period urgency.
  // Cascade: year > quarter > month > week — largest period takes precedence (mirrors period_start at 6).
  // Midpoint definitions (daysLeft includes today):
  //   week    : daysLeftWeek === 4 (Thursday — 3 days elapsed in a 7-day ISO week)
  //   month   : daysLeftMonth in [15, 16] (day 15–16 of 28–31-day months)
  //   quarter : daysLeftQuarter in [46, 47] (day ~45–46 of 90–92-day quarters)
  //   year    : daysLeftYear in [183, 184] (183 = day 183/365 or day 184/366; 184 = day 183/366 — both cover first-past-midpoint day)
  if (yearGoal && !yearGoalDone && daysLeftYear != null && (daysLeftYear === 183 || daysLeftYear === 184)) {
    return { text: "📊 연간 목표 중반 점검 — 절반이 지났어요", level: "info" };
  }
  if (quarterGoal && !quarterGoalDone && daysLeftQuarter != null && (daysLeftQuarter === 46 || daysLeftQuarter === 47)) {
    return { text: "📊 분기 목표 중반 점검 — 절반이 지났어요", level: "info" };
  }
  if (monthGoal && !monthGoalDone && daysLeftMonth != null && (daysLeftMonth === 15 || daysLeftMonth === 16)) {
    return { text: "📊 월간 목표 중반 점검 — 절반이 지났어요", level: "info" };
  }
  if (weekGoal && !weekGoalDone && daysLeftWeek != null && daysLeftWeek === 4) {
    return { text: "📊 주간 목표 중반 점검 — 이번 주 진행 중인가요?", level: "info" };
  }

  // 9.5. Momentum decline: 3 consecutive days each strictly lower than the day before — pattern signals a systemic productivity slide.
  // Fires when calcMomentumTrend returns "declining"; absent/insufficient history → skipped.
  if (momentumHistory && calcMomentumTrend(momentumHistory, todayStr) === "declining") {
    return { text: "📉 3일 연속 모멘텀 하락 — 루틴 점검", level: "warning" };
  }

  // 10. Project stale: active/in-progress project not focused via pomodoro in 7+ days
  if (projects && projects.length > 0) {
    const todayMs = new Date(todayStr + "T00:00:00").getTime();
    const stale = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && p.lastFocusDate && /^\d{4}-\d{2}-\d{2}$/.test(p.lastFocusDate))
      .map(p => {
        const lastMs = new Date(p.lastFocusDate! + "T00:00:00").getTime();
        return isNaN(lastMs) ? null : { name: p.name, days: Math.floor((todayMs - lastMs) / 86400000) };
      })
      .filter((p): p is { name: string; days: number } => p !== null && p.days >= 7)
      .sort((a, b) => b.days - a.days)[0]; // most neglected first
    if (stale) {
      return { text: `⊖ ${stale.name} ${stale.days}일째 미집중`, level: "info" };
    }
  }

  // 10.1. Streak recession: fires on the first morning after a significant (≥7d) streak breaks.
  // Condition: lastChecked === 2 days ago (yesterday was the missed day; today is the first morning the break is confirmed).
  // Fires any time of day — streak_at_risk (priority 1) takes over in the evening via priority ordering.
  // Picks the habit with the highest broken streak when multiple qualify.
  // habit_consecutive_miss (10.2) handles longer absences (3+ days); this covers exactly the day-after-break.
  const dayBeforeYesterdayDate = new Date(todayStr + "T00:00:00");
  dayBeforeYesterdayDate.setDate(dayBeforeYesterdayDate.getDate() - 2);
  const dayBeforeYesterday = dayBeforeYesterdayDate.toLocaleDateString("sv");
  const recessionHabit = habits
    .filter(h => (h.streak ?? 0) >= 7 && h.lastChecked === dayBeforeYesterday)
    .sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))[0];
  if (recessionHabit) {
    return { text: `💔 ${recessionHabit.name} ${recessionHabit.streak}일 스트릭 끊어짐 — 오늘 다시?`, level: "warning" };
  }

  // 10.2. Habit consecutive miss: a habit not checked in for 3+ consecutive days — re-engagement nudge.
  // Counts backward from yesterday (today excluded — user can still check in).
  // Picks the most neglected habit when multiple qualify.
  const habitMiss = calcHabitConsecutiveMiss(habits, todayStr);
  if (habitMiss) {
    return { text: `🔄 ${habitMiss.name} ${habitMiss.missedDays}일 연속 미완료`, level: "warning" };
  }

  // 10.5. Momentum rise: 3 consecutive days each strictly higher than the day before — positive feedback for a productivity upswing.
  // Fires when calcMomentumTrend returns "rising"; absent/insufficient history → skipped.
  if (momentumHistory && calcMomentumTrend(momentumHistory, todayStr) === "rising") {
    return { text: "📈 3일 연속 모멘텀 상승!", level: "success" };
  }

  // 10.7. Goal done: a period goal was marked done with time remaining above the expiry-alert threshold.
  // Fires as a positive reinforcement fallback when no re-engagement or momentum alert is active.
  // Cascade: year > quarter > month > week — largest period takes precedence (mirrors period_start and goal_midpoint).
  // Threshold mirrors goal_expiry (priority 9) in reverse: only fires when goal_expiry would NOT fire,
  // so the two never coexist (goal_expiry requires !done; goal_done requires done).
  if (yearGoal && yearGoalDone && daysLeftYear != null && daysLeftYear > 14) {
    return { text: `🎉 연간 목표 달성! (${daysLeftYear}일 남음)`, level: "success" };
  }
  if (quarterGoal && quarterGoalDone && daysLeftQuarter != null && daysLeftQuarter > 7) {
    return { text: `🎉 분기 목표 달성! (${daysLeftQuarter}일 남음)`, level: "success" };
  }
  if (monthGoal && monthGoalDone && daysLeftMonth != null && daysLeftMonth > 2) {
    return { text: `🎉 월간 목표 달성! (${daysLeftMonth}일 남음)`, level: "success" };
  }
  if (weekGoal && weekGoalDone && daysLeftWeek != null && daysLeftWeek > 2) {
    return { text: `🎉 주간 목표 달성! (${daysLeftWeek}일 남음)`, level: "success" };
  }

  // 10.8. Project ahead of schedule: active/in-progress project >7 days from deadline with ≥20% schedule surplus.
  // Mirrors project_behind (8.5) as positive reinforcement — fires when gap = progress% - timePct% ≥ +20.
  // Picks the most ahead project (highest gap) when multiple qualify.
  // Fires after goal_done (10.7) so goal achievements take precedence over schedule observations.
  if (projects && projects.length > 0) {
    const todayForSchedule = new Date(todayStr + "T00:00:00");
    const ahead = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && p.deadline && p.progress != null && p.createdDate)
      .filter(p => { const days = daysUntil(p.deadline!, todayStr); return days !== null && days > 7; })
      .map(p => {
        const sg = calcScheduleGap(p.progress!, p.createdDate, p.deadline, todayForSchedule);
        return sg !== null && sg.gap >= 20 ? { name: p.name, gap: sg.gap } : null;
      })
      .filter((p): p is { name: string; gap: number } => p !== null)
      .sort((a, b) => b.gap - a.gap)[0]; // most ahead first
    if (ahead) {
      return { text: `⚡ ${ahead.name} 일정 ${ahead.gap}% 앞서가는 중!`, level: "success" };
    }
  }

  // 11. Personal best streak: habit checked in today, streak hit a milestone (7/30/100d),
  // and streak equals bestStreak (all-time high). Milestone gate prevents daily repetition
  // on continuous best-streak runs.
  const personalBest = habits
    .filter(h =>
      h.bestStreak != null &&
      PERSONAL_BEST_MILESTONES.includes(h.streak) &&
      h.streak === h.bestStreak &&
      h.lastChecked === todayStr
    )
    .sort((a, b) => b.streak - a.streak)[0];
  if (personalBest) {
    return { text: `🏆 ${personalBest.name} 역대 최고! (${personalBest.streak}d)`, level: "success" };
  }

  return null;
}
