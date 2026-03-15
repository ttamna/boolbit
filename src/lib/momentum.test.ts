// ABOUTME: Tests for momentum pure functions: calcDailyScore, updateMomentumHistory, calcMomentumStreak, calcMomentumWeekAvg, calcMomentumWeekTrend
// ABOUTME: Covers score computation, tier thresholds, history upsert/cap, consecutive streak with date gaps, weekly average, and week-over-week trend

import { describe, it, expect } from "vitest";
import { calcDailyScore, updateMomentumHistory, calcMomentumStreak, calcMomentumWeekAvg, calcMomentumWeekTrend } from "./momentum";

describe("calcDailyScore", () => {
  it("returns score 0 and tier 'low' with no activity", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 4,
      pomodoroToday: 0,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(0);
    expect(result.tier).toBe("low");
  });

  it("returns score 100 and tier 'high' with all habits, 3 pomodoros (no goal), intention done", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 4,
      habitsTotal: 4,
      pomodoroToday: 3,
      intentionDone: true,
      intentionSet: true,
    });
    expect(result.score).toBe(100);
    expect(result.tier).toBe("high");
  });

  it("habits contribution: 50pts when all checked", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 3,
      habitsTotal: 3,
      pomodoroToday: 0,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(50);
    expect(result.tier).toBe("mid");
  });

  it("partial habits: 2 of 4 → 25pts, tier 'low'", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 2,
      habitsTotal: 4,
      pomodoroToday: 0,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(25);
    expect(result.tier).toBe("low");
  });

  it("habitsTotal = 0 contributes 0 habit pts", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 3,
      intentionDone: true,
      intentionSet: true,
    });
    expect(result.score).toBe(50); // 30 pomodoro + 20 intention
  });

  it("pomodoro with goal: full 30pts when reaching goal", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 5,
      pomodoroGoal: 5,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(30);
    expect(result.tier).toBe("low");
  });

  it("pomodoro with goal: partial pts when below goal", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 2,
      pomodoroGoal: 4,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(15); // 2/4 × 30 = 15
  });

  it("pomodoro without goal: 30pts at 3 sessions", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 3,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(30);
  });

  it("pomodoro without goal: caps at 30pts even with >3 sessions", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 10,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(30);
  });

  it("pomodoroGoal = NaN treated as no goal (3-session baseline)", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 3,
      pomodoroGoal: NaN,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(30); // fallback to 3-session baseline
  });

  it("pomodoroGoal = 0 treated as no goal (3-session baseline)", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 3,
      pomodoroGoal: 0,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(30);
  });

  it("intention set but not done: 8pts", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 0,
      intentionDone: false,
      intentionSet: true,
    });
    expect(result.score).toBe(8);
    expect(result.tier).toBe("low");
  });

  it("intention done: 20pts", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 0,
      intentionDone: true,
      intentionSet: true,
    });
    expect(result.score).toBe(20);
    expect(result.tier).toBe("low");
  });

  it("tier 'high' threshold: score >= 75", () => {
    // 50 (all habits) + 30 (3 pomodoros) = 80 → high
    const result = calcDailyScore({
      habitsCheckedToday: 4,
      habitsTotal: 4,
      pomodoroToday: 3,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(80);
    expect(result.tier).toBe("high");
  });

  it("tier 'mid' threshold: score in [40, 74]", () => {
    // 50 (all habits) + 0 = 50 → mid
    const result = calcDailyScore({
      habitsCheckedToday: 4,
      habitsTotal: 4,
      pomodoroToday: 0,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.score).toBe(50);
    expect(result.tier).toBe("mid");
  });

  it("tier boundary: score 74 → 'mid'", () => {
    // 50 (all habits) + 16 (partial pomodoro, 2/4 goal × 30 = 15) + 8 (intention set) = 73
    // Closest even below 75: use goal-based 2/4 = 15 + all habits 50 + intention-set 8 = 73
    const result = calcDailyScore({
      habitsCheckedToday: 4,
      habitsTotal: 4,
      pomodoroToday: 2,
      pomodoroGoal: 4,
      intentionDone: false,
      intentionSet: true,
    });
    expect(result.score).toBe(73);
    expect(result.tier).toBe("mid");
  });

  it("tier boundary: score 75 → 'high'", () => {
    // 50 (all habits) + 5 (partial pomodoro, 1/6 goal × 30 = 5) + 20 (intention done) = 75
    const result = calcDailyScore({
      habitsCheckedToday: 4,
      habitsTotal: 4,
      pomodoroToday: 1,
      pomodoroGoal: 6,
      intentionDone: true,
      intentionSet: true,
    });
    expect(result.score).toBe(75);
    expect(result.tier).toBe("high");
  });

  it("caps at 100 when inputs produce raw > 100", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 100,
      habitsTotal: 4,
      pomodoroToday: 100,
      pomodoroGoal: 1,
      intentionDone: true,
      intentionSet: true,
    });
    expect(result.score).toBe(100);
    expect(result.tier).toBe("high");
  });
});

