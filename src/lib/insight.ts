// ABOUTME: calcTodayInsight — context-aware daily insight engine for the Clock badge
// ABOUTME: Priority chain: streak risk > deadline critical > ci_failure (active project CI broken) > project_completed (project marked done today) > milestone > open_prs (active project has open PRs awaiting review) > github_drought (active project >7 days since last commit) > open_issues (active project ≥5 open GitHub issues) > intention_habit_pomodoro_triple_win (intention done + all habits done + pomodoro goal met today) > intention_habit_dual_win (intention done + all habits done, pomodoro goal not met) > habit_pomodoro_dual_win (all habits done + pomodoro goal met today, intention not done) > intention_pomodoro_dual_win (intention done + pomodoro goal met, habits not all done) > habit_all_done_early (all habits done before noon, habits.length > 0; preempted by any dual_win) > perfect day (streak count shown when ≥3 consecutive days via perfectDayStreak) > intention_done (today's intention marked done; 4 tiers: milestone when intentionDoneStreak hits 7/14/30; intention_month_flawless when streak ≥ currentMonthDay AND currentMonthDay ≥ 10; streak count when ≥3; generic) > intention > period_start (year/quarter/month/week) > no_focus_project > weak_day_ahead (morning, historically low-completion weekday) > best_day_ahead (morning, historically high-completion weekday ≥80%) > pomodoro_weak_day_ahead (morning, historically low-sessions weekday, avg < 1) > pomodoro_best_day_ahead (morning, historically high-sessions weekday, avg ≥ 3) > intention_weak_day_ahead (morning, historically low intention done-rate weekday, rate < 50%) > intention_best_day_ahead (morning, historically high intention done-rate weekday, rate ≥ 80%) > momentum_weak_day_ahead (morning, historically low momentum-score weekday, avg < 40) > momentum_best_day_ahead (morning, historically high momentum-score weekday, avg ≥ 65) > habit_first_check_in (streak=1, bestStreak≤1, checked today = brand-new habit first step) > habit_comeback (bestStreak≥14, streak 3+, checked today = recovering from broken long streak) > habit_multi_streak (3+ habits each ≥7d streak, collective portfolio momentum) > pomodoro_last_one > pomodoro_goal_streak_milestone (pomodoroGoalStreak+1 hits 7/14/30, today's goal already met) > focus_streak_milestone (7/14/30 consecutive focus days, sessionsToday > 0) > focus_streak_milestone_approach (1–2 days before next focus milestone 7/14/30, no today guard) > intention_done_streak_milestone_approach (1–2 days before next intention done streak milestone 7/14/30, no today guard) > pomodoro_goal_streak_milestone_approach (1–2 days before next pomodoro goal streak milestone 7/14/30, effectiveStreak = pomodoroGoalStreak+1 when today's goal already met) > habit_streak_milestone_approach (1–2 days before next habit streak milestone 7/14/30 for any habit; picks most-imminent habit) > pomodoro_lifetime_milestone (cumulative focus time crosses 10h/50h/100h/200h today) > habit_lifetime_milestone (cumulative check-ins across all habits crosses 100/500/1000/5000 today) > project_focus_milestone (focused project lifetime session count crosses 10/25/50/100/200/500 today) > pomodoro_goal_streak (≥2 consecutive past goal days) > pomodoro_day_record (today's session count beats all-time single-day best) > pomodoro_session_best_tie (today's count ties all-time single-day best; one more session would break the record) > pomodoro_week_record (current ISO-week total beats same-length prev-week window) > pomodoro_goal_reached > momentum_near_tier (single available action bridges raw score gap to next tier: intentionDone +12, pomodoro +30/goalN, habit +50/total) > deadline soon > project behind (≥20% gap) > goal expiry (week≤2d > month≤2d > quarter≤7d > year≤14d) > goal midpoint (Thu/mid-month/mid-quarter/mid-year, cascade year>quarter>month>week) > momentum decline > project stale > project context switching (≥4 active projects all focused within 7 days) > streak recession (≥7d broken yesterday) > pomodoro_goal_streak_broken (≥3d streak broke yesterday) > habit consecutive miss (≥3d) > habit_diversity_warning (habits ≥3, one streak <30% of others' avg, avgOthers ≥4) > almost perfect day (≥14h, 1–2 habits left) > week_quadrafecta_flawless (habit + pomodoro + momentum + intention all flawless for current ISO week, ≥5 days elapsed) > week_trifecta_flawless (habit + pomodoro + momentum all flawless for current ISO week, ≥5 days elapsed) > habit_week_flawless (habit checked every day of ISO week so far, ≥5 days elapsed) > pomodoro_week_flawless (≥1 pomodoro session every day of ISO week so far, focusStreak ≥ daysElapsed, sessionsToday > 0, ≥5 days elapsed) > momentum_week_flawless (momentum score ≥ 40 every day of ISO week so far, momentumStreak ≥ daysElapsed, ≥5 days elapsed) > intention_week_flawless (intention set AND done every day of ISO week so far, intentionDoneStreak ≥ daysElapsed, todayIntentionDone, ≥5 days elapsed) > week_balanced (habitWeekRate ∈[70,90) + intentionWeekDoneRate ∈[70,100) + momentumWeekAvg7d ∈[40,65), all three domains good-but-not-exceptional this week) > habit_week_perfect (7-day completion rate = 100%) > habit_week_excellent (7-day completion rate 90–99%) > habit_week_maintained (7-day completion rate 70–89%, absolute level preempts improved/declined) > habit_week_improved (current 7d rate ≥10pp above prev 7d rate, rate < 70) > habit_week_declined (current 7d rate ≥10pp below prev 7d rate, rate < 70) > intention_week_perfect (7-day done rate = 100%, setCount ≥ 3) > intention_week_excellent (7-day done rate 70–99%, setCount ≥ 3) > intention_week_maintained (7-day done rate 50–69%, setCount ≥ 3) > intention_week_improved (current done rate ≥10pp above prev 7d done rate, rate < 50) > intention_week_declined (current done rate ≥10pp below prev 7d done rate, rate < 50) > momentum_week_strong (7-day avg momentum ≥65, high-tier week) > momentum_week_excellent (7-day avg momentum 50–64, mid-tier positive week) > momentum_week_maintained (7-day avg momentum 40–49) > momentum_week_improved (7-day avg rose ≥10pts vs prev 7d) > momentum_week_declined (7-day avg dropped ≥10pts vs prev 7d) > pomodoro_week_goal_perfect (daily session goal met on all 7 rolling days; preempts comparative badges) > pomodoro_week_goal_excellent (5–6/7 rolling days met session goal) > pomodoro_week_goal_maintained (3–4/7 rolling days met session goal, absolute mid-tier preempts improved/declined) > pomodoro_week_goal_improved (goal-met days rose ≥2 vs prev 7d) > pomodoro_week_goal_declined (goal-met days dropped ≥2 vs prev 7d) > pomodoro_week_improved (rolling 7-day session total rose ≥3 vs prev 7d, prevWeek ≥ 1) > pomodoro_week_declined (rolling 7-day session total dropped ≥3 vs prev 7d) > momentum_recovery (recorded score ≥40 after 2 consecutive days below 40) > month_balanced (habitMonthRate ∈[70,90) + intentionMonthDoneRate ∈[70,100) + momentum month avg ∈[40,65), all three domains good-but-not-exceptional this month, ≥14 days into month + ≥14 momentum entries) > habit_month_perfect (aggregate monthly rate = 100%, ≥14 days into month) > habit_month_excellent (aggregate monthly rate 80–99%, ≥14 days into month) > habit_month_maintained (aggregate monthly rate 70–79%, ≥14 days into month) > habit_month_improved (current month habit rate rose ≥10pp vs prev month, currentMonthDay ≥ 14, rate < 70) > habit_month_declined (current month habit rate dropped ≥10pp vs prev month, currentMonthDay ≥ 14, rate < 70) > intention_month_perfect (monthly done rate = 100%, setCount ≥ 14) > intention_month_excellent (monthly done rate 80–99%, setCount ≥ 14) > intention_month_maintained (monthly done rate 50–79%, absolute mid-tier preempts improved/declined) > intention_month_improved (current month done rate rose ≥10pp vs prev month, rate < 50) > intention_month_declined (current month done rate dropped ≥10pp vs prev month, rate < 50) > momentum_month_strong (current calendar month avg momentum ≥65, ≥14 entries in month) > momentum_month_excellent (calendar month avg momentum 50–64, ≥14 entries) > momentum_month_maintained (calendar month avg momentum 40–49, ≥14 entries) > momentum_month_improved (current month avg rose ≥10pts vs prev month, ≥14 current + ≥10 prev entries) > momentum_month_declined (current month avg dropped ≥10pts vs prev month) > pomodoro_month_goal_perfect (all 14 rolling days within current month met session goal, currentMonthDay ≥ 14) > pomodoro_month_goal_excellent (12–13/14 rolling days met session goal, currentMonthDay ≥ 14) > pomodoro_month_goal_maintained (8–11/14 rolling days met session goal, absolute mid-tier preempts improved/declined, currentMonthDay ≥ 14) > pomodoro_month_goal_improved (goal-met days rose ≥2 vs prev 14-day window, currentMonthDay ≥ 14) > pomodoro_month_goal_declined (goal-met days dropped ≥2 vs prev 14-day window, currentMonthDay ≥ 14) > pomodoro_today_above_avg (sessionsToday ≥ rolling average +2) > momentum_streak_milestone (momentumStreak hits 7/14/30 consecutive qualifying days) > momentum_streak_milestone_approach (1–2 days before next momentum milestone 7/14/30, no today guard) > momentum rise > momentum_maintained (3-day stable trend with avg ≥ 40) > triple_momentum_correlation (all three gaps habitMomentumGap, intentionMomentumGap, pomodoroMomentumGap ≥ 15 simultaneously; priority 10.515; shows minGap; preempts individual domain badges 10.52–10.54) > habit_momentum_correlation (allDoneAvg − notAllDoneAvg ≥ 15 pts across past momentumHistory, ≥5 samples each bucket) > intention_momentum_correlation (intentionDoneAvg − notDoneAvg ≥ 15 pts across past momentumHistory, ≥5 samples each bucket) > pomodoro_momentum_correlation (goalMetAvg − notGoalMetAvg ≥ 15 pts across past momentumHistory, ≥5 samples each bucket; completes 3-domain correlation series) > goal done (year>quarter>month>week, daysLeft above expiry threshold) > goal streak (past ≥1 consecutive done weeks, morning only) > month_goal_streak (past ≥2 consecutive done months, morning only) > quarter_goal_streak (past ≥2 consecutive done quarters, morning only) > year_goal_streak (past ≥1 consecutive done years, morning only) > project ahead (≥20% ahead of schedule) > project near completion (progress ≥90%) > project forecast (at-current-pace completion date for on-track projects with deadline >7d) > personal best (streak at fixed milestone 7/30/100d, streak === bestStreak) > habit_streak_record (non-milestone new personal best, streak === bestStreak, bestStreak > 3, checked today) > habit_best_streak_approach (auto-tracked bestStreak within 1–2 days, checked today) > habit_target_hit (user-defined targetStreak exactly reached today, checked today) > habit target near (user-defined targetStreak within 2 days) > habit_target_halfway (user-defined targetStreak at exact midpoint, checked today, target ≥ 14) > month_quadrafecta_flawless (habit + pomodoro + momentum + intention all flawless for current month, ≥10 days in) > month_trifecta_flawless (habit + pomodoro + momentum all flawless for current month, ≥10 days in) > habit_month_flawless (habit checked every day of calendar month so far, ≥10 days in) > pomodoro_month_flawless (≥1 pomodoro session every day this month, focusStreak ≥ currentMonthDay, sessionsToday > 0, ≥10 days in) > momentum_month_flawless (momentum score ≥ 40 every day this month, momentumStreak ≥ currentMonthDay, ≥10 days in) > intention streak (≥7d consecutive intention-setting)

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
  /**
   * True when the user has marked today's daily intention as accomplished.
   * Combined with todayIntentionDate === todayStr, triggers a positive reinforcement badge.
   * Absent/false = intention not yet completed; no badge fires.
   */
  todayIntentionDone?: boolean;
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
   * `completedDate` is optional here so existing test fixtures that omit it remain valid;
   * absent completedDate skips the project_completed check silently.
   */
  projects?: Array<Pick<Project, "name" | "deadline" | "status" | "lastFocusDate"> & { createdDate?: string; progress?: number; isFocus?: boolean; completedDate?: string; githubData?: Pick<GitHubData, "ciStatus"> & { openPrs?: number; lastCommitAt?: string | null; openIssues?: number } }>;
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
  /** Rolling 7-day momentum score history; used to detect a 3-consecutive-day decline/rise, momentum_recovery (score returns ≥40 after 2 days below), and momentum_streak_milestone. */
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
   * Number of consecutive PAST calendar quarters (excluding the current quarter) where the quarterly goal was achieved.
   * Derived by filtering quarterGoalHistory to done===true entries, calling calcQuarterGoalStreak, then subtracting 1.
   * Note: the done===true filter applies to the history array (past quarters) only; the current quarter's
   * goal presence is determined by quarterGoal/quarterGoalDate in calcQuarterGoalStreak, not by this filter.
   * Requires data.quarterGoalDate === currentQuarter; collapses to 0 when the current-quarter goal is not active
   * (same behaviour as monthGoalPastDoneStreak — the insight is a "keep going this quarter" nudge).
   * A value ≥ 2 with quarterGoalDone === false triggers a morning streak-encouragement nudge.
   * Absent/undefined = no streak data available.
   */
  quarterGoalPastDoneStreak?: number;
  /**
   * Number of consecutive PAST calendar years (excluding the current year) where the yearly goal was achieved.
   * Derived by filtering yearGoalHistory to done===true entries, calling calcYearGoalStreak, then Math.max(0, result - 1).
   * Note: the done===true filter applies to the history array (past years) only; the current year's
   * goal presence is determined by yearGoal/yearGoalDate in calcYearGoalStreak, not by this filter.
   * Requires data.yearGoalDate === currentYear; collapses to 0 when the current-year goal is not active.
   * A value ≥ 1 with yearGoalDone === false triggers a morning streak-encouragement nudge.
   * Absent/undefined = no streak data available.
   */
  yearGoalPastDoneStreak?: number;
  /**
   * Number of consecutive PAST days (not including today) where the daily pomodoro sessionGoal was met or exceeded.
   * A value ≥ 2 with today's sessions < sessionGoal triggers a goal-streak nudge.
   * Absent/undefined = no streak data or sessionGoal not set.
   */
  pomodoroGoalStreak?: number;
  /**
   * Pomodoro goal streak as of yesterday's start — i.e. how many consecutive days BEFORE yesterday
   * the daily session goal was met. Used to measure the streak length that broke on yesterday's miss.
   * Computed by calling calcPomodoroGoalStreak with yesterdayStr as anchor.
   * Absent/undefined = not computed by caller; pomodoro_goal_streak_broken skipped silently.
   */
  prevPomodoroGoalStreak?: number;
  /**
   * Maximum session count on any single PAST calendar day in pomodoroHistory (today excluded).
   * When sessionsToday strictly exceeds this value — and the daily goal is also reached (or absent/zero) —
   * a "신기록" celebration badge fires at priority 7.49, preempting the plain goal-reached badge (7.5).
   * When sessionsToday exactly equals this value (tie) — and the goal is also reached (or absent/zero) —
   * a "역대 최고 타이" motivational badge fires at priority 7.491, after the day_record check.
   * "No goal" means sessionGoal is undefined OR 0 (mirrors the sessionGoal > 0 guard in goal_reached).
   * Absent/undefined = no past-day baseline; no record check is performed.
   */
  pomodoroSessionBest?: number;
  /**
   * Current ISO-week session total (Mon through today, using sessionsToday for today) and
   * the same-length window from the previous ISO week (Mon through same-offset-7d), from pomodoroHistory.
   * When currentWeekTotal > prevWeekTotal AND prevWeekTotal > 0 AND sessionsToday > 0,
   * a "이번 주 포모도로 신기록 페이스!" badge fires at priority 7.495, between day_record (7.49) and
   * goal_reached (7.5). prevWeekTotal > 0 guard prevents trivial "record" when last week had no sessions.
   * Computed by calcPomodoroWeekRecord(pomodoroHistory, sessionsToday, todayStr) in App.tsx.
   * Absent/undefined = feature not wired by caller; skipped silently.
   */
  pomodoroWeekRecord?: { currentWeekTotal: number; prevWeekTotal: number };
  /**
   * Consecutive days (including today) on which the user has set a daily intention.
   * Capped at 7 by calcIntentionStreak (today + 6 history days).
   * A value ≥ 7 with todayIntentionDate === todayStr triggers an intention-streak badge.
   * Absent/undefined = streak unknown; 0 = no streak.
   */
  intentionConsecutiveDays?: number;
  /**
   * Consecutive days (including today when sessionsToday > 0) with at least one pomodoro session.
   * Computed by calcFocusStreak(pomodoroHistory, todayStr) in PomodoroTimer / App.
   * Milestone values 7, 14, 30 trigger a focus_streak_milestone badge when sessionsToday > 0.
   * Absent/undefined = no history or feature not wired by caller; skipped silently.
   */
  focusStreak?: number;
  /**
   * Total accumulated pomodoro focus minutes BEFORE today's sessions were added.
   * Computed in App.tsx as max(0, (data.pomodoroLifetimeMins ?? 0) − sessionsToday × sessionDurationMins).
   * Used together with pomodoroLifetimeMins to detect when today's sessions crossed a lifetime milestone
   * (10h=600min / 50h=3000min / 100h=6000min / 200h=12000min).
   * Absent/undefined = feature not wired by caller; pomodoro_lifetime_milestone skipped silently.
   */
  pomodoroLifetimePrevMins?: number;
  /**
   * Total accumulated pomodoro focus minutes including today's sessions.
   * Sourced from data.pomodoroLifetimeMins in App.tsx.
   * Together with pomodoroLifetimePrevMins, detects milestone crossings at priority 7.43.
   * Absent/undefined = no lifetime data; pomodoro_lifetime_milestone skipped silently.
   */
  pomodoroLifetimeMins?: number;
  /**
   * Total accumulated habit check-ins across ALL habits BEFORE today's check-ins were counted.
   * Computed in App.tsx as max(0, (data.habitLifetimeTotalCheckins ?? 0) - habitsDoneToday).
   * Used together with habitLifetimeCheckins to detect when today crossed a lifetime milestone
   * (100 / 500 / 1000 / 5000 total check-ins across all habits).
   * Absent/undefined = feature not wired by caller; habit_lifetime_milestone skipped silently.
   */
  habitLifetimePrevCheckins?: number;
  /**
   * Total accumulated habit check-ins across ALL habits INCLUDING today's check-ins.
   * Sourced from data.habitLifetimeTotalCheckins in App.tsx.
   * Together with habitLifetimePrevCheckins, detects milestone crossings at priority 7.44.
   * Absent/undefined = feature not wired by caller; skipped silently.
   */
  habitLifetimeCheckins?: number;
  /**
   * pomodoroSessions count for the currently focused project (isFocus === true) including today's sessions.
   * Sourced from focusProject.pomodoroSessions in App.tsx (absent = 0 when no focused project).
   * Together with projectFocusPrevSessions, detects milestone crossings at priority 7.441.
   * Absent/undefined = no focused project or feature not wired; project_focus_milestone skipped silently.
   */
  projectFocusSessions?: number;
  /**
   * pomodoroSessions count for the focused project BEFORE today's sessions were added.
   * Computed in App.tsx as max(0, projectFocusSessions − sessionsToday).
   * Used together with projectFocusSessions to detect when today's sessions crossed a milestone
   * (10 / 25 / 50 / 100 / 200 / 500 lifetime sessions on this project).
   * Absent/undefined = feature not wired by caller; project_focus_milestone skipped silently.
   */
  projectFocusPrevSessions?: number;
  /**
   * Name of the currently focused project; used for the display text in the project_focus_milestone badge.
   * Absent/undefined = no focused project; project_focus_milestone skipped silently.
   */
  projectFocusName?: string;
  /**
   * Number of consecutive days (including today if done) on which the user marked their daily
   * intention as accomplished (done === true in intentionHistory).
   * Computed by calcIntentionDoneStreak(intentionHistory, todayIntentionDone, todayStr) in App.tsx.
   * Three tiers when todayIntentionDone AND todayIntentionDate === todayStr:
   *   When hits milestone (7, 14, or 30): a distinct "의도 달성 N일 연속 마일스톤! 실행 의지가 빛나요"
   *   celebration badge fires, preempting the regular streak tier.
   *   When ≥ 3 (non-milestone): streak count badge "N일 연속 의도 달성! 실행력이 빛나요".
   *   Otherwise: generic "오늘의 의도 달성!" single-day message.
   * Absent/undefined = generic message; no streak count or milestone badge fires.
   */
  intentionDoneStreak?: number;
  /**
   * Number of consecutive days (including today when today's score ≥ 40) on which the daily momentum
   * score was at or above the mid-tier threshold (40 points).
   * Computed by calcMomentumStreak(data.momentumHistory ?? [], todayStr) in App.tsx.
   * When this value hits a milestone (7, 14, or 30), a "momentum sustained" celebration badge fires
   * at priority 10.46 — after pomodoro_today_above_avg (10.45) and before momentum_rise (10.5).
   * Absent/undefined = no history or feature not wired by caller; skipped silently.
   */
  momentumStreak?: number;
  /**
   * Average pomodoro sessions per calendar day across all past history entries (today excluded).
   * Derived from the rolling 14-day pomodoroHistory; covers up to 13 past days — not a strict 7-day window.
   * Computed by calcPomodoroRecentAvg(pomodoroHistory, todayStr) in App.tsx.
   * When sessionsToday exceeds this by ≥ 2, a "above-recent-average focus" badge fires at priority 10.45.
   * Absent/undefined = no past-day baseline available; skipped silently.
   */
  pomodoroRecentAvg?: number;
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
  /**
   * Number of consecutive calendar days (including today) on which ALL habits were completed.
   * Derived from calcPerfectDayStreak(habits, last14Days) in App.tsx.
   * When habitsAllDoneDate === todayStr AND this value is ≥ 3, a streak-count badge fires
   * instead of the generic "오늘 완벽한 습관 달성!" message.
   * Absent/undefined or < 3 = generic message; no streak count shown.
   */
  perfectDayStreak?: number;
  /**
   * Average daily habit completion rate (%) over the last 7 days (0–100).
   * Computed by calcHabitsWeekRate(habits, last7Days) in App.tsx.
   * When this value is = 100, a "habit_week_perfect" celebration badge fires at priority 10.34.
   * When this value is 90–99, a "habit_week_excellent" badge fires at priority 10.35.
   * When this value is 70–89, a "habit_week_maintained" badge fires at priority 10.351,
   *   preempting the comparative improved/declined badges — absolute sustained effort takes precedence.
   * Absent/undefined = no weekly rate data; badge skipped silently.
   */
  habitWeekRate?: number;
  /**
   * Average daily habit completion rate (%) over the PREVIOUS 7-day window (days 7–13 ago, 0–100).
   * Computed by calcHabitsWeekRate(habitsArr, last14Days.slice(0, 7)) in App.tsx.
   * last14Days = [today-13, …, today]; slice(0, 7) = [today-13, …, today-7] = days 7–13 ago.
   * Used alongside habitWeekRate to detect week-over-week changes of ≥ 10 pp.
   * When habitWeekRate - habitPrevWeekRate ≥ 10, a "habit_week_improved" success badge fires at
   * priority 10.36. When habitPrevWeekRate - habitWeekRate ≥ 10, a "habit_week_declined" warning
   * badge fires at priority 10.37. habit_week_perfect (10.34) returns first when habitWeekRate = 100,
   * habit_week_excellent (10.35) returns first when habitWeekRate is 90–99,
   * habit_week_maintained (10.351) returns first when habitWeekRate is 70–89,
   * so both comparison blocks are only reached when the current rate is below 70.
   * Absent/undefined = no comparison data available; badge skipped silently.
   */
  habitPrevWeekRate?: number;
  /**
   * Average daily habit completion rate (%) over the current calendar month (0–100).
   * Computed by calcHabitsWeekRate(habitsArr, currentMonthDays) in App.tsx, where
   * currentMonthDays = calcLastNDays(todayStr, currentMonthDay).
   * Undefined when currentMonthDay < 14 (insufficient month data for a meaningful signal).
   * When this value is 70–79: "habit_month_maintained" success badge fires at priority 10.411,
   *   preempting the comparative improved/declined badges — absolute sustained effort takes precedence.
   * When habitMonthRate - habitPrevMonthRate ≥ 10:
   *   "habit_month_improved" success badge fires at priority 10.413 (after habit_month_maintained).
   * When habitPrevMonthRate - habitMonthRate ≥ 10:
   *   "habit_month_declined" warning badge fires at priority 10.414 (after habit_month_improved).
   * habit_month_perfect (10.40), habit_month_excellent (10.41), and habit_month_maintained (10.411) preempt via early return.
   * Absent/undefined = insufficient month data; badges skipped silently.
   */
  habitMonthRate?: number;
  /**
   * Average daily habit completion rate (%) over the previous calendar month (0–100).
   * Computed by calcHabitsWeekRate(habitsArr, prevMonthDays) in App.tsx, where
   * prevMonthDays = calcLastNDays(lastDayOfPrevMonthStr, daysInPrevMonth).
   * Undefined when calcHabitsWeekRate returns null (no check history in previous month).
   * When habitMonthRate - habitPrevMonthRate ≥ 10:
   *   "habit_month_improved" success badge fires at priority 10.413.
   * When habitPrevMonthRate - habitMonthRate ≥ 10:
   *   "habit_month_declined" warning badge fires at priority 10.414.
   * habit_month_maintained (10.411) preempts via early return when habitMonthRate ∈ [70, 80),
   *   so both comparison blocks are only reached when habitMonthRate < 70 or habitMonthRate ≥ 80.
   * improved and declined are mutually exclusive; at most one fires per call.
   * Absent/undefined = no previous month data; badges skipped silently.
   */
  habitPrevMonthRate?: number;
  /**
   * True when today's weekday is the user's historically weakest pomodoro focus day
   * (average sessions strictly below 1 over the last 14 days).
   * Caller derives this via calcWeakPomodoroDay(calcDayOfWeekPomodoroAvg(history, last14Days)) === todayDow.
   * Absent/false = today is not a weak pomodoro day or insufficient data; no nudge is shown.
   */
  todayIsWeakPomodoroDay?: boolean;
  /**
   * True when today's weekday is the user's historically strongest pomodoro focus day
   * (average sessions at or above 3 over the last 14 days).
   * Caller derives this via calcBestPomodoroDay(calcDayOfWeekPomodoroAvg(history, last14Days)) === todayDow.
   * Absent/false = today is not a best pomodoro day or insufficient data; no nudge is shown.
   * When todayIsWeakPomodoroDay is also true (edge case), pomodoro_weak_day_ahead fires first.
   */
  todayIsBestPomodoroDay?: boolean;
  /**
   * True when today's weekday is the user's historically weakest intention-done day
   * (done rate strictly below 50% on this weekday, requiring ≥2 set intentions in the window).
   * Caller derives this via calcWeakIntentionDay(calcDayOfWeekIntentionDoneRate(history, last28Days)) === todayDow.
   * Absent/false = today is not a weak intention day or insufficient data; no nudge is shown.
   * intention_missing (priority 5) fires first when morning intention is not yet set,
   * so by the time we reach 6.845, intention is guaranteed to be set.
   */
  todayIsWeakIntentionDay?: boolean;
  /**
   * True when today's weekday is the user's historically strongest intention-done day
   * (done rate at or above 80% on this weekday, requiring ≥2 set intentions in the window).
   * Caller derives this via calcBestIntentionDay(calcDayOfWeekIntentionDoneRate(history, last28Days)) === todayDow.
   * Absent/false = today is not a best intention day or insufficient data; no nudge is shown.
   * When todayIsWeakIntentionDay is also true (edge case), intention_weak_day_ahead (6.845) fires first.
   */
  todayIsBestIntentionDay?: boolean;
  /**
   * True when today's weekday is the user's historically weakest momentum-score day
   * (average score strictly below 40 — the low-tier boundary — on this weekday, requiring ≥2 entries in the window).
   * Caller derives this via calcWeakMomentumDay(calcDayOfWeekMomentumAvg(momentumHistory, last14Days)) === todayDow.
   * Absent/false = today is not a weak momentum day or insufficient data; no nudge is shown.
   * When todayIsBestMomentumDay is also true (edge case), momentum_weak_day_ahead (6.847) fires first.
   */
  todayIsWeakMomentumDay?: boolean;
  /**
   * True when today's weekday is the user's historically strongest momentum-score day
   * (average score at or above 65 on this weekday, requiring ≥2 entries in the window).
   * Caller derives this via calcBestMomentumDay(calcDayOfWeekMomentumAvg(momentumHistory, last14Days)) === todayDow.
   * Absent/false = today is not a best momentum day or insufficient data; no nudge is shown.
   * When todayIsWeakMomentumDay is also true (edge case), momentum_weak_day_ahead (6.847) fires first.
   */
  todayIsBestMomentumDay?: boolean;
  /**
   * Average momentum score over the last 7 calendar days (today included), rounded to nearest integer.
   * Computed in App.tsx by filtering momentumHistory to last7Days entries then calling calcMomentumWeekAvg.
   * When this value is ≥ 65 (high tier), a "momentum_week_strong" success badge fires at priority 10.38.
   * When this value is ≥ 50 and < 65 (mid-tier positive), a "momentum_week_excellent" badge fires at 10.3801.
   * When this value is ≥ 40 and < 50, a "momentum_week_maintained" success badge fires at 10.3802.
   * Absent/undefined = fewer than 2 entries in the last 7 days; badge skipped silently.
   */
  momentumWeekAvg7d?: number;
  /**
   * Average momentum score over the previous 7-day window (days 7–13 ago), rounded to nearest integer.
   * Computed in App.tsx by filtering momentumHistory to last14Days.slice(0, 7) then calling calcMomentumWeekAvg.
   * Used alongside momentumWeekAvg7d to detect week-over-week changes of ≥ 10 points:
   *   When momentumWeekAvg7d - momentumPrevWeekAvg7d ≥ 10: "momentum_week_improved" success badge fires at 10.381.
   *   When momentumPrevWeekAvg7d - momentumWeekAvg7d ≥ 10: "momentum_week_declined" warning badge fires at 10.382.
   * momentum_week_strong (10.38) returns first when momentumWeekAvg7d ≥ 65,
   *   momentum_week_excellent (10.3801) returns first when momentumWeekAvg7d ∈ [50, 65),
   *   and momentum_week_maintained (10.3802) returns first when momentumWeekAvg7d ∈ [40, 50),
   *   so both comparison blocks are only reached when the current avg is below 40.
   * Absent/undefined = no comparison data available; badges skipped silently.
   */
  momentumPrevWeekAvg7d?: number;
  /**
   * Intention done rate over the last 7 calendar days (0–100 rounded integer), or undefined
   * when fewer than 3 intentions were set in the window (insufficient sample for a meaningful rate).
   * Computed in App.tsx: setCount ≥ 3 ? round(doneCount / setCount * 100) : undefined.
   * When this value is 100: "intention_week_perfect" badge fires at priority 10.371.
   * When 70–99: "intention_week_excellent" badge fires at priority 10.372.
   * When 50–69: "intention_week_maintained" badge fires at priority 10.3725,
   *   preempting the comparative improved/declined badges — absolute mid-tier performance takes precedence.
   * Absent/undefined = insufficient data; badges skipped silently.
   */
  intentionWeekDoneRate?: number;
  /**
   * Intention done rate over the previous 7-day window (days 7–13 ago, 0–100 rounded integer), or undefined
   * when fewer than 2 intentions were set in that window (insufficient comparison baseline).
   * Computed in App.tsx using calcIntentionWeek(last14Days.slice(0, 7), ...).
   * Used alongside intentionWeekDoneRate to detect week-over-week changes of ≥ 10pp:
   *   When intentionWeekDoneRate - intentionPrevWeekDoneRate ≥ 10: "intention_week_improved" fires at 10.373.
   *   When intentionPrevWeekDoneRate - intentionWeekDoneRate ≥ 10: "intention_week_declined" fires at 10.374.
   * intention_week_perfect (10.371) returns first when current rate === 100,
   *   intention_week_excellent (10.372) returns first when 70 ≤ current rate < 100,
   *   intention_week_maintained (10.3725) returns first when 50 ≤ current rate < 70,
   *   so both comparison blocks are only reached when the current rate is below 50.
   * Absent/undefined = no comparison data; badges skipped silently.
   */
  intentionPrevWeekDoneRate?: number;
  /**
   * Total pomodoro sessions over the rolling last 7 calendar days, derived from pomodoroHistory
   * filtered to last7Days in App.tsx. Today's count reflects the persisted pomodoroHistory entry
   * (updated on session completion) — not a live in-progress count between session saves.
   * When pomodoroWeekSessions - pomodoroPrevWeekSessions ≥ 3 (and pomodoroPrevWeekSessions ≥ 1),
   * a "pomodoro_week_improved" success badge fires at priority 10.383.
   * Absent/undefined = no history data; badge skipped silently.
   */
  pomodoroWeekSessions?: number;
  /**
   * Total pomodoro sessions over the previous 7-day window (days 7–13 ago),
   * derived from pomodoroHistory filtered to last14Days.slice(0, 7) in App.tsx.
   * Used alongside pomodoroWeekSessions to detect week-over-week changes of ≥ 3 sessions:
   *   When pomodoroWeekSessions - pomodoroPrevWeekSessions ≥ 3 AND pomodoroPrevWeekSessions ≥ 1:
   *     "pomodoro_week_improved" success badge fires at 10.383.
   *   When pomodoroPrevWeekSessions - pomodoroWeekSessions ≥ 3:
   *     "pomodoro_week_declined" warning badge fires at 10.384.
   * pomodoroPrevWeekSessions ≥ 1 guard on the improved badge prevents trivial "records" when
   * the previous window had zero sessions (no meaningful comparison baseline).
   * Absent/undefined = no comparison baseline; badges skipped silently.
   */
  pomodoroPrevWeekSessions?: number;
  /**
   * Number of days in the rolling last 7 calendar days on which the user met or exceeded their
   * daily session goal (sessionsToday for today, pomodoroHistory for past days).
   * Computed in App.tsx via calcPomodoroWeekGoalDays(history, sessionGoal, last7Days, sessionsToday, todayStr).
   * When this value is exactly 7: "pomodoro_week_goal_perfect" success badge fires at 10.3821.
   * When this value is 5 or 6: "pomodoro_week_goal_excellent" success badge fires at 10.3822.
   * When this value is 3 or 4: "pomodoro_week_goal_maintained" success badge fires at 10.38225,
   *   preempting the comparative improved/declined badges — absolute mid-tier effort takes precedence.
   * All three (perfect, excellent, maintained) fire before pomodoro_week_improved (10.383); perfect preempts excellent, excellent preempts maintained.
   * Absent/undefined = sessionGoal not set or not computed; badges skipped silently.
   */
  pomodoroWeekGoalDays?: number;
  /**
   * Intention done rate for the current calendar month (0–100 rounded integer), or undefined
   * when fewer than 14 intentions were set in the month (insufficient sample for a meaningful rate).
   * Computed by calcIntentionMonthDoneRate (intention.ts): excludes today from intentionHistory
   *   to avoid double-counting, then adds today's live state; setCount ≥ 14 guard applied there.
   * When this value is 100: "intention_month_perfect" badge fires at priority 10.42.
   * When 80–99: "intention_month_excellent" badge fires at priority 10.43.
   * When 50–79: "intention_month_maintained" badge fires at priority 10.43005,
   *   preempting the comparative improved/declined badges — absolute mid-tier performance takes precedence.
   * When intentionMonthDoneRate - intentionPrevMonthDoneRate ≥ 10:
   *   "intention_month_improved" success badge fires at priority 10.4301 (rate < 50 by position).
   * When intentionPrevMonthDoneRate - intentionMonthDoneRate ≥ 10:
   *   "intention_month_declined" warning badge fires at priority 10.4302 (rate < 50 by position).
   * Absent/undefined = insufficient data; badges skipped silently.
   */
  intentionMonthDoneRate?: number;
  /**
   * Intention done rate for the previous calendar month (0–100 rounded integer), or undefined
   * when fewer than 10 intentions were set in the previous month (insufficient comparison baseline).
   * Computed in App.tsx by filtering intentionHistory to the previous YYYY-MM month prefix;
   *   intentionHistory is capped at 35 days, covering the full previous calendar month.
   * When intentionMonthDoneRate - intentionPrevMonthDoneRate ≥ 10:
   *   "intention_month_improved" success badge fires at priority 10.4301, after intention_month_maintained (10.43005).
   * When intentionPrevMonthDoneRate - intentionMonthDoneRate ≥ 10:
   *   "intention_month_declined" warning badge fires at priority 10.4302, after intention_month_improved.
   * intention_month_maintained (10.43005) preempts via early return when intentionMonthDoneRate ∈ [50, 80),
   *   so both comparison blocks are only reached when intentionMonthDoneRate < 50.
   * improved and declined are mutually exclusive; at most one fires per call.
   * Absent/undefined = insufficient previous-month data; badges skipped silently.
   */
  intentionPrevMonthDoneRate?: number;
  /**
   * Number of days in the rolling last 14 calendar days on which the user met or exceeded their
   * daily session goal. The 14-day window equals the current month's days from day 1 only when
   * currentMonthDay === 14; for later days (15+) it covers the most recent 14 days within the month.
   * Computed in App.tsx via calcPomodoroMonthGoalDays(history, sessionGoal, last14Days, sessionsToday, todayStr).
   * When this value is 14: "pomodoro_month_goal_perfect" success badge fires at priority 10.441.
   * When this value is 12 or 13: "pomodoro_month_goal_excellent" success badge fires at priority 10.442.
   * When this value is 8–11: "pomodoro_month_goal_maintained" success badge fires at priority 10.44205,
   *   preempting the comparative improved/declined badges — absolute mid-tier effort takes precedence.
   * Both fire after momentum_month_declined (10.4402) and before pomodoro_today_above_avg (10.45);
   *   perfect preempts excellent.
   * Absent/undefined = sessionGoal not set or not computed; badges skipped silently.
   */
  pomodoroMonthGoalDays?: number;
  /**
   * Number of days in the PREVIOUS rolling 14-day window (days 14–27 ago) on which the user met or
   * exceeded their daily session goal, derived from pomodoroHistory.
   * Computed in App.tsx via calcPomodoroMonthGoalDays(history, sessionGoal, last28Days.slice(0, 14), 0, todayStr).
   * Since the previous window never includes today, sessionsToday is passed as 0.
   * Used alongside pomodoroMonthGoalDays to detect month-over-month goal-day changes of ≥ 2 days:
   *   When pomodoroMonthGoalDays - pomodoroMonthPrevGoalDays ≥ 2:
   *     "pomodoro_month_goal_improved" success badge fires at priority 10.443.
   *   When pomodoroMonthPrevGoalDays - pomodoroMonthGoalDays ≥ 2:
   *     "pomodoro_month_goal_declined" warning badge fires at priority 10.444.
   * Both fire after pomodoro_month_goal_excellent (10.442) and before pomodoro_today_above_avg (10.45).
   * improved and declined are mutually exclusive; at most one fires per call.
   * Absent/undefined = sessionGoal not set or not computed; badges skipped silently.
   */
  pomodoroMonthPrevGoalDays?: number;
  /**
   * Number of days in the PREVIOUS rolling 7-day window (days 7–13 ago) on which the user met or
   * exceeded their daily session goal, derived from pomodoroHistory.
   * Computed in App.tsx via calcPomodoroWeekGoalDays(history, sessionGoal, last14Days.slice(0, 7), 0, todayStr).
   * Since the previous window never includes today, sessionsToday is passed as 0.
   * Used alongside pomodoroWeekGoalDays to detect week-over-week goal-day changes of ≥ 2 days:
   *   When pomodoroWeekGoalDays - pomodoroWeekPrevGoalDays ≥ 2:
   *     "pomodoro_week_goal_improved" success badge fires at priority 10.3823.
   *   When pomodoroWeekPrevGoalDays - pomodoroWeekGoalDays ≥ 2:
   *     "pomodoro_week_goal_declined" warning badge fires at priority 10.3824.
   * Both fire after pomodoro_week_goal_maintained (10.38225) and before pomodoro_week_improved (10.383).
   * improved and declined are mutually exclusive; at most one fires per call.
   * Absent/undefined = sessionGoal not set or not computed; badges skipped silently.
   */
  pomodoroWeekPrevGoalDays?: number;
  /**
   * Point gap between average momentum on days ALL habits were done vs. days they were NOT all done.
   * Derived from calcHabitMomentumCorrelation(habits, momentumHistory, todayStr) in App.tsx.
   * When this value is ≥ 15, a data-driven "습관 완료일 모멘텀 평균 +Xpt ↑" insight fires at priority 10.52,
   * informing the user that completing all habits correlates with meaningfully higher momentum scores.
   * Requires ≥ 5 all-done days and ≥ 5 not-all-done days in momentumHistory (today excluded).
   * Absent/undefined = insufficient data or gap below threshold; badge skipped silently.
   */
  habitMomentumGap?: number;
  /**
   * Momentum-score gap between intention-done days (done===true) and intention-not-done/not-set days,
   * computed by calcIntentionMomentumCorrelation(intentionHistory, momentumHistory, todayStr) in App.tsx.
   * When this value is ≥ 15, a data-driven "의도 달성일 모멘텀 평균 +Xpt ↑" insight fires at priority 10.53,
   * informing the user that completing their daily intention correlates with higher momentum scores.
   * Requires ≥ 5 done days and ≥ 5 not-done days in momentumHistory (today excluded).
   * Absent/undefined = insufficient data or gap below threshold; badge skipped silently.
   */
  intentionMomentumGap?: number;
  /**
   * Momentum-score gap between days where the pomodoro session goal was met (count >= sessionGoal)
   * and days where it was not met (count < sessionGoal, including missing = 0 sessions),
   * computed by calcPomodoroMomentumCorrelation(pomodoroHistory, momentumHistory, sessionGoal, todayStr) in App.tsx.
   * When this value is ≥ 15, a data-driven "💡 포모도로 목표 달성일 모멘텀 평균 +Xpt ↑" insight fires at priority 10.54,
   * completing the 3-domain correlation series (habit 10.52, intention 10.53, pomodoro 10.54).
   * Requires ≥ 5 goal-met days and ≥ 5 not-met days in momentumHistory (today excluded).
   * Absent/undefined = sessionGoal not set, insufficient data, or gap below threshold; badge skipped silently.
   */
  pomodoroMomentumGap?: number;
}

