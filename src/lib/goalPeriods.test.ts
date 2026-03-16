// ABOUTME: Tests for goalPeriods helpers — isoWeekStr, quarterStr, calcWeekGoalStreak, calcMonthGoalStreak, calcQuarterGoalStreak, calcYearGoalStreak, calcGoalSuccessRate, calcLastNWeeks, calcWeekGoalHeatmap, calcLastNMonths, calcMonthGoalHeatmap, calcLastNQuarters, calcQuarterGoalHeatmap, calcLastNYears, calcYearGoalHeatmap, calcMonthlyGoalReminder, calcQuarterlyGoalReminder, calcYearlyGoalReminder, calcGoalCompletionNotify, calcWeeklyGoalMorningReminder, calcWeeklyGoalReport, calcMonthlyGoalReport, calcQuarterlyGoalReport, calcYearlyGoalReport
// ABOUTME: Covers year-boundary edge cases where ISO week year differs from calendar year

import { describe, it, expect } from "vitest";
import { isoWeekStr, quarterStr, calcWeekGoalStreak, calcMonthGoalStreak, calcQuarterGoalStreak, calcYearGoalStreak, calcGoalSuccessRate, calcLastNWeeks, calcWeekGoalHeatmap, calcLastNMonths, calcMonthGoalHeatmap, calcLastNQuarters, calcQuarterGoalHeatmap, calcLastNYears, calcYearGoalHeatmap, calcMonthlyGoalReminder, calcQuarterlyGoalReminder, calcYearlyGoalReminder, calcGoalCompletionNotify, calcWeeklyGoalMorningReminder, calcWeeklyGoalReport, calcMonthlyGoalReport, calcQuarterlyGoalReport, calcYearlyGoalReport } from "./goalPeriods";
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

describe("calcMonthGoalStreak", () => {
  // Stable anchor: Mar 10 2025 → "2025-03"
  // Going back 1 month each time: "2025-02", "2025-01", "2024-12", "2024-11", "2024-10", "2024-09", "2024-08"
  const now = new Date(2025, 2, 10);
  const M03 = "2025-03";
  const M02 = "2025-02";
  const M01 = "2025-01";
  const M12 = "2024-12"; // year boundary

  it("should return 0 when monthGoal is undefined", () => {
    expect(calcMonthGoalStreak(undefined, M03, [], now)).toBe(0);
  });

  it("should return 0 when monthGoal is empty string", () => {
    expect(calcMonthGoalStreak("", M03, [], now)).toBe(0);
  });

  it("should return 0 when monthGoalDate is undefined", () => {
    expect(calcMonthGoalStreak("goal text", undefined, [], now)).toBe(0);
  });

  it("should return 0 when monthGoalDate is stale (different month)", () => {
    expect(calcMonthGoalStreak("goal text", M02, [], now)).toBe(0);
  });

  it("should return 1 when current month has goal and history is empty", () => {
    expect(calcMonthGoalStreak("goal text", M03, [], now)).toBe(1);
  });

  it("should return 1 when history only has a non-adjacent month (gap after current)", () => {
    // M01 exists in history but M02 (previous month) is absent — streak breaks immediately
    expect(calcMonthGoalStreak("goal text", M03, [{ date: M01, text: "old" }], now)).toBe(1);
  });

  it("should return 2 when current and immediately previous month both have goals", () => {
    expect(calcMonthGoalStreak("goal text", M03, [{ date: M02, text: "prev" }], now)).toBe(2);
  });

  it("should return 3 when three consecutive months have goals", () => {
    expect(calcMonthGoalStreak(
      "goal text", M03,
      [{ date: M02, text: "p1" }, { date: M01, text: "p2" }],
      now,
    )).toBe(3);
  });

  it("should stop counting at the first gap in consecutive month history", () => {
    // M02 present, M01 absent, M12 present — streak stops at gap after M02
    expect(calcMonthGoalStreak(
      "goal text", M03,
      [{ date: M02, text: "goal" }, { date: M12, text: "goal" }],
      now,
    )).toBe(2);
  });

  it("should count history entries regardless of their done status", () => {
    expect(calcMonthGoalStreak(
      "goal text", M03,
      [{ date: M02, text: "done goal", done: true }, { date: M01, text: "another" }],
      now,
    )).toBe(3);
  });

  it("should handle year boundary correctly (Jan with Dec of prior year in history)", () => {
    const nowJan = new Date(2025, 0, 15); // Jan 15 2025 → "2025-01"
    expect(calcMonthGoalStreak(
      "goal text", "2025-01",
      [{ date: "2024-12", text: "prev year month" }],
      nowJan,
    )).toBe(2);
  });

  it("should return 8 when all 7 history entries are consecutive with the current month", () => {
    const history = [M02, M01, M12, "2024-11", "2024-10", "2024-09", "2024-08"].map(date => ({ date, text: "goal" }));
    expect(calcMonthGoalStreak("goal text", M03, history, now)).toBe(8);
  });
});

describe("calcQuarterGoalStreak", () => {
  // Stable anchor: Mar 10 2025 → "2025-Q1"
  // Going back 1 quarter each time: "2024-Q4", "2024-Q3", "2024-Q2", "2024-Q1", "2023-Q4", "2023-Q3", "2023-Q2"
  const now = new Date(2025, 2, 10);
  const Q1_25 = "2025-Q1";
  const Q4_24 = "2024-Q4";
  const Q3_24 = "2024-Q3";
  const Q2_24 = "2024-Q2";
  const Q1_24 = "2024-Q1";

  it("should return 0 when quarterGoal is undefined", () => {
    expect(calcQuarterGoalStreak(undefined, Q1_25, [], now)).toBe(0);
  });

  it("should return 0 when quarterGoal is empty string", () => {
    expect(calcQuarterGoalStreak("", Q1_25, [], now)).toBe(0);
  });

  it("should return 0 when quarterGoalDate is undefined", () => {
    expect(calcQuarterGoalStreak("goal text", undefined, [], now)).toBe(0);
  });

  it("should return 0 when quarterGoalDate is stale (different quarter)", () => {
    expect(calcQuarterGoalStreak("goal text", Q4_24, [], now)).toBe(0);
  });

  it("should return 1 when current quarter has goal and history is empty", () => {
    expect(calcQuarterGoalStreak("goal text", Q1_25, [], now)).toBe(1);
  });

  it("should return 1 when history only has a non-adjacent quarter (gap after current)", () => {
    // Q3_24 exists but Q4_24 (previous quarter) is absent — streak breaks immediately
    expect(calcQuarterGoalStreak("goal text", Q1_25, [{ date: Q3_24, text: "old" }], now)).toBe(1);
  });

  it("should return 2 when current and immediately previous quarter both have goals", () => {
    expect(calcQuarterGoalStreak("goal text", Q1_25, [{ date: Q4_24, text: "prev" }], now)).toBe(2);
  });

  it("should return 3 when three consecutive quarters have goals", () => {
    expect(calcQuarterGoalStreak(
      "goal text", Q1_25,
      [{ date: Q4_24, text: "p1" }, { date: Q3_24, text: "p2" }],
      now,
    )).toBe(3);
  });

  it("should stop counting at the first gap in consecutive quarter history", () => {
    // Q4_24 present, Q3_24 absent, Q2_24 present — streak stops at gap after Q4_24
    expect(calcQuarterGoalStreak(
      "goal text", Q1_25,
      [{ date: Q4_24, text: "goal" }, { date: Q2_24, text: "goal" }],
      now,
    )).toBe(2);
  });

  it("should count history entries regardless of their done status", () => {
    expect(calcQuarterGoalStreak(
      "goal text", Q1_25,
      [{ date: Q4_24, text: "done", done: true }, { date: Q3_24, text: "another" }],
      now,
    )).toBe(3);
  });

  it("should handle within-year transition (Q2 with Q1 in history)", () => {
    const nowQ2 = new Date(2025, 3, 1); // Apr 1 2025 → "2025-Q2"
    expect(calcQuarterGoalStreak(
      "goal text", "2025-Q2",
      [{ date: "2025-Q1", text: "prev quarter" }],
      nowQ2,
    )).toBe(2);
  });

  it("should return 8 when all 7 history entries are consecutive with the current quarter", () => {
    const history = [Q4_24, Q3_24, Q2_24, Q1_24, "2023-Q4", "2023-Q3", "2023-Q2"].map(date => ({ date, text: "goal" }));
    expect(calcQuarterGoalStreak("goal text", Q1_25, history, now)).toBe(8);
  });
});

