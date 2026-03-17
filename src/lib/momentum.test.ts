// ABOUTME: Tests for calcDailyScore, updateMomentumHistory, calcMomentumStreak, calcMomentumWeekAvg, calcMomentumTrend, calcMomentumEveningDigest, calcMomentumMorningReminder, calcWeeklyMomentumReport, calcMonthlyMomentumReport, calcQuarterlyMomentumReport, calcYearlyMomentumReport — score, tier, history cap (31 entries), edge cases
// ABOUTME: Covers no-activity baseline, full score, partial inputs, tier thresholds, history upsert/cap, streak counting, 7-day average, 3-day trend detection, evening digest, morning reminder, weekly/monthly/quarterly/yearly reports, and calcDayOfWeekMomentumAvg/calcWeakMomentumDay/calcBestMomentumDay for per-weekday momentum avg pattern analysis

import { describe, it, expect } from "vitest";
import { calcDailyScore, updateMomentumHistory, calcMomentumStreak, calcMomentumWeekAvg, calcMomentumTrend, calcMomentumEveningDigest, calcWeeklyMomentumReport, calcMonthlyMomentumReport, calcQuarterlyMomentumReport, calcMomentumMorningReminder, calcYearlyMomentumReport, calcDayOfWeekMomentumAvg, calcWeakMomentumDay, calcBestMomentumDay } from "./momentum";

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

  it("caps history at 31 entries, keeping newest", () => {
    // Fill 31 entries (MOMENTUM_HISTORY_CAP) using a base date + offset to avoid month-boundary fragility.
    // Jan 1 + 0..30 = Jan 1..31 — all valid dates.
    const base = new Date("2026-01-01T00:00:00");
    const existing = Array.from({ length: 31 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return { date: d.toLocaleDateString("sv"), score: i * 3, tier: "low" as const };
    });
    const result = updateMomentumHistory(existing, "2026-02-01", 99, "high");
    expect(result).toHaveLength(31);
    expect(result[0].date).toBe(existing[1].date); // oldest (existing[0] = Jan 1) dropped
    expect(result[30]).toEqual({ date: "2026-02-01", score: 99, tier: "high" });
  });

  it("does not exceed 31 entries when upsert keeps same length", () => {
    const base = new Date("2026-01-01T00:00:00");
    const existing = Array.from({ length: 31 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return { date: d.toLocaleDateString("sv"), score: 50, tier: "mid" as const };
    });
    // Upsert an existing date — length stays at 31 (no new append)
    const result = updateMomentumHistory(existing, existing[30].date, 75, "high");
    expect(result).toHaveLength(31);
    expect(result[30]).toEqual({ date: existing[30].date, score: 75, tier: "high" });
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

describe("calcMomentumEveningDigest", () => {
  it("should return null when score is zero", () => {
    expect(calcMomentumEveningDigest(0, "low")).toBeNull();
  });

  it("should return null when score is negative (defensive guard)", () => {
    expect(calcMomentumEveningDigest(-1, "low")).toBeNull();
  });

  it("should return low tier message for minimum non-zero score", () => {
    const msg = calcMomentumEveningDigest(1, "low");
    expect(msg).toContain("1");
    expect(msg).toContain("💪");
  });

  it("should return high tier message with score for high tier", () => {
    const msg = calcMomentumEveningDigest(82, "high");
    expect(msg).toContain("82");
    expect(msg).toContain("🔥");
  });

  it("should return mid tier message with score for mid tier", () => {
    const msg = calcMomentumEveningDigest(50, "mid");
    expect(msg).toContain("50");
    expect(msg).toContain("✅");
  });

  it("should return low tier message with score for low tier", () => {
    const msg = calcMomentumEveningDigest(20, "low");
    expect(msg).toContain("20");
    expect(msg).toContain("💪");
  });

  it("should return high tier message for perfect score", () => {
    const msg = calcMomentumEveningDigest(100, "high");
    expect(msg).toContain("100");
    expect(msg).toContain("🔥");
  });
});

describe("calcWeeklyMomentumReport", () => {
  const last7 = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"];

  it("should return null when history is empty", () => {
    expect(calcWeeklyMomentumReport([], last7)).toBeNull();
  });

  it("should return null when fewer than 3 entries fall within last7Days", () => {
    const history = [
      { date: "2026-03-09", score: 80, tier: "high" as const },
      { date: "2026-03-10", score: 70, tier: "mid" as const },
    ];
    expect(calcWeeklyMomentumReport(history, last7)).toBeNull();
  });

  it("should return null when history entries are all outside last7Days", () => {
    const history = [
      { date: "2026-03-01", score: 80, tier: "high" as const },
      { date: "2026-03-02", score: 70, tier: "mid" as const },
      { date: "2026-03-03", score: 60, tier: "mid" as const },
      { date: "2026-03-04", score: 50, tier: "mid" as const },
    ];
    expect(calcWeeklyMomentumReport(history, last7)).toBeNull();
  });

  it("should return a message when exactly 3 entries are in last7Days (minimum threshold)", () => {
    const history = [
      { date: "2026-03-09", score: 80, tier: "high" as const },
      { date: "2026-03-10", score: 70, tier: "mid" as const },
      { date: "2026-03-11", score: 60, tier: "mid" as const },
    ];
    const msg = calcWeeklyMomentumReport(history, last7);
    expect(msg).not.toBeNull();
    expect(msg).toContain("70"); // avg of 80+70+60=210 / 3 = 70
  });

  it("should compute correct avg score for a full 7-entry window", () => {
    const history = [
      { date: "2026-03-09", score: 80, tier: "high" as const },
      { date: "2026-03-10", score: 75, tier: "high" as const },
      { date: "2026-03-11", score: 90, tier: "high" as const },
      { date: "2026-03-12", score: 85, tier: "high" as const },
      { date: "2026-03-13", score: 70, tier: "mid" as const },
      { date: "2026-03-14", score: 95, tier: "high" as const },
      { date: "2026-03-15", score: 60, tier: "mid" as const },
    ];
    // avg = (80+75+90+85+70+95+60)/7 = 555/7 = 79.28 → rounds to 79
    const msg = calcWeeklyMomentumReport(history, last7);
    expect(msg).toContain("79");
    expect(msg).toContain("🔥"); // avg ≥75 → high tier lead
  });

  it("should show 🔥 lead emoji and tier counts for all-high week", () => {
    const history = last7.map(date => ({ date, score: 80, tier: "high" as const }));
    const msg = calcWeeklyMomentumReport(history, last7)!;
    expect(msg).toContain("🔥");
    expect(msg).toContain("🔥7"); // 7 high days
    expect(msg).not.toContain("✅");
    expect(msg).not.toContain("💪");
  });

  it("should show 💪 lead emoji for avg < 40 (low week)", () => {
    const history = last7.map(date => ({ date, score: 20, tier: "low" as const }));
    const msg = calcWeeklyMomentumReport(history, last7)!;
    expect(msg).toContain("💪");
    expect(msg).toContain("💪7"); // 7 low days
  });

  it("should show ✅ lead emoji for mid-tier avg (40–74)", () => {
    const history = last7.map(date => ({ date, score: 55, tier: "mid" as const }));
    const msg = calcWeeklyMomentumReport(history, last7)!;
    expect(msg).toContain("✅");
    expect(msg).toContain("✅7");
  });

  it("should include avg score in the message", () => {
    const history = [
      { date: "2026-03-09", score: 40, tier: "mid" as const },
      { date: "2026-03-10", score: 60, tier: "mid" as const },
      { date: "2026-03-11", score: 50, tier: "mid" as const },
    ];
    // avg = 50
    const msg = calcWeeklyMomentumReport(history, last7)!;
    expect(msg).toContain("50");
  });

  it("should ignore entries outside last7Days even if history is non-empty", () => {
    const history = [
      { date: "2026-03-01", score: 100, tier: "high" as const }, // outside window
      { date: "2026-03-09", score: 30, tier: "low" as const },
      { date: "2026-03-10", score: 20, tier: "low" as const },
      { date: "2026-03-11", score: 25, tier: "low" as const },
    ];
    const msg = calcWeeklyMomentumReport(history, last7)!;
    // avg of 30+20+25 = 75/3 = 25 → low tier
    expect(msg).toContain("25");
    expect(msg).toContain("💪");
  });

  it("should include mixed tier counts in parentheses", () => {
    const history = [
      { date: "2026-03-09", score: 80, tier: "high" as const },
      { date: "2026-03-10", score: 80, tier: "high" as const },
      { date: "2026-03-11", score: 55, tier: "mid" as const },
      { date: "2026-03-12", score: 55, tier: "mid" as const },
      { date: "2026-03-13", score: 55, tier: "mid" as const },
      { date: "2026-03-14", score: 20, tier: "low" as const },
      { date: "2026-03-15", score: 20, tier: "low" as const },
    ];
    const msg = calcWeeklyMomentumReport(history, last7)!;
    expect(msg).toContain("🔥2");
    expect(msg).toContain("✅3");
    expect(msg).toContain("💪2");
  });

  it("should omit tier parts with zero count from the distribution", () => {
    const history = [
      { date: "2026-03-09", score: 80, tier: "high" as const },
      { date: "2026-03-10", score: 60, tier: "mid" as const },
      { date: "2026-03-11", score: 55, tier: "mid" as const },
    ];
    const msg = calcWeeklyMomentumReport(history, last7)!;
    // no low days → 💪N should not appear in the dist part; avg=65 → ✅ lead so "💪" not in dist
    expect(msg).toContain("🔥1");
    expect(msg).toContain("✅2");
    expect(msg).not.toContain("💪"); // zero low days: 💪 omitted entirely (including dist, only ✅ lead)
  });

  it("should return 🔥 lead exactly at avg=75 boundary", () => {
    // avg = (75+75+75)/3 = 75 → 🔥 lead (≥75 threshold)
    const history = [
      { date: "2026-03-09", score: 75, tier: "high" as const },
      { date: "2026-03-10", score: 75, tier: "high" as const },
      { date: "2026-03-11", score: 75, tier: "high" as const },
    ];
    const msg = calcWeeklyMomentumReport(history, last7)!;
    expect(msg).toMatch(/^🔥/);
    expect(msg).toContain("75");
  });

  it("should return ✅ lead exactly at avg=74 (just below 🔥 threshold)", () => {
    // avg = (74+74+74)/3 = 74 → ✅ lead (<75)
    const history = [
      { date: "2026-03-09", score: 74, tier: "mid" as const },
      { date: "2026-03-10", score: 74, tier: "mid" as const },
      { date: "2026-03-11", score: 74, tier: "mid" as const },
    ];
    const msg = calcWeeklyMomentumReport(history, last7)!;
    expect(msg).toMatch(/^✅/);
    expect(msg).toContain("74");
  });

  it("should return ✅ lead exactly at avg=40 boundary", () => {
    // avg = (40+40+40)/3 = 40 → ✅ lead (≥40 threshold)
    const history = [
      { date: "2026-03-09", score: 40, tier: "mid" as const },
      { date: "2026-03-10", score: 40, tier: "mid" as const },
      { date: "2026-03-11", score: 40, tier: "mid" as const },
    ];
    const msg = calcWeeklyMomentumReport(history, last7)!;
    expect(msg).toMatch(/^✅/);
  });

  it("should return 💪 lead exactly at avg=39 (just below ✅ threshold)", () => {
    // avg = (39+39+39)/3 = 39 → 💪 lead (<40)
    const history = [
      { date: "2026-03-09", score: 39, tier: "low" as const },
      { date: "2026-03-10", score: 39, tier: "low" as const },
      { date: "2026-03-11", score: 39, tier: "low" as const },
    ];
    const msg = calcWeeklyMomentumReport(history, last7)!;
    expect(msg).toMatch(/^💪/);
  });
});

describe("calcMonthlyMomentumReport", () => {
  // February 2026: 28 days (non-leap year), window used as prevMonthDays
  const feb2026 = Array.from({ length: 28 }, (_, i) =>
    `2026-02-${String(i + 1).padStart(2, "0")}`,
  );

  it("should return null when history is empty", () => {
    expect(calcMonthlyMomentumReport([], feb2026)).toBeNull();
  });

  it("should return null when fewer than 10 entries fall within prevMonthDays", () => {
    const history = feb2026.slice(0, 9).map(date => ({ date, score: 80, tier: "high" as const }));
    expect(calcMonthlyMomentumReport(history, feb2026)).toBeNull();
  });

  it("should return a message when exactly 10 entries are present (minimum threshold)", () => {
    const history = feb2026.slice(0, 10).map(date => ({ date, score: 80, tier: "high" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026);
    expect(msg).not.toBeNull();
    expect(msg).toContain("80");
  });

  it("should compute correct avg score across a full 28-day February window", () => {
    // avg = (28 * 60) / 28 = 60
    const history = feb2026.map(date => ({ date, score: 60, tier: "mid" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toContain("60");
    expect(msg).toContain("✅"); // avg 40–74 → ✅ lead
  });

  it("should return 🔥 lead message for monthly avg ≥75", () => {
    const history = feb2026.map(date => ({ date, score: 80, tier: "high" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toMatch(/^🔥/);
    expect(msg).toContain("최고의 한 달");
  });

  it("should return ✅ lead message for monthly avg 40–74", () => {
    const history = feb2026.map(date => ({ date, score: 55, tier: "mid" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toMatch(/^✅/);
    expect(msg).toContain("잘 하고 있어요");
  });

  it("should return 💪 lead message for monthly avg <40", () => {
    const history = feb2026.map(date => ({ date, score: 20, tier: "low" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toMatch(/^💪/);
    expect(msg).toContain("이번 달엔 더 힘내봐요");
  });

  it("should include tier distribution counts in the message", () => {
    const history = [
      ...feb2026.slice(0, 10).map(date => ({ date, score: 80, tier: "high" as const })),
      ...feb2026.slice(10, 20).map(date => ({ date, score: 55, tier: "mid" as const })),
      ...feb2026.slice(20, 28).map(date => ({ date, score: 20, tier: "low" as const })),
    ];
    // avg = (10*80 + 10*55 + 8*20) / 28 = (800+550+160)/28 = 1510/28 ≈ 53.9 → 54 → ✅
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toContain("🔥10");
    expect(msg).toContain("✅10");
    expect(msg).toContain("💪8");
  });

  it("should omit tier parts with zero count from distribution", () => {
    const history = feb2026.slice(0, 15).map(date => ({ date, score: 80, tier: "high" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toContain("🔥15");
    expect(msg).not.toContain("✅");
    expect(msg).not.toContain("💪");
  });

  it("should ignore entries outside prevMonthDays even if history is large", () => {
    const history = [
      ...feb2026.slice(0, 10).map(date => ({ date, score: 20, tier: "low" as const })),
      // outside window entries that would inflate avg if not ignored
      { date: "2026-01-15", score: 100, tier: "high" as const },
      { date: "2026-03-01", score: 100, tier: "high" as const },
    ];
    // only 10 in-window entries at score=20 → avg=20 → 💪
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toMatch(/^💪/);
    expect(msg).toContain("20");
  });

  it("should return 🔥 lead exactly at avg=75 boundary", () => {
    // 10 entries at score 75 each → avg = 75
    const history = feb2026.slice(0, 10).map(date => ({ date, score: 75, tier: "high" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toMatch(/^🔥/);
    expect(msg).toContain("75");
  });

  it("should return ✅ lead exactly at avg=74 (just below 🔥 threshold)", () => {
    const history = feb2026.slice(0, 10).map(date => ({ date, score: 74, tier: "mid" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toMatch(/^✅/);
    expect(msg).toContain("74");
  });

  it("should return ✅ lead exactly at avg=40 boundary", () => {
    const history = feb2026.slice(0, 10).map(date => ({ date, score: 40, tier: "mid" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toMatch(/^✅/);
  });

  it("should return 💪 lead exactly at avg=39 (just below ✅ threshold)", () => {
    const history = feb2026.slice(0, 10).map(date => ({ date, score: 39, tier: "low" as const }));
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).toMatch(/^💪/);
  });

  it("should handle a 31-day January window (maximum prevMonthDays length matching MOMENTUM_HISTORY_CAP)", () => {
    // January 2026: 31 days. All 31 entries fit exactly at the cap.
    const jan2026 = Array.from({ length: 31 }, (_, i) =>
      `2026-01-${String(i + 1).padStart(2, "0")}`,
    );
    const history = jan2026.map(date => ({ date, score: 80, tier: "high" as const }));
    const msg = calcMonthlyMomentumReport(history, jan2026)!;
    expect(msg).toMatch(/^🔥/);
    expect(msg).toContain("80");
    expect(msg).toContain("🔥31"); // all 31 days are high
  });

  it("should exclude a current-month entry (e.g. the 1st) that falls outside prevMonthDays", () => {
    // Simulate: on March 1st, history may include a 2026-03-01 entry alongside Feb entries.
    // prevMonthDays = February — 2026-03-01 must be excluded by the window filter.
    const history = [
      ...feb2026.slice(0, 10).map(date => ({ date, score: 80, tier: "high" as const })),
      { date: "2026-03-01", score: 100, tier: "high" as const }, // today (1st of current month)
    ];
    // Only 10 Feb entries are in window → avg = 80
    const msg = calcMonthlyMomentumReport(history, feb2026)!;
    expect(msg).not.toBeNull();
    expect(msg).toContain("80");
    // Tier distribution should show exactly 10 high days, not 11
    expect(msg).toContain("🔥10");
  });
});

describe("calcQuarterlyMomentumReport", () => {
  // prevQtrDays = all 92 days of Q4 2024 (Oct 1 – Dec 31).
  // Oct: 31 days, Nov: 30 days, Dec: 31 days = 92 total.
  // Design note: momentumHistory is capped at 31 entries (MOMENTUM_HISTORY_CAP), so at most the
  // last ≤31 days of the quarter will match. Minimum-entry threshold (10) is shared with
  // calcMonthlyMomentumReport for the same reason — the effective data window is ≤31 days.
  const Q4_2024: string[] = [
    ...Array.from({ length: 31 }, (_, i) => `2024-10-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 30 }, (_, i) => `2024-11-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 31 }, (_, i) => `2024-12-${String(i + 1).padStart(2, "0")}`),
  ];

  it("should return null when history is empty", () => {
    expect(calcQuarterlyMomentumReport([], Q4_2024)).toBeNull();
  });

  it("should return null when fewer than 10 entries fall within prevQtrDays", () => {
    // slice(61, 70) = 9 entries (one below the 10-entry minimum threshold)
    const history = Q4_2024.slice(61, 70).map(date => ({ date, score: 80, tier: "high" as const }));
    expect(calcQuarterlyMomentumReport(history, Q4_2024)).toBeNull();
  });

  it("should return a message when exactly 10 entries are present (minimum threshold)", () => {
    const history = Q4_2024.slice(82, 92).map(date => ({ date, score: 80, tier: "high" as const }));
    const msg = calcQuarterlyMomentumReport(history, Q4_2024);
    expect(msg).not.toBeNull();
    expect(msg).toContain("80");
  });

  it("should return 🔥 lead message for quarterly avg ≥75", () => {
    const history = Q4_2024.slice(82).map(date => ({ date, score: 80, tier: "high" as const }));
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    expect(msg).toMatch(/^🔥/);
    expect(msg).toContain("최고의 한 분기");
  });

  it("should return ✅ lead message for quarterly avg 40–74", () => {
    const history = Q4_2024.slice(82).map(date => ({ date, score: 55, tier: "mid" as const }));
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    expect(msg).toMatch(/^✅/);
    expect(msg).toContain("잘 하고 있어요");
  });

  it("should return 💪 lead message for quarterly avg <40", () => {
    const history = Q4_2024.slice(82).map(date => ({ date, score: 20, tier: "low" as const }));
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    expect(msg).toMatch(/^💪/);
    expect(msg).toContain("이번 분기엔 더 힘내봐요");
  });

  it("should include tier distribution counts in the message", () => {
    const history = [
      ...Q4_2024.slice(72, 82).map(date => ({ date, score: 80, tier: "high" as const })),
      ...Q4_2024.slice(82, 87).map(date => ({ date, score: 55, tier: "mid" as const })),
      ...Q4_2024.slice(87, 92).map(date => ({ date, score: 20, tier: "low" as const })),
    ];
    // 10 high, 5 mid, 5 low in window — all within Q4_2024
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    expect(msg).toContain("🔥10");
    expect(msg).toContain("✅5");
    expect(msg).toContain("💪5");
  });

  it("should omit tier parts with zero count from distribution", () => {
    const history = Q4_2024.slice(82).map(date => ({ date, score: 80, tier: "high" as const }));
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    // Only high-tier entries — no ✅ or 💪 in tier distribution
    expect(msg).not.toMatch(/✅\d/);
    expect(msg).not.toMatch(/💪\d/);
    expect(msg).toContain("🔥10");
  });

  it("should ignore entries outside prevQtrDays even if history is large", () => {
    const history = [
      ...Q4_2024.slice(82, 92).map(date => ({ date, score: 20, tier: "low" as const })),
      // outside window — must not affect avg or tier counts
      { date: "2025-01-01", score: 100, tier: "high" as const },
      { date: "2024-09-30", score: 100, tier: "high" as const },
    ];
    // only 10 in-window entries at score=20 → avg=20 → 💪
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    expect(msg).toMatch(/^💪/);
    expect(msg).toContain("20");
  });

  it("should return 🔥 lead exactly at avg=75 boundary", () => {
    const history = Q4_2024.slice(82, 92).map(date => ({ date, score: 75, tier: "high" as const }));
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    expect(msg).toMatch(/^🔥/);
    expect(msg).toContain("75");
  });

  it("should return ✅ lead exactly at avg=74 (just below 🔥 threshold)", () => {
    const history = Q4_2024.slice(82, 92).map(date => ({ date, score: 74, tier: "mid" as const }));
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    expect(msg).toMatch(/^✅/);
    expect(msg).toContain("74");
  });

  it("should return ✅ lead exactly at avg=40 boundary", () => {
    const history = Q4_2024.slice(82, 92).map(date => ({ date, score: 40, tier: "mid" as const }));
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    expect(msg).toMatch(/^✅/);
  });

  it("should return 💪 lead exactly at avg=39 (just below ✅ threshold)", () => {
    const history = Q4_2024.slice(82, 92).map(date => ({ date, score: 39, tier: "low" as const }));
    const msg = calcQuarterlyMomentumReport(history, Q4_2024)!;
    expect(msg).toMatch(/^💪/);
  });

  it("should work correctly with Q1 window (Jan–Mar 2025, 90 days) and exclude Feb 29 from non-leap year", () => {
    // Q1 2025: Jan 31 + Feb 28 (non-leap) + Mar 31 = 90 days. "2025-02-29" does not exist.
    const Q1_2025: string[] = [
      ...Array.from({ length: 31 }, (_, i) => `2025-01-${String(i + 1).padStart(2, "0")}`),
      ...Array.from({ length: 28 }, (_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`),
      ...Array.from({ length: 31 }, (_, i) => `2025-03-${String(i + 1).padStart(2, "0")}`),
    ];
    expect(Q1_2025).toHaveLength(90); // not 91 (no Feb 29 in 2025)
    expect(Q1_2025).not.toContain("2025-02-29"); // non-leap year guard
    // 10 entries in Mar 22–31 — all within Q1_2025 window
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2025-03-${String(i + 22).padStart(2, "0")}`, score: 80, tier: "high" as const }),
    );
    const msg = calcQuarterlyMomentumReport(history, Q1_2025)!;
    expect(msg).toMatch(/^🔥/);
    expect(msg).toContain("지난 분기");
    expect(msg).toContain("🔥10");
  });
});

describe("calcMomentumMorningReminder", () => {
  it("should return null when history is empty", () => {
    expect(calcMomentumMorningReminder([], "2026-03-18")).toBeNull();
  });

  it("should return null when no entry exists for yesterdayStr", () => {
    const history = [{ date: "2026-03-16", score: 80, tier: "high" as const }];
    expect(calcMomentumMorningReminder(history, "2026-03-17")).toBeNull();
  });

  it("should return null when yesterday's score is zero", () => {
    const history = [{ date: "2026-03-17", score: 0, tier: "low" as const }];
    expect(calcMomentumMorningReminder(history, "2026-03-17")).toBeNull();
  });

  it("should return null when yesterday's score is negative (defensive guard)", () => {
    const history = [{ date: "2026-03-17", score: -1, tier: "low" as const }];
    expect(calcMomentumMorningReminder(history, "2026-03-17")).toBeNull();
  });

  it("should return 🔥 message with score for high tier", () => {
    const history = [{ date: "2026-03-17", score: 82, tier: "high" as const }];
    const msg = calcMomentumMorningReminder(history, "2026-03-17");
    expect(msg).not.toBeNull();
    expect(msg).toContain("🔥");
    expect(msg).toContain("82");
  });

  it("should return ✅ message with score for mid tier", () => {
    const history = [{ date: "2026-03-17", score: 55, tier: "mid" as const }];
    const msg = calcMomentumMorningReminder(history, "2026-03-17");
    expect(msg).not.toBeNull();
    expect(msg).toContain("✅");
    expect(msg).toContain("55");
  });

  it("should return 💪 message with score for low tier", () => {
    const history = [{ date: "2026-03-17", score: 20, tier: "low" as const }];
    const msg = calcMomentumMorningReminder(history, "2026-03-17");
    expect(msg).not.toBeNull();
    expect(msg).toContain("💪");
    expect(msg).toContain("20");
  });

  it("should use only the entry for yesterdayStr and ignore other dates", () => {
    const history = [
      { date: "2026-03-16", score: 90, tier: "high" as const },
      { date: "2026-03-17", score: 30, tier: "low" as const },
      { date: "2026-03-18", score: 80, tier: "high" as const },
    ];
    const msg = calcMomentumMorningReminder(history, "2026-03-17");
    expect(msg).toContain("💪");
    expect(msg).toContain("30");
    expect(msg).not.toContain("90");
    expect(msg).not.toContain("80");
  });
});

describe("calcYearlyMomentumReport", () => {
  // prevYearDays = all 366 days of 2024 (Jan 1 – Dec 31, leap year).
  // Jan: 31, Feb: 29 (leap), Mar: 31, Apr: 30, May: 31, Jun: 30,
  // Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31 = 366 total.
  // Design note: momentumHistory is capped at 31 entries (MOMENTUM_HISTORY_CAP), so at most the
  // last ≤31 days of the year (Dec 2024) will match. Minimum-entry threshold (10) is shared with
  // calcMonthlyMomentumReport / calcQuarterlyMomentumReport for the same reason.
  const YEAR_2024: string[] = [
    ...Array.from({ length: 31 }, (_, i) => `2024-01-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 29 }, (_, i) => `2024-02-${String(i + 1).padStart(2, "0")}`), // leap year
    ...Array.from({ length: 31 }, (_, i) => `2024-03-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 30 }, (_, i) => `2024-04-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 31 }, (_, i) => `2024-05-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 30 }, (_, i) => `2024-06-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 31 }, (_, i) => `2024-07-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 31 }, (_, i) => `2024-08-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 30 }, (_, i) => `2024-09-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 31 }, (_, i) => `2024-10-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 30 }, (_, i) => `2024-11-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 31 }, (_, i) => `2024-12-${String(i + 1).padStart(2, "0")}`),
  ];

  it("should return null when history is empty", () => {
    expect(calcYearlyMomentumReport([], YEAR_2024)).toBeNull();
  });

  it("should return null when fewer than 10 entries fall within prevYearDays", () => {
    // 9 entries from Dec 23–31 (one below the 10-entry minimum threshold)
    const history = Array.from({ length: 9 }, (_, i) =>
      ({ date: `2024-12-${String(i + 23).padStart(2, "0")}`, score: 80, tier: "high" as const }),
    );
    expect(calcYearlyMomentumReport(history, YEAR_2024)).toBeNull();
  });

  it("should return a message when exactly 10 entries are present (minimum threshold)", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 80, tier: "high" as const }),
    );
    const msg = calcYearlyMomentumReport(history, YEAR_2024);
    expect(msg).not.toBeNull();
    expect(msg).toContain("80");
  });

  it("should return 🔥 lead message for yearly avg ≥75", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 80, tier: "high" as const }),
    );
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    expect(msg).toMatch(/^🔥/);
    expect(msg).toContain("최고의 한 해");
  });

  it("should return ✅ lead message for yearly avg 40–74", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 55, tier: "mid" as const }),
    );
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    expect(msg).toMatch(/^✅/);
    expect(msg).toContain("잘 하고 있어요");
  });

  it("should return 💪 lead message for yearly avg <40", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 20, tier: "low" as const }),
    );
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    expect(msg).toMatch(/^💪/);
    expect(msg).toContain("이번 해엔 더 힘내봐요");
  });

  it("should include tier distribution counts in the message", () => {
    const history = [
      ...Array.from({ length: 10 }, (_, i) =>
        ({ date: `2024-12-${String(i + 1).padStart(2, "0")}`, score: 80, tier: "high" as const })),
      ...Array.from({ length: 5 }, (_, i) =>
        ({ date: `2024-12-${String(i + 11).padStart(2, "0")}`, score: 55, tier: "mid" as const })),
      ...Array.from({ length: 5 }, (_, i) =>
        ({ date: `2024-12-${String(i + 16).padStart(2, "0")}`, score: 20, tier: "low" as const })),
    ];
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    expect(msg).toContain("🔥10");
    expect(msg).toContain("✅5");
    expect(msg).toContain("💪5");
  });

  it("should omit tier parts with zero count from distribution", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 80, tier: "high" as const }),
    );
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    // Only high-tier entries — no ✅ or 💪 in tier distribution
    expect(msg).not.toMatch(/✅\d/);
    expect(msg).not.toMatch(/💪\d/);
    expect(msg).toContain("🔥10");
  });

  it("should ignore entries outside prevYearDays even if history is large", () => {
    const history = [
      ...Array.from({ length: 10 }, (_, i) =>
        ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 20, tier: "low" as const })),
      // outside window — must not affect avg or tier counts
      { date: "2025-01-01", score: 100, tier: "high" as const },
      { date: "2023-12-31", score: 100, tier: "high" as const },
    ];
    // only 10 in-window entries at score=20 → avg=20 → 💪
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    expect(msg).toMatch(/^💪/);
    expect(msg).toContain("20");
  });

  it("should return 🔥 lead exactly at avg=75 boundary", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 75, tier: "high" as const }),
    );
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    expect(msg).toMatch(/^🔥/);
    expect(msg).toContain("75");
  });

  it("should return ✅ lead exactly at avg=74 (just below 🔥 threshold)", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 74, tier: "mid" as const }),
    );
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    expect(msg).toMatch(/^✅/);
    expect(msg).toContain("74");
  });

  it("should return ✅ lead exactly at avg=40 boundary", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 40, tier: "mid" as const }),
    );
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    expect(msg).toMatch(/^✅/);
  });

  it("should return 💪 lead exactly at avg=39 (just below ✅ threshold)", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      ({ date: `2024-12-${String(i + 22).padStart(2, "0")}`, score: 39, tier: "low" as const }),
    );
    const msg = calcYearlyMomentumReport(history, YEAR_2024)!;
    expect(msg).toMatch(/^💪/);
  });

  it("should include Feb 29 in the 2024 leap year window (366 days total)", () => {
    expect(YEAR_2024).toHaveLength(366);
    expect(YEAR_2024).toContain("2024-02-29");
    expect(YEAR_2024).not.toContain("2024-02-30");
    // Pure-function test: verifies that prevYearDays correctly includes Feb 29 for a leap year
    // and that calcYearlyMomentumReport counts it. In production the 31-day history cap means
    // Feb 29 entries would have been evicted by Jan 1 of the next year, but this test confirms
    // the filtering logic handles arbitrary dates within the window correctly.
    const history = [
      ...Array.from({ length: 9 }, (_, i) =>
        ({ date: `2024-12-${String(i + 23).padStart(2, "0")}`, score: 80, tier: "high" as const })),
      { date: "2024-02-29", score: 80, tier: "high" as const },
    ];
    const msg = calcYearlyMomentumReport(history, YEAR_2024);
    expect(msg).not.toBeNull();
    expect(msg).toContain("🔥10");
  });
});

