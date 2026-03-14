// ABOUTME: Unit tests for calcYearProgress pure helper function
// ABOUTME: Validates dayOfYear, daysRemaining, and pct for non-leap/leap years and edge cases (Jan 1, Dec 31, leap day, 400-year rule)

import { describe, it, expect } from "vitest";
import { calcYearProgress } from "./DragBar";

describe("calcYearProgress — non-leap year (2025)", () => {
  it("should return dayOfYear=1, daysRemaining=364, pct=0 on Jan 1 at midnight", () => {
    const result = calcYearProgress(new Date(2025, 0, 1));
    expect(result.dayOfYear).toBe(1);
    expect(result.daysRemaining).toBe(364);
    expect(result.pct).toBe(0);
  });

  it("should return dayOfYear=2 on Jan 2 at midnight", () => {
    const result = calcYearProgress(new Date(2025, 0, 2));
    expect(result.dayOfYear).toBe(2);
    expect(result.daysRemaining).toBe(363);
  });

  it("should return dayOfYear=183, daysRemaining=182 on Jul 2 (day 183 of 365, first day past halfway)", () => {
    // Jan(31)+Feb(28)+Mar(31)+Apr(30)+May(31)+Jun(30)+Jul(2) = 183rd day
    const result = calcYearProgress(new Date(2025, 6, 2));
    expect(result.dayOfYear).toBe(183);
    expect(result.daysRemaining).toBe(182);
  });

  it("should return dayOfYear=365, daysRemaining=0 on Dec 31 at midnight", () => {
    const result = calcYearProgress(new Date(2025, 11, 31));
    expect(result.dayOfYear).toBe(365);
    expect(result.daysRemaining).toBe(0);
  });

  it("should satisfy the invariant: dayOfYear + daysRemaining = 365", () => {
    const dates = [
      new Date(2025, 0, 1),   // Jan 1
      new Date(2025, 2, 15),  // Mar 15
      new Date(2025, 6, 2),   // Jul 2
      new Date(2025, 11, 31), // Dec 31
    ];
    for (const d of dates) {
      const { dayOfYear, daysRemaining } = calcYearProgress(d);
      expect(dayOfYear + daysRemaining).toBe(365);
    }
  });
});

describe("calcYearProgress — leap year (2024)", () => {
  it("should return dayOfYear=1, daysRemaining=365 on Jan 1 of a leap year", () => {
    const result = calcYearProgress(new Date(2024, 0, 1));
    expect(result.dayOfYear).toBe(1);
    expect(result.daysRemaining).toBe(365);
  });

  it("should return dayOfYear=60, daysRemaining=306 on Feb 29 (leap day)", () => {
    // Jan(31) + Feb 1-28 = 59 days elapsed; Feb 29 is the 60th day
    const result = calcYearProgress(new Date(2024, 1, 29));
    expect(result.dayOfYear).toBe(60);
    expect(result.daysRemaining).toBe(306);
  });

  it("should return dayOfYear=366, daysRemaining=0 on Dec 31 of a leap year", () => {
    const result = calcYearProgress(new Date(2024, 11, 31));
    expect(result.dayOfYear).toBe(366);
    expect(result.daysRemaining).toBe(0);
  });

  it("should satisfy the invariant: dayOfYear + daysRemaining = 366 in a leap year", () => {
    const dates = [
      new Date(2024, 0, 1),   // Jan 1
      new Date(2024, 1, 29),  // Feb 29 (leap day)
      new Date(2024, 6, 2),   // Jul 2
      new Date(2024, 11, 31), // Dec 31
    ];
    for (const d of dates) {
      const { dayOfYear, daysRemaining } = calcYearProgress(d);
      expect(dayOfYear + daysRemaining).toBe(366);
    }
  });
});

describe("calcYearProgress — Gregorian leap-year rules", () => {
  it("should treat 2000 as a leap year (divisible by 400) and return dayOfYear=366 on Dec 31", () => {
    // Gregorian rule: divisible by 400 → always leap regardless of the 100-year exception
    const result = calcYearProgress(new Date(2000, 11, 31));
    expect(result.dayOfYear).toBe(366);
    expect(result.daysRemaining).toBe(0);
  });

  it("should treat 2100 as a non-leap year (divisible by 100 but not 400) and return dayOfYear=365 on Dec 31", () => {
    // 2100 % 4 === 0 but 2100 % 100 === 0 and 2100 % 400 !== 0 → non-leap (100-year exception)
    const result = calcYearProgress(new Date(2100, 11, 31));
    expect(result.dayOfYear).toBe(365);
    expect(result.daysRemaining).toBe(0);
  });

  it("should return dayOfYear=365, daysRemaining=0 at Dec 31 23:59:59 (last second of the year)", () => {
    // pct is very close to 1 but < 1; floor(pct * 365) = 364, +1 = 365 — consistent with midnight
    const result = calcYearProgress(new Date(2025, 11, 31, 23, 59, 59));
    expect(result.dayOfYear).toBe(365);
    expect(result.daysRemaining).toBe(0);
  });
});

describe("calcYearProgress — pct accuracy", () => {
  it("should return pct=0 exactly at Jan 1 midnight", () => {
    expect(calcYearProgress(new Date(2025, 0, 1)).pct).toBe(0);
  });

  it("should return pct strictly between 0 and 1 at mid-year", () => {
    const { pct } = calcYearProgress(new Date(2025, 6, 2));
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(1);
  });

  it("should return pct > 0.99 but < 1 at Dec 31 midnight (nearly complete)", () => {
    const { pct } = calcYearProgress(new Date(2025, 11, 31));
    expect(pct).toBeGreaterThan(0.99);
    expect(pct).toBeLessThan(1);
  });

  it("should increase monotonically: Jan 1 < Jul 2 < Dec 31", () => {
    const jan1  = calcYearProgress(new Date(2025, 0, 1)).pct;
    const jul2  = calcYearProgress(new Date(2025, 6, 2)).pct;
    const dec31 = calcYearProgress(new Date(2025, 11, 31)).pct;
    expect(jan1).toBeLessThan(jul2);
    expect(jul2).toBeLessThan(dec31);
  });

  it("should return pct > 0 at noon on Jan 1 (sub-day millisecond accuracy)", () => {
    // Noon on Jan 1 = 12 * 3600 * 1000 ms into the year; pct must be > 0
    const { pct } = calcYearProgress(new Date(2025, 0, 1, 12, 0, 0));
    expect(pct).toBeGreaterThan(0);
  });
});