describe("updateMomentumHistory", () => {
  it("appends a new entry when history is empty", () => {
    const result = updateMomentumHistory([], "2026-03-15", 72, "mid");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ date: "2026-03-15", score: 72, tier: "mid" });
  });

  it("upserts today's entry when same date already exists", () => {
    const existing = [{ date: "2026-03-15", score: 50, tier: "mid" as const }];
    const result = updateMomentumHistory(existing, "2026-03-15", 85, "high");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ date: "2026-03-15", score: 85, tier: "high" });
  });

  it("appends new day entry preserving previous days", () => {
    const existing = [
      { date: "2026-03-14", score: 60, tier: "mid" as const },
      { date: "2026-03-15", score: 80, tier: "high" as const },
    ];
    const result = updateMomentumHistory(existing, "2026-03-16", 30, "low");
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ date: "2026-03-16", score: 30, tier: "low" });
  });

  it("caps history at 14 entries, keeping newest", () => {
    // 14 existing → append one more → 15 total → capped back to 14 (oldest dropped)
    const existing = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: i * 5,
      tier: "low" as const,
    }));
    const result = updateMomentumHistory(existing, "2026-03-15", 99, "high");
    expect(result).toHaveLength(14);
    expect(result[0].date).toBe("2026-03-02"); // oldest dropped
    expect(result[13]).toEqual({ date: "2026-03-15", score: 99, tier: "high" });
  });

  it("does not drop entries when below cap (13 entries → 14, no capping)", () => {
    // 13 existing → append one more → 14 total → at cap, nothing dropped
    const existing = Array.from({ length: 13 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: 50,
      tier: "mid" as const,
    }));
    const result = updateMomentumHistory(existing, "2026-03-14", 75, "high");
    expect(result).toHaveLength(14);
    expect(result[0].date).toBe("2026-03-01"); // oldest preserved
    expect(result[13]).toEqual({ date: "2026-03-14", score: 75, tier: "high" });
  });

  it("does not exceed 14 entries when upsert keeps same length", () => {
    const existing = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: 50,
      tier: "mid" as const,
    }));
    const result = updateMomentumHistory(existing, "2026-03-14", 75, "high");
    expect(result).toHaveLength(14);
    expect(result[13]).toEqual({ date: "2026-03-14", score: 75, tier: "high" });
  });

  it("stores entry with empty string date (passthrough — caller is responsible for valid dates)", () => {
    const result = updateMomentumHistory([], "", 0, "low");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ date: "", score: 0, tier: "low" });
  });
});