// ─── calcDayOfWeekMomentumAvg ────────────────────────────────────────────────
// 14-day window: 2024-01-15 (Mon) … 2024-01-28 (Sun). Each weekday appears exactly twice.
// Sun=0: 01-21,01-28 | Mon=1: 01-15,01-22 | Tue=2: 01-16,01-23 | Wed=3: 01-17,01-24
// Thu=4: 01-18,01-25 | Fri=5: 01-19,01-26 | Sat=6: 01-20,01-27
// toLocaleDateString("sv") keeps dates in local time to match the T00:00:00 parse convention
// used throughout the codebase (same as the cap-test fixtures above).
const DOW_WINDOW_14 = Array.from({ length: 14 }, (_, i) => {
  const d = new Date("2024-01-15T00:00:00");
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString("sv");
});

describe("calcDayOfWeekMomentumAvg", () => {
  it("returns all-null for empty history", () => {
    const result = calcDayOfWeekMomentumAvg([], DOW_WINDOW_14);
    expect(Object.values(result).every(v => v === null)).toBe(true);
  });

  it("returns all-null for empty dayWindow", () => {
    const history = [{ date: "2024-01-15", score: 80, tier: "high" as const }];
    const result = calcDayOfWeekMomentumAvg(history, []);
    expect(Object.values(result).every(v => v === null)).toBe(true);
  });

  it("returns null for a DoW with fewer than 2 history entries", () => {
    // Mon (1): only 01-15 has an entry; 01-22 is absent → 1 entry < MIN=2 → null
    const history = [{ date: "2024-01-15", score: 30, tier: "low" as const }];
    const result = calcDayOfWeekMomentumAvg(history, DOW_WINDOW_14);
    expect(result[1]).toBeNull();
  });

  it("computes average for a DoW with exactly 2 history entries", () => {
    // Mon (1): 01-15 score=30, 01-22 score=50 → avg = 40
    const history = [
      { date: "2024-01-15", score: 30, tier: "low" as const },
      { date: "2024-01-22", score: 50, tier: "mid" as const },
    ];
    const result = calcDayOfWeekMomentumAvg(history, DOW_WINDOW_14);
    expect(result[1]).toBe(40);
  });

  it("excludes entries outside the dayWindow", () => {
    // 2024-01-08 is Mon but outside DOW_WINDOW_14 → only 01-15+01-22 count
    const history = [
      { date: "2024-01-08", score: 10, tier: "low" as const },
      { date: "2024-01-15", score: 50, tier: "mid" as const },
      { date: "2024-01-22", score: 70, tier: "mid" as const },
    ];
    const result = calcDayOfWeekMomentumAvg(history, DOW_WINDOW_14);
    expect(result[1]).toBe(60); // (50+70)/2 = 60
  });

  it("does not treat absent days as score 0", () => {
    // Mon (1): 01-15 present, 01-22 absent → 1 entry < MIN=2 → null (not avg of (80, 0))
    const history = [{ date: "2024-01-15", score: 80, tier: "high" as const }];
    const result = calcDayOfWeekMomentumAvg(history, DOW_WINDOW_14);
    expect(result[1]).toBeNull();
  });

  it("computes averages for multiple days-of-week independently", () => {
    // Mon(1): 01-15=30, 01-22=50 → avg=40; Wed(3): 01-17=80, 01-24=100 → avg=90; Tue(2)=null
    const history = [
      { date: "2024-01-15", score: 30, tier: "low" as const },
      { date: "2024-01-22", score: 50, tier: "mid" as const },
      { date: "2024-01-17", score: 80, tier: "high" as const },
      { date: "2024-01-24", score: 100, tier: "high" as const },
    ];
    const result = calcDayOfWeekMomentumAvg(history, DOW_WINDOW_14);
    expect(result[1]).toBe(40);
    expect(result[3]).toBe(90);
    expect(result[2]).toBeNull();
  });
});

