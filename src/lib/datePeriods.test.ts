// ABOUTME: Unit tests for datePeriods helpers — period total-day counts and elapsed fraction
// ABOUTME: Covers leap-year edge cases for month/quarter/year and fraction boundary values

import { describe, it, expect } from "vitest";
import { totalDaysInMonth, totalDaysInQuarter, totalDaysInYear, periodElapsedFraction } from "./datePeriods";

describe("totalDaysInMonth", () => {
  it("should return 31 for January", () => {
    expect(totalDaysInMonth(new Date(2026, 0, 15))).toBe(31);
  });

  it("should return 28 for February in a non-leap year", () => {
    expect(totalDaysInMonth(new Date(2026, 1, 1))).toBe(28);
  });

  it("should return 29 for February in a leap year", () => {
    expect(totalDaysInMonth(new Date(2024, 1, 1))).toBe(29);
  });

  it("should return 30 for April", () => {
    expect(totalDaysInMonth(new Date(2026, 3, 1))).toBe(30);
  });

  it("should return 31 for December", () => {
    expect(totalDaysInMonth(new Date(2026, 11, 31))).toBe(31);
  });
});

describe("totalDaysInQuarter", () => {
  it("should return 90 for Q1 of a non-leap year", () => {
    // Q1 2026: Jan(31) + Feb(28) + Mar(31) = 90
    expect(totalDaysInQuarter(new Date(2026, 0, 1))).toBe(90);
  });

  it("should return 91 for Q1 of a leap year", () => {
    // Q1 2024: Jan(31) + Feb(29) + Mar(31) = 91
    expect(totalDaysInQuarter(new Date(2024, 0, 1))).toBe(91);
  });

  it("should return 91 for Q2", () => {
    // Q2: Apr(30) + May(31) + Jun(30) = 91
    expect(totalDaysInQuarter(new Date(2026, 3, 1))).toBe(91);
  });

  it("should return 92 for Q3", () => {
    // Q3: Jul(31) + Aug(31) + Sep(30) = 92
    expect(totalDaysInQuarter(new Date(2026, 6, 1))).toBe(92);
  });

  it("should return 92 for Q4", () => {
    // Q4: Oct(31) + Nov(30) + Dec(31) = 92
    expect(totalDaysInQuarter(new Date(2026, 9, 1))).toBe(92);
  });
});

describe("totalDaysInYear", () => {
  it("should return 365 for a non-leap year", () => {
    expect(totalDaysInYear(new Date(2026, 0, 1))).toBe(365);
  });

  it("should return 366 for a leap year", () => {
    expect(totalDaysInYear(new Date(2024, 0, 1))).toBe(366);
  });

  it("should return 365 for a century non-leap year (2100)", () => {
    // 2100 is divisible by 100 but not 400 → not a leap year
    expect(totalDaysInYear(new Date(2100, 0, 1))).toBe(365);
  });

  it("should return 366 for a 400-year leap year (2000)", () => {
    // 2000 is divisible by 400 → leap year
    expect(totalDaysInYear(new Date(2000, 0, 1))).toBe(366);
  });
});

describe("periodElapsedFraction", () => {
  it("should return 0 when on the first day (daysLeft equals totalDays)", () => {
    expect(periodElapsedFraction(7, 7)).toBe(0);
  });

  it("should return 6/7 on the last day of a 7-day period (daysLeft = 1)", () => {
    expect(periodElapsedFraction(1, 7)).toBeCloseTo(6 / 7);
  });

  it("should return 0.5 at the midpoint", () => {
    expect(periodElapsedFraction(15, 30)).toBeCloseTo(0.5);
  });

  it("should clamp to 0 when daysLeft exceeds totalDays", () => {
    expect(periodElapsedFraction(10, 7)).toBe(0);
  });

  it("should clamp to 1 when daysLeft is 0", () => {
    expect(periodElapsedFraction(0, 7)).toBe(1);
  });

  it("should return 0 when totalDays is 0 (degenerate guard)", () => {
    expect(periodElapsedFraction(0, 0)).toBe(0);
  });
});
