// ABOUTME: Tests for calcTodayInsight — context-aware daily insight surfacing
// ABOUTME: Covers all insight types and their priority ordering (including no_focus_project, weak_day_ahead, best_day_ahead, pomodoro_goal_streak, pomodoro_goal_reached, momentum_decline + momentum_rise, open_issues, intention_done, pomodoro_today_above_avg)

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
const DAYS_10_AGO = "2024-01-05";

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

  // ── perfect_day_streak ─────────────────────────────────────────────────────
  it("shouldShowStreakCountWhenPerfectDayStreakReaches3", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 5, TODAY)],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY,
      perfectDayStreak: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("3");
    expect(result!.text).toContain("연속");
  });

  it("shouldShowStreakCountWhenPerfectDayStreakIs7", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 5, TODAY)],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY,
      perfectDayStreak: 7,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("7");
    expect(result!.text).toContain("연속");
  });

  it("shouldShowGenericMessageWhenPerfectDayStreakIsBelow3", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 5, TODAY)],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY,
      perfectDayStreak: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).not.toContain("연속");
    expect(result!.text).toContain("완벽");
  });

  it("shouldShowGenericMessageWhenPerfectDayStreakIsAbsent", () => {
    const result = calcTodayInsight({
      habits: [habit("운동", 5, TODAY)],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY,
      // perfectDayStreak absent — backward compatibility
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("완벽");
    expect(result!.text).not.toContain("연속");
  });

  it("shouldNotFirePerfectDayStreakWhenHabitsNotDoneToday", () => {
    const result = calcTodayInsight({
      // Non-empty habits so the only reason perfect_day is skipped is the outer guard
      habits: [habit("운동", 5, TODAY)],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      // habitsAllDoneDate is yesterday — outer guard fails, streak count must NOT appear
      habitsAllDoneDate: YESTERDAY,
      perfectDayStreak: 5,
    });
    expect(result?.text ?? "").not.toContain("연속");
  });

  it("shouldShowGenericMessageWhenPerfectDayStreakIs1", () => {
    // First-time perfect day (streak=1) shows generic celebration, not a streak count
    const result = calcTodayInsight({
      habits: [habit("운동", 5, TODAY)],
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY,
      perfectDayStreak: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("완벽");
    expect(result!.text).not.toContain("연속");
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

  // ── pomodoro_goal_streak ────────────────────────────────────────────────────
  it("shouldReturnPomodoroGoalStreakWhenStreakGe2AndGoalNotYetMet", () => {
    // TODAY = "2024-01-15" is a Monday — pass weekGoal to prevent period_start (6) from firing
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: 4,
      habitsAllDoneDate: undefined,
      pomodoroGoalStreak: 2,
      weekGoal: "임시 목표",
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("포모도로");
    expect(result!.text).toContain("2");
  });

  it("shouldReturnPomodoroGoalStreakWith5DayStreak", () => {
    // weekGoal set to prevent period_start (6) firing on TODAY=Monday; afternoon hour avoids morning-only insights
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 1,
      sessionGoal: 4,
      habitsAllDoneDate: undefined,
      pomodoroGoalStreak: 5,
      weekGoal: "임시 목표",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("5");
  });

  it("shouldNotReturnPomodoroGoalStreakWhenStreakLessThan2", () => {
    // Use afternoon hour to avoid period_start (morning-only, nowHour < 12); weekGoal set as well
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: 4,
      habitsAllDoneDate: undefined,
      pomodoroGoalStreak: 1,
      weekGoal: "임시 목표",
    });
    // streak=1 is not enough to fire; expect null (no other insight matches)
    expect(result).toBeNull();
  });

  it("shouldNotReturnPomodoroGoalStreakWhenGoalAlreadyMetToday", () => {
    // When today's goal is met, pomodoro_goal_reached (7.5) fires instead
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 4,
      sessionGoal: 4,
      habitsAllDoneDate: undefined,
      pomodoroGoalStreak: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("목표 달성"); // pomodoro_goal_reached wins
  });

  it("shouldNotReturnPomodoroGoalStreakWhenSessionGoalUndefined", () => {
    // Use afternoon hour to avoid period_start (morning-only) and weekGoal to prevent period_start at all
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      pomodoroGoalStreak: 5,
      weekGoal: "임시 목표",
    });
    expect(result).toBeNull();
  });

  it("shouldPomodoroLastOneFireBeforePomodoroGoalStreak", () => {
    // pomodoro_last_one (7) fires before pomodoro_goal_streak (7.45)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 3,   // one away from goal=4
      sessionGoal: 4,
      habitsAllDoneDate: undefined,
      pomodoroGoalStreak: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("1세션"); // pomodoro_last_one wins
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

  // ── ci_failure ─────────────────────────────────────────────────────────────
  it("shouldReturnCiFailureWhenActiveProjectHasFailingCi", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "앱서버", status: "active", githubData: { ciStatus: "failure" } }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("앱서버");
    expect(result!.text).toContain("CI");
  });

  it("shouldReturnCiFailureWhenInProgressProjectHasFailingCi", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "백엔드", status: "in-progress", githubData: { ciStatus: "failure" } }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("백엔드");
  });

  it("shouldNotReturnCiFailureWhenProjectIsPaused", () => {
    // Active project alongside paused: only the active one should trigger ci_failure
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "중단프로젝트", status: "paused", githubData: { ciStatus: "failure" } },
        { name: "활성프로젝트", status: "active", githubData: { ciStatus: "failure" } },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("활성프로젝트"); // paused project is skipped; active fires
    expect(result!.text).not.toContain("중단프로젝트");
  });

  it("shouldNotReturnCiFailureWhenProjectIsDone", () => {
    // Active project alongside done: only the active one should trigger ci_failure
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "완료프로젝트", status: "done", githubData: { ciStatus: "failure" } },
        { name: "진행중프로젝트", status: "in-progress", githubData: { ciStatus: "failure" } },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("진행중프로젝트"); // done project is skipped; in-progress fires
    expect(result!.text).not.toContain("완료프로젝트");
  });

  it("shouldNotReturnCiFailureWhenCiStatusIsSuccess", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "정상프로젝트", status: "active", githubData: { ciStatus: "success" } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnCiFailureWhenCiStatusIsPending", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "빌드중프로젝트", status: "active", githubData: { ciStatus: "pending" } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnCiFailureWhenCiStatusIsNull", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "CI없음프로젝트", status: "active", githubData: { ciStatus: null } }],
    });
    expect(result).toBeNull();
  });

  it("shouldReturnDeadlineCriticalBeforeCiFailure", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "긴급마감", status: "active", deadline: TODAY, githubData: { ciStatus: "failure" } },
        { name: "CI고장", status: "active", githubData: { ciStatus: "failure" } },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("긴급마감"); // deadline_critical (2) beats ci_failure (2.5)
  });

  it("shouldReturnStreakAtRiskBeforeCiFailure", () => {
    // streak_at_risk (priority 1) must preempt ci_failure (2.5) in the evening
    const result = calcTodayInsight({
      habits: [habit("운동", 10, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 19,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "CI고장", status: "active", githubData: { ciStatus: "failure" } }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동"); // streak_at_risk fires first
    expect(result!.text).not.toContain("CI");
  });

  it("shouldReturnFirstFailingProjectInUserOrderWhenMultipleCiFailures", () => {
    // With multiple failing CI projects, the first in user-defined order is surfaced
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "프로젝트A", status: "active", githubData: { ciStatus: "failure" } },
        { name: "프로젝트B", status: "active", githubData: { ciStatus: "failure" } },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("프로젝트A"); // first project in user-defined order
  });

  // ── open_prs ────────────────────────────────────────────────────────────────
  it("shouldReturnOpenPrsWhenActiveProjectHasOpenPrs", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "백엔드", status: "active", githubData: { ciStatus: null, openPrs: 3 } }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("백엔드");
    expect(result!.text).toContain("PR");
    expect(result!.text).toContain("3");
  });

  it("shouldReturnOpenPrsWhenInProgressProjectHasOpenPrs", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프론트엔드", status: "in-progress", githubData: { ciStatus: null, openPrs: 1 } }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("프론트엔드");
    expect(result!.text).toContain("PR");
  });

  it("shouldNotReturnOpenPrsWhenProjectIsDone", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "완료프로젝트", status: "done", githubData: { ciStatus: null, openPrs: 5 } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnOpenPrsWhenProjectIsPaused", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "중단프로젝트", status: "paused", githubData: { ciStatus: null, openPrs: 2 } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnOpenPrsWhenOpenPrsIsZero", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "클린프로젝트", status: "active", githubData: { ciStatus: "success", openPrs: 0 } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnOpenPrsWhenGithubDataAbsent", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "GitHub없음", status: "active" }],
    });
    expect(result).toBeNull();
  });

  it("shouldPickProjectWithMostOpenPrsWhenMultipleQualify", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "적은PR", status: "active", githubData: { ciStatus: null, openPrs: 1 } },
        { name: "많은PR", status: "active", githubData: { ciStatus: null, openPrs: 5 } },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("많은PR");
    expect(result!.text).toContain("5");
    expect(result!.text).not.toContain("적은PR");
  });

  it("shouldReturnCiFailureBeforeOpenPrs", () => {
    // ci_failure (2.5) must preempt open_prs (3.5)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "CI고장", status: "active", githubData: { ciStatus: "failure", openPrs: 3 } }],
    });
    expect(result!.text).toContain("CI 실패");
    expect(result!.text).not.toContain("PR");
  });

  it("shouldReturnMilestoneNearBeforeOpenPrs", () => {
    // milestone_near (3) must preempt open_prs (3.5) — streak 6 + unchecked = 1 day before milestone 7
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 6, lastChecked: YESTERDAY, bestStreak: 6 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프로젝트", status: "active", githubData: { ciStatus: null, openPrs: 3 } }],
    });
    expect(result!.text).toContain("운동");
    expect(result!.text).not.toContain("PR");
  });

  it("shouldReturnOpenPrsBeforePerfectDay", () => {
    // open_prs (3.5) must preempt perfect_day (4)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 5, lastChecked: TODAY }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY, // all habits done = perfect_day would fire
      projects: [{ name: "백엔드", status: "active", githubData: { ciStatus: null, openPrs: 2 } }],
    });
    expect(result!.text).toContain("백엔드");
    expect(result!.text).toContain("PR");
    expect(result!.text).not.toContain("완벽한");
  });

  // ── github_drought ──────────────────────────────────────────────────────────
  it("shouldReturnGithubDroughtWhenActiveProjectHasNoCommitFor8Days", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "백엔드", status: "active", githubData: { ciStatus: null, lastCommitAt: DAYS_8_AGO + "T00:00:00Z" } }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("백엔드");
    expect(result!.text).toContain("8");
    expect(result!.text).toContain("커밋");
  });

  it("shouldReturnGithubDroughtWhenInProgressProjectHasNoCommitFor8Days", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프론트엔드", status: "in-progress", githubData: { ciStatus: null, lastCommitAt: DAYS_8_AGO + "T00:00:00Z" } }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("프론트엔드");
    expect(result!.text).toContain("커밋");
  });

  it("shouldNotReturnGithubDroughtWhenLastCommitIsExactly7DaysAgo", () => {
    // 7 days ago is within threshold (>7 required); boundary: must NOT fire
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "경계프로젝트", status: "active", githubData: { ciStatus: null, lastCommitAt: DAYS_7_AGO + "T00:00:00Z" } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGithubDroughtWhenLastCommitIs6DaysAgo", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "클린프로젝트", status: "active", githubData: { ciStatus: null, lastCommitAt: DAYS_6_AGO + "T00:00:00Z" } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGithubDroughtWhenProjectIsDone", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "완료프로젝트", status: "done", githubData: { ciStatus: null, lastCommitAt: DAYS_8_AGO + "T00:00:00Z" } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGithubDroughtWhenProjectIsPaused", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "중단프로젝트", status: "paused", githubData: { ciStatus: null, lastCommitAt: DAYS_8_AGO + "T00:00:00Z" } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGithubDroughtWhenLastCommitAtIsAbsent", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "깃허브없음", status: "active", githubData: { ciStatus: null } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGithubDroughtWhenLastCommitAtIsExplicitNull", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "널커밋", status: "active", githubData: { ciStatus: null, lastCommitAt: null } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGithubDroughtWhenGithubDataIsAbsent", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "깃허브연동없음", status: "active" }],
    });
    expect(result).toBeNull();
  });

  it("shouldPickMostStaleDroughtProjectWhenMultipleQualify", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "8일전커밋", status: "active", githubData: { ciStatus: null, lastCommitAt: DAYS_8_AGO + "T00:00:00Z" } },
        { name: "10일전커밋", status: "active", githubData: { ciStatus: null, lastCommitAt: DAYS_10_AGO + "T00:00:00Z" } },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("10일전커밋"); // most stale wins
  });

  it("shouldOpenPrsPreemptGithubDrought", () => {
    // open_prs (3.5) must preempt github_drought (3.7)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "백엔드", status: "active", githubData: { ciStatus: null, openPrs: 2, lastCommitAt: DAYS_8_AGO + "T00:00:00Z" } }],
    });
    expect(result!.text).toContain("PR"); // open_prs fires
    expect(result!.text).not.toContain("커밋"); // not github_drought
  });

  it("shouldGithubDroughtPreemptPerfectDay", () => {
    // github_drought (3.7) must preempt perfect_day (4)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 5, lastChecked: TODAY }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY, // all habits done = perfect_day would fire
      projects: [{ name: "백엔드", status: "active", githubData: { ciStatus: null, lastCommitAt: DAYS_8_AGO + "T00:00:00Z" } }],
    });
    expect(result!.text).toContain("커밋"); // github_drought fires
    expect(result!.text).not.toContain("완벽한"); // not perfect_day
  });

  // ── open_issues ─────────────────────────────────────────────────────────────
  it("shouldReturnOpenIssuesWhenActiveProjectHasFiveOrMoreIssues", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "백엔드", status: "active", githubData: { ciStatus: null, openIssues: 5 } }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("백엔드");
    expect(result!.text).toContain("5");
    expect(result!.text).toContain("이슈");
  });

  it("shouldReturnOpenIssuesWhenInProgressProjectHasFiveOrMoreIssues", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "프론트엔드", status: "in-progress", githubData: { ciStatus: null, openIssues: 8 } }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("프론트엔드");
    expect(result!.text).toContain("이슈");
  });

  it("shouldNotReturnOpenIssuesWhenIssueCountIsFour", () => {
    // boundary: 4 is below threshold of 5 — must NOT fire
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "경계프로젝트", status: "active", githubData: { ciStatus: null, openIssues: 4 } }],
    });
    expect(result).toBeNull();
  });

  it("shouldReturnOpenIssuesWhenIssueCountIsExactlyFive", () => {
    // boundary: 5 is exactly the threshold — must fire
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "경계프로젝트", status: "active", githubData: { ciStatus: null, openIssues: 5 } }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("이슈");
  });

  it("shouldNotReturnOpenIssuesWhenProjectIsDone", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "완료프로젝트", status: "done", githubData: { ciStatus: null, openIssues: 10 } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnOpenIssuesWhenProjectIsPaused", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "중단프로젝트", status: "paused", githubData: { ciStatus: null, openIssues: 7 } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnOpenIssuesWhenOpenIssuesAbsent", () => {
    // absent openIssues treated as 0 — no insight
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "클린프로젝트", status: "active", githubData: { ciStatus: "success" } }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnOpenIssuesWhenOpenIssuesIsZero", () => {
    // explicit 0 must be treated identically to absent — both collapse to 0 via ?? 0
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "이슈없는프로젝트", status: "active", githubData: { ciStatus: null, openIssues: 0 } }],
    });
    expect(result).toBeNull();
  });

  it("shouldPickProjectWithMostIssuesWhenMultipleQualify", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [
        { name: "적은이슈", status: "active", githubData: { ciStatus: null, openIssues: 5 } },
        { name: "많은이슈", status: "active", githubData: { ciStatus: null, openIssues: 12 } },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("많은이슈"); // highest-count project surfaces first
    expect(result!.text).toContain("12");
  });

  it("shouldCiFailurePreemptOpenIssues", () => {
    // ci_failure (2.5) must preempt open_issues (3.9)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "CI고장", status: "active", githubData: { ciStatus: "failure", openIssues: 8 } }],
    });
    expect(result!.text).toContain("CI"); // ci_failure fires
    expect(result!.text).not.toContain("이슈"); // not open_issues
  });

  it("shouldOpenPrsPreemptOpenIssues", () => {
    // open_prs (3.5) must preempt open_issues (3.9)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "백엔드", status: "active", githubData: { ciStatus: null, openPrs: 2, openIssues: 8 } }],
    });
    expect(result!.text).toContain("PR"); // open_prs fires
    expect(result!.text).not.toContain("이슈"); // not open_issues
  });

  it("shouldGithubDroughtPreemptOpenIssues", () => {
    // github_drought (3.7) must preempt open_issues (3.9)
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      projects: [{ name: "백엔드", status: "active", githubData: { ciStatus: null, lastCommitAt: DAYS_8_AGO + "T00:00:00Z", openIssues: 8 } }],
    });
    expect(result!.text).toContain("커밋"); // github_drought fires
    expect(result!.text).not.toContain("이슈"); // not open_issues
  });

  it("shouldOpenIssuesPreemptPerfectDay", () => {
    // open_issues (3.9) must preempt perfect_day (4)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 5, lastChecked: TODAY }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: TODAY, // all habits done = perfect_day would fire
      projects: [{ name: "백엔드", status: "active", githubData: { ciStatus: null, openIssues: 6 } }],
    });
    expect(result!.text).toContain("이슈"); // open_issues fires
    expect(result!.text).not.toContain("완벽한"); // not perfect_day
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
      // timePct=50%, progress=35% → gap=-15 → project_behind does not fire (needs ≤ -20)
      // project_forecast may surface a completion estimate instead
      projects: [{ name: "순탄한프로젝트", status: "active", deadline: IN_30, createdDate: DAYS_30_AGO, progress: 35 }],
    });
    expect(result?.text).not.toContain("뒤처짐"); // project_behind must not fire
    // project_forecast fires instead: velocity=35/30 %/day → daysToComplete=390/7 → daysVsDeadline=-26
    expect(result?.text).toContain("26일 초과 예상");
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

