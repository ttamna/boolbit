// ABOUTME: calcTodayInsight — context-aware daily insight engine for the Clock badge
// ABOUTME: Priority chain: streak risk > deadline critical > ci_failure (active project CI broken) > milestone > open_prs (active project has open PRs awaiting review) > github_drought (active project >7 days since last commit) > open_issues (active project ≥5 open GitHub issues) > perfect day > intention > period_start (year/quarter/month/week) > no_focus_project > weak_day_ahead (morning, historically low-completion weekday) > best_day_ahead (morning, historically high-completion weekday ≥80%) > pomodoro_last_one > pomodoro_goal_streak (≥2 consecutive past goal days) > pomodoro_day_record (today's session count beats all-time single-day best) > pomodoro_goal_reached > deadline soon > project behind (≥20% gap) > goal expiry (week≤2d > month≤2d > quarter≤7d > year≤14d) > goal midpoint (Thu/mid-month/mid-quarter/mid-year, cascade year>quarter>month>week) > momentum decline > project stale > project context switching (≥4 active projects all focused within 7 days) > streak recession (≥7d broken yesterday) > habit consecutive miss (≥3d) > almost perfect day (≥14h, 1–2 habits left) > momentum rise > goal done (year>quarter>month>week, daysLeft above expiry threshold) > goal streak (past ≥1 consecutive done weeks, morning only) > month_goal_streak (past ≥2 consecutive done months, morning only) > project ahead (≥20% ahead of schedule) > project near completion (progress ≥90%) > project forecast (at-current-pace completion date for on-track projects with deadline >7d) > personal best > habit target near (user-defined targetStreak within 2 days) > intention streak (≥7d consecutive intention-setting)

import { getUpcomingMilestone } from "./habits";
import { calcMomentumTrend } from "./momentum";
import { calcScheduleGap, calcCompletionForecast } from "./projects";
import type { Project, MomentumEntry, GitHubData } from "../types";

export type InsightLevel = "success" | "warning" | "info";

export interface TodayInsight {
  text: string;
  level: InsightLevel;
}

interface InsightParams {
  habits: Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number; checkHistory?: string[]; targetStreak?: number }>;
  todayStr: string;
  nowHour: number;
  todayIntentionDate: string | undefined;
  sessionsToday: number;
  sessionGoal: number | undefined;
  habitsAllDoneDate: string | undefined;
  /**
   * Active/in-progress projects to surface deadline warnings, ci_failure alerts, open_prs alerts, behind-schedule alerts, stale-focus alerts, and focus-selection nudge; absent = no project context.
   * `createdDate`, `progress`, `isFocus`, and `githubData` are optional for backwards compatibility with test fixtures that omit them;
   * projects without createdDate+progress are explicitly excluded from the behind-schedule check (not silently skipped).
   * `githubData.openPrs` is optional here (vs required in GitHubData) so existing test fixtures that only provide ciStatus
   * remain valid — githubData?.openPrs ?? 0 is used at call-sites so absent openPrs is treated as 0.
   * `githubData.lastCommitAt` is optional here so existing test fixtures that omit it remain valid;
   * absent lastCommitAt skips the github_drought check silently.
   * `githubData.openIssues` is optional here so existing test fixtures that omit it remain valid;
   * absent openIssues is treated as 0 — no open_issues badge fires.
   */
  projects?: Array<Pick<Project, "name" | "deadline" | "status" | "lastFocusDate"> & { createdDate?: string; progress?: number; isFocus?: boolean; githubData?: Pick<GitHubData, "ciStatus"> & { openPrs?: number; lastCommitAt?: string | null; openIssues?: number } }>;
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
  /**
   * Number of consecutive PAST ISO weeks (excluding current) where the weekly goal was marked done.
   * A value ≥ 1 with weekGoalDone === false triggers a morning streak-encouragement nudge.
   * Absent/undefined = no streak data available.
   */
  weekGoalPastDoneStreak?: number;
  /**
   * Number of consecutive PAST calendar months (excluding the current month) where the monthly goal was achieved.
   * Derived by filtering monthGoalHistory to done===true entries, calling calcMonthGoalStreak, then subtracting 1.
   * Note: the done===true filter applies to the history array (past months) only; the current month's
   * goal presence is determined by monthGoal/monthGoalDate in calcMonthGoalStreak, not by this filter.
   * A value ≥ 2 with monthGoalDone === false triggers a morning streak-encouragement nudge.
   * Absent/undefined = no streak data available.
   */
  monthGoalPastDoneStreak?: number;
  /**
   * Number of consecutive PAST days (not including today) where the daily pomodoro sessionGoal was met or exceeded.
   * A value ≥ 2 with today's sessions < sessionGoal triggers a goal-streak nudge.
   * Absent/undefined = no streak data or sessionGoal not set.
   */
  pomodoroGoalStreak?: number;
  /**
   * Maximum session count on any single PAST calendar day in pomodoroHistory (today excluded).
   * When sessionsToday strictly exceeds this value — and the daily goal is also reached (or absent/zero) —
   * a "신기록" celebration badge fires at priority 7.49, preempting the plain goal-reached badge (7.5).
   * "No goal" means sessionGoal is undefined OR 0 (mirrors the sessionGoal > 0 guard in goal_reached).
   * Absent/undefined = no past-day baseline; no record check is performed.
   */
  pomodoroSessionBest?: number;
  /**
   * Consecutive days (including today) on which the user has set a daily intention.
   * Capped at 7 by calcIntentionStreak (today + 6 history days).
   * A value ≥ 7 with todayIntentionDate === todayStr triggers an intention-streak badge.
   * Absent/undefined = streak unknown; 0 = no streak.
   */
  intentionConsecutiveDays?: number;
  /**
   * True when today's weekday is the user's historically weakest habit day (below 60% avg completion).
   * Caller derives this via calcWeakDayOfWeek(calcDayOfWeekHabitRates(habits, last28Days)) === todayDow.
   * Absent/false = today is not a weak day or insufficient data; no nudge is shown.
   */
  todayIsWeakHabitDay?: boolean;
  /**
   * True when today's weekday is the user's historically strongest habit day (at or above 80% avg completion).
   * Caller derives this via calcBestDayOfWeek(calcDayOfWeekHabitRates(habits, last28Days)) === todayDow.
   * Absent/false = today is not a best day or insufficient data; no nudge is shown.
   * When todayIsWeakHabitDay is also true (edge case), weak_day_ahead (6.8) fires first — warnings preempt positive nudges.
   */
  todayIsBestHabitDay?: boolean;
}

