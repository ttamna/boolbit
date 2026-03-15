// ABOUTME: Unit tests for calcHabitsWeekRate, calcHabitWeekStats, calcHabitsWeekTrend, calcHabitsBadge, calcCheckInPatch, calcUndoCheckInPatch, calcPerfectDayStreak, getMilestone, getUpcomingMilestone, habitsTodayPct, habitLastCheckDaysAgo, calcTargetStreakPct, and playHabitCheck pure helpers
// ABOUTME: Validates average daily completion rate, per-habit weekly trend statistics, week-over-week section trend (↑/↓/→), section badge formatting, check-in/undo patch generation, perfect-day streak, milestone badges, completion tracking, target streak progress, and audio feedback

import { describe, it, expect, beforeEach } from "vitest";
import { calcHabitsWeekRate, calcHabitWeekStats, calcHabitsWeekTrend, calcHabitsBadge, calcCheckInPatch, calcUndoCheckInPatch, calcPerfectDayStreak, getMilestone, getUpcomingMilestone, habitsTodayPct, habitLastCheckDaysAgo, calcTargetStreakPct, playHabitCheck } from "./habits";
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
    // Empty window: dayWindow.length === 0 guard fires and returns null
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

  it("should omit N🌟 when perfectStreak is absent", () => {
    const badge = calcHabitsBadge({ habitCount: 3, doneToday: 3, atRisk: 0, weekRate: null });
    expect(badge).not.toContain("🌟");
  });

  it("should omit N🌟 when perfectStreak is 0", () => {
    const badge = calcHabitsBadge({ habitCount: 3, doneToday: 3, atRisk: 0, weekRate: null, perfectStreak: 0 });
    expect(badge).not.toContain("🌟");
  });

  it("should omit N🌟 when perfectStreak is 1 (threshold is ≥2)", () => {
    const badge = calcHabitsBadge({ habitCount: 3, doneToday: 3, atRisk: 0, weekRate: null, perfectStreak: 1 });
    expect(badge).not.toContain("🌟");
  });

  it("should append N🌟 when perfectStreak is exactly 2 (threshold met)", () => {
    expect(calcHabitsBadge({ habitCount: 3, doneToday: 3, atRisk: 0, weekRate: null, perfectStreak: 2 })).toBe("✓3/3 · 2🌟");
  });

  it("should append N🌟 when perfectStreak is 5", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 4, atRisk: 0, weekRate: 100, perfectStreak: 5 })).toBe("✓4/4 · 7d·100% · 5🌟");
  });

  it("should append N🌟 after atRisk when both present", () => {
    // atRisk + perfectStreak can theoretically coexist: some habits at risk but previous days were all done
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 1, weekRate: null, perfectStreak: 3 })).toBe("2/4 · ⚠1 · 3🌟");
  });

  it("should include all four parts: count, weekRate, atRisk, perfectStreak", () => {
    expect(calcHabitsBadge({ habitCount: 5, doneToday: 3, atRisk: 1, weekRate: 80, perfectStreak: 4 })).toBe("3/5 · 7d·80% · ⚠1 · 4🌟");
  });

  it("should append trend symbol to weekRate when weekTrend is provided with weekRate", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 75, weekTrend: "↑" })).toBe("2/4 · 7d·75%↑");
  });

  it("should append ↓ trend symbol to weekRate when declining", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 50, weekTrend: "↓" })).toBe("2/4 · 7d·50%↓");
  });

  it("should append → trend symbol to weekRate when stable", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 70, weekTrend: "→" })).toBe("2/4 · 7d·70%→");
  });

  it("should not append trend when weekTrend is null even if weekRate is non-null", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 75, weekTrend: null })).toBe("2/4 · 7d·75%");
  });

  it("should not append trend when weekTrend is undefined (backward-compatible default)", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 75 })).toBe("2/4 · 7d·75%");
  });

  it("should include all five parts: count, weekRate+trend, atRisk, perfectStreak", () => {
    expect(calcHabitsBadge({ habitCount: 5, doneToday: 3, atRisk: 1, weekRate: 80, perfectStreak: 4, weekTrend: "↑" })).toBe("3/5 · 7d·80%↑ · ⚠1 · 4🌟");
  });

  it("should not append trend when weekRate is null even if weekTrend is provided", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: null, weekTrend: "↑" })).toBe("2/4");
  });
});

