// ABOUTME: Unit tests for datePeriods helpers — period total-day counts and elapsed fraction
// ABOUTME: Covers leap-year edge cases for month/quarter/year and fraction boundary values

import { describe, it, expect } from "vitest";
import { totalDaysInMonth, totalDaysInQuarter, totalDaysInYear, periodElapsedFraction, daysLeftInWeek, daysLeftInMonth, daysLeftInQuarter, daysLeftInYear, calcLastNDays } from "./datePeriods";

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

// 2026-03-15 is a Sunday; the week anchors: Mon 03-09 through Sun 03-15.
describe("daysLeftInWeek", () => {
  it("should return 1 on Sunday (ISO week ends today)", () => {
    expect(daysLeftInWeek(new Date(2026, 2, 15))).toBe(1); // Sun
  });

  it("should return 7 on Monday (full ISO week ahead)", () => {
    expect(daysLeftInWeek(new Date(2026, 2, 9))).toBe(7); // Mon
  });

  it("should return 6 on Tuesday", () => {
    expect(daysLeftInWeek(new Date(2026, 2, 10))).toBe(6); // Tue
  });

  it("should return 5 on Wednesday", () => {
    expect(daysLeftInWeek(new Date(2026, 2, 11))).toBe(5); // Wed
  });

  it("should return 4 on Thursday", () => {
    expect(daysLeftInWeek(new Date(2026, 2, 12))).toBe(4); // Thu
  });

  it("should return 3 on Friday", () => {
    expect(daysLeftInWeek(new Date(2026, 2, 13))).toBe(3); // Fri
  });

  it("should return 2 on Saturday", () => {
    expect(daysLeftInWeek(new Date(2026, 2, 14))).toBe(2); // Sat
  });
});

describe("daysLeftInMonth", () => {
  it("should return 31 on January 1 (first day of 31-day month)", () => {
    expect(daysLeftInMonth(new Date(2026, 0, 1))).toBe(31);
  });

  it("should return 1 on January 31 (last day of month)", () => {
    expect(daysLeftInMonth(new Date(2026, 0, 31))).toBe(1);
  });

  it("should return 28 on February 1 of a non-leap year", () => {
    expect(daysLeftInMonth(new Date(2026, 1, 1))).toBe(28);
  });

  it("should return 29 on February 1 of a leap year", () => {
    expect(daysLeftInMonth(new Date(2024, 1, 1))).toBe(29);
  });

  it("should return 1 on December 31 (last day of year)", () => {
    expect(daysLeftInMonth(new Date(2026, 11, 31))).toBe(1);
  });
});

describe("daysLeftInQuarter", () => {
  it("should return 90 on January 1 of Q1 non-leap year (Q1=90 days)", () => {
    expect(daysLeftInQuarter(new Date(2026, 0, 1))).toBe(90);
  });

  it("should return 91 on January 1 of Q1 leap year (Q1=91 days)", () => {
    expect(daysLeftInQuarter(new Date(2024, 0, 1))).toBe(91);
  });

  it("should return 1 on March 31 (last day of Q1)", () => {
    expect(daysLeftInQuarter(new Date(2026, 2, 31))).toBe(1);
  });

  it("should return 91 on April 1 (first day of Q2=91 days)", () => {
    expect(daysLeftInQuarter(new Date(2026, 3, 1))).toBe(91);
  });

  it("should return 1 on June 30 (last day of Q2)", () => {
    expect(daysLeftInQuarter(new Date(2026, 5, 30))).toBe(1);
  });

  it("should return 92 on July 1 (first day of Q3=92 days)", () => {
    // Q3: Jul(31) + Aug(31) + Sep(30) = 92
    expect(daysLeftInQuarter(new Date(2026, 6, 1))).toBe(92);
  });

  it("should return 92 on October 1 (first day of Q4=92 days)", () => {
    expect(daysLeftInQuarter(new Date(2026, 9, 1))).toBe(92);
  });

  it("should return 1 on December 31 (last day of Q4 and year)", () => {
    expect(daysLeftInQuarter(new Date(2026, 11, 31))).toBe(1);
  });
});

