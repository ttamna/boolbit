// ABOUTME: Tests for calcPomodoroPattern — pomodoro usage pattern analysis over a rolling window
// ABOUTME: Covers activity metrics, goal hit rate, weekly patterns, consistency, trend, grade, and edge cases

import { describe, it, expect } from "vitest";
import {
  calcPomodoroPattern,
  DEFAULT_WINDOW_DAYS,
  type PomodoroPatternParams,
} from "./pomodoroPattern";

const TODAY = "2026-03-22";

/** Returns YYYY-MM-DD string for N days before TODAY (UTC-safe). */
function daysAgo(n: number): string {
  const [y, m, d] = TODAY.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

/** Builds a full-window pomodoroHistory where every day has `count` sessions. */
function makeFullHistory(
  count: number,
  windowDays = DEFAULT_WINDOW_DAYS,
): Array<{ date: string; count: number }> {
  return Array.from({ length: windowDays }, (_, i) => ({
    date: daysAgo(i),
    count,
  }));
}

/** Builds default params with every day having 3 sessions. */
function makeParams(
  overrides: Partial<PomodoroPatternParams> = {},
): PomodoroPatternParams {
  return {
    pomodoroHistory: makeFullHistory(3),
    pomodoroGoal: 3,
    todayStr: TODAY,
    ...overrides,
  };
}

describe("calcPomodoroPattern", () => {
  // ── Null guards ─────────────────────────────────────────────────────────────

  it("shouldReturnNullWhenHistoryEmpty", () => {
    const result = calcPomodoroPattern({
      pomodoroHistory: [],
      pomodoroGoal: 3,
      todayStr: TODAY,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenAllEntriesOutsideWindow", () => {
    const result = calcPomodoroPattern({
      pomodoroHistory: [{ date: daysAgo(30), count: 5 }],
      pomodoroGoal: 3,
      todayStr: TODAY,
      windowDays: 28,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenAllEntriesHaveZeroCount", () => {
    const result = calcPomodoroPattern({
      pomodoroHistory: [{ date: daysAgo(0), count: 0 }, { date: daysAgo(1), count: 0 }],
      pomodoroGoal: 3,
      todayStr: TODAY,
    });
    expect(result).toBeNull();
  });

  // ── Activity metrics ────────────────────────────────────────────────────────

  it("shouldCountActiveDaysCorrectly", () => {
    // 10 days with sessions out of 28
    const hist = Array.from({ length: 10 }, (_, i) => ({
      date: daysAgo(i),
      count: 2,
    }));
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result).not.toBeNull();
    expect(result!.activeDays).toBe(10);
    expect(result!.totalDays).toBe(DEFAULT_WINDOW_DAYS);
    expect(result!.activityRate).toBe(Math.round((10 / DEFAULT_WINDOW_DAYS) * 100));
  });

  it("shouldDeduplicateSameDateEntries", () => {
    // Two entries for the same date should be summed
    const hist = [
      { date: daysAgo(0), count: 2 },
      { date: daysAgo(0), count: 3 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result).not.toBeNull();
    expect(result!.activeDays).toBe(1);
    expect(result!.totalSessions).toBe(5);
    expect(result!.avgPerActiveDay).toBe(5);
  });

  it("shouldCalculateTotalSessionsAsSumOfAllCounts", () => {
    const hist = [
      { date: daysAgo(0), count: 4 },
      { date: daysAgo(1), count: 3 },
      { date: daysAgo(2), count: 5 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.totalSessions).toBe(12);
  });

  it("shouldCalculateAvgPerActiveDayRoundedToOneDecimal", () => {
    // 7 sessions across 3 days → 7/3 ≈ 2.3
    const hist = [
      { date: daysAgo(0), count: 3 },
      { date: daysAgo(1), count: 2 },
      { date: daysAgo(2), count: 2 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.avgPerActiveDay).toBe(2.3);
  });

  it("shouldIgnoreEntriesOutsideWindow", () => {
    const hist = [
      { date: daysAgo(0), count: 3 },
      { date: daysAgo(29), count: 10 }, // outside 28-day window
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, windowDays: 28 }));
    expect(result!.activeDays).toBe(1);
    expect(result!.totalSessions).toBe(3);
  });

  // ── Goal hit rate ───────────────────────────────────────────────────────────

  it("shouldReturnNullGoalFieldsWhenGoalIsZero", () => {
    const result = calcPomodoroPattern(makeParams({ pomodoroGoal: 0 }));
    expect(result).not.toBeNull();
    expect(result!.goalHitRate).toBeNull();
    expect(result!.goalHitDays).toBeNull();
  });

  it("shouldCalculateGoalHitRateOverActiveDays", () => {
    // 4 active days, goal = 3. Days: [4, 2, 3, 5] → hits: [4, 3, 5] = 3 out of 4
    const hist = [
      { date: daysAgo(0), count: 4 },
      { date: daysAgo(1), count: 2 },
      { date: daysAgo(2), count: 3 },
      { date: daysAgo(3), count: 5 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, pomodoroGoal: 3 }));
    expect(result!.goalHitDays).toBe(3);
    expect(result!.goalHitRate).toBe(75);
  });

  it("shouldReturn100GoalHitRateWhenAllDaysHitGoal", () => {
    const result = calcPomodoroPattern(makeParams({ pomodoroGoal: 3 }));
    expect(result!.goalHitRate).toBe(100);
    expect(result!.goalHitDays).toBe(DEFAULT_WINDOW_DAYS);
  });

  it("shouldReturn0GoalHitRateWhenNoDaysHitGoal", () => {
    // All days have 1 session, goal is 5
    const hist = makeFullHistory(1);
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, pomodoroGoal: 5 }));
    expect(result!.goalHitRate).toBe(0);
    expect(result!.goalHitDays).toBe(0);
  });

  // ── Weekly pattern ──────────────────────────────────────────────────────────

  it("shouldIdentifyPeakAndValleyDaysOfWeek", () => {
    // Build history where Mondays have 6 sessions, all others have 1
    const hist: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < DEFAULT_WINDOW_DAYS; i++) {
      const dateStr = daysAgo(i);
      const [y, m, d] = dateStr.split("-").map(Number);
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      hist.push({ date: dateStr, count: dow === 1 ? 6 : 1 }); // Monday = 6, others = 1
    }
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.peakDay).toBe(1); // Monday
    // valleyDay: one of the non-Monday days (any is valid as long as it's lowest)
    expect(result!.valleyDay).not.toBe(1);
    expect(result!.valleyDay).not.toBeNull();
  });

  it("shouldReturnNullPeakValleyWhenAllDaysEqual", () => {
    // Every day has 3 sessions — no peak or valley
    const result = calcPomodoroPattern(makeParams());
    expect(result!.peakDay).toBeNull();
    expect(result!.valleyDay).toBeNull();
  });

  it("shouldCalculateWeekdayAndWeekendAverages", () => {
    // Build history: weekdays (Mon-Fri) = 4 sessions, weekends (Sat-Sun) = 1
    const hist: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < DEFAULT_WINDOW_DAYS; i++) {
      const dateStr = daysAgo(i);
      const [y, m, d] = dateStr.split("-").map(Number);
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      hist.push({ date: dateStr, count: isWeekend ? 1 : 4 });
    }
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.weekdayAvg).toBe(4);
    expect(result!.weekendAvg).toBe(1);
  });

  // ── Consistency ─────────────────────────────────────────────────────────────

  it("shouldReturnSteadyWhenSessionCountIsUniform", () => {
    // Every day has exactly 3 sessions → CV = 0
    const result = calcPomodoroPattern(makeParams());
    expect(result!.consistency).toBe("steady");
  });

  it("shouldReturnSporadicWhenFewActiveDaysWithHighVariance", () => {
    // 5 active days out of 28, with varying counts → high CV + low activity rate
    const hist = [
      { date: daysAgo(0), count: 8 },
      { date: daysAgo(5), count: 1 },
      { date: daysAgo(10), count: 6 },
      { date: daysAgo(15), count: 2 },
      { date: daysAgo(20), count: 7 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.consistency).toBe("sporadic");
  });

  it("shouldReturnBurstyWhenManyActiveDaysWithHighVariance", () => {
    // Most days active but counts vary widely
    const hist: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < DEFAULT_WINDOW_DAYS; i++) {
      // Alternate between 1 and 7 sessions — high variance
      hist.push({ date: daysAgo(i), count: i % 2 === 0 ? 1 : 7 });
    }
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.consistency).toBe("bursty");
  });

  // ── Trend ───────────────────────────────────────────────────────────────────

  it("shouldDetectIncreasingTrendWhenSecondHalfHigher", () => {
    // First 14 days: 1 session. Last 14 days: 4 sessions.
    const hist: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < DEFAULT_WINDOW_DAYS; i++) {
      // i=0 is today (most recent), i=27 is oldest
      // "second half" = more recent = i < 14
      hist.push({ date: daysAgo(i), count: i < 14 ? 4 : 1 });
    }
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.trend).toBe("increasing");
  });

  it("shouldDetectDecreasingTrendWhenSecondHalfLower", () => {
    // First half (older): 5 sessions. Second half (recent): 1 session.
    const hist: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < DEFAULT_WINDOW_DAYS; i++) {
      hist.push({ date: daysAgo(i), count: i < 14 ? 1 : 5 });
    }
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.trend).toBe("decreasing");
  });

  it("shouldDetectStableTrendWhenHalvesAreSimilar", () => {
    const result = calcPomodoroPattern(makeParams());
    expect(result!.trend).toBe("stable");
  });

  // ── Grade ───────────────────────────────────────────────────────────────────

  it("shouldGradeEliteWhenHighActivityAndAvgMeetsGoal", () => {
    // All 28 days active (100%), avg 3 sessions, goal = 3
    const result = calcPomodoroPattern(makeParams());
    expect(result!.grade).toBe("elite");
  });

  it("shouldGradeStrongWhenActivityGte60AndAvgGte2", () => {
    // 18 out of 28 days (64%), avg 2 sessions
    const hist = Array.from({ length: 18 }, (_, i) => ({
      date: daysAgo(i),
      count: 2,
    }));
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, pomodoroGoal: 4 }));
    expect(result!.grade).toBe("strong");
  });

  it("shouldGradeModerateWhenActivityGte40", () => {
    // 12 out of 28 days (43%), avg 1.5
    const hist = Array.from({ length: 12 }, (_, i) => ({
      date: daysAgo(i),
      count: i % 2 === 0 ? 1 : 2,
    }));
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, pomodoroGoal: 5 }));
    expect(result!.grade).toBe("moderate");
  });

  it("shouldGradeBuildingWhenActiveDaysGte3ButActivityBelow40", () => {
    // 3 active days out of 28 (11%)
    const hist = [
      { date: daysAgo(0), count: 1 },
      { date: daysAgo(1), count: 1 },
      { date: daysAgo(2), count: 1 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.grade).toBe("building");
  });

  it("shouldGradeInactiveWhenFewerThan3ActiveDays", () => {
    const hist = [
      { date: daysAgo(0), count: 1 },
      { date: daysAgo(5), count: 2 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.grade).toBe("inactive");
  });

  // ── Grade boundary: elite requires avg ≥ goal ──────────────────────────────

  it("shouldNotGradeEliteWhenAvgBelowGoal", () => {
    // All days active (100%) but avg 2, goal 4 → not elite
    const hist = makeFullHistory(2);
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, pomodoroGoal: 4 }));
    expect(result!.activityRate).toBe(100);
    expect(result!.grade).not.toBe("elite");
  });

  it("shouldGradeEliteWithNoGoalWhenAvgGte3", () => {
    // No goal (0) → elite threshold uses default baseline of 3
    const hist = makeFullHistory(3);
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, pomodoroGoal: 0 }));
    expect(result!.grade).toBe("elite");
  });

  it("shouldNotGradeEliteWithNoGoalWhenAvgBelow3", () => {
    const hist = makeFullHistory(2);
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, pomodoroGoal: 0 }));
    expect(result!.grade).not.toBe("elite");
  });

  // ── Summary ─────────────────────────────────────────────────────────────────

  it("shouldIncludeGradeLabelInSummary", () => {
    const result = calcPomodoroPattern(makeParams());
    expect(result!.summary).toContain("엘리트");
  });

  it("shouldIncludeActivityRateInSummary", () => {
    const result = calcPomodoroPattern(makeParams());
    expect(result!.summary).toContain("100%");
  });

  // ── Custom window ───────────────────────────────────────────────────────────

  it("shouldRespectCustomWindowDays", () => {
    const hist = Array.from({ length: 7 }, (_, i) => ({
      date: daysAgo(i),
      count: 3,
    }));
    const result = calcPomodoroPattern(
      makeParams({ pomodoroHistory: hist, windowDays: 7 }),
    );
    expect(result).not.toBeNull();
    expect(result!.totalDays).toBe(7);
    expect(result!.activeDays).toBe(7);
    expect(result!.activityRate).toBe(100);
  });

  // ── Edge: single active day ─────────────────────────────────────────────────

  it("shouldHandleSingleActiveDayGracefully", () => {
    const hist = [{ date: daysAgo(0), count: 5 }];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result).not.toBeNull();
    expect(result!.activeDays).toBe(1);
    expect(result!.avgPerActiveDay).toBe(5);
    expect(result!.totalSessions).toBe(5);
  });

  // ── Trend boundary: threshold is 0.5 sessions/day ──────────────────────────

  it("shouldDetectStableWhenDeltaIsExactlyAtThreshold", () => {
    // Build window where second half avg is exactly 0.5 more than first half
    // First half (older, i=14..27): 2 sessions/day → avg = 2
    // Second half (recent, i=0..13): need avg = 2.5
    // 14 days × 2.5 = 35 sessions → alternate 2 and 3
    const hist: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < DEFAULT_WINDOW_DAYS; i++) {
      if (i < 14) {
        // recent half: avg 2.5 → 7 days of 3 + 7 days of 2
        hist.push({ date: daysAgo(i), count: i % 2 === 0 ? 3 : 2 });
      } else {
        // older half: avg 2
        hist.push({ date: daysAgo(i), count: 2 });
      }
    }
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    // Delta = 2.5 - 2 = 0.5 → NOT > 0.5, should be stable
    expect(result!.trend).toBe("stable");
  });

  // ── Grade boundary: strong requires activityRate ≥ 60 AND avg ≥ 2 ─────────

  it("shouldNotGradeStrongWhenAvgBelow2EvenIfActivityHigh", () => {
    // 20 out of 28 days (71%) but avg 1 session
    const hist = Array.from({ length: 20 }, (_, i) => ({
      date: daysAgo(i),
      count: 1,
    }));
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, pomodoroGoal: 5 }));
    // activityRate = 71% (≥60) but avg = 1 (<2) → should be moderate (activityRate ≥ 40)
    expect(result!.grade).toBe("moderate");
  });

  // ── Consistency boundary: CV threshold ─────────────────────────────────────

  it("shouldReturnSteadyWhenSlightVariation", () => {
    // All days have 2 or 3 sessions — low CV
    const hist: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < DEFAULT_WINDOW_DAYS; i++) {
      hist.push({ date: daysAgo(i), count: i % 3 === 0 ? 2 : 3 });
    }
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.consistency).toBe("steady");
  });

  // ── Trend boundary: delta just above threshold → increasing ──────────────

  it("shouldDetectIncreasingWhenDeltaJustAboveThreshold", () => {
    // recent avg = 3, older avg = 2 → delta = 1 > 0.5 → increasing
    const hist: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < DEFAULT_WINDOW_DAYS; i++) {
      hist.push({ date: daysAgo(i), count: i < 14 ? 3 : 2 });
    }
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result!.trend).toBe("increasing");
  });

  // ── Negative count entries ───────────────────────────────────────────────

  it("shouldTreatNegativeCountAsZeroViaAggregation", () => {
    // Negative count can reduce a date's total to 0 → date excluded from activeDays
    const hist = [
      { date: daysAgo(0), count: 3 },
      { date: daysAgo(0), count: -3 }, // net 0 → excluded
      { date: daysAgo(1), count: 2 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result).not.toBeNull();
    expect(result!.activeDays).toBe(1); // only daysAgo(1) with count 2
    expect(result!.totalSessions).toBe(2);
  });

  it("shouldReturnNullWhenNegativeCountsCancelAllSessions", () => {
    const hist = [
      { date: daysAgo(0), count: 3 },
      { date: daysAgo(0), count: -3 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist }));
    expect(result).toBeNull();
  });

  // ── Goal hit rate boundary: denominator is activeDays, not totalDays ──────

  it("shouldCalculateGoalHitRateOverActiveDaysNotTotalDays", () => {
    // 2 active days out of 28, both hitting goal → goalHitRate = 100% (not 7%)
    const hist = [
      { date: daysAgo(0), count: 5 },
      { date: daysAgo(1), count: 5 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, pomodoroGoal: 5 }));
    expect(result!.goalHitRate).toBe(100);
    expect(result!.goalHitDays).toBe(2);
    // activityRate reflects the low coverage separately
    expect(result!.activityRate).toBe(Math.round((2 / DEFAULT_WINDOW_DAYS) * 100));
  });

  // ── Peak/valley with partial week window ──────────────────────────────────

  it("shouldHandlePeakValleyInShortWindowNotCoveringAllDOWs", () => {
    // 3-day window → only 3 day-of-weeks represented
    const hist = [
      { date: daysAgo(0), count: 5 },
      { date: daysAgo(1), count: 1 },
      { date: daysAgo(2), count: 3 },
    ];
    const result = calcPomodoroPattern(makeParams({ pomodoroHistory: hist, windowDays: 3 }));
    expect(result).not.toBeNull();
    // Peak should be the DOW of daysAgo(0) which has 5 sessions
    const [y0, m0, d0] = daysAgo(0).split("-").map(Number);
    const expectedPeak = new Date(Date.UTC(y0, m0 - 1, d0)).getUTCDay();
    expect(result!.peakDay).toBe(expectedPeak);
    // Valley should be the DOW of daysAgo(1) which has 1 session
    const [y1, m1, d1] = daysAgo(1).split("-").map(Number);
    const expectedValley = new Date(Date.UTC(y1, m1 - 1, d1)).getUTCDay();
    expect(result!.valleyDay).toBe(expectedValley);
  });
});
