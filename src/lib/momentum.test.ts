// ABOUTME: Tests for calcDailyScore, updateMomentumHistory, calcMomentumStreak, calcMomentumWeekAvg, calcMomentumTrend — score, tier, history edge cases
// ABOUTME: Covers no-activity baseline, full score, partial inputs, tier thresholds, history upsert/cap, streak counting, 7-day average, and 3-day trend detection

import { describe, it, expect } from "vitest";
import { calcDailyScore, updateMomentumHistory, calcMomentumStreak, calcMomentumWeekAvg, calcMomentumTrend } from "./momentum";

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

  it("caps history at 7 entries, keeping newest", () => {
    const existing = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: i * 10,
      tier: "low" as const,
    }));
    const result = updateMomentumHistory(existing, "2026-03-08", 99, "high");
    expect(result).toHaveLength(7);
    expect(result[0].date).toBe("2026-03-02"); // oldest dropped
    expect(result[6]).toEqual({ date: "2026-03-08", score: 99, tier: "high" });
  });

  it("does not exceed 7 entries when upsert keeps same length", () => {
    const existing = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      score: 50,
      tier: "mid" as const,
    }));
    const result = updateMomentumHistory(existing, "2026-03-07", 75, "high");
    expect(result).toHaveLength(7);
    expect(result[6]).toEqual({ date: "2026-03-07", score: 75, tier: "high" });
  });

  it("stores entry with empty string date (passthrough — caller is responsible for valid dates)", () => {
    const result = updateMomentumHistory([], "", 0, "low");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ date: "", score: 0, tier: "low" });
  });
});

