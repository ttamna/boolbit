// ABOUTME: Tests for calcConsistencyScore — cross-domain consistency index over a rolling window
// ABOUTME: Covers per-domain rates, overall score, grade thresholds, trend detection, weakest domain, and edge cases

import { describe, it, expect } from "vitest";
import {
  calcConsistencyScore,
  DEFAULT_WINDOW_DAYS,
  type ConsistencyScoreParams,
} from "./consistencyScore";

const TODAY = "2026-03-22";

/** Returns YYYY-MM-DD string for N days before TODAY (UTC-safe). */
function daysAgo(n: number): string {
  const [y, m, d] = TODAY.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

/** Builds default params where all domains are fully active every day. */
function makeParams(
  overrides: Partial<ConsistencyScoreParams> = {},
): ConsistencyScoreParams {
  const window = overrides.windowDays ?? DEFAULT_WINDOW_DAYS;
  const allDays = Array.from({ length: window }, (_, i) => daysAgo(i));
  return {
    habits: [{ checkHistory: allDays }, { checkHistory: allDays }],
    pomodoroHistory: allDays.map((d) => ({ date: d, count: 3 })),
    intentionHistory: allDays.map((d) => ({
      date: d,
      text: `goal-${d}`,
      done: true,
    })),
    todayStr: TODAY,
    ...overrides,
  };
}

describe("calcConsistencyScore", () => {
  // ── Null guard: no domain data ───────────────────────────────────────────

  it("shouldReturnNullWhenAllDomainsEmpty", () => {
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: [],
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenHabitsHaveNoCheckHistory", () => {
    const result = calcConsistencyScore({
      habits: [{ checkHistory: [] }, { checkHistory: undefined }],
      pomodoroHistory: [],
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result).toBeNull();
  });

  // ── Perfect consistency → elite ──────────────────────────────────────────

  it("shouldReturnEliteWhenAllDomainsActiveEveryDay", () => {
    const result = calcConsistencyScore(makeParams());
    expect(result).not.toBeNull();
    expect(result!.overall).toBe(100);
    expect(result!.grade).toBe("elite");
  });

  // ── Per-domain rate calculation ──────────────────────────────────────────

  it("shouldCalculateHabitRateFromCheckHistoryDatesInWindow", () => {
    // 1 habit checked on 14 out of 28 days → 50%
    const halfDays = Array.from({ length: 14 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore(
      makeParams({
        habits: [{ checkHistory: halfDays }],
        pomodoroHistory: [],
        intentionHistory: [],
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.domains.habits).not.toBeNull();
    expect(result!.domains.habits!.rate).toBe(50);
    expect(result!.domains.habits!.activeDays).toBe(14);
    expect(result!.domains.habits!.totalDays).toBe(DEFAULT_WINDOW_DAYS);
  });

  it("shouldCountDayAsActiveIfAnyHabitWasChecked", () => {
    // 2 habits: one checked first 7 days, other checked days 7-13
    // → 14 unique active days
    const h1Days = Array.from({ length: 7 }, (_, i) => daysAgo(i));
    const h2Days = Array.from({ length: 7 }, (_, i) => daysAgo(i + 7));
    const result = calcConsistencyScore(
      makeParams({
        habits: [{ checkHistory: h1Days }, { checkHistory: h2Days }],
        pomodoroHistory: [],
        intentionHistory: [],
      }),
    );
    expect(result!.domains.habits!.activeDays).toBe(14);
  });

  it("shouldExcludeCheckHistoryDatesOutsideWindow", () => {
    // Habit checked 35 days ago (outside 28-day window) → not counted
    const outsideDays = [daysAgo(30), daysAgo(35)];
    const insideDays = [daysAgo(0), daysAgo(1)];
    const result = calcConsistencyScore(
      makeParams({
        habits: [{ checkHistory: [...outsideDays, ...insideDays] }],
        pomodoroHistory: [],
        intentionHistory: [],
      }),
    );
    expect(result!.domains.habits!.activeDays).toBe(2);
  });

  it("shouldCalculatePomodoroRateFromDaysWithPositiveCount", () => {
    // 7 out of 28 days with pomodoro sessions
    const pomoDays = Array.from({ length: 7 }, (_, i) => ({
      date: daysAgo(i),
      count: 2,
    }));
    const result = calcConsistencyScore(
      makeParams({
        habits: [],
        pomodoroHistory: pomoDays,
        intentionHistory: [],
      }),
    );
    expect(result!.domains.pomodoro).not.toBeNull();
    expect(result!.domains.pomodoro!.activeDays).toBe(7);
    expect(result!.domains.pomodoro!.rate).toBe(25);
  });

  it("shouldIgnorePomodoroDaysWithZeroCount", () => {
    const result = calcConsistencyScore(
      makeParams({
        habits: [],
        pomodoroHistory: [
          { date: daysAgo(0), count: 0 },
          { date: daysAgo(1), count: 3 },
        ],
        intentionHistory: [],
      }),
    );
    expect(result!.domains.pomodoro!.activeDays).toBe(1);
  });

  it("shouldCalculateIntentionRateFromDaysWithNonEmptyText", () => {
    // Intentions set on 21 out of 28 days
    const intentionDays = Array.from({ length: 21 }, (_, i) => ({
      date: daysAgo(i),
      text: `goal-${i}`,
      done: true,
    }));
    const result = calcConsistencyScore(
      makeParams({
        habits: [],
        pomodoroHistory: [],
        intentionHistory: intentionDays,
      }),
    );
    expect(result!.domains.intention).not.toBeNull();
    expect(result!.domains.intention!.activeDays).toBe(21);
    expect(result!.domains.intention!.rate).toBe(75);
  });

  it("shouldCountIntentionAsActiveEvenIfNotDone", () => {
    // Intention set but not marked done → still counts (user showed up)
    const result = calcConsistencyScore(
      makeParams({
        habits: [],
        pomodoroHistory: [],
        intentionHistory: [
          { date: daysAgo(0), text: "my goal", done: false },
        ],
      }),
    );
    expect(result!.domains.intention!.activeDays).toBe(1);
  });

  it("shouldNotCountIntentionWithEmptyText", () => {
    const result = calcConsistencyScore(
      makeParams({
        habits: [],
        pomodoroHistory: [],
        intentionHistory: [
          { date: daysAgo(0), text: "", done: true },
          { date: daysAgo(1), text: "real goal" },
        ],
      }),
    );
    expect(result!.domains.intention!.activeDays).toBe(1);
  });

  // ── Null domains when feature unused ─────────────────────────────────────

  it("shouldReturnNullHabitsWhenNoHabitsExist", () => {
    const result = calcConsistencyScore(
      makeParams({ habits: [] }),
    );
    expect(result!.domains.habits).toBeNull();
  });

  it("shouldReturnNullPomodoroWhenNoHistoryExists", () => {
    const result = calcConsistencyScore(
      makeParams({ pomodoroHistory: [] }),
    );
    expect(result!.domains.pomodoro).toBeNull();
  });

  it("shouldReturnNullIntentionWhenNoHistoryExists", () => {
    const result = calcConsistencyScore(
      makeParams({ intentionHistory: [] }),
    );
    expect(result!.domains.intention).toBeNull();
  });

  // ── Overall score: average of active domains ─────────────────────────────

  it("shouldAverageOnlyActiveDomains", () => {
    // Only pomodoro active: 7/28 = 25% → overall = 25
    const pomoDays = Array.from({ length: 7 }, (_, i) => ({
      date: daysAgo(i),
      count: 2,
    }));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: pomoDays,
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.overall).toBe(25);
  });

  it("shouldAverageTwoActiveDomains", () => {
    // Habits: 14/28 = 50%, Intention: 28/28 = 100% → overall = 75
    const halfDays = Array.from({ length: 14 }, (_, i) => daysAgo(i));
    const allDays = Array.from({ length: 28 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [{ checkHistory: halfDays }],
      pomodoroHistory: [],
      intentionHistory: allDays.map((d) => ({
        date: d,
        text: `g-${d}`,
        done: true,
      })),
      todayStr: TODAY,
    });
    expect(result!.overall).toBe(75);
  });

  // ── Grade thresholds ─────────────────────────────────────────────────────

  it("shouldGradeEliteAt90", () => {
    // 26/28 = ~92.86% → elite
    const days = Array.from({ length: 26 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: days.map((d) => ({ date: d, count: 1 })),
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.grade).toBe("elite");
  });

  it("shouldGradeStrongAt75", () => {
    // 21/28 = 75% → strong
    const days = Array.from({ length: 21 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: days.map((d) => ({ date: d, count: 1 })),
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.grade).toBe("strong");
  });

  it("shouldGradeSteadyAt60", () => {
    // 17/28 ≈ 60.7% → steady
    const days = Array.from({ length: 17 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: days.map((d) => ({ date: d, count: 1 })),
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.grade).toBe("steady");
  });

  it("shouldGradeBuildingAt40", () => {
    // 12/28 ≈ 42.9% → building
    const days = Array.from({ length: 12 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: days.map((d) => ({ date: d, count: 1 })),
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.grade).toBe("building");
  });

  it("shouldGradeInconsistentBelow40", () => {
    // 7/28 = 25% → inconsistent
    const days = Array.from({ length: 7 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: days.map((d) => ({ date: d, count: 1 })),
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.grade).toBe("inconsistent");
  });

  // ── Grade boundary: exact 90 ─────────────────────────────────────────────

  it("shouldGradeStrongAt89NotElite", () => {
    // exactly 89.xx% → strong (not elite)
    // To get ~89.3%: 25/28 ≈ 89.3
    const days = Array.from({ length: 25 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: days.map((d) => ({ date: d, count: 1 })),
      intentionHistory: [],
      todayStr: TODAY,
    });
    // 25/28 ≈ 89.3 → rounds to 89 → strong
    expect(result!.grade).toBe("strong");
  });

  // ── Trend detection ──────────────────────────────────────────────────────

  it("shouldDetectImprovingTrendWhenSecondHalfStronger", () => {
    // Older half (days 14-27 ago): no pomodoro
    // Recent half (days 0-13 ago): all pomodoro
    // → older rate 0%, recent rate 100% → improving
    const recentDays = Array.from({ length: 14 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: recentDays.map((d) => ({ date: d, count: 2 })),
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.trend).toBe("improving");
  });

  it("shouldDetectDecliningTrendWhenFirstHalfStronger", () => {
    // Older half (days 14-27 ago): all pomodoro
    // Recent half (days 0-13 ago): no pomodoro
    // → older rate 100%, recent rate 0% → declining
    const olderDays = Array.from({ length: 14 }, (_, i) => daysAgo(i + 14));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: olderDays.map((d) => ({ date: d, count: 2 })),
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.trend).toBe("declining");
  });

  it("shouldReturnStableTrendWhenBothHalvesSimilar", () => {
    // All 28 days active → both halves 100% → stable
    const result = calcConsistencyScore(makeParams());
    expect(result!.trend).toBe("stable");
  });

  it("shouldReturnStableWhenDifferenceIsSmall", () => {
    // Older half (days 14-27): 13/14 active ≈ 92.9%
    // Recent half (days 0-13): 14/14 active = 100%
    // Diff ≈ 7.1pp < 10pp threshold → stable
    const allDays = Array.from({ length: 28 }, (_, i) => daysAgo(i));
    const intentionDays = allDays.filter((d) => d !== daysAgo(27));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: [],
      intentionHistory: intentionDays.map((d) => ({
        date: d,
        text: `g`,
        done: true,
      })),
      todayStr: TODAY,
    });
    expect(result!.trend).toBe("stable");
  });

  it("shouldReturnStableWhenDifferenceIsExactlyAtThreshold", () => {
    // Use windowDays=20 for clean math: halfSize=10
    // Older half: 9/10 = 90%, Recent half: 10/10 = 100% → diff = 10pp exactly
    // > 10 is required (strict), so 10pp exactly → stable
    const allDays = Array.from({ length: 20 }, (_, i) => daysAgo(i));
    const intentionDays = allDays.filter((d) => d !== daysAgo(19));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: [],
      intentionHistory: intentionDays.map((d) => ({
        date: d,
        text: `g`,
        done: true,
      })),
      todayStr: TODAY,
      windowDays: 20,
    });
    expect(result!.trend).toBe("stable");
  });

  it("shouldDetectTrendCorrectlyWithOddWindowDays", () => {
    // windowDays=7 → halfSize=3
    // Recent half (days 0-2): 3/3 pomodoro = 100%
    // Older half (days 3-5): 0/3 pomodoro = 0% (day 6 dropped as remainder)
    // Diff = 100pp → improving
    const recentDays = Array.from({ length: 3 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: recentDays.map((d) => ({ date: d, count: 2 })),
      intentionHistory: [],
      todayStr: TODAY,
      windowDays: 7,
    });
    expect(result!.trend).toBe("improving");
  });

  it("shouldReturnNullTrendWhenHalfWindowHasNoData", () => {
    // windowDays=2 → halfSize=1
    // Only 1 day of data in recent half, older half has no matching domain data
    const result = calcConsistencyScore({
      habits: [{ checkHistory: [daysAgo(0)] }],
      pomodoroHistory: [],
      intentionHistory: [],
      todayStr: TODAY,
      windowDays: 2,
    });
    // Older half has no habit check-ins → computeHalfRate returns rate based on habit
    // but habit check at daysAgo(0) is in recent half, not older half
    // Recent: 1/1=100%, Older: 0/1=0% → diff=100 → improving (not null)
    // because hasHabitHistory is true globally, both halves get a rate
    expect(result!.trend).toBe("improving");
  });

  // ── Weakest domain ───────────────────────────────────────────────────────

  it("shouldIdentifyWeakestDomainWhenOneIsLower", () => {
    const allDays = Array.from({ length: 28 }, (_, i) => daysAgo(i));
    const fewDays = Array.from({ length: 7 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [{ checkHistory: allDays }],
      pomodoroHistory: fewDays.map((d) => ({ date: d, count: 1 })),
      intentionHistory: allDays.map((d) => ({
        date: d,
        text: `g`,
        done: true,
      })),
      todayStr: TODAY,
    });
    expect(result!.weakestDomain).toBe("pomodoro");
  });

  it("shouldReturnNullWeakestWhenOnlyOneDomainActive", () => {
    const days = Array.from({ length: 14 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [{ checkHistory: days }],
      pomodoroHistory: [],
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.weakestDomain).toBeNull();
  });

  it("shouldReturnNullWeakestWhenAllDomainsEqual", () => {
    const result = calcConsistencyScore(makeParams());
    // All 100% → no weakness
    expect(result!.weakestDomain).toBeNull();
  });

  // ── Custom window ────────────────────────────────────────────────────────

  it("shouldRespectCustomWindowDays", () => {
    const days = Array.from({ length: 7 }, (_, i) => daysAgo(i));
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: days.map((d) => ({ date: d, count: 1 })),
      intentionHistory: [],
      todayStr: TODAY,
      windowDays: 7,
    });
    expect(result!.domains.pomodoro!.activeDays).toBe(7);
    expect(result!.domains.pomodoro!.totalDays).toBe(7);
    expect(result!.domains.pomodoro!.rate).toBe(100);
  });

  // ── Pomodoro domain: null when all entries have count 0 ──────────────────

  it("shouldReturnNullPomodoroWhenAllEntriesHaveZeroCount", () => {
    const result = calcConsistencyScore({
      habits: [{ checkHistory: [daysAgo(0)] }],
      pomodoroHistory: [
        { date: daysAgo(0), count: 0 },
        { date: daysAgo(1), count: 0 },
      ],
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.domains.pomodoro).toBeNull();
  });

  // ── Pomodoro entries outside window should be excluded ────────────────────

  it("shouldExcludePomodoroEntriesOutsideWindow", () => {
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: [
        { date: daysAgo(0), count: 2 },
        { date: daysAgo(30), count: 5 }, // outside 28-day window
      ],
      intentionHistory: [],
      todayStr: TODAY,
    });
    expect(result!.domains.pomodoro!.activeDays).toBe(1);
  });

  // ── Intention entries outside window should be excluded ───────────────────

  it("shouldExcludeIntentionEntriesOutsideWindow", () => {
    const result = calcConsistencyScore({
      habits: [],
      pomodoroHistory: [],
      intentionHistory: [
        { date: daysAgo(0), text: "today" },
        { date: daysAgo(30), text: "old" }, // outside 28-day window
      ],
      todayStr: TODAY,
    });
    expect(result!.domains.intention!.activeDays).toBe(1);
  });
});