describe("calcMomentumStreak", () => {
  it("returns 0 for empty history", () => {
    expect(calcMomentumStreak([])).toBe(0);
  });

  it("returns 0 when last entry is not high tier", () => {
    const history = [
      { date: "2026-03-14", score: 80, tier: "high" as const },
      { date: "2026-03-15", score: 45, tier: "mid" as const },
    ];
    expect(calcMomentumStreak(history)).toBe(0);
  });

  it("returns 0 when last entry is low tier", () => {
    const history = [{ date: "2026-03-15", score: 20, tier: "low" as const }];
    expect(calcMomentumStreak(history)).toBe(0);
  });

  it("returns 1 when only the last entry is high", () => {
    const history = [
      { date: "2026-03-14", score: 50, tier: "mid" as const },
      { date: "2026-03-15", score: 80, tier: "high" as const },
    ];
    expect(calcMomentumStreak(history)).toBe(1);
  });

  it("returns 2 for two consecutive high entries at end", () => {
    const history = [
      { date: "2026-03-13", score: 30, tier: "low" as const },
      { date: "2026-03-14", score: 78, tier: "high" as const },
      { date: "2026-03-15", score: 90, tier: "high" as const },
    ];
    expect(calcMomentumStreak(history)).toBe(2);
  });

  it("returns full count when all entries are high", () => {
    const history = [
      { date: "2026-03-11", score: 76, tier: "high" as const },
      { date: "2026-03-12", score: 82, tier: "high" as const },
      { date: "2026-03-13", score: 91, tier: "high" as const },
      { date: "2026-03-14", score: 77, tier: "high" as const },
      { date: "2026-03-15", score: 88, tier: "high" as const },
    ];
    expect(calcMomentumStreak(history)).toBe(5);
  });

  it("stops counting when mid tier interrupts the streak from the end", () => {
    const history = [
      { date: "2026-03-12", score: 85, tier: "high" as const },
      { date: "2026-03-13", score: 55, tier: "mid" as const },
      { date: "2026-03-14", score: 80, tier: "high" as const },
      { date: "2026-03-15", score: 78, tier: "high" as const },
    ];
    expect(calcMomentumStreak(history)).toBe(2);
  });

  it("single high entry returns 1", () => {
    const history = [{ date: "2026-03-15", score: 88, tier: "high" as const }];
    expect(calcMomentumStreak(history)).toBe(1);
  });

  it("returns 1 (not 2) when two high entries have a date gap between them", () => {
    // Gap: 2026-03-10 → 2026-03-15 (5 days, not 1 day)
    const history = [
      { date: "2026-03-10", score: 80, tier: "high" as const },
      { date: "2026-03-15", score: 85, tier: "high" as const },
    ];
    expect(calcMomentumStreak(history)).toBe(1);
  });

  it("streak stops at date gap even when all tiers are high", () => {
    // Consecutive for last 3 entries but gap before them
    const history = [
      { date: "2026-03-10", score: 80, tier: "high" as const },
      { date: "2026-03-13", score: 82, tier: "high" as const }, // gap: +3 days
      { date: "2026-03-14", score: 85, tier: "high" as const },
      { date: "2026-03-15", score: 88, tier: "high" as const },
    ];
    expect(calcMomentumStreak(history)).toBe(3);
  });
});