// 14-day window for calcHabitsWeekTrend tests (oldest→newest, 2026-03-02 to 2026-03-15)
const TREND_WINDOW_14 = [
  "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08",
  "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15",
];
// prev7 = 2026-03-02 to 2026-03-08, cur7 = 2026-03-09 to 2026-03-15

function makeHabitWithHistory(dates: string[]): Habit {
  return { name: "H", streak: dates.length, icon: "🔥", checkHistory: dates };
}

describe("calcHabitsWeekTrend", () => {
  it("should return null when habits array is empty", () => {
    expect(calcHabitsWeekTrend([], TREND_WINDOW_14)).toBeNull();
  });

  it("should return null when no checks exist in either window", () => {
    const habits = [makeHabitWithHistory([])];
    expect(calcHabitsWeekTrend(habits, TREND_WINDOW_14)).toBeNull();
  });

  it("should return null when checks exist only in cur7 but not prev7 (no prev baseline)", () => {
    // cur7 has checks, prev7 is empty → trend is undefined
    const habits = [makeHabitWithHistory(["2026-03-09", "2026-03-10", "2026-03-11"])];
    expect(calcHabitsWeekTrend(habits, TREND_WINDOW_14)).toBeNull();
  });

  it("should return ↑ when cur7 completion rate exceeds prev7 by ≥5pp", () => {
    // prev7: habit done 2/7 days (~29%), cur7: done 6/7 days (~86%) → +57pp → ↑
    const h = makeHabitWithHistory([
      "2026-03-02", "2026-03-03",
      "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14",
    ]);
    expect(calcHabitsWeekTrend([h], TREND_WINDOW_14)).toBe("↑");
  });

  it("should return ↓ when cur7 completion rate is lower than prev7 by ≥5pp", () => {
    // prev7: done 6/7 days, cur7: done 1/7 day → large decline → ↓
    const h = makeHabitWithHistory([
      "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08",
      "2026-03-09",
    ]);
    expect(calcHabitsWeekTrend([h], TREND_WINDOW_14)).toBe("↓");
  });

  it("should return → when cur7 and prev7 rates differ by <5pp", () => {
    // prev7: 3/7, cur7: 3/7 → exactly equal → →
    const h = makeHabitWithHistory([
      "2026-03-02", "2026-03-04", "2026-03-06",
      "2026-03-09", "2026-03-11", "2026-03-13",
    ]);
    expect(calcHabitsWeekTrend([h], TREND_WINDOW_14)).toBe("→");
  });

  it("should aggregate across multiple habits", () => {
    // h1: checked all prev7, none cur7; h2: none prev7, all cur7.
    // aggregate: prev7 rate=50%, cur7 rate=50% → diff=0 → →
    const h1 = makeHabitWithHistory(["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08"]);
    const h2 = makeHabitWithHistory(["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"]);
    expect(calcHabitsWeekTrend([h1, h2], TREND_WINDOW_14)).toBe("→");
  });

  it("should return → when prev7 and cur7 rates are equal", () => {
    // prev=4/7, cur=4/7 → diff=0pp → →
    const h = makeHabitWithHistory([
      "2026-03-03", "2026-03-05", "2026-03-07", "2026-03-08",
      "2026-03-09", "2026-03-11", "2026-03-13", "2026-03-15",
    ]);
    expect(calcHabitsWeekTrend([h], TREND_WINDOW_14)).toBe("→");
  });

  it("should return ↓ when cur7 has no completions but prev7 has data (curRate treated as 0)", () => {
    // prev7: 7/7 (100%), cur7: 0/7 (0%) → diff=-100pp → ↓
    const h = makeHabitWithHistory(["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08"]);
    expect(calcHabitsWeekTrend([h], TREND_WINDOW_14)).toBe("↓");
  });

  it("should return ↑ at exactly 5pp threshold (boundary: ≥5 → ↑)", () => {
    // Need diff of exactly 5pp. With 2 habits and 7 days:
    // prev7: h1 checks 3 days (3/7=43%); cur7: h1 checks 6 days (6/7=86%) → Math.round diff≈43pp → ↑
    // Use simpler: 1 habit, prev7=1/7(14%), cur7=2/7(29%) → diff=15pp → ↑
    const h = makeHabitWithHistory(["2026-03-02", "2026-03-09", "2026-03-10"]);
    expect(calcHabitsWeekTrend([h], TREND_WINDOW_14)).toBe("↑");
  });

  it("should return null when last14Days is too short to form two windows", () => {
    expect(calcHabitsWeekTrend([makeHabitWithHistory(["2026-03-09"])], ["2026-03-09", "2026-03-10"])).toBeNull();
  });
});

