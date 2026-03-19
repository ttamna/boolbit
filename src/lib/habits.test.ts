// ABOUTME: Unit tests for calcHabitsWeekRate, calcHabitWeekStats, calcHabitsWeekTrend, calcHabitsBadge, calcCheckInPatch, calcUndoCheckInPatch, calcPerfectDayStreak, getMilestone, getUpcomingMilestone, habitsTodayPct, habitLastCheckDaysAgo, calcTargetStreakPct, playHabitCheck, calcEveningHabitReminder, calcHabitMilestoneApproachNotify, calcWeeklyReviewReminder, calcPerfectDayMilestoneNotify, calcWeeklyHabitReport, calcMonthlyHabitReport, calcQuarterlyHabitReport, calcQuarterlyPerfectDayReport, calcYearlyHabitReport, calcYearlyPerfectDayReport, calcDayOfWeekHabitRates, calcWeakDayOfWeek, calcBestDayOfWeek, calcHabitMorningReminder, and calcHabitMomentumCorrelation pure helpers
// ABOUTME: Validates average daily completion rate, per-habit weekly trend statistics, aggregate week-over-week trend, section badge formatting, check-in/undo patch generation, perfect-day streak, milestone badges, completion tracking, target streak progress, audio feedback, evening reminder result, multi-habit milestone approach alerts, Sunday weekly review nudge, perfect-day streak milestone notifications, Monday morning weekly habit completion rate report, monthly habit completion rate report, quarterly habit completion rate report, quarterly perfect-day count report, yearly habit completion rate report, yearly perfect-day count report, per-weekday habit completion rate analysis, morning habit activation nudge, and habit-momentum correlation gap (all-done days vs not-all-done days avg momentum delta)

import { describe, it, expect, beforeEach } from "vitest";
import { calcHabitsWeekRate, calcHabitWeekStats, calcHabitsWeekTrend, calcHabitsBadge, calcCheckInPatch, calcUndoCheckInPatch, calcPerfectDayStreak, getMilestone, getUpcomingMilestone, habitsTodayPct, habitLastCheckDaysAgo, calcTargetStreakPct, playHabitCheck, calcEveningHabitReminder, calcHabitMilestoneApproachNotify, calcWeeklyReviewReminder, calcPerfectDayMilestoneNotify, calcWeeklyHabitReport, calcMonthlyHabitReport, calcQuarterlyHabitReport, calcQuarterlyPerfectDayReport, calcYearlyHabitReport, calcYearlyPerfectDayReport, calcDayOfWeekHabitRates, calcWeakDayOfWeek, calcBestDayOfWeek, calcHabitMorningReminder, calcHabitMomentumCorrelation } from "./habits";
import type { Habit, MomentumEntry } from "../types";

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

describe("calcHabitsWeekTrend", () => {
  it("should return null when curRate is null", () => {
    expect(calcHabitsWeekTrend(null, 50)).toBeNull();
  });

  it("should return null when prevRate is null", () => {
    expect(calcHabitsWeekTrend(50, null)).toBeNull();
  });

  it("should return null when both rates are null", () => {
    expect(calcHabitsWeekTrend(null, null)).toBeNull();
  });

  it("should return ↑ when curRate > prevRate", () => {
    expect(calcHabitsWeekTrend(80, 70)).toBe("↑");
  });

  it("should return ↓ when curRate < prevRate", () => {
    expect(calcHabitsWeekTrend(60, 75)).toBe("↓");
  });

  it("should return → when curRate equals prevRate", () => {
    expect(calcHabitsWeekTrend(75, 75)).toBe("→");
  });

  it("should return → when both rates are 0", () => {
    expect(calcHabitsWeekTrend(0, 0)).toBe("→");
  });

  it("should return → when both rates are 100", () => {
    expect(calcHabitsWeekTrend(100, 100)).toBe("→");
  });

  it("should return ↑ when curRate is 1 and prevRate is 0", () => {
    expect(calcHabitsWeekTrend(1, 0)).toBe("↑");
  });

  it("should return ↓ when curRate is 0 and prevRate is 1", () => {
    expect(calcHabitsWeekTrend(0, 1)).toBe("↓");
  });
});

