// ABOUTME: Tests for calcTodayInsight — context-aware daily insight surfacing
// ABOUTME: Covers all fifteen insight types and their priority ordering (including no_focus_project, pomodoro_goal_reached, momentum_decline + momentum_rise)

import { describe, it, expect } from "vitest";
import { calcTodayInsight } from "./insight";

const TODAY = "2024-01-15";
const YESTERDAY = "2024-01-14";
const TOMORROW = "2024-01-16";
const IN_3 = "2024-01-18";
const IN_4 = "2024-01-19";
const IN_7 = "2024-01-22";
const IN_8 = "2024-01-23";
const DAYS_2_AGO = "2024-01-13";
const DAYS_3_AGO = "2024-01-12";
const DAYS_4_AGO = "2024-01-11";
const DAYS_5_AGO = "2024-01-10";
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

  // ── pomodoro_goal_reached ───────────────────────────────────────────────────
  it("shouldReturnPomodoroGoalReachedWhenSessionsEqualGoal", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 3,
      sessionGoal: 3,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("포모도로");
    expect(result!.text).toContain("달성");
    expect(result!.text).toContain("3/3"); // pins down the (sessionsToday/sessionGoal) format
  });

  it("shouldReturnPomodoroGoalReachedWhenSessionsExceedGoal", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 5,
      sessionGoal: 3,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("포모도로");
    expect(result!.text).toContain("달성");
    expect(result!.text).toContain("5/3"); // sessionsToday shown even when exceeding goal
  });

  it("shouldNotReturnPomodoroGoalReachedWhenGoalUndefined", () => {
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

  it("shouldNotReturnPomodoroGoalReachedWhenGoalNotYetMet", () => {
    // sessionsToday=1, sessionGoal=4 → 1<4 and 1!==3(last_one) → neither fires
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 1,
      sessionGoal: 4,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnPomodoroGoalReachedWhenGoalIsZero", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 3,
      sessionGoal: 0,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldPomodoroGoalReachedFireBeforeDeadlineSoon", () => {
    // goal_reached (7.5) fires before deadline_soon (8) — project with D-4 deadline
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 3,
      sessionGoal: 3,
      habitsAllDoneDate: undefined,
      projects: [{ name: "D4프로젝트", status: "active", deadline: IN_4 }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("포모도로"); // goal_reached wins over deadline_soon
  });

  it("shouldNotReturnPomodoroGoalReachedWhenPerfectDayActive", () => {
    // perfect_day (priority 4) fires before pomodoro_goal_reached (7.5)
    const result = calcTodayInsight({
      habits: [habit("운동", 5, TODAY)],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 3,
      sessionGoal: 3,
      habitsAllDoneDate: TODAY,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한"); // perfect_day wins
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

  // ── project_behind ─────────────────────────────────────────────────────────
  // createdDate 30 days ago, deadline 30 days from NOW → timePct=50%; progress=10% → gap=-40 (fires)
  // TODAY="2024-01-15", DAYS_30_AGO="2023-12-16", IN_30="2024-02-14", IN_14="2024-01-29"
  const DAYS_30_AGO = "2023-12-16";
  const IN_30 = "2024-02-14";
  const IN_14 = "2024-01-29";

  it("shouldReturnProjectBehindWhenGapExceeds20Percent", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      // timePct=50%, progress=10% → gap=-40 → fires
      projects: [{ name: "앱개발", status: "active", deadline: IN_30, createdDate: DAYS_30_AGO, progress: 10 }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("앱개발");
    expect(result!.text).toContain("40");
  });

  it("shouldNotReturnProjectBehindWhenGapBelow20Percent", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      // timePct=50%, progress=35% → gap=-15 → does not fire
      projects: [{ name: "순탄한프로젝트", status: "active", deadline: IN_30, createdDate: DAYS_30_AGO, progress: 35 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectBehindForDoneProject", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "완료됨", status: "done", deadline: IN_30, createdDate: DAYS_30_AGO, progress: 10 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectBehindForPausedProject", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "일시중지", status: "paused", deadline: IN_30, createdDate: DAYS_30_AGO, progress: 10 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectBehindWhenCreatedDateAbsent", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      // No createdDate → calcScheduleGap returns null
      projects: [{ name: "신규프로젝트", status: "active", deadline: IN_30, progress: 10 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectBehindWhenProgressAbsent", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      // No progress → treated as absent, skips calcScheduleGap
      projects: [{ name: "진행불명", status: "active", deadline: IN_30, createdDate: DAYS_30_AGO }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectBehindWhenTimePctTooLow", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      // createdDate=yesterday → 1/31 days elapsed = ~3% timePct < 10 → calcScheduleGap returns null
      projects: [{ name: "막시작프로젝트", status: "active", deadline: IN_30, createdDate: YESTERDAY, progress: 0 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectBehindWhenDeadlineWithin7Days", () => {
    // deadline_soon fires for IN_7 (7 days away); project_behind filters to > 7 days only
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "임박한프로젝트", status: "active", deadline: IN_7, createdDate: DAYS_30_AGO, progress: 10 }],
    });
    // deadline_soon fires (D-7), not project_behind
    expect(result).not.toBeNull();
    expect(result!.text).toContain("D-7");
    expect(result!.text).not.toContain("뒤처짐");
  });

  it("shouldReturnProjectBehindWhenDeadlineIs8DaysAway", () => {
    // IN_8 = 8 days away → NOT caught by deadline_soon (4-7d) → project_behind fires
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      // 8 days to deadline, 30 days elapsed out of 38 → timePct=79%, progress=10% → gap=-69 → fires
      projects: [{ name: "마감근접뒤처짐", status: "active", deadline: IN_8, createdDate: DAYS_30_AGO, progress: 10 }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("마감근접뒤처짐");
    expect(result!.text).toContain("69"); // 30 days elapsed / 38 total → timePct=79%, gap=10-79=-69
    expect(result!.text).toContain("뒤처짐");
  });

  it("shouldPrioritizeProjectBehindOverProjectStaleWhenBothPresent", () => {
    // project_behind (8.5) fires before project_stale (10)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "뒤처진프로젝트", status: "active", deadline: IN_14, createdDate: DAYS_30_AGO, progress: 10 },
        { name: "방치된프로젝트", status: "active", lastFocusDate: DAYS_7_AGO },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("뒤처진프로젝트");
    expect(result!.text).toContain("뒤처짐");
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

  // ── goal_midpoint ─────────────────────────────────────────────────────────
  it("shouldReturnGoalMidpointForWeekGoalOnThursday", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "이번 주 독서",
      weekGoalDone: false,
      daysLeftWeek: 4,   // Thursday — 3 days elapsed, 4 remaining → mid-week
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("주간 목표");
    expect(result!.text).toContain("중반");
  });

  it("shouldNotReturnGoalMidpointWhenWeekGoalIsDone", () => {
    // goal_midpoint must NOT fire when done; goal_done (10.7) fires instead (daysLeftWeek=4 > 2)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "이번 주 독서",
      weekGoalDone: true,   // done: goal_midpoint must NOT fire
      daysLeftWeek: 4,
    });
    expect(result?.text).not.toContain("중반"); // goal_midpoint suppressed
    expect(result?.text).toContain("달성"); // goal_done surfaces instead
  });

  it("shouldNotReturnGoalMidpointWhenDaysLeftWeekIsNotFour", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "이번 주 독서",
      weekGoalDone: false,
      daysLeftWeek: 5,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnGoalMidpointForMonthGoalWhenSixteenDaysLeft", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "이번 달 운동 20회",
      monthGoalDone: false,
      daysLeftMonth: 16,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("월간 목표");
    expect(result!.text).toContain("중반");
  });

  it("shouldReturnGoalMidpointForMonthGoalWhenFifteenDaysLeft", () => {
    // 15 covers shorter months (28–29 days) at their midpoint
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
      daysLeftMonth: 15,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("월간 목표");
    expect(result!.text).toContain("중반");
  });

  it("shouldNotReturnGoalMidpointForMonthGoalWhenNotAtMidpoint", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "이번 달 운동 20회",
      monthGoalDone: false,
      daysLeftMonth: 20,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGoalMidpointForMonthGoalWhenDone", () => {
    // goal_midpoint must NOT fire when done; goal_done (10.7) fires instead (daysLeftMonth=16 > 2)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "이번 달 목표",
      monthGoalDone: true,
      daysLeftMonth: 16,
    });
    expect(result?.text).not.toContain("중반"); // goal_midpoint suppressed
    expect(result?.text).toContain("달성"); // goal_done surfaces instead
  });

  it("shouldReturnGoalMidpointForQuarterGoalWhenFortySixDaysLeft", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "이번 분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 46,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("분기 목표");
    expect(result!.text).toContain("중반");
  });

  it("shouldReturnGoalMidpointForQuarterGoalWhenFortySevenDaysLeft", () => {
    // 47 covers 92-day quarters (Q3/Q4) at midpoint
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "이번 분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 47,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("분기 목표");
    expect(result!.text).toContain("중반");
  });

  it("shouldNotReturnGoalMidpointForQuarterGoalWhenFortyEightDaysLeft", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "이번 분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 48,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnGoalMidpointForYearGoalWhenOneHundredEightyThreeDaysLeft", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "올해 목표",
      yearGoalDone: false,
      daysLeftYear: 183,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("연간 목표");
    expect(result!.text).toContain("중반");
  });

  it("shouldReturnGoalMidpointForYearGoalWhenOneHundredEightyFourDaysLeft", () => {
    // 184 = day 183 of a 366-day leap year (exact midpoint day); also covered by daysLeft=183 for plain years
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "올해 목표",
      yearGoalDone: false,
      daysLeftYear: 184,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("연간 목표");
    expect(result!.text).toContain("중반");
  });

  it("shouldNotReturnGoalMidpointForYearGoalWhenOneHundredEightyFiveDaysLeft", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "올해 목표",
      yearGoalDone: false,
      daysLeftYear: 185,
    });
    expect(result).toBeNull();
  });

  it("shouldPreferYearGoalMidpointOverWeekGoalMidpointWhenBothAtMidpoint", () => {
    // Cascade: year > quarter > month > week (largest period wins)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간", weekGoalDone: false, daysLeftWeek: 4,
      monthGoal: "월간", monthGoalDone: false, daysLeftMonth: 16,
      quarterGoal: "분기", quarterGoalDone: false, daysLeftQuarter: 46,
      yearGoal: "연간", yearGoalDone: false, daysLeftYear: 183,
    });
    expect(result!.text).toContain("연간 목표");
  });

  it("shouldPreferGoalExpiryOverGoalMidpointWhenBothPresent", () => {
    // goal_expiry (9) has higher priority than goal_midpoint (9.3)
    // weekGoal expiring (daysLeftWeek=1) + monthGoal at midpoint (daysLeftMonth=16)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표", weekGoalDone: false, daysLeftWeek: 1,
      monthGoal: "월간 목표", monthGoalDone: false, daysLeftMonth: 16,
    });
    expect(result!.text).toContain("주간 목표");
    expect(result!.text).toContain("오늘");  // goal_expiry suffix
  });

  it("shouldPreferGoalMidpointOverMomentumDecline", () => {
    // goal_midpoint (9.3) fires before momentum_decline (9.5)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "월간 목표", monthGoalDone: false, daysLeftMonth: 16,
      momentumHistory: [
        { date: DAYS_2_AGO, score: 70, tier: "high" },
        { date: YESTERDAY, score: 50, tier: "mid" },
        { date: TODAY, score: 30, tier: "low" },
      ],
    });
    expect(result!.text).toContain("월간 목표");
    expect(result!.text).toContain("중반");
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
    // nowHour:12 prevents almost_perfect_day (≥14h gate) from also firing on this single-habit fixture
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 30, lastChecked: YESTERDAY, bestStreak: 30 }],
      todayStr: TODAY,
      nowHour: 12,
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

  // Jan 1, 2024 = Monday → year + quarter + month + week start simultaneously.
  it("shouldReturnYearStartWhenNoYearGoalOnJan1", () => {
    const result = calcTodayInsight({
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
    expect(result!.text).toContain("새 해");
  });

  it("shouldReturnQuarterStartWhenYearGoalSetOnJan1", () => {
    const result = calcTodayInsight({
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
    expect(result!.text).toContain("새 분기");
  });

  it("shouldReturnMonthStartWhenYearAndQuarterGoalSetOnJan1", () => {
    const result = calcTodayInsight({
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
    expect(result!.text).toContain("새 달");
  });

  it("shouldReturnWeekStartWhenYearQuarterMonthGoalSetOnJan1", () => {
    const result = calcTodayInsight({
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
    expect(result!.text).toContain("새 주");
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

  // ── streak_recession ───────────────────────────────────────────────────────
  it("shouldReturnStreakRecessionWhenStreakBrokeYesterday", () => {
    // streak=7, lastChecked=2 days ago → first morning after streak definitively broke
    const result = calcTodayInsight({
      habits: [habit("운동", 7, DAYS_2_AGO)],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("💔");
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("7");
  });

  it("shouldNotReturnStreakRecessionWhenLastCheckedYesterday", () => {
    // Yesterday checked — streak still intact; recession condition requires lastChecked === 2 days ago
    // nowHour:12 prevents almost_perfect_day (≥14h) from firing on this single-habit fixture
    const result = calcTodayInsight({
      habits: [habit("운동", 10, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnStreakRecessionWhenCheckedToday", () => {
    // Checked today — streak is not broken; no recession
    const result = calcTodayInsight({
      habits: [habit("운동", 10, TODAY)],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnStreakRecessionWhenStreakBelow7", () => {
    // streak=5 (below the 7-day significance threshold) — recession does not fire
    // nowHour:12 prevents almost_perfect_day (≥14h) from firing on this single-habit fixture
    const result = calcTodayInsight({
      habits: [habit("운동", 5, DAYS_2_AGO)],
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnHighestStreakHabitWhenMultipleStreakRecessionsQualify", () => {
    // Both habits broke yesterday — recession picks the one with higher streak
    const result = calcTodayInsight({
      habits: [
        habit("요가", 7, DAYS_2_AGO),
        habit("운동", 12, DAYS_2_AGO),
      ],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("12");
    expect(result!.text).not.toContain("요가");
  });

  it("shouldPrioritizeStreakAtRiskOverStreakRecessionInEvening", () => {
    // Evening (≥18): streak_at_risk (priority 1) fires before streak_recession (priority 10.1).
    // The recession habit (lastChecked=DAYS_2_AGO) also qualifies for at-risk (lastChecked !== today).
    const result = calcTodayInsight({
      habits: [habit("운동", 12, DAYS_2_AGO)],
      todayStr: TODAY,
      nowHour: 19,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    // streak_at_risk fires since lastChecked !== todayStr in the evening
    expect(result!.text).toContain("스트릭 위험");
    expect(result!.text).not.toContain("💔");
  });

  it("shouldReturnStreakRecessionInMorningHours", () => {
    // Explicitly confirms recession fires at morning hours (< 12) when no higher-priority insight blocks it.
    // weekGoal provided to suppress period_start (TODAY = 2024-01-15 = Monday, nowHour < 12).
    const result = calcTodayInsight({
      habits: [habit("운동", 9, DAYS_2_AGO)],
      todayStr: TODAY,
      nowHour: 8,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("💔");
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("9");
  });

  it("shouldNotReturnStreakRecessionOnDay3OfBreak", () => {
    // Day 3 of a broken streak: lastChecked === DAYS_3_AGO (not 2 days ago).
    // streak_recession condition (lastChecked === dayBeforeYesterday) is false → does not fire.
    // habit_consecutive_miss handles this via checkHistory; without checkHistory it returns null.
    // nowHour:12 prevents almost_perfect_day (≥14h) from firing on this single-habit fixture
    const result = calcTodayInsight({
      habits: [habit("운동", 9, DAYS_3_AGO)],
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    // streak_recession does not fire (lastChecked is 3 days ago, not 2)
    expect(result).toBeNull();
  });
});

// Helper: 3-day declining momentum history anchored to TODAY
const DECLINING_HISTORY = [
  { date: "2024-01-13", score: 80, tier: "high" as const },
  { date: "2024-01-14", score: 60, tier: "mid" as const },
  { date: "2024-01-15", score: 40, tier: "mid" as const },
];

describe("calcTodayInsight — momentum_decline (priority 9.5, before project_stale)", () => {
  it("shouldReturnMomentumDeclineWhenThreeDayDeclineAndNoHigherPriorityInsight", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      momentumHistory: DECLINING_HISTORY,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("하락");
    expect(result!.level).toBe("warning");
  });

  it("shouldReturnNullWhenMomentumHistoryAbsent", () => {
    // All other conditions are inert (nowHour=15 skips streak_at_risk, no habits/projects/goals/sessions).
    // The only potential insight would be momentum_decline, but no history → null.
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      // no momentumHistory
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnDeclineWhenMomentumIsRising", () => {
    // Rising trend does NOT trigger momentum_decline; momentum_rise (10.5) handles this instead
    const rising = [
      { date: "2024-01-13", score: 40, tier: "mid" as const },
      { date: "2024-01-14", score: 60, tier: "mid" as const },
      { date: "2024-01-15", score: 80, tier: "high" as const },
    ];
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      momentumHistory: rising,
    });
    expect(result).not.toBeNull(); // momentum_rise fires
    expect(result!.text).not.toContain("하락"); // decline does NOT fire
  });

  it("shouldReturnNullWhenOnlyTwoHistoryEntries", () => {
    const twoEntries = [
      { date: "2024-01-14", score: 70, tier: "mid" as const },
      { date: "2024-01-15", score: 50, tier: "mid" as const },
    ];
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      momentumHistory: twoEntries,
    });
    expect(result).toBeNull();
  });

  it("shouldPrioritizePerfectDayOverMomentumDecline", () => {
    // perfect_day (priority 4) > momentum_decline (priority 9.5)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY, // all habits done today
      momentumHistory: DECLINING_HISTORY,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽");
  });

  it("shouldPrioritizeMomentumDeclineOverProjectStaleWhenBothPresent", () => {
    // momentum_decline (9.5) fires BEFORE project_stale (10):
    // project neglected 8 days but 3-day decline exists → decline wins
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "SideProject", deadline: undefined, status: "active", lastFocusDate: "2024-01-07" }],
      momentumHistory: DECLINING_HISTORY,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("하락"); // decline beats stale
  });

  it("shouldShowProjectStaleWhenNoDecline", () => {
    // No momentum decline → project_stale surfaces
    const stable = [
      { date: "2024-01-13", score: 60, tier: "mid" as const },
      { date: "2024-01-14", score: 60, tier: "mid" as const },
      { date: "2024-01-15", score: 60, tier: "mid" as const },
    ];
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "SideProject", deadline: undefined, status: "active", lastFocusDate: "2024-01-07" }],
      momentumHistory: stable,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("SideProject"); // project_stale
  });
});

// Helper: 3-day rising momentum history anchored to TODAY
const RISING_HISTORY = [
  { date: "2024-01-13", score: 40, tier: "mid" as const },
  { date: "2024-01-14", score: 60, tier: "mid" as const },
  { date: "2024-01-15", score: 80, tier: "high" as const },
];

describe("calcTodayInsight — momentum_rise (priority 10.5, after project_stale)", () => {
  it("shouldReturnMomentumRiseWhenThreeDayRiseAndNoHigherPriorityInsight", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      momentumHistory: RISING_HISTORY,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("상승");
    expect(result!.level).toBe("success");
  });

  it("shouldReturnNullWhenMomentumIsStableNotRising", () => {
    const stable = [
      { date: "2024-01-13", score: 60, tier: "mid" as const },
      { date: "2024-01-14", score: 60, tier: "mid" as const },
      { date: "2024-01-15", score: 60, tier: "mid" as const },
    ];
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      momentumHistory: stable,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenOnlyTwoHistoryEntriesForRise", () => {
    // calcMomentumTrend requires 3 consecutive calendar days (2d_ago, yesterday, today).
    // With only yesterday + today entries, 2d_ago is missing → returns null regardless of scores.
    const twoRising = [
      { date: YESTERDAY, score: 50, tier: "mid" as const },
      { date: TODAY, score: 80, tier: "high" as const },
    ];
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      momentumHistory: twoRising,
    });
    expect(result).toBeNull();
  });

  it("shouldPrioritizeProjectStaleOverMomentumRise", () => {
    // project_stale (10) fires BEFORE momentum_rise (10.5):
    // project neglected 8 days + 3-day rise → stale wins
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "SideProject", deadline: undefined, status: "active", lastFocusDate: "2024-01-07" }],
      momentumHistory: RISING_HISTORY,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("SideProject"); // stale beats rise
  });

  it("shouldPrioritizeMomentumRiseOverPersonalBest", () => {
    // momentum_rise (10.5) fires BEFORE personal_best (11)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 7, lastChecked: TODAY, bestStreak: 7 }],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      momentumHistory: RISING_HISTORY,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("상승"); // rise beats personal_best
  });

  // ── habit_consecutive_miss ──────────────────────────────────────────────────
  // nowHour: 14 prevents period_start (only fires < 12) and streak_at_risk (only fires ≥ 18).
  // Miss count = days between today (exclusive) and last check (exclusive).
  // If last check = DAYS_N_AGO, miss count = N - 1.
  // → DAYS_4_AGO as last check → miss count = 3 (yesterday + DAYS_2_AGO + DAYS_3_AGO)
  it("shouldReturnHabitConsecutiveMissWhenHabitMissed3DaysInARow", () => {
    // last check 4 days ago → yesterday, DAYS_2_AGO, DAYS_3_AGO missing = 3 consecutive misses
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 0, checkHistory: [DAYS_4_AGO] }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("3");
  });

  it("shouldNotReturnHabitConsecutiveMissWhenMissedOnly2Days", () => {
    // last check 3 days ago → yesterday + DAYS_2_AGO missing = 2 consecutive misses, below threshold
    // nowHour:12 prevents almost_perfect_day (≥14h) from firing on this single-habit fixture
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 0, checkHistory: [DAYS_3_AGO] }],
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnHabitConsecutiveMissWhenCheckedYesterday", () => {
    // habit checked yesterday → i=1 hits history immediately, count stays 0
    // nowHour:12 prevents almost_perfect_day (≥14h) from firing on this single-habit fixture
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 5, checkHistory: [YESTERDAY] }],
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldPickMostNeglectedHabitWhenMultipleMissed", () => {
    // 독서: last check 4d ago → 3 misses; 운동: last check 6d ago → 5 misses → 운동 reported
    const result = calcTodayInsight({
      habits: [
        { name: "독서", streak: 0, checkHistory: [DAYS_4_AGO] },
        { name: "운동", streak: 0, checkHistory: [DAYS_6_AGO] },
      ],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("5");
  });

  it("shouldReturnHabitConsecutiveMissWhenCheckHistoryEmpty", () => {
    // Explicit empty array → full 14-day window all missed → missedDays=14
    const result = calcTodayInsight({
      habits: [{ name: "명상", streak: 0, checkHistory: [] }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("명상");
    expect(result!.text).toContain("14");
  });

  it("shouldNotReturnHabitConsecutiveMissWhenCheckHistoryAbsent", () => {
    // undefined checkHistory = no data available → skip, never counts as missed
    // nowHour:12 prevents almost_perfect_day (≥14h) from firing on this single-habit fixture
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 0 }],  // checkHistory field absent
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldPrioritizeProjectStaleOverHabitConsecutiveMiss", () => {
    // project_stale (10) fires before habit_consecutive_miss (10.2)
    // habit: last check 4d ago → 3 consecutive misses (qualifies)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 0, checkHistory: [DAYS_4_AGO] }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "앱개발", status: "active", lastFocusDate: DAYS_7_AGO }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("앱개발"); // project_stale wins
  });

  it("shouldPrioritizeHabitConsecutiveMissOverMomentumRise", () => {
    // habit_consecutive_miss (10.2) fires before momentum_rise (10.5)
    // habit: last check 4d ago → 3 consecutive misses (qualifies)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 0, checkHistory: [DAYS_4_AGO] }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      momentumHistory: RISING_HISTORY,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동"); // consecutive miss wins over momentum rise
  });
});

describe("calcTodayInsight — no_focus_project (priority 6.5, between period_start and pomodoro)", () => {
  it("shouldReturnNoFocusProjectWhenMorningActiveProjectNoFocusSet", () => {
    // Tuesday morning, intention set, one active project with no isFocus → nudge fires
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW, // "2024-01-16" (Tuesday, non-period-start day)
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "앱개발", status: "active" }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("집중");
    expect(result!.level).toBe("info");
  });

  it("shouldNotReturnNoFocusProjectWhenFocusAlreadySet", () => {
    // Focus project is starred → specific nudge should not appear
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "앱개발", status: "active", isFocus: true }],
    });
    expect(result?.text ?? "").not.toContain("집중 프로젝트를 선택");
  });

  it("shouldNotReturnNoFocusProjectWhenIntentionNotSet", () => {
    // Intention not set → intention_missing (priority 5) fires; no_focus_project should not surface
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: undefined, // intention NOT set
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "앱개발", status: "active" }],
    });
    expect(result?.text ?? "").not.toContain("집중 프로젝트를 선택"); // intention_missing fires instead
    expect(result?.text ?? "").toContain("의도"); // intention_missing wins
  });

  it("shouldNotReturnNoFocusProjectWhenAfternoon", () => {
    // nowHour >= 12 → afternoon nudge skipped
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW,
      nowHour: 13,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "앱개발", status: "active" }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnNoFocusProjectWhenAllProjectsDoneOrPaused", () => {
    // No active/in-progress projects → nudge irrelevant
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "완료됨", status: "done" },
        { name: "멈춤", status: "paused" },
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnNoFocusProjectWhenProjectsAbsent", () => {
    // No projects at all → nudge should not fire
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnNoFocusProjectWhenProjectsEmpty", () => {
    // Empty projects array → nudge should not fire
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [],
    });
    expect(result).toBeNull();
  });

  it("shouldShowActiveProjectCountInText", () => {
    // Two active projects, no focus → count appears in text
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW,
      nowHour: 8,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "앱개발", status: "active" },
        { name: "블로그", status: "in-progress" },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("2");
  });

  it("shouldExcludeDoneAndPausedFromActiveCount", () => {
    // 2 active + 1 done + 1 paused → count shows 2
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW,
      nowHour: 8,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "앱개발", status: "active" },
        { name: "블로그", status: "in-progress" },
        { name: "완료됨", status: "done" },
        { name: "멈춤", status: "paused" },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("2");
    expect(result!.text).not.toContain("4");
  });

  it("shouldPrioritizePeriodStartOverNoFocusProject", () => {
    // Monday morning + intention set + no weekGoal → period_start (6) fires before no_focus_project (6.5)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY, // "2024-01-15" (Monday)
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: undefined,
      projects: [{ name: "앱개발", status: "active" }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("새 주"); // period_start wins
  });

  it("shouldFireNoFocusProjectOnMondayWhenWeekGoalAlreadySet", () => {
    // Monday morning + weekGoal set → period_start suppressed → no_focus_project fires
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY, // Monday
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "주간 목표",
      projects: [{ name: "앱개발", status: "active" }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("집중"); // no_focus_project fires since period_start is suppressed
  });

  it("shouldPrioritizeNoFocusProjectOverDeadlineSoon", () => {
    // Morning + no focus project + project deadline in 6 days (TOMORROW→IN_7) → no_focus_project (6.5) beats deadline_soon (8)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TOMORROW, // Tuesday
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "앱개발", status: "active", deadline: IN_7 }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("집중"); // no_focus_project wins over deadline_soon
  });
});