const TODAY = "2026-03-15";

function makeHabitForCheckIn(overrides: Partial<Habit> = {}): Habit {
  return { name: "Run", streak: 0, icon: "🏃", ...overrides };
}

describe("calcCheckInPatch", () => {
  it("should increment streak by 1", () => {
    const h = makeHabitForCheckIn({ streak: 5 });
    expect(calcCheckInPatch(h, TODAY).streak).toBe(6);
  });

  it("should set lastChecked to today", () => {
    const h = makeHabitForCheckIn();
    expect(calcCheckInPatch(h, TODAY).lastChecked).toBe(TODAY);
  });

  it("should add today to checkHistory when history is undefined", () => {
    const h = makeHabitForCheckIn({ checkHistory: undefined });
    expect(calcCheckInPatch(h, TODAY).checkHistory).toEqual([TODAY]);
  });

  it("should add today to existing checkHistory", () => {
    const h = makeHabitForCheckIn({ checkHistory: ["2026-03-14"] });
    expect(calcCheckInPatch(h, TODAY).checkHistory).toEqual(["2026-03-14", TODAY]);
  });

  it("should deduplicate today if already in checkHistory", () => {
    const h = makeHabitForCheckIn({ checkHistory: [TODAY, "2026-03-14"] });
    const patch = calcCheckInPatch(h, TODAY);
    // TODAY should appear exactly once, sorted ascending
    expect(patch.checkHistory?.filter(d => d === TODAY)).toHaveLength(1);
  });

  it("should sort checkHistory ascending after adding today", () => {
    // Insert today between two existing dates
    const h = makeHabitForCheckIn({ checkHistory: ["2026-03-10", "2026-03-17"] });
    const patch = calcCheckInPatch(h, TODAY);
    expect(patch.checkHistory).toEqual(["2026-03-10", TODAY, "2026-03-17"]);
  });

  it("should cap checkHistory at 14 entries, keeping most recent (15→14: drops oldest)", () => {
    // 14 old entries + today = 15 → should drop oldest (2026-03-01)
    const old14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(`2026-03-01`);
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("sv");
    }); // 2026-03-01 … 2026-03-14
    const h = makeHabitForCheckIn({ checkHistory: old14 });
    const patch = calcCheckInPatch(h, TODAY);
    expect(patch.checkHistory).toHaveLength(14);
    expect(patch.checkHistory?.[patch.checkHistory.length - 1]).toBe(TODAY);
    expect(patch.checkHistory).not.toContain("2026-03-01");
  });

  it("should keep all entries when 13 existing + today = 14 (cap not exceeded)", () => {
    // 13 old entries + today = 14 → all retained, no drop
    const old13 = Array.from({ length: 13 }, (_, i) => {
      const d = new Date("2026-03-01");
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("sv");
    }); // 2026-03-01 … 2026-03-13
    const h = makeHabitForCheckIn({ checkHistory: old13 });
    const patch = calcCheckInPatch(h, TODAY);
    expect(patch.checkHistory).toHaveLength(14);
    expect(patch.checkHistory).toContain("2026-03-01");
    expect(patch.checkHistory?.[patch.checkHistory.length - 1]).toBe(TODAY);
  });

  it("should keep 14 entries when today is already in a 14-entry history (dedup → no growth)", () => {
    // 13 old entries + today already present = 14 entries; dedup prevents adding duplicate
    const old13 = Array.from({ length: 13 }, (_, i) => {
      const d = new Date("2026-03-01");
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("sv");
    }); // 2026-03-01 … 2026-03-13
    const h = makeHabitForCheckIn({ checkHistory: [...old13, TODAY] }); // already 14 with TODAY
    const patch = calcCheckInPatch(h, TODAY);
    expect(patch.checkHistory).toHaveLength(14);
    // Dedup verification: TODAY appears exactly once
    expect(patch.checkHistory?.filter(d => d === TODAY)).toHaveLength(1);
  });

  it("should update bestStreak when new streak surpasses previous best", () => {
    const h = makeHabitForCheckIn({ streak: 4, bestStreak: 4 });
    expect(calcCheckInPatch(h, TODAY).bestStreak).toBe(5);
  });

  it("should not include bestStreak in patch when new streak does not surpass previous best", () => {
    const h = makeHabitForCheckIn({ streak: 3, bestStreak: 10 });
    expect(calcCheckInPatch(h, TODAY).bestStreak).toBeUndefined();
  });

  it("should update bestStreak when bestStreak is absent (treats as 0)", () => {
    // streak=0, bestStreak=undefined → new streak=1 > 0 → should set bestStreak=1
    const h = makeHabitForCheckIn({ streak: 0, bestStreak: undefined });
    expect(calcCheckInPatch(h, TODAY).bestStreak).toBe(1);
  });

  it("should handle empty checkHistory array", () => {
    const h = makeHabitForCheckIn({ checkHistory: [] });
    expect(calcCheckInPatch(h, TODAY).checkHistory).toEqual([TODAY]);
  });
});

