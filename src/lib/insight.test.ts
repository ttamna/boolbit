// ABOUTME: Tests for calcTodayInsight — context-aware daily insight surfacing
// ABOUTME: Covers all five insight types and their priority ordering

import { describe, it, expect } from "vitest";
import { calcTodayInsight } from "./insight";

const TODAY = "2024-01-15";
const YESTERDAY = "2024-01-14";

/** Minimal habit shape used across tests */
function habit(name: string, streak: number, lastChecked?: string) {
  return { name, streak, lastChecked };
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
    const result = calcTodayInsight({
      habits: [habit("운동", 5, YESTERDAY)],
      todayStr: TODAY,
      nowHour: 10,
      todayIntentionDate: TODAY,
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
});