describe("calcMomentumWeekAvg", () => {
  it("returns null for empty history", () => {
    expect(calcMomentumWeekAvg([])).toBeNull();
  });

  it("returns score rounded when single entry", () => {
    const history = [{ date: "2026-03-15", score: 72, tier: "mid" as const }];
    expect(calcMomentumWeekAvg(history)).toBe(72);
  });

  it("returns average of all entries", () => {
    const history = [
      { date: "2026-03-13", score: 80, tier: "high" as const },
      { date: "2026-03-14", score: 60, tier: "mid" as const },
      { date: "2026-03-15", score: 40, tier: "mid" as const },
    ];
    // (80 + 60 + 40) / 3 = 60
    expect(calcMomentumWeekAvg(history)).toBe(60);
  });

  it("rounds to nearest integer", () => {
    const history = [
      { date: "2026-03-14", score: 70, tier: "mid" as const },
      { date: "2026-03-15", score: 71, tier: "mid" as const },
    ];
    // (70 + 71) / 2 = 70.5 → rounds to 71
    expect(calcMomentumWeekAvg(history)).toBe(71);
  });

  it("uses all 7 entries when history is full (7 entries)", () => {
    const scores = [80, 70, 60, 75, 85, 90, 65];
    const history = scores.map((score, i) => ({
      date: `2026-03-${String(i + 9).padStart(2, "0")}`,
      score,
      tier: "mid" as const,
    }));
    const expected = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    expect(calcMomentumWeekAvg(history)).toBe(expected);
  });

  it("uses only the most recent 7 entries when history exceeds 7", () => {
    // Old entries (should be ignored): scores 20,20,20,20,20,20,20 avg=20
    // Recent 7 entries: scores 80,80,80,80,80,80,80 avg=80
    const old7 = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: 20,
      tier: "low" as const,
    }));
    const recent7 = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 8).padStart(2, "0")}`,
      score: 80,
      tier: "high" as const,
    }));
    expect(calcMomentumWeekAvg([...old7, ...recent7])).toBe(80);
  });
});

describe("calcMomentumWeekTrend", () => {
  it("returns null for empty history", () => {
    expect(calcMomentumWeekTrend([])).toBeNull();
  });

  it("returns null when history has fewer than 8 entries", () => {
    const history = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 9).padStart(2, "0")}`,
      score: 70,
      tier: "mid" as const,
    }));
    expect(calcMomentumWeekTrend(history)).toBeNull();
  });

  it("returns '↑' when this week avg is meaningfully higher than prev week avg", () => {
    // prev week (first 7): avg = 50; this week (last 7): avg = 60; delta = 10 > 2 → ↑
    const prev = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: 50,
      tier: "mid" as const,
    }));
    const curr = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 8).padStart(2, "0")}`,
      score: 60,
      tier: "mid" as const,
    }));
    expect(calcMomentumWeekTrend([...prev, ...curr])).toBe("↑");
  });

  it("returns '↓' when this week avg is meaningfully lower than prev week avg", () => {
    // prev week: avg = 75; this week: avg = 50; delta = -25 → ↓
    const prev = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: 75,
      tier: "high" as const,
    }));
    const curr = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 8).padStart(2, "0")}`,
      score: 50,
      tier: "mid" as const,
    }));
    expect(calcMomentumWeekTrend([...prev, ...curr])).toBe("↓");
  });

  it("returns '→' when delta is within ±2 (noise margin, stable)", () => {
    // prev week avg = 60; this week avg = 62; delta = 2 ≤ 2 → →
    const prev = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: 60,
      tier: "mid" as const,
    }));
    const curr = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 8).padStart(2, "0")}`,
      score: 62,
      tier: "mid" as const,
    }));
    expect(calcMomentumWeekTrend([...prev, ...curr])).toBe("→");
  });

  it("returns '→' when delta is exactly -2 (negative noise margin)", () => {
    const prev = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: 70,
      tier: "mid" as const,
    }));
    const curr = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 8).padStart(2, "0")}`,
      score: 68,
      tier: "mid" as const,
    }));
    expect(calcMomentumWeekTrend([...prev, ...curr])).toBe("→");
  });

  it("works correctly with 8-entry history (minimum for comparison)", () => {
    // 1 prev entry (score 40) vs 7 curr entries (score 80): this week avg=80, prev avg=40 → ↑
    const history = [
      { date: "2026-03-01", score: 40, tier: "mid" as const },
      ...Array.from({ length: 7 }, (_, i) => ({
        date: `2026-03-${String(i + 2).padStart(2, "0")}`,
        score: 80,
        tier: "high" as const,
      })),
    ];
    expect(calcMomentumWeekTrend(history)).toBe("↑");
  });

  it("uses last 7 as this week and all earlier as prev week when history has 14 entries", () => {
    // prev 7 (indices 0-6): avg 40; curr 7 (indices 7-13): avg 80 → ↑
    const prev7 = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: 40,
      tier: "low" as const,
    }));
    const curr7 = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 8).padStart(2, "0")}`,
      score: 80,
      tier: "high" as const,
    }));
    expect(calcMomentumWeekTrend([...prev7, ...curr7])).toBe("↑");
  });
});