// Habit streak milestones at which a personal-best celebration is shown (mirrors getUpcomingMilestone targets).
// Restricting to these values prevents the insight from firing every day while on a continuous best-streak run.
const PERSONAL_BEST_MILESTONES = [7, 30, 100];

// Consecutive focus-day milestones that trigger a focus_streak_milestone badge.
// Chosen at 7/14/30 to mark one week, two weeks, and one month of daily focus respectively.
const FOCUS_STREAK_MILESTONES = [7, 14, 30];

// Consecutive habit-check-day milestones for the habit_streak_milestone_approach badge.
// Mirrors FOCUS_STREAK_MILESTONES thresholds (7=one week, 14=two weeks, 30=one month) —
// symmetric with focus/intention/pomodoro/momentum milestone approach series.
const HABIT_STREAK_MILESTONES = [7, 14, 30];

// Consecutive qualifying-momentum-day milestones (score ≥ 40) that trigger a momentum_streak_milestone badge.
// Mirrors FOCUS_STREAK_MILESTONES thresholds: 7=one week, 14=two weeks, 30=one month of sustained momentum.
const MOMENTUM_STREAK_MILESTONES = [7, 14, 30];

// Consecutive goal-met-day milestones for the pomodoro_goal_streak_milestone badge.
// pomodoroGoalStreak (past days) + 1 (today) must hit one of these values.
// Mirrors FOCUS_STREAK_MILESTONES (weekly/biweekly/monthly) — consistent with system-wide milestone philosophy.
const POMODORO_GOAL_STREAK_MILESTONES = [7, 14, 30];

// Consecutive intention-done-day milestones for the intention_done_streak_milestone badge.
// Mirrors FOCUS_STREAK_MILESTONES thresholds: 7=one week, 14=two weeks, 30=one month of daily execution.
const INTENTION_DONE_STREAK_MILESTONES = [7, 14, 30];

// Cumulative focus-time milestones (in minutes) for the pomodoro_lifetime_milestone badge.
// 600=10h, 3000=50h, 6000=100h, 12000=200h — chosen to mark meaningful long-term focus achievements
// while remaining achievable across months of daily practice.
const POMODORO_LIFETIME_MILESTONES = [600, 3000, 6000, 12000];

// 100=century, 500=half-thousand, 1000=thousand, 5000=elite — spaced to reward early progress
// (100 ≈ 33 days with 3 habits) while marking genuine long-term commitment (5000 ≈ 4.5 years).
const HABIT_LIFETIME_MILESTONES = [100, 500, 1000, 5000];

// Per-project lifetime focus sessions milestones for the project_focus_milestone badge.
// 10=first dedication mark, 25=invested, 50=committed, 100=deep-work-century,
// 200=mastery-level, 500=legendary — each milestone is achievable but non-trivial at 1-3 sessions/day.
const PROJECT_FOCUS_MILESTONES = [10, 25, 50, 100, 200, 500];

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

// Minimum calendar days into the month before the habit_month_flawless badge can surface.
// 10 days suppresses early-month noise (e.g. a 3-day "개근" on Jan 3 is premature).
const MIN_MONTH_DAYS = 10;

// Minimum days elapsed in the ISO week before week_trifecta_flawless can fire (Friday–Sunday only).
// 5 elapsed days (Mon–Fri) ensures the user has sustained all three domains for most of the week;
// firing on Tuesday (2 days) would be premature and trivially achievable.
const MIN_WEEK_TRIFECTA_DAYS = 5;

// Minimum number of habits with streak ≥ 7 before a collective multi-streak badge fires.
// 3 chosen to avoid noise for users with 1–2 sustained habits; 3+ signals a genuine portfolio commitment.
const MIN_MULTI_STREAK_HABITS = 3;

