// ABOUTME: Unit tests for calcHabitsWeekRate, calcHabitWeekStats, and calcHabitsBadge pure helpers
// ABOUTME: Validates average daily completion rate, per-habit weekly trend statistics, and section badge formatting

import { describe, it, expect, beforeEach } from "vitest";
import { calcHabitsWeekRate, calcHabitWeekStats, calcHabitsBadge } from "./habits";
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

describe("calcHabitsBadge", () => {
  it("should return undefined when habitCount is 0", () => {
    expect(calcHabitsBadge({ habitCount: 0, doneToday: 0, atRisk: 0, weekRate: null })).toBeUndefined();
  });

  it("should return 'N/M' when weekRate is null and atRisk is 0", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: null })).toBe("2/4");
  });

  it("should append '7d·N%' when weekRate is non-null", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 75 })).toBe("2/4 · 7d·75%");
  });

  it("should append '⚠N' when atRisk > 0", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 1, weekRate: null })).toBe("2/4 · ⚠1");
  });

  it("should include all three parts when weekRate is non-null and atRisk > 0", () => {
    expect(calcHabitsBadge({ habitCount: 5, doneToday: 3, atRisk: 2, weekRate: 80 })).toBe("3/5 · 7d·80% · ⚠2");
  });

  it("should prefix ✓ when all habits done today (doneToday === habitCount)", () => {
    expect(calcHabitsBadge({ habitCount: 3, doneToday: 3, atRisk: 0, weekRate: 100 })).toBe("✓3/3 · 7d·100%");
  });

  it("should prefix ✓ when all done and weekRate is null", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 4, atRisk: 0, weekRate: null })).toBe("✓4/4");
  });

  it("should NOT prefix ✓ when not all habits done", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 3, atRisk: 0, weekRate: null })).toBe("3/4");
  });

  it("should prefix ✓ when doneToday exceeds habitCount (caller invariant violation — defensive)", () => {
    // doneToday > habitCount should not occur at runtime (App.tsx computes both from the same array).
    // Using >= ensures corrupt data still shows ✓ rather than '5/3' without prefix.
    expect(calcHabitsBadge({ habitCount: 3, doneToday: 5, atRisk: 0, weekRate: null })).toBe("✓5/3");
  });

  it("should include atRisk warning even when allDone prefix is shown (boundary documentation)", () => {
    // allDone=true + atRisk>0 is semantically impossible at runtime (done today → not at-risk),
    // but calcHabitsBadge does not enforce this invariant. Document the output for traceability.
    expect(calcHabitsBadge({ habitCount: 3, doneToday: 3, atRisk: 1, weekRate: null })).toBe("✓3/3 · ⚠1");
  });

  it("should handle zero done today", () => {
    expect(calcHabitsBadge({ habitCount: 3, doneToday: 0, atRisk: 0, weekRate: null })).toBe("0/3");
  });

  it("should omit the weekRate part when weekRate is null", () => {
    const badge = calcHabitsBadge({ habitCount: 3, doneToday: 1, atRisk: 0, weekRate: null });
    expect(badge).not.toContain("7d");
  });

  it("should omit the atRisk part when atRisk is 0", () => {
    const badge = calcHabitsBadge({ habitCount: 3, doneToday: 3, atRisk: 0, weekRate: 100 });
    expect(badge).not.toContain("⚠");
  });

  it("should join parts with ' · ' separator", () => {
    const badge = calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 1, weekRate: 50 });
    expect(badge).toBe("2/4 · 7d·50% · ⚠1");
    expect(badge!.split(" · ")).toHaveLength(3);
  });

  it("should show weekRate=0 when explicitly provided (caller controls the null-guard)", () => {
    // calcHabitsWeekRate already returns null when no checks exist in window (avoids misleading 0%).
    // calcHabitsBadge is a pass-through: if weekRate=0 is given, it still renders.
    expect(calcHabitsBadge({ habitCount: 2, doneToday: 1, atRisk: 0, weekRate: 0 })).toBe("1/2 · 7d·0%");
  });

  it("should handle large atRisk count without truncation", () => {
    expect(calcHabitsBadge({ habitCount: 10, doneToday: 0, atRisk: 10, weekRate: null })).toBe("0/10 · ⚠10");
  });
});