// ─── calcWeakMomentumDay ──────────────────────────────────────────────────────
describe("calcWeakMomentumDay", () => {
  it("returns null when all rates are null", () => {
    expect(calcWeakMomentumDay({ 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null })).toBeNull();
  });

  it("returns the DoW when avg is strictly below threshold 40", () => {
    expect(calcWeakMomentumDay({ 0: null, 1: 30, 2: null, 3: null, 4: null, 5: null, 6: null })).toBe(1);
  });

  it("returns null when avg is exactly at threshold 40 (not strictly below)", () => {
    expect(calcWeakMomentumDay({ 0: null, 1: 40, 2: null, 3: null, 4: null, 5: null, 6: null })).toBeNull();
  });

  it("returns the lowest DoW on a tie", () => {
    // dow 2 and dow 4 both 25; lowest dow (2) wins
    expect(calcWeakMomentumDay({ 0: null, 1: null, 2: 25, 3: null, 4: 25, 5: null, 6: null })).toBe(2);
  });

  it("returns the DoW with the lowest avg below threshold when multiple qualify", () => {
    // dow1=35, dow3=20 (both below 40); dow3 wins because 20 < 35
    expect(calcWeakMomentumDay({ 0: null, 1: 35, 2: null, 3: 20, 4: null, 5: null, 6: null })).toBe(3);
  });
});