describe("calcYearGoalStreak", () => {
  // Stable anchor: Mar 10 2025 → "2025"
  const now = new Date(2025, 2, 10);
  const Y25 = "2025";
  const Y24 = "2024";
  const Y23 = "2023";
  const Y22 = "2022";
  const Y21 = "2021";

  it("should return 0 when yearGoal is undefined", () => {
    expect(calcYearGoalStreak(undefined, Y25, [], now)).toBe(0);
  });

  it("should return 0 when yearGoal is empty string", () => {
    expect(calcYearGoalStreak("", Y25, [], now)).toBe(0);
  });

  it("should return 0 when yearGoalDate is undefined", () => {
    expect(calcYearGoalStreak("goal text", undefined, [], now)).toBe(0);
  });

  it("should return 0 when yearGoalDate is stale (different year)", () => {
    expect(calcYearGoalStreak("goal text", Y24, [], now)).toBe(0);
  });

  it("should return 1 when current year has goal and history is empty", () => {
    expect(calcYearGoalStreak("goal text", Y25, [], now)).toBe(1);
  });

  it("should return 1 when history only has a non-adjacent year (gap after current)", () => {
    // Y23 exists but Y24 (previous year) is absent — streak breaks immediately
    expect(calcYearGoalStreak("goal text", Y25, [{ date: Y23, text: "old" }], now)).toBe(1);
  });

  it("should return 2 when current and immediately previous year both have goals", () => {
    expect(calcYearGoalStreak("goal text", Y25, [{ date: Y24, text: "prev" }], now)).toBe(2);
  });

  it("should return 3 when three consecutive years have goals", () => {
    expect(calcYearGoalStreak(
      "goal text", Y25,
      [{ date: Y24, text: "p1" }, { date: Y23, text: "p2" }],
      now,
    )).toBe(3);
  });

  it("should stop counting at the first gap in consecutive year history", () => {
    // Y24 present, Y23 absent, Y22 present — streak stops at gap after Y24
    expect(calcYearGoalStreak(
      "goal text", Y25,
      [{ date: Y24, text: "goal" }, { date: Y22, text: "goal" }],
      now,
    )).toBe(2);
  });

  it("should count history entries regardless of their done status", () => {
    expect(calcYearGoalStreak(
      "goal text", Y25,
      [{ date: Y24, text: "done", done: true }, { date: Y23, text: "another" }],
      now,
    )).toBe(3);
  });

  it("should return 6 when all 5 history entries are consecutive with the current year (max cap)", () => {
    // yearGoalHistory is capped at 5 entries (goalExpiry slice(-5)), so maximum reachable streak is 6
    const history = [Y24, Y23, Y22, Y21, "2020"].map(date => ({ date, text: "goal" }));
    expect(calcYearGoalStreak("goal text", Y25, history, now)).toBe(6);
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

// ── calcLastNWeeks ──────────────────────────────────────────────────────────
// 2025-03-15 (Saturday) is in ISO W11 (Mon Mar 10 – Sun Mar 16).
// Going back i*7 days from base gives week strings oldest→newest at indices 0…n-1.

describe("calcLastNWeeks", () => {
  const TODAY = "2025-03-15"; // W11

  it("should return a single-element array containing the current week for n=1", () => {
    expect(calcLastNWeeks(TODAY, 1)).toEqual(["2025-W11"]);
  });

  it("should return 7 ISO week strings oldest→newest for n=7", () => {
    // Mar 15 (W11) − 6w = Feb 1 (W05); sequence W05…W11
    expect(calcLastNWeeks(TODAY, 7)).toEqual([
      "2025-W05",
      "2025-W06",
      "2025-W07",
      "2025-W08",
      "2025-W09",
      "2025-W10",
      "2025-W11",
    ]);
  });

  it("should have length equal to n", () => {
    expect(calcLastNWeeks(TODAY, 3)).toHaveLength(3);
    expect(calcLastNWeeks(TODAY, 7)).toHaveLength(7);
  });

  it("should return an empty array when n is 0", () => {
    expect(calcLastNWeeks(TODAY, 0)).toEqual([]);
  });

  it("should handle year-boundary correctly — Jan 1 2025 (W01) going back 2 weeks yields W51 of prior year", () => {
    // 2025-01-01 (Wednesday) is in 2025-W01.
    // Going back 1 week: 2024-12-25 (Wednesday) → 2024-W52.
    // Going back 2 weeks: 2024-12-18 (Wednesday) → 2024-W51.
    expect(calcLastNWeeks("2025-01-01", 3)).toEqual(["2024-W51", "2024-W52", "2025-W01"]);
  });

  it("should handle a date near end of year — Dec 29 2025 (in 2026-W01) going back 2 weeks", () => {
    // Dec 29 2025 (Monday) — ISO week year is 2026 because the week containing Jan 1 2026 (Thursday)
    // starts Dec 29. So isoWeekStr("2025-12-29") = "2026-W01".
    // 1 week back: Dec 22 2025 → 2025-W52.
    // 2 weeks back: Dec 15 2025 → 2025-W51.
    expect(calcLastNWeeks("2025-12-29", 3)).toEqual(["2025-W51", "2025-W52", "2026-W01"]);
  });
});

// ── calcWeekGoalHeatmap ─────────────────────────────────────────────────────
// Uses W05…W11 window (same as calcLastNWeeks n=7 test above).

describe("calcWeekGoalHeatmap", () => {
  const LAST7 = ["2025-W05", "2025-W06", "2025-W07", "2025-W08", "2025-W09", "2025-W10", "2025-W11"];
  const CURRENT = "2025-W11";

  it("should return all set=false, done=false when no goal and empty history", () => {
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, undefined, undefined, []);
    expect(result.setCount).toBe(0);
    expect(result.doneCount).toBe(0);
    expect(result.weeks).toHaveLength(7);
    result.weeks.forEach(w => {
      expect(w.set).toBe(false);
      expect(w.done).toBe(false);
    });
  });

  it("should mark current week as set=true, done=false when goal is set but not done", () => {
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, "이번 주 목표", undefined, []);
    const current = result.weeks.find(w => w.week === CURRENT)!;
    expect(current.set).toBe(true);
    expect(current.done).toBe(false);
    expect(result.setCount).toBe(1);
    expect(result.doneCount).toBe(0);
  });

  it("should mark current week as done=true when weekGoalDone is true", () => {
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, "이번 주 목표", true, []);
    const current = result.weeks.find(w => w.week === CURRENT)!;
    expect(current.set).toBe(true);
    expect(current.done).toBe(true);
    expect(result.setCount).toBe(1);
    expect(result.doneCount).toBe(1);
  });

  it("should mark current week as not set when weekGoal is empty string", () => {
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, "", undefined, []);
    const current = result.weeks.find(w => w.week === CURRENT)!;
    expect(current.set).toBe(false);
    expect(current.done).toBe(false);
  });

  it("should reflect history entries for past weeks — set but not done", () => {
    const history: GoalEntry[] = [{ date: "2025-W10", text: "지난 주 목표" }];
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, undefined, undefined, history);
    const w10 = result.weeks.find(w => w.week === "2025-W10")!;
    expect(w10.set).toBe(true);
    expect(w10.done).toBe(false);
    expect(result.setCount).toBe(1);
    expect(result.doneCount).toBe(0);
  });

  it("should reflect history entries for past weeks — set and done", () => {
    const history: GoalEntry[] = [{ date: "2025-W09", text: "2주 전 목표", done: true }];
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, undefined, undefined, history);
    const w09 = result.weeks.find(w => w.week === "2025-W09")!;
    expect(w09.set).toBe(true);
    expect(w09.done).toBe(true);
    expect(result.setCount).toBe(1);
    expect(result.doneCount).toBe(1);
  });

  it("should correctly compute setCount and doneCount for mixed history", () => {
    const history: GoalEntry[] = [
      { date: "2025-W08", text: "3주 전", done: true },
      { date: "2025-W09", text: "2주 전" },           // set, not done
      { date: "2025-W10", text: "지난 주", done: true },
    ];
    // currentWeek: set + done (weekGoal + weekGoalDone=true)
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, "이번 주", true, history);
    expect(result.setCount).toBe(4);
    expect(result.doneCount).toBe(3); // W08, W10, W11
  });

  it("should return weeks array in the same order as last7Weeks input", () => {
    const history: GoalEntry[] = [{ date: "2025-W07", text: "A" }];
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, "B", undefined, history);
    expect(result.weeks.map(w => w.week)).toEqual(LAST7);
  });

  it("should ignore history entries outside the last7Weeks window", () => {
    // W01 is before our 7-week window (W05…W11)
    const history: GoalEntry[] = [{ date: "2025-W01", text: "너무 오래됨", done: true }];
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, undefined, undefined, history);
    expect(result.setCount).toBe(0);
    expect(result.doneCount).toBe(0);
  });

  it("should treat empty-string weekGoal the same as undefined — set=false, done=false", () => {
    // weekGoal="" is never persisted (callers normalise "" to undefined), but the function must
    // handle it defensively: set=false implies done=false regardless of weekGoalDone.
    const result = calcWeekGoalHeatmap(LAST7, CURRENT, "", true, []);
    const current = result.weeks.find(w => w.week === CURRENT)!;
    expect(current.set).toBe(false);
    expect(current.done).toBe(false); // done must not be true when set=false
    expect(result.doneCount).toBe(0);
  });

  it("should silently drop the current week when currentWeek is not in last7Weeks", () => {
    // If last7Weeks and currentWeek disagree (e.g. caller passes wrong window), the
    // current week branch is never reached; all entries come from history only.
    const differentCurrent = "2025-W20"; // outside LAST7 (W05…W11)
    const result = calcWeekGoalHeatmap(LAST7, differentCurrent, "goal set", true, []);
    // Current week goal is not reflected because LAST7 doesn't contain W20
    expect(result.setCount).toBe(0);
    expect(result.doneCount).toBe(0);
  });
});

