// ABOUTME: Tests for calcTodayInsight — context-aware daily insight surfacing
// ABOUTME: Covers all eight insight types and their priority ordering

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
});
