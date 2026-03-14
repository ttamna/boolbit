// ABOUTME: Tests for goalPeriods helpers — isoWeekStr and quarterStr
// ABOUTME: Covers year-boundary edge cases where ISO week year differs from calendar year

import { describe, it, expect } from "vitest";
import { isoWeekStr, quarterStr } from "./goalPeriods";

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