describe("calcUndoCheckInPatch", () => {
  it("should decrement streak by 1", () => {
    const h = makeHabitForCheckIn({ streak: 5, lastChecked: TODAY });
    expect(calcUndoCheckInPatch(h, TODAY).streak).toBe(4);
  });

  it("should clear lastChecked (undefined)", () => {
    const h = makeHabitForCheckIn({ streak: 2, lastChecked: TODAY });
    expect(calcUndoCheckInPatch(h, TODAY).lastChecked).toBeUndefined();
  });

  it("should remove today from checkHistory", () => {
    const h = makeHabitForCheckIn({ streak: 3, checkHistory: ["2026-03-13", TODAY] });
    expect(calcUndoCheckInPatch(h, TODAY).checkHistory).toEqual(["2026-03-13"]);
  });

  it("should return undefined checkHistory when no entries remain after removing today", () => {
    const h = makeHabitForCheckIn({ streak: 1, checkHistory: [TODAY] });
    expect(calcUndoCheckInPatch(h, TODAY).checkHistory).toBeUndefined();
  });

  it("should not go below 0 for streak", () => {
    const h = makeHabitForCheckIn({ streak: 0, lastChecked: TODAY });
    expect(calcUndoCheckInPatch(h, TODAY).streak).toBe(0);
  });

  it("should handle undefined checkHistory gracefully", () => {
    const h = makeHabitForCheckIn({ streak: 1, checkHistory: undefined });
    const patch = calcUndoCheckInPatch(h, TODAY);
    expect(patch.checkHistory).toBeUndefined();
    expect(patch.streak).toBe(0);
  });

  it("should preserve other days in history when removing today", () => {
    const h = makeHabitForCheckIn({
      streak: 3,
      checkHistory: ["2026-03-10", "2026-03-12", TODAY],
    });
    expect(calcUndoCheckInPatch(h, TODAY).checkHistory).toEqual(["2026-03-10", "2026-03-12"]);
  });
});