describe("calcLastNMonths", () => {
  const TODAY = "2026-03-15";

  it("should return exactly N months", () => {
    expect(calcLastNMonths(TODAY, 6)).toHaveLength(6);
    expect(calcLastNMonths(TODAY, 1)).toHaveLength(1);
    expect(calcLastNMonths(TODAY, 3)).toHaveLength(3);
  });

  it("should have the current month ('YYYY-MM') as the last element", () => {
    const months = calcLastNMonths(TODAY, 6);
    expect(months[5]).toBe("2026-03");
  });

  it("should have (N-1) months ago as the first element", () => {
    // n=6 → first element is 5 months before March 2026 = October 2025
    expect(calcLastNMonths(TODAY, 6)[0]).toBe("2025-10");
  });

  it("should order months ascending (oldest first)", () => {
    const months = calcLastNMonths(TODAY, 6);
    for (let i = 1; i < months.length; i++) {
      expect(months[i] > months[i - 1]).toBe(true);
    }
  });

  it("should handle year boundary correctly (Jan rolls back to Dec of prior year)", () => {
    // n=3 anchored at 2026-01-15: Jan 2026, Dec 2025, Nov 2025 → oldest first
    const months = calcLastNMonths("2026-01-15", 3);
    expect(months).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("should produce YYYY-MM formatted strings", () => {
    const pattern = /^\d{4}-\d{2}$/;
    calcLastNMonths(TODAY, 6).forEach(m => expect(m).toMatch(pattern));
  });

  it("should return only current month when n=1", () => {
    expect(calcLastNMonths(TODAY, 1)).toEqual(["2026-03"]);
  });

  it("should return same-year adjacent months for December anchor", () => {
    // n=2 at 2026-12-01: Nov 2026, Dec 2026 (same-year, no boundary crossing)
    expect(calcLastNMonths("2026-12-01", 2)).toEqual(["2026-11", "2026-12"]);
  });

  it("should return empty array when n=0", () => {
    expect(calcLastNMonths(TODAY, 0)).toEqual([]);
  });
});

describe("calcMonthGoalHeatmap", () => {
  // Fixture: last 6 months ending March 2026
  const LAST6 = calcLastNMonths("2026-03-15", 6); // ["2025-10","2025-11","2025-12","2026-01","2026-02","2026-03"]
  const CURRENT = "2026-03";

  it("should return exactly N month entries matching input array length", () => {
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, undefined, undefined, []);
    expect(result.months).toHaveLength(6);
  });

  it("should mark current month set=true when monthGoal is set", () => {
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, "launch MVP", undefined, []);
    const cur = result.months.find(m => m.month === CURRENT)!;
    expect(cur.set).toBe(true);
    expect(cur.done).toBe(false);
  });

  it("should mark current month done=true when monthGoal is set and monthGoalDone=true", () => {
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, "launch MVP", true, []);
    const cur = result.months.find(m => m.month === CURRENT)!;
    expect(cur.set).toBe(true);
    expect(cur.done).toBe(true);
  });

  it("should mark current month set=false when monthGoal is absent", () => {
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, undefined, undefined, []);
    const cur = result.months.find(m => m.month === CURRENT)!;
    expect(cur.set).toBe(false);
    expect(cur.done).toBe(false);
  });

  it("should mark past month set=true when it exists in history", () => {
    const history: GoalEntry[] = [{ date: "2026-02", text: "Ship feature" }];
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, undefined, undefined, history);
    const feb = result.months.find(m => m.month === "2026-02")!;
    expect(feb.set).toBe(true);
    expect(feb.done).toBe(false);
  });

  it("should mark past month done=true when history entry has done=true", () => {
    const history: GoalEntry[] = [{ date: "2026-02", text: "Ship feature", done: true }];
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, undefined, undefined, history);
    const feb = result.months.find(m => m.month === "2026-02")!;
    expect(feb.set).toBe(true);
    expect(feb.done).toBe(true);
  });

  it("should mark past month set=false when not in history", () => {
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, undefined, undefined, []);
    const oct = result.months.find(m => m.month === "2025-10")!;
    expect(oct.set).toBe(false);
    expect(oct.done).toBe(false);
  });

  it("should count setCount correctly across current and past months", () => {
    const history: GoalEntry[] = [
      { date: "2025-10", text: "goal A" },
      { date: "2026-02", text: "goal B" },
    ];
    // set: Oct(history), Feb(history), Mar(current) = 3; done: 0
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, "march goal", undefined, history);
    expect(result.setCount).toBe(3);
    expect(result.doneCount).toBe(0);
  });

  it("should count doneCount correctly when current and past months are done", () => {
    const history: GoalEntry[] = [
      { date: "2026-01", text: "goal", done: true },
      { date: "2026-02", text: "goal", done: false },
    ];
    // done: Jan(history done), Mar(current done) = 2
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, "march goal", true, history);
    expect(result.doneCount).toBe(2);
    expect(result.setCount).toBe(3); // Jan + Feb + Mar
  });

  it("should return setCount=0 and doneCount=0 when no goals set and history empty", () => {
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, undefined, undefined, []);
    expect(result.setCount).toBe(0);
    expect(result.doneCount).toBe(0);
  });

  it("should not mark current month done when monthGoal is absent even if monthGoalDone=true", () => {
    // done is only meaningful when set is true; guard: set && done
    const result = calcMonthGoalHeatmap(LAST6, CURRENT, undefined, true, []);
    const cur = result.months.find(m => m.month === CURRENT)!;
    expect(cur.set).toBe(false);
    expect(cur.done).toBe(false);
  });
});

