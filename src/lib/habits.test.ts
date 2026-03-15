// ABOUTME: Unit tests for calcHabitsWeekRate and calcHabitWeekStats pure helpers
// ABOUTME: Validates average daily completion rate and per-habit weekly trend statistics

import { describe, it, expect, beforeEach } from "vitest";
import { calcHabitsWeekRate, calcHabitWeekStats } from "./habits";
import type { Habit } from "../types";

// Fixed 7-day window for deterministic tests (oldest → newest)
const WINDOW = [
  "2026-03-08",
  "2026-03-09",
  "2026-03-10",
  "2026-03-11",
  "2026-03-12",
  "2026-03-13",
  "2026-03-14",
];

// Auto-incrementing counter gives each habit a unique name to match real-world uniqueness.
let _habitId = 0;
function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    name: `Habit ${++_habitId}`,
    streak: 0,
    icon: "✓",
    ...overrides,
  };
}

describe("calcHabitsWeekRate", () => {
  beforeEach(() => { _habitId = 0; });

  it("should return null for empty habits array", () => {
    expect(calcHabitsWeekRate([], WINDOW)).toBeNull();
  });

  it("should return null when no habit has checks within the window", () => {
    const habits = [
      makeHabit({ checkHistory: ["2026-03-01", "2026-03-02"] }),
    ];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBeNull();
  });

  it("should return null when checkHistory is undefined for all habits", () => {
    const habits = [makeHabit(), makeHabit()];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBeNull();
  });

  it("should return null when checkHistory is empty for all habits", () => {
    const habits = [makeHabit({ checkHistory: [] })];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBeNull();
  });

  it("should return 100 when single habit is checked every day in window", () => {
    const habits = [makeHabit({ checkHistory: [...WINDOW] })];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBe(100);
  });

  it("should return 100 when all habits are checked every day", () => {
    const habits = [
      makeHabit({ checkHistory: [...WINDOW] }),
      makeHabit({ checkHistory: [...WINDOW] }),
    ];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBe(100);
  });

  it("should return 50 when two habits and only one checked all 7 days", () => {
    // Habit A: all 7 days, Habit B: 0 days → each day contributes 1/2; avg = 7*(1/2)/7 = 0.5 → 50
    const habits = [
      makeHabit({ checkHistory: [...WINDOW] }),
      makeHabit({ checkHistory: [] }),
    ];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBe(50);
  });

  it("should return 57 when two habits both checked on same 4 of 7 days", () => {
    // 4 days: both checked (2/2 = 1.0), 3 days: neither (0/2 = 0.0)
    // avg = (4*1.0 + 3*0.0) / 7 = 4/7 ≈ 0.5714 → 57
    const fourDays = WINDOW.slice(0, 4);
    const habits = [
      makeHabit({ checkHistory: [...fourDays] }),
      makeHabit({ checkHistory: [...fourDays] }),
    ];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBe(57);
  });

  it("should return 43 when single habit checked on 3 of 7 days", () => {
    // 3/7 ≈ 0.4286 → 43
    const habits = [makeHabit({ checkHistory: WINDOW.slice(0, 3) })];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBe(43);
  });

  it("should ignore checks outside the window", () => {
    // Only 3 checks in window → 43%; the extra outside-window check must not inflate result
    const habits = [
      makeHabit({ checkHistory: ["2026-03-01", ...WINDOW.slice(0, 3)] }),
    ];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBe(43);
  });

  it("should round fractional result to nearest integer", () => {
    // 1 habit, 4 of 7 days → 4/7 ≈ 57.14 → rounds to 57
    const habits = [makeHabit({ checkHistory: WINDOW.slice(0, 4) })];
    expect(calcHabitsWeekRate(habits, WINDOW)).toBe(57);
  });

  it("should return 50 when single habit checked on 2 of 4 days", () => {
    // 1 habit, 4-day window, 2 checks → 2/4 = 0.5 → 50
    const w4 = WINDOW.slice(0, 4);
    const habits = [makeHabit({ checkHistory: w4.slice(0, 2) })];
    expect(calcHabitsWeekRate(habits, w4)).toBe(50);
  });

  it("should return 14 for one check across seven habits each checking once", () => {
    // 7 habits, each checks exactly 1 unique day → each day: 1/7 contribution
    // avgRate = 7*(1/7)/7 = 1/7 ≈ 0.1429 → 14
    const habits = WINDOW.map((day, i) =>
      makeHabit({ name: `Habit ${i}`, checkHistory: [day] })
    );
    expect(calcHabitsWeekRate(habits, WINDOW)).toBe(14);
  });

  it("should handle window of size other than 7 (generalizes over window length)", () => {
    // 3-day window, habit checked on all 3 → 100
    const shortWindow = ["2026-03-12", "2026-03-13", "2026-03-14"];
    const habits = [makeHabit({ checkHistory: shortWindow })];
    expect(calcHabitsWeekRate(habits, shortWindow)).toBe(100);
  });

  it("should return null for empty window", () => {
    const habits = [makeHabit({ checkHistory: [...WINDOW] })];
    // Empty window: anyInWindow is false (no() over empty = false) → null
    expect(calcHabitsWeekRate(habits, [])).toBeNull();
  });
});