describe("calcHabitsBadge", () => {
  it("should return undefined when habitCount is 0", () => {
    expect(calcHabitsBadge({ habitCount: 0, doneToday: 0, atRisk: 0, weekRate: null })).toBeUndefined();
  });

  it("should return 'N/M' when weekRate is null and atRisk is 0", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: null })).toBe("2/4");
  });

  it("should append '7d·N%' when weekRate is non-null and weekTrend is absent", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 75 })).toBe("2/4 · 7d·75%");
  });

  it("should append trend arrow ↑ after weekRate when weekTrend is ↑", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 75, weekTrend: "↑" })).toBe("2/4 · 7d·75%↑");
  });

  it("should append trend arrow ↓ after weekRate when weekTrend is ↓", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 75, weekTrend: "↓" })).toBe("2/4 · 7d·75%↓");
  });

  it("should append trend arrow → after weekRate when weekTrend is →", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 75, weekTrend: "→" })).toBe("2/4 · 7d·75%→");
  });

  it("should not append trend arrow when weekTrend is null", () => {
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: 75, weekTrend: null })).toBe("2/4 · 7d·75%");
  });

  it("should not append trend arrow when weekRate is null even if weekTrend is non-null", () => {
    // weekTrend is meaningless without weekRate to display it on
    expect(calcHabitsBadge({ habitCount: 4, doneToday: 2, atRisk: 0, weekRate: null, weekTrend: "↑" })).toBe("2/4");
  });

  it("should include trend in full badge with all parts", () => {
    expect(calcHabitsBadge({ habitCount: 5, doneToday: 3, atRisk: 1, weekRate: 80, weekTrend: "↑", perfectStreak: 4 })).toBe("3/5 · 7d·80%↑ · ⚠1 · 4🌟");
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

  it("should keep all 15 entries when 14 existing + today = 15 (well below 366 cap)", () => {
    // 14 old entries + today = 15 → all retained; 15 < 366 so cap is not exceeded
    // new Date(y, m, d) avoids ISO-date UTC-midnight + setDate local-time timezone mismatch
    const old14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(2026, 2, 1); // March 1, 2026 in local time (month is 0-indexed)
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("sv");
    }); // 2026-03-01 … 2026-03-14
    const h = makeHabitForCheckIn({ checkHistory: old14 });
    const patch = calcCheckInPatch(h, TODAY);
    expect(patch.checkHistory).toHaveLength(15);
    expect(patch.checkHistory?.[patch.checkHistory.length - 1]).toBe(TODAY);
    expect(patch.checkHistory).toContain("2026-03-01");
  });

  it("should cap checkHistory at 366 entries, keeping most recent (367→366: drops oldest)", () => {
    // 366 old entries (2025-03-14 … 2026-03-14) + today (2026-03-15) = 367 → drops oldest
    // new Date(y, m, d) avoids ISO-date UTC-midnight + setDate local-time timezone mismatch
    const old366 = Array.from({ length: 366 }, (_, i) => {
      const d = new Date(2025, 2, 14); // March 14, 2025 in local time (month is 0-indexed)
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("sv");
    }); // 2025-03-14 … 2026-03-14
    const h = makeHabitForCheckIn({ checkHistory: old366 });
    const patch = calcCheckInPatch(h, TODAY);
    expect(patch.checkHistory).toHaveLength(366);
    expect(patch.checkHistory?.[patch.checkHistory.length - 1]).toBe(TODAY);
    expect(patch.checkHistory).not.toContain("2025-03-14");
    expect(patch.checkHistory).toContain("2025-03-15");
  });

  it("should keep all entries when 13 existing + today = 14 (cap not exceeded)", () => {
    // 13 old entries + today = 14 → all retained, no drop
    const old13 = Array.from({ length: 13 }, (_, i) => {
      const d = new Date(2026, 2, 1); // March 1, 2026 in local time (month is 0-indexed)
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
      const d = new Date(2026, 2, 1); // March 1, 2026 in local time (month is 0-indexed)
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

  // 30-day window: verifies that calcPerfectDayStreak supports windows > 14 days,
  // enabling the 30/50/100-day milestones in PERFECT_DAY_MILESTONES.
  // App.tsx must pass a ≥101-day window for these milestones to be detectable.
  const W30 = [
    "2026-02-14","2026-02-15","2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20",
    "2026-02-21","2026-02-22","2026-02-23","2026-02-24","2026-02-25","2026-02-26","2026-02-27",
    "2026-02-28","2026-03-01","2026-03-02","2026-03-03","2026-03-04","2026-03-05","2026-03-06",
    "2026-03-07","2026-03-08","2026-03-09","2026-03-10","2026-03-11","2026-03-12","2026-03-13",
    "2026-03-14","2026-03-15",
  ];

  it("should return 30 with a 30-day window when all 30 days are perfect", () => {
    const h = makeHabit({ checkHistory: [...W30] });
    expect(calcPerfectDayStreak([h], W30)).toBe(30);
  });

  it("should return 30 (not 50) when 50 consecutive days exist in history but window is only 30 days", () => {
    // Habit has check history covering 50+ days, but we pass only a 30-day window.
    // The returned streak is bounded by the window length — the extra history outside the window is ignored.
    const W50_EXTRA = [
      "2026-01-25","2026-01-26","2026-01-27","2026-01-28","2026-01-29","2026-01-30","2026-01-31",
      "2026-02-01","2026-02-02","2026-02-03","2026-02-04","2026-02-05","2026-02-06","2026-02-07",
      "2026-02-08","2026-02-09","2026-02-10","2026-02-11","2026-02-12","2026-02-13",
    ]; // 20 additional days before W30 (total 50 days when combined with W30)
    const h = makeHabit({ checkHistory: [...W50_EXTRA, ...W30] });
    expect(calcPerfectDayStreak([h], W30)).toBe(30); // window caps the streak at 30
  });

  it("should return 14 with a 14-day window even when 30 days of perfect history exist", () => {
    // Documents the constraint: a 14-day window caps the streak at 14.
    // This is why App.tsx must use a ≥101-day window for 30/50/100 milestones to fire.
    const h = makeHabit({ checkHistory: [...W30] });
    const W14 = W30.slice(-14);
    expect(calcPerfectDayStreak([h], W14)).toBe(14);
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

describe("calcEveningHabitReminder", () => {
  // Separate constant to avoid shadowing the module-level TODAY = "2026-03-15" used by other tests
  const EVE_TODAY = "2026-03-16";

  it("should return null for empty habits array", () => {
    expect(calcEveningHabitReminder([], EVE_TODAY)).toBeNull();
  });

  it("should return null when all habits are checked today", () => {
    const habits = [
      { name: "운동", lastChecked: EVE_TODAY },
      { name: "독서", lastChecked: EVE_TODAY },
    ];
    expect(calcEveningHabitReminder(habits, EVE_TODAY)).toBeNull();
  });

  it("should return unchecked habit when one habit has no lastChecked", () => {
    const habits = [
      { name: "운동" },
      { name: "독서", lastChecked: EVE_TODAY },
    ];
    const result = calcEveningHabitReminder(habits, EVE_TODAY);
    expect(result).toEqual({ uncheckedCount: 1, uncheckedNames: ["운동"] });
  });

  it("should return unchecked habit when lastChecked is yesterday", () => {
    const habits = [
      { name: "운동", lastChecked: "2026-03-15" },
      { name: "독서", lastChecked: EVE_TODAY },
    ];
    const result = calcEveningHabitReminder(habits, EVE_TODAY);
    expect(result).toEqual({ uncheckedCount: 1, uncheckedNames: ["운동"] });
  });

  it("should return all habits when none are checked today", () => {
    const habits = [
      { name: "운동" },
      { name: "독서" },
      { name: "명상", lastChecked: "2026-03-10" },
    ];
    const result = calcEveningHabitReminder(habits, EVE_TODAY);
    expect(result).toEqual({ uncheckedCount: 3, uncheckedNames: ["운동", "독서", "명상"] });
  });

  it("should return only unchecked habits when some are checked today", () => {
    const habits = [
      { name: "운동", lastChecked: EVE_TODAY },
      { name: "독서" },
      { name: "명상", lastChecked: EVE_TODAY },
    ];
    const result = calcEveningHabitReminder(habits, EVE_TODAY);
    expect(result).toEqual({ uncheckedCount: 1, uncheckedNames: ["독서"] });
  });

  it("should return null for single habit that is checked today", () => {
    const habits = [{ name: "운동", lastChecked: EVE_TODAY }];
    expect(calcEveningHabitReminder(habits, EVE_TODAY)).toBeNull();
  });

  it("should treat empty string lastChecked as unchecked (not equal to todayStr)", () => {
    // lastChecked="" is not a valid date; must not be treated as "done today"
    const habits = [{ name: "운동", lastChecked: "" }];
    const result = calcEveningHabitReminder(habits, EVE_TODAY);
    expect(result).toEqual({ uncheckedCount: 1, uncheckedNames: ["운동"] });
  });
});

describe("calcHabitMilestoneApproachNotify", () => {
  it("should return empty array when habits is empty", () => {
    expect(calcHabitMilestoneApproachNotify([])).toEqual([]);
  });

  it("should return empty when no habits approaching milestone (streak=3, default threshold=3)", () => {
    // streak=3: days=7-3=4, exceeds threshold=3 → not approaching
    expect(calcHabitMilestoneApproachNotify([{ name: "운동", streak: 3 }])).toEqual([]);
  });

  it("should return alert when habit is 1 day from 🔥 milestone", () => {
    expect(calcHabitMilestoneApproachNotify([{ name: "운동", streak: 6 }]))
      .toEqual([{ name: "운동", daysLeft: 1, badge: "🔥" }]);
  });

  it("should return alert when habit is 2 days from 🔥 milestone", () => {
    expect(calcHabitMilestoneApproachNotify([{ name: "명상", streak: 5 }]))
      .toEqual([{ name: "명상", daysLeft: 2, badge: "🔥" }]);
  });

  it("should return alert when habit is exactly at threshold distance from 🔥 (streak=4)", () => {
    // streak=4: days=7-4=3, at default threshold=3
    expect(calcHabitMilestoneApproachNotify([{ name: "독서", streak: 4 }]))
      .toEqual([{ name: "독서", daysLeft: 3, badge: "🔥" }]);
  });

  it("should return ⭐ alert when habit is 3 days from 30-day milestone (streak=27)", () => {
    expect(calcHabitMilestoneApproachNotify([{ name: "명상", streak: 27 }]))
      .toEqual([{ name: "명상", daysLeft: 3, badge: "⭐" }]);
  });

  it("should return 💎 alert when habit is 1 day from 100-day milestone (streak=99)", () => {
    expect(calcHabitMilestoneApproachNotify([{ name: "운동", streak: 99 }]))
      .toEqual([{ name: "운동", daysLeft: 1, badge: "💎" }]);
  });

  it("should return empty when habit has just reached a milestone (streak=7)", () => {
    // Next milestone is 30 (23 days away) — beyond default threshold=3
    expect(calcHabitMilestoneApproachNotify([{ name: "운동", streak: 7 }])).toEqual([]);
  });

  it("should return empty when streak is 0", () => {
    expect(calcHabitMilestoneApproachNotify([{ name: "운동", streak: 0 }])).toEqual([]);
  });

  it("should return multiple alerts when multiple habits are approaching, skip non-approaching", () => {
    const habits = [
      { name: "운동", streak: 6 },   // 1 day from 🔥
      { name: "명상", streak: 29 },  // 1 day from ⭐
      { name: "독서", streak: 3 },   // 4 days from 🔥 — beyond threshold
    ];
    expect(calcHabitMilestoneApproachNotify(habits)).toEqual([
      { name: "운동", daysLeft: 1, badge: "🔥" },
      { name: "명상", daysLeft: 1, badge: "⭐" },
    ]);
  });

  it("should include streak=25 with custom threshold=5 (days=5 ≤ 5)", () => {
    expect(calcHabitMilestoneApproachNotify([{ name: "운동", streak: 25 }], 5))
      .toEqual([{ name: "운동", daysLeft: 5, badge: "⭐" }]);
  });

  it("should exclude streak=25 with default threshold=3 (days=5 > 3)", () => {
    expect(calcHabitMilestoneApproachNotify([{ name: "운동", streak: 25 }])).toEqual([]);
  });
});

describe("calcWeeklyReviewReminder", () => {
  it("should return generic review message when no weekGoal is set", () => {
    const msg = calcWeeklyReviewReminder(undefined, undefined);
    expect(msg).toContain("주간 회고");
    expect(msg).toContain("다음 주");
  });

  it("should return generic review message when weekGoal is empty string", () => {
    const msg = calcWeeklyReviewReminder("", undefined);
    expect(msg).toContain("주간 회고");
    expect(msg).toContain("다음 주");
  });

  it("should return generic review message when weekGoal is whitespace only", () => {
    const msg = calcWeeklyReviewReminder("   ", undefined);
    expect(msg).toContain("주간 회고");
    expect(msg).toContain("다음 주");
  });

  it("should include weekGoal text in message when goal is set but not done", () => {
    const msg = calcWeeklyReviewReminder("블로그 3편 발행", undefined);
    expect(msg).toContain("블로그 3편 발행");
  });

  it("should include weekGoal text when goal is set and weekGoalDone is false", () => {
    const msg = calcWeeklyReviewReminder("코드 리뷰 완료", false);
    expect(msg).toContain("코드 리뷰 완료");
  });

  it("should include weekGoal text and congratulate when weekGoalDone is true", () => {
    const msg = calcWeeklyReviewReminder("운동 5회", true);
    expect(msg).toContain("운동 5회");
    expect(msg).toContain("달성");
  });

  it("should trim whitespace from weekGoal in message", () => {
    const msg = calcWeeklyReviewReminder("  PR 완료  ", false);
    expect(msg).toContain("PR 완료");
    expect(msg).not.toContain("  PR 완료  ");
  });

  it("should always return a non-empty string", () => {
    expect(calcWeeklyReviewReminder(undefined, undefined)).toBeTruthy();
    expect(calcWeeklyReviewReminder("목표", true)).toBeTruthy();
    expect(calcWeeklyReviewReminder("목표", false)).toBeTruthy();
  });
});

describe("calcPerfectDayMilestoneNotify", () => {
  it("shouldReturnNullForNonMilestoneStreaks", () => {
    expect(calcPerfectDayMilestoneNotify(0)).toBeNull();
    expect(calcPerfectDayMilestoneNotify(1)).toBeNull();
    expect(calcPerfectDayMilestoneNotify(6)).toBeNull();
    expect(calcPerfectDayMilestoneNotify(8)).toBeNull();
    expect(calcPerfectDayMilestoneNotify(10)).toBeNull();
    expect(calcPerfectDayMilestoneNotify(13)).toBeNull();
    expect(calcPerfectDayMilestoneNotify(101)).toBeNull();
    expect(calcPerfectDayMilestoneNotify(200)).toBeNull();
  });

  it("shouldReturnMessageAt7DayMilestone", () => {
    const msg = calcPerfectDayMilestoneNotify(7);
    expect(msg).not.toBeNull();
    expect(msg).toContain("7");
    expect(msg).toContain("완벽한 날");
  });

  it("shouldReturnMessageAt14DayMilestone", () => {
    const msg = calcPerfectDayMilestoneNotify(14);
    expect(msg).not.toBeNull();
    expect(msg).toContain("14");
    expect(msg).toContain("완벽한 날");
  });

  it("shouldReturnMessageAt30DayMilestone", () => {
    const msg = calcPerfectDayMilestoneNotify(30);
    expect(msg).not.toBeNull();
    expect(msg).toContain("30");
    expect(msg).toContain("완벽한 날");
  });

  it("shouldReturnMessageAt50DayMilestone", () => {
    const msg = calcPerfectDayMilestoneNotify(50);
    expect(msg).not.toBeNull();
    expect(msg).toContain("50");
    expect(msg).toContain("완벽한 날");
  });

  it("shouldReturnMessageAt100DayMilestone", () => {
    const msg = calcPerfectDayMilestoneNotify(100);
    expect(msg).not.toBeNull();
    expect(msg).toContain("100");
    expect(msg).toContain("완벽한 날");
  });
});

// Fixed 7-day window: 7 consecutive days ending 2026-03-15 (yesterday when today = 2026-03-16 Monday).
// Represents the sliding calcLastNDays(yesterday, 7) window used by the App.tsx hook.
const REPORT_WINDOW = [
  "2026-03-09",
  "2026-03-10",
  "2026-03-11",
  "2026-03-12",
  "2026-03-13",
  "2026-03-14",
  "2026-03-15",
];

describe("calcWeeklyHabitReport", () => {
  it("shouldReturnNullWhenHabitsIsEmpty", () => {
    expect(calcWeeklyHabitReport([], REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenNoCheckHistoryInWindow", () => {
    const h = makeHabit({ checkHistory: ["2026-01-01"] }); // outside window
    expect(calcWeeklyHabitReport([h], REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenHabitHasNoCheckHistory", () => {
    const h = makeHabit(); // checkHistory absent
    expect(calcWeeklyHabitReport([h], REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturn100PctMessageWhenAllHabitsCompletedEveryDay", () => {
    // 1 habit checked all 7 days → rate = 100%
    const h = makeHabit({ checkHistory: [...REPORT_WINDOW] });
    const msg = calcWeeklyHabitReport([h], REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("100");
    expect(msg).toContain("완벽한 한 주");
  });

  it("shouldReturnHighTierMessageWhenRateAtLeast80", () => {
    // 1 habit, 6/7 days → round(6/7 * 100) = 86% (≥80, <100)
    const h = makeHabit({ checkHistory: REPORT_WINDOW.slice(0, 6) });
    const msg = calcWeeklyHabitReport([h], REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("86");
    expect(msg).not.toContain("이번 주엔 더 해봐요");
    expect(msg).not.toContain("다시 도전해봐요");
  });

  it("shouldReturnMidTierMessageWhenRateBetween60And80", () => {
    // 1 habit, 5/7 days → round(5/7 * 100) = 71% (≥60, <80)
    const h = makeHabit({ checkHistory: REPORT_WINDOW.slice(0, 5) });
    const msg = calcWeeklyHabitReport([h], REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("71");
    expect(msg).toContain("이번 주엔 더 해봐요");
  });

  it("shouldReturnLowTierMessageWhenRateBelow60", () => {
    // 1 habit, 4/7 days → round(4/7 * 100) = 57% (<60)
    const h = makeHabit({ checkHistory: REPORT_WINDOW.slice(0, 4) });
    const msg = calcWeeklyHabitReport([h], REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("57");
    expect(msg).toContain("다시 도전해봐요");
  });

  it("shouldHandleMultipleHabitsAllComplete", () => {
    // 2 habits both checked all 7 days → 100%
    const h1 = makeHabit({ checkHistory: [...REPORT_WINDOW] });
    const h2 = makeHabit({ checkHistory: [...REPORT_WINDOW] });
    const msg = calcWeeklyHabitReport([h1, h2], REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("100");
  });

  it("shouldReturnHighTierMessageAtExactly80Pct", () => {
    // 1 habit, 4/5 days → round(4/5 * 100) = 80% — boundary of ≥80 (high tier)
    const window5 = REPORT_WINDOW.slice(2); // 5 days: 2026-03-11 through 2026-03-15
    const h = makeHabit({ checkHistory: window5.slice(0, 4) });
    const msg = calcWeeklyHabitReport([h], window5);
    expect(msg).not.toBeNull();
    expect(msg).toContain("80");
    expect(msg).not.toContain("이번 주엔 더 해봐요"); // must not fall to mid tier at 80%
  });

  it("shouldReturnMidTierMessageAtExactly60Pct", () => {
    // 1 habit, 3/5 days → round(3/5 * 100) = 60% — boundary of ≥60 (mid tier)
    const window5 = REPORT_WINDOW.slice(2); // 5 days: 2026-03-11 through 2026-03-15
    const h = makeHabit({ checkHistory: window5.slice(0, 3) });
    const msg = calcWeeklyHabitReport([h], window5);
    expect(msg).not.toBeNull();
    expect(msg).toContain("60");
    expect(msg).toContain("이번 주엔 더 해봐요"); // must not fall to low tier at 60%
  });
});

// 14-day window: 2 occurrences per weekday, all known days (Jan 2024)
// Mon(1): Jan 08, Jan 15 | Tue(2): Jan 09, Jan 16 | Wed(3): Jan 10, Jan 17
// Thu(4): Jan 11, Jan 18 | Fri(5): Jan 12, Jan 19 | Sat(6): Jan 13, Jan 20
// Sun(0): Jan 14, Jan 21
const DOW_WINDOW = [
  "2024-01-08", "2024-01-09", "2024-01-10", "2024-01-11",
  "2024-01-12", "2024-01-13", "2024-01-14",
  "2024-01-15", "2024-01-16", "2024-01-17", "2024-01-18",
  "2024-01-19", "2024-01-20", "2024-01-21",
];

describe("calcDayOfWeekHabitRates", () => {
  it("shouldReturnNullForAllWeekdaysWhenHabitsIsEmpty", () => {
    const rates = calcDayOfWeekHabitRates([], DOW_WINDOW);
    for (let d = 0; d <= 6; d++) {
      expect(rates[d]).toBeNull();
    }
  });

  it("shouldReturn100PctForWeekdayWhenHabitCheckedEveryOccurrence", () => {
    // 1 habit checked on both Mondays → Mon rate = 100%
    const h = makeHabit({ checkHistory: ["2024-01-08", "2024-01-15"] });
    const rates = calcDayOfWeekHabitRates([h], DOW_WINDOW);
    expect(rates[1]).toBe(100); // Monday
  });

  it("shouldReturn0PctForWeekdayWhenHabitNeverCheckedOnThatDay", () => {
    // 1 habit checked on Tuesdays only → Monday rate = 0%
    const h = makeHabit({ checkHistory: ["2024-01-09", "2024-01-16"] });
    const rates = calcDayOfWeekHabitRates([h], DOW_WINDOW);
    expect(rates[1]).toBe(0); // Monday
  });

  it("shouldReturn50PctWhenOneOfTwoHabitsCheckedEachOccurrence", () => {
    // 2 habits; only habit1 checked on both Mondays → Mon rate = 50%
    const h1 = makeHabit({ checkHistory: ["2024-01-08", "2024-01-15"] });
    const h2 = makeHabit({ checkHistory: [] });
    const rates = calcDayOfWeekHabitRates([h1, h2], DOW_WINDOW);
    expect(rates[1]).toBe(50); // Monday
  });

  it("shouldReturnNullForWeekdayWithFewerThanMinAppearancesInWindow", () => {
    // 7-day window: each weekday appears only once — insufficient data → null
    const shortWindow = DOW_WINDOW.slice(0, 7);
    const h = makeHabit({ checkHistory: ["2024-01-08"] });
    const rates = calcDayOfWeekHabitRates([h], shortWindow);
    expect(rates[1]).toBeNull(); // Monday: only 1 occurrence
  });

  it("shouldHandleHabitWithNoCheckHistory", () => {
    // Habit without checkHistory treated as never checked
    const h = makeHabit(); // checkHistory absent
    const rates = calcDayOfWeekHabitRates([h], DOW_WINDOW);
    expect(rates[1]).toBe(0); // Monday: 0/2 appearances checked
  });

  it("shouldComputeIndependentRatesForDifferentWeekdays", () => {
    // habit checked on Mondays + Sundays, not on other days
    const h = makeHabit({ checkHistory: ["2024-01-08", "2024-01-14", "2024-01-15", "2024-01-21"] });
    const rates = calcDayOfWeekHabitRates([h], DOW_WINDOW);
    expect(rates[1]).toBe(100); // Monday
    expect(rates[0]).toBe(100); // Sunday
    expect(rates[2]).toBe(0);   // Tuesday
  });

  it("shouldReturnNullForEmptyDayWindow", () => {
    const h = makeHabit({ checkHistory: ["2024-01-08"] });
    const rates = calcDayOfWeekHabitRates([h], []);
    for (let d = 0; d <= 6; d++) {
      expect(rates[d]).toBeNull();
    }
  });
});

describe("calcWeakDayOfWeek", () => {
  it("shouldReturnWeekdayWithLowestRateBelowThreshold", () => {
    // Monday at 0% is the weakest day below the 60% threshold
    const rates: Record<number, number | null> = {
      0: 80, 1: 0, 2: 90, 3: 85, 4: 75, 5: 70, 6: 80,
    };
    expect(calcWeakDayOfWeek(rates)).toBe(1); // Monday
  });

  it("shouldReturnNullWhenAllRatesAboveThreshold", () => {
    const rates: Record<number, number | null> = {
      0: 80, 1: 70, 2: 90, 3: 85, 4: 75, 5: 65, 6: 80,
    };
    expect(calcWeakDayOfWeek(rates)).toBeNull();
  });

  it("shouldReturnNullWhenAllRatesAreNull", () => {
    const rates: Record<number, number | null> = {
      0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null,
    };
    expect(calcWeakDayOfWeek(rates)).toBeNull();
  });

  it("shouldSkipNullRatesWhenFindingWeakestDay", () => {
    // Friday (5) at 40% is below threshold; Sunday (0) is null (skip)
    const rates: Record<number, number | null> = {
      0: null, 1: 80, 2: 90, 3: 85, 4: 75, 5: 40, 6: 80,
    };
    expect(calcWeakDayOfWeek(rates)).toBe(5); // Friday
  });

  it("shouldReturnDayWithAbsoluteLowestRateWhenMultipleBelowThreshold", () => {
    // Tuesday (2) at 20% beats Monday (1) at 40% — both below 60%
    const rates: Record<number, number | null> = {
      0: 80, 1: 40, 2: 20, 3: 85, 4: 75, 5: 70, 6: 80,
    };
    expect(calcWeakDayOfWeek(rates)).toBe(2); // Tuesday
  });

  it("shouldReturnNullAtExactThresholdBoundary", () => {
    // Exactly at threshold (60%) should NOT be considered weak
    const rates: Record<number, number | null> = {
      0: 80, 1: 60, 2: 90, 3: 85, 4: 75, 5: 70, 6: 80,
    };
    expect(calcWeakDayOfWeek(rates)).toBeNull(); // 60% is not below threshold
  });

  it("shouldReturnWeakdayAtOneBelow60Threshold", () => {
    // 59% is strictly below threshold
    const rates: Record<number, number | null> = {
      0: 80, 1: 59, 2: 90, 3: 85, 4: 75, 5: 70, 6: 80,
    };
    expect(calcWeakDayOfWeek(rates)).toBe(1); // Monday at 59%
  });

  it("shouldReturnLowerDowNumberWhenTwoWeekdaysShareMinimumRate", () => {
    // Mon(1) and Tue(2) both at 40% — lowest weekday number (1) wins for stability
    const rates: Record<number, number | null> = {
      0: 80, 1: 40, 2: 40, 3: 85, 4: 75, 5: 70, 6: 80,
    };
    expect(calcWeakDayOfWeek(rates)).toBe(1); // Monday returned (lower dow number)
  });
});

describe("calcBestDayOfWeek", () => {
  it("shouldReturnWeekdayWithHighestRateAboveThreshold", () => {
    // Wednesday (3) at 100% is the strongest day at or above the 80% threshold
    const rates: Record<number, number | null> = {
      0: 50, 1: 60, 2: 70, 3: 100, 4: 75, 5: 65, 6: 55,
    };
    expect(calcBestDayOfWeek(rates)).toBe(3); // Wednesday
  });

  it("shouldReturnNullWhenAllRatesBelowThreshold", () => {
    const rates: Record<number, number | null> = {
      0: 50, 1: 60, 2: 70, 3: 75, 4: 55, 5: 65, 6: 70,
    };
    expect(calcBestDayOfWeek(rates)).toBeNull();
  });

  it("shouldReturnNullWhenAllRatesAreNull", () => {
    const rates: Record<number, number | null> = {
      0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null,
    };
    expect(calcBestDayOfWeek(rates)).toBeNull();
  });

  it("shouldSkipNullRatesWhenFindingBestDay", () => {
    // Friday (5) at 90% is above threshold; Sunday (0) is null (skip)
    const rates: Record<number, number | null> = {
      0: null, 1: 60, 2: 70, 3: 75, 4: 65, 5: 90, 6: 55,
    };
    expect(calcBestDayOfWeek(rates)).toBe(5); // Friday
  });

  it("shouldReturnDayWithAbsoluteHighestRateWhenMultipleAboveThreshold", () => {
    // Wednesday (3) at 95% beats Monday (1) at 85% — both above 80%
    const rates: Record<number, number | null> = {
      0: 60, 1: 85, 2: 70, 3: 95, 4: 75, 5: 65, 6: 60,
    };
    expect(calcBestDayOfWeek(rates)).toBe(3); // Wednesday
  });

  it("shouldReturnNullAtOneBelow80Threshold", () => {
    // 79% should NOT be considered a best day
    const rates: Record<number, number | null> = {
      0: 60, 1: 79, 2: 70, 3: 75, 4: 65, 5: 70, 6: 60,
    };
    expect(calcBestDayOfWeek(rates)).toBeNull(); // 79% is below threshold
  });

  it("shouldReturnBestDayAtExact80Threshold", () => {
    // Exactly at threshold (80%) should be considered a best day
    const rates: Record<number, number | null> = {
      0: 60, 1: 80, 2: 70, 3: 75, 4: 65, 5: 70, 6: 60,
    };
    expect(calcBestDayOfWeek(rates)).toBe(1); // Monday at exactly 80%
  });

  it("shouldReturnLowerDowNumberWhenTwoWeekdaysShareMaximumRate", () => {
    // Mon(1) and Wed(3) both at 90% — lowest weekday number (1) wins for stability
    const rates: Record<number, number | null> = {
      0: 60, 1: 90, 2: 70, 3: 90, 4: 65, 5: 70, 6: 60,
    };
    expect(calcBestDayOfWeek(rates)).toBe(1); // Monday returned (lower dow number)
  });
});

describe("calcHabitMorningReminder — morning habit activation nudge (9:00+, no habits checked today)", () => {
  const TODAY = "2026-03-17";

  it("shouldReturnNullWhenHabitsArrayIsEmpty", () => {
    expect(calcHabitMorningReminder([], TODAY)).toBeNull();
  });

  it("shouldReturnMessageWhenNoHabitsCheckedToday", () => {
    const habits = [
      { name: "운동", lastChecked: "2026-03-16" },
      { name: "독서", lastChecked: "2026-03-15" },
    ];
    const result = calcHabitMorningReminder(habits, TODAY);
    expect(result).not.toBeNull();
    expect(result).toContain("2개"); // habit count phrase
  });

  it("shouldReturnNullWhenAnyHabitAlreadyCheckedToday", () => {
    // Once the user starts (1+ habits done), no nudge needed
    const habits = [
      { name: "운동", lastChecked: TODAY },
      { name: "독서", lastChecked: "2026-03-16" },
    ];
    expect(calcHabitMorningReminder(habits, TODAY)).toBeNull();
  });

  it("shouldReturnNullWhenAllHabitsCheckedToday", () => {
    const habits = [
      { name: "운동", lastChecked: TODAY },
      { name: "독서", lastChecked: TODAY },
    ];
    expect(calcHabitMorningReminder(habits, TODAY)).toBeNull();
  });

  it("shouldReturnMessageWhenSingleHabitNotCheckedToday", () => {
    const habits = [{ name: "명상", lastChecked: "2026-03-16" }];
    const result = calcHabitMorningReminder(habits, TODAY);
    expect(result).not.toBeNull();
    expect(result).toContain("1개"); // single habit count phrase
  });

  it("shouldReturnMessageWhenHabitHasNoLastChecked", () => {
    // A brand-new habit with no lastChecked is still "not done today" — nudge fires
    const habits = [{ name: "새 습관" }];
    const result = calcHabitMorningReminder(habits, TODAY);
    expect(result).not.toBeNull();
    expect(result).toContain("1개");
  });
});

// December 2025 (31 days): mirrors the production window on 2026-01-01 where yesterday = 2025-12-31
// and calcLastNDays("2025-12-31", 31) = 2025-12-01 … 2025-12-31.
// Uses new Date(y, m, d) + toLocaleDateString("sv") to avoid UTC offset shifting the date string
// (toISOString() uses UTC which causes off-by-one at UTC+N timezones like KST UTC+9).
const MONTHLY_REPORT_WINDOW: string[] = Array.from({ length: 31 }, (_, i) => {
  const d = new Date(2025, 11, 1 + i); // month 11 = December
  return d.toLocaleDateString("sv"); // YYYY-MM-DD in local timezone
});

describe("calcMonthlyHabitReport", () => {
  it("shouldReturnNullWhenHabitsIsEmpty", () => {
    expect(calcMonthlyHabitReport([], MONTHLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenNoCheckHistoryInWindow", () => {
    // checkHistory entirely outside the monthly window (November 2025, not December 2025)
    const h = makeHabit({ checkHistory: ["2025-11-01", "2025-11-30"] });
    expect(calcMonthlyHabitReport([h], MONTHLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenHabitHasNoCheckHistory", () => {
    // checkHistory absent — no data to report
    const h = makeHabit();
    expect(calcMonthlyHabitReport([h], MONTHLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturn100PctMessageWhenAllHabitsCompletedEveryDay", () => {
    // 1 habit checked all 30 days → rate = 100%
    const h = makeHabit({ checkHistory: [...MONTHLY_REPORT_WINDOW] });
    const msg = calcMonthlyHabitReport([h], MONTHLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("100");
    expect(msg).toContain("완벽한 한 달");
  });

  it("shouldReturnHighTierMessageWhenRateAtLeast80", () => {
    // 1 habit, 26/31 days → round(26/31 * 100) = 84% (≥80, <100)
    const h = makeHabit({ checkHistory: MONTHLY_REPORT_WINDOW.slice(0, 26) });
    const msg = calcMonthlyHabitReport([h], MONTHLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("84");
    expect(msg).toContain("훌륭해요");
    expect(msg).not.toContain("이번 달엔 더 해봐요");
    expect(msg).not.toContain("다시 도전해봐요");
  });

  it("shouldReturnMidTierMessageWhenRateBetween60And80", () => {
    // 1 habit, 22/31 days → round(22/31 * 100) = 71% (≥60, <80)
    const h = makeHabit({ checkHistory: MONTHLY_REPORT_WINDOW.slice(0, 22) });
    const msg = calcMonthlyHabitReport([h], MONTHLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("71");
    expect(msg).toContain("이번 달엔 더 해봐요");
  });

  it("shouldReturnLowTierMessageWhenRateBelow60", () => {
    // 1 habit, 18/31 days → round(18/31 * 100) = 58% (<60)
    const h = makeHabit({ checkHistory: MONTHLY_REPORT_WINDOW.slice(0, 18) });
    const msg = calcMonthlyHabitReport([h], MONTHLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("58");
    expect(msg).toContain("다시 도전해봐요");
  });

  it("shouldHandleMultipleHabitsAllComplete", () => {
    // 2 habits both checked all 31 days → 100%
    const h1 = makeHabit({ checkHistory: [...MONTHLY_REPORT_WINDOW] });
    const h2 = makeHabit({ checkHistory: [...MONTHLY_REPORT_WINDOW] });
    const msg = calcMonthlyHabitReport([h1, h2], MONTHLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("100");
  });

  it("shouldReturnHighTierMessageAtExactly80Pct", () => {
    // Use 5-day sub-window: 4/5 days → round(4/5 * 100) = 80% — exact boundary of ≥80 (high tier)
    const window5 = MONTHLY_REPORT_WINDOW.slice(0, 5);
    const h = makeHabit({ checkHistory: window5.slice(0, 4) });
    const msg = calcMonthlyHabitReport([h], window5);
    expect(msg).not.toBeNull();
    expect(msg).toContain("80");
    expect(msg).toContain("훌륭해요"); // must be high tier at exactly 80%
    expect(msg).not.toContain("이번 달엔 더 해봐요"); // must not fall to mid tier at 80%
  });

  it("shouldReturnMidTierMessageAtExactly60Pct", () => {
    // Use 5-day sub-window: 3/5 days → round(3/5 * 100) = 60% — exact boundary of ≥60 (mid tier)
    const window5 = MONTHLY_REPORT_WINDOW.slice(0, 5);
    const h = makeHabit({ checkHistory: window5.slice(0, 3) });
    const msg = calcMonthlyHabitReport([h], window5);
    expect(msg).not.toBeNull();
    expect(msg).toContain("60");
    expect(msg).toContain("이번 달엔 더 해봐요"); // must not fall to low tier at 60%
  });
});

// Q4 2025: Oct 1 – Dec 31 = 92 days (Oct 31 + Nov 30 + Dec 31)
const QUARTERLY_REPORT_WINDOW: string[] = Array.from({ length: 92 }, (_, i) => {
  const d = new Date(2025, 9, 1 + i); // month 9 = October (0-indexed)
  return d.toLocaleDateString("sv");
});

describe("calcQuarterlyHabitReport", () => {
  it("shouldReturnNullWhenHabitsIsEmpty", () => {
    expect(calcQuarterlyHabitReport([], QUARTERLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenNoCheckHistoryInWindow", () => {
    // checkHistory entirely outside Q4 2025 (in Q3 2025)
    const h = makeHabit({ checkHistory: ["2025-07-01", "2025-09-30"] });
    expect(calcQuarterlyHabitReport([h], QUARTERLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenHabitHasNoCheckHistory", () => {
    const h = makeHabit();
    expect(calcQuarterlyHabitReport([h], QUARTERLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturn100PctMessageWhenAllHabitsCompletedEveryDay", () => {
    // 1 habit checked all 92 days → rate = 100%
    const h = makeHabit({ checkHistory: [...QUARTERLY_REPORT_WINDOW] });
    const msg = calcQuarterlyHabitReport([h], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("100");
    expect(msg).toContain("완벽한 분기");
  });

  it("shouldReturnHighTierMessageWhenRateAtLeast80", () => {
    // 1 habit, 75/92 days → round(75/92 * 100) = round(81.5) = 82% (≥80, <100)
    const h = makeHabit({ checkHistory: QUARTERLY_REPORT_WINDOW.slice(0, 75) });
    const msg = calcQuarterlyHabitReport([h], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("82");
    expect(msg).toContain("훌륭해요");
    expect(msg).not.toContain("이번 분기엔 더 해봐요");
    expect(msg).not.toContain("다시 도전해봐요");
  });

  it("shouldReturnMidTierMessageWhenRateBetween60And80", () => {
    // 1 habit, 60/92 days → round(60/92 * 100) = round(65.2) = 65% (≥60, <80)
    const h = makeHabit({ checkHistory: QUARTERLY_REPORT_WINDOW.slice(0, 60) });
    const msg = calcQuarterlyHabitReport([h], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("65");
    expect(msg).toContain("이번 분기엔 더 해봐요");
  });

  it("shouldReturnLowTierMessageWhenRateBelow60", () => {
    // 1 habit, 50/92 days → round(50/92 * 100) = round(54.3) = 54% (<60)
    const h = makeHabit({ checkHistory: QUARTERLY_REPORT_WINDOW.slice(0, 50) });
    const msg = calcQuarterlyHabitReport([h], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("54");
    expect(msg).toContain("다시 도전해봐요");
  });

  it("shouldHandleMultipleHabitsAllComplete", () => {
    // 2 habits both checked all 92 days → 100%
    const h1 = makeHabit({ checkHistory: [...QUARTERLY_REPORT_WINDOW] });
    const h2 = makeHabit({ checkHistory: [...QUARTERLY_REPORT_WINDOW] });
    const msg = calcQuarterlyHabitReport([h1, h2], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("100");
  });

  it("shouldReturnHighTierMessageAtExactly80Pct", () => {
    // Use 5-day sub-window: 4/5 days → round(4/5 * 100) = 80% — exact boundary of ≥80 (high tier)
    const window5 = QUARTERLY_REPORT_WINDOW.slice(0, 5);
    const h = makeHabit({ checkHistory: window5.slice(0, 4) });
    const msg = calcQuarterlyHabitReport([h], window5);
    expect(msg).not.toBeNull();
    expect(msg).toContain("80");
    expect(msg).toContain("훌륭해요"); // must be high tier at exactly 80%
    expect(msg).not.toContain("이번 분기엔 더 해봐요"); // must not fall to mid tier at 80%
  });

  it("shouldReturnMidTierMessageAtExactly60Pct", () => {
    // Use 5-day sub-window: 3/5 days → round(3/5 * 100) = 60% — exact boundary of ≥60 (mid tier)
    const window5 = QUARTERLY_REPORT_WINDOW.slice(0, 5);
    const h = makeHabit({ checkHistory: window5.slice(0, 3) });
    const msg = calcQuarterlyHabitReport([h], window5);
    expect(msg).not.toBeNull();
    expect(msg).toContain("60");
    expect(msg).toContain("이번 분기엔 더 해봐요"); // must not fall to low tier at 60%
  });
});

// 2024 is a leap year (366 days): Jan 1 – Dec 31 2024
const YEARLY_REPORT_WINDOW: string[] = Array.from({ length: 366 }, (_, i) => {
  const d = new Date(2024, 0, 1 + i); // month 0 = January (0-indexed)
  return d.toLocaleDateString("sv");
});

describe("calcYearlyHabitReport", () => {
  beforeEach(() => { _habitId = 0; });

  it("shouldReturnNullWhenHabitsIsEmpty", () => {
    expect(calcYearlyHabitReport([], YEARLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenNoCheckHistoryInWindow", () => {
    // checkHistory entirely outside 2024 (in 2023)
    const h = makeHabit({ checkHistory: ["2023-07-01", "2023-12-31"] });
    expect(calcYearlyHabitReport([h], YEARLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenHabitHasNoCheckHistory", () => {
    const h = makeHabit();
    expect(calcYearlyHabitReport([h], YEARLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturn100PctMessageWhenAllHabitsCompletedEveryDay", () => {
    // 1 habit checked all 366 days of 2024 (leap year) → rate = 100%
    const h = makeHabit({ checkHistory: [...YEARLY_REPORT_WINDOW] });
    const msg = calcYearlyHabitReport([h], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("100");
    expect(msg).toContain("완벽한 한 해");
  });

  it("shouldReturnHighTierMessageWhenRateAtLeast80", () => {
    // 1 habit, 300/366 days → round(300/366 * 100) = round(81.97) = 82% (≥80, <100)
    const h = makeHabit({ checkHistory: YEARLY_REPORT_WINDOW.slice(0, 300) });
    const msg = calcYearlyHabitReport([h], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("82");
    expect(msg).toContain("훌륭해요");
    expect(msg).not.toContain("올해엔 더 해봐요");
    expect(msg).not.toContain("다시 도전해봐요");
  });

  it("shouldReturnMidTierMessageWhenRateBetween60And80", () => {
    // 1 habit, 240/366 days → round(240/366 * 100) = round(65.6) = 66% (≥60, <80)
    const h = makeHabit({ checkHistory: YEARLY_REPORT_WINDOW.slice(0, 240) });
    const msg = calcYearlyHabitReport([h], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("66");
    expect(msg).toContain("올해엔 더 해봐요");
  });

  it("shouldReturnLowTierMessageWhenRateBelow60", () => {
    // 1 habit, 200/366 days → round(200/366 * 100) = round(54.6) = 55% (<60)
    const h = makeHabit({ checkHistory: YEARLY_REPORT_WINDOW.slice(0, 200) });
    const msg = calcYearlyHabitReport([h], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("55");
    expect(msg).toContain("다시 도전해봐요");
  });

  it("shouldHandleMultipleHabitsAllComplete", () => {
    // 2 habits both checked all 366 days → 100%
    const h1 = makeHabit({ checkHistory: [...YEARLY_REPORT_WINDOW] });
    const h2 = makeHabit({ checkHistory: [...YEARLY_REPORT_WINDOW] });
    const msg = calcYearlyHabitReport([h1, h2], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("100");
  });

  it("shouldReturnHighTierMessageAtExactly80Pct", () => {
    // Use 5-day sub-window: 4/5 days → round(4/5 * 100) = 80% — exact boundary of ≥80 (high tier)
    const window5 = YEARLY_REPORT_WINDOW.slice(0, 5);
    const h = makeHabit({ checkHistory: window5.slice(0, 4) });
    const msg = calcYearlyHabitReport([h], window5);
    expect(msg).not.toBeNull();
    expect(msg).toContain("80");
    expect(msg).toContain("훌륭해요"); // must be high tier at exactly 80%
    expect(msg).not.toContain("올해엔 더 해봐요"); // must not fall to mid tier at 80%
  });

  it("shouldReturnMidTierMessageAtExactly60Pct", () => {
    // Use 5-day sub-window: 3/5 days → round(3/5 * 100) = 60% — exact boundary of ≥60 (mid tier)
    const window5 = YEARLY_REPORT_WINDOW.slice(0, 5);
    const h = makeHabit({ checkHistory: window5.slice(0, 3) });
    const msg = calcYearlyHabitReport([h], window5);
    expect(msg).not.toBeNull();
    expect(msg).toContain("60");
    expect(msg).toContain("올해엔 더 해봐요"); // must not fall to low tier at 60%
  });

  it("shouldReturnNullWhenWindowIsEmpty", () => {
    // Empty prevYearDays → calcHabitsWeekRate returns null → null
    const h = makeHabit({ checkHistory: YEARLY_REPORT_WINDOW.slice(0, 5) });
    expect(calcYearlyHabitReport([h], [])).toBeNull();
  });

  it("shouldShowLowTierMessageForInactiveUser", () => {
    // Low-activity case: only 14 check-ins in a 366-day window → 4% → ⚠️ low tier.
    const h = makeHabit({ checkHistory: YEARLY_REPORT_WINDOW.slice(0, 14) });
    const msg = calcYearlyHabitReport([h], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("4%");
    expect(msg).toContain("다시 도전해봐요"); // low tier at ~4%
    expect(msg).not.toContain("훌륭해요");
    expect(msg).not.toContain("올해엔 더 해봐요");
  });
});

// 10-day sub-window from QUARTERLY_REPORT_WINDOW (Oct 1–10 2025) for exact-boundary tests.
const QUARTERLY_PERFECT_DAY_WINDOW_10: string[] = QUARTERLY_REPORT_WINDOW.slice(0, 10);

describe("calcQuarterlyPerfectDayReport", () => {
  it("shouldReturnNullWhenHabitsIsEmpty", () => {
    expect(calcQuarterlyPerfectDayReport([], QUARTERLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenWindowIsEmpty", () => {
    const h = makeHabit({ checkHistory: [...QUARTERLY_REPORT_WINDOW] });
    expect(calcQuarterlyPerfectDayReport([h], [])).toBeNull();
  });

  it("shouldReturnNullWhenNoPerfectDaysExist", () => {
    // 2 habits: h1 done on even-indexed days, h2 done on odd-indexed days → no day has BOTH done
    const evenDays = QUARTERLY_REPORT_WINDOW.filter((_, i) => i % 2 === 0);
    const oddDays = QUARTERLY_REPORT_WINDOW.filter((_, i) => i % 2 !== 0);
    const h1 = makeHabit({ checkHistory: evenDays });
    const h2 = makeHabit({ checkHistory: oddDays });
    expect(calcQuarterlyPerfectDayReport([h1, h2], QUARTERLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturn100PctMessageWhenAllDaysPerfect", () => {
    // 1 habit checked all 92 days of Q4 2025 → 92/92 = 100%
    const h = makeHabit({ checkHistory: [...QUARTERLY_REPORT_WINDOW] });
    const msg = calcQuarterlyPerfectDayReport([h], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("92/92");
    expect(msg).toContain("완벽한 분기");
  });

  it("shouldReturnHighTierMessageWhenRate70OrAbove", () => {
    // 1 habit, 70/92 days → round(70/92 * 100) = round(76.1) = 76% (≥70, <100)
    const h = makeHabit({ checkHistory: QUARTERLY_REPORT_WINDOW.slice(0, 70) });
    const msg = calcQuarterlyPerfectDayReport([h], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("70/92");
    expect(msg).toContain("훌륭해요");
    expect(msg).not.toContain("이번 분기엔");
    expect(msg).not.toContain("꾸준히");
  });

  it("shouldReturnMidTierMessageWhenRateBetween40And70", () => {
    // 1 habit, 46/92 days → round(46/92 * 100) = 50% (≥40, <70)
    const h = makeHabit({ checkHistory: QUARTERLY_REPORT_WINDOW.slice(0, 46) });
    const msg = calcQuarterlyPerfectDayReport([h], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("46/92");
    expect(msg).toContain("이번 분기엔");
    expect(msg).not.toContain("훌륭해요");
    expect(msg).not.toContain("꾸준히");
  });

  it("shouldReturnLowTierMessageWhenRateBelow40", () => {
    // 1 habit, 28/92 days → round(28/92 * 100) = round(30.4) = 30% (<40)
    const h = makeHabit({ checkHistory: QUARTERLY_REPORT_WINDOW.slice(0, 28) });
    const msg = calcQuarterlyPerfectDayReport([h], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("28/92");
    expect(msg).toContain("꾸준히");
    expect(msg).not.toContain("훌륭해요");
    expect(msg).not.toContain("이번 분기엔");
  });

  it("shouldCountPerfectDaysRequiringAllHabitsDone", () => {
    // 2 habits: h1 done all 92 days, h2 done only first 10 days → 10 perfect days
    const h1 = makeHabit({ checkHistory: [...QUARTERLY_REPORT_WINDOW] });
    const h2 = makeHabit({ checkHistory: QUARTERLY_REPORT_WINDOW.slice(0, 10) });
    const msg = calcQuarterlyPerfectDayReport([h1, h2], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("10/92");
  });

  it("shouldReturnHighTierAtExact70PctBoundary", () => {
    // 7/10 = 70% → high tier boundary (≥70)
    const h = makeHabit({ checkHistory: QUARTERLY_PERFECT_DAY_WINDOW_10.slice(0, 7) });
    const msg = calcQuarterlyPerfectDayReport([h], QUARTERLY_PERFECT_DAY_WINDOW_10);
    expect(msg).not.toBeNull();
    expect(msg).toContain("7/10");
    expect(msg).toContain("훌륭해요");
    expect(msg).not.toContain("이번 분기엔");
  });

  it("shouldReturnMidTierAtExact40PctBoundary", () => {
    // 4/10 = 40% → mid tier boundary (≥40, <70)
    const h = makeHabit({ checkHistory: QUARTERLY_PERFECT_DAY_WINDOW_10.slice(0, 4) });
    const msg = calcQuarterlyPerfectDayReport([h], QUARTERLY_PERFECT_DAY_WINDOW_10);
    expect(msg).not.toBeNull();
    expect(msg).toContain("4/10");
    expect(msg).toContain("이번 분기엔");
    expect(msg).not.toContain("훌륭해요");
  });

  it("shouldIgnoreCheckHistoryOutsideWindow", () => {
    // habit has check-ins in Q3 2025 (outside Q4 2025 window) → perfectCount = 0 → null
    const h = makeHabit({ checkHistory: ["2025-07-01", "2025-09-30"] });
    expect(calcQuarterlyPerfectDayReport([h], QUARTERLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnHighTierWith2HabitsAtExact70PctBoundary", () => {
    // 2 habits both checked on exactly 7/10 days → 70% → high tier
    const h1 = makeHabit({ checkHistory: QUARTERLY_PERFECT_DAY_WINDOW_10.slice(0, 7) });
    const h2 = makeHabit({ checkHistory: QUARTERLY_PERFECT_DAY_WINDOW_10.slice(0, 7) });
    const msg = calcQuarterlyPerfectDayReport([h1, h2], QUARTERLY_PERFECT_DAY_WINDOW_10);
    expect(msg).not.toBeNull();
    expect(msg).toContain("7/10");
    expect(msg).toContain("훌륭해요");
  });

  it("shouldReturn100PctMessageWhen2HabitsBothAllDaysDone", () => {
    // 2 habits both checked all 92 days → every() fires for all days → 92/92 = 100%
    const h1 = makeHabit({ checkHistory: [...QUARTERLY_REPORT_WINDOW] });
    const h2 = makeHabit({ checkHistory: [...QUARTERLY_REPORT_WINDOW] });
    const msg = calcQuarterlyPerfectDayReport([h1, h2], QUARTERLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("92/92");
    expect(msg).toContain("완벽한 분기");
  });
});

// 10-day sub-window from YEARLY_REPORT_WINDOW (Jan 1–10 2024) for exact-boundary tests.
const YEARLY_PERFECT_DAY_WINDOW_10: string[] = YEARLY_REPORT_WINDOW.slice(0, 10);

describe("calcYearlyPerfectDayReport", () => {
  it("shouldReturnNullWhenHabitsIsEmpty", () => {
    expect(calcYearlyPerfectDayReport([], YEARLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnNullWhenWindowIsEmpty", () => {
    const h = makeHabit({ checkHistory: [...YEARLY_REPORT_WINDOW] });
    expect(calcYearlyPerfectDayReport([h], [])).toBeNull();
  });

  it("shouldReturnNullWhenNoPerfectDaysExist", () => {
    // 2 habits: h1 done on even-indexed days, h2 done on odd-indexed days → no perfect day
    const evenDays = YEARLY_REPORT_WINDOW.filter((_, i) => i % 2 === 0);
    const oddDays = YEARLY_REPORT_WINDOW.filter((_, i) => i % 2 !== 0);
    const h1 = makeHabit({ checkHistory: evenDays });
    const h2 = makeHabit({ checkHistory: oddDays });
    expect(calcYearlyPerfectDayReport([h1, h2], YEARLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturn100PctMessageWhenAllDaysPerfect", () => {
    // 1 habit checked all 366 days of 2024 (leap year) → 366/366 = 100%
    const h = makeHabit({ checkHistory: [...YEARLY_REPORT_WINDOW] });
    const msg = calcYearlyPerfectDayReport([h], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("366/366");
    expect(msg).toContain("완벽한 한 해");
  });

  it("shouldReturnHighTierMessageWhenRate70OrAbove", () => {
    // 1 habit, 280/366 days → round(280/366 * 100) = round(76.5) = 76% (≥70, <100)
    const h = makeHabit({ checkHistory: YEARLY_REPORT_WINDOW.slice(0, 280) });
    const msg = calcYearlyPerfectDayReport([h], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("280/366");
    expect(msg).toContain("훌륭해요");
    expect(msg).not.toContain("올해엔");
    expect(msg).not.toContain("꾸준히");
  });

  it("shouldReturnMidTierMessageWhenRateBetween40And70", () => {
    // 1 habit, 183/366 days → round(183/366 * 100) = 50% (≥40, <70)
    const h = makeHabit({ checkHistory: YEARLY_REPORT_WINDOW.slice(0, 183) });
    const msg = calcYearlyPerfectDayReport([h], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("183/366");
    expect(msg).toContain("올해엔");
    expect(msg).not.toContain("훌륭해요");
    expect(msg).not.toContain("꾸준히");
  });

  it("shouldReturnLowTierMessageWhenRateBelow40", () => {
    // 1 habit, 110/366 days → round(110/366 * 100) = round(30.1) = 30% (<40)
    const h = makeHabit({ checkHistory: YEARLY_REPORT_WINDOW.slice(0, 110) });
    const msg = calcYearlyPerfectDayReport([h], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("110/366");
    expect(msg).toContain("꾸준히");
    expect(msg).not.toContain("훌륭해요");
    expect(msg).not.toContain("올해엔");
  });

  it("shouldCountPerfectDaysRequiringAllHabitsDone", () => {
    // 2 habits: h1 done all 366 days, h2 done only first 10 days → 10 perfect days
    const h1 = makeHabit({ checkHistory: [...YEARLY_REPORT_WINDOW] });
    const h2 = makeHabit({ checkHistory: YEARLY_REPORT_WINDOW.slice(0, 10) });
    const msg = calcYearlyPerfectDayReport([h1, h2], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("10/366");
  });

  it("shouldReturnHighTierAtExact70PctBoundary", () => {
    // 7/10 = 70% → high tier boundary (≥70)
    const h = makeHabit({ checkHistory: YEARLY_PERFECT_DAY_WINDOW_10.slice(0, 7) });
    const msg = calcYearlyPerfectDayReport([h], YEARLY_PERFECT_DAY_WINDOW_10);
    expect(msg).not.toBeNull();
    expect(msg).toContain("7/10");
    expect(msg).toContain("훌륭해요");
    expect(msg).not.toContain("올해엔");
  });

  it("shouldReturnMidTierAtExact40PctBoundary", () => {
    // 4/10 = 40% → mid tier boundary (≥40, <70)
    const h = makeHabit({ checkHistory: YEARLY_PERFECT_DAY_WINDOW_10.slice(0, 4) });
    const msg = calcYearlyPerfectDayReport([h], YEARLY_PERFECT_DAY_WINDOW_10);
    expect(msg).not.toBeNull();
    expect(msg).toContain("4/10");
    expect(msg).toContain("올해엔");
    expect(msg).not.toContain("훌륭해요");
  });

  it("shouldIgnoreCheckHistoryOutsideWindow", () => {
    // habit has check-ins in 2023 (outside 2024 window) → perfectCount = 0 → null
    const h = makeHabit({ checkHistory: ["2023-01-01", "2023-12-31"] });
    expect(calcYearlyPerfectDayReport([h], YEARLY_REPORT_WINDOW)).toBeNull();
  });

  it("shouldReturnHighTierWith2HabitsAtExact70PctBoundary", () => {
    // 2 habits both checked on exactly 7/10 days → 70% → high tier
    const h1 = makeHabit({ checkHistory: YEARLY_PERFECT_DAY_WINDOW_10.slice(0, 7) });
    const h2 = makeHabit({ checkHistory: YEARLY_PERFECT_DAY_WINDOW_10.slice(0, 7) });
    const msg = calcYearlyPerfectDayReport([h1, h2], YEARLY_PERFECT_DAY_WINDOW_10);
    expect(msg).not.toBeNull();
    expect(msg).toContain("7/10");
    expect(msg).toContain("훌륭해요");
  });

  it("shouldReturn100PctMessageWhen2HabitsBothAllDaysDone", () => {
    // 2 habits both checked all 366 days → every() fires for all days → 366/366 = 100%
    const h1 = makeHabit({ checkHistory: [...YEARLY_REPORT_WINDOW] });
    const h2 = makeHabit({ checkHistory: [...YEARLY_REPORT_WINDOW] });
    const msg = calcYearlyPerfectDayReport([h1, h2], YEARLY_REPORT_WINDOW);
    expect(msg).not.toBeNull();
    expect(msg).toContain("366/366");
    expect(msg).toContain("완벽한 한 해");
  });
});

describe("calcHabitMomentumCorrelation — habit completion vs. momentum gap (≥5 samples each bucket, ≥15 pt gap)", () => {
  const TODAY = "2026-03-19";
  const habit: Habit = { name: "exercise", streak: 0, icon: "🏃" };
  // Build a MomentumEntry array: allDoneDates have high score, notDoneDates have low score
  function makeHistory(allDoneDates: string[], scores: { date: string; score: number }[]): MomentumEntry[] {
    return scores.map(({ date, score }) => ({ date, score, tier: score >= 75 ? "high" : score >= 40 ? "mid" : "low" }));
  }

  it("shouldReturnGapWhenAllDoneAverageIsHigherByAtLeast15", () => {
    // allDone: 5 days with score 80; notDone: 5 days with score 60; gap = 20
    const allDoneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history = makeHistory(allDoneDates, [
      ...allDoneDates.map(date => ({ date, score: 80 })),
      ...notDoneDates.map(date => ({ date, score: 60 })),
    ]);
    const habits: Habit[] = [{ ...habit, checkHistory: allDoneDates }];
    const result = calcHabitMomentumCorrelation(habits, history, TODAY);
    expect(result).toBe(20);
  });

  it("shouldReturnNullWhenGapBelow15", () => {
    // allDone: score 74; notDone: score 61; gap = 13
    const allDoneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history = makeHistory(allDoneDates, [
      ...allDoneDates.map(date => ({ date, score: 74 })),
      ...notDoneDates.map(date => ({ date, score: 61 })),
    ]);
    const habits: Habit[] = [{ ...habit, checkHistory: allDoneDates }];
    const result = calcHabitMomentumCorrelation(habits, history, TODAY);
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenFewerThan5SamplesInAllDoneBucket", () => {
    // Only 4 allDone days
    const allDoneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history = makeHistory(allDoneDates, [
      ...allDoneDates.map(date => ({ date, score: 90 })),
      ...notDoneDates.map(date => ({ date, score: 50 })),
    ]);
    const habits: Habit[] = [{ ...habit, checkHistory: allDoneDates }];
    const result = calcHabitMomentumCorrelation(habits, history, TODAY);
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenFewerThan5SamplesInNotAllDoneBucket", () => {
    // 5 allDone days but only 4 notDone days
    const allDoneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09"];
    const history = makeHistory(allDoneDates, [
      ...allDoneDates.map(date => ({ date, score: 90 })),
      ...notDoneDates.map(date => ({ date, score: 50 })),
    ]);
    const habits: Habit[] = [{ ...habit, checkHistory: allDoneDates }];
    const result = calcHabitMomentumCorrelation(habits, history, TODAY);
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenHabitsArrayIsEmpty", () => {
    const history: MomentumEntry[] = [{ date: "2026-03-01", score: 80, tier: "high" }];
    expect(calcHabitMomentumCorrelation([], history, TODAY)).toBeNull();
  });

  it("shouldReturnNullWhenMomentumHistoryIsEmpty", () => {
    const habits: Habit[] = [{ ...habit, checkHistory: ["2026-03-01"] }];
    expect(calcHabitMomentumCorrelation(habits, [], TODAY)).toBeNull();
  });

  it("shouldExcludeTodayFromCorrelationCalculation", () => {
    // allDone: 5 past days score 80; TODAY entry score 0 — today must be excluded
    const allDoneDates = ["2026-03-13", "2026-03-14", "2026-03-15", "2026-03-16", "2026-03-17", TODAY];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history: MomentumEntry[] = [
      ...["2026-03-13", "2026-03-14", "2026-03-15", "2026-03-16", "2026-03-17"].map(date => ({ date, score: 80, tier: "high" as const })),
      { date: TODAY, score: 0, tier: "low" as const }, // today's in-progress — must be excluded
      ...notDoneDates.map(date => ({ date, score: 60, tier: "mid" as const })),
    ];
    const habits: Habit[] = [{ ...habit, checkHistory: allDoneDates }];
    const result = calcHabitMomentumCorrelation(habits, history, TODAY);
    // Without today excluded: allDoneAvg = (80*5+0)/6 ≈ 66.7, gap vs 60 = 6.7 → null
    // With today excluded: allDoneAvg = 80, gap vs 60 = 20 → 20
    expect(result).toBe(20);
  });

  it("shouldRoundGapFromContinuousAveragesCorrectly", () => {
    // allDone: 5 scores summing to 377 → avg = 75.4; notDone: 5 scores summing to 305 → avg = 61.0; gap = 14.4 → null
    // Validates single-rounding vs double-rounding: Math.round(75.4) - Math.round(61.0) = 75-61 = 14 → null either way
    // Actual edge: allDone avg = 75.5, notDone avg = 60.0 → gap = 15.5 → rounds to 16
    const allDoneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    // allDone total = 75+76+76+75+76 = 378, avg = 75.6; notDone total = 60*5=300, avg = 60; gap = 15.6 → rounds to 16
    const history: MomentumEntry[] = [
      { date: "2026-03-01", score: 75, tier: "high" },
      { date: "2026-03-02", score: 76, tier: "high" },
      { date: "2026-03-03", score: 76, tier: "high" },
      { date: "2026-03-04", score: 75, tier: "high" },
      { date: "2026-03-05", score: 76, tier: "high" },
      ...notDoneDates.map(date => ({ date, score: 60, tier: "mid" as const })),
    ];
    const habits: Habit[] = [{ ...habit, checkHistory: allDoneDates }];
    const result = calcHabitMomentumCorrelation(habits, history, TODAY);
    expect(result).toBe(16);
  });
});