describe("calcTodayInsight — goal_done (priority 10.7, after momentum_rise, before personal_best)", () => {
  // Base params with no higher-priority triggers:
  // - nowHour=14 avoids streak_at_risk (≥18) and intention_missing/period_start (< 12)
  // - no habits with streaks at risk, no deadlines, no momentum trend, no missed habits
  const base = {
    habits: [],
    todayStr: TODAY,
    nowHour: 14,
    todayIntentionDate: TODAY,
    sessionsToday: 0,
    sessionGoal: undefined,
    habitsAllDoneDate: undefined,
  };

  it("shouldReturnWeekGoalDoneWhenDoneAndDaysRemaining", () => {
    const result = calcTodayInsight({
      ...base,
      weekGoal: "주간 목표",
      weekGoalDone: true,
      daysLeftWeek: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("주간 목표 달성");
    expect(result!.text).toContain("5");
  });

  it("shouldReturnMonthGoalDoneWhenDoneAndDaysRemaining", () => {
    const result = calcTodayInsight({
      ...base,
      monthGoal: "월간 목표",
      monthGoalDone: true,
      daysLeftMonth: 15,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("월간 목표 달성");
    expect(result!.text).toContain("15");
  });

  it("shouldReturnQuarterGoalDoneWhenDoneAndDaysRemaining", () => {
    const result = calcTodayInsight({
      ...base,
      quarterGoal: "분기 목표",
      quarterGoalDone: true,
      daysLeftQuarter: 30,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("분기 목표 달성");
    expect(result!.text).toContain("30");
  });

  it("shouldReturnYearGoalDoneWhenDoneAndDaysRemaining", () => {
    const result = calcTodayInsight({
      ...base,
      yearGoal: "연간 목표",
      yearGoalDone: true,
      daysLeftYear: 100,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("연간 목표 달성");
    expect(result!.text).toContain("100");
  });

  it("shouldNotReturnWeekGoalDoneWhenDaysLeftAtExpiryThreshold", () => {
    // daysLeftWeek = 2 → goal_done threshold is > 2, so goal_done itself suppresses at ≤ 2.
    // (goal_expiry cannot coexist here — it requires !weekGoalDone. The ≤ 2 dead zone is intentional:
    //  no insight fires when the goal is already done and the period is nearly over.)
    const result = calcTodayInsight({
      ...base,
      weekGoal: "주간 목표",
      weekGoalDone: true,
      daysLeftWeek: 2,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnWeekGoalDoneWhenDaysLeftJustAboveThreshold", () => {
    // daysLeftWeek = 3 → just above expiry threshold; goal_done fires
    const result = calcTodayInsight({
      ...base,
      weekGoal: "주간 목표",
      weekGoalDone: true,
      daysLeftWeek: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("주간 목표 달성");
  });

  it("shouldNotReturnWeekGoalDoneWhenNotMarkedDone", () => {
    const result = calcTodayInsight({
      ...base,
      weekGoal: "주간 목표",
      weekGoalDone: false,
      daysLeftWeek: 5,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnWeekGoalDoneWhenGoalTextAbsent", () => {
    const result = calcTodayInsight({
      ...base,
      weekGoalDone: true,
      daysLeftWeek: 5,
    });
    expect(result).toBeNull();
  });

  it("shouldCascadeYearOverWeekForGoalDone", () => {
    // year > quarter > month > week: yearGoalDone takes precedence over weekGoalDone
    const result = calcTodayInsight({
      ...base,
      weekGoal: "주간 목표",
      weekGoalDone: true,
      daysLeftWeek: 5,
      yearGoal: "연간 목표",
      yearGoalDone: true,
      daysLeftYear: 100,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("연간 목표 달성"); // year wins
  });

  it("shouldCascadeMonthOverWeekForGoalDone", () => {
    // month > week: monthGoalDone takes precedence when both done
    const result = calcTodayInsight({
      ...base,
      weekGoal: "주간 목표",
      weekGoalDone: true,
      daysLeftWeek: 5,
      monthGoal: "월간 목표",
      monthGoalDone: true,
      daysLeftMonth: 15,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("월간 목표 달성"); // month wins
  });

  it("shouldPrioritizeMomentumRiseOverGoalDone", () => {
    // momentum_rise (10.5) fires before goal_done (10.7)
    const result = calcTodayInsight({
      ...base,
      weekGoal: "주간 목표",
      weekGoalDone: true,
      daysLeftWeek: 5,
      momentumHistory: RISING_HISTORY,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("상승"); // momentum_rise wins
  });

  it("shouldPrioritizeGoalDoneOverPersonalBest", () => {
    // goal_done (10.7) fires before personal_best (11)
    const result = calcTodayInsight({
      ...base,
      habits: [{ name: "운동", streak: 7, lastChecked: TODAY, bestStreak: 7 }],
      weekGoal: "주간 목표",
      weekGoalDone: true,
      daysLeftWeek: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("주간 목표 달성"); // goal_done wins over personal_best
  });

  // ── boundary tests: month / quarter / year thresholds ─────────────────────
  it("shouldNotReturnMonthGoalDoneWhenDaysLeftAtExpiryThreshold", () => {
    // daysLeftMonth = 2 → goal_done threshold is > 2; silent null (dead zone, intentional)
    const result = calcTodayInsight({
      ...base,
      monthGoal: "월간 목표",
      monthGoalDone: true,
      daysLeftMonth: 2,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnMonthGoalDoneWhenDaysLeftJustAboveThreshold", () => {
    // daysLeftMonth = 3 → first value above month threshold (> 2); goal_done fires
    const result = calcTodayInsight({
      ...base,
      monthGoal: "월간 목표",
      monthGoalDone: true,
      daysLeftMonth: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("월간 목표 달성");
    expect(result!.text).toContain("3");
  });

  it("shouldNotReturnQuarterGoalDoneWhenDaysLeftAtExpiryThreshold", () => {
    // daysLeftQuarter = 7 → goal_done threshold is > 7; silent null
    const result = calcTodayInsight({
      ...base,
      quarterGoal: "분기 목표",
      quarterGoalDone: true,
      daysLeftQuarter: 7,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnQuarterGoalDoneWhenDaysLeftJustAboveThreshold", () => {
    // daysLeftQuarter = 8 → first value above quarter threshold (> 7); goal_done fires
    const result = calcTodayInsight({
      ...base,
      quarterGoal: "분기 목표",
      quarterGoalDone: true,
      daysLeftQuarter: 8,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("분기 목표 달성");
    expect(result!.text).toContain("8");
  });

  it("shouldNotReturnYearGoalDoneWhenDaysLeftAtExpiryThreshold", () => {
    // daysLeftYear = 14 → goal_done threshold is > 14; silent null
    const result = calcTodayInsight({
      ...base,
      yearGoal: "연간 목표",
      yearGoalDone: true,
      daysLeftYear: 14,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnYearGoalDoneWhenDaysLeftJustAboveThreshold", () => {
    // daysLeftYear = 15 → first value above year threshold (> 14); goal_done fires
    const result = calcTodayInsight({
      ...base,
      yearGoal: "연간 목표",
      yearGoalDone: true,
      daysLeftYear: 15,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("연간 목표 달성");
    expect(result!.text).toContain("15");
  });
});

// ── project_ahead (priority 10.8, after goal_done, before personal_best) ────
// TODAY="2024-01-15"; DAYS_7_AGO="2024-01-08"; IN_8="2024-01-23"; IN_7="2024-01-22"
// Fixture A: totalDays=15 (Jan08→Jan23), elapsedDays=7 → timePct≈47%; progress=70% → gap=+23 ≥20 → fires
// Fixture B: totalDays=15 (Jan08→Jan23), elapsedDays=7 → timePct≈47%; progress=65% → gap=+18 < 20 → silent
// Fixture C: deadline=IN_7 (7 days away, ≤7) → excluded regardless of gap
describe("calcTodayInsight — project_ahead (priority 10.8, after goal_done)", () => {
  const TODAY_PA = "2024-01-15";
  const DAYS_7_AGO_PA = "2024-01-08";
  const IN_8_PA = "2024-01-23";
  const IN_7_PA = "2024-01-22";
  const DAYS_30_AGO_PA = "2023-12-16";
  const IN_30_PA = "2024-02-14";

  const base = {
    habits: [],
    todayStr: TODAY_PA,
    nowHour: 14,
    todayIntentionDate: TODAY_PA,
    sessionsToday: 0,
    sessionGoal: undefined as undefined,
    habitsAllDoneDate: undefined as undefined,
  };

  it("shouldReturnProjectAheadWhenGapExceeds20Percent", () => {
    // createdDate=DAYS_7_AGO, deadline=IN_8 → totalDays=15, elapsed=7 → timePct≈47%; progress=70 → gap=+23
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "빠른프로젝트", status: "active", deadline: IN_8_PA, createdDate: DAYS_7_AGO_PA, progress: 70 }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("빠른프로젝트");
    expect(result!.text).toContain("23");
  });

  it("shouldNotReturnProjectAheadWhenGapBelow20Percent", () => {
    // gap = 65 - 47 ≈ +18 < 20 → silent
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "보통프로젝트", status: "active", deadline: IN_8_PA, createdDate: DAYS_7_AGO_PA, progress: 65 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectAheadForDoneProject", () => {
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "완료됨", status: "done", deadline: IN_8_PA, createdDate: DAYS_7_AGO_PA, progress: 70 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectAheadForPausedProject", () => {
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "일시중지", status: "paused", deadline: IN_8_PA, createdDate: DAYS_7_AGO_PA, progress: 70 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectAheadWhenCreatedDateAbsent", () => {
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "신규프로젝트", status: "active", deadline: IN_8_PA, progress: 70 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectAheadWhenDeadlineWithin7Days", () => {
    // deadline=IN_7 (exactly 7 days away → ≤7 → project_ahead excluded; deadline_soon fires instead)
    // createdDate=DAYS_7_AGO, totalDays=14, elapsed=7 → timePct=50%; progress=100% → gap=+50 but excluded
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "임박프로젝트", status: "active", deadline: IN_7_PA, createdDate: DAYS_7_AGO_PA, progress: 100 }],
    });
    // deadline_soon fires (D-7), not project_ahead
    expect(result).not.toBeNull();
    expect(result!.text).not.toContain("앞서가는"); // project_ahead text absent
    expect(result!.text).toContain("임박프로젝트");  // deadline_soon fires
  });

  it("shouldNotReturnProjectAheadWhenTimePctTooLow", () => {
    // createdDate=yesterday(2024-01-14), deadline=2024-02-22 → elapsed=1/39 days ≈ 2.6% < 10
    // calcScheduleGap returns null for early projects (timePct < 10 guard) — mirrors shouldNotReturnProjectBehindWhenTimePctTooLow
    // progress=50 kept below 90 to avoid triggering project_near_completion (priority 10.85)
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "막시작프로젝트", status: "active", deadline: "2024-02-22", createdDate: "2024-01-14", progress: 50 }],
    });
    expect(result).toBeNull();
  });

  it("shouldReturnMostAheadProjectWhenMultipleAhead", () => {
    // Both ahead; picks the most ahead (higher gap first)
    const result = calcTodayInsight({
      ...base,
      projects: [
        // gap≈+23 (progress=70)
        { name: "프로젝트A", status: "active", deadline: IN_8_PA, createdDate: DAYS_7_AGO_PA, progress: 70 },
        // timePct=50%, gap=+40 (progress=90) — more ahead
        { name: "프로젝트B", status: "active", deadline: IN_30_PA, createdDate: DAYS_30_AGO_PA, progress: 90 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("프로젝트B"); // 가장 앞선 프로젝트
  });

  it("shouldProjectAheadFireAfterGoalDone", () => {
    // goal_done (10.7) fires before project_ahead (10.8) — month goal done with 15d remaining
    const result = calcTodayInsight({
      ...base,
      monthGoal: "이번 달 목표",
      monthGoalDone: true,
      daysLeftMonth: 15,
      projects: [{ name: "빠른프로젝트", status: "active", deadline: IN_8_PA, createdDate: DAYS_7_AGO_PA, progress: 70 }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("월간 목표 달성"); // goal_done wins
  });
});

// ── goal_streak (priority 10.75, after goal_done, before project_ahead) ──────
describe("calcTodayInsight — goal_streak (priority 10.75, morning, past done week streak)", () => {
  // Base params: morning, no higher-priority triggers, week goal set but not done
  const base = {
    habits: [],
    todayStr: TODAY,
    nowHour: 9, // morning
    todayIntentionDate: TODAY,
    sessionsToday: 0,
    sessionGoal: undefined,
    habitsAllDoneDate: undefined,
    weekGoal: "이번 주 목표",
    weekGoalDone: false as boolean | undefined,
    daysLeftWeek: 5,
  };

  it("shouldReturnGoalStreakWhenPastDoneStreakIs1", () => {
    const result = calcTodayInsight({ ...base, weekGoalPastDoneStreak: 1 });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("1주 연속");
    expect(result!.text).toContain("이번 주도");
  });

  it("shouldReturnGoalStreakWhenPastDoneStreakIs3", () => {
    const result = calcTodayInsight({ ...base, weekGoalPastDoneStreak: 3 });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("3주 연속");
  });

  it("shouldNotReturnGoalStreakWhenPastDoneStreakIs0", () => {
    const result = calcTodayInsight({ ...base, weekGoalPastDoneStreak: 0 });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGoalStreakWhenPastDoneStreakAbsent", () => {
    const result = calcTodayInsight({ ...base, weekGoalPastDoneStreak: undefined });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGoalStreakWhenWeekGoalAlreadyDone", () => {
    // weekGoalDone=true → goal_done (10.7) fires instead (daysLeftWeek=5 > 2)
    const result = calcTodayInsight({ ...base, weekGoalDone: true, daysLeftWeek: 5, weekGoalPastDoneStreak: 2 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("주간 목표 달성"); // goal_done wins
    expect(result!.text).not.toContain("연속 달성 중");
  });

  it("shouldNotReturnGoalStreakWhenNotMorning", () => {
    // goal_streak is morning-only (nowHour < 12); nowHour=14 (afternoon) should not fire
    const result = calcTodayInsight({ ...base, nowHour: 14, weekGoalPastDoneStreak: 2 });
    expect(result).toBeNull();
  });

  it("shouldReturnGoalStreakAtHour11ButNotAtHour12", () => {
    // nowHour=11 is still morning (< 12) → fires; nowHour=12 is the boundary → does not fire
    const at11 = calcTodayInsight({ ...base, nowHour: 11, weekGoalPastDoneStreak: 1 });
    expect(at11).not.toBeNull();
    expect(at11!.text).toContain("연속 달성 중");

    const at12 = calcTodayInsight({ ...base, nowHour: 12, weekGoalPastDoneStreak: 1 });
    expect(at12).toBeNull();
  });

  it("shouldNotReturnGoalStreakWhenNoWeekGoal", () => {
    // todayStr="2024-01-16" (Tuesday) avoids period_start (fires only on the first day of a new period);
    // TODAY ("2024-01-15") is a Monday so period_start would fire for the new week.
    // todayIntentionDate must also match todayStr to suppress intention_missing (priority 5).
    const result = calcTodayInsight({
      ...base,
      todayStr: TOMORROW,
      todayIntentionDate: TOMORROW,
      weekGoal: undefined,
      weekGoalPastDoneStreak: 2,
    });
    expect(result).toBeNull();
  });

  it("shouldGoalDoneFireBeforeGoalStreak", () => {
    // goal_done (10.7) < goal_streak (10.75) in priority
    const result = calcTodayInsight({
      ...base,
      weekGoalDone: true,
      daysLeftWeek: 4,
      weekGoalPastDoneStreak: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("주간 목표 달성"); // goal_done (10.7) fires
  });

  it("shouldGoalStreakFireBeforeProjectAhead", () => {
    // goal_streak (10.75) fires before project_ahead (10.8)
    // isFocus: true to avoid no_focus_project (6.5) firing first
    const result = calcTodayInsight({
      ...base,
      weekGoalPastDoneStreak: 2,
      projects: [
        { name: "앞서가는프로젝트", status: "active", deadline: "2024-02-22", createdDate: DAYS_7_AGO, progress: 70, isFocus: true },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("연속 달성 중"); // goal_streak wins over project_ahead
  });
});

// ── project_near_completion (priority 10.85, after project_ahead, before personal_best) ────
describe("calcTodayInsight — project_near_completion (priority 10.85, after project_ahead)", () => {
  const base = {
    habits: [],
    todayStr: TODAY,
    nowHour: 14,
    todayIntentionDate: TODAY,
    sessionsToday: 0,
    sessionGoal: undefined as undefined,
    habitsAllDoneDate: undefined as undefined,
  };

  it("shouldReturnProjectNearCompletionAt90Percent", () => {
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "거의다한프로젝트", status: "active", progress: 90 }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("거의다한프로젝트");
    expect(result!.text).toContain("90");
  });

  it("shouldNotReturnProjectNearCompletionAt89Percent", () => {
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "아직프로젝트", status: "active", progress: 89 }],
    });
    expect(result).toBeNull();
  });

  it("shouldReturnProjectNearCompletionAt100Percent", () => {
    // 100% progress but still active — user forgot to mark done
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "백퍼센트프로젝트", status: "active", progress: 100 }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("백퍼센트프로젝트");
    expect(result!.text).toContain("100");
  });

  it("shouldNotReturnProjectNearCompletionForDoneProject", () => {
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "완료프로젝트", status: "done", progress: 90 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectNearCompletionForPausedProject", () => {
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "중단프로젝트", status: "paused", progress: 90 }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectNearCompletionWhenProgressAbsent", () => {
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "진행률없음", status: "active" }],
    });
    expect(result).toBeNull();
  });

  it("shouldReturnHighestProgressProjectWhenMultipleNearCompletion", () => {
    const result = calcTodayInsight({
      ...base,
      projects: [
        { name: "구십프로젝트", status: "active", progress: 90 },
        { name: "구십오프로젝트", status: "active", progress: 95 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("구십오프로젝트"); // highest progress wins
    expect(result!.text).toContain("95");
  });

  it("shouldProjectAheadFireBeforeProjectNearCompletion", () => {
    // project_ahead (10.8) fires before project_near_completion (10.85)
    // createdDate=DAYS_7_AGO, deadline=IN_8 → timePct≈47%; progress=92 → gap=+45 ≥20 → project_ahead fires
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "앞서가며완성직전", status: "active", deadline: IN_8, createdDate: DAYS_7_AGO, progress: 92 }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("앞서가며완성직전");
    expect(result!.text).toContain("앞서가는"); // project_ahead fires, not 완성 직전
    expect(result!.text).not.toContain("완성 직전");
  });

  it("shouldReturnProjectNearCompletionWhenProjectAheadGapBelowThreshold", () => {
    // project_ahead requires gap ≥ 20; progress=91, timePct≈47 → gap=+44... actually
    // Use gap < 20 scenario: createdDate=DAYS_7_AGO, deadline=IN_8, progress=60 → gap≈13 < 20 → project_ahead skipped
    // Then project_near_completion should NOT fire (60 < 90) — but swap to progress=91 with a fixture where gap < 20
    // createdDate=DAYS_7_AGO, deadline=IN_8 → timePct≈47; progress=60 → gap=+13 < 20 (project_ahead skipped)
    // BUT progress=60 < 90 → project_near_completion also skipped → null
    // Correct fixture for "project_ahead skipped but project_near_completion fires":
    // need progress ≥ 90 AND gap < 20 → impossible with same deadline if progress=91 → gap=44 ≥ 20
    // Solution: use NO createdDate so project_ahead filter excludes it, but progress ≥ 90
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "마감없는완성직전", status: "active", progress: 91 }], // no createdDate → project_ahead excluded
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("마감없는완성직전");
    expect(result!.text).toContain("완성 직전"); // project_near_completion fires
    expect(result!.text).not.toContain("앞서가는");
  });

  it("shouldReturnProjectNearCompletionForInProgressStatus", () => {
    // "in-progress" is the other non-excluded status (besides "active"); verify it is not blocked
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "진행중프로젝트", status: "in-progress", progress: 90 }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("진행중프로젝트");
  });
});

// ── almost_perfect_day (priority 10.3, after habit_consecutive_miss, before momentum_rise) ──
describe("calcTodayInsight — almost_perfect_day (priority 10.3)", () => {
  it("shouldReturnAlmostPerfectDayWhenAfternoonAndOneHabitRemaining", () => {
    const result = calcTodayInsight({
      habits: [habit("독서", 3, TODAY), habit("운동", 5, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("1개");
    expect(result!.text).toContain("완벽한 하루");
  });

  it("shouldReturnAlmostPerfectDayWhenAfternoonAndTwoHabitsRemaining", () => {
    const result = calcTodayInsight({
      habits: [habit("독서", 3, YESTERDAY), habit("운동", 5, YESTERDAY), habit("명상", 2, TODAY)],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("2개");
    expect(result!.text).toContain("완벽한 하루");
  });

  it("shouldNotReturnAlmostPerfectDayBeforeAfternoon", () => {
    const result = calcTodayInsight({
      habits: [habit("독서", 3, TODAY), habit("운동", 5, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 13,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    // Before 14h — almost_perfect_day must not fire; returns null (no other insight matches)
    expect(result).toBeNull();
  });

  it("shouldNotReturnAlmostPerfectDayWhenAllHabitsDoneToday", () => {
    // perfect_day fires at priority 4; almost_perfect_day must not fire
    const result = calcTodayInsight({
      habits: [habit("독서", 3, TODAY), habit("운동", 5, TODAY)],
      todayStr: TODAY,
      nowHour: 16,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY, // all habits done today
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한 습관 달성"); // perfect_day
    expect(result!.text).not.toContain("완벽한 하루까지");
  });

  it("shouldNotReturnAlmostPerfectDayWhenThreeOrMoreHabitsRemaining", () => {
    const result = calcTodayInsight({
      habits: [
        habit("독서", 3, YESTERDAY),
        habit("운동", 5, YESTERDAY),
        habit("명상", 2, YESTERDAY),
      ],
      todayStr: TODAY,
      nowHour: 16,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    // 3 remaining — not "almost" done; must not fire (returns null — no other insight matches)
    expect(result).toBeNull();
  });

  it("shouldNotReturnAlmostPerfectDayWhenZeroHabits", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 16,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    // No habits at all — must not fire (returns null)
    expect(result).toBeNull();
  });

  it("shouldPrioritizeHabitConsecutiveMissOverAlmostPerfectDay", () => {
    // habit_consecutive_miss (10.2) must fire before almost_perfect_day (10.3)
    // Scenario: 운동 has no lastChecked (never tracked via streak) + checkHistory shows last done on DAYS_7_AGO.
    // Backward scan: i=1(YESTERDAY)..i=6(DAYS_6_AGO) all miss history → missedDays=6 ≥ MIN_MISS_DAYS(3).
    // lastChecked is absent (not YESTERDAY) so checkHistory and lastChecked are consistent.
    // 독서 is checked today → remaining=1 (only 운동 unchecked) → almost_perfect_day would fire if not blocked.
    const result = calcTodayInsight({
      habits: [
        {
          name: "운동",
          streak: 0,
          checkHistory: [DAYS_7_AGO, DAYS_8_AGO], // last done DAYS_7_AGO; 6 consecutive misses (YESTERDAY back to DAYS_6_AGO)
        },
        {
          name: "독서",
          streak: 3,
          lastChecked: TODAY,
        },
      ],
      todayStr: TODAY,
      nowHour: 16,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("연속 미완료"); // habit_consecutive_miss fires
    expect(result!.text).not.toContain("완벽한 하루까지");
  });
});
