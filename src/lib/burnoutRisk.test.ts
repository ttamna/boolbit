// ABOUTME: Tests for calcBurnoutRisk — cross-domain burnout early-warning from 4 signals
// ABOUTME: Covers momentum crash, habit erosion, focus drought, intention disconnect, combined scoring, and risk levels

import { describe, it, expect } from "vitest";
import { calcBurnoutRisk, MIN_HISTORY_DAYS, type BurnoutRiskParams } from "./burnoutRisk";

const TODAY = "2026-03-22";

/** Returns YYYY-MM-DD string for N days before TODAY (UTC-safe). */
function daysAgo(n: number): string {
  const [y, m, d] = TODAY.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

/** Builds a momentum history entry. */
function mEntry(daysBack: number, score: number) {
  const tier = score >= 75 ? "high" as const : score >= 40 ? "mid" as const : "low" as const;
  return { date: daysAgo(daysBack), score, tier };
}

/** Default healthy params — all signals quiet. */
function makeParams(overrides: Partial<BurnoutRiskParams> = {}): BurnoutRiskParams {
  // 10 days of healthy momentum (score 65 = stable mid-tier)
  const momentumHistory = Array.from({ length: 10 }, (_, i) => mEntry(i, 65));
  return {
    momentumHistory,
    habits: [
      { streak: 10 },
      { streak: 5 },
    ],
    pomodoroHistory: [
      { date: daysAgo(0), count: 3 },
      { date: daysAgo(1), count: 4 },
      { date: daysAgo(2), count: 2 },
    ],
    intentionHistory: Array.from({ length: 7 }, (_, i) => ({
      date: daysAgo(i),
      text: `goal-${i}`,
      done: true,
    })),
    todayStr: TODAY,
    ...overrides,
  };
}

describe("calcBurnoutRisk", () => {
  // ── Insufficient data → null ──────────────────────────────────────────────

  it("shouldReturnNullWhenMomentumHistoryBelowMinDays", () => {
    const result = calcBurnoutRisk(makeParams({
      momentumHistory: Array.from({ length: MIN_HISTORY_DAYS - 1 }, (_, i) => mEntry(i, 60)),
    }));
    expect(result).toBeNull();
  });

  it("shouldReturnNonNullWhenExactlyMinHistoryDays", () => {
    const result = calcBurnoutRisk(makeParams({
      momentumHistory: Array.from({ length: MIN_HISTORY_DAYS }, (_, i) => mEntry(i, 60)),
    }));
    expect(result).not.toBeNull();
  });

  // ── Healthy baseline → low risk ──────────────────────────────────────────

  it("shouldReturnLowRiskWhenAllSignalsHealthy", () => {
    const result = calcBurnoutRisk(makeParams());
    expect(result).not.toBeNull();
    expect(result!.score).toBe(0);
    expect(result!.level).toBe("low");
    expect(result!.factors).toEqual([]);
  });

  // ── Signal 1: Momentum crash ─────────────────────────────────────────────

  it("shouldDetectMomentumCrashWhenRecentAvgDropsSharply", () => {
    // Prior days (4-9): score 80 → recent days (0-2): score 30 → drop = 50
    const history = [
      ...Array.from({ length: 6 }, (_, i) => mEntry(i + 4, 80)),
      mEntry(2, 30), mEntry(1, 30), mEntry(0, 30),
    ];
    const result = calcBurnoutRisk(makeParams({ momentumHistory: history }));
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(30);
    expect(result!.factors).toContain("momentum_crash");
  });

  it("shouldNotDetectMomentumCrashWhenScoresAreStable", () => {
    const history = Array.from({ length: 10 }, (_, i) => mEntry(i, 65));
    const result = calcBurnoutRisk(makeParams({ momentumHistory: history }));
    expect(result).not.toBeNull();
    expect(result!.factors).not.toContain("momentum_crash");
  });

  it("shouldNotDetectMomentumCrashWhenScoresAreRising", () => {
    // Prior: 40, Recent: 70 → rising, not crashing
    const history = [
      ...Array.from({ length: 6 }, (_, i) => mEntry(i + 4, 40)),
      mEntry(2, 70), mEntry(1, 70), mEntry(0, 70),
    ];
    const result = calcBurnoutRisk(makeParams({ momentumHistory: history }));
    expect(result!.factors).not.toContain("momentum_crash");
  });

  it("shouldScaleMomentumCrashProportionallyToDrop", () => {
    // Drop of 15 → small score; drop of 40 → larger score
    const makeHistory = (priorScore: number, recentScore: number) => [
      ...Array.from({ length: 6 }, (_, i) => mEntry(i + 4, priorScore)),
      mEntry(2, recentScore), mEntry(1, recentScore), mEntry(0, recentScore),
    ];
    const small = calcBurnoutRisk(makeParams({ momentumHistory: makeHistory(65, 50) }));
    const large = calcBurnoutRisk(makeParams({ momentumHistory: makeHistory(80, 30) }));
    expect(large!.score).toBeGreaterThan(small!.score);
  });

  // ── Signal 2: Habit erosion ──────────────────────────────────────────────

  it("shouldDetectHabitErosionWhenAllHabitsDormant", () => {
    const result = calcBurnoutRisk(makeParams({
      habits: [
        { streak: 0 },
        { streak: 0 },
        { streak: 0 },
      ],
    }));
    expect(result!.factors).toContain("habit_erosion");
    expect(result!.score).toBeGreaterThanOrEqual(25);
  });

  it("shouldScaleHabitErosionByDormantProportion", () => {
    const half = calcBurnoutRisk(makeParams({
      habits: [
        { streak: 0 },
        { streak: 10 },
      ],
    }));
    const all = calcBurnoutRisk(makeParams({
      habits: [
        { streak: 0 },
        { streak: 0 },
      ],
    }));
    expect(all!.score).toBeGreaterThan(half!.score);
  });

  it("shouldReturnZeroHabitErosionWhenNoHabitsExist", () => {
    const result = calcBurnoutRisk(makeParams({ habits: [] }));
    expect(result!.factors).not.toContain("habit_erosion");
  });

  it("shouldReturnZeroHabitErosionWhenAllHabitsActive", () => {
    const result = calcBurnoutRisk(makeParams({
      habits: [
        { streak: 10 },
        { streak: 5 },
      ],
    }));
    expect(result!.factors).not.toContain("habit_erosion");
  });

  // ── Signal 3: Focus drought ──────────────────────────────────────────────

  it("shouldDetectFocusDroughtWhenNoPomodoroForConsecutiveDays", () => {
    // No pomodoro for last 5 days (yesterday through daysAgo(5))
    const result = calcBurnoutRisk(makeParams({
      pomodoroHistory: [{ date: daysAgo(6), count: 3 }],
    }));
    expect(result!.factors).toContain("focus_drought");
    expect(result!.score).toBeGreaterThanOrEqual(15);
  });

  it("shouldNotDetectFocusDroughtWhenRecentPomodoroExists", () => {
    const result = calcBurnoutRisk(makeParams({
      pomodoroHistory: [
        { date: daysAgo(0), count: 2 },
        { date: daysAgo(1), count: 3 },
      ],
    }));
    expect(result!.factors).not.toContain("focus_drought");
  });

  it("shouldScaleFocusDroughtByConsecutiveDryDays", () => {
    // 1 dry day (below threshold) vs 5 dry days (above threshold)
    const short = calcBurnoutRisk(makeParams({
      pomodoroHistory: [{ date: daysAgo(2), count: 2 }],
    }));
    const long = calcBurnoutRisk(makeParams({
      pomodoroHistory: [{ date: daysAgo(6), count: 2 }],
    }));
    expect(long!.score).toBeGreaterThan(short!.score);
  });

  it("shouldNotDetectFocusDroughtWhenPomodoroHistoryEmpty", () => {
    // Empty history = user doesn't use pomodoro → not a drought signal
    const result = calcBurnoutRisk(makeParams({ pomodoroHistory: [] }));
    expect(result!.factors).not.toContain("focus_drought");
  });

  it("shouldNotDetectFocusDroughtWhenAllEntriesHaveZeroCount", () => {
    // Entries with count=0 = no actual sessions → treated as feature unused
    const result = calcBurnoutRisk(makeParams({
      pomodoroHistory: [
        { date: daysAgo(1), count: 0 },
        { date: daysAgo(2), count: 0 },
      ],
    }));
    expect(result!.factors).not.toContain("focus_drought");
  });

  it("shouldNotDetectFocusDroughtWhenExactly2DryDays", () => {
    // 2 dry days = below threshold (3) → no signal
    const result = calcBurnoutRisk(makeParams({
      pomodoroHistory: [{ date: daysAgo(3), count: 2 }],
    }));
    expect(result!.factors).not.toContain("focus_drought");
  });

  it("shouldDetectFocusDroughtWhenExactly3DryDays", () => {
    // 3 dry days = at threshold → signal fires
    const result = calcBurnoutRisk(makeParams({
      pomodoroHistory: [{ date: daysAgo(4), count: 2 }],
    }));
    expect(result!.factors).toContain("focus_drought");
  });

  // ── Signal 4: Intention disconnect ───────────────────────────────────────

  it("shouldDetectIntentionDisconnectWhenMostIntentionsNotDone", () => {
    const result = calcBurnoutRisk(makeParams({
      intentionHistory: Array.from({ length: 7 }, (_, i) => ({
        date: daysAgo(i),
        text: `goal-${i}`,
        done: false,
      })),
    }));
    expect(result!.factors).toContain("intention_disconnect");
  });

  it("shouldNotDetectIntentionDisconnectWhenIntentionsCompletedWell", () => {
    const result = calcBurnoutRisk(makeParams({
      intentionHistory: Array.from({ length: 7 }, (_, i) => ({
        date: daysAgo(i),
        text: `goal-${i}`,
        done: true,
      })),
    }));
    expect(result!.factors).not.toContain("intention_disconnect");
  });

  it("shouldTreatMissingIntentionDaysAsDisconnect", () => {
    // Window is days 1-7. Only daysAgo(1) and daysAgo(3) have entries → 5 gap days
    const result = calcBurnoutRisk(makeParams({
      intentionHistory: [
        { date: daysAgo(1), text: "yesterday", done: true },
        { date: daysAgo(3), text: "three-ago", done: true },
      ],
    }));
    expect(result!.factors).toContain("intention_disconnect");
  });

  it("shouldNotDetectIntentionDisconnectWhenHistoryEmpty", () => {
    // No intention usage = user doesn't use intentions → not a disconnect signal
    const result = calcBurnoutRisk(makeParams({ intentionHistory: [] }));
    expect(result!.factors).not.toContain("intention_disconnect");
  });

  it("shouldNotDetectIntentionDisconnectWhenExactly3GapDays", () => {
    // 3 gap days = below threshold (4) → no signal
    // Window is days 1-7. Provide done intentions for days 1-4, none for days 5-7.
    const result = calcBurnoutRisk(makeParams({
      intentionHistory: [
        { date: daysAgo(1), text: "a", done: true },
        { date: daysAgo(2), text: "b", done: true },
        { date: daysAgo(3), text: "c", done: true },
        { date: daysAgo(4), text: "d", done: true },
        // days 5-7 missing → 3 gap days
      ],
    }));
    expect(result!.factors).not.toContain("intention_disconnect");
  });

  it("shouldDetectIntentionDisconnectWhenExactly4GapDays", () => {
    // 4 gap days = at threshold → signal fires
    // Window is days 1-7. Provide done intentions for days 1-3 only.
    const result = calcBurnoutRisk(makeParams({
      intentionHistory: [
        { date: daysAgo(1), text: "a", done: true },
        { date: daysAgo(2), text: "b", done: true },
        { date: daysAgo(3), text: "c", done: true },
        // days 4-7 missing → 4 gap days
      ],
    }));
    expect(result!.factors).toContain("intention_disconnect");
  });

  it("shouldExcludeTodayFromIntentionWindow", () => {
    // Today's intention not set, but past 7 days all done → no signal
    // (today excluded to avoid false positives before user opens widget)
    const result = calcBurnoutRisk(makeParams({
      intentionHistory: Array.from({ length: 7 }, (_, i) => ({
        date: daysAgo(i + 1),
        text: `goal-${i}`,
        done: true,
      })),
    }));
    expect(result!.factors).not.toContain("intention_disconnect");
  });

  // ── Risk levels ──────────────────────────────────────────────────────────

  it("shouldReturnModerateWhenScoreIs25To49", () => {
    // One signal active: all habits dormant → 25 pts
    const result = calcBurnoutRisk(makeParams({
      habits: [{ streak: 0 }, { streak: 0 }],
    }));
    expect(result!.level).toBe("moderate");
  });

  it("shouldReturnHighWhenScoreIs50To74", () => {
    // Two signals: habit erosion (25) + focus drought (~25)
    const result = calcBurnoutRisk(makeParams({
      habits: [{ streak: 0 }, { streak: 0 }],
      pomodoroHistory: [{ date: daysAgo(6), count: 3 }],
    }));
    expect(result!.score).toBeGreaterThanOrEqual(50);
    expect(result!.level).toBe("high");
  });

  it("shouldReturnCriticalWhenScoreIs75OrAbove", () => {
    // All 4 signals maxed out
    const history = [
      ...Array.from({ length: 6 }, (_, i) => mEntry(i + 4, 85)),
      mEntry(2, 20), mEntry(1, 15), mEntry(0, 10),
    ];
    const result = calcBurnoutRisk(makeParams({
      momentumHistory: history,
      habits: [{ streak: 0 }, { streak: 0 }, { streak: 0 }],
      pomodoroHistory: [{ date: daysAgo(7), count: 3 }],
      intentionHistory: Array.from({ length: 7 }, (_, i) => ({
        date: daysAgo(i),
        text: `goal-${i}`,
        done: false,
      })),
    }));
    expect(result!.score).toBeGreaterThanOrEqual(75);
    expect(result!.level).toBe("critical");
  });

  // ── Score cap ────────────────────────────────────────────────────────────

  it("shouldCapScoreAt100", () => {
    // Even with extreme values, score should not exceed 100
    const history = [
      ...Array.from({ length: 6 }, (_, i) => mEntry(i + 4, 100)),
      mEntry(2, 0), mEntry(1, 0), mEntry(0, 0),
    ];
    const result = calcBurnoutRisk(makeParams({
      momentumHistory: history,
      habits: Array.from({ length: 10 }, () => ({ streak: 0 })),
      pomodoroHistory: [{ date: daysAgo(10), count: 1 }],
      intentionHistory: Array.from({ length: 7 }, (_, i) => ({
        date: daysAgo(i),
        text: `g-${i}`,
        done: false,
      })),
    }));
    expect(result!.score).toBeLessThanOrEqual(100);
  });

  // ── Factors list accuracy ────────────────────────────────────────────────

  it("shouldListOnlyActiveFactors", () => {
    // Only habit erosion active — other signals healthy
    const result = calcBurnoutRisk(makeParams({
      habits: [{ streak: 0 }, { streak: 0 }],
    }));
    expect(result!.factors).toEqual(["habit_erosion"]);
  });

  it("shouldListMultipleFactorsWhenMultipleSignalsActive", () => {
    const history = [
      ...Array.from({ length: 6 }, (_, i) => mEntry(i + 4, 80)),
      mEntry(2, 30), mEntry(1, 25), mEntry(0, 20),
    ];
    const result = calcBurnoutRisk(makeParams({
      momentumHistory: history,
      habits: [{ streak: 0 }],
    }));
    expect(result!.factors).toContain("momentum_crash");
    expect(result!.factors).toContain("habit_erosion");
  });
});