// ── calcLastNQuarters ─────────────────────────────────────────────────────────

describe("calcLastNQuarters", () => {
  it("should return [currentQuarter] when n=1", () => {
    // 2026-03-15 is in Q1
    expect(calcLastNQuarters("2026-03-15", 1)).toEqual(["2026-Q1"]);
  });

  it("should return 4 quarters ending at current for n=4, mid-year Q1", () => {
    // 2026-Q1 → back 3 quarters → 2025-Q2, 2025-Q3, 2025-Q4, 2026-Q1
    expect(calcLastNQuarters("2026-03-15", 4)).toEqual(["2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1"]);
  });

  it("should wrap year boundary correctly for Q1 → Q4 of prior year", () => {
    // 2025-Q1 → back 2 → 2024-Q3, 2024-Q4, 2025-Q1
    expect(calcLastNQuarters("2025-01-15", 3)).toEqual(["2024-Q3", "2024-Q4", "2025-Q1"]);
  });

  it("should return 4 quarters correctly for Q4", () => {
    // 2025-12-15 is Q4; last 4: 2025-Q1, 2025-Q2, 2025-Q3, 2025-Q4
    expect(calcLastNQuarters("2025-12-15", 4)).toEqual(["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"]);
  });

  it("should return empty array when n=0", () => {
    expect(calcLastNQuarters("2026-03-15", 0)).toEqual([]);
  });
});

// ── calcQuarterGoalHeatmap ───────────────────────────────────────────────────

describe("calcQuarterGoalHeatmap", () => {
  // Anchored to 2026-03-15 → current quarter = "2026-Q1"
  const CURRENT_Q = "2026-Q1";
  const LAST4 = ["2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1"];

  it("should return 4 quarter entries for a 4-element input", () => {
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, undefined, undefined, []);
    expect(result.quarters).toHaveLength(4);
  });

  it("should mark current quarter set=true when quarterGoal is set", () => {
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, "ship v1", undefined, []);
    const cur = result.quarters.find(q => q.quarter === CURRENT_Q)!;
    expect(cur.set).toBe(true);
    expect(cur.done).toBe(false);
  });

  it("should mark current quarter done=true when quarterGoal is set and quarterGoalDone=true", () => {
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, "ship v1", true, []);
    const cur = result.quarters.find(q => q.quarter === CURRENT_Q)!;
    expect(cur.set).toBe(true);
    expect(cur.done).toBe(true);
  });

  it("should mark current quarter set=false when quarterGoal is absent", () => {
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, undefined, undefined, []);
    const cur = result.quarters.find(q => q.quarter === CURRENT_Q)!;
    expect(cur.set).toBe(false);
    expect(cur.done).toBe(false);
  });

  it("should mark past quarter set=true when it exists in history", () => {
    const history: GoalEntry[] = [{ date: "2025-Q4", text: "Q4 goal" }];
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, undefined, undefined, history);
    const q4 = result.quarters.find(q => q.quarter === "2025-Q4")!;
    expect(q4.set).toBe(true);
    expect(q4.done).toBe(false);
  });

  it("should mark past quarter done=true when history entry has done=true", () => {
    const history: GoalEntry[] = [{ date: "2025-Q4", text: "Q4 goal", done: true }];
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, undefined, undefined, history);
    const q4 = result.quarters.find(q => q.quarter === "2025-Q4")!;
    expect(q4.set).toBe(true);
    expect(q4.done).toBe(true);
  });

  it("should mark past quarter set=false when not in history", () => {
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, undefined, undefined, []);
    const q2 = result.quarters.find(q => q.quarter === "2025-Q2")!;
    expect(q2.set).toBe(false);
    expect(q2.done).toBe(false);
  });

  it("should count setCount and doneCount correctly across current and past quarters", () => {
    const history: GoalEntry[] = [
      { date: "2025-Q3", text: "goal A", done: true },
      { date: "2025-Q4", text: "goal B" },
    ];
    // set: Q3(history), Q4(history), Q1(current) = 3; done: Q3(history) + Q1(current done) = 2
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, "Q1 goal", true, history);
    expect(result.setCount).toBe(3);
    expect(result.doneCount).toBe(2);
  });

  it("should return setCount=0 and doneCount=0 when no goals set and history empty", () => {
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, undefined, undefined, []);
    expect(result.setCount).toBe(0);
    expect(result.doneCount).toBe(0);
  });

  it("should not mark current quarter done when quarterGoal is absent even if quarterGoalDone=true", () => {
    const result = calcQuarterGoalHeatmap(LAST4, CURRENT_Q, undefined, true, []);
    const cur = result.quarters.find(q => q.quarter === CURRENT_Q)!;
    expect(cur.set).toBe(false);
    expect(cur.done).toBe(false);
  });
});

// ── calcLastNYears ────────────────────────────────────────────────────────────

describe("calcLastNYears", () => {
  it("should return [currentYear] when n=1", () => {
    expect(calcLastNYears("2026-03-15", 1)).toEqual(["2026"]);
  });

  it("should return 4 years ending at current for n=4", () => {
    expect(calcLastNYears("2026-03-15", 4)).toEqual(["2023", "2024", "2025", "2026"]);
  });

  it("should handle year-end date correctly", () => {
    expect(calcLastNYears("2025-12-31", 3)).toEqual(["2023", "2024", "2025"]);
  });

  it("should return empty array when n=0", () => {
    expect(calcLastNYears("2026-03-15", 0)).toEqual([]);
  });
});