describe("daysLeftInYear", () => {
  it("should return 365 on January 1 of a non-leap year", () => {
    expect(daysLeftInYear(new Date(2026, 0, 1))).toBe(365);
  });

  it("should return 366 on January 1 of a leap year", () => {
    expect(daysLeftInYear(new Date(2024, 0, 1))).toBe(366);
  });

  it("should return 1 on December 31", () => {
    expect(daysLeftInYear(new Date(2026, 11, 31))).toBe(1);
  });

  it("should return 92 on October 1 (92 days remain: Oct31+Nov30+Dec31)", () => {
    // Oct(31) + Nov(30) + Dec(31) = 92 days including Oct 1
    expect(daysLeftInYear(new Date(2026, 9, 1))).toBe(92);
  });

  it("should return 307 on February 29 of a leap year (leap day is included)", () => {
    // Feb 29 (leap) to Dec 31 inclusive: Mar(31)+Apr(30)+May(31)+Jun(30)+Jul(31)+Aug(31)+Sep(30)+Oct(31)+Nov(30)+Dec(31) + 1(Feb29) = 307
    expect(daysLeftInYear(new Date(2024, 1, 29))).toBe(307);
  });
});

describe("calcLastNDays", () => {
  it("should return exactly n strings", () => {
    expect(calcLastNDays("2026-03-15", 7)).toHaveLength(7);
    expect(calcLastNDays("2026-03-15", 14)).toHaveLength(14);
  });

  it("should return n=1 as [todayStr]", () => {
    expect(calcLastNDays("2026-03-15", 1)).toEqual(["2026-03-15"]);
  });

  it("should return oldest-first with todayStr as the last element", () => {
    const result = calcLastNDays("2026-03-15", 7);
    expect(result[6]).toBe("2026-03-15");
    expect(result[0]).toBe("2026-03-09");
  });

  it("should return consecutive dates with no gaps", () => {
    const result = calcLastNDays("2026-03-15", 7);
    for (let i = 1; i < result.length; i++) {
      // Use setDate to advance by 1 day — DST-safe (avoids 86400000ms timestamp arithmetic)
      const expectedNext = new Date(result[i - 1] + "T00:00:00");
      expectedNext.setDate(expectedNext.getDate() + 1);
      expect(expectedNext.toLocaleDateString("sv")).toBe(result[i]);
    }
  });

  it("should cross a month boundary correctly (Mar 5 → Feb 27 start)", () => {
    // last 7 days ending 2026-03-05: 2026-02-27 through 2026-03-05
    const result = calcLastNDays("2026-03-05", 7);
    expect(result[0]).toBe("2026-02-27");
    expect(result[6]).toBe("2026-03-05");
  });

  it("should cross a year boundary correctly (Jan 3 → Dec 28 start)", () => {
    // last 7 days ending 2026-01-03: 2025-12-28 through 2026-01-03
    const result = calcLastNDays("2026-01-03", 7);
    expect(result[0]).toBe("2025-12-28");
    expect(result[6]).toBe("2026-01-03");
  });

  it("should handle 14-day window matching calcLast14Days contract", () => {
    // last 14 days ending 2026-03-15: 2026-03-02 through 2026-03-15
    const result = calcLastNDays("2026-03-15", 14);
    expect(result[0]).toBe("2026-03-02");
    expect(result[13]).toBe("2026-03-15");
  });

  it("should handle Feb 28 → Feb 29 leap-year boundary in a 3-day window", () => {
    // 2024-03-01 ending: 2024-02-28, 2024-02-29, 2024-03-01
    const result = calcLastNDays("2024-03-01", 3);
    expect(result).toEqual(["2024-02-28", "2024-02-29", "2024-03-01"]);
  });

  it("should return all YYYY-MM-DD formatted strings", () => {
    const result = calcLastNDays("2026-03-15", 7);
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    result.forEach(d => expect(d).toMatch(isoPattern));
  });

  it("should return an empty array when n is 0", () => {
    expect(calcLastNDays("2026-03-15", 0)).toEqual([]);
  });
});