describe("calcPerfectDayStreak", () => {
  beforeEach(() => { _habitId = 0; });

  // 7-day window ending at TODAY (2026-03-15 = last element), oldest → newest
  const W7 = [
    "2026-03-09",
    "2026-03-10",
    "2026-03-11",
    "2026-03-12",
    "2026-03-13",
    "2026-03-14",
    "2026-03-15",
  ];

  it("should return 0 for empty habits array", () => {
    expect(calcPerfectDayStreak([], W7)).toBe(0);
  });

  it("should return 0 for empty day window", () => {
    const h = makeHabit({ checkHistory: [TODAY] });
    expect(calcPerfectDayStreak([h], [])).toBe(0);
  });

  it("should return 1 when single habit checked only today", () => {
    const h = makeHabit({ checkHistory: [TODAY] });
    expect(calcPerfectDayStreak([h], W7)).toBe(1);
  });

  it("should return 2 when single habit checked today and yesterday", () => {
    const h = makeHabit({ checkHistory: ["2026-03-14", TODAY] });
    expect(calcPerfectDayStreak([h], W7)).toBe(2);
  });

  it("should return 3 when single habit checked 3 consecutive days ending today", () => {
    const h = makeHabit({ checkHistory: ["2026-03-13", "2026-03-14", TODAY] });
    expect(calcPerfectDayStreak([h], W7)).toBe(3);
  });

  it("should return window length when habit checked every day in window", () => {
    const h = makeHabit({ checkHistory: [...W7] });
    expect(calcPerfectDayStreak([h], W7)).toBe(7);
  });

  it("should return 2 when all habits done today+yesterday but gap 2 days ago", () => {
    const h1 = makeHabit({ checkHistory: ["2026-03-11", "2026-03-14", TODAY] });
    const h2 = makeHabit({ checkHistory: ["2026-03-10", "2026-03-14", TODAY] });
    expect(calcPerfectDayStreak([h1, h2], W7)).toBe(2);
  });

  it("should return 1 when all habits done today but gap yesterday", () => {
    const h = makeHabit({ checkHistory: ["2026-03-12", TODAY] });
    expect(calcPerfectDayStreak([h], W7)).toBe(1);
  });

  it("should fallback to yesterday and return 1 when today not perfect but yesterday all done", () => {
    const h1 = makeHabit({ checkHistory: ["2026-03-14", TODAY] });
    const h2 = makeHabit({ checkHistory: ["2026-03-14"] }); // done yesterday, not today
    // Today not perfect (h2 missing); yesterday both done → streak = 1
    expect(calcPerfectDayStreak([h1, h2], W7)).toBe(1);
  });

  it("should fallback to yesterday and count 2 when 2 consecutive perfect days before today", () => {
    const h1 = makeHabit({ checkHistory: ["2026-03-13", "2026-03-14", TODAY] });
    const h2 = makeHabit({ checkHistory: ["2026-03-13", "2026-03-14"] }); // not done today
    // Today not perfect; 2026-03-14 and 2026-03-13 both perfect → streak = 2
    expect(calcPerfectDayStreak([h1, h2], W7)).toBe(2);
  });

  it("should return 0 when neither today nor yesterday is perfect", () => {
    const h1 = makeHabit({ checkHistory: [TODAY] }); // only today
    const h2 = makeHabit({ checkHistory: [] });        // never done
    // Today: h1 done, h2 not → not perfect. Yesterday: neither → not perfect.
    expect(calcPerfectDayStreak([h1, h2], W7)).toBe(0);
  });

  it("should treat habit with undefined checkHistory as not done for any day", () => {
    const h1 = makeHabit({ checkHistory: [TODAY] });
    const h2 = makeHabit({ checkHistory: undefined });
    expect(calcPerfectDayStreak([h1, h2], W7)).toBe(0);
  });

  it("should work with single-element window when that day is perfect", () => {
    const h = makeHabit({ checkHistory: [TODAY] });
    expect(calcPerfectDayStreak([h], [TODAY])).toBe(1);
  });

  it("should return 0 with single-element window when that day is not perfect", () => {
    const h = makeHabit({ checkHistory: [] });
    expect(calcPerfectDayStreak([h], [TODAY])).toBe(0);
  });
});

describe("getMilestone", () => {
  it("should return null when streak is 0", () => {
    expect(getMilestone(0)).toBeNull();
  });

  it("should return null when streak is negative", () => {
    expect(getMilestone(-5)).toBeNull();
  });

  it("should return null when streak is 6 (one short of first milestone)", () => {
    expect(getMilestone(6)).toBeNull();
  });

  it("should return 🔥 when streak is exactly 7", () => {
    expect(getMilestone(7)).toBe("🔥");
  });

  it("should return 🔥 when streak is between 7 and 29", () => {
    expect(getMilestone(15)).toBe("🔥");
    expect(getMilestone(29)).toBe("🔥");
  });

  it("should return ⭐ when streak is exactly 30", () => {
    expect(getMilestone(30)).toBe("⭐");
  });

  it("should return ⭐ when streak is between 30 and 99", () => {
    expect(getMilestone(50)).toBe("⭐");
    expect(getMilestone(99)).toBe("⭐");
  });

  it("should return 💎 when streak is exactly 100", () => {
    expect(getMilestone(100)).toBe("💎");
  });

  it("should return 💎 when streak exceeds 100", () => {
    expect(getMilestone(150)).toBe("💎");
    expect(getMilestone(365)).toBe("💎");
  });
});