// ── calcYearGoalHeatmap ──────────────────────────────────────────────────────

describe("calcYearGoalHeatmap", () => {
  const CURRENT_Y = "2026";
  const LAST4Y = ["2023", "2024", "2025", "2026"];

  it("should return 4 year entries for a 4-element input", () => {
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, undefined, undefined, []);
    expect(result.years).toHaveLength(4);
  });

  it("should mark current year set=true when yearGoal is set", () => {
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, "run a marathon", undefined, []);
    const cur = result.years.find(y => y.year === CURRENT_Y)!;
    expect(cur.set).toBe(true);
    expect(cur.done).toBe(false);
  });

  it("should mark current year done=true when yearGoal is set and yearGoalDone=true", () => {
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, "run a marathon", true, []);
    const cur = result.years.find(y => y.year === CURRENT_Y)!;
    expect(cur.set).toBe(true);
    expect(cur.done).toBe(true);
  });

  it("should mark current year set=false when yearGoal is absent", () => {
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, undefined, undefined, []);
    const cur = result.years.find(y => y.year === CURRENT_Y)!;
    expect(cur.set).toBe(false);
    expect(cur.done).toBe(false);
  });

  it("should mark past year set=true when it exists in history", () => {
    const history: GoalEntry[] = [{ date: "2025", text: "2025 goal" }];
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, undefined, undefined, history);
    const y25 = result.years.find(y => y.year === "2025")!;
    expect(y25.set).toBe(true);
    expect(y25.done).toBe(false);
  });

  it("should mark past year done=true when history entry has done=true", () => {
    const history: GoalEntry[] = [{ date: "2024", text: "2024 goal", done: true }];
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, undefined, undefined, history);
    const y24 = result.years.find(y => y.year === "2024")!;
    expect(y24.set).toBe(true);
    expect(y24.done).toBe(true);
  });

  it("should mark past year set=false when not in history", () => {
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, undefined, undefined, []);
    const y23 = result.years.find(y => y.year === "2023")!;
    expect(y23.set).toBe(false);
    expect(y23.done).toBe(false);
  });

  it("should count setCount and doneCount correctly", () => {
    const history: GoalEntry[] = [
      { date: "2024", text: "goal", done: true },
      { date: "2025", text: "goal" },
    ];
    // set: 2024 + 2025 + 2026(current) = 3; done: 2024 + 2026(done) = 2
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, "2026 goal", true, history);
    expect(result.setCount).toBe(3);
    expect(result.doneCount).toBe(2);
  });

  it("should return setCount=0 and doneCount=0 when no goals set and history empty", () => {
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, undefined, undefined, []);
    expect(result.setCount).toBe(0);
    expect(result.doneCount).toBe(0);
  });

  it("should not mark current year done when yearGoal is absent even if yearGoalDone=true", () => {
    const result = calcYearGoalHeatmap(LAST4Y, CURRENT_Y, undefined, true, []);
    const cur = result.years.find(y => y.year === CURRENT_Y)!;
    expect(cur.set).toBe(false);
    expect(cur.done).toBe(false);
  });
});

const MONTH_GENERIC = "📅 월간 회고: 이번 달을 정리하고 다음 달 목표를 세워보세요!";

describe("calcMonthlyGoalReminder", () => {
  it("should return exact generic nudge when monthGoal is absent", () => {
    expect(calcMonthlyGoalReminder(undefined, undefined)).toBe(MONTH_GENERIC);
  });

  it("should return exact generic nudge when monthGoal is empty string", () => {
    // empty string trims to "" (falsy) → generic branch, not goal branch
    expect(calcMonthlyGoalReminder("", undefined)).toBe(MONTH_GENERIC);
  });

  it("should return exact generic nudge when monthGoal is whitespace only", () => {
    expect(calcMonthlyGoalReminder("   ", undefined)).toBe(MONTH_GENERIC);
  });

  it("should return exact generic nudge when done=true but monthGoal is absent", () => {
    // stale persisted data: done=true but no goal text — generic branch takes precedence
    expect(calcMonthlyGoalReminder(undefined, true)).toBe(MONTH_GENERIC);
  });

  it("should return exact not-done message when goal is set but monthGoalDone is absent", () => {
    expect(calcMonthlyGoalReminder("매일 운동 20회", undefined))
      .toBe("📅 월간 회고: '매일 운동 20회' — 이번 달을 마무리해보세요.");
  });

  it("should return exact not-done message when goal is set and monthGoalDone is false", () => {
    expect(calcMonthlyGoalReminder("블로그 5편", false))
      .toBe("📅 월간 회고: '블로그 5편' — 이번 달을 마무리해보세요.");
  });

  it("should return exact done message when monthGoalDone is true", () => {
    expect(calcMonthlyGoalReminder("신규 기능 출시", true))
      .toBe("✅ 월간 회고: '신규 기능 출시' 달성! 다음 달 목표도 세워보세요.");
  });

  it("should trim whitespace from monthGoal in message", () => {
    expect(calcMonthlyGoalReminder("  PR 완료  ", false))
      .toBe("📅 월간 회고: 'PR 완료' — 이번 달을 마무리해보세요.");
  });
});

const QUARTER_GENERIC = "📋 분기 회고: 이번 분기를 정리하고 다음 분기 목표를 세워보세요!";

describe("calcQuarterlyGoalReminder", () => {
  it("should return exact generic nudge when quarterGoal is absent", () => {
    expect(calcQuarterlyGoalReminder(undefined, undefined)).toBe(QUARTER_GENERIC);
  });

  it("should return exact generic nudge when quarterGoal is empty string", () => {
    // empty string trims to "" (falsy) → generic branch, not goal branch
    expect(calcQuarterlyGoalReminder("", undefined)).toBe(QUARTER_GENERIC);
  });

  it("should return exact generic nudge when quarterGoal is whitespace only", () => {
    expect(calcQuarterlyGoalReminder("   ", undefined)).toBe(QUARTER_GENERIC);
  });

  it("should return exact generic nudge when done=true but quarterGoal is absent", () => {
    // stale persisted data: done=true but no goal text — generic branch takes precedence
    expect(calcQuarterlyGoalReminder(undefined, true)).toBe(QUARTER_GENERIC);
  });

  it("should return exact not-done message when goal is set but quarterGoalDone is absent", () => {
    expect(calcQuarterlyGoalReminder("Q1 매출 목표 달성", undefined))
      .toBe("📋 분기 회고: 'Q1 매출 목표 달성' — 이번 분기를 마무리해보세요.");
  });

  it("should return exact not-done message when goal is set and quarterGoalDone is false", () => {
    expect(calcQuarterlyGoalReminder("신제품 론칭", false))
      .toBe("📋 분기 회고: '신제품 론칭' — 이번 분기를 마무리해보세요.");
  });

  it("should return exact done message when quarterGoalDone is true", () => {
    expect(calcQuarterlyGoalReminder("팀 확장 3명", true))
      .toBe("✅ 분기 회고: '팀 확장 3명' 달성! 다음 분기 목표도 세워보세요.");
  });

  it("should trim whitespace from quarterGoal in message", () => {
    expect(calcQuarterlyGoalReminder("  분기 목표  ", false))
      .toBe("📋 분기 회고: '분기 목표' — 이번 분기를 마무리해보세요.");
  });
});

