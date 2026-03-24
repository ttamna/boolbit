// ABOUTME: Unit tests for calcNextAction — prescriptive next-action recommendation based on daily completion state
// ABOUTME: Covers intention/habit/pomodoro priority chain, edge cases (empty habits, zero/negative goal, stale/future dates, whitespace), and all-done state

import { describe, it, expect } from "vitest";
import { calcNextAction, type NextActionParams } from "./nextAction";

const TODAY = "2026-03-22";

function makeParams(overrides: Partial<NextActionParams> = {}): NextActionParams {
  return {
    habits: [],
    todayStr: TODAY,
    intentionText: undefined,
    intentionDate: undefined,
    pomodoroSessions: 0,
    pomodoroGoal: 4,
    pomodoroSessionsDate: undefined,
    ...overrides,
  };
}

describe("calcNextAction", () => {
  // ── Priority 1: Intention ──────────────────────────────────────────────────

  it("should suggest setting intention when not set for today", () => {
    const result = calcNextAction(makeParams());
    expect(result.key).toBe("setIntention");
    expect(result.text).toContain("의도");
  });

  it("should suggest setting intention when intentionDate is stale (yesterday)", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Yesterday's intention",
      intentionDate: "2026-03-21",
    }));
    expect(result.key).toBe("setIntention");
  });

  it("should suggest setting intention when intentionText is empty string", () => {
    const result = calcNextAction(makeParams({
      intentionText: "",
      intentionDate: TODAY,
    }));
    expect(result.key).toBe("setIntention");
  });

  // ── Priority 2: Habits ─────────────────────────────────────────────────────

  it("should suggest completing habits when intention is set but habits remain", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus on coding",
      intentionDate: TODAY,
      habits: [
        { lastChecked: TODAY },
        { lastChecked: "2026-03-21" },
        { lastChecked: undefined },
      ],
    }));
    expect(result.key).toBe("completeHabits");
    expect(result.text).toContain("2");
  });

  it("should show correct remaining count when all habits are unchecked", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [
        { lastChecked: undefined },
        { lastChecked: undefined },
        { lastChecked: undefined },
      ],
    }));
    expect(result.key).toBe("completeHabits");
    expect(result.text).toContain("3");
  });

  it("should skip habits and proceed to pomodoro when habits array is empty", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [],
      pomodoroGoal: 4,
      pomodoroSessions: 0,
    }));
    expect(result.key).toBe("doPomodoro");
  });

  // ── Priority 3: Pomodoro ───────────────────────────────────────────────────

  it("should suggest pomodoro when intention set and all habits done", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [{ lastChecked: TODAY }],
      pomodoroGoal: 4,
      pomodoroSessions: 1,
      pomodoroSessionsDate: TODAY,
    }));
    expect(result.key).toBe("doPomodoro");
    expect(result.text).toContain("3");
  });

  it("should show 1 remaining session at boundary", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [],
      pomodoroGoal: 6,
      pomodoroSessions: 5,
      pomodoroSessionsDate: TODAY,
    }));
    expect(result.key).toBe("doPomodoro");
    expect(result.text).toContain("1");
  });

  it("should treat stale pomodoroSessionsDate as 0 sessions today", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [{ lastChecked: TODAY }],
      pomodoroGoal: 4,
      pomodoroSessions: 10,
      pomodoroSessionsDate: "2026-03-21",
    }));
    expect(result.key).toBe("doPomodoro");
    expect(result.text).toContain("4");
  });

  it("should return allDone when pomodoro goal is 0", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [{ lastChecked: TODAY }],
      pomodoroGoal: 0,
    }));
    expect(result.key).toBe("allDone");
  });

  // Defensive test: pomodoroGoal is typed as number but runtime WidgetData may deliver undefined
  // when the field was never persisted. Verifies graceful degradation without runtime error.
  it("should return allDone when pomodoroGoal is undefined at runtime", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [{ lastChecked: TODAY }],
      pomodoroGoal: undefined as unknown as number,
    }));
    expect(result.key).toBe("allDone");
  });

  // ── Priority 4: All done ──────────────────────────────────────────────────

  it("should return allDone when all daily tasks are complete", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [{ lastChecked: TODAY }, { lastChecked: TODAY }],
      pomodoroGoal: 4,
      pomodoroSessions: 4,
      pomodoroSessionsDate: TODAY,
    }));
    expect(result.key).toBe("allDone");
  });

  it("should return allDone when no habits and no pomodoro goal", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [],
      pomodoroGoal: 0,
    }));
    expect(result.key).toBe("allDone");
  });

  it("should return allDone when pomodoro sessions exceed goal", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [],
      pomodoroGoal: 3,
      pomodoroSessions: 5,
      pomodoroSessionsDate: TODAY,
    }));
    expect(result.key).toBe("allDone");
  });

  // ── Defensive edge cases ─────────────────────────────────────────────────

  // Negative pomodoroGoal: truthy in the `pomodoroGoal &&` guard but sessionsLeft < 0 → allDone
  it("should return allDone when pomodoroGoal is negative", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [],
      pomodoroGoal: -1,
    }));
    expect(result.key).toBe("allDone");
  });

  // habit.lastChecked in the future is not equal to todayStr → counted as unchecked today
  it("should count habit with future lastChecked as remaining", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [{ lastChecked: "9999-12-31" }],
    }));
    expect(result.key).toBe("completeHabits");
    expect(result.text).toContain("1");
  });

  // Float pomodoroGoal: fractional sessions-left still triggers doPomodoro
  it("should suggest pomodoro when pomodoroGoal is a float and sessions are below it", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [],
      pomodoroGoal: 4.9,
      pomodoroSessions: 4,
      pomodoroSessionsDate: TODAY,
    }));
    // sessionsLeft = 4.9 - 4 = 0.9 → text contains "0.9"
    expect(result.key).toBe("doPomodoro");
    expect(result.text).toContain("0.9");
  });

  // NaN pomodoroSessions: pomodoroSessionsDate must be TODAY so todaySessions = NaN (not 0);
  // then sessionsLeft = 4 - NaN = NaN, and `NaN > 0` is false → allDone
  it("should return allDone when pomodoroSessions is NaN at runtime", () => {
    const result = calcNextAction(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [],
      pomodoroGoal: 4,
      pomodoroSessions: NaN,
      pomodoroSessionsDate: TODAY, // required: without this, todaySessions = 0, not NaN
    }));
    expect(result.key).toBe("allDone");
  });

  // ── Return shape ──────────────────────────────────────────────────────────

  it("should always return key, emoji, and text fields", () => {
    const cases = [
      makeParams(),
      makeParams({ intentionText: "X", intentionDate: TODAY, habits: [{ lastChecked: undefined }] }),
      makeParams({ intentionText: "X", intentionDate: TODAY, habits: [], pomodoroGoal: 1 }),
      makeParams({ intentionText: "X", intentionDate: TODAY, habits: [], pomodoroGoal: 0 }),
    ];
    for (const p of cases) {
      const result = calcNextAction(p);
      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("emoji");
      expect(result).toHaveProperty("text");
      expect(typeof result.key).toBe("string");
      expect(typeof result.emoji).toBe("string");
      expect(typeof result.text).toBe("string");
    }
  });
});