describe("calcTodayInsight — pomodoro_goal_streak_broken (priority 10.11, between streak_recession and habit_consecutive_miss)", () => {
  // Base params: no habits (prevents streak_recession/habit_consecutive_miss interference),
  // afternoon hour 14 (bypasses period_start/no_focus_project which require < 12),
  // sessionGoal set, pomodoroGoalStreak=0 (yesterday missed goal).
  const base = {
    habits: [] as ReturnType<typeof habit>[],
    todayStr: TODAY,
    nowHour: 14,
    todayIntentionDate: TODAY,
    sessionsToday: 0,
    habitsAllDoneDate: undefined,
  } as const;

  it("shouldFireWhenGoalStreakBrokenAfter3Days", () => {
    // pomodoroGoalStreak=0 (yesterday missed), prevPomodoroGoalStreak=3 (3 consecutive days before that)
    const result = calcTodayInsight({
      ...base,
      sessionGoal: 4,
      pomodoroGoalStreak: 0,
      prevPomodoroGoalStreak: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("💔");
    expect(result!.text).toContain("3");
    expect(result!.text).toContain("포모도로");
  });

  it("shouldShowPrevStreakCountInMessage", () => {
    // prevPomodoroGoalStreak=5 — message should reflect the 5-day streak that was broken
    const result = calcTodayInsight({
      ...base,
      sessionGoal: 2,
      pomodoroGoalStreak: 0,
      prevPomodoroGoalStreak: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("5");
  });

  it("shouldNotFireWhenGoalStreakStillAlive", () => {
    // pomodoroGoalStreak=1 (yesterday met goal, streak alive) — broken badge must not fire.
    // pomodoroGoalStreak=1 is below the pomodoro_goal_streak (7.45) threshold of ≥2, so no other
    // insight fires with this minimal fixture → result is null.
    const result = calcTodayInsight({
      ...base,
      sessionGoal: 4,
      pomodoroGoalStreak: 1,
      prevPomodoroGoalStreak: 4,
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenPrevStreakTooShort", () => {
    // prevPomodoroGoalStreak=2 — below the 3-day significance threshold; no broken-streak badge
    const result = calcTodayInsight({
      ...base,
      sessionGoal: 4,
      pomodoroGoalStreak: 0,
      prevPomodoroGoalStreak: 2,
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenPrevStreakAbsent", () => {
    // prevPomodoroGoalStreak absent — insufficient history; skipped silently
    const result = calcTodayInsight({
      ...base,
      sessionGoal: 4,
      pomodoroGoalStreak: 0,
      prevPomodoroGoalStreak: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenSessionGoalAbsent", () => {
    // No sessionGoal → no daily goal means no streak can exist; badge suppressed
    const result = calcTodayInsight({
      ...base,
      sessionGoal: undefined,
      pomodoroGoalStreak: 0,
      prevPomodoroGoalStreak: 5,
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenSessionGoalIsZero", () => {
    // sessionGoal=0 is treated as "no goal" — same as absent (mirrors sessionGoal > 0 guard)
    const result = calcTodayInsight({
      ...base,
      sessionGoal: 0,
      pomodoroGoalStreak: 0,
      prevPomodoroGoalStreak: 5,
    });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByStreakRecessionAtPriority10point1", () => {
    // streak_recession (10.1) fires before pomodoro_goal_streak_broken (10.11)
    // when a significant habit streak (≥7d) also broke yesterday (lastChecked=DAYS_2_AGO).
    const result = calcTodayInsight({
      ...base,
      habits: [habit("운동", 7, DAYS_2_AGO)],
      sessionGoal: 4,
      pomodoroGoalStreak: 0,
      prevPomodoroGoalStreak: 4,
    });
    expect(result).not.toBeNull();
    // streak_recession fires: 💔 habit name + streak count
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("7");
    // pomodoro goal streak broken must NOT fire
    expect(result!.text).not.toContain("포모도로");
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
    // gap = 65 - 47 ≈ +18 < 20 → project_ahead does not fire (needs ≥ +20)
    // project_forecast may surface a completion estimate instead
    const result = calcTodayInsight({
      ...base,
      projects: [{ name: "보통프로젝트", status: "active", deadline: IN_8_PA, createdDate: DAYS_7_AGO_PA, progress: 65 }],
    });
    expect(result?.text).not.toContain("앞서가는 중!"); // project_ahead must not fire
    // project_forecast fires instead: velocity=65/7 %/day → daysToComplete=245/65 → daysVsDeadline=4
    expect(result?.text).toContain("D-4");
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

  // ── intention_streak ──────────────────────────────────────────────────────
  it("shouldReturnIntentionStreakInsightWhen7DayStreakAndIntentionSetToday", () => {
    // All higher-priority conditions absent; intentionConsecutiveDays === 7 → fires.
    // nowHour:14 bypasses period_start (requires < 12), avoiding false "new week/month" insight
    // on test date 2024-01-15 (a Monday). Habit checked today → no streak_at_risk, almost_perfect_day
    // remaining=0 (1 habit checked), no pomodoro goal, no momentum history.
    const result = calcTodayInsight({
      habits: [habit("운동", 3, TODAY)], // checked today — 0 remaining, no streak_at_risk/milestone_near
      todayStr: TODAY,
      nowHour: 14, // afternoon — bypasses period_start and intention_missing (both < 12)
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      intentionConsecutiveDays: 7,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("의도");
    expect(result!.text).toContain("7일");
  });

  it("shouldNotReturnIntentionStreakInsightWhenStreakBelow7", () => {
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      intentionConsecutiveDays: 6,
    });
    // No higher-priority insight fires with empty habits, no goals, no pomodoro → result is null
    expect(result).toBeNull();
  });

  it("shouldNotReturnIntentionStreakInsightWhenIntentionNotSetToday", () => {
    // intentionConsecutiveDays >= 7 but today's intention is not set → no insight
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: YESTERDAY, // not today
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      intentionConsecutiveDays: 7,
    });
    // No higher-priority insight fires → result is null (intention_streak blocked by todayIntentionDate check)
    expect(result).toBeNull();
  });

  it("shouldNotReturnIntentionStreakInsightWhenConsecutiveDaysUndefined", () => {
    // intentionConsecutiveDays absent (undefined) → no intention_streak badge fires
    const result = calcTodayInsight({
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      // intentionConsecutiveDays omitted
    });
    expect(result).toBeNull();
  });

  it("shouldReturnPersonalBestOverIntentionStreak", () => {
    // personal_best (priority 11) fires first when habit hits milestone bestStreak today
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 7, lastChecked: TODAY, bestStreak: 7 }],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      intentionConsecutiveDays: 7,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("역대 최고"); // personal_best takes priority
  });
});

describe("calcTodayInsight — habit_target_near (priority 11.05, between personal_best and intention_streak)", () => {
  // All tests use nowHour: 11 to suppress almost_perfect_day (requires >= 14h) and streak_at_risk (requires >= 18h).
  // todayIntentionDate: TODAY suppresses intention_missing (requires todayIntentionDate !== TODAY).
  // TODAY = "2024-01-15" is a Monday → period_start(6) fires for new-week when weekGoal absent;
  // tests pass weekGoal: "test" to suppress that nudge so habit_target_near can surface.

  it("shouldReturnHabitTargetNearWhenOneDayAway", () => {
    // streak=9, targetStreak=10 → gap=1 → 인사이트 발동
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 9, lastChecked: YESTERDAY, targetStreak: 10 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("독서");
    expect(result!.text).toContain("10");
    expect(result!.text).toContain("1일");
    expect(result!.level).toBe("success");
  });

  it("shouldReturnHabitTargetNearWhenTwoDaysAway", () => {
    // streak=18, targetStreak=20 → gap=2 → 인사이트 발동
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 18, lastChecked: YESTERDAY, targetStreak: 20 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("20");
    expect(result!.text).toContain("2일");
  });

  it("shouldNotReturnHabitTargetNearWhenThreeDaysAway", () => {
    // streak=17, targetStreak=20 → gap=3, 임계값(2) 초과 → null
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 17, lastChecked: YESTERDAY, targetStreak: 20 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnHabitTargetNearWhenStreakEqualsTarget", () => {
    // streak=10, targetStreak=10 → gap=0, 이미 달성 → null
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 10, lastChecked: YESTERDAY, targetStreak: 10 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnHabitTargetNearWhenStreakExceedsTarget", () => {
    // streak=12, targetStreak=10 → 이미 초과 달성 → null
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 12, lastChecked: YESTERDAY, targetStreak: 10 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnHabitTargetNearWhenTargetStreakAbsent", () => {
    // targetStreak 미설정 → null
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 9, lastChecked: YESTERDAY }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnHabitTargetNearWhenTargetStreakZero", () => {
    // targetStreak=0 → 목표 없음으로 처리 → null
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 9, lastChecked: YESTERDAY, targetStreak: 0 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnHabitTargetNearWhenStreakIsZero", () => {
    // streak=0, targetStreak=1 → 아직 시작 안 함 → null
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 0, lastChecked: undefined, targetStreak: 1 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldPickHabitClosestToTarget", () => {
    // 독서 gap=1, 운동 gap=2 → 독서(gap 최소)가 선택됨
    const result = calcTodayInsight({
      habits: [
        { name: "독서", streak: 9, lastChecked: YESTERDAY, targetStreak: 10 },
        { name: "운동", streak: 18, lastChecked: YESTERDAY, targetStreak: 20 },
      ],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("독서"); // 가장 가까운 습관 선택
    expect(result!.text).toContain("1일");
  });

  it("shouldReturnPersonalBestOverHabitTargetNear", () => {
    // streak=7, bestStreak=7, milestone → personal_best (priority 11) fires before habit_target_near (11.05)
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 7, lastChecked: TODAY, bestStreak: 7, targetStreak: 8 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("역대 최고"); // personal_best takes priority
  });

  it("shouldReturnHabitTargetNearOverIntentionStreak", () => {
    // habit_target_near (11.05) fires before intention_streak (11.1)
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 9, lastChecked: YESTERDAY, targetStreak: 10 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
      intentionConsecutiveDays: 7,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("독서"); // habit_target_near fires
    expect(result!.text).not.toContain("의도"); // intention_streak 미발동 확인
  });

  it("shouldReturnMilestoneNearOverHabitTargetNearWhenTargetMatchesFixedMilestone", () => {
    // targetStreak=7 coincides with fixed milestone 🔥; gap=1 and not yet checked today
    // → milestone_near (priority 3) fires first, not habit_target_near (11.05)
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 6, lastChecked: YESTERDAY, targetStreak: 7 }],
      todayStr: TODAY,
      nowHour: 11,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("🎯"); // milestone_near badge
    expect(result!.text).toContain("🔥"); // fixed milestone badge, not user-target text
    expect(result!.text).toContain("1일 전"); // milestone_near format
  });
});

describe("calcTodayInsight — weak_day_ahead (priority 6.8, between no_focus_project and pomodoro)", () => {
  // Base params: morning, one habit, today is historically the weakest habit day.
  // Uses TOMORROW ("2024-01-16", Tuesday) to avoid period_start(week) firing on Monday.
  function baseWeak() {
    return {
      habits: [{ name: "운동", streak: 3, lastChecked: YESTERDAY }],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      todayIsWeakHabitDay: true,
    };
  }

  it("shouldReturnWeakDayAheadWhenMorningAndTodayIsWeakDay", () => {
    const result = calcTodayInsight(baseWeak());
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("약한 요일"); // must be the weak_day_ahead insight specifically
  });

  it("shouldNotReturnWeakDayAheadWhenTodayIsNotWeakDay", () => {
    const result = calcTodayInsight({ ...baseWeak(), todayIsWeakHabitDay: false });
    // No weak day — should not return the weak_day_ahead insight
    expect(result?.text ?? "").not.toContain("약한 요일");
  });

  it("shouldNotReturnWeakDayAheadWhenTodayIsWeakDayFlagAbsent", () => {
    const params = { ...baseWeak() };
    delete (params as Record<string, unknown>)["todayIsWeakHabitDay"];
    const result = calcTodayInsight(params);
    expect(result?.text ?? "").not.toContain("약한 요일");
  });

  it("shouldNotReturnWeakDayAheadInAfternoon", () => {
    const result = calcTodayInsight({ ...baseWeak(), nowHour: 14 });
    // Afternoon → weak_day_ahead is suppressed (morning-only insight)
    expect(result?.text ?? "").not.toContain("약한 요일");
  });

  it("shouldNotReturnWeakDayAheadAtExactNoon", () => {
    // noon (12:00) is not morning — should not fire
    const result = calcTodayInsight({ ...baseWeak(), nowHour: 12 });
    expect(result?.text ?? "").not.toContain("약한 요일");
  });

  it("shouldNotReturnWeakDayAheadWhenNoHabits", () => {
    const result = calcTodayInsight({ ...baseWeak(), habits: [] });
    expect(result?.text ?? "").not.toContain("약한 요일");
  });

  it("shouldReturnNoFocusProjectOverWeakDayAheadWhenBothApply", () => {
    // no_focus_project (6.5) beats weak_day_ahead (6.8) — tested via priority ordering
    const result = calcTodayInsight({
      ...baseWeak(),
      todayStr: TOMORROW, // Tuesday — non-period-start day to avoid period_start firing
      todayIntentionDate: TOMORROW,
      projects: [{ name: "앱개발", status: "active" }], // active project, no isFocus → no_focus fires
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("집중"); // no_focus_project wins
  });

  it("shouldReturnWeakDayAheadOverPomodoroLastOneWhenBothApply", () => {
    // weak_day_ahead (6.8) beats pomodoro_last_one (7) — tested via priority ordering
    const result = calcTodayInsight({
      ...baseWeak(),
      sessionsToday: 3,
      sessionGoal: 4, // 3/4 → one session left = pomodoro_last_one condition
    });
    expect(result).not.toBeNull();
    // weak_day_ahead text should appear, not the pomodoro "1세션 남았어요" text
    expect(result!.text).not.toContain("1세션");
  });
});

describe("calcTodayInsight — best_day_ahead (priority 6.82, between weak_day_ahead and pomodoro)", () => {
  // Base params: morning, one habit, today is the user's historically strongest habit day.
  // Uses TOMORROW ("2024-01-16", Tuesday) to avoid period_start(week) firing on Monday.
  function baseBest() {
    return {
      habits: [{ name: "운동", streak: 3, lastChecked: TODAY }],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      todayIsBestHabitDay: true,
    };
  }

  it("shouldReturnBestDayAheadWhenMorningAndTodayIsBestDay", () => {
    const result = calcTodayInsight(baseBest());
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("강한 요일"); // best_day_ahead insight
  });

  it("shouldNotReturnBestDayAheadWhenTodayIsNotBestDay", () => {
    const result = calcTodayInsight({ ...baseBest(), todayIsBestHabitDay: false });
    expect(result?.text ?? "").not.toContain("강한 요일");
  });

  it("shouldNotReturnBestDayAheadWhenFlagAbsent", () => {
    const params = { ...baseBest() };
    delete (params as Record<string, unknown>)["todayIsBestHabitDay"];
    const result = calcTodayInsight(params);
    expect(result?.text ?? "").not.toContain("강한 요일");
  });

  it("shouldNotReturnBestDayAheadInAfternoon", () => {
    // Afternoon → best_day_ahead is suppressed (morning-only insight)
    const result = calcTodayInsight({ ...baseBest(), nowHour: 14 });
    expect(result?.text ?? "").not.toContain("강한 요일");
  });

  it("shouldNotReturnBestDayAheadAtExactNoon", () => {
    const result = calcTodayInsight({ ...baseBest(), nowHour: 12 });
    expect(result?.text ?? "").not.toContain("강한 요일");
  });

  it("shouldNotReturnBestDayAheadWhenNoHabits", () => {
    const result = calcTodayInsight({ ...baseBest(), habits: [] });
    expect(result?.text ?? "").not.toContain("강한 요일");
  });

  it("shouldReturnWeakDayAheadOverBestDayAheadWhenBothApply", () => {
    // weak_day_ahead (6.8) beats best_day_ahead (6.82) — warnings preempt positive nudges
    const result = calcTodayInsight({
      ...baseBest(),
      todayIsWeakHabitDay: true, // both flags set simultaneously
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("약한 요일"); // weak_day_ahead wins
  });

  it("shouldReturnBestDayAheadOverPomodoroLastOneWhenBothApply", () => {
    // best_day_ahead (6.82) beats pomodoro_last_one (7) — tested via priority ordering
    const result = calcTodayInsight({
      ...baseBest(),
      sessionsToday: 3,
      sessionGoal: 4, // 3/4 → one session left = pomodoro_last_one condition
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("강한 요일"); // best_day_ahead wins
  });
});

describe("calcTodayInsight — month_goal_streak (priority 10.76, between goal_streak and project_ahead)", () => {
  // Base params: morning, monthly goal set, not yet done, 2 past done months → streak fires.
  // Uses TOMORROW ("2024-01-16", Tuesday) to avoid period_start(week/month) edge cases on Monday.
  // daysLeftMonth=10 avoids midpoint (15/16) and expiry (≤2) checks.
  function base() {
    return {
      habits: [],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      monthGoal: "이번 달 독서 3권",
      monthGoalDone: false,
      daysLeftMonth: 10,
      monthGoalPastDoneStreak: 2,
    };
  }

  it("shouldReturnMonthGoalStreakWhenMorningAndStreakAtLeast2", () => {
    const result = calcTodayInsight(base());
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("월간 목표");
    expect(result!.text).toContain("달 연속");
    expect(result!.text).toContain("2");
  });

  it("shouldIncludeStreakCountInText", () => {
    const result = calcTodayInsight({ ...base(), monthGoalPastDoneStreak: 5 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("5");
  });

  it("shouldNotReturnMonthGoalStreakWhenStreakIs1", () => {
    // streak=1 means only 1 past month done — not yet a "streak" worth celebrating
    const result = calcTodayInsight({ ...base(), monthGoalPastDoneStreak: 1 });
    expect(result?.text ?? "").not.toContain("달 연속");
  });

  it("shouldNotReturnMonthGoalStreakWhenStreakIs0", () => {
    const result = calcTodayInsight({ ...base(), monthGoalPastDoneStreak: 0 });
    expect(result?.text ?? "").not.toContain("달 연속");
  });

  it("shouldNotReturnMonthGoalStreakWhenStreakAbsent", () => {
    const params = { ...base() };
    delete (params as Record<string, unknown>)["monthGoalPastDoneStreak"];
    const result = calcTodayInsight(params);
    expect(result?.text ?? "").not.toContain("달 연속");
  });

  it("shouldNotReturnMonthGoalStreakWhenMonthGoalAbsent", () => {
    // No monthly goal set → insight should not fire
    const result = calcTodayInsight({ ...base(), monthGoal: undefined, monthGoalPastDoneStreak: 3 });
    expect(result?.text ?? "").not.toContain("달 연속");
  });

  it("shouldNotReturnMonthGoalStreakWhenMonthGoalAlreadyDone", () => {
    // goal_done (10.7) fires first when monthGoalDone=true; month_goal_streak never fires
    const result = calcTodayInsight({ ...base(), monthGoalDone: true, daysLeftMonth: 10 });
    expect(result?.text ?? "").not.toContain("달 연속");
  });

  it("shouldNotReturnMonthGoalStreakInAfternoon", () => {
    // Month_goal_streak is a morning-only motivational nudge (like goal_streak)
    const result = calcTodayInsight({ ...base(), nowHour: 14 });
    expect(result?.text ?? "").not.toContain("달 연속");
  });

  it("shouldNotReturnMonthGoalStreakAtExactNoon", () => {
    const result = calcTodayInsight({ ...base(), nowHour: 12 });
    expect(result?.text ?? "").not.toContain("달 연속");
  });

  it("shouldReturnGoalDoneOverMonthGoalStreakWhenGoalDoneAndStreakBothApply", () => {
    // goal_done (10.7) beats month_goal_streak (10.76) when monthGoalDone=true with days remaining
    const result = calcTodayInsight({
      ...base(),
      monthGoalDone: true,
      daysLeftMonth: 10,
      monthGoalPastDoneStreak: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("월간 목표 달성"); // goal_done fires, not streak
    expect(result!.text).not.toContain("달 연속");
  });

  it("shouldReturnMonthGoalStreakOverProjectAheadWhenBothApply", () => {
    // month_goal_streak (10.76) beats project_ahead (10.8).
    // Project: createdDate 2024-01-01, deadline 2024-06-01, todayStr 2024-01-16 → timePct≈10%.
    // progress=40% → gap=30% ≥ 20 → project_ahead qualifies.
    // isFocus=true prevents no_focus_project (6.5) from firing first.
    const result = calcTodayInsight({
      ...base(),
      projects: [{
        name: "앱개발",
        status: "active",
        isFocus: true,
        createdDate: "2024-01-01",
        progress: 40,
        deadline: "2024-06-01",
      }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("달 연속"); // month_goal_streak wins over project_ahead
    expect(result!.text).not.toContain("앞서가는");
  });

  it("shouldReturnGoalStreakOverMonthGoalStreakWhenBothApply", () => {
    // goal_streak (10.75) beats month_goal_streak (10.76).
    // daysLeftWeek=3 avoids goal_expiry (≤2 days) from firing.
    const result = calcTodayInsight({
      ...base(),
      weekGoal: "주간 목표",
      weekGoalDone: false,
      daysLeftWeek: 3,
      weekGoalPastDoneStreak: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("주간 목표"); // goal_streak wins
    expect(result!.text).not.toContain("달 연속");
  });
});

describe("calcTodayInsight — quarter_goal_streak (priority 10.77, between month_goal_streak and project_ahead)", () => {
  // Base params: morning, quarterly goal set, not yet done, 2 past done quarters → streak fires.
  // Uses TOMORROW ("2024-01-16", Tuesday) to avoid period_start(week/month/quarter) edge cases.
  // daysLeftQuarter=20 avoids expiry (≤7) and midpoint (46/47) checks.
  function base() {
    return {
      habits: [],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      quarterGoal: "이번 분기 사이드 프로젝트 런칭",
      quarterGoalDone: false,
      daysLeftQuarter: 20,
      quarterGoalPastDoneStreak: 2,
    };
  }

  it("shouldReturnQuarterGoalStreakWhenMorningAndStreakAtLeast2", () => {
    const result = calcTodayInsight(base());
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("분기 목표");
    expect(result!.text).toContain("분기 연속");
    expect(result!.text).toContain("2");
  });

  it("shouldIncludeStreakCountInText", () => {
    const result = calcTodayInsight({ ...base(), quarterGoalPastDoneStreak: 4 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("4");
  });

  it("shouldNotReturnQuarterGoalStreakWhenStreakIs1", () => {
    // streak=1 means only 1 past quarter done — not yet a "streak" worth celebrating
    const result = calcTodayInsight({ ...base(), quarterGoalPastDoneStreak: 1 });
    expect(result?.text ?? "").not.toContain("분기 연속");
  });

  it("shouldNotReturnQuarterGoalStreakWhenStreakIs0", () => {
    const result = calcTodayInsight({ ...base(), quarterGoalPastDoneStreak: 0 });
    expect(result?.text ?? "").not.toContain("분기 연속");
  });

  it("shouldNotReturnQuarterGoalStreakWhenStreakAbsent", () => {
    const params = { ...base() };
    delete (params as Record<string, unknown>)["quarterGoalPastDoneStreak"];
    const result = calcTodayInsight(params);
    expect(result?.text ?? "").not.toContain("분기 연속");
  });

  it("shouldNotReturnQuarterGoalStreakWhenQuarterGoalAbsent", () => {
    const result = calcTodayInsight({ ...base(), quarterGoal: undefined, quarterGoalPastDoneStreak: 3 });
    expect(result?.text ?? "").not.toContain("분기 연속");
  });

  it("shouldNotReturnQuarterGoalStreakWhenQuarterGoalAlreadyDone", () => {
    // goal_done (10.7) fires first when quarterGoalDone=true with days remaining; quarter_goal_streak never fires
    const result = calcTodayInsight({ ...base(), quarterGoalDone: true, daysLeftQuarter: 20 });
    expect(result?.text ?? "").not.toContain("분기 연속");
  });

  it("shouldNotReturnQuarterGoalStreakInAfternoon", () => {
    // quarter_goal_streak is a morning-only motivational nudge (like goal_streak and month_goal_streak)
    const result = calcTodayInsight({ ...base(), nowHour: 14 });
    expect(result?.text ?? "").not.toContain("분기 연속");
  });

  it("shouldNotReturnQuarterGoalStreakAtExactNoon", () => {
    const result = calcTodayInsight({ ...base(), nowHour: 12 });
    expect(result?.text ?? "").not.toContain("분기 연속");
  });

  it("shouldReturnGoalDoneOverQuarterGoalStreakWhenGoalDoneAndStreakBothApply", () => {
    // goal_done (10.7) beats quarter_goal_streak (10.77) when quarterGoalDone=true with days remaining
    const result = calcTodayInsight({
      ...base(),
      quarterGoalDone: true,
      daysLeftQuarter: 20,
      quarterGoalPastDoneStreak: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("분기 목표 달성"); // goal_done fires, not streak
    expect(result!.text).not.toContain("분기 연속");
  });

  it("shouldReturnQuarterGoalStreakOverProjectAheadWhenBothApply", () => {
    // quarter_goal_streak (10.77) beats project_ahead (10.8).
    // Project: createdDate 2024-01-01, deadline 2024-06-01, todayStr 2024-01-16 → timePct≈11%.
    // progress=40% → gap=29% ≥ 20 → project_ahead qualifies.
    // isFocus=true prevents no_focus_project (6.5) from firing first.
    const result = calcTodayInsight({
      ...base(),
      projects: [{
        name: "앱개발",
        status: "active",
        isFocus: true,
        createdDate: "2024-01-01",
        progress: 40,
        deadline: "2024-06-01",
      }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("분기 연속"); // quarter_goal_streak wins over project_ahead
    expect(result!.text).not.toContain("앞서가는");
  });

  it("shouldReturnMonthGoalStreakOverQuarterGoalStreakWhenBothApply", () => {
    // month_goal_streak (10.76) beats quarter_goal_streak (10.77).
    // daysLeftMonth=10 avoids goal_expiry (≤2) and midpoint (15/16).
    const result = calcTodayInsight({
      ...base(),
      monthGoal: "월간 독서",
      monthGoalDone: false,
      daysLeftMonth: 10,
      monthGoalPastDoneStreak: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("월간 목표"); // month_goal_streak wins
    expect(result!.text).not.toContain("분기 연속");
  });
});

describe("calcTodayInsight — year_goal_streak (priority 10.78, between quarter_goal_streak and project_ahead)", () => {
  // Base params: morning, yearly goal set, not yet done, 1 past done year → streak fires.
  // Uses TOMORROW ("2024-01-16", Tuesday) to avoid period_start(week/month/quarter/year) edge cases.
  // daysLeftYear=350 avoids expiry (≤14) and midpoint (183/184) checks.
  function base() {
    return {
      habits: [],
      todayStr: TOMORROW,
      nowHour: 9,
      todayIntentionDate: TOMORROW,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      yearGoal: "올해 사이드 프로젝트 출시",
      yearGoalDone: false,
      daysLeftYear: 350,
      yearGoalPastDoneStreak: 1,
    };
  }

  it("shouldReturnYearGoalStreakWhenMorningAndStreakAtLeast1", () => {
    const result = calcTodayInsight(base());
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("연간 목표");
    expect(result!.text).toContain("년 연속");
    expect(result!.text).toContain("1");
  });

  it("shouldIncludeStreakCountInText", () => {
    const result = calcTodayInsight({ ...base(), yearGoalPastDoneStreak: 3 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("3");
  });

  it("shouldNotReturnYearGoalStreakWhenStreakIs0", () => {
    const result = calcTodayInsight({ ...base(), yearGoalPastDoneStreak: 0 });
    expect(result?.text ?? "").not.toContain("년 연속");
  });

  it("shouldNotReturnYearGoalStreakWhenStreakAbsent", () => {
    const params = { ...base() };
    delete (params as Record<string, unknown>)["yearGoalPastDoneStreak"];
    const result = calcTodayInsight(params);
    // base() has no other qualifying insight — result is null when streak param is absent
    expect(result).toBeNull();
  });

  it("shouldNotReturnYearGoalStreakWhenYearGoalAbsent", () => {
    const result = calcTodayInsight({ ...base(), yearGoal: undefined, yearGoalPastDoneStreak: 2 });
    expect(result?.text ?? "").not.toContain("년 연속");
  });

  it("shouldNotReturnYearGoalStreakWhenYearGoalAlreadyDone", () => {
    // goal_done (10.7) fires first when yearGoalDone=true with days remaining; year_goal_streak never fires
    const result = calcTodayInsight({ ...base(), yearGoalDone: true, daysLeftYear: 350 });
    expect(result?.text ?? "").not.toContain("년 연속");
  });

  it("shouldNotReturnYearGoalStreakInAfternoon", () => {
    // year_goal_streak is a morning-only motivational nudge (like goal_streak and month/quarter_goal_streak)
    const result = calcTodayInsight({ ...base(), nowHour: 14 });
    expect(result?.text ?? "").not.toContain("년 연속");
  });

  it("shouldNotReturnYearGoalStreakAtExactNoon", () => {
    const result = calcTodayInsight({ ...base(), nowHour: 12 });
    expect(result?.text ?? "").not.toContain("년 연속");
  });

  it("shouldReturnGoalDoneOverYearGoalStreakWhenGoalDoneAndStreakBothApply", () => {
    // goal_done (10.7) beats year_goal_streak (10.78) when yearGoalDone=true with days remaining
    const result = calcTodayInsight({
      ...base(),
      yearGoalDone: true,
      daysLeftYear: 350,
      yearGoalPastDoneStreak: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("연간 목표 달성"); // goal_done fires, not streak
    expect(result!.text).not.toContain("년 연속");
  });

  it("shouldReturnYearGoalStreakOverProjectAheadWhenBothApply", () => {
    // year_goal_streak (10.78) beats project_ahead (10.8).
    const result = calcTodayInsight({
      ...base(),
      projects: [{
        name: "앱개발",
        status: "active",
        isFocus: true,
        createdDate: "2024-01-01",
        progress: 40,
        deadline: "2024-06-01",
      }],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("년 연속"); // year_goal_streak wins over project_ahead
    expect(result!.text).not.toContain("앞서가는");
  });

  it("shouldReturnQuarterGoalStreakOverYearGoalStreakWhenBothApply", () => {
    // quarter_goal_streak (10.77) beats year_goal_streak (10.78).
    // daysLeftQuarter=20 avoids expiry (≤7) and midpoint (46/47).
    const result = calcTodayInsight({
      ...base(),
      quarterGoal: "분기 목표",
      quarterGoalDone: false,
      daysLeftQuarter: 20,
      quarterGoalPastDoneStreak: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("분기 연속"); // quarter_goal_streak wins
    expect(result!.text).not.toContain("년 연속");
  });
});

describe("calcTodayInsight — pomodoro_goal_streak_milestone (priority 7.41, before focus_streak_milestone)", () => {
  // Base: Tuesday afternoon, intention set, no habits, no competing higher-priority insights.
  // TODAY = "2024-01-16" (Tuesday) — avoids Monday period_start gate; afternoon avoids morning-only insights.
  const TODAY_T = "2024-01-16";
  const base = () => ({
    habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number }>,
    todayStr: TODAY_T,
    nowHour: 14,
    todayIntentionDate: TODAY_T,
    sessionsToday: 0,
    sessionGoal: undefined as number | undefined,
    habitsAllDoneDate: undefined as string | undefined,
  });

  it("shouldReturnGoalStreakMilestoneOn7thDay", () => {
    // pomodoroGoalStreak=6 (past days) + today = 7th consecutive goal day
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 3,
      sessionGoal: 3,
      pomodoroGoalStreak: 6,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("7");
    expect(result!.text).toContain("연속 달성");
  });

  it("shouldReturnGoalStreakMilestoneOn14thDay", () => {
    // pomodoroGoalStreak=13 (past) + today = 14th consecutive goal day
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 4,
      sessionGoal: 2,
      pomodoroGoalStreak: 13,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("14");
    expect(result!.text).toContain("연속 달성");
  });

  it("shouldReturnGoalStreakMilestoneOn30thDay", () => {
    // pomodoroGoalStreak=29 (past) + today = 30th consecutive goal day
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 5,
      sessionGoal: 4,
      pomodoroGoalStreak: 29,
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("30");
    expect(result!.text).toContain("연속 달성");
  });

  it("shouldNotReturnGoalStreakMilestoneOnNonMilestoneThreshold", () => {
    // pomodoroGoalStreak=5 → total=6, not a milestone (7/14/30 only)
    // Today goal not met (sessionsToday=0 < sessionGoal=3) → pomodoro_goal_streak nudge fires
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 0,
      sessionGoal: 3,
      pomodoroGoalStreak: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("5일 연속 달성 중"); // goal_streak nudge, not milestone
  });

  it("shouldNotReturnGoalStreakMilestoneWhenGoalNotYetMetToday", () => {
    // sessionsToday=2 < sessionGoal=4 → goal not met today → milestone skipped
    // pomodoro_goal_streak (7.45) fires instead (streak ≥ 2, goal not met)
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 2,
      sessionGoal: 4,
      pomodoroGoalStreak: 6,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("연속 달성 중"); // goal_streak nudge (7.45) fires
    expect(result!.text).not.toContain("일 연속 달성!"); // milestone badge (7.41) absent
  });

  it("shouldNotReturnGoalStreakMilestoneWhenSessionGoalAbsent", () => {
    // sessionGoal absent → no configured daily goal → milestone skipped → null
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 4,
      sessionGoal: undefined,
      pomodoroGoalStreak: 6,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGoalStreakMilestoneWhenSessionGoalIsZero", () => {
    // sessionGoal=0 treated as "no goal" → skipped → null
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 4,
      sessionGoal: 0,
      pomodoroGoalStreak: 6,
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnGoalStreakMilestoneWhenPomodoroGoalStreakAbsent", () => {
    // pomodoroGoalStreak absent → feature not wired → skipped → null
    // sessionsToday=0 < sessionGoal=4 ensures pomodoro_goal_reached also doesn't fire
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 0,
      sessionGoal: 4,
      pomodoroGoalStreak: undefined,
    });
    expect(result).toBeNull();
  });

  it("shouldGoalStreakMilestonePreemptFocusStreakMilestoneWhenBothQualify", () => {
    // pomodoroGoalStreak=6 + today = 7th goal day; focusStreak=7 also milestone
    // pomodoro_goal_streak_milestone (7.41) fires before focus_streak_milestone (7.42)
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 3,
      sessionGoal: 3,
      pomodoroGoalStreak: 6,
      focusStreak: 7,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("목표"); // goal milestone wins
    expect(result!.text).not.toContain("집중"); // focus milestone not shown
  });

  it("shouldPomodoroLastOnePreemptGoalStreakMilestone", () => {
    // sessionsToday=2, sessionGoal=3 → one away from goal → pomodoro_last_one (7) fires first
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 2,
      sessionGoal: 3,
      pomodoroGoalStreak: 6,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("1세션"); // pomodoro_last_one wins
    expect(result!.text).not.toContain("연속 달성");
  });
});

describe("calcTodayInsight — pomodoro_day_record (priority 7.49, between pomodoro_goal_streak and pomodoro_goal_reached)", () => {
  // Base: afternoon, intention set, no habits, no goal, no competing insights
  const base = () => ({
    habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number }>,
    todayStr: TODAY,
    nowHour: 14,
    todayIntentionDate: TODAY,
    sessionsToday: 0,
    sessionGoal: undefined as number | undefined,
    habitsAllDoneDate: undefined as string | undefined,
  });

  it("shouldReturnPomodoroDayRecordWhenNoGoalAndSessionsExceedHistoricalBest", () => {
    const result = calcTodayInsight({ ...base(), sessionsToday: 5, pomodoroSessionBest: 4 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("신기록");
    expect(result!.text).toContain("5");
    expect(result!.level).toBe("success");
  });

  it("shouldReturnPomodoroDayRecordWhenGoalReachedAndRecordBeaten", () => {
    const result = calcTodayInsight({
      ...base(), sessionsToday: 6, sessionGoal: 4, pomodoroSessionBest: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("신기록");
    expect(result!.text).toContain("6");
  });

  it("shouldNotReturnPomodoroDayRecordWhenSessionsEqualHistoricalBest", () => {
    const result = calcTodayInsight({ ...base(), sessionsToday: 4, pomodoroSessionBest: 4 });
    expect(result).toBeNull();
  });

  it("shouldNotReturnPomodoroDayRecordWhenSessionsBelowHistoricalBest", () => {
    const result = calcTodayInsight({ ...base(), sessionsToday: 3, pomodoroSessionBest: 4 });
    expect(result).toBeNull();
  });

  it("shouldNotReturnPomodoroDayRecordWhenPomodoroSessionBestAbsent", () => {
    const result = calcTodayInsight({ ...base(), sessionsToday: 5 });
    expect(result).toBeNull();
  });

  it("shouldNotReturnPomodoroDayRecordWhenGoalSetButNotReachedEvenIfRecordBeaten", () => {
    // sessionsToday (3) > pomodoroSessionBest (2) — record beaten, but sessionGoal (5) not yet reached
    const result = calcTodayInsight({
      ...base(), sessionsToday: 3, sessionGoal: 5, pomodoroSessionBest: 2,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnPomodoroDayRecordWhenHistoricalBestIsZeroAndSessionsGt0", () => {
    // First real session day — 1 session beats a recorded 0-session past day
    const result = calcTodayInsight({ ...base(), sessionsToday: 1, pomodoroSessionBest: 0 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("신기록");
  });

  it("shouldReturnPomodoroDayRecordInsteadOfGoalReachedWhenBothConditionsMet", () => {
    // record (7.49) preempts goal_reached (7.5): sessions beat both record and goal
    const result = calcTodayInsight({
      ...base(), sessionsToday: 6, sessionGoal: 4, pomodoroSessionBest: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("신기록"); // day record wins
    expect(result!.text).not.toContain("목표 달성"); // goal_reached not shown
  });

  it("shouldReturnPomodoroDayRecordWhenSessionGoalIsZeroAndSessionsExceedBest", () => {
    // sessionGoal=0 is treated as "no goal" — mirrors the > 0 guard in pomodoro_goal_reached
    const result = calcTodayInsight({ ...base(), sessionsToday: 3, sessionGoal: 0, pomodoroSessionBest: 2 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("신기록");
  });

  it("shouldReturnGoalStreakOverDayRecordWhenGoalNotYetReached", () => {
    // goal_streak (7.45) and day_record (7.49) are mutually exclusive when sessionGoal > 0:
    // goal_streak needs sessionsToday < sessionGoal; day_record needs sessionsToday >= sessionGoal.
    // With sessionGoal=4 and sessionsToday=2 (< 4), day_record cannot fire (goal not reached).
    // pomodoroSessionBest=1 (record would be beaten) — but record guard prevents it.
    const result = calcTodayInsight({
      ...base(), sessionsToday: 2, sessionGoal: 4, pomodoroGoalStreak: 3, pomodoroSessionBest: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("포모도로 목표"); // goal_streak fires
    expect(result!.text).not.toContain("신기록");
  });
});

describe("calcTodayInsight — focus_streak_milestone (priority 7.42, between pomodoro_last_one and pomodoro_goal_streak)", () => {
  // Base: Monday afternoon, intention set, no habits, no pomodoro goal, no competing insights.
  // TODAY = "2024-01-15" is a Monday — afternoon hour avoids all morning-only gates.
  const base = () => ({
    habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number }>,
    todayStr: TODAY,
    nowHour: 14,
    todayIntentionDate: TODAY,
    sessionsToday: 0,
    sessionGoal: undefined as number | undefined,
    habitsAllDoneDate: undefined as string | undefined,
  });

  it("shouldReturnFocusStreakMilestoneOn7DayStreak", () => {
    // 7-day consecutive focus milestone: celebratory badge when today's sessions count
    const result = calcTodayInsight({ ...base(), sessionsToday: 3, focusStreak: 7 });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("7");
    expect(result!.text).toContain("연속 집중");
  });

  it("shouldReturnFocusStreakMilestoneOn14DayStreak", () => {
    const result = calcTodayInsight({ ...base(), sessionsToday: 1, focusStreak: 14 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("14");
    expect(result!.text).toContain("연속 집중");
  });

  it("shouldReturnFocusStreakMilestoneOn30DayStreak", () => {
    const result = calcTodayInsight({ ...base(), sessionsToday: 2, focusStreak: 30 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("30");
    expect(result!.text).toContain("연속 집중");
  });

  it("shouldNotReturnFocusStreakMilestoneOnNonMilestoneStreak", () => {
    // streak=8 is not a milestone (7, 14, 30 only); sessionGoal=undefined so no pomodoro_goal_reached
    // or pomodoro_day_record fires either → overall result is null
    const result = calcTodayInsight({ ...base(), sessionsToday: 3, focusStreak: 8 });
    expect(result).toBeNull();
  });

  it("shouldNotReturnFocusStreakMilestoneWhenNoSessionsToday", () => {
    // sessionsToday=0: today's session hasn't been counted yet — guard prevents premature milestone
    const result = calcTodayInsight({ ...base(), sessionsToday: 0, focusStreak: 7 });
    expect(result).toBeNull();
  });

  it("shouldNotReturnFocusStreakMilestoneWhenFocusStreakAbsent", () => {
    // absent focusStreak → skipped silently
    const result = calcTodayInsight({ ...base(), sessionsToday: 5 });
    expect(result).toBeNull();
  });

  it("shouldPomodoroLastOnePreemptFocusStreakMilestone", () => {
    // pomodoro_last_one (7) fires before focus_streak_milestone (7.42)
    // sessionsToday=2, sessionGoal=3 → one away from goal
    const result = calcTodayInsight({ ...base(), sessionsToday: 2, sessionGoal: 3, focusStreak: 7 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("1세션"); // pomodoro_last_one wins
    expect(result!.text).not.toContain("연속 집중");
  });

  it("shouldFocusStreakMilestonePreemptPomodoroGoalStreak", () => {
    // focus_streak_milestone (7.42) fires before pomodoro_goal_streak (7.45)
    // pomodoroGoalStreak=5 and sessionsToday=1 < sessionGoal=4 — goal_streak condition met,
    // but focus_streak_milestone has higher priority on a milestone day
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 1,
      sessionGoal: 4,
      pomodoroGoalStreak: 5,
      focusStreak: 7,
      weekGoal: "임시 목표",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("7");
    expect(result!.text).toContain("연속 집중"); // milestone wins
    expect(result!.text).not.toContain("목표"); // goal_streak not shown
  });

  it("shouldFocusStreakMilestonePreemptGoalReachedOnMilestoneDay", () => {
    // focus_streak_milestone (7.42) also fires before pomodoro_goal_reached (7.5)
    // sessionsToday=4 === sessionGoal=4 — goal reached, but milestone fires first
    const result = calcTodayInsight({ ...base(), sessionsToday: 4, sessionGoal: 4, focusStreak: 7 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("연속 집중"); // milestone wins
    expect(result!.text).not.toContain("목표 달성"); // goal_reached not shown
  });
});

describe("calcTodayInsight — project_forecast (priority 10.87, at-current-pace completion date)", () => {
  // Tuesday 2024-01-16: not Monday, not 1st of month/quarter/year — no period_start triggers
  const TODAY_F = "2024-01-16";

  // Base: afternoon, intention set, no habits, no pomodoro goal, no competing insights
  const base = () => ({
    habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number }>,
    todayStr: TODAY_F,
    nowHour: 14,
    todayIntentionDate: TODAY_F,
    sessionsToday: 0,
    sessionGoal: undefined as number | undefined,
    habitsAllDoneDate: undefined as string | undefined,
  });

  // On-track project: 80 days elapsed, 101 days to deadline, 45% done
  //   createdDate = "2023-10-28" (80 days before TODAY_F)
  //   deadline   = "2024-04-26" (101 days after TODAY_F, > 7)
  //   timePct    ≈ 44% (80/181), gap = +1% — within ±20%, so project_ahead/behind don't fire
  //   velocity   = 45/80 = 0.5625%/day, daysToComplete = 55/0.5625 ≈ 97.78d → forecastDate ≈ 2024-04-22
  //   daysVsDeadline = round(101 - 97.78) = round(3.22) = 3 → "D-3"
  const onTrack = () => ({
    name: "TestProject",
    status: "active" as const,
    deadline: "2024-04-26",
    createdDate: "2023-10-28",
    progress: 45,
    lastFocusDate: undefined as string | undefined,
  });

  // Behind-pace project: 80 days elapsed, 76 days to deadline, 35% done
  //   gap = 35 - 51 = -16% — NOT ≤ -20%, so project_behind doesn't fire
  //   velocity   = 35/80 = 0.4375%/day, daysToComplete = 65/0.4375 ≈ 148.57d → forecastDate ≈ 2024-06-12
  //   daysVsDeadline = round(76 - 148.57) = round(-72.57) = -73 → warning with "73일 초과 예상"
  const behindPace = () => ({
    name: "SlowProject",
    status: "active" as const,
    deadline: "2024-04-01",
    createdDate: "2023-10-28",
    progress: 35,
    lastFocusDate: undefined as string | undefined,
  });

  it("shouldReturnProjectForecastInfoWhenOnTrack", () => {
    const result = calcTodayInsight({ ...base(), projects: [onTrack()] });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("TestProject");
    expect(result!.text).toContain("예상 완료");
    expect(result!.text).toContain("D-3");
  });

  it("shouldReturnProjectForecastWarningWhenForecastPastDeadline", () => {
    const result = calcTodayInsight({ ...base(), projects: [behindPace()] });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("SlowProject");
    expect(result!.text).toContain("73일 초과 예상");
  });

  it("shouldReturnProjectForecastExactlyOnDeadline", () => {
    // 80 days elapsed, 80 days to deadline, progress=50 → velocity=50/80=0.625, daysToComplete=50/0.625=80.0 exactly.
    // Integer cancellation: 50/(50/80) = 80 — no floating-point rounding. Math.round(80.0-80.0)=0.
    // forecastDate = 2024-04-05 = deadline → daysVsDeadline = 0 → "D-0"
    const result = calcTodayInsight({
      ...base(),
      projects: [{
        name: "PreciseProject",
        status: "active" as const,
        deadline: "2024-04-05", // 80 days from TODAY_F
        createdDate: "2023-10-28",
        progress: 50,
        lastFocusDate: undefined,
      }],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("info");
    expect(result!.text).toContain("PreciseProject");
    expect(result!.text).toContain("D-0");
  });

  it("shouldPickMostUrgentProjectWhenMultipleForecasts", () => {
    // onTrack: D-3 (info), behindPace: -73 days overdue (warning) — picks the most urgent (warning)
    const result = calcTodayInsight({ ...base(), projects: [onTrack(), behindPace()] });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("SlowProject");
  });

  it("shouldNotReturnProjectForecastForDoneProject", () => {
    const result = calcTodayInsight({
      ...base(),
      projects: [{ ...onTrack(), status: "done" as const }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectForecastForPausedProject", () => {
    const result = calcTodayInsight({
      ...base(),
      projects: [{ ...onTrack(), status: "paused" as const }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectForecastWhenDeadlineWithin7Days", () => {
    // deadline_soon (priority 8) fires first; project_forecast filter also excludes deadline ≤ 7 days.
    // "2024-01-21" is 5 days from TODAY_F → deadline_soon produces "D-5"; project_forecast never reached.
    const result = calcTodayInsight({
      ...base(),
      projects: [{ ...onTrack(), deadline: "2024-01-21" }], // 5 days away
    });
    expect(result?.text).toContain("D-5");     // deadline_soon fired
    expect(result?.text).not.toContain("예상 완료"); // project_forecast did not fire
  });

  it("shouldNotReturnProjectForecastWhenCalcCompletionForecastReturnsNull", () => {
    // daysElapsed = 1 (< 3) → calcCompletionForecast returns null — too early to establish velocity
    const result = calcTodayInsight({
      ...base(),
      projects: [{ ...onTrack(), createdDate: "2024-01-15" }],
    });
    expect(result).toBeNull();
  });

  it("shouldNotReturnProjectForecastWhenNoProjects", () => {
    const result = calcTodayInsight({ ...base(), projects: [] });
    expect(result).toBeNull();
  });
});

describe("calcTodayInsight — project_context_switching (priority 10.05, between project_stale and streak_recession)", () => {
  // Suppress all higher-priority insights:
  // - no high-streak habits (streak_at_risk)
  // - no deadlines (deadline_critical/soon)
  // - no CI failure, no open PRs, no perfect day
  // - nowHour=14 and todayIntentionDate=TODAY suppresses intention_missing/period_start/no_focus_project
  // - no pomodoro goal, no momentum decline, no goal expiry
  // - all projects recently focused (≤6 days) so project_stale (priority 10) does NOT fire
  function base() {
    return {
      habits: [],
      todayStr: TODAY,
      nowHour: 14,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
    };
  }

  function active(name: string, lastFocusDate?: string) {
    return { name, status: "active" as const, lastFocusDate };
  }

  it("shouldReturnProjectContextSwitchingWhen4ProjectsFocusedInLast7Days", () => {
    const result = calcTodayInsight({
      ...base(),
      projects: [
        active("앱", DAYS_2_AGO),
        active("웹", DAYS_3_AGO),
        active("라이브러리", DAYS_4_AGO),
        active("CLI", DAYS_5_AGO),
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("4");
    expect(result!.text).toContain("집중");
  });

  it("shouldReturnProjectContextSwitchingWith5ProjectsAndShowCorrectCount", () => {
    const result = calcTodayInsight({
      ...base(),
      projects: [
        active("앱", TODAY),
        active("웹", DAYS_2_AGO),
        active("라이브러리", DAYS_3_AGO),
        active("CLI", DAYS_4_AGO),
        active("서버", DAYS_5_AGO),
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("5");
  });

  it("shouldNotReturnProjectContextSwitchingWhenOnly3ProjectsFocused", () => {
    const result = calcTodayInsight({
      ...base(),
      projects: [
        active("앱", DAYS_2_AGO),
        active("웹", DAYS_3_AGO),
        active("라이브러리", DAYS_4_AGO),
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldNotCountDoneProjectsInContextSwitchingTotal", () => {
    // 3 active + 2 done = only 3 count → below threshold
    const result = calcTodayInsight({
      ...base(),
      projects: [
        active("앱", DAYS_2_AGO),
        active("웹", DAYS_3_AGO),
        active("라이브러리", DAYS_4_AGO),
        { name: "완료1", status: "done" as const, lastFocusDate: TODAY },
        { name: "완료2", status: "done" as const, lastFocusDate: DAYS_2_AGO },
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldNotCountPausedProjectsInContextSwitchingTotal", () => {
    // 3 active + 1 paused = only 3 count → below threshold
    const result = calcTodayInsight({
      ...base(),
      projects: [
        active("앱", DAYS_2_AGO),
        active("웹", DAYS_3_AGO),
        active("라이브러리", DAYS_4_AGO),
        { name: "멈춤", status: "paused" as const, lastFocusDate: TODAY },
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldNotCountProjectsWithoutLastFocusDate", () => {
    // 3 with lastFocusDate + 1 without = only 3 count → below threshold
    const result = calcTodayInsight({
      ...base(),
      projects: [
        active("앱", DAYS_2_AGO),
        active("웹", DAYS_3_AGO),
        active("라이브러리", DAYS_4_AGO),
        active("신규"),  // no lastFocusDate
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldCountProjectFocusedExactly6DaysAgoAsRecentlyFocused", () => {
    // 6 days ago = daysAgo=6 → boundary: included in "last 7 days" (daysAgo ≤ 6)
    // 3 projects within range + 1 at exactly 6 days ago = 4 total → fires
    const result = calcTodayInsight({
      ...base(),
      projects: [
        active("앱", DAYS_2_AGO),
        active("웹", DAYS_3_AGO),
        active("라이브러리", DAYS_4_AGO),
        active("6일전", DAYS_6_AGO),  // daysAgo=6: exactly at boundary → included
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("4");
    expect(result!.text).toContain("전환");
  });

  it("shouldNotCountProjectsWithFutureFocusDate", () => {
    // Future lastFocusDate (daysAgo < 0) must be excluded — not a "recently focused" signal.
    // 3 within range + 1 future = only 3 count → below threshold
    const result = calcTodayInsight({
      ...base(),
      projects: [
        active("앱", DAYS_2_AGO),
        active("웹", DAYS_3_AGO),
        active("라이브러리", DAYS_4_AGO),
        active("미래", TOMORROW),  // future date → daysAgo = -1 → excluded
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldReturnProjectStaleBeforeProjectContextSwitching", () => {
    // 4 recently-focused projects + 1 stale (7 days) → project_stale (10) fires before context_switching (10.05)
    const result = calcTodayInsight({
      ...base(),
      projects: [
        active("앱", DAYS_2_AGO),
        active("웹", DAYS_3_AGO),
        active("라이브러리", DAYS_4_AGO),
        active("CLI", DAYS_5_AGO),
        active("방치됨", DAYS_7_AGO),  // stale → project_stale wins
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("방치됨");
    expect(result!.text).not.toContain("전환");
  });

  // ── intention_done ─────────────────────────────────────────────────────────
  describe("intention_done (priority 4.5)", () => {
    function intentionBase() {
      return {
        habits: [],
        todayStr: TODAY,
        nowHour: 15,
        todayIntentionDate: TODAY,
        sessionsToday: 0,
        sessionGoal: undefined as number | undefined,
        habitsAllDoneDate: undefined as string | undefined,
      };
    }

    it("shouldReturnIntentionDoneWhenDoneAndDateMatchesToday", () => {
      const result = calcTodayInsight({ ...intentionBase(), todayIntentionDone: true });
      expect(result).not.toBeNull();
      expect(result!.level).toBe("success");
      expect(result!.text).toContain("의도 달성");
    });

    it("shouldNotReturnIntentionDoneWhenNotDone", () => {
      // intentionBase() has no active high-priority triggers — result is null when not done
      const result = calcTodayInsight({ ...intentionBase(), todayIntentionDone: false });
      expect(result).toBeNull();
    });

    it("shouldNotReturnIntentionDoneWhenUndefined", () => {
      // absent todayIntentionDone behaves identically to false — no badge fires
      const result = calcTodayInsight({ ...intentionBase(), todayIntentionDone: undefined });
      expect(result).toBeNull();
    });

    it("shouldNotReturnIntentionDoneWhenDateMismatch", () => {
      // stale todayIntentionDone from previous day — date guard must block it; no triggers active → null
      const result = calcTodayInsight({ ...intentionBase(), todayIntentionDone: true, todayIntentionDate: YESTERDAY });
      expect(result).toBeNull();
    });

    it("shouldReturnIntentionDoneInMorningBeforeLowerPriorityInsights", () => {
      // morning (nowHour < 12) + done today → intention_done (4.5) fires even when period_start / intention_streak could fire
      const result = calcTodayInsight({
        ...intentionBase(),
        nowHour: 9,
        todayIntentionDone: true,
        intentionConsecutiveDays: 7,
        daysLeftWeek: 7,
      });
      expect(result).not.toBeNull();
      expect(result!.level).toBe("success");
      expect(result!.text).toContain("의도 달성");
    });

    it("shouldPreferPerfectDayOverIntentionDone", () => {
      // perfect_day (priority 4) must preempt intention_done (4.5)
      const result = calcTodayInsight({
        ...intentionBase(),
        todayIntentionDone: true,
        habits: [{ name: "운동", streak: 1, lastChecked: TODAY }],
        habitsAllDoneDate: TODAY,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("완벽한 습관");
      expect(result!.text).not.toContain("의도 달성");
    });

    it("shouldReturnIntentionDoneBeforeLowerPriorityInsight", () => {
      // intention_done (4.5) must fire instead of lower-priority intention_streak (11.1)
      const result = calcTodayInsight({
        ...intentionBase(),
        todayIntentionDone: true,
        intentionConsecutiveDays: 7,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("의도 달성");
      expect(result!.text).not.toContain("연속");
    });
  });

  // ── intention_done_streak ──────────────────────────────────────────────────
  describe("intention_done_streak (priority 4.5 enhanced)", () => {
    function intentionDoneBase() {
      return {
        habits: [],
        todayStr: TODAY,
        nowHour: 15,
        todayIntentionDate: TODAY,
        todayIntentionDone: true as boolean | undefined,
        sessionsToday: 0,
        sessionGoal: undefined as number | undefined,
        habitsAllDoneDate: undefined as string | undefined,
      };
    }

    it("shouldShowStreakCountWhenIntentionDoneStreakAtLeast3", () => {
      const result = calcTodayInsight({ ...intentionDoneBase(), intentionDoneStreak: 3 });
      expect(result).not.toBeNull();
      expect(result!.level).toBe("success");
      expect(result!.text).toContain("3일 연속 의도 달성");
    });

    it("shouldShowStreakCountOf5WhenStreakIs5", () => {
      const result = calcTodayInsight({ ...intentionDoneBase(), intentionDoneStreak: 5 });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("5일 연속 의도 달성");
    });

    it("shouldShowPlainMessageWhenStreakBelow3", () => {
      // intentionDoneStreak=2 → below threshold, plain "오늘의 의도 달성!" fires
      const result = calcTodayInsight({ ...intentionDoneBase(), intentionDoneStreak: 2 });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("의도 달성");
      expect(result!.text).not.toContain("연속");
    });

    it("shouldShowPlainMessageWhenStreakAbsent", () => {
      // no intentionDoneStreak → plain message
      const result = calcTodayInsight({ ...intentionDoneBase(), intentionDoneStreak: undefined });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("의도 달성");
      expect(result!.text).not.toContain("연속");
    });

    it("shouldNotFireWhenNotDoneEvenWithHighStreak", () => {
      // streak=5 but todayIntentionDone=false → no badge
      const result = calcTodayInsight({ ...intentionDoneBase(), todayIntentionDone: false, intentionDoneStreak: 5 });
      expect(result).toBeNull();
    });

    it("shouldNotFireWhenDateMismatchEvenWithHighStreak", () => {
      // done but date from yesterday → stale state guard blocks it
      const result = calcTodayInsight({ ...intentionDoneBase(), todayIntentionDate: YESTERDAY, intentionDoneStreak: 5 });
      expect(result).toBeNull();
    });

    it("shouldPreferPerfectDayOverIntentionDoneStreak", () => {
      // perfect_day (priority 4) must preempt intention_done_streak (4.5)
      const result = calcTodayInsight({
        ...intentionDoneBase(),
        intentionDoneStreak: 5,
        habits: [{ name: "운동", streak: 1, lastChecked: TODAY }],
        habitsAllDoneDate: TODAY,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("완벽한 습관");
      expect(result!.text).not.toContain("연속 의도");
    });
  });

  // ── habit_first_check_in ────────────────────────────────────────────────────
  describe("habit_first_check_in (priority 6.85)", () => {
    /**
     * Base params: afternoon, no intention, no sessions — ensures no other insight fires.
     * Individual tests inline-override habits, nowHour, todayIntentionDate, etc.
     */
    function firstBase() {
      return {
        habits: [] as ReturnType<typeof habit>[],
        todayStr: TODAY,
        nowHour: 14,
        todayIntentionDate: undefined as string | undefined,
        sessionsToday: 0,
        sessionGoal: undefined as number | undefined,
        habitsAllDoneDate: undefined as string | undefined,
      };
    }

    it("shouldReturnHabitFirstCheckInWhenBrandNewHabitCheckedToday", () => {
      // streak=1, lastChecked=TODAY, no bestStreak → genuine first check-in ever
      const result = calcTodayInsight({
        ...firstBase(),
        habits: [{ name: "독서", streak: 1, lastChecked: TODAY }],
      });
      expect(result).not.toBeNull();
      expect(result!.level).toBe("success");
      expect(result!.text).toContain("독서");
    });

    it("shouldReturnHabitFirstCheckInWhenBestStreakIsExactlyOne", () => {
      // bestStreak=1 means the user has never exceeded a 1-day streak — still a "first step" context
      const result = calcTodayInsight({
        ...firstBase(),
        habits: [{ name: "운동", streak: 1, lastChecked: TODAY, bestStreak: 1 }],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("운동");
    });

    it("shouldNotReturnHabitFirstCheckInWhenBestStreakAboveOne", () => {
      // bestStreak=2 means the user has achieved a streak before — this is a restart, not a first
      const result = calcTodayInsight({
        ...firstBase(),
        habits: [{ name: "운동", streak: 1, lastChecked: TODAY, bestStreak: 2 }],
      });
      expect(result).toBeNull();
    });

    it("shouldNotReturnHabitFirstCheckInWhenNotCheckedToday", () => {
      // lastChecked=YESTERDAY — the user has not checked in today yet; no badge
      // nowHour: 13 to avoid almost_perfect_day: with 1 unchecked habit at nowHour=14, remaining=1 → almost_perfect_day fires
      const result = calcTodayInsight({
        ...firstBase(),
        nowHour: 13,
        habits: [{ name: "독서", streak: 1, lastChecked: YESTERDAY }],
      });
      expect(result).toBeNull();
    });

    it("shouldNotReturnHabitFirstCheckInWhenStreakAboveOne", () => {
      // streak=2 means the user is on day 2+ — not the first check-in
      const result = calcTodayInsight({
        ...firstBase(),
        habits: [{ name: "독서", streak: 2, lastChecked: TODAY }],
      });
      expect(result).toBeNull();
    });

    it("shouldPreferBestDayAheadOverHabitFirstCheckIn", () => {
      // best_day_ahead (6.82) fires before habit_first_check_in (6.85) — positive day-context beats new-habit nudge
      // TOMORROW is used as the reference date (todayStr) so that lastChecked: TOMORROW aligns with "today";
      // this avoids accidentally triggering streak_at_risk or other TODAY-anchored insights in the base params.
      const result = calcTodayInsight({
        ...firstBase(),
        todayStr: TOMORROW,
        todayIntentionDate: TOMORROW,
        nowHour: 9,
        habits: [{ name: "독서", streak: 1, lastChecked: TOMORROW }],
        todayIsBestHabitDay: true,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("강한 요일");
      expect(result!.text).not.toContain("독서");
    });

    it("shouldPickFirstHabitInArrayOrderWhenMultipleQualify", () => {
      // .find() picks the first qualifying habit — array order determines which name appears
      const result = calcTodayInsight({
        ...firstBase(),
        habits: [
          { name: "독서", streak: 1, lastChecked: TODAY },
          { name: "운동", streak: 1, lastChecked: TODAY },
        ],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("독서");
      expect(result!.text).not.toContain("운동");
    });

    it("shouldPreferHabitFirstCheckInOverPomodoroLastOne", () => {
      // habit_first_check_in (6.85) fires before pomodoro_last_one (7) — new habit start preempts pomodoro nudge
      const result = calcTodayInsight({
        ...firstBase(),
        habits: [{ name: "명상", streak: 1, lastChecked: TODAY }],
        sessionsToday: 2,
        sessionGoal: 3,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("명상");
      expect(result!.text).not.toContain("포모도로");
    });
  });

  // ── habit_comeback ──────────────────────────────────────────────────────────
  describe("habit_comeback", () => {
    /**
     * Base params for habit_comeback tests — designed so no other insight triggers:
     * - nowHour: 14  → past intention_missing window (< 12h) and below almost_perfect_day's
     *   "1-2 remaining" threshold (habits is [], remaining=0 → not 1 or 2)
     * - todayIntentionDate: undefined  → intention_missing would require nowHour < 12, which is false
     * - sessionsToday: 0, sessionGoal: undefined → all pomodoro checks silently skipped
     * Individual tests that need habits or different hours override these fields inline.
     */
    function comebackBase() {
      return {
        habits: [] as ReturnType<typeof habit>[],
        todayStr: TODAY,
        nowHour: 14,
        todayIntentionDate: undefined as string | undefined,
        sessionsToday: 0,
        sessionGoal: undefined as number | undefined,
        habitsAllDoneDate: undefined as string | undefined,
      };
    }

    it("shouldReturnHabitComebackWhenLongStreakBrokenAndRecovering", () => {
      const result = calcTodayInsight({
        ...comebackBase(),
        habits: [habit("독서", 3, TODAY, 20)],
      });
      expect(result).not.toBeNull();
      expect(result!.level).toBe("success");
      expect(result!.text).toContain("독서");
      expect(result!.text).toContain("회복");
      expect(result!.text).toContain("3");
    });

    it("shouldNotReturnHabitComebackWhenBestStreakBelow14", () => {
      // bestStreak=13 is below the threshold — short historical streaks are common noise
      const result = calcTodayInsight({
        ...comebackBase(),
        habits: [habit("독서", 3, TODAY, 13)],
      });
      expect(result).toBeNull();
    });

    it("shouldNotReturnHabitComebackWhenStreakBelow3", () => {
      // streak=2 is not yet a meaningful recovery signal
      const result = calcTodayInsight({
        ...comebackBase(),
        habits: [habit("독서", 2, TODAY, 20)],
      });
      expect(result).toBeNull();
    });

    it("shouldNotReturnHabitComebackWhenStreakEqualsBestStreak", () => {
      // streak === bestStreak: user is back at peak; personal_best covers this milestone
      const result = calcTodayInsight({
        ...comebackBase(),
        habits: [habit("독서", 20, TODAY, 20)],
      });
      expect(result).toBeNull();
    });

    it("shouldNotReturnHabitComebackWhenNotCheckedInToday", () => {
      // lastChecked is yesterday — today's check-in hasn't happened yet; no badge
      // nowHour: 13 to avoid almost_perfect_day: with lastChecked=YESTERDAY, remaining=1 which
      // satisfies the "1-2 habits left" condition — nowHour=14 would trigger it; 13 stays safe.
      const result = calcTodayInsight({
        ...comebackBase(),
        nowHour: 13,
        habits: [habit("독서", 3, YESTERDAY, 20)],
      });
      expect(result).toBeNull();
    });

    it("shouldReturnHabitComebackWhenBestStreakExactly14", () => {
      // bestStreak=14 is the minimum qualifying value; boundary inclusion test
      const result = calcTodayInsight({
        ...comebackBase(),
        habits: [habit("독서", 3, TODAY, 14)],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("회복");
    });

    it("shouldNotReturnHabitComebackWhenBestStreakAbsent", () => {
      // no bestStreak recorded at all — can't confirm a long past streak was broken
      const result = calcTodayInsight({
        ...comebackBase(),
        habits: [habit("독서", 3, TODAY, undefined)],
      });
      expect(result).toBeNull();
    });

    it("shouldPickHabitWithHighestStreakWhenMultipleQualify", () => {
      // two qualifying habits: "운동" (5일) and "독서" (3일) → shows 운동 (higher streak)
      const result = calcTodayInsight({
        ...comebackBase(),
        habits: [
          habit("독서", 3, TODAY, 20),
          habit("운동", 5, TODAY, 30),
        ],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("운동");
      expect(result!.text).toContain("5");
    });

    it("shouldPreferBestDayAheadOverHabitComeback", () => {
      // best_day_ahead (6.82) fires before habit_comeback (6.9) — morning + todayIsBestHabitDay preempts
      // Uses TOMORROW (Tuesday) + todayIntentionDate: TOMORROW to prevent intention_missing (priority 5) from firing
      const result = calcTodayInsight({
        ...comebackBase(),
        todayStr: TOMORROW,
        todayIntentionDate: TOMORROW,
        nowHour: 9,
        habits: [habit("독서", 3, TOMORROW, 20)],
        todayIsBestHabitDay: true,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("강한 요일");
      expect(result!.text).not.toContain("회복");
    });

    it("shouldPreferHabitComebackOverPomodoroLastOne", () => {
      // habit_comeback (6.9) fires before pomodoro_last_one (7) — comeback preempts one-session-away nudge
      const result = calcTodayInsight({
        ...comebackBase(),
        habits: [habit("독서", 3, TODAY, 20)],
        sessionsToday: 2,
        sessionGoal: 3,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("회복");
      expect(result!.text).not.toContain("포모도로");
    });
  });

  describe("calcTodayInsight — pomodoro_today_above_avg (priority 10.45, between almost_perfect_day and momentum_rise)", () => {
    // Base: afternoon, intention set, no habits, no session goal, no competing insights
    const base = () => ({
      habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number }>,
      todayStr: TODAY,
      nowHour: 15,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined as number | undefined,
      habitsAllDoneDate: undefined as string | undefined,
    });

    it("shouldReturnAboveAvgWhenSessionsExceedAverageByAtLeastTwo", () => {
      const result = calcTodayInsight({ ...base(), sessionsToday: 5, pomodoroRecentAvg: 3 });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("평소보다");
      expect(result!.text).toContain("2");
      expect(result!.level).toBe("success");
    });

    it("shouldReturnAboveAvgWithCorrectExtraCountWhenDifferenceIsLarger", () => {
      const result = calcTodayInsight({ ...base(), sessionsToday: 7, pomodoroRecentAvg: 2 });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("5");
    });

    it("shouldNotFireWhenDifferenceIsExactlyOne", () => {
      const result = calcTodayInsight({ ...base(), sessionsToday: 4, pomodoroRecentAvg: 3 });
      expect(result).toBeNull();
    });

    it("shouldNotFireWhenFractionalDifferenceIsBelowTwo", () => {
      // avg=3.1, sessionsToday=5 → diff=1.9 < 2 → no badge (fractional boundary)
      const result = calcTodayInsight({ ...base(), sessionsToday: 5, pomodoroRecentAvg: 3.1 });
      expect(result).toBeNull();
    });

    it("shouldNotFireWhenDifferenceIsExactlyOnePointFive", () => {
      // avg=2.5, sessionsToday=4 → diff=1.5 < 2 → no badge
      const result = calcTodayInsight({ ...base(), sessionsToday: 4, pomodoroRecentAvg: 2.5 });
      expect(result).toBeNull();
    });

    it("shouldNotFireWhenPomodoroRecentAvgAbsent", () => {
      const result = calcTodayInsight({ ...base(), sessionsToday: 10 });
      expect(result).toBeNull();
    });

    it("shouldFireWhenAvgIsZeroAndSessionsTodayAtLeastTwo", () => {
      // new user with no history — avg=0, sessionsToday=2 → fires
      const result = calcTodayInsight({ ...base(), sessionsToday: 2, pomodoroRecentAvg: 0 });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("평소보다");
    });

    it("shouldBePreemptedByPomodoroGoalReached", () => {
      // pomodoro_goal_reached (7.5) fires before pomodoro_today_above_avg (10.45)
      const result = calcTodayInsight({
        ...base(),
        sessionsToday: 5, sessionGoal: 4, pomodoroRecentAvg: 2,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("목표 달성");
      expect(result!.text).not.toContain("평소보다");
    });

    it("shouldBePreemptedByPomodoroDayRecord", () => {
      // pomodoro_day_record (7.49) fires before pomodoro_today_above_avg (10.45)
      const result = calcTodayInsight({
        ...base(),
        sessionsToday: 6, pomodoroSessionBest: 5, pomodoroRecentAvg: 2,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("신기록");
      expect(result!.text).not.toContain("평소보다");
    });

    it("shouldBePreemptedByAlmostPerfectDay", () => {
      // almost_perfect_day (10.3) fires before pomodoro_today_above_avg (10.45)
      // 2 habits remain unchecked in the afternoon → almost_perfect_day fires
      // bestStreak: 5 on checked habit prevents habit_first_check_in (6.85) from firing earlier
      const result = calcTodayInsight({
        ...base(),
        nowHour: 14,
        habits: [
          { name: "운동", streak: 1, lastChecked: TODAY, bestStreak: 5 },
          { name: "독서", streak: 1, lastChecked: YESTERDAY },
          { name: "명상", streak: 1, lastChecked: YESTERDAY },
        ],
        sessionsToday: 5, pomodoroRecentAvg: 2,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("완벽한 하루");
      expect(result!.text).not.toContain("평소보다");
    });

    it("shouldYieldToMomentumRise", () => {
      // momentum_rise (10.5) fires AFTER pomodoro_today_above_avg (10.45)
      // When both conditions are true, pomodoro_today_above_avg fires first (lower priority number)
      const result = calcTodayInsight({
        ...base(),
        sessionsToday: 5, pomodoroRecentAvg: 2,
        momentumHistory: RISING_HISTORY,
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("평소보다");
      expect(result!.text).not.toContain("상승");
    });
  });

});

describe("calcTodayInsight — pomodoro_week_record (priority 7.495, between pomodoro_day_record and pomodoro_goal_reached)", () => {
  // Base: Wednesday afternoon ("2024-01-17"), intention set, no habits, no competing insights.
  // Wednesday (not Monday) ensures week_record has prior days in the week to compare against.
  const WED = "2024-01-17"; // Wednesday; TODAY="2024-01-15" is confirmed Monday so +2 = Wednesday
  const base = () => ({
    habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number }>,
    todayStr: WED,
    nowHour: 14,
    todayIntentionDate: WED,
    sessionsToday: 0,
    sessionGoal: undefined as number | undefined,
    habitsAllDoneDate: undefined as string | undefined,
  });

  it("shouldReturnWeekRecordBadgeWhenCurrentWeekAheadOfPrevWeek", () => {
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 5,
      pomodoroWeekRecord: { currentWeekTotal: 10, prevWeekTotal: 7 },
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("이번 주");
    expect(result!.text).toContain("신기록");
    expect(result!.text).toContain("10");
    expect(result!.level).toBe("success");
  });

  it("shouldNotFireWhenSessionsTodayIsZero", () => {
    // sessionsToday > 0 is a load-bearing guard — user must be actively focusing for the badge to fire.
    // Check that the week_record badge text is absent rather than asserting the overall return is null,
    // so the test remains meaningful even if a future insight fires on the sparse base fixture.
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 0,
      pomodoroWeekRecord: { currentWeekTotal: 5, prevWeekTotal: 3 },
    });
    expect(result?.text ?? "").not.toContain("이번 주");
  });

  it("shouldNotFireWhenPrevWeekTotalIsZero", () => {
    // No prev-week baseline — any sessions this week would be a trivial "record"; skipped.
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 3,
      pomodoroWeekRecord: { currentWeekTotal: 3, prevWeekTotal: 0 },
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenCurrentWeekBehindPrevWeek", () => {
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 2,
      pomodoroWeekRecord: { currentWeekTotal: 5, prevWeekTotal: 8 },
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenTotalsAreEqual", () => {
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 3,
      pomodoroWeekRecord: { currentWeekTotal: 6, prevWeekTotal: 6 },
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenPomodoroWeekRecordAbsent", () => {
    const result = calcTodayInsight({ ...base(), sessionsToday: 5 });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByPomodoroDayRecordWhenBothConditionsMet", () => {
    // day_record (7.49) has higher priority than week_record (7.495)
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 6,
      pomodoroSessionBest: 4,                                        // day record: 6 > 4
      pomodoroWeekRecord: { currentWeekTotal: 12, prevWeekTotal: 8 }, // week record also true
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("신기록");
    expect(result!.text).toContain("6");   // day record shows today's session count
    expect(result!.text).not.toContain("이번 주"); // week record message not shown
  });

  it("shouldPreemptGoalReachedWhenBothConditionsMet", () => {
    // week_record (7.495) has higher priority than goal_reached (7.5)
    const result = calcTodayInsight({
      ...base(),
      sessionsToday: 5,
      sessionGoal: 4,                                                 // goal reached: 5 >= 4
      pomodoroWeekRecord: { currentWeekTotal: 10, prevWeekTotal: 7 }, // week record also true
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("이번 주");
    expect(result!.text).toContain("신기록");
    expect(result!.text).not.toContain("목표 달성");
  });
});

describe("calcTodayInsight — momentum_streak_milestone (priority 10.46, between pomodoro_today_above_avg and momentum_rise)", () => {
  // Base: afternoon, intention set, no habits, no sessions — no competing insights at this priority band.
  const base = () => ({
    habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number }>,
    todayStr: TODAY,
    nowHour: 15,
    todayIntentionDate: TODAY,
    sessionsToday: 0,
    sessionGoal: undefined as number | undefined,
    habitsAllDoneDate: undefined as string | undefined,
  });

  // today's entry with score ≥ 40 is required for the badge to fire (double-fire guard)
  const todayQualifying = [{ date: TODAY, score: 55, tier: "mid" as const }];

  it("shouldReturnMilestoneAt7Days", () => {
    const result = calcTodayInsight({ ...base(), momentumStreak: 7, momentumHistory: todayQualifying });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("7");
    expect(result!.text).toContain("모멘텀");
    expect(result!.level).toBe("success");
  });

  it("shouldReturnMilestoneAt14Days", () => {
    const result = calcTodayInsight({ ...base(), momentumStreak: 14, momentumHistory: todayQualifying });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("14");
    expect(result!.level).toBe("success");
  });

  it("shouldReturnMilestoneAt30Days", () => {
    const result = calcTodayInsight({ ...base(), momentumStreak: 30, momentumHistory: todayQualifying });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("30");
    expect(result!.level).toBe("success");
  });

  it("shouldNotFireForNonMilestoneStreak8", () => {
    const result = calcTodayInsight({ ...base(), momentumStreak: 8, momentumHistory: todayQualifying });
    expect(result).toBeNull();
  });

  it("shouldNotFireForNonMilestoneStreak6", () => {
    const result = calcTodayInsight({ ...base(), momentumStreak: 6, momentumHistory: todayQualifying });
    expect(result).toBeNull();
  });

  it("shouldNotFireForStreak0", () => {
    const result = calcTodayInsight({ ...base(), momentumStreak: 0, momentumHistory: todayQualifying });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenMomentumStreakAbsent", () => {
    const result = calcTodayInsight({ ...base(), momentumHistory: todayQualifying });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenTodayEntryAbsentFromHistory", () => {
    // today entry absent → score unknown → treat as not qualifying (same as score < 40)
    const result = calcTodayInsight({
      ...base(),
      momentumStreak: 7,
      momentumHistory: [{ date: YESTERDAY, score: 70, tier: "high" as const }], // no today entry
    });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByPomodoroAboveAvgWhenBothConditionsMet", () => {
    // pomodoro_today_above_avg (10.45) fires BEFORE momentum_streak_milestone (10.46) in the priority chain
    const result = calcTodayInsight({
      ...base(),
      momentumStreak: 7,
      momentumHistory: todayQualifying, // today qualifies so milestone guard passes
      sessionsToday: 5,
      pomodoroRecentAvg: 3, // 5 - 3 = 2 ≥ 2 → above_avg fires first
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("평소보다"); // above_avg badge shown
    expect(result!.text).not.toContain("연속"); // milestone badge suppressed
  });

  it("shouldFireBeforeMomentumRiseWhenBothConditionsMet", () => {
    // momentum_streak_milestone (10.46) fires BEFORE momentum_rise (10.5) in the priority chain
    const rising = [
      { date: DAYS_2_AGO, score: 50, tier: "mid" as const },
      { date: YESTERDAY, score: 60, tier: "mid" as const },
      { date: TODAY, score: 70, tier: "mid" as const },
    ];
    const result = calcTodayInsight({
      ...base(),
      momentumStreak: 7,
      momentumHistory: rising, // 3-day rising trend also qualifies; today score=70 ≥ 40 → milestone fires
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("7");
    expect(result!.text).toContain("모멘텀");
    expect(result!.text).not.toContain("상승"); // momentum_rise message suppressed
  });

  it("shouldNotFireWhenTodayScoreNotQualifyingPreventingDoubleFire", () => {
    // Simulates day-8 morning: streak=7 returned by calcMomentumStreak (counting days 1-7),
    // but today's score is 10 (no activity yet, score < 40) — badge must be suppressed.
    const result = calcTodayInsight({
      ...base(),
      momentumStreak: 7,
      momentumHistory: [
        { date: DAYS_6_AGO, score: 50, tier: "mid" as const },
        { date: DAYS_5_AGO, score: 55, tier: "mid" as const },
        { date: DAYS_4_AGO, score: 60, tier: "mid" as const },
        { date: DAYS_3_AGO, score: 45, tier: "mid" as const },
        { date: DAYS_2_AGO, score: 50, tier: "mid" as const },
        { date: YESTERDAY, score: 70, tier: "high" as const },
        { date: TODAY, score: 10, tier: "low" as const }, // today's activity not yet done
      ],
    });
    expect(result).toBeNull(); // double-fire guard prevents re-emission
  });
});

// ── habit_best_streak_approach ──────────────────────────────────────────
describe("calcTodayInsight — habit_best_streak_approach (priority 11.02, between personal_best and habit_target_near)", () => {
  function base() {
    return {
      habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number; targetStreak?: number; checkHistory?: string[] }>,
      todayStr: TODAY,
      // nowHour: 12 — above morning blocks (<12) and below almost_perfect_day (≥14), ensuring no other insight fires
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined as number | undefined,
      habitsAllDoneDate: YESTERDAY,
    };
  }

    it("shouldFireWithGap1WhenCheckedToday", () => {
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "운동", streak: 9, lastChecked: TODAY, bestStreak: 10 }],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("운동");
      expect(result!.text).toContain("1일");
      expect(result!.level).toBe("success");
    });

    it("shouldFireWithGap2WhenCheckedToday", () => {
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "독서", streak: 8, lastChecked: TODAY, bestStreak: 10 }],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("독서");
      expect(result!.text).toContain("2일");
      expect(result!.level).toBe("success");
    });

    it("shouldNotFireWithGap3", () => {
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "운동", streak: 7, lastChecked: TODAY, bestStreak: 10 }],
      });
      expect(result).toBeNull();
    });

    it("shouldNotFireWhenGap0StreakEqualsBest", () => {
      // bestStreak=10 is not a fixed milestone (7/30/100), so personal_best also does not fire
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "운동", streak: 10, lastChecked: TODAY, bestStreak: 10 }],
      });
      expect(result).toBeNull();
    });

    it("shouldNotFireWhenBestStreakAbsent", () => {
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "운동", streak: 9, lastChecked: TODAY, bestStreak: undefined }],
      });
      expect(result).toBeNull();
    });

    it("shouldNotFireWhenBestStreak3OrLess", () => {
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "운동", streak: 2, lastChecked: TODAY, bestStreak: 3 }],
      });
      expect(result).toBeNull();
    });

    it("shouldNotFireWhenLastCheckedNotToday", () => {
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "운동", streak: 9, lastChecked: YESTERDAY, bestStreak: 10 }],
      });
      expect(result).toBeNull();
    });

    it("shouldPickHabitWithSmallestGapWhenMultipleQualify", () => {
      const result = calcTodayInsight({
        ...base(),
        habits: [
          { name: "독서", streak: 8, lastChecked: TODAY, bestStreak: 10 }, // gap=2
          { name: "운동", streak: 9, lastChecked: TODAY, bestStreak: 10 }, // gap=1
        ],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("운동"); // closer to best
      expect(result!.text).toContain("1일");
    });

    it("shouldBePreemptedByPersonalBestAtMilestone", () => {
      // streak=7=bestStreak → personal_best fires (7 is in PERSONAL_BEST_MILESTONES)
      // habit_best_streak_approach: streak < bestStreak → 7 < 7 = false → not reachable
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "운동", streak: 7, lastChecked: TODAY, bestStreak: 7 }],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("역대 최고"); // personal_best badge
      expect(result!.text).not.toContain("역대 최고까지"); // our badge suppressed
    });

    it("shouldBePreemptedByHabitComebackWhenBestStreakGe14AndGapLe2", () => {
      // bestStreak=16 >= 14, streak=14, gap=2 → both habit_comeback (6.9) and approachBest (11.02) qualify
      // habit_comeback has higher priority (6.9 < 11.02) so it fires first
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "운동", streak: 14, lastChecked: TODAY, bestStreak: 16 }],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("회복"); // habit_comeback badge
      expect(result!.text).not.toContain("역대 최고까지"); // approachBest suppressed
    });

    it("shouldFireBeforeHabitTargetNearWhenBothConditionsMet", () => {
      // gap=1 to bestStreak (11.02) AND gap=2 to targetStreak (11.05) — our badge wins
      const result = calcTodayInsight({
        ...base(),
        habits: [{ name: "운동", streak: 9, lastChecked: TODAY, bestStreak: 10, targetStreak: 11 }],
      });
      expect(result).not.toBeNull();
      expect(result!.text).toContain("역대 최고까지"); // habit_best_streak_approach
      expect(result!.text).not.toContain("목표 11일"); // habit_target_near suppressed
    });
});

// ── habit_week_perfect ──────────────────────────────────────────
describe("calcTodayInsight — habit_week_perfect (priority 10.34, between almost_perfect_day and habit_week_excellent)", () => {
  function base() {
    return {
      habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number; targetStreak?: number; checkHistory?: string[] }>,
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined as number | undefined,
      habitsAllDoneDate: YESTERDAY,
    };
  }

  it("shouldFireAt100Percent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 100 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한 한 주"); // distinct from habit_week_excellent text
    expect(result!.level).toBe("success");
  });

  it("shouldContainPerfectWeekText", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 100 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한 한 주");
  });

  it("shouldNotFireAt99Percent", () => {
    // 99% → habit_week_excellent (10.35) fires, not habit_week_perfect
    const result = calcTodayInsight({ ...base(), habitWeekRate: 99 });
    expect(result).not.toBeNull();
    expect(result!.text).not.toContain("완벽한 한 주");
  });

  it("shouldNotFireAt90Percent", () => {
    // 90% → habit_week_excellent fires instead
    const result = calcTodayInsight({ ...base(), habitWeekRate: 90 });
    expect(result).not.toBeNull();
    expect(result!.text).not.toContain("완벽한 한 주");
  });

  it("shouldNotFireWhenAbsent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: undefined });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByPerfectDayWhenAllHabitsDoneToday", () => {
    // habitsAllDoneDate === TODAY → perfect_day (priority 4) fires before habit_week_perfect (10.34)
    const result = calcTodayInsight({
      ...base(),
      habitsAllDoneDate: TODAY,
      habitWeekRate: 100,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한 습관"); // perfect_day badge text
    expect(result!.text).not.toContain("완벽한 한 주"); // habit_week_perfect suppressed
  });

  it("shouldBePreemptedByAlmostPerfectDay", () => {
    // nowHour=14, 1 habit unchecked today → almost_perfect_day (10.3) fires before habit_week_perfect (10.34)
    const result = calcTodayInsight({
      ...base(),
      nowHour: 14,
      habits: [
        { name: "운동", streak: 3, lastChecked: TODAY },
        { name: "독서", streak: 2, lastChecked: YESTERDAY }, // unchecked today
      ],
      habitsAllDoneDate: YESTERDAY,
      habitWeekRate: 100,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한 하루까지"); // almost_perfect_day wins
    expect(result!.text).not.toContain("완벽한 한 주"); // habit_week_perfect suppressed
  });

  it("shouldFireBeforeHabitWeekExcellent", () => {
    // habit_week_perfect (10.34) fires at 100% instead of habit_week_excellent (10.35)
    const result = calcTodayInsight({ ...base(), habitWeekRate: 100 });
    expect(result).not.toBeNull();
    expect(result!.text).not.toContain("지속력이 빛나요"); // habit_week_excellent text not shown
  });
});

// ── habit_week_excellent ──────────────────────────────────────────
describe("calcTodayInsight — habit_week_excellent (priority 10.35, between almost_perfect_day and pomodoro_today_above_avg)", () => {
  function base() {
    return {
      habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number; targetStreak?: number; checkHistory?: string[] }>,
      todayStr: TODAY,
      // nowHour: 12 — below morning blocks (nowHour < 12 = false) and below almost_perfect_day gate (≥14)
      nowHour: 12,
      todayIntentionDate: TODAY, // intention already set — avoids intention_missing (requires nowHour<12 too, but safer)
      sessionsToday: 0,
      sessionGoal: undefined as number | undefined,
      habitsAllDoneDate: YESTERDAY,
    };
  }

  it("shouldFireAt90Percent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 90 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("90");
    expect(result!.level).toBe("success");
  });

  it("shouldFireAt95Percent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 95 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("95");
    expect(result!.level).toBe("success");
  });

  it("shouldNotFireAt100Percent", () => {
    // 100% → habit_week_perfect (10.34) fires first; habit_week_excellent requires < 100
    const result = calcTodayInsight({ ...base(), habitWeekRate: 100 });
    expect(result).not.toBeNull();
    expect(result!.text).not.toContain("지속력이 빛나요"); // habit_week_excellent suppressed
    expect(result!.text).toContain("완벽한 한 주"); // habit_week_perfect fires instead
  });

  it("shouldNotFireAt89Percent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 89 });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenAbsent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: undefined });
    expect(result).toBeNull();
  });

  it("shouldNotFireAt0Percent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 0 });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByAlmostPerfectDay", () => {
    // nowHour=14, 1 habit unchecked today → almost_perfect_day (10.3) fires before habit_week_excellent (10.35)
    const result = calcTodayInsight({
      ...base(),
      nowHour: 14,
      habits: [
        { name: "운동", streak: 3, lastChecked: TODAY },
        { name: "독서", streak: 2, lastChecked: YESTERDAY }, // unchecked today
      ],
      habitsAllDoneDate: YESTERDAY,
      habitWeekRate: 90,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한 하루까지"); // almost_perfect_day wins
    expect(result!.text).not.toContain("90"); // habit_week_excellent suppressed
  });

  it("shouldFireWhenAlmostPerfectDayConditionsNotMet", () => {
    // nowHour=12 (below 14) → almost_perfect_day cannot fire; habit_week_excellent fires
    const result = calcTodayInsight({
      ...base(),
      nowHour: 12,
      habits: [
        { name: "운동", streak: 3, lastChecked: TODAY },
        { name: "독서", streak: 2, lastChecked: YESTERDAY }, // unchecked today
      ],
      habitsAllDoneDate: YESTERDAY,
      habitWeekRate: 90,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("90"); // habit_week_excellent fires since nowHour < 14
  });

  it("shouldIncludeRateInBadgeText", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 92 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("92%");
  });

  it("shouldBePreemptedByPerfectDayWhenAllHabitsDoneToday", () => {
    // habitsAllDoneDate === TODAY → perfect_day (priority 4) fires before habit_week_excellent (10.35)
    const result = calcTodayInsight({
      ...base(),
      habitsAllDoneDate: TODAY,
      habitWeekRate: 100,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한 습관"); // perfect_day badge text
    expect(result!.text).not.toContain("100"); // habit_week_excellent suppressed
  });
});

// ── habit_week_declined ──────────────────────────────────────────
describe("calcTodayInsight — habit_week_declined (priority 10.37, after habit_week_excellent, before pomodoro_today_above_avg)", () => {
  function base() {
    return {
      habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number; targetStreak?: number; checkHistory?: string[] }>,
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined as number | undefined,
      habitsAllDoneDate: YESTERDAY,
    };
  }

  it("shouldFireWhenDeclineExactlyTenPp", () => {
    // prevRate=80, weekRate=70 → decline=10pp → warning fires
    const result = calcTodayInsight({ ...base(), habitWeekRate: 70, habitPrevWeekRate: 80 });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
  });

  it("shouldFireWhenDeclineGreaterThanTenPp", () => {
    // prevRate=80, weekRate=60 → decline=20pp → warning fires
    const result = calcTodayInsight({ ...base(), habitWeekRate: 60, habitPrevWeekRate: 80 });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
  });

  it("shouldIncludeCurrentRateInBadgeText", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 65, habitPrevWeekRate: 80 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("65%");
  });

  it("shouldIncludeDropSizeInBadgeText", () => {
    // prevRate=80, weekRate=65 → drop=15pp → "15%p" in text
    const result = calcTodayInsight({ ...base(), habitWeekRate: 65, habitPrevWeekRate: 80 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("15%p");
  });

  it("shouldNotFireWhenDeclineBelowTenPp", () => {
    // prevRate=80, weekRate=72 → decline=8pp → no badge
    const result = calcTodayInsight({ ...base(), habitWeekRate: 72, habitPrevWeekRate: 80 });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByHabitWeekImprovedWhenRateRose", () => {
    // prevRate=70, weekRate=80 → improvement=10pp → habit_week_improved (10.36) fires instead; declined badge does not fire
    const result = calcTodayInsight({ ...base(), habitWeekRate: 80, habitPrevWeekRate: 70 });
    expect(result!.level).toBe("success"); // habit_week_improved preempts — not a warning
  });

  it("shouldNotFireWhenHabitWeekRateAbsent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: undefined, habitPrevWeekRate: 80 });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenHabitPrevWeekRateAbsent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 70, habitPrevWeekRate: undefined });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByHabitWeekExcellentWhenCurrentRateGeq90", () => {
    // prevRate=100, weekRate=90 → decline=10pp BUT habit_week_excellent (10.35) fires first
    const result = calcTodayInsight({ ...base(), habitWeekRate: 90, habitPrevWeekRate: 100 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("90%"); // habit_week_excellent badge text
    expect(result!.level).toBe("success"); // not a warning — excellent preempts
  });

  it("shouldFireWhenCurrentRateBelowExcellentThreshold", () => {
    // prevRate=99, weekRate=89 → decline=10pp AND rate<90 → habit_week_declined fires
    const result = calcTodayInsight({ ...base(), habitWeekRate: 89, habitPrevWeekRate: 99 });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("89%");
  });

  it("shouldNotFireWhenDeclineExactlyNinePp", () => {
    // Boundary: prevRate=79, weekRate=70 → decline=9pp (< 10pp threshold) → no badge
    const result = calcTodayInsight({ ...base(), habitWeekRate: 70, habitPrevWeekRate: 79 });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByHabitWeekPerfectWhenCurrentRate100", () => {
    // weekRate=100, prevRate=80 → decline impossible, but also perfect fires first (10.34 < 10.37)
    const result = calcTodayInsight({ ...base(), habitWeekRate: 100, habitPrevWeekRate: 80 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한 한 주"); // habit_week_perfect wins
  });
});

// ── habit_week_improved ──────────────────────────────────────────
describe("calcTodayInsight — habit_week_improved (priority 10.36, after habit_week_excellent, before habit_week_declined)", () => {
  function base() {
    return {
      habits: [] as Array<{ name: string; streak: number; lastChecked?: string; bestStreak?: number; targetStreak?: number; checkHistory?: string[] }>,
      todayStr: TODAY,
      nowHour: 12,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined as number | undefined,
      habitsAllDoneDate: YESTERDAY,
    };
  }

  it("shouldFireWhenImprovementExactlyTenPp", () => {
    // prevRate=70, weekRate=80 → improvement=10pp → fires
    const result = calcTodayInsight({ ...base(), habitWeekRate: 80, habitPrevWeekRate: 70 });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
  });

  it("shouldFireWhenImprovementGreaterThanTenPp", () => {
    // prevRate=60, weekRate=80 → improvement=20pp → fires
    const result = calcTodayInsight({ ...base(), habitWeekRate: 80, habitPrevWeekRate: 60 });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
  });

  it("shouldIncludeCurrentRateInBadgeText", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 80, habitPrevWeekRate: 65 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("80%");
  });

  it("shouldIncludeRiseSizeInBadgeText", () => {
    // prevRate=65, weekRate=80 → rise=15pp → "15%p" in text
    const result = calcTodayInsight({ ...base(), habitWeekRate: 80, habitPrevWeekRate: 65 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("15%p");
  });

  it("shouldNotFireWhenImprovementBelowTenPp", () => {
    // prevRate=73, weekRate=80 → improvement=7pp → no badge
    const result = calcTodayInsight({ ...base(), habitWeekRate: 80, habitPrevWeekRate: 73 });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenRateEqual", () => {
    // prevRate=75, weekRate=75 → no change → no badge
    const result = calcTodayInsight({ ...base(), habitWeekRate: 75, habitPrevWeekRate: 75 });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenHabitWeekRateAbsent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: undefined, habitPrevWeekRate: 70 });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenHabitPrevWeekRateAbsent", () => {
    const result = calcTodayInsight({ ...base(), habitWeekRate: 80, habitPrevWeekRate: undefined });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByHabitWeekExcellentWhenCurrentRateGeq90", () => {
    // prevRate=79, weekRate=90 → improvement=11pp BUT habit_week_excellent (10.35) fires first
    const result = calcTodayInsight({ ...base(), habitWeekRate: 90, habitPrevWeekRate: 79 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("90%"); // habit_week_excellent badge text
    expect(result!.level).toBe("success"); // still success — excellent preempts
  });

  it("shouldFireWhenCurrentRateBelowExcellentThreshold", () => {
    // prevRate=70, weekRate=89 → improvement=19pp AND rate<90 → habit_week_improved fires
    const result = calcTodayInsight({ ...base(), habitWeekRate: 89, habitPrevWeekRate: 70 });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("success");
    expect(result!.text).toContain("89%");
  });

  it("shouldNotFireWhenImprovementExactlyNinePp", () => {
    // Boundary: prevRate=71, weekRate=80 → improvement=9pp (< 10pp threshold) → no badge
    const result = calcTodayInsight({ ...base(), habitWeekRate: 80, habitPrevWeekRate: 71 });
    expect(result).toBeNull();
  });

  it("shouldBePreemptedByHabitWeekPerfectWhenCurrentRate100", () => {
    // weekRate=100, prevRate=80 → improvement=20pp, but habit_week_perfect (10.34) fires first
    const result = calcTodayInsight({ ...base(), habitWeekRate: 100, habitPrevWeekRate: 80 });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("완벽한 한 주"); // habit_week_perfect wins
    expect(result!.text).not.toContain("올랐어요"); // habit_week_improved suppressed
  });

  it("shouldFireBeforeHabitWeekDeclinedWhenBothCouldApply", () => {
    // This case cannot both apply simultaneously: improvement and decline are mutually exclusive.
    // Verified by shouldNotFireWhenNoDecline in habit_week_declined block.
    // Guard: when weekRate > prevRate by ≥10pp, level is "success" not "warning"
    const result = calcTodayInsight({ ...base(), habitWeekRate: 82, habitPrevWeekRate: 70 });
    expect(result!.level).toBe("success");
    expect(result!.level).not.toBe("warning");
  });
});

// ── habit_diversity_warning (priority 10.22, after habit_consecutive_miss, before almost_perfect_day) ─────
describe("calcTodayInsight — habit_diversity_warning (priority 10.22)", () => {
  // nowHour:14 bypasses all morning-only checks (period_start/no_focus_project/weak_day_ahead < 12).
  // All habits checked TODAY → remaining=0, so almost_perfect_day (≥14h, 1–2 left) cannot fire.
  // habitsAllDoneDate:undefined → perfect_day (priority 4) does not fire.
  // bestStreak:5 on lagging habit → prevents habit_first_check_in (requires bestStreak≤1).
  const base = {
    todayStr: TODAY,
    nowHour: 14,
    todayIntentionDate: TODAY,
    sessionsToday: 0,
    sessionGoal: undefined as number | undefined,
    habitsAllDoneDate: undefined as string | undefined,
  };

  it("shouldFireWhenOneHabitStreakFarBelowOthersAverage", () => {
    // 운동:1, avgOthers=(10+14)/2=12 → 1 < 12*0.3=3.6 → warning badge fires
    const result = calcTodayInsight({
      ...base,
      habits: [
        { name: "운동", streak: 1, lastChecked: TODAY, bestStreak: 5 },
        { name: "독서", streak: 10, lastChecked: TODAY },
        { name: "명상", streak: 14, lastChecked: TODAY },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("warning");
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("뒤처져");
  });

  it("shouldNotFireWithFewerThanThreeHabits", () => {
    // ≥3 habits required for a meaningful peer comparison; 2 habits → no badge
    const result = calcTodayInsight({
      ...base,
      habits: [
        { name: "운동", streak: 1, lastChecked: TODAY, bestStreak: 5 },
        { name: "독서", streak: 20, lastChecked: TODAY },
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenHabitsHaveSimilarStreaks", () => {
    // 운동:5, avgOthers=(8+7)/2=7.5 → 5 < 7.5*0.3=2.25? No → no badge
    const result = calcTodayInsight({
      ...base,
      habits: [
        { name: "운동", streak: 5, lastChecked: TODAY },
        { name: "독서", streak: 8, lastChecked: TODAY },
        { name: "명상", streak: 7, lastChecked: TODAY },
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenOthersAverageIsBelowNoiseFloor", () => {
    // 운동:1, avgOthers=(3+2)/2=2.5 — below noise floor of 4 → no badge
    const result = calcTodayInsight({
      ...base,
      habits: [
        { name: "운동", streak: 1, lastChecked: TODAY, bestStreak: 5 },
        { name: "독서", streak: 3, lastChecked: TODAY },
        { name: "명상", streak: 2, lastChecked: TODAY },
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenCandidateStreakIsZero", () => {
    // streak=0 excluded by streak≥1 guard; habit_consecutive_miss handles fully-stopped habits.
    // nowHour:12 prevents almost_perfect_day (≥14h) from firing on the unchecked 운동.
    const result = calcTodayInsight({
      ...base,
      nowHour: 12,
      habits: [
        { name: "운동", streak: 0 }, // no lastChecked, no checkHistory
        { name: "독서", streak: 10, lastChecked: TODAY },
        { name: "명상", streak: 14, lastChecked: TODAY },
      ],
    });
    expect(result).toBeNull();
  });

  it("shouldPickMostLaggingHabitByRatioWhenMultipleQualify", () => {
    // 운동:1 avgOthers=(2+14+12)/3=9.33 → ratio 0.107
    // 수영:2 avgOthers=(1+14+12)/3=9.0 → 2 < 9.0*0.3=2.7 → ratio 0.222
    // 운동 has smaller ratio → most lagging → picked
    const result = calcTodayInsight({
      ...base,
      habits: [
        { name: "운동", streak: 1, lastChecked: TODAY, bestStreak: 5 },
        { name: "수영", streak: 2, lastChecked: TODAY, bestStreak: 5 },
        { name: "독서", streak: 14, lastChecked: TODAY },
        { name: "명상", streak: 12, lastChecked: TODAY },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동"); // most lagging by ratio
  });

  it("shouldExcludeZeroStreakHabitsFromPeerAverage", () => {
    // streak=0 peers must be excluded from avgOthers calculation.
    // Without fix: [운동:1, 독서:0, 명상:0, 필사:8] → avgOthers=(0+0+8)/3=2.67 < 4 → badge suppressed (wrong).
    // With fix: active peers for 운동 = [필사:8], avgOthers=8 → 1 < 8*0.3=2.4 → badge fires (correct).
    // nowHour:12 prevents almost_perfect_day (≥14h) on the unchecked 독서/명상.
    const result = calcTodayInsight({
      ...base,
      nowHour: 12,
      habits: [
        { name: "운동", streak: 1, lastChecked: TODAY, bestStreak: 5 },
        { name: "독서", streak: 0 }, // inactive — excluded from peer average
        { name: "명상", streak: 0 }, // inactive — excluded from peer average
        { name: "필사", streak: 8, lastChecked: TODAY },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("뒤처져");
  });

  it("shouldBePrecededByHabitConsecutiveMiss", () => {
    // habit_consecutive_miss (10.2) fires before diversity_warning (10.22).
    // 독서: streak=0, 3 consecutive misses → consecutive_miss fires; chain terminates before diversity_warning.
    const result = calcTodayInsight({
      ...base,
      habits: [
        { name: "독서", streak: 0, checkHistory: [DAYS_4_AGO] },
        { name: "운동", streak: 10, lastChecked: TODAY },
        { name: "명상", streak: 14, lastChecked: TODAY },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("연속 미완료"); // habit_consecutive_miss wins
  });

  it("shouldPrecedeAlmostPerfectDay", () => {
    // diversity_warning (10.22) fires before almost_perfect_day (10.3).
    // 운동 unchecked today (remaining=1, nowHour=15) → almost_perfect_day would fire.
    // 운동:1 << avgOthers=(12+10)/2=11 → diversity_warning fires first.
    const result = calcTodayInsight({
      ...base,
      nowHour: 15,
      habits: [
        { name: "운동", streak: 1, lastChecked: YESTERDAY, bestStreak: 5 },
        { name: "독서", streak: 12, lastChecked: TODAY },
        { name: "명상", streak: 10, lastChecked: TODAY },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("뒤처져"); // diversity_warning fires
    expect(result!.text).not.toContain("완벽한 하루까지"); // almost_perfect_day suppressed
  });
});

// ── habit_target_halfway ──────────────────────────────────────────
describe("calcTodayInsight — habit_target_halfway (priority 11.06, between habit_target_near and intention_streak)", () => {
  // weekGoal: "test" suppresses period_start nudge (TODAY = "2024-01-15" is a Monday).
  // todayIntentionDate: TODAY suppresses intention_missing.

  it("shouldReturnHabitTargetHalfwayWhenAtMidpoint", () => {
    // streak=15, targetStreak=30 → midpoint=15 → fires
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 15, lastChecked: TODAY, targetStreak: 30 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("15");
    expect(result!.text).toContain("30");
    expect(result!.text).toContain("절반");
    expect(result!.level).toBe("success");
  });

  it("shouldReturnHabitTargetHalfwayForOddTarget", () => {
    // streak=10, targetStreak=21 → Math.floor(21/2)=10 → fires
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 10, lastChecked: TODAY, targetStreak: 21 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("독서");
    expect(result!.text).toContain("10");
    expect(result!.text).toContain("21");
    expect(result!.text).toContain("절반");
  });

  it("shouldNotFireWhenNotCheckedToday", () => {
    // streak=15, targetStreak=30, lastChecked=YESTERDAY → today's check-in guard not met → no fire
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 15, lastChecked: YESTERDAY, targetStreak: 30 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenTargetTooSmall", () => {
    // targetStreak=12 < 14 minimum → no fire even at exact midpoint (streak=6)
    const result = calcTodayInsight({
      habits: [{ name: "명상", streak: 6, lastChecked: TODAY, targetStreak: 12 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenNotAtMidpoint", () => {
    // streak=14, targetStreak=30 → midpoint=15, 14≠15 → no fire
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 14, lastChecked: TODAY, targetStreak: 30 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldHabitTargetNearFireBeforeHabitTargetHalfway", () => {
    // 독서: streak=9, targetStreak=10, gap=1 → habit_target_near (11.05) fires
    // 운동: streak=15, targetStreak=30, halfway → habit_target_halfway (11.06) would fire
    // habit_target_near has higher priority (11.05 < 11.06)
    // Both checked today: confirms ordering is due to priority, not missing lastChecked guard.
    const result = calcTodayInsight({
      habits: [
        { name: "독서", streak: 9, lastChecked: TODAY, targetStreak: 10 },
        { name: "운동", streak: 15, lastChecked: TODAY, targetStreak: 30 },
      ],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("10일까지 1일"); // habit_target_near fires
    expect(result!.text).not.toContain("절반"); // habit_target_halfway suppressed
  });

  it("shouldReturnHabitTargetHalfwayForMinimumTarget", () => {
    // targetStreak=14 (minimum), streak=7, bestStreak=12.
    // bestStreak=12: gap=5 > 2 → approachBest(11.02) skips; bestStreak < 14 → habit_comeback(6.9) skips;
    // bestStreak ≠ streak → personal_best(11) skips. habit_target_halfway fires.
    const result = calcTodayInsight({
      habits: [{ name: "명상", streak: 7, lastChecked: TODAY, targetStreak: 14, bestStreak: 12 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("명상");
    expect(result!.text).toContain("7");
    expect(result!.text).toContain("14");
    expect(result!.text).toContain("절반");
  });

  it("shouldPersonalBestSuppressHabitTargetHalfway", () => {
    // targetStreak=14, streak=7, bestStreak=7: 7 is in PERSONAL_BEST_MILESTONES and bestStreak===streak
    // → personal_best (priority 11) fires before habit_target_halfway (11.06)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 7, lastChecked: TODAY, targetStreak: 14, bestStreak: 7 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("역대 최고"); // personal_best fires
    expect(result!.text).not.toContain("절반"); // habit_target_halfway suppressed
  });

  it("shouldHabitComebackSuppressHabitTargetHalfway", () => {
    // targetStreak=14, streak=7, bestStreak=14: habit_comeback (6.9) fires
    // (bestStreak≥14, streak≥3, streak < bestStreak, lastChecked=today)
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 7, lastChecked: TODAY, targetStreak: 14, bestStreak: 14 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("회복 중"); // habit_comeback fires
    expect(result!.text).not.toContain("절반"); // habit_target_halfway suppressed
  });

  it("shouldPickHabitWithHighestTargetWhenMultipleAtMidpoint", () => {
    // 두 습관 모두 midpoint: 독서(15/30), 운동(50/100). targetStreak 높은 것(100) 우선.
    const result = calcTodayInsight({
      habits: [
        { name: "독서", streak: 15, lastChecked: TODAY, targetStreak: 30 },
        { name: "운동", streak: 50, lastChecked: TODAY, targetStreak: 100 },
      ],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동"); // higher target (100) selected
    expect(result!.text).toContain("50");
    expect(result!.text).toContain("100");
    expect(result!.text).not.toContain("독서");
  });
});

// ── habit_target_hit ──────────────────────────────────────────
describe("calcTodayInsight — habit_target_hit (priority 11.04, between habit_best_streak_approach and habit_target_near)", () => {
  // weekGoal: "test" suppresses period_start nudge (TODAY = "2024-01-15" is a Monday).
  // todayIntentionDate: TODAY suppresses intention_missing.

  it("shouldReturnHabitTargetHitWhenStreakEqualsTarget", () => {
    // 운동: streak=21, targetStreak=21 (not in PERSONAL_BEST_MILESTONES), checked today → fires.
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 21, lastChecked: TODAY, targetStreak: 21 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("21");
    expect(result!.text).toContain("목표 달성");
    expect(result!.level).toBe("success");
  });

  it("shouldNotFireWhenNotCheckedToday", () => {
    // streak=21, targetStreak=21 but lastChecked ≠ todayStr → no badge; result is null
    // (no higher-priority insight fires: no projects, no goals, no sessions, hour=9 skips streak_at_risk)
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 21, lastChecked: "2024-01-14", targetStreak: 21 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenStreakBelowTarget", () => {
    // streak=20, targetStreak=21, gap=1 → habit_target_near (11.05) fires, not habit_target_hit
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 20, lastChecked: TODAY, targetStreak: 21 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("21일까지 1일"); // habit_target_near fires
    expect(result!.text).not.toContain("목표 달성");
  });

  it("shouldNotFireWhenStreakExceedsTarget", () => {
    // streak=22 > targetStreak=21: target already surpassed — result is null
    // habit_target_near: gap = 21-22 = -1, guard gap >= 1 fails → doesn't fire
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 22, lastChecked: TODAY, targetStreak: 21 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldPersonalBestSuppressHabitTargetHit", () => {
    // targetStreak=7, streak=7, bestStreak=7 → 7 ∈ PERSONAL_BEST_MILESTONES → personal_best (11) fires first
    const result = calcTodayInsight({
      habits: [{ name: "독서", streak: 7, lastChecked: TODAY, targetStreak: 7, bestStreak: 7 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("역대 최고"); // personal_best fires
    expect(result!.text).not.toContain("목표 달성"); // habit_target_hit suppressed
  });

  it("shouldApproachBestSuppressHabitTargetHit", () => {
    // streak=10, targetStreak=10, bestStreak=12 → gap=2 ≤ 2 → approachBest (11.02) fires first
    // bestStreak=12 < 14 suppresses habit_comeback (6.9) so approachBest is reached
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 10, lastChecked: TODAY, targetStreak: 10, bestStreak: 12 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("역대 최고까지 2일"); // approachBest fires
    expect(result!.text).not.toContain("목표 달성"); // habit_target_hit suppressed
  });

  it("shouldHabitTargetHitPreemptHabitTargetNear", () => {
    // 독서: streak=15, targetStreak=15 → habit_target_hit (11.04)
    // 운동: streak=19, targetStreak=20, gap=1 → habit_target_near (11.05) candidate
    // habit_target_hit fires first (11.04 < 11.05)
    const result = calcTodayInsight({
      habits: [
        { name: "독서", streak: 15, lastChecked: TODAY, targetStreak: 15 },
        { name: "운동", streak: 19, lastChecked: TODAY, targetStreak: 20 },
      ],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("독서");
    expect(result!.text).toContain("목표 달성"); // habit_target_hit fires
    expect(result!.text).not.toContain("운동");
  });

  it("shouldPickHabitWithHighestTargetWhenMultipleHit", () => {
    // 독서: streak=14, targetStreak=14, bestStreak=14 (at all-time best → comeback's streak<bestStreak is FALSE)
    // 운동: streak=21, targetStreak=21, bestStreak=21 (same pattern; 21 ∉ PERSONAL_BEST_MILESTONES)
    // Both fire habit_target_hit; picks highest targetStreak → 운동 (21)
    const result = calcTodayInsight({
      habits: [
        { name: "독서", streak: 14, lastChecked: TODAY, targetStreak: 14, bestStreak: 14 },
        { name: "운동", streak: 21, lastChecked: TODAY, targetStreak: 21, bestStreak: 21 },
      ],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toContain("운동");
    expect(result!.text).toContain("21");
    expect(result!.text).toContain("목표 달성");
    expect(result!.text).not.toContain("독서");
  });

  it("shouldNotFireWhenNoTargetSet", () => {
    // No targetStreak defined → habit_target_hit cannot fire; result is null
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 15, lastChecked: TODAY }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });

  it("shouldNotFireWhenTargetIsZero", () => {
    // targetStreak=0: falsy guard (!target) rejects it; result is null
    const result = calcTodayInsight({
      habits: [{ name: "운동", streak: 0, lastChecked: TODAY, targetStreak: 0 }],
      todayStr: TODAY,
      nowHour: 9,
      todayIntentionDate: TODAY,
      sessionsToday: 0,
      sessionGoal: undefined,
      habitsAllDoneDate: undefined,
      weekGoal: "test",
    });
    expect(result).toBeNull();
  });
});