const YEAR_GENERIC = "🗓️ 연간 회고: 올해를 정리하고 내년 목표를 세워보세요!";

describe("calcYearlyGoalReminder", () => {
  it("should return exact generic nudge when yearGoal is absent", () => {
    expect(calcYearlyGoalReminder(undefined, undefined)).toBe(YEAR_GENERIC);
  });

  it("should return exact generic nudge when yearGoal is empty string", () => {
    // empty string trims to "" (falsy) → generic branch, not goal branch
    expect(calcYearlyGoalReminder("", undefined)).toBe(YEAR_GENERIC);
  });

  it("should return exact generic nudge when yearGoal is whitespace only", () => {
    expect(calcYearlyGoalReminder("   ", undefined)).toBe(YEAR_GENERIC);
  });

  it("should return exact generic nudge when done=true but yearGoal is absent", () => {
    // stale persisted data: done=true but no goal text — generic branch takes precedence
    expect(calcYearlyGoalReminder(undefined, true)).toBe(YEAR_GENERIC);
  });

  it("should return exact not-done message when goal is set but yearGoalDone is absent", () => {
    expect(calcYearlyGoalReminder("연 매출 목표 달성", undefined))
      .toBe("🗓️ 연간 회고: '연 매출 목표 달성' — 올해를 마무리해보세요.");
  });

  it("should return exact not-done message when goal is set and yearGoalDone is false", () => {
    expect(calcYearlyGoalReminder("책 12권 읽기", false))
      .toBe("🗓️ 연간 회고: '책 12권 읽기' — 올해를 마무리해보세요.");
  });

  it("should return exact done message when yearGoalDone is true", () => {
    expect(calcYearlyGoalReminder("사업 확장 3개국", true))
      .toBe("✅ 연간 회고: '사업 확장 3개국' 달성! 내년 목표도 세워보세요.");
  });

  it("should trim whitespace from yearGoal in message", () => {
    expect(calcYearlyGoalReminder("  연간 목표  ", false))
      .toBe("🗓️ 연간 회고: '연간 목표' — 올해를 마무리해보세요.");
  });
});

describe("calcGoalCompletionNotify", () => {
  // ── week ──────────────────────────────────────────────────────────────────

  it("should return week completion message with goal text when goalText is present", () => {
    expect(calcGoalCompletionNotify("week", "운동 3회"))
      .toBe("🎉 이번 주 목표 달성! — 운동 3회");
  });

  it("should return week completion message without suffix when goalText is absent", () => {
    expect(calcGoalCompletionNotify("week", undefined))
      .toBe("🎉 이번 주 목표 달성!");
  });

  it("should return week completion message without suffix when goalText is empty string", () => {
    expect(calcGoalCompletionNotify("week", ""))
      .toBe("🎉 이번 주 목표 달성!");
  });

  it("should return week completion message without suffix when goalText is whitespace only", () => {
    expect(calcGoalCompletionNotify("week", "   "))
      .toBe("🎉 이번 주 목표 달성!");
  });

  it("should trim whitespace from goalText in week message", () => {
    expect(calcGoalCompletionNotify("week", "  운동 3회  "))
      .toBe("🎉 이번 주 목표 달성! — 운동 3회");
  });

  // ── month ─────────────────────────────────────────────────────────────────

  it("should return month completion message with goal text when goalText is present", () => {
    expect(calcGoalCompletionNotify("month", "책 2권 읽기"))
      .toBe("🏆 이번 달 목표 달성! — 책 2권 읽기");
  });

  it("should return month completion message without suffix when goalText is absent", () => {
    expect(calcGoalCompletionNotify("month", undefined))
      .toBe("🏆 이번 달 목표 달성!");
  });

  it("should return month completion message without suffix when goalText is empty string", () => {
    expect(calcGoalCompletionNotify("month", ""))
      .toBe("🏆 이번 달 목표 달성!");
  });

  it("should return month completion message without suffix when goalText is whitespace only", () => {
    expect(calcGoalCompletionNotify("month", "   "))
      .toBe("🏆 이번 달 목표 달성!");
  });

  // ── quarter ───────────────────────────────────────────────────────────────

  it("should return quarter completion message with goal text when goalText is present", () => {
    expect(calcGoalCompletionNotify("quarter", "매출 20% 성장"))
      .toBe("🌟 이번 분기 목표 달성! — 매출 20% 성장");
  });

  it("should return quarter completion message without suffix when goalText is absent", () => {
    expect(calcGoalCompletionNotify("quarter", undefined))
      .toBe("🌟 이번 분기 목표 달성!");
  });

  it("should return quarter completion message without suffix when goalText is empty string", () => {
    expect(calcGoalCompletionNotify("quarter", ""))
      .toBe("🌟 이번 분기 목표 달성!");
  });

  it("should return quarter completion message without suffix when goalText is whitespace only", () => {
    expect(calcGoalCompletionNotify("quarter", "   "))
      .toBe("🌟 이번 분기 목표 달성!");
  });

  // ── year ──────────────────────────────────────────────────────────────────

  it("should return year completion message with goal text when goalText is present", () => {
    expect(calcGoalCompletionNotify("year", "사업 3개국 진출"))
      .toBe("💎 올해 목표 달성! — 사업 3개국 진출");
  });

  it("should return year completion message without suffix when goalText is absent", () => {
    expect(calcGoalCompletionNotify("year", undefined))
      .toBe("💎 올해 목표 달성!");
  });

  it("should return year completion message without suffix when goalText is empty string", () => {
    expect(calcGoalCompletionNotify("year", ""))
      .toBe("💎 올해 목표 달성!");
  });

  it("should return year completion message without suffix when goalText is whitespace only", () => {
    expect(calcGoalCompletionNotify("year", "   "))
      .toBe("💎 올해 목표 달성!");
  });
});

describe("calcWeeklyGoalMorningReminder", () => {
  const CURRENT_WEEK = "2026-W12";
  const OTHER_WEEK = "2026-W11";
  const MSG = "📋 이번 주 목표를 세워보세요!";

  it("should return null when weekGoalDate matches currentWeekStr (goal already recorded for this week)", () => {
    expect(calcWeeklyGoalMorningReminder(CURRENT_WEEK, CURRENT_WEEK)).toBeNull();
  });

  it("should return null when weekGoalDate matches currentWeekStr even when weekGoalDate is present without a goal text", () => {
    // weekGoalDate === currentWeekStr is the sole guard — goal text is not consulted
    expect(calcWeeklyGoalMorningReminder(CURRENT_WEEK, CURRENT_WEEK)).toBeNull();
  });

  it("should return nudge message when weekGoalDate is undefined (goal never set)", () => {
    expect(calcWeeklyGoalMorningReminder(undefined, CURRENT_WEEK)).toBe(MSG);
  });

  it("should return nudge message when weekGoalDate is a prior week (stale — new week started)", () => {
    expect(calcWeeklyGoalMorningReminder(OTHER_WEEK, CURRENT_WEEK)).toBe(MSG);
  });

  it("should return nudge message when weekGoalDate is a future week string (forward-clock drift guard)", () => {
    expect(calcWeeklyGoalMorningReminder("2026-W99", CURRENT_WEEK)).toBe(MSG);
  });

  it("should return nudge message when weekGoalDate is an empty string (corrupt/absent date)", () => {
    expect(calcWeeklyGoalMorningReminder("", CURRENT_WEEK)).toBe(MSG);
  });
});

