// ABOUTME: Tests for goalPeriods helpers — isoWeekStr, quarterStr, calcWeekGoalStreak, calcMonthGoalStreak, calcQuarterGoalStreak, calcYearGoalStreak, and calcGoalSuccessRate
// ABOUTME: Covers year-boundary edge cases where ISO week year differs from calendar year

import { describe, it, expect } from "vitest";
import { isoWeekStr, quarterStr, monthStr, calcWeekGoalStreak, calcMonthGoalStreak, calcQuarterGoalStreak, calcYearGoalStreak, calcGoalSuccessRate } from "./goalPeriods";
import type { GoalEntry } from "../types";

describe("isoWeekStr", () => {
  // ── Ordinary mid-year dates ──────────────────────────────────────────────

  it("should return W01 for Jan 1 2025 (Wednesday — W01 contains Thursday Jan 2)", () => {
    // ISO week 1 = week containing the first Thursday.
    // Jan 2 2025 is the first Thursday → W01 runs Mon Dec 30 2024 – Sun Jan 5 2025.
    // Jan 1 (Wed) falls in that span → 2025-W01.
    expect(isoWeekStr(new Date(2025, 0, 1))).toBe("2025-W01");
  });

  it("should return W06 for Feb 3 2025 (a regular mid-winter week)", () => {
    // Jan 6 starts W02; each subsequent Monday starts next week.
    // Feb 3 2025 is a Monday → W06.
    expect(isoWeekStr(new Date(2025, 1, 3))).toBe("2025-W06");
  });

  it("should return W11 for Mar 10 2025 (mid-year week)", () => {
    // Mar 10 2025 is a Monday → W11.
    expect(isoWeekStr(new Date(2025, 2, 10))).toBe("2025-W11");
  });

  it("should return the same week for all days of the same ISO week", () => {
    // W15 2025: Mon Apr 7 – Sun Apr 13
    const mon = isoWeekStr(new Date(2025, 3, 7));   // Mon Apr 7
    const wed = isoWeekStr(new Date(2025, 3, 9));   // Wed Apr 9
    const sun = isoWeekStr(new Date(2025, 3, 13));  // Sun Apr 13
    expect(mon).toBe(wed);
    expect(wed).toBe(sun);
  });

  it("should advance week number by 1 across the Monday boundary", () => {
    // Sunday Apr 13 = last day of W15; Monday Apr 14 = first day of W16
    const sun = isoWeekStr(new Date(2025, 3, 13)); // Sun → W15
    const mon = isoWeekStr(new Date(2025, 3, 14)); // Mon → W16
    expect(sun).toBe("2025-W15");
    expect(mon).toBe("2025-W16");
  });

  // ── Year-boundary: ISO week year ≠ calendar year ─────────────────────────

  it("should assign Jan 1 2021 to 2020-W53 (ISO week year precedes calendar year)", () => {
    // Jan 1 2021 is Friday. The Thursday of that week is Dec 31 2020 → belongs to 2020-W53.
    expect(isoWeekStr(new Date(2021, 0, 1))).toBe("2020-W53");
  });

  it("should assign Jan 3 2021 to 2020-W53 (Sun — still in the same cross-year week)", () => {
    // W53 of 2020 runs Mon Dec 28 2020 – Sun Jan 3 2021.
    expect(isoWeekStr(new Date(2021, 0, 3))).toBe("2020-W53");
  });

  it("should assign Jan 4 2021 to 2021-W01 (first Monday of 2021's W01)", () => {
    // Monday Jan 4 2021 begins W01 2021.
    expect(isoWeekStr(new Date(2021, 0, 4))).toBe("2021-W01");
  });

  it("should assign Dec 31 2018 to 2019-W01 (ISO week year exceeds calendar year)", () => {
    // Dec 31 2018 is a Monday. Thursday is Jan 3 2019 → W01 of 2019.
    expect(isoWeekStr(new Date(2018, 11, 31))).toBe("2019-W01");
  });

  it("should assign Dec 30 2018 to 2018-W52 (Sunday before the cross-year W01 boundary)", () => {
    // W01 2019 starts Mon Dec 31 2018. Dec 30 (Sun) belongs to Mon Dec 24–Sun Dec 30,
    // whose Thursday is Dec 27 2018 → 2018-W52. The cross-year jump happens at Dec 31.
    expect(isoWeekStr(new Date(2018, 11, 30))).toBe("2018-W52");
  });

  // ── Week 53: only in long years ──────────────────────────────────────────

  it("should produce W52 as the last week for most years (2025)", () => {
    // Dec 28 2025 is a Sunday of W52 2025.
    expect(isoWeekStr(new Date(2025, 11, 28))).toBe("2025-W52");
  });

  it("should zero-pad single-digit week numbers (W01 not W1)", () => {
    // Jan 6 2025 is Monday of W02; W02 is zero-padded in the output.
    // Also verify W01 (Jan 1 2025) is padded — pattern check covers both.
    expect(isoWeekStr(new Date(2025, 0, 6))).toBe("2025-W02");
    expect(isoWeekStr(new Date(2025, 0, 1))).toBe("2025-W01"); // W01 zero-padded
  });

  // ── Format contract ──────────────────────────────────────────────────────

  it("should always return 'YYYY-Www' format", () => {
    const result = isoWeekStr(new Date(2026, 2, 15)); // Mar 15 2026
    expect(result).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("quarterStr", () => {
  it("should return Q1 for January (start of quarter)", () => {
    expect(quarterStr(new Date(2026, 0, 1))).toBe("2026-Q1");
  });

  it("should return Q1 for February", () => {
    expect(quarterStr(new Date(2026, 1, 15))).toBe("2026-Q1");
  });

  it("should return Q1 for March (end of Q1)", () => {
    expect(quarterStr(new Date(2026, 2, 31))).toBe("2026-Q1");
  });

  it("should return Q2 for April (start of Q2)", () => {
    expect(quarterStr(new Date(2026, 3, 1))).toBe("2026-Q2");
  });

  it("should return Q2 for June (end of Q2)", () => {
    expect(quarterStr(new Date(2026, 5, 30))).toBe("2026-Q2");
  });

  it("should return Q3 for July (start of Q3)", () => {
    expect(quarterStr(new Date(2026, 6, 1))).toBe("2026-Q3");
  });

  it("should return Q3 for September (end of Q3)", () => {
    expect(quarterStr(new Date(2026, 8, 30))).toBe("2026-Q3");
  });

  it("should return Q4 for October (start of Q4)", () => {
    expect(quarterStr(new Date(2026, 9, 1))).toBe("2026-Q4");
  });

  it("should return Q4 for December (end of Q4)", () => {
    expect(quarterStr(new Date(2026, 11, 31))).toBe("2026-Q4");
  });

  it("should use the calendar year, not an ISO week year", () => {
    // Dec 31 2018 is in 2019-W01 (ISO week year = 2019) but Q4 of calendar year 2018
    expect(quarterStr(new Date(2018, 11, 31))).toBe("2018-Q4");
  });

  it("should always return 'YYYY-QN' format", () => {
    expect(quarterStr(new Date(2026, 6, 15))).toMatch(/^\d{4}-Q[1-4]$/);
  });
});

describe("monthStr", () => {
  it("should return 'YYYY-MM' for a mid-year date", () => {
    expect(monthStr(new Date(2025, 2, 15))).toBe("2025-03"); // Mar 15 2025
  });

  it("should zero-pad single-digit months", () => {
    expect(monthStr(new Date(2025, 0, 1))).toBe("2025-01"); // Jan 1 2025
  });

  it("should return December correctly", () => {
    expect(monthStr(new Date(2024, 11, 31))).toBe("2024-12"); // Dec 31 2024
  });
});

describe("calcWeekGoalStreak", () => {
  // Stable Monday anchor: Mon Mar 10 2025 = "2025-W11"
  // Going back 7 days each time: W10(Mar 3), W09(Feb 24), W08(Feb 17), W07(Feb 10), W06(Feb 3), W05(Jan 27), W04(Jan 20)
  const now = new Date(2025, 2, 10); // Mon Mar 10 2025 → "2025-W11"
  const W11 = "2025-W11";
  const W10 = "2025-W10";
  const W09 = "2025-W09";
  const W08 = "2025-W08";
  const W07 = "2025-W07";

  it("should return 0 when weekGoal is undefined", () => {
    expect(calcWeekGoalStreak(undefined, W11, [], now)).toBe(0);
  });

  it("should return 0 when weekGoal is empty string", () => {
    expect(calcWeekGoalStreak("", W11, [], now)).toBe(0);
  });

  it("should return 0 when weekGoalDate is undefined", () => {
    expect(calcWeekGoalStreak("goal text", undefined, [], now)).toBe(0);
  });

  it("should return 0 when weekGoalDate is for a different (stale) week", () => {
    // weekGoalDate does not match the current ISO week → stale, streak = 0
    expect(calcWeekGoalStreak("goal text", W10, [], now)).toBe(0);
  });

  it("should return 1 when current week has goal and history is empty", () => {
    expect(calcWeekGoalStreak("goal text", W11, [], now)).toBe(1);
  });

  it("should return 1 when history only has an older non-adjacent week (gap after current)", () => {
    // W09 exists in history but W10 (previous week) is absent — streak breaks immediately
    expect(calcWeekGoalStreak("goal text", W11, [{ date: W09, text: "old" }], now)).toBe(1);
  });

  it("should return 2 when current and immediately previous week both have goals", () => {
    expect(calcWeekGoalStreak("goal text", W11, [{ date: W10, text: "prev" }], now)).toBe(2);
  });

  it("should return 3 when three consecutive weeks have goals", () => {
    expect(calcWeekGoalStreak(
      "goal text", W11,
      [{ date: W10, text: "p1" }, { date: W09, text: "p2" }],
      now,
    )).toBe(3);
  });

  it("should return 5 when five consecutive weeks have goals", () => {
    expect(calcWeekGoalStreak(
      "goal text", W11,
      [{ date: W10, text: "goal" }, { date: W09, text: "goal" }, { date: W08, text: "goal" }, { date: W07, text: "goal" }],
      now,
    )).toBe(5);
  });

  it("should stop counting at the first gap in consecutive week history", () => {
    // W10 present, W09 absent, W08 present — streak stops at gap after W10
    expect(calcWeekGoalStreak(
      "goal text", W11,
      [{ date: W10, text: "goal" }, { date: W08, text: "goal" }],
      now,
    )).toBe(2);
  });

  it("should count history entries regardless of their done status", () => {
    expect(calcWeekGoalStreak(
      "goal text", W11,
      [{ date: W10, text: "done goal", done: true }, { date: W09, text: "another" }],
      now,
    )).toBe(3);
  });

  it("should handle year boundary correctly (2021-W01 with 2020-W53 in history)", () => {
    // Mon Jan 4 2021 → "2021-W01"; 7 days back = Mon Dec 28 2020 → "2020-W53"
    const nowBoundary = new Date(2021, 0, 4);
    expect(calcWeekGoalStreak(
      "goal text", "2021-W01",
      [{ date: "2020-W53", text: "cross-year goal" }],
      nowBoundary,
    )).toBe(2);
  });

  it("should handle ISO week year boundary (2019-W01 derived from Dec 31 2018 with 2018-W52 in history)", () => {
    // Dec 31 2018 → "2019-W01" (ISO week year ≠ calendar year)
    // Going back 7 days from Dec 31 2018 → Dec 24 2018 → "2018-W52"
    const nowBoundary = new Date(2018, 11, 31); // Mon Dec 31 2018 → "2019-W01"
    expect(calcWeekGoalStreak(
      "goal text", "2019-W01",
      [{ date: "2018-W52", text: "prev week goal" }],
      nowBoundary,
    )).toBe(2);
  });

  it("should return 8 when all 7 history entries are consecutive with the current week", () => {
    // History has 7 entries for W10..W04; current = W11; streak = 8
    const history = [W10, W09, W08, W07, "2025-W06", "2025-W05", "2025-W04"].map(date => ({ date, text: "goal" }));
    expect(calcWeekGoalStreak("goal text", W11, history, now)).toBe(8);
  });
});

describe("calcGoalSuccessRate", () => {
  it("should return null when history is empty", () => {
    expect(calcGoalSuccessRate([])).toBeNull();
  });

  it("should return done:0 and pct:0 when no entries have done:true", () => {
    const history: GoalEntry[] = [
      { date: "2025-W01", text: "goal A" },
      { date: "2025-W02", text: "goal B" },
      { date: "2025-W03", text: "goal C" },
    ];
    expect(calcGoalSuccessRate(history)).toEqual({ done: 0, total: 3, pct: 0 });
  });

  it("should return done:N and pct:100 when all entries have done:true", () => {
    const history: GoalEntry[] = [
      { date: "2025-W01", text: "goal A", done: true },
      { date: "2025-W02", text: "goal B", done: true },
      { date: "2025-W03", text: "goal C", done: true },
    ];
    expect(calcGoalSuccessRate(history)).toEqual({ done: 3, total: 3, pct: 100 });
  });

  it("should return pct:50 for 2 done out of 4", () => {
    const history: GoalEntry[] = [
      { date: "2025-W01", text: "A", done: true },
      { date: "2025-W02", text: "B", done: true },
      { date: "2025-W03", text: "C" },
      { date: "2025-W04", text: "D" },
    ];
    expect(calcGoalSuccessRate(history)).toEqual({ done: 2, total: 4, pct: 50 });
  });

  it("should round pct: 1/3 rounds to 33", () => {
    const history: GoalEntry[] = [
      { date: "2025-W01", text: "A", done: true },
      { date: "2025-W02", text: "B" },
      { date: "2025-W03", text: "C" },
    ];
    const result = calcGoalSuccessRate(history);
    expect(result?.done).toBe(1);
    expect(result?.total).toBe(3);
    expect(result?.pct).toBe(33); // Math.round(1/3 * 100) = 33
  });

  it("should round pct: 2/3 rounds to 67", () => {
    const history: GoalEntry[] = [
      { date: "2025-W01", text: "A", done: true },
      { date: "2025-W02", text: "B", done: true },
      { date: "2025-W03", text: "C" },
    ];
    expect(calcGoalSuccessRate(history)?.pct).toBe(67); // Math.round(2/3 * 100) = 67
  });

  it("should not count entries with done:false as done", () => {
    const history: GoalEntry[] = [
      { date: "2025-W01", text: "A", done: false },
      { date: "2025-W02", text: "B", done: true },
    ];
    expect(calcGoalSuccessRate(history)).toEqual({ done: 1, total: 2, pct: 50 });
  });

  it("should return done:0 when all entries have done:false (explicit false treated same as absent)", () => {
    // done: false and done: undefined are both "not done" — project convention uses done === true strict check
    const history: GoalEntry[] = [
      { date: "2025-W01", text: "A", done: false },
      { date: "2025-W02", text: "B", done: false },
      { date: "2025-W03", text: "C", done: false },
    ];
    expect(calcGoalSuccessRate(history)).toEqual({ done: 0, total: 3, pct: 0 });
  });

  it("should not count entries with done absent as done (absent = not done convention)", () => {
    // done?: boolean — absent means false per project convention (JSON.stringify omits undefined)
    const history: GoalEntry[] = [
      { date: "2025-W01", text: "A" }, // no done field
      { date: "2025-W02", text: "B", done: true },
    ];
    expect(calcGoalSuccessRate(history)).toEqual({ done: 1, total: 2, pct: 50 });
  });

  it("should work for a single done entry", () => {
    const history: GoalEntry[] = [{ date: "2025-Q1", text: "quarterly goal", done: true }];
    expect(calcGoalSuccessRate(history)).toEqual({ done: 1, total: 1, pct: 100 });
  });

  it("should work for a single not-done entry", () => {
    const history: GoalEntry[] = [{ date: "2025", text: "yearly goal" }];
    expect(calcGoalSuccessRate(history)).toEqual({ done: 0, total: 1, pct: 0 });
  });
});

describe("calcMonthGoalStreak", () => {
  // now = Mar 15 2025; currentMonth = "2025-03"
  const now = new Date(2025, 2, 15); // Mar 15 2025
  const currentMonth = "2025-03";
  const prev1 = "2025-02"; // Feb 2025
  const prev2 = "2025-01"; // Jan 2025
  const prev3 = "2024-12"; // Dec 2024 (year boundary)

  it("should return 0 when monthGoal is undefined", () => {
    expect(calcMonthGoalStreak(undefined, currentMonth, [], now)).toBe(0);
  });

  it("should return 0 when monthGoal is empty string", () => {
    expect(calcMonthGoalStreak("", currentMonth, [], now)).toBe(0);
  });

  it("should return 0 when monthGoalDate is undefined", () => {
    expect(calcMonthGoalStreak("goal", undefined, [], now)).toBe(0);
  });

  it("should return 0 when monthGoalDate is stale (previous month)", () => {
    expect(calcMonthGoalStreak("goal", prev1, [], now)).toBe(0);
  });

  it("should return 1 when current month goal set and no history", () => {
    expect(calcMonthGoalStreak("goal", currentMonth, [], now)).toBe(1);
  });

  it("should return 1 when history has a non-consecutive month (gap)", () => {
    // prev2 (Jan) is set but prev1 (Feb) is absent — gap prevents counting back
    expect(calcMonthGoalStreak("goal", currentMonth, [{ date: prev2, text: "jan" }], now)).toBe(1);
  });

  it("should return 2 when previous month is in history", () => {
    expect(calcMonthGoalStreak("goal", currentMonth, [{ date: prev1, text: "feb" }], now)).toBe(2);
  });

  it("should return 3 when two consecutive previous months are in history", () => {
    expect(calcMonthGoalStreak("goal", currentMonth, [
      { date: prev1, text: "feb" },
      { date: prev2, text: "jan" },
    ], now)).toBe(3);
  });

  it("should stop counting at first gap in consecutive history", () => {
    // prev1 (Feb) present, prev2 (Jan) absent, prev3 (Dec) present — stops at gap
    expect(calcMonthGoalStreak("goal", currentMonth, [
      { date: prev1, text: "feb" },
      { date: prev3, text: "dec" },
    ], now)).toBe(2);
  });

  it("should count history entries regardless of their done status", () => {
    expect(calcMonthGoalStreak("goal", currentMonth, [
      { date: prev1, text: "feb", done: true },
      { date: prev2, text: "jan", done: false },
    ], now)).toBe(3);
  });

  it("should handle year boundary correctly (Jan 2025 with Dec 2024 in history)", () => {
    const nowJan = new Date(2025, 0, 15); // Jan 15 2025
    expect(calcMonthGoalStreak("goal", "2025-01", [{ date: "2024-12", text: "dec" }], nowJan)).toBe(2);
  });

  it("should return 12 when all 11 history entries are consecutive with the current month (maximum)", () => {
    // now = Mar 2025; history = Feb..Apr 2024 (11 consecutive months)
    const history = [
      "2025-02", "2025-01", "2024-12", "2024-11", "2024-10",
      "2024-09", "2024-08", "2024-07", "2024-06", "2024-05", "2024-04",
    ].map(date => ({ date, text: "goal" }));
    expect(calcMonthGoalStreak("goal", currentMonth, history, now)).toBe(12);
  });
});

describe("calcQuarterGoalStreak", () => {
  // now = Mar 15 2025; quarter = Q1 2025; quarterStr = "2025-Q1"
  const now = new Date(2025, 2, 15); // Mar 15 2025 → Q1
  const currentQtr = "2025-Q1";
  const prevQtr1 = "2024-Q4"; // year boundary
  const prevQtr2 = "2024-Q3";
  const prevQtr3 = "2024-Q2";

  it("should return 0 when quarterGoal is undefined", () => {
    expect(calcQuarterGoalStreak(undefined, currentQtr, [], now)).toBe(0);
  });

  it("should return 0 when quarterGoal is empty string", () => {
    expect(calcQuarterGoalStreak("", currentQtr, [], now)).toBe(0);
  });

  it("should return 0 when quarterGoalDate is undefined", () => {
    expect(calcQuarterGoalStreak("goal", undefined, [], now)).toBe(0);
  });

  it("should return 0 when quarterGoalDate is stale (previous quarter)", () => {
    expect(calcQuarterGoalStreak("goal", prevQtr1, [], now)).toBe(0);
  });

  it("should return 1 when current quarter goal set and no history", () => {
    expect(calcQuarterGoalStreak("goal", currentQtr, [], now)).toBe(1);
  });

  it("should return 1 when history has a non-consecutive quarter (gap)", () => {
    // prevQtr2 (Q3 2024) present but prevQtr1 (Q4 2024) absent — gap
    expect(calcQuarterGoalStreak("goal", currentQtr, [{ date: prevQtr2, text: "q3" }], now)).toBe(1);
  });

  it("should return 2 when previous quarter is in history (year boundary Q1→Q4)", () => {
    expect(calcQuarterGoalStreak("goal", currentQtr, [{ date: prevQtr1, text: "q4" }], now)).toBe(2);
  });

  it("should return 3 when two consecutive previous quarters are in history", () => {
    expect(calcQuarterGoalStreak("goal", currentQtr, [
      { date: prevQtr1, text: "q4" },
      { date: prevQtr2, text: "q3" },
    ], now)).toBe(3);
  });

  it("should stop counting at first gap in consecutive history", () => {
    // prevQtr1 (Q4) present, prevQtr2 (Q3) absent, prevQtr3 (Q2) present — stops at gap
    expect(calcQuarterGoalStreak("goal", currentQtr, [
      { date: prevQtr1, text: "q4" },
      { date: prevQtr3, text: "q2" },
    ], now)).toBe(2);
  });

  it("should count history entries regardless of their done status", () => {
    expect(calcQuarterGoalStreak("goal", currentQtr, [
      { date: prevQtr1, text: "q4", done: true },
      { date: prevQtr2, text: "q3", done: false },
    ], now)).toBe(3);
  });

  it("should handle mid-year quarter (Q3 2025 with Q2 in history)", () => {
    const nowQ3 = new Date(2025, 6, 15); // Jul 15 2025 → Q3
    expect(calcQuarterGoalStreak("goal", "2025-Q3", [{ date: "2025-Q2", text: "q2" }], nowQ3)).toBe(2);
  });

  it("should return 8 when all 7 history entries are consecutive with the current quarter (maximum)", () => {
    // Q1 2025; history = Q4 2024, Q3 2024, Q2 2024, Q1 2024, Q4 2023, Q3 2023, Q2 2023
    const history = [
      "2024-Q4", "2024-Q3", "2024-Q2", "2024-Q1", "2023-Q4", "2023-Q3", "2023-Q2",
    ].map(date => ({ date, text: "goal" }));
    expect(calcQuarterGoalStreak("goal", currentQtr, history, now)).toBe(8);
  });
});

describe("calcYearGoalStreak", () => {
  // now = Mar 15 2025; year = 2025; yearGoalDate format = "YYYY"
  const now = new Date(2025, 2, 15); // Mar 15 2025
  const currentYear = "2025";
  const prevYear1 = "2024";
  const prevYear2 = "2023";
  const prevYear3 = "2022";

  it("should return 0 when yearGoal is undefined", () => {
    expect(calcYearGoalStreak(undefined, currentYear, [], now)).toBe(0);
  });

  it("should return 0 when yearGoal is empty string", () => {
    expect(calcYearGoalStreak("", currentYear, [], now)).toBe(0);
  });

  it("should return 0 when yearGoalDate is undefined", () => {
    expect(calcYearGoalStreak("goal", undefined, [], now)).toBe(0);
  });

  it("should return 0 when yearGoalDate is stale (previous year)", () => {
    expect(calcYearGoalStreak("goal", prevYear1, [], now)).toBe(0);
  });

  it("should return 1 when current year goal set and no history", () => {
    expect(calcYearGoalStreak("goal", currentYear, [], now)).toBe(1);
  });

  it("should return 1 when history has a non-consecutive year (gap)", () => {
    // prevYear2 (2023) present but prevYear1 (2024) absent — gap
    expect(calcYearGoalStreak("goal", currentYear, [{ date: prevYear2, text: "2023" }], now)).toBe(1);
  });

  it("should return 2 when previous year is in history", () => {
    expect(calcYearGoalStreak("goal", currentYear, [{ date: prevYear1, text: "2024" }], now)).toBe(2);
  });

  it("should return 3 when two consecutive previous years are in history", () => {
    expect(calcYearGoalStreak("goal", currentYear, [
      { date: prevYear1, text: "2024" },
      { date: prevYear2, text: "2023" },
    ], now)).toBe(3);
  });

  it("should stop counting at first gap in consecutive history", () => {
    // prevYear1 (2024) present, prevYear2 (2023) absent, prevYear3 (2022) present — stops at gap
    expect(calcYearGoalStreak("goal", currentYear, [
      { date: prevYear1, text: "2024" },
      { date: prevYear3, text: "2022" },
    ], now)).toBe(2);
  });

  it("should count history entries regardless of their done status", () => {
    expect(calcYearGoalStreak("goal", currentYear, [
      { date: prevYear1, text: "2024", done: true },
      { date: prevYear2, text: "2023", done: false },
    ], now)).toBe(3);
  });

  it("should return 5 when all 4 history entries are consecutive with the current year (maximum)", () => {
    // yearGoalHistory caps at 5 entries; current + 4 history = 5 max
    const history = ["2024", "2023", "2022", "2021"].map(date => ({ date, text: "goal" }));
    expect(calcYearGoalStreak("goal", currentYear, history, now)).toBe(5);
  });
});
