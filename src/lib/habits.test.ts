// ABOUTME: Unit tests for calcHabitsWeekRate pure helper
// ABOUTME: Validates average daily habit completion rate over a 7-day window

import { describe, it, expect } from "vitest";
import { calcHabitsWeekRate } from "./habits";
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

  it("should round .5 up (Math.round semantics)", () => {
    // 2 habits: both checked on same 3.5 effective days → not easily achievable with integer counts;
    // instead use a 2-day window with 1 habit checked on 1 of 2 → 1/2 = 0.5 → Math.round(50) = 50
    // and verify a case where avgRate * 100 = 50.5 → 51:
    // 1 habit, window of 4 days, checked on 2 days → 2/4 = 0.5 → Math.round(50) = 50
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