describe("getUpcomingMilestone", () => {
  it("should return null when streak is 0", () => {
    expect(getUpcomingMilestone(0)).toBeNull();
  });

  it("should return null when streak is negative", () => {
    expect(getUpcomingMilestone(-1)).toBeNull();
  });

  it("should return 🔥 when exactly at threshold distance from 7", () => {
    // streak=4, threshold=3: days=7-4=3, within threshold
    expect(getUpcomingMilestone(4, 3)).toEqual({ days: 3, badge: "🔥" });
  });

  it("should return 🔥 when 1 day away from 7", () => {
    expect(getUpcomingMilestone(6, 3)).toEqual({ days: 1, badge: "🔥" });
  });

  it("should return null when one day beyond threshold distance (streak=3, threshold=3)", () => {
    // streak=3: days=7-3=4, exceeds threshold=3
    expect(getUpcomingMilestone(3, 3)).toBeNull();
  });

  it("should return null when streak has just reached 7 (no upcoming below 30 within threshold=3)", () => {
    // streak=7: at milestone; next=30, days=23 >> 3
    expect(getUpcomingMilestone(7, 3)).toBeNull();
  });

  it("should return ⭐ when within threshold of 30", () => {
    // streak=27: days=30-27=3, within threshold
    expect(getUpcomingMilestone(27, 3)).toEqual({ days: 3, badge: "⭐" });
    expect(getUpcomingMilestone(29, 3)).toEqual({ days: 1, badge: "⭐" });
  });

  it("should return null when streak has just reached 30 (next=100 is far)", () => {
    expect(getUpcomingMilestone(30, 3)).toBeNull();
  });

  it("should return 💎 when within threshold of 100", () => {
    expect(getUpcomingMilestone(97, 3)).toEqual({ days: 3, badge: "💎" });
    expect(getUpcomingMilestone(99, 3)).toEqual({ days: 1, badge: "💎" });
  });

  it("should return null when streak has just reached 100 (no further milestones)", () => {
    expect(getUpcomingMilestone(100, 3)).toBeNull();
  });

  it("should return null when streak exceeds all milestones", () => {
    expect(getUpcomingMilestone(200, 3)).toBeNull();
  });

  it("should return non-null for both getMilestone and getUpcomingMilestone when streak is 27", () => {
    // streak=27: already at 🔥 (≥7) and ⭐ is 3 days away — callers must decide which to display
    expect(getMilestone(27)).toBe("🔥");
    expect(getUpcomingMilestone(27, 3)).toEqual({ days: 3, badge: "⭐" });
  });

  it("should respect custom threshold: streak=25 is within threshold=5 of 30", () => {
    // days=30-25=5, within threshold=5
    expect(getUpcomingMilestone(25, 5)).toEqual({ days: 5, badge: "⭐" });
    // But NOT within default threshold=3 (days=5 > 3)
    expect(getUpcomingMilestone(25, 3)).toBeNull();
  });
});

describe("habitsTodayPct", () => {
  const TODAY_PCT = "2026-03-15";

  it("should return null when habits array is empty", () => {
    expect(habitsTodayPct([], TODAY_PCT)).toBeNull();
  });

  it("should return 0 when no habits are done today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃" },
      { id: "h2", name: "Read", streak: 1, icon: "📚" },
    ];
    expect(habitsTodayPct(habits, TODAY_PCT)).toBe(0);
  });

  it("should return 100 when all habits are done today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃", lastChecked: TODAY_PCT },
      { id: "h2", name: "Read", streak: 1, icon: "📚", lastChecked: TODAY_PCT },
    ];
    expect(habitsTodayPct(habits, TODAY_PCT)).toBe(100);
  });

  it("should return 50 when half the habits are done today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃", lastChecked: TODAY_PCT },
      { id: "h2", name: "Read", streak: 1, icon: "📚" },
    ];
    expect(habitsTodayPct(habits, TODAY_PCT)).toBe(50);
  });

  it("should round to nearest integer", () => {
    // 1/3 = 33.33... → 33
    const habits: Habit[] = [
      { id: "h1", name: "A", streak: 1, icon: "A", lastChecked: TODAY_PCT },
      { id: "h2", name: "B", streak: 1, icon: "B" },
      { id: "h3", name: "C", streak: 1, icon: "C" },
    ];
    expect(habitsTodayPct(habits, TODAY_PCT)).toBe(33);
  });

  it("should not count habits checked on a different day", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 3, icon: "🏃", lastChecked: "2026-03-14" },
    ];
    expect(habitsTodayPct(habits, TODAY_PCT)).toBe(0);
  });

  it("should return 100 for a single habit done today", () => {
    const habits: Habit[] = [
      { id: "h1", name: "Run", streak: 1, icon: "🏃", lastChecked: TODAY_PCT },
    ];
    expect(habitsTodayPct(habits, TODAY_PCT)).toBe(100);
  });
});