// Minimum momentum history entries within the current calendar month before the momentum_month_strong
// badge can surface. Mirrors the ≥ 14 guard used by habit_month_perfect and intention_month_perfect
// to avoid early-month noise (e.g. a 3-day run on Jan 3 is too fragile to celebrate).
const MIN_MONTH_MOMENTUM_ENTRIES = 14;

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
// Priority order: streak_at_risk > deadline_critical > ci_failure > project_completed (done today) > milestone_near > open_prs > github_drought > open_issues > intention_habit_pomodoro_triple_win > intention_habit_dual_win (intention done + all habits done, no pomodoro goal) > habit_pomodoro_dual_win > intention_pomodoro_dual_win (intention done + pomodoro goal met, habits not all done) > habit_all_done_early (habits done before noon, length>0) > perfect_day > intention_done > intention_missing > period_start > no_focus_project > weak_day_ahead > best_day_ahead > pomodoro_weak_day_ahead > pomodoro_best_day_ahead > intention_weak_day_ahead (morning, historically low intention done-rate weekday) > intention_best_day_ahead (morning, historically high intention done-rate weekday) > momentum_weak_day_ahead (morning, historically low momentum-score weekday) > momentum_best_day_ahead (morning, historically high momentum-score weekday) > habit_first_check_in > habit_comeback > habit_multi_streak > pomodoro_last_one > pomodoro_goal_streak_milestone > focus_streak_milestone > focus_streak_milestone_approach (1–2 days before next focus milestone 7/14/30, no today guard) > intention_done_streak_milestone_approach (1–2 days before next intention done streak milestone 7/14/30, no today guard) > pomodoro_goal_streak_milestone_approach (1–2 days before next pomodoro goal streak milestone 7/14/30, effectiveStreak = pomodoroGoalStreak+1 when today's goal already met) > habit_streak_milestone_approach (1–2 days before next habit streak milestone 7/14/30 for any habit; picks most-imminent habit) > pomodoro_lifetime_milestone (cumulative focus time crosses 10h/50h/100h/200h today) > habit_lifetime_milestone (cumulative check-ins across all habits crosses 100/500/1000/5000 today) > project_focus_milestone (focused project lifetime session count crosses 10/25/50/100/200/500 today) > pomodoro_goal_streak > pomodoro_day_record > pomodoro_session_best_tie > pomodoro_week_record > pomodoro_goal_reached > momentum_near_tier (single action bridges score gap to next tier: intentionDone +12, pomodoro +30/goalN, habit +50/total) > deadline_soon > goal_expiry > momentum_decline > project_stale > project_context_switching > streak_recession > habit_consecutive_miss > habit_diversity_warning > almost_perfect_day > week_quadrafecta_flawless (habit + pomodoro + momentum + intention all flawless this ISO week, ≥5 days elapsed) > week_trifecta_flawless (habit + pomodoro + momentum all flawless this ISO week, ≥5 days elapsed) > week_balanced > habit_week_perfect > habit_week_excellent > habit_week_maintained (70–89%, preempts improved/declined) > habit_week_improved > habit_week_declined > intention_week_perfect (7-day done rate = 100%, setCount ≥ 3) > intention_week_excellent (done rate 70–99%) > intention_week_maintained (7-day done rate 50–69%, setCount ≥ 3) > intention_week_improved (done rate rose ≥10pp vs prev 7d) > intention_week_declined (done rate dropped ≥10pp vs prev 7d) > momentum_week_strong (7-day avg ≥65) > momentum_week_excellent (7-day avg 50–64) > momentum_week_maintained (7-day avg 40–49) > momentum_week_improved (7-day avg rose ≥10pts) > momentum_week_declined (7-day avg dropped ≥10pts) > pomodoro_week_goal_perfect (daily session goal met on all 7 rolling days) > pomodoro_week_goal_excellent (5–6/7 rolling days met goal) > pomodoro_week_goal_maintained (3–4/7 rolling days met goal, absolute mid-tier preempts improved/declined) > pomodoro_week_goal_improved (goal-met days rose ≥2 vs prev 7d) > pomodoro_week_goal_declined (goal-met days dropped ≥2 vs prev 7d) > pomodoro_week_improved (rolling 7-day session total rose ≥3 vs prev 7d, prevWeek ≥ 1) > pomodoro_week_declined (rolling 7-day session total dropped ≥3 vs prev 7d) > momentum_recovery (recorded score ≥40 after 2 consecutive days below 40) > month_balanced (habitMonthRate ∈[70,90) + intentionMonthDoneRate ∈[70,100) + momentum month avg ∈[40,65), all three domains good-but-not-exceptional this month, ≥14 days into month + ≥14 momentum entries) > habit_month_perfect (aggregate monthly rate = 100%, ≥14 days into month) > habit_month_excellent (aggregate monthly rate 80–99%, ≥14 days into month) > habit_month_maintained (aggregate monthly rate 70–79%, ≥14 days into month) > habit_month_improved (current month habit rate rose ≥10pp vs prev month, currentMonthDay ≥ 14, rate < 70) > habit_month_declined (current month habit rate dropped ≥10pp vs prev month, currentMonthDay ≥ 14, rate < 70) > intention_month_perfect (monthly done rate = 100%, setCount ≥ 14) > intention_month_excellent (monthly done rate 80–99%, setCount ≥ 14) > intention_month_maintained (monthly done rate 50–79%, absolute mid-tier preempts improved/declined) > intention_month_improved (current month done rate rose ≥10pp vs prev month, rate < 50) > intention_month_declined (current month done rate dropped ≥10pp vs prev month, rate < 50) > momentum_month_strong (calendar month avg momentum ≥65, ≥14 entries) > momentum_month_excellent (calendar month avg momentum 50–64, ≥14 entries) > momentum_month_maintained (calendar month avg momentum 40–49, ≥14 entries) > momentum_month_improved (current month avg rose ≥10pts vs prev month) > momentum_month_declined (current month avg dropped ≥10pts vs prev month) > pomodoro_month_goal_perfect (all 14 rolling days met goal, currentMonthDay ≥ 14) > pomodoro_month_goal_excellent (12–13/14 rolling days met goal, currentMonthDay ≥ 14) > pomodoro_month_goal_maintained (8–11/14 rolling days met goal, absolute mid-tier preempts improved/declined, currentMonthDay ≥ 14) > pomodoro_month_goal_improved (goal-met days rose ≥2 vs prev 14d, currentMonthDay ≥ 14) > pomodoro_month_goal_declined (goal-met days dropped ≥2 vs prev 14d, currentMonthDay ≥ 14) > pomodoro_today_above_avg > momentum_streak_milestone > momentum_rise > momentum_maintained (3-day stable trend, avg ≥ 40) > triple_momentum_correlation (all three domain gaps ≥ 15; preempts individual domain badges) > habit_momentum_correlation (allDoneAvg − notAllDoneAvg ≥ 15 pts, ≥5 samples each bucket) > intention_momentum_correlation (intentionDoneAvg − notDoneAvg ≥ 15 pts, ≥5 samples each bucket) > pomodoro_momentum_correlation (goalMetAvg − notGoalMetAvg ≥ 15 pts, ≥5 samples each bucket) > goal_done > goal_streak > month_goal_streak > quarter_goal_streak > year_goal_streak > project_ahead > project_near_completion > project_forecast > personal_best (streak at fixed milestone 7/30/100d) > habit_streak_record (non-milestone personal best, streak === bestStreak, bestStreak > 3) > habit_best_streak_approach > habit_target_hit > habit_target_near > habit_target_halfway > month_quadrafecta_flawless (habit + pomodoro + momentum + intention all flawless for current month, ≥10 days in) > month_trifecta_flawless (habit + pomodoro + momentum all flawless for current month, ≥10 days in) > habit_month_flawless (habit checked every day of calendar month so far, ≥10 days in) > pomodoro_month_flawless (≥1 pomodoro session every day this month, focusStreak ≥ currentMonthDay, sessionsToday > 0, ≥10 days in) > momentum_month_flawless (momentum score ≥ 40 every day this month, momentumStreak ≥ currentMonthDay, ≥10 days in) > intention_streak.
export function calcTodayInsight(params: InsightParams): TodayInsight | null {
  const {
    habits, todayStr, nowHour, todayIntentionDate, todayIntentionDone, sessionsToday, sessionGoal, habitsAllDoneDate, projects,
    weekGoal, weekGoalDone, daysLeftWeek,
    monthGoal, monthGoalDone, daysLeftMonth,
    quarterGoal, quarterGoalDone, daysLeftQuarter,
    yearGoal, yearGoalDone, daysLeftYear,
    momentumHistory,
    weekGoalPastDoneStreak,
    monthGoalPastDoneStreak,
    quarterGoalPastDoneStreak,
    yearGoalPastDoneStreak,
    pomodoroGoalStreak,
    prevPomodoroGoalStreak,
    pomodoroSessionBest,
    pomodoroWeekRecord,
    pomodoroRecentAvg,
    intentionConsecutiveDays,
    intentionDoneStreak,
    momentumStreak,
    todayIsWeakHabitDay,
    todayIsBestHabitDay,
    focusStreak,
    pomodoroLifetimePrevMins,
    pomodoroLifetimeMins,
    habitLifetimePrevCheckins,
    habitLifetimeCheckins,
    projectFocusSessions,
    projectFocusPrevSessions,
    projectFocusName,
    perfectDayStreak,
    habitWeekRate,
    habitPrevWeekRate,
    todayIsWeakPomodoroDay,
    todayIsBestPomodoroDay,
    todayIsWeakIntentionDay,
    todayIsBestIntentionDay,
    todayIsWeakMomentumDay,
    todayIsBestMomentumDay,
    momentumWeekAvg7d,
    momentumPrevWeekAvg7d,
    intentionWeekDoneRate,
    intentionPrevWeekDoneRate,
    pomodoroWeekSessions,
    pomodoroPrevWeekSessions,
    pomodoroWeekGoalDays,
    pomodoroWeekPrevGoalDays,
    intentionMonthDoneRate,
    intentionPrevMonthDoneRate,
    pomodoroMonthGoalDays,
    pomodoroMonthPrevGoalDays,
    habitMonthRate,
    habitPrevMonthRate,
    habitMomentumGap,
    intentionMomentumGap,
    pomodoroMomentumGap,
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

  // 2.75. Project completed today: a project was marked "done" with completedDate === todayStr.
  // Fires after ci_failure (2.5) — a broken build is an actionable blocker that shows first even on completion day.
  // Fires before milestone_near (3) — project completion is a bigger achievement than a single habit milestone day.
  // Picks the first project completed today in user-defined order (same convention as ci_failure).
  // completedDate absent → skipped silently; existing fixtures without this field are unaffected.
  if (projects && projects.length > 0) {
    const completed = projects.find(p => p.status === "done" && p.completedDate === todayStr);
    if (completed) {
      return { text: `🎉 ${completed.name} 완료! 수고했어요!`, level: "success" };
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

  // 3.93. Intention + habit + pomodoro triple win: ALL three domains accomplished today.
  // Fires BEFORE all dual_wins (3.94/3.95/3.96): a full three-domain win is the most celebratory state.
  // open_issues (3.9) still preempts this block: a GitHub backlog is a pending action item.
  // todayIntentionDone === true guard: intention must be explicitly marked done (not just set).
  // todayIntentionDate === todayStr guard: the done mark must be from today's intention, not yesterday's.
  // sessionGoal > 0 guard: goal absent (undefined) or 0 means no configured goal, so pomodoro never "met".
  //   Fall-through cases from this block:
  //   (a) intention done + habits done + sessionGoal absent/0 → 3.94 (intention_habit_dual_win)
  //   (b) intention done + habits done + sessionsToday < sessionGoal → 3.94 (pomodoro unmet)
  //   (c) intention not done + habits done + sessionGoal > 0 + goal met → 3.95 (habit_pomodoro_dual_win)
  //   Note: 3.95 requires sessionGoal > 0 — cases (a)/(b) never reach 3.95.
  if (
    todayIntentionDone === true &&
    todayIntentionDate === todayStr &&
    habitsAllDoneDate === todayStr &&
    sessionGoal !== undefined && sessionGoal > 0 &&
    sessionsToday >= sessionGoal
  ) {
    return { text: `🌟 오늘 의도 + 습관 + 포모도로 목표 모두 달성!`, level: "success" };
  }

  // 3.94. Intention + habit dual win: today's intention accomplished AND all habits completed today,
  // but the pomodoro session goal was NOT met (or no goal configured).
  // Fires AFTER triple_win (3.93): when all 3 domains are done, triple_win has already returned above,
  //   so reaching this block guarantees the pomodoro goal is either absent or unmet.
  // Fires BEFORE habit_pomodoro_dual_win (3.95): setting a daily intention AND completing every habit
  //   is a meaningful cross-domain achievement even without pomodoro focus.
  // todayIntentionDate === todayStr guard: prevents stale done state from a previous day from firing.
  if (
    todayIntentionDone === true &&
    todayIntentionDate === todayStr &&
    habitsAllDoneDate === todayStr
  ) {
    return { text: `✅ 의도 + 모든 습관 달성! 오늘 하루 주도적으로 살았습니다`, level: "success" };
  }

  // 3.95. Habit + pomodoro dual win: ALL habits completed today AND daily pomodoro session goal met.
  // Fires BEFORE perfect_day (4): the combined cross-domain achievement is more celebratory than
  //   either condition alone. When only habits are done (no configured goal), falls through to (4).
  //   When only the pomodoro goal is met (habits not all done), falls through to pomodoro_goal_reached (7.5).
  // sessionGoal > 0 guard: mirrors pomodoro_goal_reached — goal=0 or absent means "no configured goal";
  //   in that case only habits completion is relevant, so perfect_day (4) fires instead.
  // sessionsToday >= sessionGoal guard: fires on the exact moment the goal is met or exceeded (same
  //   semantics as pomodoro_goal_reached at 7.5 — > 0 excess counts as goal met).
  // open_issues (3.9) preempts this block: a GitHub backlog is a pending action item and surfaces first.
  // This block also preempts pomodoro_goal_streak_milestone (7.41), pomodoro_day_record (7.49),
  //   pomodoro_week_record (7.495), and pomodoro_goal_reached (7.5): on a dual-win day, showing
  //   both domains simultaneously is the most celebratory outcome even when a pomodoro record was set.
  if (
    habitsAllDoneDate === todayStr &&
    sessionGoal !== undefined && sessionGoal > 0 &&
    sessionsToday >= sessionGoal
  ) {
    return { text: `🏆 오늘 습관 + 포모도로 목표 모두 달성!`, level: "success" };
  }

  // 3.96. Intention + pomodoro dual win: today's intention accomplished AND daily pomodoro session goal met,
  // but habits are NOT all completed today.
  // Fires AFTER habit_pomodoro_dual_win (3.95): when habits are also done, one of 3.93/3.94/3.95 already returned.
  // Fires BEFORE habit_all_done_early (3.97): focus discipline + intention execution is a meaningful pair
  //   even when habit completion is incomplete.
  // todayIntentionDate === todayStr guard: prevents stale done state from a previous day.
  // sessionGoal > 0 guard: mirrors pomodoro_goal_reached — goal=0 or absent means "no configured goal".
  if (
    todayIntentionDone === true &&
    todayIntentionDate === todayStr &&
    sessionGoal !== undefined && sessionGoal > 0 &&
    sessionsToday >= sessionGoal
  ) {
    return { text: `🎯 의도 + 포모도로 목표 달성! 집중과 실행의 하루`, level: "success" };
  }

  // 3.97. Habit all done early: all habits completed before noon — morning momentum celebration.
  // Fires AFTER intention_pomodoro_dual_win (3.96): any dual_win achievement takes precedence.
  // Fires BEFORE perfect_day (4): morning completion (< 12h) is a rarer, more noteworthy achievement
  //   than completing habits at any point during the day — recognising early discipline drives habit momentum.
  // habits.length > 0 guard: meaningful only when the user has at least one habit to complete.
  // No sessionGoal guard: when pomodoro goal is also met, habit_pomodoro_dual_win (3.95) preempts this block.
  if (habitsAllDoneDate === todayStr && nowHour < 12 && habits.length > 0) {
    return { text: "🌅 오전에 모든 습관 완료! 완벽한 아침 스타트", level: "success" };
  }

  // 4. Perfect day: all habits completed today.
  // When perfectDayStreak ≥ 3, show the consecutive-day count for added motivation;
  // otherwise fall back to a generic celebration (< 3 days is too brief to surface as a streak).
  if (habitsAllDoneDate === todayStr) {
    if (perfectDayStreak != null && perfectDayStreak >= 3) {
      return { text: `✨ ${perfectDayStreak}일 연속 완벽한 하루!`, level: "success" };
    }
    return { text: "✨ 오늘 완벽한 습관 달성!", level: "success" };
  }

  // 4.5. Intention done: today's daily intention was marked as accomplished — positive reinforcement.
  // Fires after perfect_day (4): all-habits completion is the highest day-level achievement;
  // intention done is surfaced as the next-best signal when habits are still in progress.
  // Fires before intention_missing (5): a completed intention supersedes the "please set" nudge.
  // todayIntentionDate === todayStr guard prevents stale done state from a previous day from firing.
  // Four tiers based on intentionDoneStreak (milestone checked first):
  //   milestone (7/14/30 days): distinct celebration badge for weekly/biweekly/monthly execution milestones.
  //   month_flawless (streak ≥ currentMonthDay, currentMonthDay ≥ MIN_MONTH_DAYS): every day of the month
  //     completed — fires after milestone so streak-30 on Jan 30 shows the milestone, not the flawless badge.
  //   streak ≥ 3 (non-milestone, non-flawless): streak count badge — rewards sustained execution.
  //   default: generic single-day completion message.
  if (todayIntentionDone && todayIntentionDate === todayStr) {
    if (intentionDoneStreak != null && INTENTION_DONE_STREAK_MILESTONES.includes(intentionDoneStreak)) {
      return { text: `✨ 의도 달성 ${intentionDoneStreak}일 연속 마일스톤! 실행 의지가 빛나요`, level: "success" };
    }
    const intentionMonthDay = parseInt(todayStr.slice(8, 10), 10);
    if (intentionDoneStreak != null && intentionDoneStreak >= intentionMonthDay && intentionMonthDay >= MIN_MONTH_DAYS) {
      return { text: `✍️ 이번 달 매일 의도 달성! (${intentionMonthDay}일)`, level: "success" };
    }
    if (intentionDoneStreak != null && intentionDoneStreak >= 3) {
      return { text: `✨ ${intentionDoneStreak}일 연속 의도 달성! 실행력이 빛나요`, level: "success" };
    }
    return { text: "✨ 오늘의 의도 달성!", level: "success" };
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

  // 6.83. Pomodoro weak day ahead: morning + today is the user's historically weakest focus day
  // (average sessions < 1 over the last 14 days). Fires an awareness nudge so the user can set
  // a small, achievable session goal on a day where focus is historically harder.
  // Morning-only (< 12h): actionable before the focus session window opens; no evening value.
  // Placed after best_day_ahead (6.82) — habit-pattern nudges preempt pomodoro-pattern nudges.
  // Does NOT require habits to be present (pomodoro is independent of habit tracking).
  if (nowHour < 12 && todayIsWeakPomodoroDay === true) {
    return { text: "🍅 오늘은 집중하기 약한 요일이에요 — 작은 목표 하나만 달성해봐요!", level: "info" };
  }

  // 6.84. Pomodoro best day ahead: morning + today is the user's historically strongest focus day
  // (average sessions ≥ 3 over the last 14 days). Fires a positive reinforcement nudge to capitalise
  // on the user's natural high-focus rhythm.
  // Morning-only (< 12h): mirrors the pomodoro_weak_day_ahead gate for symmetry.
  // Placed after pomodoro_weak_day_ahead (6.83) — weak-day warnings preempt positive nudges.
  // When todayIsWeakPomodoroDay is also true (edge case), weak fires first (already returned above).
  if (nowHour < 12 && todayIsBestPomodoroDay === true) {
    return { text: "🍅 오늘은 역대 집중력이 높은 요일이에요 — 최고 기록 갈아치워봐요!", level: "success" };
  }

  // 6.845. Intention weak day ahead: morning + today is the user's historically weakest intention-done day
  // (done rate < 50% on this weekday, ≥2 set intentions in the window). Fires an awareness nudge to
  // prime deliberate execution on a day where intentions are historically harder to follow through.
  // Morning-only (< 12h): actionable before intentions are typically acted on.
  // Placed after pomodoro_best_day_ahead (6.84) — pomodoro day-pattern nudges precede intention nudges.
  // Priority invariants: (a) intention_done (4.5) fires first when todayIntentionDone && todayIntentionDate === todayStr,
  // suppressing this badge when today's intention is already accomplished.
  // (b) intention_missing (5) fires first when nowHour < 12 && todayIntentionDate !== todayStr,
  // so reaching 6.845 with nowHour < 12 guarantees todayIntentionDate === todayStr (set today, not yet done).
  if (nowHour < 12 && todayIsWeakIntentionDay === true) {
    return { text: "📝 오늘은 의도 달성률이 낮은 요일이에요 — 다시 한번 되새겨봐요!", level: "info" };
  }

  // 6.846. Intention best day ahead: morning + today is the user's historically strongest intention-done day
  // (done rate ≥ 80% on this weekday). Fires a positive reinforcement nudge to capitalise on the
  // user's natural intention-execution rhythm.
  // Morning-only (< 12h): mirrors the intention_weak_day_ahead gate for symmetry.
  // Placed after intention_weak_day_ahead (6.845) — warnings preempt positive nudges.
  // When todayIsWeakIntentionDay is also true (edge case), weak fires first (already returned above).
  if (nowHour < 12 && todayIsBestIntentionDay === true) {
    return { text: "📝 오늘은 의도 달성률이 높은 요일이에요 — 오늘도 해낼 수 있어요!", level: "success" };
  }

  // 6.847. Momentum weak day ahead: morning + today is the user's historically weakest momentum-score day
  // (average score < 40 — the low-tier boundary — on this weekday). Fires a heads-up nudge so the user
  // can compensate by being intentional about habits, focus sessions, and intention-setting.
  // Morning-only (< 12h): actionable before the day's major productivity decisions are made.
  // Placed after intention_best_day_ahead (6.846) — positive intention-rhythm nudges precede momentum warnings.
  if (nowHour < 12 && todayIsWeakMomentumDay === true) {
    return { text: "⚡ 오늘은 모멘텀 점수가 낮은 요일이에요 — 의식적으로 집중해봐요!", level: "info" };
  }

  // 6.848. Momentum best day ahead: morning + today is the user's historically strongest momentum-score day
  // (average score ≥ 65 on this weekday). Fires a positive reinforcement nudge to capitalise on the
  // user's natural high-productivity rhythm.
  // Morning-only (< 12h): mirrors the weak-day gate for symmetry.
  // Placed after momentum_weak_day_ahead (6.847) — warnings preempt positive nudges.
  // When todayIsWeakMomentumDay is also true (edge case), weak fires first (already returned above).
  if (nowHour < 12 && todayIsBestMomentumDay === true) {
    return { text: "⚡ 오늘은 모멘텀 점수가 높은 요일이에요 — 오늘 흐름을 타봐요!", level: "success" };
  }

  // 6.85. Habit first check-in: a habit has been checked in for the first time, or its all-time
  // best streak has never exceeded 1 day (streak === 1, lastChecked === todayStr, bestStreak ≤ 1 or absent).
  // Fires AFTER best_day_ahead (6.82): a positive-day-rhythm nudge preempts a new-habit celebration.
  // Fires BEFORE habit_comeback (6.9): a first-step celebration is distinct from a recovery signal.
  // bestStreak ≤ 1 guard: bestStreak is auto-updated on every check-in, so bestStreak=null or =1 means
  //   the user has never built a streak longer than 1 day — whether today is literally the first check-in
  //   ever or a restart after past 1-day attempts. Users with bestStreak > 1 who restart at streak=1 are
  //   intentionally excluded (no badge fires until habit_comeback qualifies at streak ≥ 3).
  // Badge text uses "첫걸음" (first step) rather than "첫 체크인 완료" (first check-in ever) to remain
  //   accurate for both genuine first-evers and users restarting who have never exceeded 1 consecutive day.
  // Picks the first qualifying habit in array order (matches user-defined habit list order).
  const firstCheckInHabit = habits.find(
    h => h.streak === 1 && h.lastChecked === todayStr && (h.bestStreak == null || h.bestStreak <= 1)
  );
  if (firstCheckInHabit) {
    return { text: `🌱 ${firstCheckInHabit.name} 새 습관 첫걸음!`, level: "success" };
  }

  // 6.9. Habit comeback: a habit had a long streak (≥ 14 days bestStreak) that was broken,
  // and is now recovering (streak ≥ 3) with today's check-in confirming active progress.
  // Fires after best_day_ahead (6.82) so positive habit-day nudges preempt comeback messages.
  // Fires before pomodoro_last_one (7): a multi-week comeback is more remarkable than a session nudge.
  // bestStreak ≥ 14 threshold: only celebrate meaningful reversals — short past streaks are common.
  // streak < bestStreak guard: when streak reaches bestStreak at a PERSONAL_BEST_MILESTONES value
  //   (7/30/100d), personal_best (11) takes over. For non-milestone bestStreak values both insights
  //   are silent at equality — intentional, since not every streak level warrants a milestone badge.
  // lastChecked === todayStr guard: fires only when today's check-in confirms active recovery.
  // Picks the habit with the highest current streak when multiple qualify.
  const comebackHabit = habits
    .filter(h => h.bestStreak != null && h.bestStreak >= 14 && h.streak >= 3 && h.streak < h.bestStreak && h.lastChecked === todayStr)
    .sort((a, b) => b.streak - a.streak)[0];
  if (comebackHabit) {
    return { text: `💪 ${comebackHabit.name} 회복 중! ${comebackHabit.streak}일 연속`, level: "success" };
  }

  // 6.95. Habit multi-streak: 3+ habits simultaneously on ≥7d streaks — collective portfolio momentum badge.
  // Fires after habit_comeback (6.9): an individual recovery event is rarer and more actionable.
  // Fires before pomodoro_last_one (7): aggregate habit momentum is background context; session nudge is urgent.
  // MIN_MULTI_STREAK_HABITS (3): fewer than 3 simultaneous 7-day streaks is common for active users;
  //   3+ represents a meaningful portfolio-level commitment that deserves recognition.
  // No time-of-day restriction: habit portfolio momentum is relevant context throughout the day.
  // No lastChecked guard: fires on the current persisted streak value regardless of today's check-in status.
  //   streak_at_risk (priority 1) fires in the evening for any habit with streak ≥ 7 not yet checked today,
  //   so the urgency case is preempted; habits already checked today may still be counted here (intended).
  const multiStreakCount = habits.filter(h => h.streak >= 7).length;
  if (multiStreakCount >= MIN_MULTI_STREAK_HABITS) {
    return { text: `💪 ${multiStreakCount}개 습관 7일+ 스트릭 유지 중!`, level: "success" };
  }

  // 7. Pomodoro: one session away from daily goal
  if (sessionGoal !== undefined && sessionsToday === sessionGoal - 1) {
    return { text: "🍅 포모도로 목표까지 1세션!", level: "info" };
  }

  // 7.41. Pomodoro goal streak milestone: pomodoroGoalStreak + 1 (today) hits 7/14/30 consecutive days
  // where the daily sessionGoal was met or exceeded — a quality milestone complementing focus_streak (quantity).
  // Fires BEFORE focus_streak_milestone (7.42): completing the configured goal is a higher bar than any session.
  // Fires AFTER pomodoro_last_one (7): one-session-away urgency preempts milestone celebration.
  // sessionsToday >= sessionGoal guard: fires only on the day the milestone is completed, not before.
  // Mutually exclusive with pomodoro_goal_streak (7.45): that block requires sessionsToday < sessionGoal.
  // pomodoroGoalStreak absent → skipped silently. sessionGoal absent/0 → skipped (no configured daily goal).
  if (
    pomodoroGoalStreak !== undefined &&
    sessionGoal !== undefined && sessionGoal > 0 &&
    sessionsToday >= sessionGoal &&
    POMODORO_GOAL_STREAK_MILESTONES.includes(pomodoroGoalStreak + 1)
  ) {
    const total = pomodoroGoalStreak + 1;
    return { text: `🍅 포모도로 목표 ${total}일 연속 달성!`, level: "success" };
  }

  // 7.42. Focus streak milestone: ≥1 session today AND focusStreak hits 7/14/30 consecutive focus days.
  // Fires AFTER pomodoro_last_one (7): "one session away from goal" urgency preempts streak celebration.
  // Fires BEFORE pomodoro_goal_streak (7.45): a milestone (rare, ~weekly/monthly) outweighs the daily streak nudge.
  // sessionsToday > 0 && MILESTONES.includes(focusStreak) together exactly express "today is the Nth milestone day":
  //   calcFocusStreak includes today only when sessionsToday > 0 (daysBack=0); when sessionsToday=0, it counts from
  //   yesterday (daysBack=1), so streak=7 + sessionsToday=0 means "7 past days, today not yet started".
  //   The two conditions are therefore mutually exclusive with the "yesterday-7" case, ensuring the badge fires
  //   only on the day the user actually completes the milestone session — not the morning before.
  // Display behavior mirrors pomodoro_goal_reached (7.5): re-evaluated each render, shown all day once triggered.
  //   No persistent date guard is needed — the badge is meaningful context for the rest of the day.
  // focusStreak absent → skipped silently (no history or caller did not wire calcFocusStreak).
  if (focusStreak != null && FOCUS_STREAK_MILESTONES.includes(focusStreak) && sessionsToday > 0) {
    return { text: `🔥 ${focusStreak}일 연속 집중 중!`, level: "success" };
  }

  // 7.421. Focus streak milestone approach: streak is 1–2 days away from the next focus milestone (7, 14, or 30).
  // Motivates the user to maintain their streak before it reaches a celebration-worthy milestone.
  // Fires AFTER focus_streak_milestone (7.42): when streak === 7/14/30 AND sessionsToday > 0, that badge fires first.
  // Fires BEFORE pomodoro_lifetime_milestone (7.43): an imminent focus milestone is more specific and time-sensitive.
  // No sessionsToday guard: fires as a morning nudge even before today's focus session —
  //   the streak reflects PAST consecutive focus days; the user still has all day to keep it alive.
  //   Distinct from focus_streak_milestone which requires sessionsToday > 0 before declaring the milestone reached.
  // focusStreak absent → skipped silently.
  if (focusStreak != null) {
    const nextFocusMilestone = FOCUS_STREAK_MILESTONES.find(m => m > focusStreak && m - focusStreak <= 2);
    if (nextFocusMilestone !== undefined) {
      const daysLeft = nextFocusMilestone - focusStreak;
      return { text: `🔥 집중 ${focusStreak}일 연속! ${daysLeft}일 더 유지하면 ${nextFocusMilestone}일 마일스톤`, level: "success" };
    }
  }

  // 7.422. Intention done streak milestone approach: intentionDoneStreak is 1–2 days away from the next milestone (7, 14, or 30).
  // Motivates the user to maintain daily intention completion before hitting a celebration-worthy milestone.
  // Fires AFTER focus_streak_milestone_approach (7.421): focus streak is auto-tracked; intention requires explicit daily
  //   action, so focus approach fires first when both qualify on the same day.
  // Fires BEFORE pomodoro_lifetime_milestone (7.43): an imminent personal milestone is more time-sensitive than a cumulative total.
  // No todayIntentionDone guard: fires as a morning nudge even before today's intention is completed —
  //   the streak reflects PAST consecutive done days; the user still has all day to act.
  //   Distinct from intention_done (4.5) which requires todayIntentionDone === true before celebrating.
  // intentionDoneStreak absent → skipped silently.
  if (intentionDoneStreak != null) {
    const nextIntentionDoneMilestone = INTENTION_DONE_STREAK_MILESTONES.find(m => m > intentionDoneStreak && m - intentionDoneStreak <= 2);
    if (nextIntentionDoneMilestone !== undefined) {
      const daysLeft = nextIntentionDoneMilestone - intentionDoneStreak;
      return { text: `✨ 의도 달성 ${intentionDoneStreak}일 연속! ${daysLeft}일 더 달성하면 ${nextIntentionDoneMilestone}일 마일스톤`, level: "success" };
    }
  }

  // 7.423. Pomodoro goal streak milestone approach: effective goal streak is 1–2 days away from the next milestone (7, 14, or 30).
  // effectiveStreak = pomodoroGoalStreak + 1 when today's goal is already met (sessionsToday >= sessionGoal),
  //   otherwise pomodoroGoalStreak (past days only). This mirrors focusStreak semantics — "current streak as if
  //   you complete today's goal" — so the nudge message shows the streak the user has actually earned so far.
  // Fires AFTER intention_done_streak_milestone_approach (7.422): goal attainment requires explicit daily effort
  //   and so fires last among the four-domain approach badges.
  // Fires BEFORE pomodoro_lifetime_milestone (7.43): an imminent streak milestone is a more specific motivational signal.
  // Mutual exclusion with pomodoro_goal_streak_milestone (7.41): when sessionsToday >= sessionGoal AND
  //   pomodoroGoalStreak + 1 hits a MILESTONE value, the milestone badge fires at priority 7.41 and this block
  //   is never reached. When effectiveStreak equals a milestone value, find(m > effectiveStreak && m - effectiveStreak ≤ 2)
  //   returns undefined (next milestone is always ≥ 7 away), so the approach is also structurally suppressed.
  // sessionGoal absent/0 → skipped (no configured goal → goal streak is meaningless). pomodoroGoalStreak absent → skipped.
  if (pomodoroGoalStreak !== undefined && sessionGoal !== undefined && sessionGoal > 0) {
    const effectiveStreak = pomodoroGoalStreak + (sessionsToday >= sessionGoal ? 1 : 0);
    const nextGoalMilestone = POMODORO_GOAL_STREAK_MILESTONES.find(m => m > effectiveStreak && m - effectiveStreak <= 2);
    if (nextGoalMilestone !== undefined) {
      const daysLeft = nextGoalMilestone - effectiveStreak;
      return { text: `🍅 포모도로 목표 ${effectiveStreak}일 연속 달성 중! ${daysLeft}일 더 달성하면 ${nextGoalMilestone}일 마일스톤`, level: "success" };
    }
  }

  // 7.424. Habit streak milestone approach: any habit's streak is 1–2 days away from the next standard milestone (7, 14, or 30).
  // Completes the 4-domain milestone-approach series alongside focus (7.421), intention (7.422), pomodoro goal (7.423).
  // Fires AFTER pomodoro_goal_streak_milestone_approach (7.423): habit streaks require daily manual check-in,
  //   same explicit-effort rationale as intention (7.422) — placed last in the domain series.
  // Fires BEFORE pomodoro_lifetime_milestone (7.43): an imminent per-habit milestone is more time-sensitive than
  //   a cumulative total crossing.
  // Picks the habit with the smallest daysLeft (most imminent); ties broken by highest streak (most invested habit first).
  // No lastChecked guard: fires as a morning nudge even before today's check-in —
  //   the streak reflects PAST consecutive check-in days; today's check-in keeps the streak alive.
  //   Distinct from personal_best (11) which requires streak === bestStreak (new personal record at a standard milestone).
  // milestone_near preemption (priority ~3): when a habit is 1 day from milestone 7 or 30 AND has not yet been
  //   checked today (lastChecked !== todayStr), milestone_near fires first with a "check in now!" framing.
  //   This badge reaches the 1-day case only after today's check-in (lastChecked === todayStr), so the two
  //   badges cover complementary states: milestone_near = "not yet checked / streak at risk", this badge = "already
  //   checked or 2 days away". The milestone_near threshold set is [7,30,100] (PERSONAL_BEST_MILESTONES); this badge
  //   covers [7,14,30] (HABIT_STREAK_MILESTONES), so milestone 14 is only reachable via this block.
  // habits empty → skipped silently.
  {
    const habitApproach = habits.reduce<{ name: string; streak: number; daysLeft: number; next: number } | null>((best, h) => {
      const next = HABIT_STREAK_MILESTONES.find(m => m > h.streak && m - h.streak <= 2);
      if (next === undefined) return best;
      const daysLeft = next - h.streak;
      if (!best || daysLeft < best.daysLeft || (daysLeft === best.daysLeft && h.streak > best.streak)) {
        return { name: h.name, streak: h.streak, daysLeft, next };
      }
      return best;
    }, null);
    if (habitApproach) {
      return { text: `🏃 ${habitApproach.name} ${habitApproach.streak}일 연속 중! ${habitApproach.daysLeft}일 더 유지하면 ${habitApproach.next}일 마일스톤`, level: "success" };
    }
  }

  // 7.43. Pomodoro lifetime milestone: today's sessions crossed a cumulative focus-time threshold.
  // Detects crossing via pomodoroLifetimePrevMins < milestone && pomodoroLifetimeMins >= milestone.
  // "just crossed" semantics: prevMins is the total before today's sessions were added; currentMins
  //   includes them. Any milestone in (prevMins, currentMins] is a new lifetime achievement.
  // Picks the SMALLEST milestone just crossed: find() returns the first match in the ascending
  //   [600, 3000, 6000, 12000] array. In practice only one milestone can be crossed per session
  //   batch (a single pomodoro adds ≤ 60min; skipping from 0 to 12000min is impossible), so this
  //   is always the correct milestone to celebrate.
  // sessionsToday > 0 guard: when the user hasn't focused today, prevMins === currentMins by
  //   construction (no sessions to add), so no crossing is possible. Guard makes intent explicit.
  // Fires AFTER focus_streak_milestone (7.42): a sustained streak signal (days) outweighs a
  //   cumulative-total milestone on the same day — streak continuity is rarer.
  // Fires BEFORE pomodoro_goal_streak (7.45): a lifetime achievement (rare, hours-scale) outweighs
  //   a recurring daily-goal-streak nudge (fires every morning while streak ≥ 2 persists).
  // Both params absent → skipped silently (feature not wired or no lifetime data available).
  if (pomodoroLifetimeMins !== undefined && pomodoroLifetimePrevMins !== undefined && sessionsToday > 0) {
    const hit = POMODORO_LIFETIME_MILESTONES.find(m => pomodoroLifetimePrevMins < m && pomodoroLifetimeMins >= m);
    if (hit != null) {
      const hours = hit / 60;
      return { text: `⏱️ 누적 집중 ${hours}시간 돌파!`, level: "success" };
    }
  }

  // 7.44. Habit lifetime milestone: today's check-ins crossed a cumulative check-in threshold.
  // Detects crossing via habitLifetimePrevCheckins < milestone && habitLifetimeCheckins >= milestone.
  // "just crossed" semantics: prevCheckins is the total BEFORE today's check-ins (computed in App.tsx
  //   as max(0, data.habitLifetimeTotalCheckins - habitsDoneToday)); currentCheckins includes them.
  //   Any milestone in (prevCheckins, currentCheckins] is a new lifetime achievement.
  // Picks the SMALLEST milestone just crossed: find() returns the first match in the ascending
  //   [100, 500, 1000, 5000] array. In practice, crossing two milestones on the same day is
  //   impossible — the gap between adjacent milestones (≥400) far exceeds the realistic daily
  //   check-in ceiling (max_habits × 1 check-in/day ≈ tens); find() is defensive, not load-bearing.
  // Fires AFTER pomodoro_lifetime_milestone (7.43): both are rare lifetime achievements; grouping
  //   them together in the 7.4x range makes the priority structure legible. pomodoro fires first
  //   on the rare day both milestones are crossed simultaneously — focus time is harder to accumulate.
  // Fires BEFORE pomodoro_goal_streak (7.45): a lifetime achievement (rare, check-count-scale)
  //   outweighs a recurring daily-goal-streak nudge (fires every morning while streak ≥ 2 persists).
  // habitLifetimeCheckins > habitLifetimePrevCheckins guard: when no habits were checked today,
  //   prev === current by construction (total - 0 = total), so no crossing is possible.
  //   Guard makes intent explicit and prevents pointless array scan on un-checked days.
  // Both params absent → skipped silently (feature not wired or no lifetime data available).
  if (habitLifetimeCheckins !== undefined && habitLifetimePrevCheckins !== undefined && habitLifetimeCheckins > habitLifetimePrevCheckins) {
    const hit = HABIT_LIFETIME_MILESTONES.find(m => habitLifetimePrevCheckins < m && habitLifetimeCheckins >= m);
    if (hit != null) {
      return { text: `✅ 누적 체크인 ${hit}회 돌파!`, level: "success" };
    }
  }

  // 7.441. Project focus milestone: focused project's lifetime session count crosses 10/25/50/100/200/500.
  // Detects crossing via projectFocusPrevSessions < milestone && projectFocusSessions >= milestone.
  // "just crossed" semantics: prevSessions = max(0, current − sessionsToday) is computed in App.tsx
  //   so that any milestone in (prev, current] was crossed today.
  // sessionsToday > 0 guard: a milestone can only be crossed on a day when at least one session occurred.
  //   When sessionsToday = 0, prev === current by construction and no crossing is possible.
  // Picks the SMALLEST milestone just crossed: find() returns the first match in the ascending array.
  //   Crossing two milestones on the same day (e.g. prev=9 → current=26 crossing both 10 and 25) returns
  //   the lower one (10); the higher one (25) will fire on its own crossing day.
  // Fires AFTER habit_lifetime_milestone (7.44): both celebrate depth of practice; project milestone is
  //   more project-specific and less rare (per-project cap of 500 vs habit total of 5000).
  // Fires BEFORE pomodoro_goal_streak (7.45): a lifetime project milestone outweighs a daily-streak nudge.
  // All three params absent → skipped silently (no focused project or feature not wired).
  if (
    projectFocusSessions !== undefined &&
    projectFocusPrevSessions !== undefined &&
    projectFocusName &&
    sessionsToday > 0
  ) {
    const hit = PROJECT_FOCUS_MILESTONES.find(
      m => (projectFocusPrevSessions as number) < m && (projectFocusSessions as number) >= m
    );
    if (hit != null) {
      return { text: `🎯 ${projectFocusName} ${hit}회 집중 달성!`, level: "success" };
    }
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
  // Strict greater-than (>) ensures ties never trigger (ties are handled by pomodoro_session_best_tie at 7.491).
  if (
    pomodoroSessionBest !== undefined &&
    sessionsToday > pomodoroSessionBest &&
    (sessionGoal == null || sessionGoal === 0 || sessionsToday >= sessionGoal)
  ) {
    return { text: `🍅 오늘 포모도로 신기록! (${sessionsToday}세션)`, level: "success" };
  }

  // 7.491. Pomodoro session best tie: today's count exactly equals the past-day best — one more session
  // would break the all-time daily record. Fires AFTER pomodoro_day_record (7.49): only reached when
  // sessionsToday is not strictly greater than pomodoroSessionBest.
  // sessionsToday > 0 guard: prevents a nonsensical "tied 0-session day" badge.
  // Mirrors day_record's sessionGoal guard: when a goal is set, only fires once the goal is met, to avoid
  //   an early-day distraction before the user reaches their primary target.
  if (
    pomodoroSessionBest !== undefined &&
    sessionsToday === pomodoroSessionBest &&
    sessionsToday > 0 &&
    (sessionGoal == null || sessionGoal === 0 || sessionsToday >= sessionGoal)
  ) {
    return { text: `🍅 역대 최고 타이! 한 세션 더하면 신기록이에요 (${sessionsToday}세션)`, level: "success" };
  }

  // 7.495. Pomodoro week record: current ISO-week total (Mon–today) beats the same-length prev-week window.
  // Fires AFTER pomodoro_day_record (7.49) so a single-day record takes priority over a week-pace record.
  // Fires BEFORE pomodoro_goal_reached (7.5) to show a more celebratory message when both conditions hold.
  // prevWeekTotal > 0 guard: prevents a trivial "record" when last week had no sessions at all.
  // sessionsToday > 0 guard: ensures the badge fires because the user is actively focusing right now, not
  //   from earlier-this-week sessions that already put the week total ahead before today started.
  // pomodoroWeekRecord absent → feature not wired; skipped silently.
  if (
    pomodoroWeekRecord !== undefined &&
    sessionsToday > 0 &&
    pomodoroWeekRecord.currentWeekTotal > pomodoroWeekRecord.prevWeekTotal &&
    pomodoroWeekRecord.prevWeekTotal > 0
  ) {
    return { text: `🍅 이번 주 포모도로 신기록 페이스! (${pomodoroWeekRecord.currentWeekTotal}세션)`, level: "success" };
  }

  // 7.5. Pomodoro goal reached: daily session goal met or exceeded — positive reinforcement.
  // Complements pomodoro_last_one (7): last_one fires when sessionsToday === sessionGoal - 1,
  // goal_reached fires when sessionsToday >= sessionGoal — the two conditions are mutually exclusive.
  // Fires before deadline_soon (8) so goal achievement takes precedence over upcoming deadlines.
  // sessionGoal > 0 guard mirrors the pomodoro_last_one guard; prevents firing on degenerate zero goals.
  if (sessionGoal !== undefined && sessionGoal > 0 && sessionsToday >= sessionGoal) {
    return { text: `🍅 오늘 포모도로 목표 달성! (${sessionsToday}/${sessionGoal})`, level: "success" };
  }

  // 7.6. Momentum near tier: a single available action would push today's momentum score into the next tier.
  // Mirrors calcDailyScore formula inline (habits 0-50pts, pomodoro 0-30pts, intention 0/8/20pts) to compute
  // the current raw score and the gap to the next tier boundary (mid=40, high=75) without adding a param.
  // Three actions are checked in priority order (most meaningful first):
  //   1. Complete intention (if set today, not yet done): +12pts (delta from set=8 to done=20)
  //   2. One pomodoro session (if daily goal not yet met): +30/goalN pts
  //   3. Check one habit (if unchecked habits remain): +50/habitsTotal pts
  // Only fires when one of these actions fully bridges the raw float gap — partial-gap actions are skipped
  //   so the nudge is always achievable with exactly one step.
  // Fires AFTER pomodoro_goal_reached (7.5): when daily goal is already met, that banner takes priority.
  // Fires BEFORE deadline_soon (8): today's tier achievement window is more immediately actionable.
  // Does NOT suggest setting a new intention: intention_missing (priority 5) already handles morning nudge.
  {
    const habitsTodayCount = habits.filter(h => h.lastChecked === todayStr).length;
    const habitsTotal = habits.length;
    const intentionSet = todayIntentionDate === todayStr;
    const intentionDone = todayIntentionDone === true;
    // goalN mirrors calcDailyScore (momentum.ts:63): 3-session baseline when no explicit goal is set,
    // so this block evaluates the same score the Clock badge displays.
    const hasExplicitGoal = sessionGoal != null && sessionGoal > 0;
    const goalN = hasExplicitGoal ? sessionGoal! : 3;

    const habitsScoreRaw = habitsTotal > 0 ? (Math.min(habitsTodayCount, habitsTotal) / habitsTotal) * 50 : 0;
    const pomodoroScoreRaw = (Math.min(sessionsToday, goalN) / goalN) * 30;
    const intentionScoreRaw = intentionDone ? 20 : intentionSet ? 8 : 0;
    const currentScoreRaw = habitsScoreRaw + pomodoroScoreRaw + intentionScoreRaw;
    const currentScore = Math.round(currentScoreRaw);

    const nearMid = currentScore >= 37 && currentScore < 40;
    const nearHigh = currentScore >= 63 && currentScore < 75;

    if (nearMid || nearHigh) {
      const gap = nearMid ? 40 - currentScoreRaw : 75 - currentScoreRaw;
      const tierLabel = nearMid ? "좋은 하루" : "최고의 하루";

      const intentionDoneGain = intentionSet && !intentionDone ? 12 : 0;
      // Intentional asymmetry: pomodoroScoreRaw uses the goalN=3 baseline (matches Clock badge score),
      // but pomodoroGain requires an explicit goal — "집중 1세션" is ambiguous without a target to reference.
      const pomodoroGain = hasExplicitGoal && sessionsToday < goalN ? (1 / goalN) * 30 : 0;
      const habitGain = habitsTotal > 0 && habitsTodayCount < habitsTotal ? (1 / habitsTotal) * 50 : 0;

      if (intentionDoneGain >= gap) {
        return { text: `✨ 오늘 의도를 달성하면 ${tierLabel} 달성!`, level: "success" };
      }
      if (pomodoroGain >= gap) {
        return { text: `⚡ 집중 1세션으로 오늘 ${tierLabel} 달성!`, level: "success" };
      }
      if (habitGain >= gap) {
        return { text: `💪 습관 하나만 더 하면 오늘 ${tierLabel} 달성!`, level: "success" };
      }
    }
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

  // 10.11. Pomodoro goal streak broken: daily session-goal streak (≥3 past days) broke yesterday.
  // pomodoroGoalStreak === 0: yesterday missed → streak reset.
  // prevPomodoroGoalStreak ≥ 3: meaningful streak before the break.
  // sessionGoal > 0 guard: no goal = no streak concept.
  // Mirrors streak_recession (10.1) for pomodoro goals rather than habit check-ins.
  if (
    sessionGoal !== undefined && sessionGoal > 0 &&
    pomodoroGoalStreak === 0 &&
    prevPomodoroGoalStreak !== undefined && prevPomodoroGoalStreak >= 3
  ) {
    return { text: `💔 포모도로 목표 ${prevPomodoroGoalStreak}일 스트릭 끊어짐 — 오늘 다시?`, level: "warning" };
  }

  // 10.2. Habit consecutive miss: a habit not checked in for 3+ consecutive days — re-engagement nudge.
  // Counts backward from yesterday (today excluded — user can still check in).
  // Picks the most neglected habit when multiple qualify.
  const habitMiss = calcHabitConsecutiveMiss(habits, todayStr);
  if (habitMiss) {
    return { text: `🔄 ${habitMiss.name} ${habitMiss.missedDays}일 연속 미완료`, level: "warning" };
  }

  // 10.22. Habit diversity warning: one habit's streak is far below the average streak of all other habits.
  // Requires ≥3 habits for a peer comparison to be meaningful (2 habits → no reliable "outlier" signal).
  // Candidate guard: streak ≥ 1 — habits with streak=0 are already handled by habit_consecutive_miss (10.2);
  //   this block surfaces relative imbalance in habits that are actively maintained but lagging behind peers.
  // Noise floor: avgOthers ≥ 4 — when all habits have very low streaks (e.g. everyone at 1–3d),
  //   the 30%-ratio comparison is not meaningful and would fire too aggressively early in a user's journey.
  // Threshold: streak < avgOthers * 0.3 — the candidate is performing at less than 30% of the peer average.
  //   Example: 운동:1d vs peers avg 12d → 1 < 3.6 → fires. 운동:5d vs peers avg 7.5d → 5 ≥ 2.25 → silent.
  // Picks the most lagging habit by streak-to-avgOthers ratio (ascending) when multiple habits qualify.
  // Fires AFTER habit_consecutive_miss (10.2): a specific missed-days count is more actionable.
  // Fires BEFORE almost_perfect_day (10.3): imbalance awareness takes precedence over near-completion nudge.
  if (habits.length >= 3) {
    const diversityCandidates = habits
      .filter(h => h.streak >= 1)
      .map(h => {
        // Active peers only: exclude streak=0 habits — they are already handled by habit_consecutive_miss
        // and would dilute avgOthers toward 0, causing the noise floor (≥4) to suppress valid badges.
        const activePeers = habits.filter(o => o !== h && o.streak >= 1);
        const avgOthers = activePeers.length > 0
          ? activePeers.reduce((sum, o) => sum + o.streak, 0) / activePeers.length
          : 0;
        return { habit: h, avgOthers };
      })
      .filter(({ habit: h, avgOthers }) => avgOthers >= 4 && h.streak < avgOthers * 0.3)
      // avgOthers is guaranteed ≥ 4 by the filter above; division is safe.
      .sort((a, b) => (a.habit.streak / a.avgOthers) - (b.habit.streak / b.avgOthers));
    const lagging = diversityCandidates[0];
    if (lagging) {
      return {
        text: `⚠️ ${lagging.habit.name} 다른 습관보다 많이 뒤처져 있어요 (${lagging.habit.streak}d vs 평균 ${Math.round(lagging.avgOthers)}d)`,
        level: "warning",
      };
    }
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

  // 10.3289. Week quadrafecta flawless: ALL FOUR core domains (habit + pomodoro + momentum + intention)
  // flawless every day of the current ISO week so far.
  // Fires BEFORE week_trifecta_flawless (10.329): 4-domain perfection outweighs 3-domain. When all four
  //   conditions hold, this badge fires and the trifecta block is never reached.
  // Fires AFTER almost_perfect_day (10.3): an actionable "N habits left today" nudge takes precedence.
  // Four independent conditions must all hold simultaneously (mirrors week_trifecta_flawless guards):
  //   1. Habit: any habit with lastChecked === todayStr AND streak ≥ daysElapsedInWeek.
  //   2. Pomodoro: focusStreak ≥ daysElapsedInWeek AND sessionsToday > 0.
  //   3. Momentum: momentumStreak ≥ daysElapsedInWeek AND today's score ≥ 40.
  //   4. Intention: todayIntentionDone === true AND intentionDoneStreak ≥ daysElapsedInWeek.
  //      todayIntentionDone is an explicit guard (intentionDoneStreak can be positive even when today is
  //      not yet done — same design as intention_week_flawless at 10.3294).
  // Requires ≥ MIN_WEEK_TRIFECTA_DAYS (5) elapsed — mirrors trifecta gate for consistency.
  // Absent focusStreak, momentumStreak, intentionDoneStreak, or daysLeftWeek → silently skipped.
  if (daysLeftWeek != null) {
    const daysElapsedInWeek = 8 - daysLeftWeek;
    if (
      daysElapsedInWeek >= MIN_WEEK_TRIFECTA_DAYS &&
      habits.some(h => h.lastChecked === todayStr && h.streak >= daysElapsedInWeek) &&
      focusStreak != null && focusStreak >= daysElapsedInWeek && sessionsToday > 0 &&
      momentumStreak != null && momentumStreak >= daysElapsedInWeek &&
      (momentumHistory?.find(e => e.date === todayStr)?.score ?? -1) >= 40 &&
      todayIntentionDone === true && intentionDoneStreak != null && intentionDoneStreak >= daysElapsedInWeek
    ) {
      return { text: `🏆 이번 주 습관·의도·집중·모멘텀 모두 개근! (${daysElapsedInWeek}일)`, level: "success" };
    }
  }

  // 10.329. Week trifecta flawless: habit + pomodoro + momentum all flawless for the current ISO week.
  // Fires BEFORE week_balanced (10.33): triple-domain perfection outweighs holistic balance — a flawless
  //   week in all three domains is rarer and more prestigious than a "good-but-not-exceptional" week.
  // Fires AFTER almost_perfect_day (10.3): an actionable "N habits left today" nudge takes precedence.
  // Three independent conditions must all hold simultaneously:
  //   1. Habit: any habit with lastChecked === todayStr AND streak ≥ daysElapsedInWeek (checked every day this week).
  //      `any` mirrors habit_month_flawless (11.07) which also uses a single-habit check. The design intent is
  //      "at least one habit domain is flawless this week", not "every habit". Users with N habits get the badge
  //      when at least one maintains a perfect weekly streak — the same threshold as the monthly counterpart.
  //   2. Pomodoro: focusStreak ≥ daysElapsedInWeek AND sessionsToday > 0 (at least one session every day this week).
  //   3. Momentum: momentumStreak ≥ daysElapsedInWeek AND today's momentum score ≥ 40 (qualifying every day).
  // daysElapsedInWeek = 8 − daysLeftWeek: ISO-week convention (Mon=7 days left → 1 elapsed; Sun=1 left → 7 elapsed).
  // Requires ≥ MIN_WEEK_TRIFECTA_DAYS (5) elapsed — Fri, Sat, or Sun — to avoid premature celebration.
  //   A "5-day flawless week" on Monday is trivial; 5+ days of sustained perfection is genuinely rare.
  // Absent focusStreak, momentumStreak, or daysLeftWeek → silently skipped (feature not wired by caller).
  if (daysLeftWeek != null) {
    const daysElapsedInWeek = 8 - daysLeftWeek;
    if (
      daysElapsedInWeek >= MIN_WEEK_TRIFECTA_DAYS &&
      habits.some(h => h.lastChecked === todayStr && h.streak >= daysElapsedInWeek) &&
      focusStreak != null && focusStreak >= daysElapsedInWeek && sessionsToday > 0 &&
      momentumStreak != null && momentumStreak >= daysElapsedInWeek &&
      (momentumHistory?.find(e => e.date === todayStr)?.score ?? -1) >= 40
    ) {
      return { text: `🌟 이번 주 습관·집중·모멘텀 모두 개근! (${daysElapsedInWeek}일)`, level: "success" };
    }
  }

  // 10.3291–10.3293. Individual week flawless badges: habit / pomodoro / momentum.
  // Fire AFTER week_trifecta_flawless (10.329): triple-domain perfection outweighs single-domain.
  // Fire BEFORE week_balanced (10.33): a flawless domain week preempts a balanced-week signal.
  // All require ≥ MIN_WEEK_TRIFECTA_DAYS (5) elapsed days in the ISO week — mirrors trifecta gate.
  // Absent daysLeftWeek → silently skipped (feature not wired by caller).
  if (daysLeftWeek != null) {
    const daysElapsedInWeek = 8 - daysLeftWeek;
    if (daysElapsedInWeek >= MIN_WEEK_TRIFECTA_DAYS) {
      // 10.3291. Habit week flawless: at least one habit checked every day of the ISO week so far.
      // streak ≥ daysElapsedInWeek AND lastChecked === todayStr guarantees no day was missed.
      // Picks the habit with the highest streak when multiple qualify — longest run earns the badge.
      if (habits.length > 0) {
        const weekFlawless = habits
          .filter(h => h.lastChecked === todayStr && h.streak >= daysElapsedInWeek)
          .sort((a, b) => b.streak - a.streak)[0];
        if (weekFlawless) {
          return { text: `🗓️ ${weekFlawless.name} 이번 주 개근! (${daysElapsedInWeek}일)`, level: "success" };
        }
      }

      // 10.3292. Pomodoro week flawless: at least one focus session every day of the ISO week so far.
      // focusStreak ≥ daysElapsedInWeek AND sessionsToday > 0 — same invariants as pomodoro_month_flawless.
      // Absent focusStreak → silently skipped.
      if (focusStreak != null && focusStreak >= daysElapsedInWeek && sessionsToday > 0) {
        return { text: `🍅 이번 주 매일 집중! (${daysElapsedInWeek}일)`, level: "success" };
      }

      // 10.3293. Momentum week flawless: every day of the ISO week so far had a momentum score ≥ 40.
      // momentumStreak ≥ daysElapsedInWeek AND today's score ≥ 40 — same invariants as momentum_month_flawless.
      // Absent momentumStreak → silently skipped.
      // NOTE: Inline score check mirrors week_trifecta_flawless (see priority 10.329 above). The const
      //   todayMomentumQualifies is declared in the momentum_streak_milestone block further below and is not
      //   in scope here — do not hoist it without verifying all intermediate badges still compile.
      if (
        momentumStreak != null && momentumStreak >= daysElapsedInWeek &&
        (momentumHistory?.find(e => e.date === todayStr)?.score ?? -1) >= 40
      ) {
        return { text: `⚡ 이번 주 매일 모멘텀 달성! (${daysElapsedInWeek}일)`, level: "success" };
      }

      // 10.3294. Intention week flawless: intention was set AND marked done every day of the ISO week so far.
      // intentionDoneStreak ≥ daysElapsedInWeek covers all days of the week; todayIntentionDone === true
      //   is an explicit guard because intentionDoneStreak can be positive (counting past done days) even
      //   when today's intention is not done — the explicit guard prevents a false positive.
      // Absent intentionDoneStreak → silently skipped. Absent/false todayIntentionDone → silently skipped.
      if (todayIntentionDone === true && intentionDoneStreak != null && intentionDoneStreak >= daysElapsedInWeek) {
        return { text: `✨ 이번 주 매일 의도 달성! (${daysElapsedInWeek}일)`, level: "success" };
      }
    }
  }

  // 10.33. Week balanced: all three core domains had a good-but-not-exceptional week simultaneously —
  //   habitWeekRate ∈ [70, 90), intentionWeekDoneRate ∈ [70, 100), momentumWeekAvg7d ∈ [40, 65).
  // Fires BEFORE individual domain week badges (10.34+): a cross-domain signal surfaces when no
  //   single domain dominates — it is the unique signal of holistic balance.
  // Upper-bound guards prevent preempting individual excellence badges:
  //   habitWeekRate < 90  → lets habit_week_excellent (10.35) fire when habits were exceptional.
  //   habitWeekRate < 90  → lets habit_week_perfect (10.34) fire at 100%.
  //   intentionWeekDoneRate < 100 → lets intention_week_perfect (10.371) fire at 100%.
  //   momentumWeekAvg7d < 65 → lets momentum_week_strong (10.38) fire when avg ≥ 65, and
  //     lets momentum_week_excellent (10.3801) fire when avg ∈ [50, 65) (week_balanced fires at 10.33
  //     so momentum_week_excellent only fires when this badge is not triggered).
  // Fires AFTER almost_perfect_day (10.3): an actionable "N habits left today" nudge takes precedence
  //   over any weekly summary because it is directly actionable right now.
  // Thresholds: 70/70/40 represent "good but not perfect" lower bars — users who clear all three
  //   simultaneously have maintained genuine life balance across habits, intentions, and momentum.
  // All three params must be defined: absent data (e.g. intentionWeekDoneRate undefined when setCount < 3)
  //   means the domain wasn't tracked sufficiently; the cross-domain claim would be misleading.
  if (
    habitWeekRate !== undefined && habitWeekRate >= 70 && habitWeekRate < 90 &&
    intentionWeekDoneRate !== undefined && intentionWeekDoneRate >= 70 && intentionWeekDoneRate < 100 &&
    momentumWeekAvg7d !== undefined && momentumWeekAvg7d >= 40 && momentumWeekAvg7d < 65
  ) {
    return { text: `✨ 이번 주 습관·의도·모멘텀 균형 달성!`, level: "success" };
  }

  // 10.34. Habit week perfect: 7-day completion rate is exactly 100% (every habit done every day this week).
  // Fires AFTER week_balanced (10.33): the cross-domain badge preempts single-domain perfection when
  //   all three domains are balanced; when any domain falls short week_balanced doesn't fire so this runs.
  // Fires BEFORE habit_week_excellent (10.35): a perfect 100% record deserves a distinct celebration above
  //   the ≥90% excellent badge — separating them prevents the milestone from feeling ordinary.
  // No nowHour gate — a perfect week is an unconditional achievement, appropriate any time of day.
  // habitWeekRate absent → skipped silently (insufficient history).
  if (habitWeekRate === 100) {
    return { text: `🏆 완벽한 한 주! 7일 습관 완료율 100% 달성`, level: "success" };
  }

  // 10.35. Habit week excellent: 7-day completion rate is ≥ 90% but < 100%.
  // Fires AFTER habit_week_perfect (10.34): 100% is handled above; this block covers the 90–99% range.
  // Fires BEFORE pomodoro_today_above_avg (10.45): a sustained weekly habit pattern outweighs a single-day pomodoro boost.
  // Threshold 90%: requires high sustained completion across the full 7-day window to avoid noise.
  //   80% threshold fires on too many ordinary weeks; 90% (≈6.3/7 days) signals genuine consistency.
  // No nowHour gate — this is a positive reinforcement badge with no urgency, suitable any time of day.
  // habitWeekRate absent → skipped silently (insufficient history).
  if (habitWeekRate !== undefined && habitWeekRate >= 90 && habitWeekRate < 100) {
    return { text: `🌟 이번 주 습관 완료율 ${habitWeekRate}%! 지속력이 빛나요`, level: "success" };
  }

  // 10.351. Habit week maintained: 7-day completion rate ∈ [70, 90).
  // Fires as a mid-tier positive badge when the week averaged well above the basic activity bar
  //   but hasn't crossed the excellent threshold (90%).
  // Threshold 70: practical lower bound — completing ≥70% of habits (~4–5/7 days) represents
  //   sustained effort and earns a positive signal without over-rewarding occasional dips.
  // Threshold 90: lower boundary of habit_week_excellent (10.35) — maintained fires when rate is
  //   decent but not clearly "excellent", mirroring how momentum_week_maintained (10.3802) works.
  // Fires AFTER habit_week_excellent (10.35): rate ≥ 90 always preempts via early return above.
  // Fires BEFORE habit_week_improved (10.36): absolute-level signal outweighs relative-delta signal,
  //   mirroring how habit_week_excellent (10.35) preempts habit_week_improved (10.36).
  // Preempts habit_week_declined (10.37): a week completing 70–89% is not a "bad" week even if
  //   it represents a drop from a previous high — the absolute level takes precedence.
  // habitWeekRate absent → skipped silently (insufficient history).
  if (habitWeekRate !== undefined && habitWeekRate >= 70 && habitWeekRate < 90) {
    return { text: `📊 이번 주 습관 완료율 ${habitWeekRate}% 유지! 꾸준한 실천이에요`, level: "success" };
  }

  // 10.36. Habit week improved: weekly completion rate rose ≥ 10pp vs the previous 7-day window.
  // Fires AFTER habit_week_maintained (10.351): when habitWeekRate ∈ [70,90) maintained already fired,
  //   and when habitWeekRate ≥ 90 the excellent badge (10.35) already fired — so this block is only
  //   reached when habitWeekRate < 70 (no explicit < 70 guard needed; early returns above cover it).
  // Fires BEFORE habit_week_declined (10.37): improvement and decline are mutually exclusive (rate can't
  //   simultaneously be higher and lower than prevRate by ≥ 10pp), so no overlap risk.
  // Threshold ≥ 10pp: symmetric with habit_week_declined to avoid noise from small fluctuations.
  // habitPrevWeekRate absent → skipped silently (no comparison baseline available).
  if (
    habitWeekRate !== undefined &&
    habitPrevWeekRate !== undefined &&
    habitWeekRate - habitPrevWeekRate >= 10
  ) {
    const rise = Math.round(habitWeekRate - habitPrevWeekRate);
    return { text: `📈 이번 주 습관 완료율 ${habitWeekRate}%! 지난 주보다 ${rise}%p 올랐어요`, level: "success" };
  }

  // 10.37. Habit week declined: weekly completion rate dropped ≥ 10pp vs the previous 7-day window.
  // Fires AFTER habit_week_improved (10.36): improvement and decline are mutually exclusive.
  // Fires BEFORE pomodoro_today_above_avg (10.45): a week-long habit regression is a more persistent
  //   signal than a single-day focus achievement.
  // Threshold ≥ 10pp: chosen to avoid noise from small fluctuations; a 10-point weekly drop is a clear regression signal.
  // habitPrevWeekRate absent → skipped silently (no comparison baseline available).
  if (
    habitWeekRate !== undefined &&
    habitPrevWeekRate !== undefined &&
    habitPrevWeekRate - habitWeekRate >= 10
  ) {
    const drop = Math.round(habitPrevWeekRate - habitWeekRate);
    return { text: `📉 이번 주 습관 완료율 ${habitWeekRate}%! 지난 주보다 ${drop}%p 낮아요`, level: "warning" };
  }

  // 10.371. Intention week perfect: all set intentions were accomplished in the last 7 days (done rate = 100%).
  // Fires AFTER habit_week_declined (10.37): habit patterns are more mechanical signals and checked first.
  // Fires BEFORE intention_week_excellent (10.372): perfect rate preempts the "훌륭" bucket.
  // setCount ≥ 3 guard baked into App.tsx computation: rate is absent when fewer than 3 intentions were set.
  // intentionWeekDoneRate absent → skipped silently (insufficient history).
  if (intentionWeekDoneRate !== undefined && intentionWeekDoneRate === 100) {
    return { text: "✅ 이번 주 의도 달성 100%! 완벽한 실행력이에요", level: "success" };
  }

  // 10.372. Intention week excellent: done rate 70–99% (strong but not perfect execution this week).
  // Fires AFTER intention_week_perfect (10.371): perfect rate fires first when doneRate === 100.
  //   Explicit `< 100` guard mirrors habit_week_excellent (10.35) for consistency and guards against
  //   a silent regression if the perfect block's condition ever changes.
  // Threshold 70 mirrors calcWeeklyIntentionReport's "훌륭한 실천" category for consistency.
  // intentionWeekDoneRate absent → skipped silently.
  if (intentionWeekDoneRate !== undefined && intentionWeekDoneRate >= 70 && intentionWeekDoneRate < 100) {
    return { text: `✅ 이번 주 의도 달성률 ${intentionWeekDoneRate}%! 훌륭한 실천이에요`, level: "success" };
  }

  // 10.3725. Intention week maintained: done rate ∈ [50, 70) — decent activity that doesn't reach excellent (70%).
  // Fires AFTER intention_week_excellent (10.372): excellent fires first when doneRate ≥ 70.
  // Fires BEFORE intention_week_improved (10.373): absolute mid-tier performance outweighs relative delta signal,
  //   mirroring how habit_week_maintained (10.351) preempts habit_week_improved (10.36).
  // Preempts intention_week_declined (10.374): a week doing 50–69% of set intentions is a stable effort signal,
  //   not a regression — the absolute level takes precedence over a comparison drop.
  // Threshold 50: below 50% done rate for a week lacks meaningful consistency and is not surfaced as "maintained".
  // intentionWeekDoneRate absent → skipped silently (insufficient data or setCount < 3).
  if (intentionWeekDoneRate !== undefined && intentionWeekDoneRate >= 50 && intentionWeekDoneRate < 70) {
    return { text: `✅ 이번 주 의도 달성률 ${intentionWeekDoneRate}%! 꾸준한 실천이에요`, level: "success" };
  }

  // 10.373. Intention week improved: done rate rose ≥ 10pp vs the previous 7-day window.
  // Fires AFTER intention_week_maintained (10.3725): maintained fires first when doneRate ∈ [50, 70),
  //   so this block is only reached when the current rate is below 50 — no explicit guard needed.
  // Fires BEFORE intention_week_declined (10.374): improvement and decline are mutually exclusive.
  // Threshold ≥ 10pp mirrors habit_week_improved — avoids noise from small fluctuations.
  // intentionPrevWeekDoneRate absent → skipped silently (no comparison baseline available).
  if (
    intentionWeekDoneRate !== undefined &&
    intentionPrevWeekDoneRate !== undefined &&
    intentionWeekDoneRate - intentionPrevWeekDoneRate >= 10
  ) {
    const rise = Math.round(intentionWeekDoneRate - intentionPrevWeekDoneRate);
    return { text: `📈 의도 달성률이 지난 주보다 ${rise}%p 올랐어요 (${intentionWeekDoneRate}%)`, level: "success" };
  }

  // 10.374. Intention week declined: done rate dropped ≥ 10pp vs the previous 7-day window.
  // Fires AFTER intention_week_improved (10.373): improvement and decline are mutually exclusive.
  // Fires BEFORE momentum_week_strong (10.38): intention execution pattern checked before momentum aggregate.
  // Threshold ≥ 10pp mirrors habit_week_declined — avoids noise from small fluctuations.
  // intentionPrevWeekDoneRate absent → skipped silently (no comparison baseline available).
  if (
    intentionWeekDoneRate !== undefined &&
    intentionPrevWeekDoneRate !== undefined &&
    intentionPrevWeekDoneRate - intentionWeekDoneRate >= 10
  ) {
    const drop = Math.round(intentionPrevWeekDoneRate - intentionWeekDoneRate);
    return { text: `📉 의도 달성률이 지난 주보다 ${drop}%p 낮아요 (${intentionWeekDoneRate}%)`, level: "warning" };
  }

  // 10.38. Momentum week strong: rolling 7-day average momentum score is ≥ 65 (high tier threshold).
  // Fires as a sustained high-performance badge — the weekly average maintained the high tier all week.
  // Threshold 65 mirrors the "high" tier lower boundary used in calcDailyScore tier assignment.
  // Fires AFTER intention_week_declined (10.374): intention execution pattern checked first.
  // Fires BEFORE momentum_week_improved (10.381): a week averaging high-tier outweighs any delta signal.
  // momentumWeekAvg7d absent → skipped silently (< 2 history entries in the window).
  if (momentumWeekAvg7d !== undefined && momentumWeekAvg7d >= 65) {
    return { text: `⚡ 이번 주 모멘텀 평균 ${momentumWeekAvg7d}점! 최고의 한 주예요`, level: "success" };
  }

  // 10.3801. Momentum week excellent: rolling 7-day average momentum score is ≥ 50 but < 65.
  // Fires as a sustained mid-tier positive badge when the week averaged well above the qualifying bar
  //   (≥ 40) but hasn't crossed the high-tier threshold (65).
  // Threshold 50: midpoint of the "mid" tier [40, 65) — ensures the badge rewards consistent effort
  //   above the basic qualifying threshold without conflating "decent" (40–49) with "good" (50–64).
  // Fires AFTER momentum_week_strong (10.38): avg ≥ 65 always preempts via early return above.
  // Fires BEFORE momentum_week_improved (10.381): absolute mid-tier performance outweighs relative
  //   delta signal, analogous to habit_week_excellent (10.35) preempting habit_week_improved (10.36).
  // Preempts momentum_week_declined (10.382): a week averaging 50–64 is not a "bad" week even if
  //   it represents a decline from a previous high — the absolute level takes precedence.
  // momentumWeekAvg7d absent → skipped silently (< 2 history entries in the window).
  if (momentumWeekAvg7d !== undefined && momentumWeekAvg7d >= 50 && momentumWeekAvg7d < 65) {
    return { text: `⚡ 이번 주 모멘텀 평균 ${momentumWeekAvg7d}점! 꾸준한 한 주예요`, level: "success" };
  }

  // 10.3802. Momentum week maintained: rolling 7-day average momentum score ∈ [40, 50).
  // Fires as a low-mid-tier positive badge when the week averaged at the qualifying bar (≥ 40)
  //   but hasn't crossed the excellent threshold (50).
  // Threshold 40: "mid" tier lower boundary — reaching 40 means the user qualified above "low" all week.
  // Threshold 50: lower boundary of momentum_week_excellent (10.3801) — maintained fires when avg is
  //   decent but not clearly "excellent", giving the user a positive signal without over-rewarding.
  // Fires AFTER momentum_week_excellent (10.3801): avg ≥ 50 always preempts via early return above.
  // Fires BEFORE momentum_week_improved (10.381): absolute-level signal outweighs relative-delta signal,
  //   mirroring how excellent (10.3801) preempts improved (10.381).
  // Preempts momentum_week_declined (10.382): a week averaging 40–49 is not a "bad" week even if
  //   it represents a drop from a previous high — the absolute level takes precedence.
  // momentumWeekAvg7d absent → skipped silently (< 2 history entries in the window).
  if (momentumWeekAvg7d !== undefined && momentumWeekAvg7d >= 40 && momentumWeekAvg7d < 50) {
    return { text: `⚡ 이번 주 모멘텀 평균 ${momentumWeekAvg7d}점 유지! 꾸준한 흐름이에요`, level: "success" };
  }

  // 10.381. Momentum week improved: 7-day average rose ≥ 10 points vs the previous 7-day window.
  // Fires AFTER momentum_week_excellent (10.3801): when avg7d ≥ 50 the excellent badge already fired,
  //   so we only reach 10.381 when the current avg is below 50.
  // Fires BEFORE momentum_week_declined (10.382): improvement and decline are mutually exclusive
  //   (avg7d can't simultaneously be > prevAvg7d by ≥10 AND < prevAvg7d by ≥10).
  // Threshold ≥ 10 mirrors habit_week_improved (10.36) — avoids noise from minor weekly fluctuations.
  // momentumPrevWeekAvg7d absent → skipped silently (no comparison baseline available).
  if (
    momentumWeekAvg7d !== undefined &&
    momentumPrevWeekAvg7d !== undefined &&
    momentumWeekAvg7d - momentumPrevWeekAvg7d >= 10
  ) {
    const rise = Math.round(momentumWeekAvg7d - momentumPrevWeekAvg7d);
    return { text: `📈 이번 주 모멘텀 평균 ${momentumWeekAvg7d}점! 지난 주보다 ${rise}점 올랐어요`, level: "success" };
  }

  // 10.382. Momentum week declined: 7-day average dropped ≥ 10 points vs the previous 7-day window.
  // Fires AFTER momentum_week_improved (10.381): improvement and decline are mutually exclusive.
  // Fires BEFORE momentum_recovery (10.39): a week-long regression is a more persistent signal
  //   than a single-day recovery bounce — weekly context takes priority over daily event.
  // Threshold ≥ 10 mirrors habit_week_declined (10.37) — avoids noise from small fluctuations.
  // momentumPrevWeekAvg7d absent → skipped silently (no comparison baseline available).
  if (
    momentumWeekAvg7d !== undefined &&
    momentumPrevWeekAvg7d !== undefined &&
    momentumPrevWeekAvg7d - momentumWeekAvg7d >= 10
  ) {
    const drop = Math.round(momentumPrevWeekAvg7d - momentumWeekAvg7d);
    return { text: `📉 이번 주 모멘텀 평균 ${momentumWeekAvg7d}점! 지난 주보다 ${drop}점 낮아요`, level: "warning" };
  }

  // 10.3821. Pomodoro week goal perfect: daily session goal was met on all 7 days of the rolling window.
  // Absolute performance signal — analogous to habit_week_perfect (10.34) and intention_week_perfect (10.371).
  // Fires BEFORE pomodoro_week_improved (10.383): an absolute 7/7 achievement outweighs a comparative delta.
  // Fires AFTER momentum_week_declined (10.382): a week-long momentum regression is a more persistent concern.
  // Distinct from pomodoro_goal_streak_milestone (6.67): that badge fires when a consecutive run of
  //   goal-met days hits a 7/14/30 milestone (higher priority, one-time celebration);
  //   this badge fires whenever the rolling 7-day window shows all 7 goal-met days (persistent signal).
  // pomodoroWeekGoalDays absent → skipped silently (sessionGoal not set or computation not available).
  if (pomodoroWeekGoalDays === 7) {
    return { text: `🏆 이번 주 매일 포모도로 목표 달성! (7/7일)`, level: "success" };
  }

  // 10.3822. Pomodoro week goal excellent: 5 or 6 of the rolling 7 days met the session goal.
  // Threshold 5–6 mirrors the philosophy of habit_week_excellent: recognizes consistent effort
  //   short of a perfect week; provides positive reinforcement for near-perfect performance.
  // (habit_week_excellent uses a rate threshold; this uses absolute goal-days — the domain differs.)
  // Fires AFTER pomodoro_week_goal_perfect (10.3821): 7/7 preempts; checked in descending order.
  // Fires BEFORE pomodoro_week_improved (10.383): absolute goal achievement outweighs delta signals.
  // pomodoroWeekGoalDays absent → skipped silently.
  if (pomodoroWeekGoalDays !== undefined && pomodoroWeekGoalDays >= 5 && pomodoroWeekGoalDays <= 6) {
    return { text: `⭐ 이번 주 포모도로 목표 ${pomodoroWeekGoalDays}/7일 달성! 꾸준한 집중력이에요`, level: "success" };
  }

  // 10.38225. Pomodoro week goal maintained: 3 or 4 of the rolling 7 days met the session goal.
  // Threshold 3–4: mid-tier absolute level — completing 3–4/7 days shows sustained engagement
  //   without reaching the "excellent" bar (≥5). Mirrors how habit_week_maintained (10.351)
  //   covers 70–89% as a mid-tier recognition that preempts relative-delta signals.
  // Fires AFTER pomodoro_week_goal_excellent (10.3822): current ≥ 5 already returned above.
  // Fires BEFORE pomodoro_week_goal_improved (10.3823): absolute sustained effort outweighs
  //   relative-delta signal — a 3–4/7 week is recognized on its own terms regardless of trend.
  // Preempts pomodoro_week_goal_declined (10.3824): a week with 3–4 goal days is not a "bad"
  //   week even if it represents a drop from a high. Absolute level takes precedence.
  // pomodoroWeekGoalDays absent → skipped silently.
  if (pomodoroWeekGoalDays !== undefined && pomodoroWeekGoalDays >= 3 && pomodoroWeekGoalDays <= 4) {
    return { text: `📊 이번 주 포모도로 목표 ${pomodoroWeekGoalDays}/7일 유지! 꾸준한 집중이에요`, level: "success" };
  }

  // 10.3823. Pomodoro week goal improved: goal-met days rose ≥ 2 vs the previous 7-day window.
  // Threshold ≥ 2 days: a meaningful shift within the 0–7 range; symmetric with pomodoro_week_goal_declined (10.3824).
  // Fires AFTER pomodoro_week_goal_maintained (10.38225): when current ≥ 3, excellent/maintained already returned,
  //   so this block only reached when current < 3 — no explicit guard needed.
  // Fires BEFORE pomodoro_week_goal_declined (10.3824): improved and declined are mutually exclusive
  //   (goal days can't simultaneously rise ≥2 AND drop ≥2).
  // Fires BEFORE pomodoro_week_improved (10.383): goal-day achievement trend checked before raw session delta.
  // pomodoroWeekPrevGoalDays absent → skipped silently (sessionGoal not set or computation not available).
  if (pomodoroWeekGoalDays !== undefined && pomodoroWeekPrevGoalDays !== undefined) {
    const goalDayRise = pomodoroWeekGoalDays - pomodoroWeekPrevGoalDays;
    if (goalDayRise >= 2) {
      return { text: `🎯 이번 주 목표 달성 ${pomodoroWeekGoalDays}/7일! 지난 주보다 ${goalDayRise}일 더 달성했어요`, level: "success" };
    }
  }

  // 10.3824. Pomodoro week goal declined: goal-met days dropped ≥ 2 vs the previous 7-day window.
  // Threshold ≥ 2 days: mirrors pomodoro_week_goal_improved — avoids noise from single-day fluctuations.
  // Fires AFTER pomodoro_week_goal_improved (10.3823): mutually exclusive; improved takes priority when rise ≥2.
  // Fires BEFORE pomodoro_week_improved (10.383): goal-day regression checked before session count comparison.
  // pomodoroWeekPrevGoalDays absent → skipped silently.
  if (pomodoroWeekGoalDays !== undefined && pomodoroWeekPrevGoalDays !== undefined) {
    const goalDayDrop = pomodoroWeekPrevGoalDays - pomodoroWeekGoalDays;
    if (goalDayDrop >= 2) {
      return { text: `📉 이번 주 목표 달성 ${pomodoroWeekGoalDays}/7일. 지난 주보다 ${goalDayDrop}일 적어요`, level: "warning" };
    }
  }

  // 10.383. Pomodoro week improved: rolling 7-day session total rose ≥ 3 vs the previous 7-day window.
  // Threshold ≥ 3 sessions: 1 session ≈ 25 min focus, so 3 sessions ≈ 75 min — a meaningful improvement.
  // pomodoroPrevWeekSessions ≥ 1 guard: prevents trivial "records" when previous week had zero sessions.
  // Fires AFTER pomodoro_week_goal_declined (10.3824): goal-day trend checked before raw session delta.
  // Fires BEFORE pomodoro_week_declined (10.384): improvement and decline are mutually exclusive
  //   (sessions can't simultaneously be > prev by ≥3 AND < prev by ≥3).
  // Absent params → skipped silently.
  if (
    pomodoroWeekSessions !== undefined &&
    pomodoroPrevWeekSessions !== undefined &&
    pomodoroPrevWeekSessions >= 1 &&
    pomodoroWeekSessions - pomodoroPrevWeekSessions >= 3
  ) {
    const rise = pomodoroWeekSessions - pomodoroPrevWeekSessions;
    return { text: `📈 이번 주 포모도로 ${pomodoroWeekSessions}세션! 지난 주보다 ${rise}세션 더 집중했어요`, level: "success" };
  }

  // 10.384. Pomodoro week declined: rolling 7-day session total dropped ≥ 3 vs the previous 7-day window.
  // Threshold ≥ 3 mirrors pomodoro_week_improved — avoids noise from minor fluctuations.
  // Fires AFTER pomodoro_week_improved (10.383): improvement and decline are mutually exclusive.
  // Fires BEFORE momentum_recovery (10.39): a week-long focus regression is a more persistent signal
  //   than a single-day momentum bounce — weekly context takes priority over daily event.
  // Absent params → skipped silently.
  if (
    pomodoroWeekSessions !== undefined &&
    pomodoroPrevWeekSessions !== undefined &&
    pomodoroPrevWeekSessions - pomodoroWeekSessions >= 3
  ) {
    const drop = pomodoroPrevWeekSessions - pomodoroWeekSessions;
    return { text: `📉 이번 주 포모도로 ${pomodoroWeekSessions}세션. 지난 주보다 ${drop}세션 줄었어요`, level: "warning" };
  }

  // 10.39. Momentum recovery: today's recorded score returns to ≥40 (Good Day tier) after 2 consecutive days below it.
  // Fires as a positive re-engagement badge — "you're back after a 2-day slump".
  // Uses recorded scores from momentumHistory (not the live running score) for consistency with momentum_streak_milestone.
  // These are independent values: momentum_near_tier uses the live computed score while this badge uses the persisted history.
  // Requires today's, yesterday's, AND 2-days-ago scores all present in momentumHistory; any gap → silently skipped.
  // Fires AFTER pomodoro_week_declined (10.384): a week-long focus regression takes priority over a single-day momentum bounce.
  // Fires BEFORE pomodoro_today_above_avg (10.45): a multi-day momentum recovery outweighs a single exceptional focus day.
  if (momentumHistory && momentumHistory.length >= 3) {
    const scoreMap = new Map<string, number>(momentumHistory.map(e => [e.date, e.score]));
    const [yr, mo, day] = todayStr.split("-").map(Number);
    const getScore = (daysBack: number): number | undefined => {
      const d = new Date(yr, mo - 1, day - daysBack);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return scoreMap.get(key);
    };
    const todayScore = getScore(0);
    const yesterdayScore = getScore(1);
    const twoDaysAgoScore = getScore(2);
    if (
      todayScore !== undefined && todayScore >= 40 &&
      yesterdayScore !== undefined && yesterdayScore < 40 &&
      twoDaysAgoScore !== undefined && twoDaysAgoScore < 40
    ) {
      return { text: "💪 2일간의 침체를 딛고 모멘텀 회복!", level: "success" };
    }
  }

  // currentMonthDay: calendar day number for today (1–31); computed once and reused by
  //   month_balanced (10.395), habit_month_perfect (10.40), habit_month_excellent (10.41),
  //   and momentum_month_improved (10.4401).
  const currentMonthDay = parseInt(todayStr.slice(8, 10), 10);

  // 10.395. Month balanced: all 3 domains (habit, intention, momentum) are "decent but not exceptional" this month.
  // Habit ∈ [70, 90): good monthly completion rate without reaching habit_month_excellent/perfect territory.
  //   The streak-based badges (10.40–10.41) check lastChecked + streak, not habitMonthRate; so this is an
  //   independent signal using the rate-based monthly aggregation.
  // Intention ∈ [70, 100): decent intention achievement; strict upper bound (< 100) so that 100% intention
  //   promotes to intention_month_perfect (10.42) rather than silently merging into a "balance" message.
  //   NOTE: intentionMonthDoneRate ∈ [80, 99] overlaps with intention_month_excellent (10.43) range [80,99].
  //   month_balanced fires first (10.395 < 10.43) — cross-domain balance preempts single-domain excellence.
  //   This mirrors week_balanced (10.33) which similarly preempts intention_week_excellent.
  // Momentum month avg ∈ [40, 65): Good tier; ≥ 65 triggers momentum_month_strong (10.44) instead.
  // Guard: currentMonthDay ≥ 14 (mirrors all monthly badges) AND ≥ MIN_MONTH_MOMENTUM_ENTRIES (14) momentum
  //   entries in the current calendar month.
  // monthPrefix = todayStr.slice(0, 7) ("YYYY-MM") filters momentumHistory to the current month.
  // Fires AFTER momentum_recovery (10.39): a single-day recovery bounce takes priority over this monthly pattern.
  // Fires BEFORE habit_month_perfect (10.40): cross-domain balance signal preempts single-domain perfection.
  // Fires BEFORE intention_month_excellent (10.43): cross-domain balance preempts single-domain excellence.
  // Symmetric counterpart of week_balanced (10.33): recognises well-rounded months the way week_balanced does for weeks.
  if (
    currentMonthDay >= 14 &&
    habitMonthRate !== undefined && habitMonthRate >= 70 && habitMonthRate < 90 &&
    intentionMonthDoneRate !== undefined && intentionMonthDoneRate >= 70 && intentionMonthDoneRate < 100 &&
    momentumHistory !== undefined
  ) {
    const monthPrefix = todayStr.slice(0, 7);
    const monthEntries = momentumHistory.filter(e => e.date.startsWith(monthPrefix));
    if (monthEntries.length >= MIN_MONTH_MOMENTUM_ENTRIES) {
      const monthAvg = Math.round(monthEntries.reduce((s, e) => s + e.score, 0) / monthEntries.length);
      if (monthAvg >= 40 && monthAvg < 65) {
        return {
          text: `📊 이번 달 습관 ${habitMonthRate}% · 의도 ${intentionMonthDoneRate}% · 모멘텀 ${monthAvg}점 — 균형 잡힌 한 달!`,
          level: "success",
        };
      }
    }
  }

  // 10.40. Habit month perfect: ALL habits (≥ 2) checked every day of the current calendar month so far.
  // Uses streak-based detection (same approach as habit_month_flawless at 11.07):
  //   streak >= currentMonthDay AND lastChecked === todayStr guarantees every day 1–today is covered,
  //   even when checkHistory is capped at 14 entries (streak is maintained independently).
  // Requires habits.length ≥ 2: the single-habit case is already covered by habit_month_flawless (11.07).
  //   A user with one perfect habit gets the flawless badge; "perfect month" requires multi-habit commitment.
  // Requires ≥ 14 days into the month to avoid early-month noise (e.g. Jan 3 "개근" is too fragile).
  // Fires AFTER the weekly habit cluster (habit_week_perfect 10.34 → habit_week_declined 10.37):
  //   the week badge is fresher; the month badge fires when no weekly signal preempts.
  // Fires BEFORE habit_month_excellent (10.41): all-habits-perfect > some-habits-perfect.
  // Fires BEFORE habit_month_flawless (11.07): all-habits-perfect > any-single-habit-perfect.
  if (currentMonthDay >= 14 && habits.length >= 2) {
    const allPerfectMonth = habits.every(h => h.lastChecked === todayStr && h.streak >= currentMonthDay);
    if (allPerfectMonth) {
      return { text: `🗓️ 이번 달 전 습관 개근 중! (${currentMonthDay}일)`, level: "success" };
    }
  }

  // 10.41. Habit month excellent: ≥ 2 habits are each flawless this month (streak >= currentMonthDay
  //   AND lastChecked === todayStr), but NOT all (habit_month_perfect already handles that above).
  // Threshold = 2 flawless habits: avoids firing when only 1/N habits kept up (covered by habit_month_flawless).
  //   With 2 out of N habits on a perfect-month streak, celebrating multi-habit consistency is meaningful.
  // Requires habits.length ≥ 3 implicitly: 2 flawless + at least 1 non-flawless (otherwise all-flawless
  //   would have triggered habit_month_perfect). In practice only meaningful with habits.length ≥ 3.
  // Same currentMonthDay ≥ 14 guard as habit_month_perfect — computed once above.
  // Fires BEFORE pomodoro_today_above_avg (10.45): sustained month-long multi-habit consistency
  //   outweighs a single-day pomodoro spike.
  if (currentMonthDay >= 14 && habits.length >= 3) {
    const flawlessCount = habits.filter(h => h.lastChecked === todayStr && h.streak >= currentMonthDay).length;
    if (flawlessCount >= 2) {
      return { text: `📅 이번 달 ${flawlessCount}/${habits.length}개 습관 개근 중! (${currentMonthDay}일)`, level: "success" };
    }
  }

  // 10.411. Habit month maintained: current calendar month habit completion rate ∈ [70, 80).
  // Fires as a mid-tier positive badge when the month averaged well above the basic activity bar
  //   but hasn't crossed the excellent threshold (80%).
  // Threshold 70: practical lower bound — completing ≥70% of habits across the month represents
  //   sustained effort and earns a positive signal.
  // Threshold 80: lower boundary of the flawless-streak-based habit_month_excellent (10.41).
  //   Note: month maintained uses 70–79%, vs habit_week_maintained which covers 70–89%, because
  //   the month excellent bar (streak-based) is stricter than week excellent (rate ≥ 90%).
  // Fires AFTER habit_month_excellent (10.41): streak/lastChecked-based badge fires first when 2+ habits flawless.
  // Fires BEFORE habit_month_improved (10.413): absolute-level signal outweighs relative-delta signal.
  // Preempts habit_month_declined (10.414): a month completing 70–79% is not a "bad" month even if
  //   it represents a drop from a previous high — the absolute level takes precedence.
  // habitMonthRate is undefined when currentMonthDay < 14 (enforced in App.tsx caller), so no
  //   explicit currentMonthDay guard is needed here.
  if (habitMonthRate !== undefined && habitMonthRate >= 70 && habitMonthRate < 80) {
    return { text: `📊 이번 달 습관 완료율 ${habitMonthRate}% 유지! 꾸준한 한 달이에요`, level: "success" };
  }

  // 10.413. Habit month improved: current month habit completion rate rose ≥ 10pp vs previous month.
  // Fires AFTER habit_month_maintained (10.411): maintained fires first when habitMonthRate ∈ [70, 80),
  //   so this block is only reached when the current rate is below 70 or above 79 but no maintained fired.
  // Fires BEFORE habit_month_declined (10.414): improvement and decline are mutually exclusive.
  // Guard: habitMonthRate and habitPrevMonthRate must both be defined; caller (App.tsx) passes undefined
  //   when currentMonthDay < 14 (insufficient data) or no check history in previous month.
  // Threshold ≥ 10pp: symmetric with habit_month_declined — avoids noise from small fluctuations.
  if (habitMonthRate !== undefined && habitPrevMonthRate !== undefined && habitMonthRate - habitPrevMonthRate >= 10) {
    const rise = Math.round(habitMonthRate - habitPrevMonthRate);
    return { text: `📈 이번 달 습관 완료율 ${habitMonthRate}%! 지난 달보다 ${rise}%p 올랐어요`, level: "success" };
  }

  // 10.414. Habit month declined: current month habit completion rate dropped ≥ 10pp vs previous month.
  // Fires AFTER habit_month_improved (10.413): improvement and decline are mutually exclusive (when
  //   habitMonthRate > habitPrevMonthRate by ≥ 10pp the improved block already returned).
  // Threshold ≥ 10pp: symmetric with habit_month_improved to avoid noise.
  if (habitMonthRate !== undefined && habitPrevMonthRate !== undefined && habitPrevMonthRate - habitMonthRate >= 10) {
    const drop = Math.round(habitPrevMonthRate - habitMonthRate);
    return { text: `📉 이번 달 습관 완료율 ${habitMonthRate}%! 지난 달보다 ${drop}%p 낮아요`, level: "warning" };
  }

  // 10.42. Intention month perfect: this calendar month's intention done rate = 100%.
  // intentionMonthDoneRate = 100 means every intention set in the current YYYY-MM was also marked done.
  // setCount ≥ 14 guard is applied in calcIntentionMonthDoneRate (same day threshold as habit_month_*).
  // Fires AFTER habit_month_declined (10.414): habit monthly signals preempt intention perfection.
  // Fires BEFORE intention_month_excellent (10.43): perfect (100%) preempts excellent (80–99%).
  if (intentionMonthDoneRate !== undefined && intentionMonthDoneRate === 100) {
    return { text: `✅ 이번 달 의도 달성률 100%! 완벽한 실천이에요`, level: "success" };
  }

  // 10.43. Intention month excellent: this calendar month's intention done rate is 80–99%.
  // Threshold 80%: monthly bar is higher than the weekly excellent (70%) to reflect the longer window —
  //   a full month of consistent practice sets a higher standard than a single week.
  // Fires AFTER intention_month_perfect (10.42): perfect preempts excellent.
  // Fires BEFORE intention_month_improved (10.4301): perfect/excellent preempt the comparison badge.
  if (intentionMonthDoneRate !== undefined && intentionMonthDoneRate >= 80 && intentionMonthDoneRate < 100) {
    return { text: `✅ 이번 달 의도 달성률 ${intentionMonthDoneRate}%! 훌륭한 실천이에요`, level: "success" };
  }

  // 10.43005. Intention month maintained: this calendar month's intention done rate is 50–79%.
  // Range [50, 80): 50 or above signals consistent practice even without excellence; rate ≥ 80 means
  //   excellent (10.43) already fired — so this block only fires when 50 ≤ rate < 80.
  // Fires AFTER intention_month_excellent (10.43): excellent preempts maintained for rate ≥ 80.
  // Fires BEFORE intention_month_improved (10.4301): absolute mid-tier level preempts relative delta.
  // intentionMonthDoneRate absent → skipped silently (setCount < 14 in calcIntentionMonthDoneRate).
  if (intentionMonthDoneRate !== undefined && intentionMonthDoneRate >= 50 && intentionMonthDoneRate < 80) {
    return { text: `✅ 이번 달 의도 달성률 ${intentionMonthDoneRate}%! 꾸준한 실천이에요`, level: "success" };
  }

  // 10.4301. Intention month improved: current calendar month done rate rose ≥ 10pp vs previous month.
  // Uses intentionHistory (35-day cap in types.ts): the window covers the full previous calendar month,
  //   enabling a meaningful month-over-month comparison without additional data sources.
  // Guard: intentionMonthDoneRate !== undefined (setCount ≥ 14, confirmed by calcIntentionMonthDoneRate);
  //   intentionPrevMonthDoneRate !== undefined (setCount ≥ 10 in previous month, applied in App.tsx).
  // Threshold ≥ 10pp mirrors intention_week_improved (10.373) and habit_week_improved (10.36) —
  //   avoids noise from small monthly fluctuations (e.g. 1–9pp swings in sparse months).
  // By the time this block is reached, intentionMonthDoneRate < 50 or undefined (perfect/excellent/maintained returned above),
  //   so intention_month_improved signals meaningful progress from a lower absolute baseline.
  // Fires AFTER intention_month_maintained (10.43005): maintained fires first when intentionMonthDoneRate ∈ [50, 80).
  // Fires BEFORE momentum_month_strong (10.44): month-over-month intention execution trend checked first.
  // improved and declined are mutually exclusive — at most one fires per call.
  //
  // 10.4302. Intention month declined: current calendar month done rate dropped ≥ 10pp vs previous month.
  // Threshold ≥ 10pp mirrors intention_week_declined (10.374) — avoids noise from minor fluctuations.
  // Fires AFTER intention_month_improved (10.4301): mutually exclusive; improved takes priority when both would fire.
  // Fires BEFORE momentum_month_strong (10.44): warning for execution regression checked before momentum signals.
  if (intentionMonthDoneRate !== undefined && intentionPrevMonthDoneRate !== undefined) {
    const rise = Math.round(intentionMonthDoneRate - intentionPrevMonthDoneRate);
    if (rise >= 10) {
      return { text: `✅ 이번 달 의도 달성률 ${intentionMonthDoneRate}%! 지난 달보다 ${rise}%p 올랐어요`, level: "success" };
    }
    const drop = Math.round(intentionPrevMonthDoneRate - intentionMonthDoneRate);
    if (drop >= 10) {
      return { text: `📉 이번 달 의도 달성률 ${intentionMonthDoneRate}%! 지난 달보다 ${drop}%p 낮아요`, level: "warning" };
    }
  }

  // 10.44. Momentum month strong: current calendar month's average momentum score ≥ 65.
  // momentumHistory is capped at 31 days (types.ts), which covers a full calendar month.
  // monthPrefix = YYYY-MM derived from todayStr; entries outside the current month are excluded.
  // MIN_MONTH_MOMENTUM_ENTRIES = 14: same guard as habit_month_perfect and intention_month_perfect —
  //   requires at least two weeks of data before celebrating, avoiding early-month fragility.
  // Threshold 65 mirrors momentum_week_strong (10.38) for cross-timeframe consistency.
  // avgScore is rounded to the nearest integer for a clean display value.
  // Fires AFTER intention_month_excellent (10.43): month-long intention execution outranks momentum aggregate.
  // Fires BEFORE pomodoro_today_above_avg (10.45): a month of sustained momentum > a single-day pomodoro spike.
  if (momentumHistory) {
    const monthPrefix = todayStr.slice(0, 7);
    const monthEntries = momentumHistory.filter(e => e.date.startsWith(monthPrefix));
    if (monthEntries.length >= MIN_MONTH_MOMENTUM_ENTRIES) {
      const avgScore = Math.round(monthEntries.reduce((sum, e) => sum + e.score, 0) / monthEntries.length);
      if (avgScore >= 65) {
        return { text: `⚡ 이번 달 모멘텀 평균 ${avgScore}점! 최고의 한 달이에요`, level: "success" };
      }
    }
  }

  // 10.4400. Momentum month excellent: current calendar month's average momentum score ∈ [50, 65).
  // Fires as a sustained mid-tier positive badge when the month averaged well above the qualifying bar
  //   (≥ 40) but hasn't crossed the high-tier threshold (65).
  // Threshold 50: midpoint of the "mid" tier [40, 65) — ensures the badge rewards consistent effort
  //   above the basic qualifying threshold without conflating "decent" (40–49) with "good" (50–64).
  // Fires AFTER momentum_month_strong (10.44): avg ≥ 65 always preempts via early return above.
  // Fires BEFORE momentum_month_improved (10.4401): absolute mid-tier performance outweighs relative
  //   delta signal, analogous to momentum_week_excellent (10.3801) preempting momentum_week_improved (10.381).
  // Preempts momentum_month_declined (10.4402): a month averaging 50–64 is not a "bad" month even if
  //   it represents a decline from a previous high — the absolute level takes precedence.
  // monthEntries recomputed from momentumHistory (same monthPrefix logic as momentum_month_strong above).
  // momentumHistory absent → skipped silently (no month-avg data available).
  if (momentumHistory) {
    const monthPrefix = todayStr.slice(0, 7);
    const monthEntries = momentumHistory.filter(e => e.date.startsWith(monthPrefix));
    if (monthEntries.length >= MIN_MONTH_MOMENTUM_ENTRIES) {
      const avgScore = Math.round(monthEntries.reduce((sum, e) => sum + e.score, 0) / monthEntries.length);
      if (avgScore >= 50 && avgScore < 65) {
        return { text: `⚡ 이번 달 모멘텀 평균 ${avgScore}점! 꾸준한 한 달이에요`, level: "success" };
      }
    }
  }

  // 10.44005. Momentum month maintained: current calendar month's average momentum score ∈ [40, 50).
  // Fires as a low-mid-tier positive badge when the month averaged at the qualifying bar (≥ 40)
  //   but hasn't crossed the excellent threshold (50).
  // Fires AFTER momentum_month_excellent (10.4400): avg ≥ 50 always preempts via early return above.
  // Fires BEFORE momentum_month_improved (10.4401): absolute-level signal outweighs relative-delta signal,
  //   mirroring how momentum_week_maintained (10.3802) preempts momentum_week_improved (10.381).
  // Preempts momentum_month_declined (10.4402): a month averaging 40–49 is not a "bad" month even if
  //   it represents a drop from a previous high — the absolute level takes precedence.
  // Same MIN_MONTH_MOMENTUM_ENTRIES guard as momentum_month_excellent.
  // momentumHistory absent → skipped silently (no month-avg data available).
  if (momentumHistory) {
    const monthPrefix = todayStr.slice(0, 7);
    const monthEntries = momentumHistory.filter(e => e.date.startsWith(monthPrefix));
    if (monthEntries.length >= MIN_MONTH_MOMENTUM_ENTRIES) {
      const avgScore = Math.round(monthEntries.reduce((sum, e) => sum + e.score, 0) / monthEntries.length);
      if (avgScore >= 40 && avgScore < 50) {
        return { text: `⚡ 이번 달 모멘텀 평균 ${avgScore}점 유지! 꾸준한 흐름이에요`, level: "success" };
      }
    }
  }

  // 10.4401. Momentum month improved: current calendar month avg rose ≥ 10 points vs previous month.
  // Uses the same momentumHistory window as momentum_month_strong (31-day cap includes both months).
  // monthPrefix = YYYY-MM derived from todayStr; prevMonthPrefix derived via month arithmetic (handles Jan→Dec).
  // Guards: currentMonthDay ≥ 14 (calendar-day gate — requires today to be at least day 14 of the month;
  //   note: distinct from momentum_month_strong which guards on data count ≥ 14, not calendar day);
  //   currMonthEntries.length ≥ 14 (data-count inner gate — requires 14 actual history entries this month,
  //   which may differ from currentMonthDay if the user skipped days or has a sparse history);
  //   prevMonthEntries.length ≥ 10 — requires a meaningful previous-month baseline within the 31-day window.
  // Threshold ≥ 10 mirrors momentum_week_improved (10.381) — avoids noise from small monthly fluctuations.
  // Fires AFTER momentum_month_excellent (10.4400): when current avg ≥ 50, strong or excellent fires first and returns above.
  // Fires BEFORE pomodoro_month_goal_perfect (10.441): month-over-month momentum trend takes precedence over
  //   a 2-week pomodoro consistency signal.
  // improved and declined are mutually exclusive — at most one fires per call.
  //
  // 10.4402. Momentum month declined: current calendar month avg dropped ≥ 10 points vs previous month.
  // Fires AFTER momentum_month_improved (10.4401): improved and declined are mutually exclusive.
  // Fires BEFORE pomodoro_month_goal_perfect (10.441): warning for trend regression checked before pomodoro run.
  // Threshold ≥ 10 mirrors momentum_week_declined (10.382) — avoids noise from small monthly fluctuations.
  if (momentumHistory && currentMonthDay >= 14) {
    const monthPrefix = todayStr.slice(0, 7);
    const yr = parseInt(todayStr.slice(0, 4));
    const mo = parseInt(todayStr.slice(5, 7));
    const prevMonthPrefix = mo === 1
      ? `${yr - 1}-12`
      : `${yr}-${String(mo - 1).padStart(2, "0")}`;
    const currMonthEntries = momentumHistory.filter(e => e.date.startsWith(monthPrefix));
    const prevMonthEntries = momentumHistory.filter(e => e.date.startsWith(prevMonthPrefix));
    if (currMonthEntries.length >= 14 && prevMonthEntries.length >= 10) {
      const currAvg = Math.round(currMonthEntries.reduce((sum, e) => sum + e.score, 0) / currMonthEntries.length);
      const prevAvg = Math.round(prevMonthEntries.reduce((sum, e) => sum + e.score, 0) / prevMonthEntries.length);
      if (currAvg - prevAvg >= 10) {
        const rise = currAvg - prevAvg;
        return { text: `📈 이번 달 모멘텀 평균 ${currAvg}점! 지난 달보다 ${rise}점 올랐어요`, level: "success" };
      }
      if (prevAvg - currAvg >= 10) {
        const drop = prevAvg - currAvg;
        return { text: `📉 이번 달 모멘텀 평균 ${currAvg}점! 지난 달보다 ${drop}점 낮아요`, level: "warning" };
      }
    }
  }

  // 10.441. Pomodoro month goal perfect: 14 out of 14 rolling days (entirely within current calendar month
  //   when currentMonthDay ≥ 14) met or exceeded the daily session goal.
  // Note: pomodoroMonthGoalDays counts total goal-met days, not consecutive — "14/14" text is accurate.
  // Fires AFTER momentum_month_declined (10.4402): month-over-month momentum signals checked first.
  // Fires BEFORE pomodoro_month_goal_excellent (10.442): perfect preempts excellent.
  // Guard: currentMonthDay ≥ 14 ensures the 14-day window lies entirely within the current month.
  // pomodoroMonthGoalDays absent → skipped silently (no sessionGoal or caller did not wire calcPomodoroMonthGoalDays).
  if (currentMonthDay >= 14 && pomodoroMonthGoalDays === 14) {
    return { text: "🍅 최근 14일 포모도로 목표 14/14일 달성! 완벽한 집중이에요", level: "success" };
  }

  // 10.442. Pomodoro month goal excellent: 12 or 13 of the last 14 rolling days met the daily session goal.
  // Note: pomodoroMonthGoalDays counts total goal-met days (not consecutive) — "${N}/14일" text is accurate.
  // Fires AFTER pomodoro_month_goal_perfect (10.441): perfect preempts excellent.
  // Fires BEFORE pomodoro_today_above_avg (10.45): sustained 2-week consistency > single-day spike.
  // 12–13/14 ≈ 85–93%: mirrors pomodoro_week_goal_excellent (5–6/7 ≈ 71–86%), biasing toward high consistency.
  // pomodoroMonthGoalDays absent → skipped silently.
  if (currentMonthDay >= 14 && pomodoroMonthGoalDays !== undefined && pomodoroMonthGoalDays >= 12 && pomodoroMonthGoalDays < 14) {
    return { text: `🍅 최근 14일 포모도로 목표 ${pomodoroMonthGoalDays}/14일 달성!`, level: "success" };
  }

  // 10.44205. Pomodoro month goal maintained: 8–11 of the last 14 rolling days met the session goal.
  // Threshold 8–11: mid-tier absolute level — completing 8–11/14 days (57–79%) shows sustained
  //   engagement without reaching the "excellent" bar (≥12). Mirrors how habit_month_maintained
  //   (10.411) covers 70–79% as a mid-tier recognition that preempts relative-delta signals.
  // Fires AFTER pomodoro_month_goal_excellent (10.442): current ≥ 12 already returned above.
  // Fires BEFORE pomodoro_month_goal_improved (10.443): absolute sustained effort outweighs
  //   relative-delta signal — an 8–11/14 two-week window is recognized on its own terms.
  // Preempts pomodoro_month_goal_declined (10.444): 8–11 goal days is not a "bad" window
  //   even if it dropped from a previous high. Absolute level takes precedence.
  // currentMonthDay ≥ 14 guard: mirrors the gate used by perfect/excellent/improved/declined.
  // pomodoroMonthGoalDays absent → skipped silently.
  if (currentMonthDay >= 14 && pomodoroMonthGoalDays !== undefined && pomodoroMonthGoalDays >= 8 && pomodoroMonthGoalDays < 12) { // upper bound exclusive: ≤ 11
    return { text: `📊 최근 14일 포모도로 목표 ${pomodoroMonthGoalDays}/14일 유지! 꾸준한 집중이에요`, level: "success" };
  }

  // 10.443. Pomodoro month goal improved: goal-met days in the current 14-day window rose ≥ 2 vs prev 14-day window.
  // Threshold ≥ 2 days: mirrors pomodoro_week_goal_improved (10.3823) — avoids noise from single-day fluctuations.
  // Fires AFTER pomodoro_month_goal_excellent (10.442): perfect/excellent preempt the comparative signal.
  // Fires BEFORE pomodoro_month_goal_declined (10.444): improved and declined are mutually exclusive.
  // currentMonthDay ≥ 14 guard: ensures the current window lies within the month and prev window has meaningful data.
  // pomodoroMonthPrevGoalDays absent → skipped silently (sessionGoal not set or caller did not wire prev window).
  if (currentMonthDay >= 14 && pomodoroMonthGoalDays !== undefined && pomodoroMonthPrevGoalDays !== undefined) {
    const goalDayRise = pomodoroMonthGoalDays - pomodoroMonthPrevGoalDays;
    if (goalDayRise >= 2) {
      return { text: `🎯 최근 14일 포모도로 목표 ${pomodoroMonthGoalDays}일 달성! 이전 14일보다 ${goalDayRise}일 더 달성했어요`, level: "success" };
    }
  }

  // 10.444. Pomodoro month goal declined: goal-met days in the current 14-day window dropped ≥ 2 vs prev 14-day window.
  // Threshold ≥ 2 days: mirrors pomodoro_week_goal_declined (10.3824) — symmetric with improved.
  // Fires AFTER pomodoro_month_goal_improved (10.443): mutually exclusive; improved returns first when rise ≥ 2.
  // currentMonthDay ≥ 14 guard and pomodoroMonthPrevGoalDays absent handling mirror improved (10.443).
  if (currentMonthDay >= 14 && pomodoroMonthGoalDays !== undefined && pomodoroMonthPrevGoalDays !== undefined) {
    const goalDayDrop = pomodoroMonthPrevGoalDays - pomodoroMonthGoalDays;
    if (goalDayDrop >= 2) {
      return { text: `📉 최근 14일 포모도로 목표 ${pomodoroMonthGoalDays}일 달성. 이전 14일보다 ${goalDayDrop}일 낮아요`, level: "warning" };
    }
  }

  // 10.45. Pomodoro above recent average: today's session count exceeds the rolling history average by ≥ 2.
  // "Recent average" = average sessions per day across up to 13 past history entries (today excluded).
  // Fires AFTER pomodoro_month_goal_declined (10.444): sustained 14-day comparative signal checked before single-day spike.
  // Fires BEFORE momentum_rise (10.5): a pomodoro-specific achievement yields to system-wide momentum signals.
  // Threshold ≥ 2 integer sessions above average: prevents noise from fractional-average comparisons and
  //   ensures the badge fires only on genuinely exceptional focus days, not marginal differences (e.g. avg=3.8, today=5).
  // pomodoroRecentAvg absent → skipped silently (no history or caller did not wire calcPomodoroRecentAvg).
  // extra is floored (Math.floor) to display the conservative integer difference without overstating the achievement.
  if (pomodoroRecentAvg !== undefined && sessionsToday - pomodoroRecentAvg >= 2) {
    const extra = Math.floor(sessionsToday - pomodoroRecentAvg);
    return { text: `🍅 오늘 평소보다 ${extra}세션 더 집중 중!`, level: "success" };
  }

  // 10.46. Momentum streak milestone: consecutive qualifying-momentum days (score ≥ 40) hit 7, 14, or 30 days.
  // Fires AFTER pomodoro_today_above_avg (10.45): a single-day pomodoro achievement is more immediately actionable.
  // Fires BEFORE momentum_rise (10.5): a 7/14/30-day sustained streak is rarer and more significant than a 3-day rise.
  // Only milestone values trigger the badge — non-milestone streak lengths (e.g. 8, 15) are silently skipped to
  // prevent the badge from appearing every day and losing its celebratory impact.
  // Double-fire guard: calcMomentumStreak falls back to yesterday (daysBack=1) when today's score < 40
  // (a "live in-progress" continuous value — momentum.ts:124). Without a guard, streak=7 would be returned
  // on day 8 morning (before any activity), causing the badge to fire twice.
  // todayMomentumScore absent (no today entry yet) means today has not yet earned a qualifying score —
  // same as score=0. "undefined = not yet qualifying", not "undefined = trust". Mirrors the
  // sessionsToday > 0 guard in focus_streak_milestone (priority 7.42): require evidence of today's
  // qualifying activity before celebrating the milestone.
  // momentumStreak absent → no streak data; skipped silently.
  const todayMomentumScore = momentumHistory?.find(e => e.date === todayStr)?.score;
  const todayMomentumQualifies = todayMomentumScore !== undefined && todayMomentumScore >= 40;
  if (momentumStreak != null && MOMENTUM_STREAK_MILESTONES.includes(momentumStreak) && todayMomentumQualifies) {
    return { text: `🔥 ${momentumStreak}일 연속 모멘텀 달성! 지속력이 빛나요`, level: "success" };
  }

  // 10.461. Momentum streak milestone approach: streak is 1–2 days away from the next milestone (7, 14, or 30).
  // Motivates the user to maintain their streak before it reaches a celebration-worthy milestone.
  // Fires AFTER momentum_streak_milestone (10.46): when streak === 7/14/30 AND today qualifies, that badge fires first.
  // Fires BEFORE momentum_rise (10.5): an imminent personal milestone is a more specific motivational signal.
  // No todayMomentumQualifies guard: fires as a morning nudge even before today's qualifying activity —
  //   the streak reflects PAST consecutive qualifying days; the user still has all day to keep it alive.
  //   Distinct from momentum_streak_milestone which requires today to qualify before declaring the milestone reached.
  // momentumStreak absent → skipped silently.
  if (momentumStreak != null) {
    const nextMilestone = MOMENTUM_STREAK_MILESTONES.find(m => m > momentumStreak && m - momentumStreak <= 2);
    if (nextMilestone !== undefined) {
      const daysLeft = nextMilestone - momentumStreak;
      return { text: `🔥 모멘텀 ${momentumStreak}일 연속! ${daysLeft}일 더 유지하면 ${nextMilestone}일 마일스톤`, level: "success" };
    }
  }

  // 10.5. Momentum rise: 3 consecutive days each strictly higher than the day before — positive feedback for a productivity upswing.
  // Fires when calcMomentumTrend returns "rising"; absent/insufficient history → skipped.
  if (momentumHistory && calcMomentumTrend(momentumHistory, todayStr) === "rising") {
    return { text: "📈 3일 연속 모멘텀 상승!", level: "success" };
  }

  // 10.51. Momentum maintained: 3 consecutive days with a stable (non-monotone) trend at a meaningful level.
  // Fires when calcMomentumTrend returns "stable" AND the 3-day average score ≥ 40 AND today's score ≥ 40.
  // Captures users who hold a consistent productivity level without a strict upward or downward trend.
  // Fires AFTER momentum_rise (10.5): strictly rising trend takes precedence as the more positive signal.
  // Fires BEFORE goal_done (10.7): stable consistency is a meaningful pattern worth surfacing.
  // 3-day avg ≥ 40 guard: prevents badge from appearing when user is stuck at low scores (low plateau ≠ achievement).
  // today ≥ 40 guard: mirrors momentum_streak_milestone (10.46) — today's score must qualify before celebrating.
  //   An in-progress morning score (e.g., 10 at 9 AM) would otherwise generate a false "maintained" badge.
  if (momentumHistory && calcMomentumTrend(momentumHistory, todayStr) === "stable") {
    const scoreMap = new Map<string, number>(momentumHistory.map(e => [e.date, e.score]));
    const [yr, mo, day] = todayStr.split("-").map(Number);
    let sum = 0;
    const scores: number[] = [];
    for (let back = 2; back >= 0; back--) {
      const d = new Date(yr, mo - 1, day - back);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const s = scoreMap.get(key) ?? 0;
      sum += s;
      scores.push(s);
    }
    const todayScore = scores[2]; // scores[0]=2daysAgo, scores[1]=yesterday, scores[2]=today
    if (sum / 3 >= 40 && todayScore >= 40) {
      return { text: "📊 3일 모멘텀 꾸준히 유지 중", level: "success" };
    }
  }

  // 10.515. Triple momentum correlation: fires when ALL THREE behavioral domains simultaneously show ≥ 15 pt gap.
  // Condition: habitMomentumGap ≥ 15 AND intentionMomentumGap ≥ 15 AND pomodoroMomentumGap ≥ 15.
  // Preempts all three individual domain badges (10.52–10.54): a unified 3-domain signal outranks any
  // single-domain correlation, giving the user a clearer, more actionable "everything is connected" insight.
  // minGap = Math.min of all three gaps — the weakest correlation sets the floor of the claim (conservative).
  // Fires AFTER momentum_maintained (10.51): real-time trend/streak signals always take priority.
  // Any single gap absent or < 15 → condition fails → falls through to individual domain badges (10.52–10.54).
  if (
    habitMomentumGap != null && habitMomentumGap >= 15 &&
    intentionMomentumGap != null && intentionMomentumGap >= 15 &&
    pomodoroMomentumGap != null && pomodoroMomentumGap >= 15
  ) {
    const minGap = Math.min(habitMomentumGap, intentionMomentumGap, pomodoroMomentumGap);
    return { text: `💡 습관·의도·집중 완료일 모두 모멘텀 +${minGap}pt 이상 ↑`, level: "info" };
  }

  // 10.52. Habit-momentum correlation: fires when completing all habits correlates with meaningfully higher momentum.
  // Gap = allDoneAvg - notAllDoneAvg across past momentumHistory (today excluded); ≥ 15 pt gap = meaningful signal.
  // Requires ≥ 5 samples in each bucket (computed by calcHabitMomentumCorrelation in habits.ts).
  // Fires AFTER momentum_maintained (10.51): streak/trend signals take priority over historical correlation info.
  // Fires BEFORE goal_done (10.7): data-driven habit insight outranks a passive "goal already done" status.
  // habitMomentumGap absent → insufficient data; skipped silently.
  // Guard against gap < 15 here too: InsightParams may be constructed directly in tests or future callers.
  if (habitMomentumGap != null && habitMomentumGap >= 15) {
    return { text: `💡 습관 완료일 모멘텀 평균 +${habitMomentumGap}pt ↑`, level: "info" };
  }

  // 10.53. Intention-momentum correlation: fires when completing the daily intention correlates with higher momentum.
  // Gap = intentionDoneAvg - notDoneAvg across past momentumHistory (today excluded); ≥ 15 pt gap = meaningful signal.
  // Requires ≥ 5 samples in each bucket (computed by calcIntentionMomentumCorrelation in intention.ts).
  // Fires AFTER habit_momentum_correlation (10.52): habit completion is a stronger behavioral signal than intention alone.
  // Fires BEFORE pomodoro_momentum_correlation (10.54): intention is a daily intentional signal; pomodoro is a session metric.
  // intentionMomentumGap absent → insufficient data; skipped silently.
  // Guard against gap < 15 here too: InsightParams may be constructed directly in tests or future callers.
  if (intentionMomentumGap != null && intentionMomentumGap >= 15) {
    return { text: `💡 의도 달성일 모멘텀 평균 +${intentionMomentumGap}pt ↑`, level: "info" };
  }

  // 10.54. Pomodoro-momentum correlation: completes the 3-domain correlation series (habit 10.52, intention 10.53, pomodoro 10.54).
  // Gap = goalMetAvg - notGoalMetAvg across past momentumHistory (today excluded); ≥ 15 pt gap = meaningful signal.
  // Goal-met = days where session count >= sessionGoal; not-met = days where count < sessionGoal (incl. missing = 0).
  // Requires ≥ 5 samples in each bucket (computed by calcPomodoroMomentumCorrelation in pomodoro.ts).
  // Fires AFTER intention_momentum_correlation (10.53): pomodoro is a discrete session metric, less direct than intention.
  // Fires BEFORE goal_done (10.7): data-driven focus insight outranks a passive "goal already done" status.
  // pomodoroMomentumGap absent → sessionGoal not set or insufficient data; skipped silently.
  // Guard against gap < 15 here too: InsightParams may be constructed directly in tests or future callers.
  if (pomodoroMomentumGap != null && pomodoroMomentumGap >= 15) {
    return { text: `💡 포모도로 목표 달성일 모멘텀 평균 +${pomodoroMomentumGap}pt ↑`, level: "info" };
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

  // 10.77. Quarterly goal streak: ≥2 consecutive past quarters where the quarterly goal was achieved AND not yet done this quarter.
  // Morning-only (< 12h) motivational nudge, mirrors month_goal_streak (10.76) for a quarterly cadence.
  // quarterGoalPastDoneStreak excludes the current quarter, so this never fires at the same moment as goal_done (10.7).
  // Threshold ≥ 2: mirrors month_goal_streak — two past quarters forms a meaningful multi-quarter pattern.
  if (nowHour < 12 && quarterGoal && !quarterGoalDone && quarterGoalPastDoneStreak != null && quarterGoalPastDoneStreak >= 2) {
    return { text: `✅ 분기 목표 ${quarterGoalPastDoneStreak}분기 연속 달성 중! 이번 분기도 화이팅`, level: "success" };
  }

  // 10.78. Yearly goal streak: ≥1 consecutive past year where the yearly goal was achieved AND not yet done this year.
  // Morning-only (< 12h) motivational nudge, mirrors quarter_goal_streak (10.77) for a yearly cadence.
  // yearGoalPastDoneStreak excludes the current year, so this never fires at the same moment as goal_done (10.7).
  // Threshold ≥ 1: one past achieved year is sufficient since yearly achievements are inherently rare.
  if (nowHour < 12 && yearGoal && !yearGoalDone && yearGoalPastDoneStreak != null && yearGoalPastDoneStreak >= 1) {
    return { text: `✅ 연간 목표 ${yearGoalPastDoneStreak}년 연속 달성 중! 올해도 화이팅`, level: "success" };
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

  // 11.01. Habit streak record: habit checked in today, streak equals bestStreak (all-time high),
  // but streak is NOT a fixed milestone (7/30/100d). Complements personal_best (11) which only fires
  // at PERSONAL_BEST_MILESTONES — this block covers every other non-milestone new personal best.
  // Fires AFTER personal_best (11): milestone condition (PERSONAL_BEST_MILESTONES.includes(streak))
  //   is mutually exclusive with this block's !PERSONAL_BEST_MILESTONES.includes(streak) guard.
  // Fires BEFORE habit_best_streak_approach (11.02): streak === bestStreak (gap = 0) is mutually
  //   exclusive with approachBest's streak < bestStreak (gap > 0) filter.
  // habit_target_hit interaction (11.04): when streak === targetStreak (user's custom goal exactly met
  //   today), habit_target_hit (11.04) is the more meaningful badge. This block defers via
  //   !targetStreak || streak !== targetStreak, so the "목표 달성!" message always takes precedence
  //   over "새 기록!" when both conditions hold simultaneously.
  // habit_comeback interaction (6.9): bestStreak >= 14 && streak < bestStreak → mutually exclusive
  //   with streak === bestStreak. When bestStreak >= 14 and streak === bestStreak (new peak on a
  //   long-streak habit), habit_comeback does not fire — this block celebrates it instead.
  // bestStreak > 3 guard: suppresses trivial bests (e.g., bestStreak=2 from a brief early attempt).
  // lastChecked === todayStr guard: requires today's check-in — freshest, most actionable signal.
  // Picks habit with highest bestStreak when multiple qualify (longest journey most impressive).
  const streakRecord = habits
    .filter(h =>
      h.bestStreak != null &&
      h.bestStreak > 3 &&
      h.streak === h.bestStreak &&
      !PERSONAL_BEST_MILESTONES.includes(h.streak) &&
      h.lastChecked === todayStr &&
      (!h.targetStreak || h.streak !== h.targetStreak)
    )
    .sort((a, b) => b.bestStreak! - a.bestStreak!)[0];
  if (streakRecord) {
    return { text: `🌟 ${streakRecord.name} 새 기록! (${streakRecord.streak}d)`, level: "success" };
  }

  // 11.02. Habit approach personal best: habit checked in today with streak 1–2 days from all-time bestStreak.
  // Fires AFTER personal_best (11): personal_best requires streak === bestStreak at a fixed milestone,
  //   which implies gap === 0 — mutually exclusive with this block's gap > 0 condition.
  // Fires BEFORE habit_target_near (11.05): approaching an auto-tracked all-time best is rarer
  //   and more significant than approaching a user-set target; takes precedence when both qualify.
  //   Exception: when lastChecked !== todayStr, this block is filtered out but targetNear (11.05) may
  //   still fire (it has no lastChecked guard). This is intentional — this badge is a "same-day fresh
  //   check-in" signal; without today's check-in, the target nudge is more actionable.
  // habit_comeback interaction: when bestStreak >= 14 and gap <= 2, habit_comeback (6.9) fires first
  //   because its priority (6.9) is higher. This block is therefore only reached for bestStreak < 14,
  //   OR when bestStreak >= 14 but streak < 3 (outside comeback's streak >= 3 guard), OR when the
  //   habit was not checked in today (outside comeback's lastChecked === todayStr guard).
  // bestStreak > 3 guard: suppresses trivial bests (e.g. bestStreak=2 from a brief early attempt).
  // lastChecked === todayStr guard: the user must have already checked in today — the approach message
  //   is freshest and most actionable right after today's check-in confirms the streak is still alive.
  // Picks the habit with the smallest gap (1 before 2) when multiple qualify;
  //   ties broken by higher bestStreak (more impressive personal best takes priority).
  const approachBest = habits
    .filter(h =>
      h.lastChecked === todayStr &&
      h.bestStreak != null && h.bestStreak > 3 &&
      h.streak < h.bestStreak &&
      (h.bestStreak - h.streak) <= 2
    )
    .sort((a, b) => {
      const gapA = a.bestStreak! - a.streak;
      const gapB = b.bestStreak! - b.streak;
      return gapA !== gapB ? gapA - gapB : b.bestStreak! - a.bestStreak!;
    })[0];
  if (approachBest) {
    const gap = approachBest.bestStreak! - approachBest.streak;
    return { text: `🔥 ${approachBest.name} 역대 최고까지 ${gap}일!`, level: "success" };
  }

  // 11.04. Habit target hit: user-defined targetStreak goal reached exactly today.
  // Fires when streak === targetStreak AND lastChecked === todayStr, celebrating the moment the
  // user-set goal is achieved. Distinct from habit_target_near (11.05) which covers gap 1–2 days
  // (habit_target_near guards gap >= 1, so gap = 0 is explicitly excluded there — this block fills
  // that gap). Distinct from personal_best (11) which only fires for fixed milestones (7/30/100d);
  // custom targets (e.g. 14, 21, 45d) are never covered by personal_best.
  // Priority interactions (silently suppress this badge):
  //   personal_best (11): when targetStreak is in PERSONAL_BEST_MILESTONES (7/30/100) AND
  //     bestStreak === streak, personal_best fires first. Intentional: first-ever milestone
  //     achievement takes precedence over a custom-goal badge.
  //   habit_streak_record (11.01): when streak === bestStreak but targetStreak is absent or unmatched,
  //     streak_record fires first. When streak === bestStreak AND streak === targetStreak (user hits
  //     custom goal exactly at a new all-time best), habit_streak_record defers via its
  //     !targetStreak || streak !== targetStreak guard — habit_target_hit fires here. Intentional:
  //     the user-defined goal is more meaningful than the incidental new personal best.
  //   habit_best_streak_approach (11.02): when streak < bestStreak AND bestStreak - streak ≤ 2,
  //     approachBest fires first. Intentional: approaching an all-time best is rarer and more urgent.
  // !target guard: rejects null/undefined/0 (0 < 1 also catches 0, but null coerces to 0 in JS
  //   so `null < 1` would be true without the !target prefix — the prefix ensures null/undefined
  //   are safely excluded before the numeric comparison).
  // Picks the habit with the highest targetStreak when multiple qualify
  //   (a longer-journey achievement is more impressive than a shorter one's).
  const targetHit = habits
    .filter(h => {
      const target = h.targetStreak;
      if (!target || target < 1 || h.streak < 1) return false;
      if (h.lastChecked !== todayStr) return false;
      return h.streak === target;
    })
    .sort((a, b) => b.targetStreak! - a.targetStreak!)[0];
  if (targetHit) {
    return { text: `🏆 ${targetHit.name} ${targetHit.targetStreak}일 목표 달성!`, level: "success" };
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

  // 11.06. Habit target halfway: user-defined targetStreak exactly at the midpoint.
  // Fires as a motivational milestone when a habit reaches exactly 50% of its user-set target.
  // targetStreak >= 14 guard: suppresses trivial short targets (e.g. targetStreak=12 midpoint=6
  //   is not a meaningful celebration; habit_target_near already covers the final 1-2 days).
  // streak === Math.floor(targetStreak / 2) guard: fires exactly once per target traversal;
  //   odd targets round down (e.g. targetStreak=21 fires at streak=10, 11 days to go).
  // lastChecked === todayStr guard: fires only on the day the user completes the midpoint check-in,
  //   keeping the message freshly actionable and avoiding stale celebrations.
  // Fires AFTER habit_target_near (11.05): "1-2 days away" is more urgent than "halfway there".
  // Picks the habit with the highest targetStreak when multiple qualify
  //   (a longer-journey halfway is more impressive than a shorter one's).
  // Priority interactions (silently suppress this badge):
  //   personal_best (11): targetStreak=14 midpoint=7 — when bestStreak=7 (first time hitting 7d,
  //     a PERSONAL_BEST_MILESTONES value), personal_best fires instead. Intentional: the milestone
  //     achievement is more celebratory than the halfway signal on the same day.
  //   habit_comeback (6.9): bestStreak≥14, streak≥3, lastChecked=today — a recovering user whose
  //     14-day bestStreak yields targetStreak=14 will see a comeback message at streak=7. Intentional:
  //     comeback is a broader recovery signal that supersedes the halfway nudge.
  //   approachBest (11.02): when bestStreak is 1-2 above the halfway value (e.g. bestStreak=8,
  //     streak=7, targetStreak=14), approachBest fires first. Intentional: personal-best approach
  //     is rarer and more urgent than a target milestone.
  const targetHalfway = habits
    .filter(h => {
      const target = h.targetStreak;
      if (!target || target < 14) return false;
      if (h.lastChecked !== todayStr) return false;
      return h.streak === Math.floor(target / 2);
    })
    .sort((a, b) => b.targetStreak! - a.targetStreak!)[0];
  if (targetHalfway) {
    return { text: `🎯 ${targetHalfway.name} 목표 절반 돌파! (${targetHalfway.streak}/${targetHalfway.targetStreak}일)`, level: "success" };
  }

  // 11.064. Month quadrafecta flawless: ALL FOUR core domains (habit + pomodoro + momentum + intention)
  // flawless every day of the current calendar month so far.
  // Fires BEFORE month_trifecta_flawless (11.065): 4-domain perfection outweighs 3-domain. When all four
  //   conditions hold, this badge fires and the trifecta block is never reached.
  // Fires AFTER habit_target_halfway (11.06): specific achievement badges are rarer and more actionable.
  // Four independent conditions must all hold simultaneously (mirrors month_trifecta_flawless guards):
  //   1. Habit: any habit with lastChecked === todayStr AND streak ≥ currentMonthDay.
  //   2. Pomodoro: focusStreak ≥ currentMonthDay AND sessionsToday > 0 (mirrors pomodoro_month_flawless 11.08).
  //   3. Momentum: momentumStreak ≥ currentMonthDay AND todayMomentumQualifies (mirrors momentum_month_flawless 11.09).
  //   4. Intention: todayIntentionDone === true AND intentionDoneStreak ≥ currentMonthDay.
  //      todayIntentionDone is an explicit guard (intentionDoneStreak can be positive even when today is
  //      not yet done — same design as week_quadrafecta_flawless at 10.3289).
  // Requires ≥ MIN_MONTH_DAYS (10) into the month — same gate as individual flawless badges.
  // Absent focusStreak, momentumStreak, intentionDoneStreak → silently skipped (feature not wired by caller).
  if (
    currentMonthDay >= MIN_MONTH_DAYS &&
    habits.some(h => h.lastChecked === todayStr && h.streak >= currentMonthDay) &&
    focusStreak != null && focusStreak >= currentMonthDay && sessionsToday > 0 &&
    momentumStreak != null && momentumStreak >= currentMonthDay && todayMomentumQualifies &&
    todayIntentionDone === true && intentionDoneStreak != null && intentionDoneStreak >= currentMonthDay
  ) {
    return { text: `🏆 이번 달 습관·의도·집중·모멘텀 모두 개근! (${currentMonthDay}일)`, level: "success" };
  }

  // 11.065. Month trifecta flawless: habit + pomodoro + momentum all flawless for the current calendar month.
  // Fires AFTER habit_target_halfway (11.06): specific achievement badges are rarer and more actionable.
  // Fires BEFORE habit_month_flawless (11.07): triple-domain perfection outweighs any single-domain badge.
  // Three independent conditions must all hold simultaneously:
  //   1. Habit: any habit with lastChecked === todayStr AND streak ≥ currentMonthDay (covers all days 1–today).
  //   2. Pomodoro: focusStreak ≥ currentMonthDay AND sessionsToday > 0 (mirrors pomodoro_month_flawless 11.08).
  //   3. Momentum: momentumStreak ≥ currentMonthDay AND todayMomentumQualifies (mirrors momentum_month_flawless 11.09).
  // todayMomentumQualifies reuses the const declared in the momentum_streak_milestone block.
  // currentMonthDay already computed above (habit_month_perfect, priority 10.40).
  // Requires ≥ MIN_MONTH_DAYS (10) into the month — same gate as individual flawless badges.
  // Absent focusStreak or momentumStreak → silently skipped (feature not wired by caller).
  if (
    currentMonthDay >= MIN_MONTH_DAYS &&
    habits.some(h => h.lastChecked === todayStr && h.streak >= currentMonthDay) &&
    focusStreak != null && focusStreak >= currentMonthDay && sessionsToday > 0 &&
    momentumStreak != null && momentumStreak >= currentMonthDay && todayMomentumQualifies
  ) {
    return { text: `🌟 이번 달 습관·집중·모멘텀 모두 개근! (${currentMonthDay}일)`, level: "success" };
  }

  // 11.07. Habit month flawless: a habit has been checked every day of the current calendar month so far.
  // Derived from streak: lastChecked === todayStr AND streak ≥ currentMonthDay guarantees coverage.
  //   If streak=20 on Jan 15, the user checked 20 consecutive days (Dec 27–Jan 15) — all 15 January
  //   days are covered. The badge fires accurately regardless of how far back the streak extends.
  //   This avoids the 14-entry checkHistory cap while remaining fully correct.
  // Requires ≥ MIN_MONTH_DAYS (10) days into the month to avoid noise at the start of the month
  //   (e.g. a 3-day "개근" badge on Jan 3 is too early to celebrate).
  // lastChecked !== todayStr guard: if the user hasn't checked in today the streak is stale and
  //   the current month may not actually be fully covered up to today.
  // Fires AFTER habit_target_halfway (11.06): specific "just achieved" badges (personal_best, target_hit,
  //   target_near, target_halfway) are rarer and more actionable than month-level attendance background.
  // Fires BEFORE intention_streak (11.1): a month of perfect habit attendance outweighs a weekly
  //   intention-setting streak.
  // Picks the habit with the highest streak when multiple qualify — longest run earns the badge.
  // currentMonthDay already computed above (habit_month_perfect, priority 10.40).
  if (currentMonthDay >= MIN_MONTH_DAYS && habits.length > 0) {
    const monthFlawless = habits
      .filter(h => h.lastChecked === todayStr && h.streak >= currentMonthDay)
      .sort((a, b) => b.streak - a.streak)[0];
    if (monthFlawless) {
      return { text: `🗓️ ${monthFlawless.name} 이번 달 개근 중! (${currentMonthDay}일)`, level: "success" };
    }
  }

  // 11.08. Pomodoro month flawless: the user has completed at least one pomodoro session every
  // calendar day of the current month so far.
  // Invariant: focusStreak >= currentMonthDay guarantees the streak started on or before day 1 of
  //   the current month, so every day 1–today is covered. A consecutive streak cannot contain a gap,
  //   so a 20-day streak ending Jan 15 necessarily includes Jan 1–15.
  // sessionsToday > 0 guard: calcFocusStreak (pomodoro.ts) counts today in the streak only when
  //   today's pomodoroHistory entry has count > 0, which corresponds to sessionsToday > 0 in App.tsx.
  //   This guard is therefore a consistency check, not a separate mechanism — it prevents firing when
  //   a caller passes a stale focusStreak that already includes today while reporting sessionsToday=0.
  // Requires ≥ MIN_MONTH_DAYS (10) into the month to avoid premature celebration (Jan 3 is too early).
  // focusStreak absent → skipped silently (feature not wired by caller).
  // Fires AFTER habit_month_flawless (11.07): if a habit has a flawless month, that badge takes priority.
  // Fires BEFORE intention_streak (11.1): a full month of daily focus outweighs a 7-day intention streak.
  if (focusStreak != null && focusStreak >= currentMonthDay && sessionsToday > 0 && currentMonthDay >= MIN_MONTH_DAYS) {
    return { text: `🍅 이번 달 매일 집중! (${currentMonthDay}일)`, level: "success" };
  }

  // 11.09. Momentum month flawless: every calendar day of the current month so far had a momentum
  // score ≥ 40 (Good tier). Two conditions guarantee this:
  //   1. momentumStreak ≥ currentMonthDay: an unbroken run of qualifying days of at least currentMonthDay
  //      length, which necessarily covers all days 1–today IF today is included (see condition 2).
  //   2. todayMomentumQualifies: today's score is already recorded and ≥ 40, confirming calcMomentumStreak
  //      started from today (daysBack=0 path in momentum.ts:124) rather than yesterday. Without this guard
  //      a streak of 15 that started yesterday (covering Dec 30–Jan 13 on day 14) would falsely pass the
  //      ≥ currentMonthDay check even though today is not yet qualifying — same role as sessionsToday > 0
  //      in pomodoro_month_flawless and lastChecked === todayStr in habit_month_flawless.
  //   todayMomentumQualifies reuses the const declared in the momentum_streak_milestone block.
  // Requires ≥ MIN_MONTH_DAYS (10) days into the month to avoid premature celebration.
  // momentumStreak absent → skipped silently (feature not wired by caller).
  // Fires AFTER pomodoro_month_flawless (11.08): daily focus sessions outweigh the derived momentum score.
  // Fires BEFORE intention_streak (11.1): month-level qualifying attendance outweighs a 7-day streak.
  // Interaction with momentum_streak_milestone (10.46): when momentumStreak ∈ [7, 14, 30] AND
  //   todayMomentumQualifies, the milestone fires first at priority 10.46. Examples:
  //     Day 14, streak=14: milestone fires; flawless at 11.09 not reached.
  //     Day 15, streak=15: not a milestone; flawless fires.
  //     Day 30, streak=30 (30-day month last day): milestone fires; flawless permanently suppressed.
  //       For 31-day months (e.g. January) day 31 is not a milestone, so flawless fires there.
  //       The milestone badge (🔥 30일 연속) is considered more prestigious than flawless in this edge case.
  if (momentumStreak != null && momentumStreak >= currentMonthDay && currentMonthDay >= MIN_MONTH_DAYS && todayMomentumQualifies) {
    return { text: `⚡ 이번 달 매일 모멘텀 달성! (${currentMonthDay}일)`, level: "success" };
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
