// ABOUTME: Unit tests for calcCompletionConfidence — real-time daily routine completion probability
// ABOUTME: Covers per-pillar rate computation, active-day denominator, min-data threshold, pillar exclusion, and today-done boost

import { describe, it, expect } from "vitest";
import { calcCompletionConfidence, LOOKBACK_DAYS, type CompletionConfidenceParams } from "./completionConfidence";

const TODAY = "2026-03-22";

/** Returns YYYY-MM-DD string for N days before TODAY (UTC-safe). */
function daysAgo(n: number): string {
  const [y, m, d] = TODAY.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

function makeParams(overrides: Partial<CompletionConfidenceParams> = {}): CompletionConfidenceParams {
  return {
    habits: [],
    intentionHistory: [],
    pomodoroHistory: [],
    pomodoroGoal: 0,
    todayStr: TODAY,
    intentionText: undefined,
    intentionDate: undefined,
    pomodoroSessions: 0,
    pomodoroSessionsDate: undefined,
    ...overrides,
  };
}

describe("calcCompletionConfidence", () => {
  // ── Insufficient data → null ────────────────────────────────────────────────

  it("should return null when no historical data exists", () => {
    const result = calcCompletionConfidence(makeParams());
    expect(result).toBeNull();
  });

  it("should return null when fewer than 3 active days in lookback window", () => {
    const result = calcCompletionConfidence(makeParams({
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
      ],
    }));
    expect(result).toBeNull();
  });

  it("should return non-null when exactly 3 active days exist", () => {
    const result = calcCompletionConfidence(makeParams({
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
      ],
    }));
    expect(result).not.toBeNull();
  });

  // ── All done today → 100 ───────────────────────────────────────────────────

  it("should return 100 when all pillars are done today", () => {
    const result = calcCompletionConfidence(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      habits: [
        { lastChecked: TODAY, checkHistory: [daysAgo(1), daysAgo(2), daysAgo(3)] },
      ],
      pomodoroGoal: 4,
      pomodoroSessions: 4,
      pomodoroSessionsDate: TODAY,
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
      ],
      pomodoroHistory: [
        { date: daysAgo(1), count: 4 },
        { date: daysAgo(2), count: 4 },
        { date: daysAgo(3), count: 4 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(100);
  });

  // ── Intention rate computation ──────────────────────────────────────────────

  it("should compute intention rate as fraction of active days with intention set", () => {
    // 3 active days (via intentionHistory), 2 of which have intentions → rate = 2/3
    const result = calcCompletionConfidence(makeParams({
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        // daysAgo(3) has no intention but IS an active day (via pomodoroHistory)
      ],
      pomodoroHistory: [
        { date: daysAgo(3), count: 0 },
      ],
    }));
    expect(result).not.toBeNull();
    // intention not done today, so pillar contribution = rate = 2/3 ≈ 67%
    expect(result!.pct).toBeCloseTo(67, 0);
  });

  // ── Habits rate computation ─────────────────────────────────────────────────

  it("should compute habits rate as fraction of active days with ALL habits checked", () => {
    // 2 habits, 4 active days. habit1 checked on all 4; habit2 checked on 2 of 4.
    // ALL-checked days: daysAgo(1) and daysAgo(3) → 2/4 = 50%
    const result = calcCompletionConfidence(makeParams({
      habits: [
        { lastChecked: undefined, checkHistory: [daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)] },
        { lastChecked: undefined, checkHistory: [daysAgo(1), daysAgo(3)] },
      ],
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
        { date: daysAgo(4), text: "D" },
      ],
    }));
    expect(result).not.toBeNull();
    // intention: 4/4 = 100%, habits: 2/4 = 50%, pomodoro excluded (goal=0)
    // overall = 100% × 50% = 50
    expect(result!.pct).toBe(50);
  });

  // ── Pomodoro rate computation ───────────────────────────────────────────────

  it("should compute pomodoro rate as fraction of active days where goal was met", () => {
    // 4 active days, 3 met goal of 4 sessions → rate = 3/4 = 75%
    const result = calcCompletionConfidence(makeParams({
      pomodoroGoal: 4,
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
        { date: daysAgo(4), text: "D" },
      ],
      pomodoroHistory: [
        { date: daysAgo(1), count: 5 },
        { date: daysAgo(2), count: 4 },
        { date: daysAgo(3), count: 2 },
        { date: daysAgo(4), count: 6 },
      ],
    }));
    expect(result).not.toBeNull();
    // intention: 4/4=100%, habits excluded (empty), pomodoro: 3/4=75%
    // overall = 100% × 75% = 75
    expect(result!.pct).toBe(75);
  });

  // ── Pillar exclusion ────────────────────────────────────────────────────────

  it("should exclude pomodoro pillar when pomodoroGoal is 0", () => {
    // Only intention active. 3/3 active days with intention → 100%
    const result = calcCompletionConfidence(makeParams({
      pomodoroGoal: 0,
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(100);
  });

  it("should exclude habits pillar when habits array is empty", () => {
    // Only intention active. 2/4 active days with intention → 50%
    const result = calcCompletionConfidence(makeParams({
      habits: [],
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
      ],
      pomodoroHistory: [
        { date: daysAgo(3), count: 0 },
        { date: daysAgo(4), count: 0 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(50);
  });

  // ── Today-done boost ────────────────────────────────────────────────────────

  it("should boost pillar to 100% when done today", () => {
    // Historical intention rate: 2/4 = 50%. But intention is set today → 100%.
    // Historical pomodoro rate: 2/4 = 50%. Goal not met today → use rate.
    // Habits excluded (empty). Overall = 100% × 50% = 50.
    const result = calcCompletionConfidence(makeParams({
      intentionText: "Focus",
      intentionDate: TODAY,
      pomodoroGoal: 4,
      pomodoroSessions: 1,
      pomodoroSessionsDate: TODAY,
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
      ],
      pomodoroHistory: [
        { date: daysAgo(1), count: 5 },
        { date: daysAgo(2), count: 1 },
        { date: daysAgo(3), count: 6 },
        { date: daysAgo(4), count: 2 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(50);
  });

  // ── Multi-pillar multiplication ─────────────────────────────────────────────

  it("should multiply per-pillar rates for overall confidence", () => {
    // 4 active days. intention: 4/4=100%, habits: 2/4=50%, pomodoro: 2/4=50%
    // None done today. Overall = 100% × 50% × 50% = 25
    const result = calcCompletionConfidence(makeParams({
      pomodoroGoal: 4,
      habits: [
        { lastChecked: undefined, checkHistory: [daysAgo(1), daysAgo(2)] },
      ],
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
        { date: daysAgo(4), text: "D" },
      ],
      pomodoroHistory: [
        { date: daysAgo(1), count: 5 },
        { date: daysAgo(2), count: 1 },
        { date: daysAgo(3), count: 6 },
        { date: daysAgo(4), count: 2 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(25);
  });

  // ── Lookback window boundary ────────────────────────────────────────────────

  it("should ignore data older than LOOKBACK_DAYS", () => {
    // daysAgo(LOOKBACK_DAYS + 1) and beyond should be excluded from rate calculation
    const result = calcCompletionConfidence(makeParams({
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
        { date: daysAgo(LOOKBACK_DAYS + 1), text: "old" },
        { date: daysAgo(LOOKBACK_DAYS + 6), text: "older" },
      ],
    }));
    expect(result).not.toBeNull();
    // Only 3 active days (daysAgo 1-3), intention rate = 3/3 = 100%
    expect(result!.pct).toBe(100);
  });

  // ── Today excluded from historical window ──────────────────────────────────

  it("should not count today as a historical day", () => {
    // Data only for today — no past data → should be null (< 3 active days)
    const result = calcCompletionConfidence(makeParams({
      intentionHistory: [
        { date: TODAY, text: "Today" },
      ],
    }));
    expect(result).toBeNull();
  });

  it("should exclude today entry from rate when past entries also exist", () => {
    // Today's intentionHistory entry must not inflate the rate (it would add 1 to both
    // numerator and denominator if mistakenly included in the window).
    // 3 past active days + today entry → activeDays should still be 3 (not 4).
    // Intention rate = 3/3 = 100%.
    const result = calcCompletionConfidence(makeParams({
      intentionHistory: [
        { date: TODAY, text: "Today" },
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(100);
  });

  // ── Stale pomodoro date ─────────────────────────────────────────────────────

  it("should treat stale pomodoroSessionsDate as not done today", () => {
    // pomodoroSessions=10 but date is yesterday → pomodoro not done today.
    // Historical pomodoro rate is 1/3 (only 1 of 3 days met goal).
    // If staleness guard were broken and today counted as done, pct would be 100 (1.0 × 1.0).
    // Correct: intention done (100%) × pomodoro rate (1/3 ≈ 33%) = 33%.
    const result = calcCompletionConfidence(makeParams({
      pomodoroGoal: 4,
      pomodoroSessions: 10,
      pomodoroSessionsDate: daysAgo(1),
      intentionText: "Focus",
      intentionDate: TODAY,
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
      ],
      pomodoroHistory: [
        { date: daysAgo(1), count: 5 },
        { date: daysAgo(2), count: 1 },
        { date: daysAgo(3), count: 2 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(33);
  });

  // ── Return shape ────────────────────────────────────────────────────────────

  it("should return pct as integer between 0 and 100", () => {
    const result = calcCompletionConfidence(makeParams({
      pomodoroGoal: 4,
      habits: [
        { lastChecked: undefined, checkHistory: [daysAgo(1)] },
      ],
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
        { date: daysAgo(4), text: "D" },
      ],
      pomodoroHistory: [
        { date: daysAgo(1), count: 5 },
        { date: daysAgo(2), count: 1 },
        { date: daysAgo(3), count: 1 },
        { date: daysAgo(4), count: 1 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(Number.isInteger(result!.pct)).toBe(true);
    expect(result!.pct).toBeGreaterThanOrEqual(0);
    expect(result!.pct).toBeLessThanOrEqual(100);
  });

  // ── Cross-pillar denominator behavior ─────────────────────────────────────

  it("should count pomodoro-only days in denominator for other pillar rates", () => {
    // 2 days with intention + 2 days with pomodoro only → 4 active days total.
    // Intention rate = 2/4 = 50%. Pomodoro rate = 2/4 = 50%.
    // Overall = 50% × 50% = 25%.
    const result = calcCompletionConfidence(makeParams({
      pomodoroGoal: 4,
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
      ],
      pomodoroHistory: [
        { date: daysAgo(3), count: 5 },
        { date: daysAgo(4), count: 6 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(25);
  });

  // ── Zero-rate intention with excluded pillars ──────────────────────────────

  it("should return 0 when intention rate is 0% and other pillars are excluded", () => {
    // Habits excluded (empty), pomodoro excluded (goal=0).
    // Active days come from pomodoroHistory, but intention has no entries → rate = 0/3 = 0%.
    // Overall = 0%.
    const result = calcCompletionConfidence(makeParams({
      habits: [],
      pomodoroGoal: 0,
      pomodoroHistory: [
        { date: daysAgo(1), count: 5 },
        { date: daysAgo(2), count: 5 },
        { date: daysAgo(3), count: 5 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(0);
  });

  // ── Empty-text intention should not inflate rate ──────────────────────────

  it("should not count intention entries with empty text as set", () => {
    // 4 active days via pomodoro. intention: only 1 with truthy text on daysAgo(1).
    // Empty-text entries are excluded from intentionDates (numerator), but their days
    // remain in activeDays via pomodoro (denominator is the cross-pillar union).
    // intention rate = 1/4 = 25%. Pomodoro excluded (goal=0). Overall = 25%.
    const result = calcCompletionConfidence(makeParams({
      intentionHistory: [
        { date: daysAgo(1), text: "Real" },
        { date: daysAgo(2), text: "" },
        { date: daysAgo(3), text: "" },
      ],
      pomodoroHistory: [
        { date: daysAgo(1), count: 1 },
        { date: daysAgo(2), count: 1 },
        { date: daysAgo(3), count: 1 },
        { date: daysAgo(4), count: 1 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(25);
  });

  // ── Habits present but no checkHistory → habitsRate = 0 ──────────────────

  it("should return 0 when habits exist but have no checkHistory", () => {
    // Habits array is non-empty but checkHistory is empty → habitsRate = 0/N = 0.
    // This is the first-use case: user just added habits with no history.
    // intention: 3/3 = 100%, habits: 0/3 = 0%. Overall = 100% × 0% = 0.
    const result = calcCompletionConfidence(makeParams({
      habits: [
        { lastChecked: undefined, checkHistory: [] },
      ],
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(0);
  });

  // ── Cross-pillar MIN_ACTIVE_DAYS boundary ────────────────────────────────

  it("should return null when cross-pillar union has fewer than 3 active days", () => {
    // 1 day from intention + 1 different day from habits → union = 2 active days < 3.
    const result = calcCompletionConfidence(makeParams({
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
      ],
      habits: [
        { lastChecked: undefined, checkHistory: [daysAgo(2)] },
      ],
    }));
    expect(result).toBeNull();
  });

  // ── Today's pomodoroHistory entry should not enter the window ─────────────

  it("should exclude today pomodoroHistory entry from historical window", () => {
    // pomodoroHistory has today + 3 past days. buildWindowDates excludes today,
    // so activeDays = 3 (from intentionHistory; pomodoro past entries overlap exactly).
    // intention: 3/3 = 100%. pomodoro: goal met on 2 of 3 active days → 2/3 ≈ 67%.
    // Overall = 100% × 67% = 67%.
    const result = calcCompletionConfidence(makeParams({
      pomodoroGoal: 4,
      intentionHistory: [
        { date: daysAgo(1), text: "A" },
        { date: daysAgo(2), text: "B" },
        { date: daysAgo(3), text: "C" },
      ],
      pomodoroHistory: [
        { date: TODAY, count: 2 },
        { date: daysAgo(1), count: 5 },
        { date: daysAgo(2), count: 5 },
        { date: daysAgo(3), count: 1 },
      ],
    }));
    expect(result).not.toBeNull();
    expect(result!.pct).toBe(67);
  });
});