describe("calcWeeklyGoalReport", () => {
  const LAST_WEEK = "2026-W11";
  const OTHER_WEEK = "2026-W10";
  const GOAL_TEXT = "운동 5회";

  it("should return null when history is empty (no goal ever set)", () => {
    expect(calcWeeklyGoalReport(LAST_WEEK, [])).toBeNull();
  });

  it("should return null when lastWeekStr is not in history (no goal set that week)", () => {
    const history: GoalEntry[] = [{ date: OTHER_WEEK, text: GOAL_TEXT, done: true }];
    expect(calcWeeklyGoalReport(LAST_WEEK, history)).toBeNull();
  });

  it("should return achievement message with text when done === true and text is present", () => {
    const history: GoalEntry[] = [{ date: LAST_WEEK, text: GOAL_TEXT, done: true }];
    expect(calcWeeklyGoalReport(LAST_WEEK, history)).toBe(`✅ 지난주 목표 달성! — ${GOAL_TEXT}`);
  });

  it("should return achievement message without suffix when done === true and text is empty", () => {
    const history: GoalEntry[] = [{ date: LAST_WEEK, text: "", done: true }];
    expect(calcWeeklyGoalReport(LAST_WEEK, history)).toBe("✅ 지난주 목표 달성!");
  });

  it("should return achievement message without suffix when done === true and text is whitespace only", () => {
    const history: GoalEntry[] = [{ date: LAST_WEEK, text: "   ", done: true }];
    expect(calcWeeklyGoalReport(LAST_WEEK, history)).toBe("✅ 지난주 목표 달성!");
  });

  it("should return miss message with text when done is absent (goal set but not marked done)", () => {
    const history: GoalEntry[] = [{ date: LAST_WEEK, text: GOAL_TEXT }];
    expect(calcWeeklyGoalReport(LAST_WEEK, history)).toBe(`📋 지난주 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should return miss message with text when done === false", () => {
    const history: GoalEntry[] = [{ date: LAST_WEEK, text: GOAL_TEXT, done: false }];
    expect(calcWeeklyGoalReport(LAST_WEEK, history)).toBe(`📋 지난주 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should return miss message without suffix when done is absent and text is empty", () => {
    const history: GoalEntry[] = [{ date: LAST_WEEK, text: "" }];
    expect(calcWeeklyGoalReport(LAST_WEEK, history)).toBe("📋 지난주 목표 미달성");
  });

  it("should return miss message without suffix when done is absent and text is whitespace only", () => {
    const history: GoalEntry[] = [{ date: LAST_WEEK, text: "   " }];
    expect(calcWeeklyGoalReport(LAST_WEEK, history)).toBe("📋 지난주 목표 미달성");
  });

  it("should match only the exact lastWeekStr entry when history has multiple weeks", () => {
    const history: GoalEntry[] = [
      { date: OTHER_WEEK, text: "다른 주 목표", done: true },
      { date: LAST_WEEK, text: GOAL_TEXT, done: false },
    ];
    expect(calcWeeklyGoalReport(LAST_WEEK, history)).toBe(`📋 지난주 목표 미달성 — ${GOAL_TEXT}`);
  });
});

describe("calcMonthlyGoalReport", () => {
  const LAST_MONTH = "2026-02";
  const OTHER_MONTH = "2026-01";
  const GOAL_TEXT = "매일 운동 20회";

  it("should return null when history is empty (no goal ever set)", () => {
    expect(calcMonthlyGoalReport(LAST_MONTH, [])).toBeNull();
  });

  it("should return null when lastMonthStr is not in history (no goal set that month)", () => {
    const history: GoalEntry[] = [{ date: OTHER_MONTH, text: GOAL_TEXT, done: true }];
    expect(calcMonthlyGoalReport(LAST_MONTH, history)).toBeNull();
  });

  it("should return achievement message with text when done === true and text is present", () => {
    const history: GoalEntry[] = [{ date: LAST_MONTH, text: GOAL_TEXT, done: true }];
    expect(calcMonthlyGoalReport(LAST_MONTH, history)).toBe(`✅ 지난달 목표 달성! — ${GOAL_TEXT}`);
  });

  it("should return achievement message without suffix when done === true and text is empty", () => {
    const history: GoalEntry[] = [{ date: LAST_MONTH, text: "", done: true }];
    expect(calcMonthlyGoalReport(LAST_MONTH, history)).toBe("✅ 지난달 목표 달성!");
  });

  it("should return achievement message without suffix when done === true and text is whitespace only", () => {
    const history: GoalEntry[] = [{ date: LAST_MONTH, text: "   ", done: true }];
    expect(calcMonthlyGoalReport(LAST_MONTH, history)).toBe("✅ 지난달 목표 달성!");
  });

  it("should return miss message with text when done is absent (goal set but not marked done)", () => {
    const history: GoalEntry[] = [{ date: LAST_MONTH, text: GOAL_TEXT }];
    expect(calcMonthlyGoalReport(LAST_MONTH, history)).toBe(`📅 지난달 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should return miss message with text when done === false", () => {
    const history: GoalEntry[] = [{ date: LAST_MONTH, text: GOAL_TEXT, done: false }];
    expect(calcMonthlyGoalReport(LAST_MONTH, history)).toBe(`📅 지난달 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should return miss message without suffix when done is absent and text is empty", () => {
    const history: GoalEntry[] = [{ date: LAST_MONTH, text: "" }];
    expect(calcMonthlyGoalReport(LAST_MONTH, history)).toBe("📅 지난달 목표 미달성");
  });

  it("should return miss message without suffix when done is absent and text is whitespace only", () => {
    const history: GoalEntry[] = [{ date: LAST_MONTH, text: "   " }];
    expect(calcMonthlyGoalReport(LAST_MONTH, history)).toBe("📅 지난달 목표 미달성");
  });

  it("should match only the exact lastMonthStr entry when history has multiple months", () => {
    const history: GoalEntry[] = [
      { date: OTHER_MONTH, text: "다른 달 목표", done: true },
      { date: LAST_MONTH, text: GOAL_TEXT, done: false },
    ];
    expect(calcMonthlyGoalReport(LAST_MONTH, history)).toBe(`📅 지난달 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should handle year-boundary key: Jan 1st caller derives lastMonthStr='YYYY-12' from yesterday (Dec 31)", () => {
    // Simulates calling on Jan 1 2026: yesterday = Dec 31 2025, lastMonthStr = "2025-12"
    const DECEMBER = "2025-12";
    const history: GoalEntry[] = [{ date: DECEMBER, text: "연말 목표", done: true }];
    expect(calcMonthlyGoalReport(DECEMBER, history)).toBe("✅ 지난달 목표 달성! — 연말 목표");
  });
});

// ── calcQuarterlyGoalReport ──────────────────────────────────────────────────

describe("calcQuarterlyGoalReport", () => {
  const LAST_QUARTER = "2025-Q4";
  const OTHER_QUARTER = "2025-Q3";
  const GOAL_TEXT = "신제품 런칭 완료";

  it("should return null when history is empty (no goal ever set)", () => {
    expect(calcQuarterlyGoalReport(LAST_QUARTER, [])).toBeNull();
  });

  it("should return null when lastQuarterStr is not in history (no goal set that quarter)", () => {
    const history: GoalEntry[] = [{ date: OTHER_QUARTER, text: GOAL_TEXT, done: true }];
    expect(calcQuarterlyGoalReport(LAST_QUARTER, history)).toBeNull();
  });

  it("should return achievement message with text when done === true and text is present", () => {
    const history: GoalEntry[] = [{ date: LAST_QUARTER, text: GOAL_TEXT, done: true }];
    expect(calcQuarterlyGoalReport(LAST_QUARTER, history)).toBe(`✅ 지난 분기 목표 달성! — ${GOAL_TEXT}`);
  });

  it("should return achievement message without suffix when done === true and text is empty", () => {
    const history: GoalEntry[] = [{ date: LAST_QUARTER, text: "", done: true }];
    expect(calcQuarterlyGoalReport(LAST_QUARTER, history)).toBe("✅ 지난 분기 목표 달성!");
  });

  it("should return achievement message without suffix when done === true and text is whitespace only", () => {
    const history: GoalEntry[] = [{ date: LAST_QUARTER, text: "   ", done: true }];
    expect(calcQuarterlyGoalReport(LAST_QUARTER, history)).toBe("✅ 지난 분기 목표 달성!");
  });

  it("should return miss message with text when done is absent (goal set but not marked done)", () => {
    const history: GoalEntry[] = [{ date: LAST_QUARTER, text: GOAL_TEXT }];
    expect(calcQuarterlyGoalReport(LAST_QUARTER, history)).toBe(`📊 지난 분기 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should return miss message with text when done === false", () => {
    const history: GoalEntry[] = [{ date: LAST_QUARTER, text: GOAL_TEXT, done: false }];
    expect(calcQuarterlyGoalReport(LAST_QUARTER, history)).toBe(`📊 지난 분기 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should return miss message without suffix when done is absent and text is empty", () => {
    const history: GoalEntry[] = [{ date: LAST_QUARTER, text: "" }];
    expect(calcQuarterlyGoalReport(LAST_QUARTER, history)).toBe("📊 지난 분기 목표 미달성");
  });

  it("should return miss message without suffix when done is absent and text is whitespace only", () => {
    const history: GoalEntry[] = [{ date: LAST_QUARTER, text: "   " }];
    expect(calcQuarterlyGoalReport(LAST_QUARTER, history)).toBe("📊 지난 분기 목표 미달성");
  });

  it("should match only the exact lastQuarterStr entry when history has multiple quarters", () => {
    const history: GoalEntry[] = [
      { date: OTHER_QUARTER, text: "다른 분기 목표", done: true },
      { date: LAST_QUARTER, text: GOAL_TEXT, done: false },
    ];
    expect(calcQuarterlyGoalReport(LAST_QUARTER, history)).toBe(`📊 지난 분기 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should handle year-boundary: Q1 start (Apr 1) derives lastQuarterStr='YYYY-Q1' from yesterday (Mar 31)", () => {
    // Simulates calling on Apr 1 2026: yesterday = Mar 31 2026, lastQuarterStr = "2026-Q1"
    const Q1_2026 = "2026-Q1";
    const history: GoalEntry[] = [{ date: Q1_2026, text: "Q1 목표", done: true }];
    expect(calcQuarterlyGoalReport(Q1_2026, history)).toBe("✅ 지난 분기 목표 달성! — Q1 목표");
  });
});

// ── calcYearlyGoalReport ─────────────────────────────────────────────────────

describe("calcYearlyGoalReport", () => {
  const LAST_YEAR = "2025";
  const OTHER_YEAR = "2024";
  const GOAL_TEXT = "독립 창업";

  it("should return null when history is empty (no goal ever set)", () => {
    expect(calcYearlyGoalReport(LAST_YEAR, [])).toBeNull();
  });

  it("should return null when lastYearStr is not in history (no goal set that year)", () => {
    const history: GoalEntry[] = [{ date: OTHER_YEAR, text: GOAL_TEXT, done: true }];
    expect(calcYearlyGoalReport(LAST_YEAR, history)).toBeNull();
  });

  it("should return achievement message with text when done === true and text is present", () => {
    const history: GoalEntry[] = [{ date: LAST_YEAR, text: GOAL_TEXT, done: true }];
    expect(calcYearlyGoalReport(LAST_YEAR, history)).toBe(`🎊 지난해 목표 달성! — ${GOAL_TEXT}`);
  });

  it("should return achievement message without suffix when done === true and text is empty", () => {
    const history: GoalEntry[] = [{ date: LAST_YEAR, text: "", done: true }];
    expect(calcYearlyGoalReport(LAST_YEAR, history)).toBe("🎊 지난해 목표 달성!");
  });

  it("should return achievement message without suffix when done === true and text is whitespace only", () => {
    const history: GoalEntry[] = [{ date: LAST_YEAR, text: "   ", done: true }];
    expect(calcYearlyGoalReport(LAST_YEAR, history)).toBe("🎊 지난해 목표 달성!");
  });

  it("should return miss message with text when done is absent (goal set but not marked done)", () => {
    const history: GoalEntry[] = [{ date: LAST_YEAR, text: GOAL_TEXT }];
    expect(calcYearlyGoalReport(LAST_YEAR, history)).toBe(`📋 지난해 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should return miss message with text when done === false", () => {
    const history: GoalEntry[] = [{ date: LAST_YEAR, text: GOAL_TEXT, done: false }];
    expect(calcYearlyGoalReport(LAST_YEAR, history)).toBe(`📋 지난해 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should return miss message without suffix when done is absent and text is empty", () => {
    const history: GoalEntry[] = [{ date: LAST_YEAR, text: "" }];
    expect(calcYearlyGoalReport(LAST_YEAR, history)).toBe("📋 지난해 목표 미달성");
  });

  it("should return miss message without suffix when done is absent and text is whitespace only", () => {
    const history: GoalEntry[] = [{ date: LAST_YEAR, text: "   " }];
    expect(calcYearlyGoalReport(LAST_YEAR, history)).toBe("📋 지난해 목표 미달성");
  });

  it("should match only the exact lastYearStr entry when history has multiple years", () => {
    const history: GoalEntry[] = [
      { date: OTHER_YEAR, text: "다른 해 목표", done: true },
      { date: LAST_YEAR, text: GOAL_TEXT, done: false },
    ];
    expect(calcYearlyGoalReport(LAST_YEAR, history)).toBe(`📋 지난해 목표 미달성 — ${GOAL_TEXT}`);
  });

  it("should handle the year key as plain '2025' string (not 'YYYY-YY')", () => {
    // yearGoalHistory stores entries with date === "YYYY" (4-digit string only)
    const history: GoalEntry[] = [{ date: "2025", text: "연간 목표", done: true }];
    expect(calcYearlyGoalReport("2025", history)).toBe("🎊 지난해 목표 달성! — 연간 목표");
  });

  it("should handle year-boundary key: Jan 1st caller derives lastYearStr='2025' from yesterday (Dec 31 2025)", () => {
    // Simulates calling on Jan 1 2026: yesterday = Dec 31 2025, lastYearStr = "2025"
    const YEAR_2025 = "2025";
    const history: GoalEntry[] = [{ date: YEAR_2025, text: "독립 창업", done: true }];
    expect(calcYearlyGoalReport(YEAR_2025, history)).toBe("🎊 지난해 목표 달성! — 독립 창업");
  });
});
