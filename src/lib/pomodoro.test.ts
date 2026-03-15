// ABOUTME: Unit tests for pomodoro pure helpers — calcLast14Days and calcSessionWeekTrend
// ABOUTME: Covers date range derivation, prev-7/cur-7 session partitioning, and trend arrow logic

import { describe, it, expect } from "vitest";
import { calcLast14Days, calcSessionWeekTrend } from "./pomodoro";
import type { PomodoroDay } from "../types";

// Shared fixture: derived from calcLast14Days so partitioning assumptions stay consistent.
// Any change to calcLast14Days semantics (e.g., today at index 12) would immediately fail
// both the calcLast14Days tests AND the calcSessionWeekTrend tests.
const LAST14 = calcLast14Days("2026-03-15");

describe("calcLast14Days", () => {
  const TODAY = "2026-03-15";

  it("should return exactly 14 dates", () => {
    expect(calcLast14Days(TODAY)).toHaveLength(14);
  });

  it("should have today as the last element (index 13)", () => {
    const days = calcLast14Days(TODAY);
    expect(days[13]).toBe(TODAY);
  });

  it("should have 13 days ago as the first element (index 0)", () => {
    const days = calcLast14Days(TODAY);
    expect(days[0]).toBe("2026-03-02");
  });

  it("should order dates ascending (oldest first)", () => {
    const days = calcLast14Days(TODAY);
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
  });

  it("should produce YYYY-MM-DD formatted dates", () => {
    const days = calcLast14Days(TODAY);
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    days.forEach(d => expect(d).toMatch(pattern));
  });

  it("should handle month boundary correctly (March 1 → Feb dates)", () => {
    const days = calcLast14Days("2026-03-05");
    expect(days[0]).toBe("2026-02-20");
    expect(days[13]).toBe("2026-03-05");
  });

  it("should handle year boundary correctly (Jan 5 spans into previous December)", () => {
    const days = calcLast14Days("2026-01-05");
    expect(days[0]).toBe("2025-12-23");
    expect(days[13]).toBe("2026-01-05");
  });

  it("should handle leap year February correctly (Feb 29 exists in 2028)", () => {
    const days = calcLast14Days("2028-03-05");
    // 13 days before 2028-03-05 is 2028-02-21
    expect(days[0]).toBe("2028-02-21");
    expect(days[13]).toBe("2028-03-05");
    // Feb 29 should appear in the range (day 9 = 2028-03-01, day 8 = 2028-02-29)
    expect(days.includes("2028-02-29")).toBe(true);
  });

  it("should produce consecutive days (each date immediately follows the previous in string sort order)", () => {
    // Compare by string sort rather than ms-diff: YYYY-MM-DD lexicographic order equals
    // chronological order, and this comparison is DST-safe (avoids the 23h spring-forward issue).
    const days = calcLast14Days(TODAY);
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
    // Cross-check: the span from first to last is exactly 13 days
    const first = new Date(days[0] + "T00:00:00Z").getTime();
    const last  = new Date(days[13] + "T00:00:00Z").getTime();
    expect(last - first).toBe(13 * 86400000);
  });
});

describe("calcSessionWeekTrend", () => {
  // LAST14 is the module-level fixture (calcLast14Days("2026-03-15"))
  // prev7 = LAST14[0..6] = 2026-03-02..08
  // cur7  = LAST14[7..13] = 2026-03-09..15

  it("should return null when sessionHistory is empty", () => {
    expect(calcSessionWeekTrend([], LAST14)).toBeNull();
  });

  it("should return cur7=0 and prev7=0 when no sessions fall in the 14-day window", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-01", count: 5 }, // far in the past, outside window
    ];
    const result = calcSessionWeekTrend(history, LAST14);
    expect(result).not.toBeNull();
    expect(result!.cur7).toBe(0);
    expect(result!.prev7).toBe(0);
    expect(result!.trend).toBe("");
  });

  it("should sum sessions in cur7 (last14Days[7..13]) correctly", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 2 }, // cur7
      { date: "2026-03-12", count: 3 }, // cur7
      { date: "2026-03-15", count: 1 }, // cur7 (today)
    ];
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.cur7).toBe(6); // 2+3+1
    expect(result.prev7).toBe(0);
  });

  it("should sum sessions in prev7 (last14Days[0..6]) correctly", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-02", count: 1 }, // prev7
      { date: "2026-03-05", count: 4 }, // prev7
    ];
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.prev7).toBe(5); // 1+4
    expect(result.cur7).toBe(0);
  });

  it("should return trend '↑' when cur7 > prev7", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-02", count: 2 }, // prev7 → total 2
      { date: "2026-03-10", count: 5 }, // cur7  → total 5
    ];
    expect(calcSessionWeekTrend(history, LAST14)!.trend).toBe("↑");
  });

  it("should return trend '↓' when cur7 < prev7", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-03", count: 8 }, // prev7 → total 8
      { date: "2026-03-11", count: 1 }, // cur7  → total 1
    ];
    expect(calcSessionWeekTrend(history, LAST14)!.trend).toBe("↓");
  });

  it("should return trend '' when cur7 === prev7", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-04", count: 3 }, // prev7
      { date: "2026-03-13", count: 3 }, // cur7
    ];
    expect(calcSessionWeekTrend(history, LAST14)!.trend).toBe("");
  });

  it("should return trend '' when both cur7 and prev7 are 0", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-01", count: 10 }, // outside window
    ];
    expect(calcSessionWeekTrend(history, LAST14)!.trend).toBe("");
  });

  it("should populate histMap with session counts from history", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-10", count: 4 },
      { date: "2026-03-14", count: 2 },
    ];
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.histMap.get("2026-03-10")).toBe(4);
    expect(result.histMap.get("2026-03-14")).toBe(2);
  });

  it("should return undefined (not 0) from histMap for dates not in sessionHistory", () => {
    const history: PomodoroDay[] = [{ date: "2026-03-10", count: 3 }];
    const result = calcSessionWeekTrend(history, LAST14)!;
    // histMap.get returns undefined for missing keys; callers use ?? 0 for display
    expect(result.histMap.get("2026-03-11")).toBeUndefined();
  });

  it("should handle a single-entry sessionHistory spanning the window", () => {
    const history: PomodoroDay[] = [{ date: "2026-03-15", count: 5 }]; // today
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.cur7).toBe(5);
    expect(result.prev7).toBe(0);
    expect(result.trend).toBe("↑");
  });

  it("should handle history entries outside the 14-day window gracefully (ignored in sums)", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-01", count: 99 }, // way outside window
      { date: "2026-03-10", count: 2 },  // inside cur7
    ];
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.cur7).toBe(2);
    expect(result.prev7).toBe(0);
  });
});