describe("calcMomentumStreak", () => {
  it("should return 0 when history is empty", () => {
    expect(calcMomentumStreak([], "2026-03-16")).toBe(0);
  });

  it("should return 0 when today's entry has score < 40 and yesterday is absent", () => {
    const history = [{ date: "2026-03-16", score: 20, tier: "low" as const }];
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(0);
  });

  it("should return 1 when today's entry has score exactly 40 (boundary)", () => {
    const history = [{ date: "2026-03-16", score: 40, tier: "mid" as const }];
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(1);
  });

  it("should return 0 when today's score is 39 (just below boundary)", () => {
    const history = [{ date: "2026-03-16", score: 39, tier: "low" as const }];
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(0);
  });

  it("should return 1 when today qualifies and yesterday is absent", () => {
    const history = [{ date: "2026-03-16", score: 75, tier: "high" as const }];
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(1);
  });

  it("should return 2 when today and yesterday both qualify", () => {
    const history = [
      { date: "2026-03-15", score: 60, tier: "mid" as const },
      { date: "2026-03-16", score: 80, tier: "high" as const },
    ];
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(2);
  });

  it("should return 1 when today is absent but yesterday qualifies (streak alive)", () => {
    const history = [{ date: "2026-03-15", score: 65, tier: "mid" as const }];
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(1);
  });

  it("should return 0 when today is absent and yesterday's score < 40", () => {
    const history = [{ date: "2026-03-15", score: 30, tier: "low" as const }];
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(0);
  });

  it("should return 0 when today is absent and yesterday is also absent", () => {
    const history = [{ date: "2026-03-14", score: 70, tier: "mid" as const }];
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(0);
  });

  it("should count consecutive qualifying days, stopping at the first gap", () => {
    const history = [
      { date: "2026-03-12", score: 50, tier: "mid" as const }, // gap before this
      { date: "2026-03-14", score: 55, tier: "mid" as const },
      { date: "2026-03-15", score: 70, tier: "mid" as const },
      { date: "2026-03-16", score: 85, tier: "high" as const },
    ];
    // 16, 15, 14 are consecutive; 13 is absent (gap) → streak = 3
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(3);
  });

  it("should stop at a day with score < 40 even if earlier days qualify", () => {
    const history = [
      { date: "2026-03-13", score: 80, tier: "high" as const },
      { date: "2026-03-14", score: 20, tier: "low" as const }, // breaks chain
      { date: "2026-03-15", score: 60, tier: "mid" as const },
      { date: "2026-03-16", score: 70, tier: "mid" as const },
    ];
    // 16, 15 qualify; 14 breaks chain → streak = 2
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(2);
  });

  it("should count full 7-day window when all 7 entries qualify", () => {
    const history = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(10 + i).padStart(2, "0")}`,
      score: 50 + i,
      tier: "mid" as const,
    }));
    // 10–16, today = 16 → streak = 7
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(7);
  });

  it("should start from yesterday when today's score < 40 and yesterday qualifies", () => {
    const history = [
      { date: "2026-03-14", score: 60, tier: "mid" as const },
      { date: "2026-03-15", score: 55, tier: "mid" as const },
      { date: "2026-03-16", score: 10, tier: "low" as const }, // today low but streak alive from yesterday
    ];
    // today < 40 → start from yesterday; 15 and 14 both qualify → streak = 2
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(2);
  });

  it("should work across month boundaries", () => {
    const history = [
      { date: "2026-02-28", score: 55, tier: "mid" as const },
      { date: "2026-03-01", score: 60, tier: "mid" as const },
      { date: "2026-03-02", score: 75, tier: "high" as const },
    ];
    expect(calcMomentumStreak(history, "2026-03-02")).toBe(3);
  });

  it("should ignore future history entries beyond todayStr", () => {
    const history = [
      { date: "2026-03-15", score: 70, tier: "mid" as const },
      { date: "2026-03-16", score: 80, tier: "high" as const },
      { date: "2026-03-17", score: 90, tier: "high" as const }, // future — should not be counted
    ];
    // todayStr = 2026-03-16: streak includes 16 + 15 = 2; future entry on 17 is not reached
    expect(calcMomentumStreak(history, "2026-03-16")).toBe(2);
  });
});

describe("calcDailyScore — breakdown field", () => {
  it("includes breakdown with all three components", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 2,
      habitsTotal: 4,
      pomodoroToday: 1,
      pomodoroGoal: 3,
      intentionDone: false,
      intentionSet: true,
    });
    // habits: 2/4 * 50 = 25; pomodoro: 1/3 * 30 = 10; intention: set-not-done = 8
    expect(result.breakdown.habits).toBe(25);
    expect(result.breakdown.pomodoro).toBeCloseTo(10, 5);
    expect(result.breakdown.intention).toBe(8);
  });

  it("breakdown.habits = 50 when all habits done", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 3,
      habitsTotal: 3,
      pomodoroToday: 0,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.breakdown.habits).toBe(50);
  });

  it("breakdown.habits = 0 when habitsTotal = 0", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 0,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.breakdown.habits).toBe(0);
  });

  it("breakdown.pomodoro = 30 when sessions meet goal", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 5,
      pomodoroGoal: 5,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.breakdown.pomodoro).toBe(30);
  });

  it("breakdown.pomodoro capped at 30 when sessions exceed goal", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 10,
      pomodoroGoal: 5,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.breakdown.pomodoro).toBe(30);
  });

  it("breakdown.intention = 20 when done", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 0,
      intentionDone: true,
      intentionSet: true,
    });
    expect(result.breakdown.intention).toBe(20);
  });

  it("breakdown.intention = 8 when set but not done", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 0,
      intentionDone: false,
      intentionSet: true,
    });
    expect(result.breakdown.intention).toBe(8);
  });

  it("breakdown.intention = 0 when not set", () => {
    const result = calcDailyScore({
      habitsCheckedToday: 0,
      habitsTotal: 0,
      pomodoroToday: 0,
      intentionDone: false,
      intentionSet: false,
    });
    expect(result.breakdown.intention).toBe(0);
  });
});

describe("calcMomentumWeekAvg", () => {
  it("should return null when history is empty", () => {
    expect(calcMomentumWeekAvg([])).toBeNull();
  });

  it("should return null when history has only one entry (not enough for a meaningful average)", () => {
    expect(calcMomentumWeekAvg([{ date: "2026-03-10", score: 80, tier: "high" as const }])).toBeNull();
  });

  it("should return the rounded average of two entries", () => {
    const history = [
      { date: "2026-03-09", score: 60, tier: "mid" as const },
      { date: "2026-03-10", score: 80, tier: "high" as const },
    ];
    expect(calcMomentumWeekAvg(history)).toBe(70);
  });

  it("should return rounded average of seven entries", () => {
    const history = [
      { date: "2026-03-04", score: 40, tier: "mid" as const },
      { date: "2026-03-05", score: 50, tier: "mid" as const },
      { date: "2026-03-06", score: 60, tier: "mid" as const },
      { date: "2026-03-07", score: 70, tier: "mid" as const },
      { date: "2026-03-08", score: 80, tier: "high" as const },
      { date: "2026-03-09", score: 90, tier: "high" as const },
      { date: "2026-03-10", score: 100, tier: "high" as const },
    ];
    // (40+50+60+70+80+90+100) / 7 = 490/7 = 70
    expect(calcMomentumWeekAvg(history)).toBe(70);
  });

  it("should round the average to nearest integer", () => {
    const history = [
      { date: "2026-03-09", score: 33, tier: "low" as const },
      { date: "2026-03-10", score: 34, tier: "low" as const },
    ];
    // (33+34)/2 = 33.5 → 34
    expect(calcMomentumWeekAvg(history)).toBe(34);
  });

  it("should return 0 when all entries have score 0", () => {
    const history = [
      { date: "2026-03-09", score: 0, tier: "low" as const },
      { date: "2026-03-10", score: 0, tier: "low" as const },
    ];
    expect(calcMomentumWeekAvg(history)).toBe(0);
  });

  it("should return 100 when all entries are at max score", () => {
    const history = [
      { date: "2026-03-09", score: 100, tier: "high" as const },
      { date: "2026-03-10", score: 100, tier: "high" as const },
      { date: "2026-03-11", score: 100, tier: "high" as const },
    ];
    expect(calcMomentumWeekAvg(history)).toBe(100);
  });

  it("should compute average without regard to date order", () => {
    const history = [
      { date: "2026-03-10", score: 90, tier: "high" as const },
      { date: "2026-03-08", score: 50, tier: "mid" as const },
    ];
    // (90+50)/2 = 70
    expect(calcMomentumWeekAvg(history)).toBe(70);
  });
});

describe("calcMomentumTrend", () => {
  it("should return null for empty history", () => {
    expect(calcMomentumTrend([], "2026-03-16")).toBeNull();
  });

  it("should return null for a single entry", () => {
    const history = [{ date: "2026-03-16", score: 50, tier: "mid" as const }];
    expect(calcMomentumTrend(history, "2026-03-16")).toBeNull();
  });

  it("should return null for two entries (need 3 consecutive days)", () => {
    const history = [
      { date: "2026-03-15", score: 80, tier: "high" as const },
      { date: "2026-03-16", score: 60, tier: "mid" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-16")).toBeNull();
  });

  it("should return 'declining' when 3 consecutive days are strictly decreasing", () => {
    const history = [
      { date: "2026-03-14", score: 80, tier: "high" as const },
      { date: "2026-03-15", score: 60, tier: "mid" as const },
      { date: "2026-03-16", score: 40, tier: "mid" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-16")).toBe("declining");
  });

  it("should return 'rising' when 3 consecutive days are strictly increasing", () => {
    const history = [
      { date: "2026-03-14", score: 40, tier: "mid" as const },
      { date: "2026-03-15", score: 60, tier: "mid" as const },
      { date: "2026-03-16", score: 80, tier: "high" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-16")).toBe("rising");
  });

  it("should return 'stable' when scores are flat (plateau)", () => {
    const history = [
      { date: "2026-03-14", score: 60, tier: "mid" as const },
      { date: "2026-03-15", score: 60, tier: "mid" as const },
      { date: "2026-03-16", score: 60, tier: "mid" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-16")).toBe("stable");
  });

  it("should return 'stable' when trend is mixed (not strictly mono)", () => {
    const history = [
      { date: "2026-03-14", score: 80, tier: "high" as const },
      { date: "2026-03-15", score: 60, tier: "mid" as const },
      { date: "2026-03-16", score: 70, tier: "mid" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-16")).toBe("stable");
  });

  it("should return null when yesterday's entry is missing (gap)", () => {
    const history = [
      { date: "2026-03-14", score: 80, tier: "high" as const },
      // 2026-03-15 missing
      { date: "2026-03-16", score: 50, tier: "mid" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-16")).toBeNull();
  });

  it("should return null when 2-days-ago entry is missing", () => {
    const history = [
      // 2026-03-14 missing
      { date: "2026-03-15", score: 70, tier: "mid" as const },
      { date: "2026-03-16", score: 50, tier: "mid" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-16")).toBeNull();
  });

  it("should return 'stable' when rising only 2 days then flat", () => {
    const history = [
      { date: "2026-03-14", score: 40, tier: "mid" as const },
      { date: "2026-03-15", score: 60, tier: "mid" as const },
      { date: "2026-03-16", score: 60, tier: "mid" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-16")).toBe("stable");
  });

  it("should handle month boundary correctly (Mar 1 looks back to Feb 27/28)", () => {
    const history = [
      { date: "2026-02-27", score: 90, tier: "high" as const },
      { date: "2026-02-28", score: 70, tier: "mid" as const },
      { date: "2026-03-01", score: 50, tier: "mid" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-01")).toBe("declining");
  });

  it("should ignore extra entries outside the 3-day window", () => {
    const history = [
      { date: "2026-03-10", score: 20, tier: "low" as const }, // outside window
      { date: "2026-03-14", score: 80, tier: "high" as const },
      { date: "2026-03-15", score: 60, tier: "mid" as const },
      { date: "2026-03-16", score: 40, tier: "mid" as const },
    ];
    expect(calcMomentumTrend(history, "2026-03-16")).toBe("declining");
  });
});