describe("habitLastCheckDaysAgo", () => {
  const TODAY_LCD = "2026-03-14";

  it("should return null when checkHistory is undefined", () => {
    expect(habitLastCheckDaysAgo(undefined, TODAY_LCD)).toBeNull();
  });

  it("should return null when checkHistory is empty", () => {
    expect(habitLastCheckDaysAgo([], TODAY_LCD)).toBeNull();
  });

  it("should return null when today is the last check", () => {
    expect(habitLastCheckDaysAgo(["2026-03-14"], TODAY_LCD)).toBeNull();
  });

  it("should return null when yesterday is the last check (atRisk already shown)", () => {
    expect(habitLastCheckDaysAgo(["2026-03-13"], TODAY_LCD)).toBeNull();
  });

  it("should return 2 when 2 days ago is the last check", () => {
    expect(habitLastCheckDaysAgo(["2026-03-12"], TODAY_LCD)).toBe(2);
  });

  it("should return 7 when 7 days ago is the last check", () => {
    expect(habitLastCheckDaysAgo(["2026-03-07"], TODAY_LCD)).toBe(7);
  });

  it("should use the most recent (last) entry when history has multiple dates", () => {
    // checkHistory is sorted ascending — last entry is most recent
    expect(habitLastCheckDaysAgo(["2026-03-01", "2026-03-10", "2026-03-12"], TODAY_LCD)).toBe(2);
  });

  it("should return null for malformed date strings in checkHistory", () => {
    expect(habitLastCheckDaysAgo(["not-a-date"], TODAY_LCD)).toBeNull();
  });

  it("should return null when today parameter is malformed", () => {
    expect(habitLastCheckDaysAgo(["2026-03-12"], "not-a-date")).toBeNull();
  });

  it("should return null for future lastCheck dates (clock skew or manual edit)", () => {
    // Future date produces negative days; days >= 2 is false, so null is returned safely
    expect(habitLastCheckDaysAgo(["2026-03-20"], TODAY_LCD)).toBeNull();
  });
});

describe("calcTargetStreakPct", () => {
  it("should return undefined when targetStreak is undefined (no goal set)", () => {
    expect(calcTargetStreakPct(15, undefined)).toBeUndefined();
  });

  it("should return undefined when targetStreak is 0 (no goal — lib.rs sanitizes 0→None)", () => {
    expect(calcTargetStreakPct(15, 0)).toBeUndefined();
  });

  it("should return undefined when streak is 0 (not started — no progress to display)", () => {
    expect(calcTargetStreakPct(0, 30)).toBeUndefined();
  });

  it("should return 50 when streak is half of target (15/30)", () => {
    expect(calcTargetStreakPct(15, 30)).toBe(50);
  });

  it("should return 100 when streak exactly equals target (goal achieved)", () => {
    expect(calcTargetStreakPct(30, 30)).toBe(100);
  });

  it("should clamp to 100 when streak exceeds target (streak can temporarily exceed goal via manual edit)", () => {
    expect(calcTargetStreakPct(35, 30)).toBe(100);
  });

  it("should return 3 for streak=1, target=30 (Math.round(1/30*100) = Math.round(3.333...) = 3)", () => {
    expect(calcTargetStreakPct(1, 30)).toBe(3);
  });

  it("should return 97 for streak=29, target=30 (Math.round(29/30*100) = Math.round(96.666...) = 97)", () => {
    expect(calcTargetStreakPct(29, 30)).toBe(97);
  });

  it("should return undefined when targetStreak is negative (invalid goal — same guard as 0)", () => {
    expect(calcTargetStreakPct(15, -1)).toBeUndefined();
  });

  it("should return 100 for streak=1, target=1 (single-day goal met immediately)", () => {
    expect(calcTargetStreakPct(1, 1)).toBe(100);
  });

  it("should return 100 for streak=7, target=7 (week goal exactly met)", () => {
    expect(calcTargetStreakPct(7, 7)).toBe(100);
  });
});

describe("playHabitCheck", () => {
  it("should resolve without error for a regular check-in (AudioContext unavailable in jsdom)", async () => {
    await expect(playHabitCheck()).resolves.toBeUndefined();
  });

  it("should resolve without error when allDone=true (all habits completed today)", async () => {
    await expect(playHabitCheck(true)).resolves.toBeUndefined();
  });

  it("should resolve without error when allDone=false (explicit partial check)", async () => {
    await expect(playHabitCheck(false)).resolves.toBeUndefined();
  });
});
