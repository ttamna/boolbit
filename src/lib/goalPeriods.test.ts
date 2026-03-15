// ABOUTME: Tests for goalPeriods helpers — isoWeekStr, quarterStr, calcWeekGoalStreak, calcMonthGoalStreak, calcQuarterGoalStreak, calcYearGoalStreak, and calcGoalSuccessRate
// ABOUTME: Covers year-boundary edge cases where ISO week year differs from calendar year

import { describe, it, expect } from "vitest";
import { isoWeekStr, quarterStr, calcWeekGoalStreak, calcMonthGoalStreak, calcQuarterGoalStreak, calcYearGoalStreak, calcGoalSuccessRate } from "./goalPeriods";
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