// Habit streak milestones at which a personal-best celebration is shown (mirrors getUpcomingMilestone targets).
// Restricting to these values prevents the insight from firing every day while on a continuous best-streak run.
const PERSONAL_BEST_MILESTONES = [7, 30, 100];

// Minimum number of active/in-progress projects that must each have lastFocusDate within the last 7 days
// before a context-switching warning is surfaced. Chosen at 4 to avoid false-positives for users with
// naturally parallel workloads (2–3 projects); 4+ simultaneous active projects in a single week is a
// reliable signal of attention fragmentation.
const MIN_CONTEXT_SWITCH_PROJECTS = 4;

// Minimum days since last GitHub commit before a "commit drought" warning fires.
// Chosen at 7 (strictly greater than) so brief weekend gaps or short code-review pauses
// don't trigger false alarms; >7 days signals a meaningful activity gap.
const GITHUB_DROUGHT_DAYS = 7;

// Minimum open GitHub issues before a backlog-reminder badge surfaces.
// Chosen at 5 to avoid noise for healthy small-project backlogs (1–4 issues is normal).
const MIN_OPEN_ISSUES = 5;

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
// Priority order: streak_at_risk > deadline_critical > ci_failure > milestone_near > open_prs > github_drought > open_issues > perfect_day > intention_missing > period_start > no_focus_project > weak_day_ahead > pomodoro_last_one > pomodoro_goal_streak > pomodoro_day_record > pomodoro_goal_reached > deadline_soon > goal_expiry > momentum_decline > project_stale > project_context_switching > streak_recession > habit_consecutive_miss > almost_perfect_day > momentum_rise > goal_done > goal_streak > month_goal_streak > project_ahead > project_near_completion > project_forecast > personal_best > habit_target_near > intention_streak.
export function calcTodayInsight(params: InsightParams): TodayInsight | null {
  const {
    habits, todayStr, nowHour, todayIntentionDate, sessionsToday, sessionGoal, habitsAllDoneDate, projects,
    weekGoal, weekGoalDone, daysLeftWeek,
    monthGoal, monthGoalDone, daysLeftMonth,
    quarterGoal, quarterGoalDone, daysLeftQuarter,
    yearGoal, yearGoalDone, daysLeftYear,
    momentumHistory,
    weekGoalPastDoneStreak,
    monthGoalPastDoneStreak,
    pomodoroGoalStreak,
    pomodoroSessionBest,
    intentionConsecutiveDays,
    todayIsWeakHabitDay,
    todayIsBestHabitDay,
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

  // 2.5. GitHub CI failure: active/in-progress project with a failing CI run.
  // Fires between deadline_critical (2) and milestone_near (3): a broken build is an actionable
  // blocker that warrants prompt attention but does not carry the same time-pressure as an imminent deadline.
  // ciStatus "failure" is the only error state; "pending" (in-progress) and null (CI not configured) are skipped.
  // Picks the first failing project in user-defined project order — the topmost project in the list is
  // treated as highest priority, which matches the user's own ranking in the ProjectList UI.
  if (projects && projects.length > 0) {
    const failing = projects.find(
      p => p.status !== "done" && p.status !== "paused" && p.githubData?.ciStatus === "failure"
    );
    if (failing) {
      return { text: `⚠️ ${failing.name} CI 실패 — 빌드 확인`, level: "warning" };
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

  // 3.5. Open pull requests: active/in-progress project has one or more open PRs awaiting review or merge.
  // Fires after milestone_near (3) — a habit milestone 1 day away is more time-sensitive than a code review queue.
  // Fires before perfect_day (4) — an open PR backlog is an actionable developer workflow blocker.
  // Picks the project with the most open PRs when multiple qualify (highest review burden surfaces first).
  // openPrs absent/undefined or 0 → no PR context; skipped.
  if (projects && projects.length > 0) {
    const withPrs = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && (p.githubData?.openPrs ?? 0) > 0)
      .sort((a, b) => (b.githubData?.openPrs ?? 0) - (a.githubData?.openPrs ?? 0))[0];
    if (withPrs) {
      const count = withPrs.githubData?.openPrs ?? 0;
      return { text: `🔀 ${withPrs.name} PR ${count}개 대기 중`, level: "info" };
    }
  }

  // 3.7. GitHub commit drought: active/in-progress project with no commit for >7 days.
  // Fires after open_prs (3.5) — a pending PR backlog is more immediately actionable than an activity drought.
  // Fires before perfect_day (4) — a code inactivity signal warrants prompt attention.
  // lastCommitAt absent/null/empty → no commit history available; skipped silently.
  // Extracts the first 10 chars (YYYY-MM-DD) of the GitHub ISO timestamp (GitHub returns UTC 'Z' suffix)
  // then compares with todayStr using local midnight — mirrors the daysUntil() pattern.
  // Note: commits near UTC midnight may shift the extracted date by 1 day relative to the user's local calendar;
  // this is an accepted approximation for a 7-day heuristic threshold.
  // Picks the project with the most days since last commit (worst case surfaces first).
  if (projects && projects.length > 0) {
    const todayLocalMidnight = new Date(todayStr + "T00:00:00").getTime();
    const drought = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && (p.githubData?.lastCommitAt ?? "").length >= 10)
      .map(p => {
        const lastCommitDateStr = p.githubData!.lastCommitAt!.substring(0, 10);
        const daysSince = Math.floor((todayLocalMidnight - new Date(lastCommitDateStr + "T00:00:00").getTime()) / 86400000);
        return { name: p.name, daysSince };
      })
      .filter(p => p.daysSince > GITHUB_DROUGHT_DAYS)
      .sort((a, b) => b.daysSince - a.daysSince)[0];
    if (drought) {
      return { text: `⏸️ ${drought.name} — ${drought.daysSince}일째 커밋 없음`, level: "info" };
    }
  }

  // 3.9. Open GitHub issues: active/in-progress project with ≥5 open issues.
  // Fires after github_drought (3.7) — a commit activity gap is more actionable than a backlog reminder.
  // Fires before perfect_day (4) — an issues backlog on an active project is a workflow signal worth surfacing.
  // Picks the project with the most open issues when multiple qualify (highest backlog pressure surfaces first).
  // openIssues absent/undefined → treated as 0; skipped silently.
  if (projects && projects.length > 0) {
    const withIssues = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && (p.githubData?.openIssues ?? 0) >= MIN_OPEN_ISSUES)
      .sort((a, b) => (b.githubData?.openIssues ?? 0) - (a.githubData?.openIssues ?? 0))[0];
    if (withIssues) {
      const count = withIssues.githubData?.openIssues ?? 0;
      return { text: `🐛 ${withIssues.name} 이슈 ${count}개 — 백로그 처리 필요`, level: "info" };
    }
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

  // 6.8. Weak day ahead: morning + today is user's historically weakest habit day (below 60% avg completion).
  // Fires a motivational awareness nudge so the user can consciously counteract their pattern.
  // Morning-only (< 12h): actionable before habits are typically attempted; no value in the evening.
  // Requires at least one habit — meaningless nudge with no habits to track.
  if (nowHour < 12 && todayIsWeakHabitDay === true && habits.length > 0) {
    return { text: "📅 오늘은 습관 완료율이 낮은 약한 요일이에요. 의식적으로 챙겨봐요!", level: "info" };
  }

  // 6.82. Best day ahead: morning + today is user's historically strongest habit day (at or above 80% avg completion).
  // Fires a positive reinforcement nudge so the user can capitalise on their natural rhythm.
  // Morning-only (< 12h): mirrors the weak_day_ahead gate for symmetry.
  // Placed after weak_day_ahead (6.8) so warnings always preempt positive nudges.
  // Requires at least one habit — meaningless nudge with no habits to track.
  if (nowHour < 12 && todayIsBestHabitDay === true && habits.length > 0) {
    return { text: "💪 오늘은 역대 습관 완료율이 높은 강한 요일이에요!", level: "success" };
  }

  // 7. Pomodoro: one session away from daily goal
  if (sessionGoal !== undefined && sessionsToday === sessionGoal - 1) {
    return { text: "🍅 포모도로 목표까지 1세션!", level: "info" };
  }

  // 7.45. Pomodoro goal streak: consecutive past days where sessionGoal was met — motivational nudge to sustain the streak.
  // Fires when pomodoroGoalStreak ≥ 2 and today's goal is not yet met (sessionsToday < sessionGoal).
  // Threshold ≥ 2: "연속 달성 중" (ongoing streak) requires at least two past days; streak=1 (only yesterday) is
  //   not yet a meaningful pattern worth surfacing. Once streak ≥ 2, every additional day reinforces the habit.
  // No nowHour gate (unlike goal_streak at 10.75): this sits in the pomodoro-urgency priority range (7.x)
  //   where time-of-day filtering is not used — it provides useful all-day motivation until the goal is met.
  //   streak_at_risk (priority 1, nowHour ≥ 18) will preempt this if a habit streak is at risk in the evening.
  // sessionGoal > 0 guard prevents degenerate zero-goal firing.
  // Placed before pomodoro_goal_reached (7.5) so the streak message yields once the goal is met today.
  if (pomodoroGoalStreak !== undefined && pomodoroGoalStreak >= 2 && sessionGoal !== undefined && sessionGoal > 0 && sessionsToday < sessionGoal) {
    return { text: `🍅 포모도로 목표 ${pomodoroGoalStreak}일 연속 달성 중! 오늘도 화이팅`, level: "success" };
  }

  // 7.49. Pomodoro day record: today's session count strictly exceeds the all-time single-day best.
  // Fires BEFORE pomodoro_goal_reached (7.5) so a record-breaking day shows a more celebratory message.
  // Without sessionGoal (undefined or 0): fires when sessionsToday > pomodoroSessionBest.
  //   sessionGoal=0 is treated as "no goal" (mirrors the > 0 guard in pomodoro_goal_reached at 7.5).
  // With sessionGoal > 0: fires only when sessionsToday >= sessionGoal AND sessionsToday > pomodoroSessionBest —
  //   prevents a premature "신기록!" mid-day before the configured goal is reached.
  // Note: goal_streak (7.45) requires sessionsToday < sessionGoal; day_record requires sessionsToday >= sessionGoal
  //   (when goal is set) — these conditions are mutually exclusive, so no priority conflict can arise.
  // pomodoroSessionBest absent → no past-day baseline; skipped.
  // Strict greater-than (>) ensures ties never trigger (matching the previous day exactly is not a new record).
  if (
    pomodoroSessionBest !== undefined &&
    sessionsToday > pomodoroSessionBest &&
    (sessionGoal == null || sessionGoal === 0 || sessionsToday >= sessionGoal)
  ) {
    return { text: `🍅 오늘 포모도로 신기록! (${sessionsToday}세션)`, level: "success" };
  }

  // 7.5. Pomodoro goal reached: daily session goal met or exceeded — positive reinforcement.
  // Complements pomodoro_last_one (7): last_one fires when sessionsToday === sessionGoal - 1,
  // goal_reached fires when sessionsToday >= sessionGoal — the two conditions are mutually exclusive.
  // Fires before deadline_soon (8) so goal achievement takes precedence over upcoming deadlines.
  // sessionGoal > 0 guard mirrors the pomodoro_last_one guard; prevents firing on degenerate zero goals.
  if (sessionGoal !== undefined && sessionGoal > 0 && sessionsToday >= sessionGoal) {
    return { text: `🍅 오늘 포모도로 목표 달성! (${sessionsToday}/${sessionGoal})`, level: "success" };
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

  // 10.05. Project context switching: ≥4 active/in-progress projects all focused within the last 7 days.
  // Signals attention fragmentation: the user is spreading focus across too many concurrent projects.
  // Fires AFTER project_stale (10): if any project is neglected (≥7d), that warning fires first, so
  // this block is only reached when all active projects have been recently touched (within 6 days).
  // lastFocusDate absent → project has never been focused; excluded (never-focused ≠ recently-focused).
  // done/paused projects are excluded — focus activity on them does not constitute concurrent context.
  if (projects && projects.length > 0) {
    const todayMs = new Date(todayStr + "T00:00:00").getTime();
    const recentlyFocusedCount = projects.filter(p => {
      if (p.status === "done" || p.status === "paused") return false;
      if (!p.lastFocusDate || !/^\d{4}-\d{2}-\d{2}$/.test(p.lastFocusDate)) return false;
      const lastMs = new Date(p.lastFocusDate + "T00:00:00").getTime();
      if (isNaN(lastMs)) return false;
      const daysAgo = Math.floor((todayMs - lastMs) / 86400000);
      return daysAgo >= 0 && daysAgo <= 6; // last 7 days including today
    }).length;
    if (recentlyFocusedCount >= MIN_CONTEXT_SWITCH_PROJECTS) {
      return { text: `🔀 7일 내 ${recentlyFocusedCount}개 프로젝트 전환 — 하나에 집중해봐요`, level: "warning" };
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

  // 10.3. Almost perfect day: afternoon (≥ 14h) + exactly 1–2 habits remain unchecked — near-completion nudge.
  // Fires after habit_consecutive_miss (10.2): re-engagement urgency for a specific habit takes precedence.
  // The primary gate is `remaining === 1 || remaining === 2`; habitsAllDoneDate !== todayStr is a
  // defensive early-exit — when it equals todayStr, perfect_day (priority 4) has already returned above
  // and this block is unreachable in practice. It makes the invariant explicit and avoids computing remaining.
  // Threshold: 1–2 remaining signals a real "almost there" moment; ≥3 remaining means the day is still mostly unfinished.
  if (nowHour >= 14 && habitsAllDoneDate !== todayStr && habits.length > 0) {
    const remaining = habits.filter(h => h.lastChecked !== todayStr).length;
    if (remaining === 1 || remaining === 2) {
      return { text: `💪 완벽한 하루까지 ${remaining}개 남았어요!`, level: "success" };
    }
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

  // 10.75. Goal streak: weekly goal achieved for ≥1 consecutive past week AND not yet done this week.
  // Morning-only (< 12h) motivational nudge to sustain a winning streak.
  // Uses past-done streak (excluding current week) so it never fires the same moment as goal_done.
  if (nowHour < 12 && weekGoal && !weekGoalDone && weekGoalPastDoneStreak != null && weekGoalPastDoneStreak >= 1) {
    const streak = weekGoalPastDoneStreak;
    return { text: `✅ 주간 목표 ${streak}주 연속 달성 중! 이번 주도 화이팅`, level: "success" };
  }

  // 10.76. Monthly goal streak: ≥2 consecutive past months where the monthly goal was achieved AND not yet done this month.
  // Morning-only (< 12h) motivational nudge, mirrors goal_streak (10.75) for a monthly cadence.
  // monthGoalPastDoneStreak excludes the current month, so this never fires at the same moment as goal_done (10.7).
  if (nowHour < 12 && monthGoal && !monthGoalDone && monthGoalPastDoneStreak != null && monthGoalPastDoneStreak >= 2) {
    return { text: `✅ 월간 목표 ${monthGoalPastDoneStreak}달 연속 달성 중! 이번 달도 화이팅`, level: "success" };
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

  // 10.85. Project near completion: active/in-progress project at ≥ 90% progress — finish line is in sight.
  // Fires after project_ahead (10.8) so schedule-relative positive context takes precedence.
  // Picks the highest-progress project when multiple qualify.
  // progress absent → excluded (undeclared progress ≠ near completion).
  if (projects && projects.length > 0) {
    const nearDone = projects
      .filter(p => p.status !== "done" && p.status !== "paused" && p.progress != null && p.progress >= 90)
      .sort((a, b) => b.progress! - a.progress!)[0];
    if (nearDone) {
      return { text: `🏁 ${nearDone.name} 완성 직전! (${nearDone.progress}%)`, level: "success" };
    }
  }

  // 10.87. Project velocity forecast: at-current-pace completion date for the on-track band.
  // Fires when no earlier project insight has returned (project_behind ≤ -20%, project_ahead ≥ +20%,
  // project_near_completion ≥ 90%) — by priority ordering those cases are already handled above.
  // Requires: deadline > 7 days (shorter deadlines are covered by deadline_critical/deadline_soon),
  // createdDate + progress < 90 so calcCompletionForecast can establish a velocity.
  // Note: progress=0 passes this filter but is rejected inside calcCompletionForecast (progress ≤ 0 guard).
  // Picks the project with the smallest daysVsDeadline (ascending sort) — most urgent first:
  //   negative = forecast past deadline (warning); positive = still ahead (info).
  // today is injected from todayStr for deterministic testing.
  if (projects && projects.length > 0) {
    const todayForForecast = new Date(todayStr + "T00:00:00");
    const forecasts = projects
      .filter(p =>
        p.status !== "done" && p.status !== "paused" &&
        p.deadline && p.progress != null && p.progress < 90 && p.createdDate
      )
      .filter(p => { const days = daysUntil(p.deadline!, todayStr); return days !== null && days > 7; })
      .map(p => {
        const fc = calcCompletionForecast(p.progress!, p.createdDate, p.deadline, todayForForecast);
        return fc !== null && fc.daysVsDeadline !== null ? { name: p.name, dvd: fc.daysVsDeadline } : null;
      })
      .filter((p): p is { name: string; dvd: number } => p !== null);

    if (forecasts.length > 0) {
      // Sort ascending: most overdue (negative) or tightest margin (small positive) first
      const best = [...forecasts].sort((a, b) => a.dvd - b.dvd)[0];
      if (best.dvd >= 0) {
        return { text: `📊 ${best.name} 예상 완료 D-${best.dvd}`, level: "info" };
      } else {
        return { text: `⏳ ${best.name} 현 속도론 마감 ${-best.dvd}일 초과 예상`, level: "warning" };
      }
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

  // 11.05. Habit target near: user-defined targetStreak goal within 1–2 days of completion.
  // Picks the habit closest to its user-defined target (smallest gap) when multiple qualify.
  // Distinct from milestone_near (priority 3) which covers fixed milestones (7/30/100d);
  // this fires for any positive targetStreak value set by the user on any habit.
  // When targetStreak coincides with a fixed milestone (e.g. targetStreak=7) and gap=1,
  // milestone_near (priority 3) fires first — this is intentionally deferred to that block.
  // streak >= 1 guard suppresses false positives when streak is 0 (habit not yet started).
  // Fires after personal_best (11) so a freshly-hit best streak takes precedence over a nudge.
  const targetNear = habits
    .filter(h => {
      const target = h.targetStreak;
      if (!target || target <= 0 || h.streak < 1) return false;
      const gap = target - h.streak;
      return gap >= 1 && gap <= 2;
    })
    .sort((a, b) => (a.targetStreak! - a.streak) - (b.targetStreak! - b.streak))[0];
  if (targetNear) {
    const gap = targetNear.targetStreak! - targetNear.streak;
    return { text: `🎯 ${targetNear.name} 목표 ${targetNear.targetStreak}일까지 ${gap}일!`, level: "success" };
  }

  // 11.1. Intention streak: 7 consecutive days of setting a daily intention (cap of calcIntentionStreak).
  // Fires as a persistent "you're consistent" badge when today's intention is already set.
  // calcIntentionStreak is capped at 7 (today + 6 history days), so this fires every day the user
  // maintains a full 7-day window — a reliable signal of genuine daily-intention habit formation.
  // Placed after personal_best so habit milestones take precedence on the same day.
  if (intentionConsecutiveDays != null && intentionConsecutiveDays >= 7 && todayIntentionDate === todayStr) {
    return { text: `✍️ 의도 ${intentionConsecutiveDays}일 연속 설정 중!`, level: "success" };
  }

  return null;
}