// ─── calcBestMomentumDay ──────────────────────────────────────────────────────
describe("calcBestMomentumDay", () => {
  it("returns null when all rates are null", () => {
    expect(calcBestMomentumDay({ 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null })).toBeNull();
  });

  it("returns the DoW when avg meets threshold 65", () => {
    expect(calcBestMomentumDay({ 0: null, 1: 65, 2: null, 3: null, 4: null, 5: null, 6: null })).toBe(1);
  });

  it("returns null when avg is below threshold 65", () => {
    expect(calcBestMomentumDay({ 0: null, 1: 64, 2: null, 3: null, 4: null, 5: null, 6: null })).toBeNull();
  });

  it("returns the lowest DoW on a tie", () => {
    // dow 3 and dow 5 both at 70; lowest dow (3) wins
    expect(calcBestMomentumDay({ 0: null, 1: null, 2: null, 3: 70, 4: null, 5: 70, 6: null })).toBe(3);
  });

  it("returns the DoW with the highest avg at or above threshold when multiple qualify", () => {
    // dow1=65, dow3=80 (both ≥ 65); dow3 wins because 80 > 65
    expect(calcBestMomentumDay({ 0: null, 1: 65, 2: null, 3: 80, 4: null, 5: null, 6: null })).toBe(3);
  });
});
