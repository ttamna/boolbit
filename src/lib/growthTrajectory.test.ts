// ABOUTME: Tests for calcGrowthTrajectory — cross-domain 4-week growth trajectory analysis
// ABOUTME: Validates per-domain metrics, grade classification, trend detection, weakest/strongest domain, and boundary cases

import { describe, it, expect } from "vitest";
import {
  calcGrowthTrajectory,
  MIN_WINDOW_DAYS,
  type GrowthTrajectoryParams,
  type GrowthTrajectory,
  type GrowthGrade,
} from "./growthTrajectory";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Generates an array of YYYY-MM-DD strings going backwards from todayStr. */
function datesBack(todayStr: string, count: number): string[] {
  const [y, m, d] = todayStr.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    return dt.toISOString().slice(0, 10);
  });
}

/** Creates a base params object with empty domains for easy overriding. */
function baseParams(overrides?: Partial<GrowthTrajectoryParams>): GrowthTrajectoryParams {
  return {
    habits: [],
    pomodoroHistory: [],
    intentionHistory: [],
    momentumHistory: [],
    todayStr: "2026-03-22",
    ...overrides,
  };
}

const TODAY = "2026-03-22";

// ── Null guard ──────────────────────────────────────────────────────────────

describe("calcGrowthTrajectory", () => {
  describe("null guard — insufficient data", () => {
    it("should return null when all domains are empty", () => {
      expect(calcGrowthTrajectory(baseParams())).toBeNull();
    });

    it("should return null when only current period has data (no previous period)", () => {
      // Only 14 days of habit data — need at least 2 full windows (28 days each = 56 days)
      const dates = datesBack(TODAY, 14);
      const habits = [{ checkHistory: dates }];
      expect(calcGrowthTrajectory(baseParams({ habits }))).toBeNull();
    });

    it("should return null when data covers exactly MIN_WINDOW_DAYS (only one period)", () => {
      const dates = datesBack(TODAY, MIN_WINDOW_DAYS);
      const habits = [{ checkHistory: dates }];
      expect(calcGrowthTrajectory(baseParams({ habits }))).toBeNull();
    });

    it("should return null when only previous period has data (no current period)", () => {
      // Data only in days 56..29 (previous window), nothing in current window
      const prevOnlyDates = datesBack(TODAY, 56).slice(28);
      const habits = [{ checkHistory: prevOnlyDates }];
      expect(calcGrowthTrajectory(baseParams({ habits }))).toBeNull();
    });
  });

  // ── Single domain tests ─────────────────────────────────────────────────

  describe("habits domain", () => {
    it("should detect growth when current period rate > previous period rate", () => {
      // Previous 4 weeks (days 56..29): check 50% of days
      // Current 4 weeks (days 28..1): check 90% of days
      const prevDates = datesBack(TODAY, 56).slice(28); // days 56..29
      const currDates = datesBack(TODAY, 28); // days 28..1
      const prevChecks = prevDates.filter((_, i) => i % 2 === 0); // ~50%
      const currChecks = currDates.slice(0, 25); // ~89%

      const result = calcGrowthTrajectory(baseParams({
        habits: [{ checkHistory: [...prevChecks, ...currChecks] }],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.habits).not.toBeNull();
      expect(result!.domains.habits!.trend).toBe("up");
      expect(result!.domains.habits!.current).toBeGreaterThan(result!.domains.habits!.previous);
    });

    it("should detect decline when current period rate < previous period rate", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      const prevChecks = prevDates.slice(0, 25); // ~89% previous
      const currChecks = currDates.filter((_, i) => i % 2 === 0); // ~50% current

      const result = calcGrowthTrajectory(baseParams({
        habits: [{ checkHistory: [...prevChecks, ...currChecks] }],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.habits!.trend).toBe("down");
      expect(result!.domains.habits!.current).toBeLessThan(result!.domains.habits!.previous);
    });

    it("should detect stable when rates are similar (100%)", () => {
      // Both periods: check every day (100%)
      const allDates = datesBack(TODAY, 56);
      const result = calcGrowthTrajectory(baseParams({
        habits: [{ checkHistory: allDates }],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.habits!.trend).toBe("stable");
    });

    it("should detect stable when rates are similar at a lower level (~50%)", () => {
      // Both periods: check every other day (~50%)
      const allDates = datesBack(TODAY, 56);
      const everyOther = allDates.filter((_, i) => i % 2 === 0);
      const result = calcGrowthTrajectory(baseParams({
        habits: [{ checkHistory: everyOther }],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.habits!.trend).toBe("stable");
      expect(result!.domains.habits!.current).toBeGreaterThanOrEqual(46);
      expect(result!.domains.habits!.current).toBeLessThanOrEqual(54);
    });

    it("should handle multiple habits (avg completion rate across tracked habits)", () => {
      const allDates = datesBack(TODAY, 56);
      const halfDates = allDates.filter((_, i) => i % 2 === 0);
      // Habit 1: always checked, Habit 2: checked every other day
      const result = calcGrowthTrajectory(baseParams({
        habits: [
          { checkHistory: allDates },
          { checkHistory: halfDates },
        ],
      }));

      expect(result).not.toBeNull();
      // Rate = (28 + 14) / (2 * 28) = 75% for each period (symmetric data)
      expect(result!.domains.habits!.current).toBe(75);
      expect(result!.domains.habits!.previous).toBe(75);
      expect(result!.domains.habits!.trend).toBe("stable");
    });

    it("should exclude habits with empty checkHistory from denominator", () => {
      const allDates = datesBack(TODAY, 56);
      // Habit with data + habit with empty history: only tracked habit counts
      const result = calcGrowthTrajectory(baseParams({
        habits: [
          { checkHistory: allDates },
          { checkHistory: [] },
        ],
      }));

      expect(result).not.toBeNull();
      // Only habit 1 contributes: rate = 28/28 = 100%
      expect(result!.domains.habits!.current).toBe(100);
      expect(result!.domains.habits!.previous).toBe(100);
      expect(result!.domains.habits!.trend).toBe("stable");
    });
  });

  describe("pomodoro domain", () => {
    it("should compare avg daily sessions between periods", () => {
      // Previous: 2 sessions/day avg, Current: 4 sessions/day avg
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const pomodoroHistory = [
        ...prevDates.map(date => ({ date, count: 2 })),
        ...currDates.map(date => ({ date, count: 4 })),
      ];

      const result = calcGrowthTrajectory(baseParams({ pomodoroHistory }));

      expect(result).not.toBeNull();
      expect(result!.domains.pomodoro).not.toBeNull();
      expect(result!.domains.pomodoro!.current).toBe(4);
      expect(result!.domains.pomodoro!.previous).toBe(2);
      expect(result!.domains.pomodoro!.trend).toBe("up");
    });

    it("should return null for pomodoro domain when no sessions exist", () => {
      const allDates = datesBack(TODAY, 56);
      const result = calcGrowthTrajectory(baseParams({
        habits: [{ checkHistory: allDates }], // need at least one domain
        pomodoroHistory: [],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.pomodoro).toBeNull();
    });
  });

  describe("intention domain", () => {
    it("should compare done rates between periods", () => {
      // Previous: 40% done rate, Current: 80% done rate
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const intentionHistory = [
        ...prevDates.map((date, i) => ({ date, text: "go", done: i % 5 < 2 })), // 40%
        ...currDates.map((date, i) => ({ date, text: "go", done: i % 5 < 4 })), // 80%
      ];

      const result = calcGrowthTrajectory(baseParams({ intentionHistory }));

      expect(result).not.toBeNull();
      expect(result!.domains.intention).not.toBeNull();
      expect(result!.domains.intention!.trend).toBe("up");
      expect(result!.domains.intention!.current).toBeGreaterThan(result!.domains.intention!.previous);
    });

    it("should return null for intention domain when no entries exist", () => {
      const allDates = datesBack(TODAY, 56);
      const result = calcGrowthTrajectory(baseParams({
        habits: [{ checkHistory: allDates }],
        intentionHistory: [],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.intention).toBeNull();
    });
  });

  describe("momentum domain", () => {
    it("should compare avg scores between periods", () => {
      // Previous: avg 40, Current: avg 70
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const momentumHistory = [
        ...prevDates.map(date => ({ date, score: 40 })),
        ...currDates.map(date => ({ date, score: 70 })),
      ];

      const result = calcGrowthTrajectory(baseParams({ momentumHistory }));

      expect(result).not.toBeNull();
      expect(result!.domains.momentum).not.toBeNull();
      expect(result!.domains.momentum!.current).toBe(70);
      expect(result!.domains.momentum!.previous).toBe(40);
      expect(result!.domains.momentum!.trend).toBe("up");
    });
  });

  // ── Cross-domain composite ───────────────────────────────────────────────

  describe("overall composite score and grade", () => {
    it("should compute overall as average of active domain deltas", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      // All domains growing significantly
      const result = calcGrowthTrajectory(baseParams({
        habits: [{ checkHistory: [...prevDates.filter((_, i) => i % 2 === 0), ...currDates] }],
        pomodoroHistory: [
          ...prevDates.map(date => ({ date, count: 1 })),
          ...currDates.map(date => ({ date, count: 5 })),
        ],
        intentionHistory: [
          ...prevDates.map(date => ({ date, text: "x", done: false })),
          ...currDates.map(date => ({ date, text: "x", done: true })),
        ],
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 30 })),
          ...currDates.map(date => ({ date, score: 80 })),
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.overall).toBeGreaterThan(0);
      expect(["accelerating", "growing"]).toContain(result!.grade);
    });

    it("should grade 'accelerating' for large positive delta", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 20 })),
          ...currDates.map(date => ({ date, score: 80 })),
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.grade).toBe("accelerating");
    });

    it("should grade 'declining' for large negative delta", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 80 })),
          ...currDates.map(date => ({ date, score: 20 })),
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.grade).toBe("declining");
    });

    it("should grade 'stable' when metrics barely change", () => {
      const allDates = datesBack(TODAY, 56);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: allDates.map(date => ({ date, score: 60 })),
      }));

      expect(result).not.toBeNull();
      expect(result!.grade).toBe("stable");
      expect(result!.overall).toBe(0);
    });

    it("should grade 'growing' for moderate positive delta", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      // Moderate growth: 50 → 60 = +10pp
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 50 })),
          ...currDates.map(date => ({ date, score: 60 })),
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.grade).toBe("growing");
    });

    it("should grade 'slowing' for moderate negative delta", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      // Moderate decline: 60 → 50 = -10pp
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 60 })),
          ...currDates.map(date => ({ date, score: 50 })),
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.grade).toBe("slowing");
    });

    it("should grade boundary: overall=20 → accelerating", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      // delta = +20pp exactly → accelerating
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 40 })),
          ...currDates.map(date => ({ date, score: 60 })),
        ],
      }));
      expect(result).not.toBeNull();
      expect(result!.overall).toBe(20);
      expect(result!.grade).toBe("accelerating");
    });

    it("should grade boundary: overall=19 → growing (not accelerating)", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      // delta = +19pp → growing
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 40 })),
          ...currDates.map(date => ({ date, score: 59 })),
        ],
      }));
      expect(result).not.toBeNull();
      expect(result!.overall).toBe(19);
      expect(result!.grade).toBe("growing");
    });

    it("should grade boundary: overall=5 → growing", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 50 })),
          ...currDates.map(date => ({ date, score: 55 })),
        ],
      }));
      expect(result).not.toBeNull();
      expect(result!.overall).toBe(5);
      expect(result!.grade).toBe("growing");
    });

    it("should grade boundary: overall=4 → stable (not growing)", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 50 })),
          ...currDates.map(date => ({ date, score: 54 })),
        ],
      }));
      expect(result).not.toBeNull();
      expect(result!.overall).toBe(4);
      expect(result!.grade).toBe("stable");
    });

    it("should grade boundary: overall=-4 → stable (not slowing)", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 54 })),
          ...currDates.map(date => ({ date, score: 50 })),
        ],
      }));
      expect(result).not.toBeNull();
      expect(result!.overall).toBe(-4);
      expect(result!.grade).toBe("stable");
    });

    it("should grade boundary: overall=-5 → slowing", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 55 })),
          ...currDates.map(date => ({ date, score: 50 })),
        ],
      }));
      expect(result).not.toBeNull();
      expect(result!.overall).toBe(-5);
      expect(result!.grade).toBe("slowing");
    });

    it("should grade boundary: overall=-20 → declining", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 60 })),
          ...currDates.map(date => ({ date, score: 40 })),
        ],
      }));
      expect(result).not.toBeNull();
      expect(result!.overall).toBe(-20);
      expect(result!.grade).toBe("declining");
    });

    it("should grade boundary: overall=-19 → slowing (not declining)", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 59 })),
          ...currDates.map(date => ({ date, score: 40 })),
        ],
      }));
      expect(result).not.toBeNull();
      expect(result!.overall).toBe(-19);
      expect(result!.grade).toBe("slowing");
    });
  });

  // ── Strongest / Weakest domain detection ──────────────────────────────────

  describe("strongest and weakest domain", () => {
    it("should identify strongest and weakest growing domains", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const result = calcGrowthTrajectory(baseParams({
        // Habits: strong growth (50% → 100%)
        habits: [{ checkHistory: [...prevDates.filter((_, i) => i % 2 === 0), ...currDates] }],
        // Momentum: weak growth (50 → 55)
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 50 })),
          ...currDates.map(date => ({ date, score: 55 })),
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.strongestDomain).toBe("habits");
      expect(result!.weakestDomain).toBe("momentum");
    });

    it("should return null for strongest/weakest when only one domain active", () => {
      const allDates = datesBack(TODAY, 56);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: allDates.map(date => ({ date, score: 50 })),
      }));

      expect(result).not.toBeNull();
      expect(result!.strongestDomain).toBeNull();
      expect(result!.weakestDomain).toBeNull();
    });

    it("should return null for strongest/weakest when all domains have equal normalized delta", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      // Both domains: same normalized delta (+40pp for momentum, +8 sessions → 8×5=+40pp for pomodoro)
      const result = calcGrowthTrajectory(baseParams({
        pomodoroHistory: [
          ...prevDates.map(date => ({ date, count: 2 })),
          ...currDates.map(date => ({ date, count: 10 })),
        ],
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 30 })),
          ...currDates.map(date => ({ date, score: 70 })),
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.strongestDomain).toBeNull();
      expect(result!.weakestDomain).toBeNull();
    });
  });

  // ── Summary (Korean) ──────────────────────────────────────────────────────

  describe("Korean summary", () => {
    it("should produce a non-empty Korean summary string", () => {
      const allDates = datesBack(TODAY, 56);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: allDates.map(date => ({ date, score: 60 })),
      }));

      expect(result).not.toBeNull();
      expect(result!.summary.length).toBeGreaterThan(0);
    });

    it("should mention the grade in the summary", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 20 })),
          ...currDates.map(date => ({ date, score: 80 })),
        ],
      }));

      expect(result).not.toBeNull();
      // Summary should contain a growth-related Korean word
      expect(result!.summary).toMatch(/급성장|성장|안정|둔화|하락/);
    });
  });

  // ── Boundary values ───────────────────────────────────────────────────────

  describe("boundary values", () => {
    it("should work with exactly 2 * MIN_WINDOW_DAYS of data", () => {
      const dates = datesBack(TODAY, MIN_WINDOW_DAYS * 2);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: dates.map(date => ({ date, score: 50 })),
      }));

      expect(result).not.toBeNull();
    });

    it("should place today-27 in current period and today-28 in previous period", () => {
      // Boundary date test: day at windowDays offset belongs to previous, day before it to current
      const [y, m, d] = TODAY.split("-").map(Number);
      const boundaryCurrentDate = new Date(Date.UTC(y, m - 1, d - 27)).toISOString().slice(0, 10);
      const boundaryPreviousDate = new Date(Date.UTC(y, m - 1, d - 28)).toISOString().slice(0, 10);

      // Only data on the two boundary dates
      const allDates = datesBack(TODAY, 56);
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          // Score 90 on boundary-current date, 10 on boundary-previous date
          ...allDates.map(date => {
            if (date === boundaryCurrentDate) return { date, score: 90 };
            if (date === boundaryPreviousDate) return { date, score: 10 };
            return { date, score: 50 };
          }),
        ],
      }));

      expect(result).not.toBeNull();
      // Both periods have data; the specific boundary dates should be in their respective periods
      // Verify current avg > previous avg because of the 90-vs-10 boundary contribution
      // (both periods have many 50s, but current has one 90 and previous has one 10)
      expect(result!.domains.momentum!.current).toBeGreaterThan(result!.domains.momentum!.previous);
    });

    it("should handle data with gaps (non-consecutive days)", () => {
      // Only every 3rd day has data
      const prevDates = datesBack(TODAY, 56).slice(28).filter((_, i) => i % 3 === 0);
      const currDates = datesBack(TODAY, 28).filter((_, i) => i % 3 === 0);

      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 40 })),
          ...currDates.map(date => ({ date, score: 70 })),
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.momentum!.trend).toBe("up");
    });

    it("should handle momentum scores at extremes (0 and 100)", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 0 })),
          ...currDates.map(date => ({ date, score: 100 })),
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.momentum!.previous).toBe(0);
      expect(result!.domains.momentum!.current).toBe(100);
      expect(result!.grade).toBe("accelerating");
    });

    it("should handle pomodoro with zero counts (ignored days)", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const pomodoroHistory = [
        ...prevDates.map(date => ({ date, count: 0 })), // all zero previous
        ...currDates.map(date => ({ date, count: 3 })),
      ];

      const result = calcGrowthTrajectory(baseParams({ pomodoroHistory }));

      expect(result).not.toBeNull();
      expect(result!.domains.pomodoro!.previous).toBe(0);
      expect(result!.domains.pomodoro!.current).toBe(3);
      expect(result!.domains.pomodoro!.trend).toBe("up");
    });

    it("should cap delta at reasonable bounds to prevent extreme values", () => {
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      // Extreme growth: 0 → 100 momentum
      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 0 })),
          ...currDates.map(date => ({ date, score: 100 })),
        ],
      }));

      expect(result).not.toBeNull();
      // Overall should be capped within reasonable bounds
      expect(result!.overall).toBeGreaterThanOrEqual(-100);
      expect(result!.overall).toBeLessThanOrEqual(100);
    });

    it("should handle habits with no checkHistory field", () => {
      const allDates = datesBack(TODAY, 56);
      const result = calcGrowthTrajectory(baseParams({
        habits: [{ checkHistory: undefined }],
        momentumHistory: allDates.map(date => ({ date, score: 50 })),
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.habits).toBeNull();
    });
  });

  // ── Custom window size ────────────────────────────────────────────────────

  describe("custom window size", () => {
    it("should support custom windowDays parameter", () => {
      // 14-day windows instead of 28
      const dates = datesBack(TODAY, 28); // 2 × 14
      const prevDates = dates.slice(14);
      const currDates = dates.slice(0, 14);

      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 40 })),
          ...currDates.map(date => ({ date, score: 70 })),
        ],
        windowDays: 14,
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.momentum!.trend).toBe("up");
    });

    it("should use correct week count in summary for custom windowDays", () => {
      const dates = datesBack(TODAY, 28); // 2 × 14
      const prevDates = dates.slice(14);
      const currDates = dates.slice(0, 14);

      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 40 })),
          ...currDates.map(date => ({ date, score: 70 })),
        ],
        windowDays: 14,
      }));

      expect(result).not.toBeNull();
      expect(result!.summary).toContain("2주 성장 궤적");
    });
  });

  // ── normalizeDelta cap — pomodoro ×5 scale capped at ±100 ─────────────────

  describe("normalizeDelta cap — pomodoro ×5 factor capped at ±100pp", () => {
    it("should cap pomodoro normalized delta at +100 when session delta exceeds +20", () => {
      // delta = 22 - 1 = 21 → raw normalized = 21 × 5 = 105 → capped to 100
      // Single active domain → overall = 100, grade = "accelerating"
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const result = calcGrowthTrajectory(baseParams({
        pomodoroHistory: [
          ...prevDates.map(date => ({ date, count: 1 })),   // prev avg = 1
          ...currDates.map(date => ({ date, count: 22 })),  // curr avg = 22
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.pomodoro!.delta).toBe(21);
      expect(result!.overall).toBe(100);         // min(100, 21×5=105) = 100
      expect(result!.grade).toBe("accelerating");
    });

    it("should cap pomodoro normalized delta at -100 when session delta falls below -20", () => {
      // delta = 1 - 22 = -21 → raw normalized = -21 × 5 = -105 → capped to -100
      // Single active domain → overall = -100, grade = "declining"
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);

      const result = calcGrowthTrajectory(baseParams({
        pomodoroHistory: [
          ...prevDates.map(date => ({ date, count: 22 })),  // prev avg = 22
          ...currDates.map(date => ({ date, count: 1 })),   // curr avg = 1
        ],
      }));

      expect(result).not.toBeNull();
      expect(result!.domains.pomodoro!.delta).toBe(-21);
      expect(result!.overall).toBe(-100);        // max(-100, -21×5=-105) = -100
      expect(result!.grade).toBe("declining");
    });
  });

  // ── Duplicate date handling ───────────────────────────────────────────────

  describe("duplicate date handling", () => {
    it("should use last entry when momentum history has duplicate dates", () => {
      // Momentum deduplication uses last-entry-wins (Map.set overwrites)
      // overlapDate gets score=90 first, then score=10 → last entry (10) wins
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      const overlapDate = currDates[0]; // most recent date in current period = TODAY
      expect(overlapDate).toBe(TODAY);

      const result = calcGrowthTrajectory(baseParams({
        momentumHistory: [
          ...prevDates.map(date => ({ date, score: 50 })),
          ...currDates.map(date => ({ date, score: 90 })),
          { date: overlapDate, score: 10 }, // appended last → overwrites the 90
        ],
      }));

      expect(result).not.toBeNull();
      // overlapDate = 10; remaining 27 current dates = 90
      // currAvg = round((10 + 90 × 27) / 28) = round(2440 / 28) = 87
      expect(result!.domains.momentum!.current).toBe(Math.round((10 + 90 * 27) / 28));
    });

    it("should sum pomodoro counts when the same date appears multiple times", () => {
      // Pomodoro deduplication SUMS counts (unlike momentum's last-entry-wins overwrite).
      // Values are chosen so summation and last-wins produce distinct curr averages:
      //   With summation: dupeDate = 1+10+5 = 16, others = 1
      //     → currAvg = round((16 + 27) / 28) = round(43/28) = round(1.535) = 2
      //   With last-wins (hypothetical bug — last extra = count=5): dupeDate = 5, others = 1
      //     → currAvg = round((5 + 27) / 28) = round(32/28) = round(1.142) = 1
      const prevDates = datesBack(TODAY, 56).slice(28);
      const currDates = datesBack(TODAY, 28);
      const dupeDate = currDates[0];

      const result = calcGrowthTrajectory(baseParams({
        pomodoroHistory: [
          ...prevDates.map(date => ({ date, count: 1 })),   // prev avg = 1
          ...currDates.map(date => ({ date, count: 1 })),   // base current = 1 for all
          { date: dupeDate, count: 10 },                    // +10 → running total = 11
          { date: dupeDate, count: 5 },                     // +5  → running total = 16
        ],
      }));

      // Summation: dupeDate=16, 27 others=1 → currSum=43, days=28 → currAvg=round(43/28)=2
      // Last-wins (bug): dupeDate=5, 27 others=1 → currSum=32, days=28 → currAvg=round(32/28)=1
      expect(result).not.toBeNull();
      expect(result!.domains.pomodoro!.current).toBe(2);    // summation, not last-wins
      expect(result!.domains.pomodoro!.previous).toBe(1);
      expect(result!.domains.pomodoro!.delta).toBe(1);
      expect(result!.domains.pomodoro!.trend).toBe("up");
    });
  });
});
