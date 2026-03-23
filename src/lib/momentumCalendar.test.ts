// ABOUTME: Tests for calcMomentumCalendar — 28-day momentum score history grid
// ABOUTME: Covers null thresholds, date range, tier mapping, avg, and missing-day handling

import { describe, it, expect } from "vitest";
import { calcMomentumCalendar, HIGH_THRESHOLD, MID_THRESHOLD } from "./momentumCalendar";
import type { MomentumEntry } from "../types";

// Build a history array for the last N days (ending at todayStr)
function makeHistory(todayStr: string, scores: number[]): MomentumEntry[] {
  const today = new Date(todayStr + "T12:00:00");
  return scores.map((score, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (scores.length - 1 - i));
    const tier: MomentumEntry["tier"] = score >= HIGH_THRESHOLD ? "high" : score >= MID_THRESHOLD ? "mid" : "low";
    return { date: d.toLocaleDateString("sv"), score, tier };
  });
}

const TODAY = "2026-03-22";

/** Returns YYYY-MM-DD for N days before TODAY (UTC-safe via sv locale). */
function daysAgo(n: number): string {
  const d = new Date(TODAY + "T12:00:00");
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("sv");
}

describe("calcMomentumCalendar", () => {
  // ── Null cases ────────────────────────────────────────────────────────────────

  it("returns null for empty history", () => {
    expect(calcMomentumCalendar([], TODAY)).toBeNull();
  });

  it("returns null when fewer than 7 active days in 28-day window", () => {
    // Only 6 entries in the last 28 days
    const history = makeHistory(TODAY, [50, 60, 55, 70, 45, 65]); // 6 entries
    expect(calcMomentumCalendar(history, TODAY)).toBeNull();
  });

  it("returns null when all history is older than 28 days", () => {
    const oldDate = "2025-01-01";
    const history: MomentumEntry[] = [
      { date: oldDate, score: 70, tier: "high" },
      { date: "2025-01-02", score: 65, tier: "high" },
    ];
    expect(calcMomentumCalendar(history, TODAY)).toBeNull();
  });

  // ── Happy path: 28-day array structure ────────────────────────────────────────

  it("returns exactly 28 days for sufficient history", () => {
    const history = makeHistory(TODAY, Array(28).fill(55));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    expect(result!.days).toHaveLength(28);
  });

  it("days are ordered oldest-first with strictly increasing dates", () => {
    const history = makeHistory(TODAY, Array(14).fill(55));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    const dates = result!.days.map(d => d.date);
    for (let i = 1; i < dates.length; i++) {
      // Strict inequality: catches duplicate dates in the window
      expect(dates[i] > dates[i - 1]).toBe(true);
    }
  });

  it("last day in array is today", () => {
    const history = makeHistory(TODAY, Array(14).fill(55));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    expect(result!.days[result!.days.length - 1].date).toBe(TODAY);
  });

  it("first day is 27 days before today", () => {
    const history = makeHistory(TODAY, Array(28).fill(55));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    const expected = new Date(TODAY + "T12:00:00");
    expected.setDate(expected.getDate() - 27);
    expect(result!.days[0].date).toBe(expected.toLocaleDateString("sv"));
  });

  // ── Tier mapping ──────────────────────────────────────────────────────────────

  it("maps high tier for score ≥ 65", () => {
    const scores = Array(28).fill(70);
    const result = calcMomentumCalendar(makeHistory(TODAY, scores), TODAY);
    expect(result).not.toBeNull();
    result!.days.filter(d => d.score !== null).forEach(d => {
      expect(d.tier).toBe("high");
    });
  });

  it("maps mid tier for score in [40, 65)", () => {
    const scores = Array(28).fill(50);
    const result = calcMomentumCalendar(makeHistory(TODAY, scores), TODAY);
    expect(result).not.toBeNull();
    result!.days.filter(d => d.score !== null).forEach(d => {
      expect(d.tier).toBe("mid");
    });
  });

  it("maps low tier for score < 40", () => {
    const scores = Array(28).fill(20);
    const result = calcMomentumCalendar(makeHistory(TODAY, scores), TODAY);
    expect(result).not.toBeNull();
    result!.days.filter(d => d.score !== null).forEach(d => {
      expect(d.tier).toBe("low");
    });
  });

  // ── Missing days ──────────────────────────────────────────────────────────────

  it("days with no history entry have null score and tier", () => {
    // Only 7 entries, all today's date — remaining 21 days should be null
    const history = makeHistory(TODAY, [50, 55, 60, 65, 70, 45, 40]);
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    const emptyDays = result!.days.filter(d => d.score === null);
    expect(emptyDays.length).toBe(21); // 28 - 7
    emptyDays.forEach(d => {
      expect(d.tier).toBeNull();
    });
  });

  // ── activeDays and avgScore ───────────────────────────────────────────────────

  it("activeDays counts only days with data", () => {
    const history = makeHistory(TODAY, Array(10).fill(55));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    expect(result!.activeDays).toBe(10);
  });

  it("avgScore is correct average over active days", () => {
    // 7 entries: 4 at 60, 3 at 40 → avg = (4×60 + 3×40)/7 = (240+120)/7 = 360/7 ≈ 51
    const history = makeHistory(TODAY, [60, 60, 60, 60, 40, 40, 40]);
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    expect(result!.avgScore).toBeCloseTo(360 / 7, 0);
  });

  it("avgScore is a number (never null) when result is non-null", () => {
    // calcMomentumCalendar returns null when activeDays < 7, so any non-null
    // result always has activeDays >= 7 and thus a defined numeric avgScore.
    const history = makeHistory(TODAY, Array(7).fill(55));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    expect(typeof result!.avgScore).toBe("number");
  });

  // ── Exact 7 active-day boundary ───────────────────────────────────────────────

  it("returns non-null with exactly 7 active days", () => {
    const history = makeHistory(TODAY, Array(7).fill(55));
    expect(calcMomentumCalendar(history, TODAY)).not.toBeNull();
  });

  it("returns null with exactly 6 active days", () => {
    const history = makeHistory(TODAY, Array(6).fill(55));
    expect(calcMomentumCalendar(history, TODAY)).toBeNull();
  });

  // ── Tier boundary values ──────────────────────────────────────────────────────

  it("should assign high tier for score exactly at the 65 threshold", () => {
    const history = makeHistory(TODAY, Array(7).fill(65));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    result!.days.filter(d => d.score !== null).forEach(d => {
      expect(d.tier).toBe("high");
    });
  });

  it("should assign mid tier for score just below the 65 threshold (64)", () => {
    const history = makeHistory(TODAY, Array(7).fill(64));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    result!.days.filter(d => d.score !== null).forEach(d => {
      expect(d.tier).toBe("mid");
    });
  });

  it("should assign mid tier for score exactly at the 40 threshold", () => {
    const history = makeHistory(TODAY, Array(7).fill(40));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    result!.days.filter(d => d.score !== null).forEach(d => {
      expect(d.tier).toBe("mid");
    });
  });

  it("should assign low tier for score just below the 40 threshold (39)", () => {
    const history = makeHistory(TODAY, Array(7).fill(39));
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    result!.days.filter(d => d.score !== null).forEach(d => {
      expect(d.tier).toBe("low");
    });
  });

  // ── Out-of-window entries are excluded ─────────────────────────────────────────

  it("should not count entries older than 28 days in activeDays", () => {
    // 7 in-window entries + 5 entries at offset 28+ (first day outside the 27-day lookback)
    const inWindow = makeHistory(TODAY, Array(7).fill(50));
    const outOfWindow: MomentumEntry[] = [28, 29, 30, 31, 32].map(n => ({
      date: daysAgo(n),
      score: 80,
      tier: "high" as const,
    }));
    const result = calcMomentumCalendar([...outOfWindow, ...inWindow], TODAY);
    expect(result).not.toBeNull();
    expect(result!.activeDays).toBe(7);
  });

  it("should compute avgScore from in-window entries only when old entries exist", () => {
    // 7 in-window entries at score 50; 5 out-of-window entries at score 100
    // avgScore must be 50, not inflated by the old high scores
    const inWindow = makeHistory(TODAY, Array(7).fill(50));
    const outOfWindow: MomentumEntry[] = [28, 29, 30, 31, 32].map(n => ({
      date: daysAgo(n),
      score: 100,
      tier: "high" as const,
    }));
    const result = calcMomentumCalendar([...outOfWindow, ...inWindow], TODAY);
    expect(result).not.toBeNull();
    expect(result!.avgScore).toBeCloseTo(50, 1);
  });

  // ── Score = 0 is a valid active data point ────────────────────────────────────

  it("should treat score 0 as an active data point with low tier", () => {
    // Score 0 is a valid momentum score — entry exists in lookup, entry !== null, activeDays++
    const history = makeHistory(TODAY, [0, 0, 0, 0, 0, 0, 0]);
    const result = calcMomentumCalendar(history, TODAY);
    expect(result).not.toBeNull();
    expect(result!.activeDays).toBe(7);
    result!.days.filter(d => d.score !== null).forEach(d => {
      expect(d.tier).toBe("low");
    });
    expect(result!.avgScore).toBeCloseTo(0, 1);
  });

  // ── History deduplication (same date appears twice) ────────────────────────────

  it("last-write-wins for duplicate dates: later array entry prevails", () => {
    const base = makeHistory(TODAY, Array(10).fill(50));
    const firstDate = base[0].date;
    // Prepend a duplicate entry with score=99 for the same date as base[0]
    // The Map iteration processes base[0] (score=50) AFTER the prepended entry (score=99),
    // so base[0]'s value (50) should be the final value for firstDate.
    const withDuplicate: MomentumEntry[] = [
      { date: firstDate, score: 99, tier: "high" },
      ...base, // base[0] has the same date and score=50 — overwrites 99
    ];
    const result = calcMomentumCalendar(withDuplicate, TODAY);
    expect(result).not.toBeNull();
    const firstDay = result!.days.find(d => d.date === firstDate);
    expect(firstDay?.score).toBe(50); // last-seen entry (base[0]) wins
  });
});
