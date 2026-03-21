// ABOUTME: Tests for calcWeekComparison — cross-domain week-over-week performance comparison
// ABOUTME: Verifies per-domain delta computation, trend detection, overall trend, and Korean summary

import { describe, it, expect } from "vitest";
import { calcWeekComparison } from "./weekComparison";

const THIS_WEEK = [
  "2026-03-16", "2026-03-17", "2026-03-18", "2026-03-19",
  "2026-03-20", "2026-03-21", "2026-03-22",
];
const LAST_WEEK = [
  "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12",
  "2026-03-13", "2026-03-14", "2026-03-15",
];

const EMPTY_PARAMS = {
  habits: [],
  pomodoroHistory: [],
  intentionHistory: [],
  momentumHistory: [],
  thisWeek: THIS_WEEK,
  lastWeek: LAST_WEEK,
};

describe("calcWeekComparison", () => {
  // ── habits domain ──────────────────────────────────────────────────────────

  describe("habits domain", () => {
    it("shouldComputeRateForBothWeeks", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        habits: [
          { checkHistory: [...THIS_WEEK, ...LAST_WEEK.slice(0, 4)] },
          { checkHistory: [...THIS_WEEK, ...LAST_WEEK.slice(0, 2)] },
        ],
      });
      expect(result.habits).not.toBeNull();
      // thisWeek: 2 habits × 7 days, all checked → 100%
      expect(result.habits!.thisWeek).toBe(100);
      // lastWeek: h1 checked 4/7, h2 checked 2/7 → (4+2)/(2×7)=6/14=43%
      expect(result.habits!.lastWeek).toBe(43);
      expect(result.habits!.delta).toBe(57);
      expect(result.habits!.trend).toBe("up");
    });

    it("shouldReturnNullWhenNoHabitsDefined", () => {
      const result = calcWeekComparison(EMPTY_PARAMS);
      expect(result.habits).toBeNull();
    });

    it("shouldReturn0WhenHabitsExistButNoCheckIns", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        habits: [{ checkHistory: [] }],
      });
      expect(result.habits).not.toBeNull();
      expect(result.habits!.thisWeek).toBe(0);
      expect(result.habits!.lastWeek).toBe(0);
    });
  });

  // ── pomodoro domain ────────────────────────────────────────────────────────

  describe("pomodoro domain", () => {
    it("shouldSumSessionsForEachWeek", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        pomodoroHistory: [
          { date: "2026-03-16", count: 3 },
          { date: "2026-03-18", count: 5 },
          { date: "2026-03-09", count: 2 },
          { date: "2026-03-11", count: 1 },
        ],
      });
      expect(result.pomodoro).not.toBeNull();
      expect(result.pomodoro!.thisWeek).toBe(8);
      expect(result.pomodoro!.lastWeek).toBe(3);
      expect(result.pomodoro!.delta).toBe(5);
    });

    it("shouldReturnNullWhenBothWeeksHaveZeroSessions", () => {
      const result = calcWeekComparison(EMPTY_PARAMS);
      expect(result.pomodoro).toBeNull();
    });

    it("shouldReturnValidDeltaWhenOnlyOneWeekHasSessions", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        pomodoroHistory: [{ date: "2026-03-17", count: 4 }],
      });
      expect(result.pomodoro).not.toBeNull();
      expect(result.pomodoro!.thisWeek).toBe(4);
      expect(result.pomodoro!.lastWeek).toBe(0);
    });
  });

  // ── intention domain ───────────────────────────────────────────────────────

  describe("intention domain", () => {
    it("shouldComputeDoneRateFromEntries", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        intentionHistory: [
          // thisWeek: 5 entries, 4 done → 80%
          ...THIS_WEEK.slice(0, 5).map((d, i) => ({ date: d, done: i < 4 })),
          // lastWeek: 7 entries, 3 done → 43%
          ...LAST_WEEK.map((d, i) => ({ date: d, done: i < 3 })),
        ],
      });
      expect(result.intention).not.toBeNull();
      expect(result.intention!.thisWeek).toBe(80);
      expect(result.intention!.lastWeek).toBe(43);
      expect(result.intention!.trend).toBe("up");
    });

    it("shouldReturnNullWhenNoEntriesInEitherWeek", () => {
      const result = calcWeekComparison(EMPTY_PARAMS);
      expect(result.intention).toBeNull();
    });

    it("shouldReturnNullWhenEntriesExistInOnlyOneWeek", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        intentionHistory: THIS_WEEK.map(d => ({ date: d, done: true })),
      });
      expect(result.intention).toBeNull();
    });
  });

  // ── momentum domain ────────────────────────────────────────────────────────

  describe("momentum domain", () => {
    it("shouldComputeAverageScoreForEachWeek", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        momentumHistory: [
          // thisWeek: scores 80, 90 → avg 85
          { date: "2026-03-16", score: 80 },
          { date: "2026-03-17", score: 90 },
          // lastWeek: scores 40, 60 → avg 50
          { date: "2026-03-09", score: 40 },
          { date: "2026-03-10", score: 60 },
        ],
      });
      expect(result.momentum).not.toBeNull();
      expect(result.momentum!.thisWeek).toBe(85);
      expect(result.momentum!.lastWeek).toBe(50);
      expect(result.momentum!.delta).toBe(35);
      expect(result.momentum!.trend).toBe("up");
    });

    it("shouldReturnNullWhenNoEntriesInEitherWeek", () => {
      const result = calcWeekComparison(EMPTY_PARAMS);
      expect(result.momentum).toBeNull();
    });

    it("shouldReturnNullWhenEntriesExistInOnlyOneWeek", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        momentumHistory: [{ date: "2026-03-16", score: 70 }],
      });
      expect(result.momentum).toBeNull();
    });
  });

  // ── trend thresholds ───────────────────────────────────────────────────────

  describe("trend thresholds", () => {
    it("shouldDetectStableWhenRateDeltaIs4", () => {
      // 1 habit, 7/7 thisWeek (100%), compute lastWeek to make delta = 4
      // We need lastWeek rate = 96%. With 1 habit, 7 days: need ~6.72 checks → not possible with integers
      // Use 2 habits: thisWeek all checked (100%), lastWeek: h1 all, h2 6/7 → (7+6)/(2*7)=13/14=93% → delta 7 → too high
      // Simpler: use momentum with controlled values
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        momentumHistory: [
          ...THIS_WEEK.map(d => ({ date: d, score: 54 })),
          ...LAST_WEEK.map(d => ({ date: d, score: 50 })),
        ],
      });
      // delta = 4 → stable
      expect(result.momentum!.delta).toBe(4);
      expect(result.momentum!.trend).toBe("stable");
    });

    it("shouldDetectUpWhenRateDeltaIs5", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        momentumHistory: [
          ...THIS_WEEK.map(d => ({ date: d, score: 55 })),
          ...LAST_WEEK.map(d => ({ date: d, score: 50 })),
        ],
      });
      expect(result.momentum!.delta).toBe(5);
      expect(result.momentum!.trend).toBe("up");
    });

    it("shouldDetectDownWhenRateDeltaIsNegative5", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        momentumHistory: [
          ...THIS_WEEK.map(d => ({ date: d, score: 45 })),
          ...LAST_WEEK.map(d => ({ date: d, score: 50 })),
        ],
      });
      expect(result.momentum!.delta).toBe(-5);
      expect(result.momentum!.trend).toBe("down");
    });

    it("shouldDetectStableWhenPomodoroDeltaIs2", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        pomodoroHistory: [
          { date: "2026-03-16", count: 3 },
          { date: "2026-03-09", count: 1 },
        ],
      });
      expect(result.pomodoro!.delta).toBe(2);
      expect(result.pomodoro!.trend).toBe("stable");
    });

    it("shouldDetectUpWhenPomodoroDeltaIs3", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        pomodoroHistory: [
          { date: "2026-03-16", count: 4 },
          { date: "2026-03-09", count: 1 },
        ],
      });
      expect(result.pomodoro!.delta).toBe(3);
      expect(result.pomodoro!.trend).toBe("up");
    });
  });

  // ── overall trend ──────────────────────────────────────────────────────────

  describe("overall trend", () => {
    it("shouldBeUpWhenMajorityOfDomainsTrendUp", () => {
      const result = calcWeekComparison({
        habits: [{ checkHistory: [...THIS_WEEK] }], // thisWeek 100%, lastWeek 0% → up
        pomodoroHistory: [
          { date: "2026-03-16", count: 5 },
          { date: "2026-03-09", count: 1 },
        ], // 5 vs 1, delta 4 → up
        intentionHistory: [
          ...THIS_WEEK.map(d => ({ date: d, done: true })),
          ...LAST_WEEK.map(d => ({ date: d, done: false })),
        ], // 100% vs 0% → up
        momentumHistory: [
          ...THIS_WEEK.map(d => ({ date: d, score: 50 })),
          ...LAST_WEEK.map(d => ({ date: d, score: 48 })),
        ], // delta 2 → stable
        thisWeek: THIS_WEEK,
        lastWeek: LAST_WEEK,
      });
      // 3 up, 1 stable → overall up
      expect(result.overallTrend).toBe("up");
    });

    it("shouldBeDownWhenMajorityOfDomainsTrendDown", () => {
      const result = calcWeekComparison({
        habits: [{ checkHistory: [...LAST_WEEK] }], // thisWeek 0%, lastWeek 100% → down
        pomodoroHistory: [
          { date: "2026-03-09", count: 10 },
        ], // 0 vs 10 → down
        intentionHistory: [
          ...THIS_WEEK.map(d => ({ date: d, done: false })),
          ...LAST_WEEK.map(d => ({ date: d, done: true })),
        ], // 0% vs 100% → down
        momentumHistory: [
          ...THIS_WEEK.map(d => ({ date: d, score: 30 })),
          ...LAST_WEEK.map(d => ({ date: d, score: 70 })),
        ], // delta -40 → down
        thisWeek: THIS_WEEK,
        lastWeek: LAST_WEEK,
      });
      expect(result.overallTrend).toBe("down");
    });

    it("shouldBeStableWhenTiedOrNoMajority", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        pomodoroHistory: [
          { date: "2026-03-16", count: 5 }, // 5 vs 1 → up
          { date: "2026-03-09", count: 1 },
        ],
        momentumHistory: [
          ...THIS_WEEK.map(d => ({ date: d, score: 40 })),
          ...LAST_WEEK.map(d => ({ date: d, score: 60 })),
        ], // delta -20 → down
      });
      // 1 up, 1 down → tie → stable
      expect(result.overallTrend).toBe("stable");
    });

    it("shouldBeNullWhenNoDomainsHaveData", () => {
      const result = calcWeekComparison(EMPTY_PARAMS);
      expect(result.overallTrend).toBeNull();
    });
  });

  // ── summary ────────────────────────────────────────────────────────────────

  describe("summary", () => {
    it("shouldIncludeDomainArrowsForNonNullDomains", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        pomodoroHistory: [
          { date: "2026-03-16", count: 5 },
          { date: "2026-03-09", count: 1 },
        ],
        momentumHistory: [
          ...THIS_WEEK.map(d => ({ date: d, score: 80 })),
          ...LAST_WEEK.map(d => ({ date: d, score: 50 })),
        ],
      });
      expect(result.summary).toContain("포모↑");
      expect(result.summary).toContain("모멘텀↑");
      // habits and intention are null → should not appear
      expect(result.summary).not.toContain("습관");
      expect(result.summary).not.toContain("의도");
    });

    it("shouldReturnDataInsuffientWhenAllDomainsAreNull", () => {
      const result = calcWeekComparison(EMPTY_PARAMS);
      expect(result.summary).toBe("비교 데이터 부족");
    });

    it("shouldShowDownArrowForDecliningDomains", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        momentumHistory: [
          ...THIS_WEEK.map(d => ({ date: d, score: 30 })),
          ...LAST_WEEK.map(d => ({ date: d, score: 70 })),
        ],
      });
      expect(result.summary).toContain("모멘텀↓");
    });

    it("shouldShowStableArrowForUnchangedDomains", () => {
      const result = calcWeekComparison({
        ...EMPTY_PARAMS,
        momentumHistory: [
          ...THIS_WEEK.map(d => ({ date: d, score: 50 })),
          ...LAST_WEEK.map(d => ({ date: d, score: 52 })),
        ],
      });
      expect(result.summary).toContain("모멘텀→");
    });
  });

  // ── integration: full scenario ─────────────────────────────────────────────

  it("shouldHandleFullScenarioWithAllDomainsPopulated", () => {
    const result = calcWeekComparison({
      habits: [
        { checkHistory: [...THIS_WEEK, ...LAST_WEEK.slice(0, 5)] },
        { checkHistory: [...THIS_WEEK.slice(0, 5), ...LAST_WEEK.slice(0, 3)] },
      ],
      pomodoroHistory: [
        ...THIS_WEEK.map(d => ({ date: d, count: 3 })),   // 21
        ...LAST_WEEK.map(d => ({ date: d, count: 2 })),   // 14
      ],
      intentionHistory: [
        ...THIS_WEEK.map(d => ({ date: d, done: true })),   // 100%
        ...LAST_WEEK.map(d => ({ date: d, done: d < "2026-03-14" })), // 5/7 = 71%
      ],
      momentumHistory: [
        ...THIS_WEEK.map(d => ({ date: d, score: 75 })),
        ...LAST_WEEK.map(d => ({ date: d, score: 60 })),
      ],
      thisWeek: THIS_WEEK,
      lastWeek: LAST_WEEK,
    });

    expect(result.habits).not.toBeNull();
    expect(result.pomodoro).not.toBeNull();
    expect(result.intention).not.toBeNull();
    expect(result.momentum).not.toBeNull();
    expect(result.overallTrend).toBe("up");
    expect(result.summary).toContain("습관↑");
    expect(result.summary).toContain("모멘텀↑");
  });

  // ── edge: entries outside both windows are ignored ─────────────────────────

  it("shouldIgnoreEntriesOutsideBothWindows", () => {
    const result = calcWeekComparison({
      ...EMPTY_PARAMS,
      pomodoroHistory: [
        { date: "2026-03-01", count: 100 }, // outside both windows
        { date: "2026-03-16", count: 2 },
      ],
    });
    expect(result.pomodoro!.thisWeek).toBe(2);
    expect(result.pomodoro!.lastWeek).toBe(0);
  });
});