// Fixed 14-day window for calcHabitWeekStats tests (oldest → newest).
// Indices 0–6: previous week (PREV_7), indices 7–13: current week (CUR_7).
const PREV_7 = [
  "2026-03-02",
  "2026-03-03",
  "2026-03-04",
  "2026-03-05",
  "2026-03-06",
  "2026-03-07",
  "2026-03-08",
];
const CUR_7 = [
  "2026-03-09",
  "2026-03-10",
  "2026-03-11",
  "2026-03-12",
  "2026-03-13",
  "2026-03-14",
  "2026-03-15",
];
const LAST_14 = [...PREV_7, ...CUR_7];

describe("calcHabitWeekStats", () => {
  it("should return cur7=0, prev7=0, trend='' when checkHistory is undefined", () => {
    const result = calcHabitWeekStats(undefined, LAST_14);
    expect(result).toEqual({ cur7: 0, prev7: 0, trend: "" });
  });

  it("should return cur7=0, prev7=0, trend='' when checkHistory is empty", () => {
    const result = calcHabitWeekStats([], LAST_14);
    expect(result).toEqual({ cur7: 0, prev7: 0, trend: "" });
  });

  it("should return cur7=7, prev7=0, trend='↑' when all current week checked", () => {
    const result = calcHabitWeekStats([...CUR_7], LAST_14);
    expect(result).toEqual({ cur7: 7, prev7: 0, trend: "↑" });
  });

  it("should return cur7=0, prev7=7, trend='↓' when only previous week checked", () => {
    const result = calcHabitWeekStats([...PREV_7], LAST_14);
    expect(result).toEqual({ cur7: 0, prev7: 7, trend: "↓" });
  });

  it("should return trend='' when both weeks have equal counts", () => {
    const result = calcHabitWeekStats([...PREV_7.slice(0, 3), ...CUR_7.slice(0, 3)], LAST_14);
    expect(result).toEqual({ cur7: 3, prev7: 3, trend: "" });
  });

  it("should return trend='↑' when current week count exceeds previous", () => {
    // cur=5, prev=3 → improving
    const result = calcHabitWeekStats([...PREV_7.slice(0, 3), ...CUR_7.slice(0, 5)], LAST_14);
    expect(result).toEqual({ cur7: 5, prev7: 3, trend: "↑" });
  });

  it("should return trend='↓' when current week count is less than previous", () => {
    // cur=2, prev=5 → declining
    const result = calcHabitWeekStats([...PREV_7.slice(0, 5), ...CUR_7.slice(0, 2)], LAST_14);
    expect(result).toEqual({ cur7: 2, prev7: 5, trend: "↓" });
  });

  it("should return cur7=7, prev7=7, trend='' when all 14 days checked", () => {
    const result = calcHabitWeekStats([...LAST_14], LAST_14);
    expect(result).toEqual({ cur7: 7, prev7: 7, trend: "" });
  });

  it("should ignore checks outside the last14Days window", () => {
    // Dates before PREV_7 and after CUR_7 must not count
    const history = ["2026-03-01", ...CUR_7.slice(0, 4), "2026-03-16"];
    const result = calcHabitWeekStats(history, LAST_14);
    expect(result).toEqual({ cur7: 4, prev7: 0, trend: "↑" });
  });

  it("should correctly split on the week boundary (index 7 is first cur7 day)", () => {
    // Only the boundary day (LAST_14[6] = prev7 last, LAST_14[7] = cur7 first) should count correctly
    const result = calcHabitWeekStats([PREV_7[6], CUR_7[0]], LAST_14);
    // PREV_7[6] = last day of previous week, CUR_7[0] = first day of current week
    expect(result).toEqual({ cur7: 1, prev7: 1, trend: "" });
  });

  it("should handle single check in current week", () => {
    const result = calcHabitWeekStats([CUR_7[3]], LAST_14);
    expect(result).toEqual({ cur7: 1, prev7: 0, trend: "↑" });
  });

  it("should handle single check in previous week", () => {
    const result = calcHabitWeekStats([PREV_7[0]], LAST_14);
    expect(result).toEqual({ cur7: 0, prev7: 1, trend: "↓" });
  });
});
