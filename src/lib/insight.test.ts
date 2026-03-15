// ABOUTME: Tests for calcTodayInsight — context-aware daily insight surfacing
// ABOUTME: Covers all eleven insight types and their priority ordering

import { describe, it, expect } from "vitest";
import { calcTodayInsight } from "./insight";

const TODAY = "2024-01-15";
const YESTERDAY = "2024-01-14";
const TOMORROW = "2024-01-16";
const IN_3 = "2024-01-18";
const IN_4 = "2024-01-19";
const IN_7 = "2024-01-22";
const IN_8 = "2024-01-23";
const DAYS_6_AGO = "2024-01-09";
const DAYS_7_AGO = "2024-01-08";
const DAYS_8_AGO = "2024-01-07";

/** Minimal habit shape used across tests */
function habit(name: string, streak: number, lastChecked?: string, bestStreak?: number) {
  return { name, streak, lastChecked, bestStreak };
}

describe("calcTodayInsight", () => {
  // ── streak_at_risk ─────────────────────────────────────────────────────────
  it("shouldReturnStreakAtRiskWhenEveningAndHighStreakHabitUnchecked", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 10, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 19,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("10");
  });

  it("shouldNotReturnStreakAtRiskBeforeEvening", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 10, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 17,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result?.level).not.toBe("warning");
  });

  it("shouldNotReturnStreakAtRiskIfHabitAlreadyCheckedToday", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 10, TODAY)],
      todayStr: TODAY,
      nowHour: 19,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result?.level).not.toBe("warning");
  });

  it("shouldNotReturnStreakAtRiskForStreakBelow7", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 6, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 19,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result?.level).not.toBe("warning");
  });

  it("shouldPickHighestStreakHabitForAtRiskWarning", () => {
    const result = calcTodayInsight({
      habits: [habit("독서", 7, YESTERDAY), habit("운동", 15, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 19,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("15");
  });

  // ── milestone_near ─────────────────────────────────────────────────────────
  it("shouldReturnMilestoneNearWhenStreakIs6AndUnchecked", () => {
    const result = calcTodayInsight({
      habits: [habit("독서", 6, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 10,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("독서");
    expect(result!.text).toContain("🔥");
  });

  it("shouldReturnMilestoneNearWhenStreakIs29", () => {
    const result = calcTodayInsight({
      habits: [habit("명상", 29, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 10,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("⭐");
  });

  it("shouldNotReturnMilestoneNearWhenHabitAlreadyCheckedToday", () => {
    // streak 6 but already checked today → user already reached streak 6 today, nothing actionable
    const result = calcTodayInsight({
      habits: [habit("독서", 6, TODAY)],
      todayStr: TODAY,
      nowHour: 10,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    // may return other insight types, but not this milestone
    if (result) {
      expect(result.text).not.toContain("🔥");
    }
  });

  it("shouldNotReturnMilestoneNearForStreakThatIsNotNearMilestone", () => {
    // Use Tuesday 2024-01-16 so week_start (Monday-only) and other period triggers don't fire.
    const result = calcTodayInsight({
      habits: [habit("운동", 5, "2024-01-15")],
      todayStr: "2024-01-16", // Tuesday — no period_start triggers
      nowHour: 10,
      todayIntentionDate: "2024-01-16",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  // ── perfect_day ────────────────────────────────────────────────────────────
  it("shouldReturnPerfectDayWhenAllHabitsDoneToday", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 5, TODAY)],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("완벽");
  });

  it("shouldNotReturnPerfectDayWhenDoneDateIsNotToday", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: YESTERDAY,
    });
    expect(result?.level).not.toBe("success");
  });

  // ── intention_missing ──────────────────────────────────────────────────────
  it("shouldReturnIntentionMissingWhenMorningAndNoIntentionSet", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: undefined,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("의도");
  });

  it("shouldReturnIntentionMissingAtExactlyMidnight", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 0,
      todayIntentionDate: undefined,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result?.level).toBe("info");
    expect(result?.text).toContain("의도");
  });

  it("shouldNotReturnIntentionMissingAtNoon", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: undefined,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    // at noon nothing notable → null
    expect(result).toBeNull();
  });

  it("shouldNotReturnIntentionMissingWhenAlreadySetToday", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    if (result) expect(result.text).not.toContain("의도");
  });

  // ── pomodoro_last_one ──────────────────────────────────────────────────────
  it("shouldReturnPomodoroLastOneWhenOneSessionFromGoal", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 3,
      sessionGoal: 4,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("1세션");
  });

  it("shouldNotReturnPomodoroLastOneWhenGoalNotSet", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 3,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnPomodoroLastOneWhenTwoOrMoreSessionsFromGoal", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 2,
      sessionGoal: 4,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnPomodoroLastOneWhenGoalIs1AndNoSessionsDoneYet", () => {
    // goalGoal=1, sessionsToday=0 → "0 === 1-1" → triggers pomodoro_last_one
    // This is intentional: "1 session from goal" when you haven't started yet and goal is 1
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: 1,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("1세션");
  });

  it("shouldNotReturnPomodoroLastOneWhenGoalIs0", () => {
    // sessionGoal=0 → sessionsToday === -1 is never true → no trigger
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: 0,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  // ── null baseline ──────────────────────────────────────────────────────────
  it("shouldReturnNullWhenNothingNotable", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  // ── priority ordering ──────────────────────────────────────────────────────
  it("shouldPrioritizeStreakAtRiskOverMilestoneNear", () => {
    const result = calcTodayInsight({
      habits: [
        habit("독서", 6, YESTERDAY),   // milestone_near candidate
        habit("운동", 10, YESTERDAY),  // streak_at_risk candidate (higher priority)
      ],
      todayStr: TODAY,
      nowHour: 19,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("운동");
  });

  it("shouldPrioritizeMilestoneNearOverPerfectDay", () => {
    const result = calcTodayInsight({
      habits: [habit("독서", 6, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 10,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY,  // perfect day also true
    });
    // milestone_near (priority 2) beats perfect_day (priority 3)
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("🔥");
  });

  it("shouldPrioritizePerfectDayOverIntentionMissing", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: undefined,  // intention missing (morning)
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY,  // perfect_day also true
    });
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("완벽");
  });

  it("shouldPrioritizeIntentionMissingOverPomodoroLastOne", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: undefined,  // intention missing
      sessionsToday: 3,
      sessionGoal: 4,  // pomodoro_last_one also true
      habitsAllDoneDate: undefined,
    });
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("의도");
  });

  // ── deadline_critical ──────────────────────────────────────────────────────
  it("shouldReturnDeadlineCriticalWhenDeadlineIsToday", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "앱 출시", deadline: TODAY, status: "active" }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("앱 출시");
    expect(result!.text).toContain("D-Day");
  });

  it("shouldReturnDeadlineCriticalWhenDeadlineIs1DayAway", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프로젝트A", deadline: TOMORROW, status: "in-progress" }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("프로젝트A");
    expect(result!.text).toContain("D-1");
  });

  it("shouldReturnDeadlineCriticalWhenDeadlineIs3DaysAway", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프로젝트B", deadline: IN_3, status: "active" }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("D-3");
  });

  it("shouldNotReturnDeadlineCriticalWhenDeadlineIs4DaysAway", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프로젝트C", deadline: IN_4, status: "active" }],
    });
    // D-4 → deadline_soon (info), not critical (warning)
    if (result) expect(result.level).not.toBe("warning");
  });

  // ── deadline_soon ──────────────────────────────────────────────────────────
  it("shouldReturnDeadlineSoonWhenDeadlineIs4DaysAway", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프로젝트D", deadline: IN_4, status: "active" }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("프로젝트D");
    expect(result!.text).toContain("D-4");
  });

  it("shouldReturnDeadlineSoonWhenDeadlineIs7DaysAway", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프로젝트E", deadline: IN_7, status: "active" }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("D-7");
  });

  it("shouldNotReturnDeadlineInsightWhenDeadlineIs8DaysAway", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프로젝트F", deadline: IN_8, status: "active" }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnDeadlineInsightForDoneProject", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "완료됨", deadline: TOMORROW, status: "done" }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnDeadlineInsightForPausedProject", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "멈춤", deadline: TOMORROW, status: "paused" }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnDeadlineInsightWhenProjectHasNoDeadline", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "무기한", status: "active" }],
    });
    expect(result).toBeNull();
  });

  // Overdue projects (past deadline) return null — handled by desktop notification at startup, not the clock insight.
  it("shouldNotReturnDeadlineInsightForOverdueProject", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "기한초과", deadline: YESTERDAY, status: "active" }],
    });
    // Overdue is surfaced via desktop notification (App.tsx startup), not the clock insight.
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenProjectsArrayIsEmpty", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [],
    });
    expect(result).toBeNull();
  });

  // ── project_stale ──────────────────────────────────────────────────────────
  it("shouldReturnProjectStaleWhenActiveProjectNotFocusedIn7Days", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "앱개발", status: "active", lastFocusDate: DAYS_7_AGO }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("앱개발");
    expect(result!.text).toContain("7");
  });

  it("shouldReturnProjectStaleWhenInProgressProjectNotFocusedIn8Days", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "리팩토링", status: "in-progress", lastFocusDate: DAYS_8_AGO }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("리팩토링");
    expect(result!.text).toContain("8");
  });

  it("shouldNotReturnProjectStaleWhenLastFocusWas6DaysAgo", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "최근프로젝트", status: "active", lastFocusDate: DAYS_6_AGO }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectStaleWhenLastFocusDateAbsent", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "신규프로젝트", status: "active" }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectStaleWhenLastFocusDateIsToday", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "오늘집중", status: "active", lastFocusDate: TODAY }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectStaleForDoneProject", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "완료됨", status: "done", lastFocusDate: DAYS_7_AGO }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectStaleForPausedProject", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "멈춤프로젝트", status: "paused", lastFocusDate: DAYS_7_AGO }],
    });
    expect(result).toBeNull();
  });

  it("shouldReturnMostStaleProjectWhenMultipleQualify", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "덜방치됨", status: "active", lastFocusDate: DAYS_7_AGO },
        { name: "가장방치됨", status: "in-progress", lastFocusDate: DAYS_8_AGO },
      ],
    });
    expect(result!.text).toContain("가장방치됨");
    expect(result!.text).toContain("8");
  });

  it("shouldPrioritizeDeadlineSoonOverProjectStale", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "마감임박", status: "active", deadline: IN_4 },               // deadline_soon
        { name: "방치됨", status: "active", lastFocusDate: DAYS_7_AGO },      // project_stale
      ],
    });
    expect(result!.text).toContain("마감임박");  // deadline_soon wins
    expect(result!.text).toContain("D-4");
  });

  // ── deadline priority ordering ──────────────────────────────────────────────
  it("shouldPrioritizeStreakAtRiskOverDeadlineCritical", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 10, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 19,  // evening → streak_at_risk active
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "긴급프로젝트", deadline: TOMORROW, status: "active" }],
    });
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("운동");  // streak_at_risk wins
  });

  it("shouldPrioritizeDeadlineCriticalOverMilestoneNear", () => {
    const result = calcTodayInsight({
      habits: [habit("독서", 6, YESTERDAY)],  // milestone_near
      todayStr: TODAY,
      nowHour: 10,  // not evening → streak_at_risk inactive
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "긴급프로젝트", deadline: TOMORROW, status: "active" }],
    });
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("긴급프로젝트");  // deadline_critical wins
  });

  it("shouldPrioritizePomodoroLastOneOverDeadlineSoon", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 3,
      sessionGoal: 4,  // pomodoro_last_one
      habitsAllDoneDate: undefined,
      projects: [{ name: "프로젝트G", deadline: IN_4, status: "active" }],  // deadline_soon
    });
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("1세션");  // pomodoro_last_one wins
  });

  it("shouldPickNearestDeadlineWhenMultipleCritical", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "프로젝트X", deadline: IN_3, status: "active" },
        { name: "프로젝트Y", deadline: TOMORROW, status: "active" },
      ],
    });
    expect(result!.text).toContain("프로젝트Y");  // nearer deadline wins
  });

  // ── goal_expiry ─────────────────────────────────────────────────────────────
  it("shouldReturnGoalExpiryForWeekGoalOnLastDayOfWeek", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "이번 주 독서 3권",
      weekGoalDone: false,
      daysLeftWeek: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("주간 목표");
    expect(result!.text).toContain("오늘");
  });

  it("shouldReturnGoalExpiryForWeekGoalWhenTwoDaysLeftInWeek", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표",
      weekGoalDone: false,
      daysLeftWeek: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("주간 목표");
    expect(result!.text).toContain("2일");
  });

  it("shouldNotReturnGoalExpiryForWeekGoalWhenThreeDaysLeft", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표",
      weekGoalDone: false,
      daysLeftWeek: 3,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGoalExpiryWhenWeekGoalIsDone", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표",
      weekGoalDone: true,
      daysLeftWeek: 1,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGoalExpiryWhenWeekGoalAbsent", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: undefined,
      daysLeftWeek: 1,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnWeekGoalExpiryWhenDaysLeftWeekZero", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표",
      weekGoalDone: false,
      daysLeftWeek: 0,
    });
    expect(result!.text).toContain("오늘 마감");
  });

  it("shouldReturnWeekGoalExpiryWhenDoneUndefined", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표",
      weekGoalDone: undefined,
      daysLeftWeek: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("주간 목표 마감 임박");
  });

  it("shouldReturnGoalExpiryForMonthGoalOnLastDayOfMonth", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "이번 달 목표",
      monthGoalDone: false,
      daysLeftMonth: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("월간 목표");
    expect(result!.text).toContain("오늘");
  });

  it("shouldReturnGoalExpiryForMonthGoalWhenTwoDaysLeftInMonth", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "월간 목표",
      monthGoalDone: undefined,
      daysLeftMonth: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("월간 목표");
    expect(result!.text).toContain("2일");
  });

  it("shouldNotReturnGoalExpiryForMonthGoalWhenThreeDaysLeft", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "월간 목표",
      monthGoalDone: false,
      daysLeftMonth: 3,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGoalExpiryWhenMonthGoalIsDone", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "월간 목표",
      monthGoalDone: true,
      daysLeftMonth: 1,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnMonthGoalExpiryWhenDaysLeftMonthZero", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "월간 목표",
      monthGoalDone: false,
      daysLeftMonth: 0,
    });
    expect(result!.text).toContain("오늘 마감");
  });

  it("shouldPrioritizeWeekGoalExpiryOverMonthGoalExpiry", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표",
      weekGoalDone: false,
      daysLeftWeek: 1,
      monthGoal: "월간 목표",
      monthGoalDone: false,
      daysLeftMonth: 1,
    });
    expect(result!.text).toContain("주간 목표");  // week goal wins (shorter cycle = higher urgency)
  });

  it("shouldPrioritizeDeadlineSoonOverGoalExpiry", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "마감임박프로젝트", deadline: IN_4, status: "active" }],  // deadline_soon
      weekGoal: "주간 목표",
      weekGoalDone: false,
      daysLeftWeek: 1,  // goal_expiry
    });
    expect(result!.text).toContain("마감임박프로젝트");  // deadline_soon wins
    expect(result!.text).toContain("D-4");
  });

  it("shouldPrioritizeGoalExpiryOverProjectStale", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "방치된프로젝트", status: "active", lastFocusDate: DAYS_7_AGO }],  // project_stale
      weekGoal: "주간 목표",
      weekGoalDone: false,
      daysLeftWeek: 1,  // goal_expiry
    });
    expect(result!.text).toContain("주간 목표");  // goal_expiry wins over project_stale
  });

  // ── quarter goal expiry ────────────────────────────────────────────────────
  it("shouldReturnQuarterGoalExpiryWhenDaysLeftQuarter7", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 7,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("분기 목표 마감 임박");
    expect(result!.text).toContain("7일");
  });

  it("shouldReturnQuarterGoalExpiryWhenDaysLeftQuarter1", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 1,
    });
    expect(result!.text).toContain("오늘 마감");
  });

  it("shouldNotReturnQuarterGoalExpiryWhenDone", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "분기 목표",
      quarterGoalDone: true,
      daysLeftQuarter: 1,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnQuarterGoalExpiryWhenDoneUndefined", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "분기 목표",
      quarterGoalDone: undefined,
      daysLeftQuarter: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("분기 목표 마감 임박");
  });

  it("shouldReturnQuarterGoalExpiryWhenDaysLeftQuarterZero", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 0,
    });
    expect(result!.text).toContain("오늘 마감");
  });

  it("shouldNotReturnQuarterGoalExpiryWhenDaysLeft8", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 8,
    });
    expect(result).toBeNull();
  });

  // ── year goal expiry ───────────────────────────────────────────────────────
  it("shouldReturnYearGoalExpiryWhenDaysLeftYear14", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      yearGoalDone: false,
      daysLeftYear: 14,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("연간 목표 마감 임박");
    expect(result!.text).toContain("14일");
  });

  it("shouldReturnYearGoalExpiryWhenDaysLeftYear1", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      yearGoalDone: false,
      daysLeftYear: 1,
    });
    expect(result!.text).toContain("오늘 마감");
  });

  it("shouldNotReturnYearGoalExpiryWhenDone", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      yearGoalDone: true,
      daysLeftYear: 1,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnYearGoalExpiryWhenDoneUndefined", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      yearGoalDone: undefined,
      daysLeftYear: 10,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("연간 목표 마감 임박");
  });

  it("shouldReturnYearGoalExpiryWhenDaysLeftYearZero", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      yearGoalDone: false,
      daysLeftYear: 0,
    });
    expect(result!.text).toContain("오늘 마감");
  });

  it("shouldNotReturnYearGoalExpiryWhenDaysLeft15", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      yearGoalDone: false,
      daysLeftYear: 15,
    });
    expect(result).toBeNull();
  });

  // ── quarter/year goal expiry priority ordering ─────────────────────────────
  it("shouldPrioritizeWeekGoalOverQuarterGoal", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표",
      weekGoalDone: false,
      daysLeftWeek: 1,
      quarterGoal: "분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 7,
    });
    expect(result!.text).toContain("주간 목표");  // week goal wins
  });

  it("shouldPrioritizeMonthGoalOverQuarterGoal", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "월간 목표",
      monthGoalDone: false,
      daysLeftMonth: 1,
      quarterGoal: "분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 1,  // both at most urgent — month wins
    });
    expect(result!.text).toContain("월간 목표");  // month goal wins
  });

  it("shouldPrioritizeQuarterGoalOverYearGoal", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 7,
      yearGoal: "연간 목표",
      yearGoalDone: false,
      daysLeftYear: 14,
    });
    expect(result!.text).toContain("분기 목표");  // quarter goal wins
  });

  it("shouldPrioritizeQuarterGoalOverProjectStale", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "방치된프로젝트", status: "active", lastFocusDate: DAYS_7_AGO }],
      quarterGoal: "분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 7,
    });
    expect(result!.text).toContain("분기 목표");  // quarter goal_expiry wins over project_stale
  });

  // ── personal_best_streak ──────────────────────────────────────────────────
  it("shouldReturnPersonalBestWhenHabitReachedMilestoneAndNewBestToday", () => {
    // streak=30 is a milestone AND equals bestStreak (personal best)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 30, lastChecked: TODAY, bestStreak: 30 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("30");
    expect(result!.level).toBe("success");
  });

  it("shouldReturnNullWhenStreakAtMilestoneButBelowBestStreak", () => {
    // streak=7 IS a milestone, but bestStreak=10 > streak means it's not a new personal best
    // This specifically tests the streak === bestStreak guard (not just milestone filtering)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 7, lastChecked: TODAY, bestStreak: 10 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenNotCheckedInToday", () => {
    // must have checked in today for the insight to show
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 30, lastChecked: YESTERDAY, bestStreak: 30 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenBestStreakUndefined", () => {
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 30, lastChecked: TODAY, bestStreak: undefined }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenStreakNotAtMilestone", () => {
    // streak=10 is not a milestone (milestones are 7/30/100) — fires only at milestone boundaries
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 10, lastChecked: TODAY, bestStreak: 10 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnNullAtDayAfterFirstMilestone", () => {
    // streak=8 is the day after the first milestone (7) — must not re-trigger
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 8, lastChecked: TODAY, bestStreak: 8 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnPersonalBestAtFirstMilestone7", () => {
    // 7 days is the first milestone and the minimum threshold.
    // milestone_near (priority 3) does NOT fire here because it requires lastChecked !== todayStr;
    // lastChecked=TODAY excludes this habit from milestone_near and routes it to personal_best instead.
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 7, lastChecked: TODAY, bestStreak: 7 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("독서");
    expect(result!.text).toContain("7");
  });

  it("shouldPreferHighestMilestoneStreakWhenMultipleHitsPersonalBest", () => {
    // Both at milestones: 7 and 30; 30 wins (higher)
    const result = calcTodayInsight({
      habits: [
        { name: "독서", streak: 7, lastChecked: TODAY, bestStreak: 7 },
        { name: "운동", streak: 30, lastChecked: TODAY, bestStreak: 30 },
      ],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result!.text).toContain("운동");  // higher milestone wins
    expect(result!.text).not.toContain("독서");
  });

  it("shouldPrioritizeProjectStaleOverPersonalBest", () => {
    // project_stale (priority 9) should still beat personal_best (priority 10)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 30, lastChecked: TODAY, bestStreak: 30 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "방치된프로젝트", status: "active", lastFocusDate: DAYS_7_AGO }],
    });
    expect(result!.text).toContain("방치된프로젝트");  // project_stale wins
    expect(result!.level).toBe("info");  // stale is info, not success
  });

  it("shouldReturnPersonalBestWhenNoOtherInsightTriggers", () => {
    // Verify personal_best is the fallback when all higher-priority checks return null
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 100, lastChecked: TODAY, bestStreak: 100 }],
      todayStr: TODAY,
      nowHour: 14,  // not evening (no streak risk)
      todayIntentionDate: TODAY,  // intention already set
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      // no projects, no goals
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("100");
  });

  it("shouldReturnNullWhenBestStreakLessThanStreak", () => {
    // bestStreak < streak is a data-corruption state (bestStreak should always be ≥ streak).
    // The filter condition streak === bestStreak correctly rejects this case.
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 30, lastChecked: TODAY, bestStreak: 20 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  // ── period_start ────────────────────────────────────────────────────────────
  // Test dates (verified against day-of-week):
  //   "2024-01-01" = Monday  (year + quarter + month + week start)
  //   "2024-01-22" = Monday  (week start only)
  //   "2024-02-01" = Thursday (month start only)
  //   "2024-04-01" = Monday  (quarter + month + week start)

  it("shouldReturnWeekStartWhenMondayMorningIntentionSetNoWeekGoal", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-22", // Monday, not 1st of month
      nowHour: 9,
      todayIntentionDate: "2024-01-22", // intention already set
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("새 주");
    expect(result!.level).toBe("info");
  });

  it("shouldNotReturnWeekStartWhenWeekGoalAlreadySet", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-22",
      nowHour: 9,
      todayIntentionDate: "2024-01-22",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "이번 주 독서 2권",
    });
    expect(result).toBeNull(); // no other triggers, week goal set → no period_start
  });

  it("shouldNotReturnWeekStartWhenNotMonday", () => {
    // TODAY = "2024-01-15" is a Monday; use Tuesday "2024-01-16" to confirm no week_start fires
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-16", // Tuesday
      nowHour: 9,
      todayIntentionDate: "2024-01-16",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnWeekStartAfterNoon", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-22",
      nowHour: 13, // afternoon
      todayIntentionDate: "2024-01-22",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnPeriodStartWhenIntentionNotSet", () => {
    // intention_missing (priority 5) fires first — period_start requires intention already set
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-22", // Monday
      nowHour: 9,
      todayIntentionDate: undefined, // intention NOT set today
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("의도"); // intention_missing fires, not week_start
  });

  it("shouldReturnMonthStartWhenFirstOfMonthMorningIntentionSetNoMonthGoal", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-02-01", // February 1, Thursday — month start, not quarter start
      nowHour: 9,
      todayIntentionDate: "2024-02-01",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("새 달");
    expect(result!.level).toBe("info");
  });

  it("shouldNotReturnMonthStartWhenMonthGoalAlreadySet", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-02-01",
      nowHour: 9,
      todayIntentionDate: "2024-02-01",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "2월 운동 20회",
    });
    expect(result).toBeNull();
  });

  it("shouldReturnQuarterStartWhenApr1MorningIntentionSetNoQuarterGoalYearGoalSet", () => {
    // April 1, 2024 = Monday; yearGoal set → skip year, quarterGoal not set → quarter_start
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-04-01",
      nowHour: 9,
      todayIntentionDate: "2024-04-01",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표", // already set
      quarterGoal: undefined, // not set
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("새 분기");
    expect(result!.level).toBe("info");
  });

  it("shouldReturnYearStartWhenJan1MorningIntentionSetNoYearGoal", () => {
    // January 1, 2024 = Monday; yearGoal not set → year_start (highest priority)
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-01",
      nowHour: 9,
      todayIntentionDate: "2024-01-01",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("새 해");
    expect(result!.level).toBe("info");
  });

  it("shouldPrioritizeYearOverQuarterOverMonthOverWeekOnJan1", () => {
    // Jan 1 is simultaneously year + quarter + month + week start.
    // With no yearGoal: year_start fires first.
    const resultYear = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-01",
      nowHour: 9,
      todayIntentionDate: "2024-01-01",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: undefined,
      quarterGoal: undefined,
    });
    expect(resultYear!.text).toContain("새 해");

    // With yearGoal set but no quarterGoal: quarter_start fires.
    const resultQuarter = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-01",
      nowHour: 9,
      todayIntentionDate: "2024-01-01",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      quarterGoal: undefined,
    });
    expect(resultQuarter!.text).toContain("새 분기");

    // With yearGoal + quarterGoal set but no monthGoal: month_start fires.
    const resultMonth = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-01",
      nowHour: 9,
      todayIntentionDate: "2024-01-01",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      quarterGoal: "분기 목표",
      monthGoal: undefined,
    });
    expect(resultMonth!.text).toContain("새 달");

    // With yearGoal + quarterGoal + monthGoal set but no weekGoal: week_start fires.
    const resultWeek = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-01",
      nowHour: 9,
      todayIntentionDate: "2024-01-01",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      quarterGoal: "분기 목표",
      monthGoal: "월간 목표",
      weekGoal: undefined,
    });
    expect(resultWeek!.text).toContain("새 주");
  });

  it("shouldPrioritizeMonthStartOverWeekStartWhenBothApply", () => {
    // Apr 1, 2024 = Monday → month start + week start simultaneously.
    // month goal not set: month_start wins over week_start.
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-04-01",
      nowHour: 9,
      todayIntentionDate: "2024-04-01",
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "연간 목표",
      quarterGoal: "분기 목표",
      monthGoal: undefined, // not set → month_start fires
      weekGoal: undefined,  // not set too, but month takes precedence
    });
    expect(result!.text).toContain("새 달");
  });

  it("shouldPrioritizeIntentionMissingOverPeriodStart", () => {
    // If intention is not set, intention_missing (priority 5) beats period_start (priority 6).
    const result = calcTodayInsight({
      habits: [],
      todayStr: "2024-01-22", // Monday
      nowHour: 9,
      todayIntentionDate: undefined, // NOT set
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: undefined,
    });
    expect(result!.text).toContain("의도"); // intention_missing, not week_start
    expect(result!.text).not.toContain("새 주");
  });
});
