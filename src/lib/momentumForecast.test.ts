// ABOUTME: Tests for calcMomentumForecast — 7-day momentum score prediction ("productivity weather forecast")
// ABOUTME: Covers: null on insufficient data, weekday-weighted prediction, trend adjustment, weather emojis, summary text, boundary values

import { describe, it, expect } from "vitest";
import {
  calcMomentumForecast,
  type MomentumForecastParams,
  type MomentumForecast,
  MIN_HISTORY_DAYS,
} from "./momentumForecast";

// ── Helper: generate momentum history entries ────────────────────────────────

/** Creates N days of momentum history ending at `endDate` with a constant score. */
function makeHistory(
  endDate: string,
  days: number,
  score: number,
): Array<{ date: string; score: number }> {
  const entries: Array<{ date: string; score: number }> = [];
  const [y, m, d] = endDate.split("-").map(Number);
  const baseMs = Date.UTC(y, m - 1, d);
  const MS_PER_DAY = 86_400_000;
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
    entries.push({ date: dt, score });
  }
  return entries;
}

/** Creates history with per-weekday scores (0=Sun..6=Sat). */
function makeWeekdayHistory(
  endDate: string,
  weeks: number,
  weekdayScores: Record<number, number>,
): Array<{ date: string; score: number }> {
  const entries: Array<{ date: string; score: number }> = [];
  const [y, m, d] = endDate.split("-").map(Number);
  const baseMs = Date.UTC(y, m - 1, d);
  const MS_PER_DAY = 86_400_000;
  const totalDays = weeks * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const dateMs = baseMs - i * MS_PER_DAY;
    const dt = new Date(dateMs).toISOString().slice(0, 10);
    const weekday = new Date(dateMs).getUTCDay();
    entries.push({ date: dt, score: weekdayScores[weekday] ?? 50 });
  }
  return entries;
}

// ── Null guard ───────────────────────────────────────────────────────────────

describe("calcMomentumForecast", () => {
  describe("null when insufficient data", () => {
    it("should return null when history is empty", () => {
      const result = calcMomentumForecast({
        momentumHistory: [],
        todayStr: "2026-03-22",
      });
      expect(result).toBeNull();
    });

    it("should return null when history has fewer than MIN_HISTORY_DAYS entries", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", MIN_HISTORY_DAYS - 1, 60),
        todayStr: "2026-03-22",
      });
      expect(result).toBeNull();
    });

    it("should return non-null when history has exactly MIN_HISTORY_DAYS entries", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", MIN_HISTORY_DAYS, 60),
        todayStr: "2026-03-22",
      });
      expect(result).not.toBeNull();
    });
  });

  // ── Basic structure ──────────────────────────────────────────────────────

  describe("output structure", () => {
    const params: MomentumForecastParams = {
      momentumHistory: makeHistory("2026-03-22", 14, 60),
      todayStr: "2026-03-22",
    };

    it("should return exactly 7 forecast days", () => {
      const result = calcMomentumForecast(params)!;
      expect(result.days).toHaveLength(7);
    });

    it("should forecast dates starting from tomorrow", () => {
      const result = calcMomentumForecast(params)!;
      expect(result.days[0].date).toBe("2026-03-23");
      expect(result.days[6].date).toBe("2026-03-29");
    });

    it("should include weekday numbers 0-6", () => {
      const result = calcMomentumForecast(params)!;
      for (const day of result.days) {
        expect(day.weekday).toBeGreaterThanOrEqual(0);
        expect(day.weekday).toBeLessThanOrEqual(6);
      }
    });

    it("should have integer predicted scores in 0-100 range", () => {
      const result = calcMomentumForecast(params)!;
      for (const day of result.days) {
        expect(day.predicted).toBeGreaterThanOrEqual(0);
        expect(day.predicted).toBeLessThanOrEqual(100);
        expect(Number.isInteger(day.predicted)).toBe(true);
      }
    });

    it("should include a weekAvg that is the average of day predictions", () => {
      const result = calcMomentumForecast(params)!;
      const expectedAvg = Math.round(
        result.days.reduce((sum, d) => sum + d.predicted, 0) / 7,
      );
      expect(result.weekAvg).toBe(expectedAvg);
    });

    it("should include a summary with expected Korean format", () => {
      const result = calcMomentumForecast(params)!;
      expect(result.summary).toMatch(/^주간 예측 \d+점\(.+\) · 최고 [일월화수목금토]\(\d+\) · 최저 [일월화수목금토]\(\d+\)$/);
    });
  });

  // ── Constant score → uniform prediction ──────────────────────────────────

  describe("constant history produces uniform forecast", () => {
    it("should predict exactly 60 for all days when history is constant 60", () => {
      // With constant S: weekdayAvg=S, recentAvg=S, trendAdjust=0 → blend = S*0.6 + S*0.4 = S
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 21, 60),
        todayStr: "2026-03-22",
      })!;
      for (const day of result.days) {
        expect(day.predicted).toBe(60);
      }
    });

    it("should predict exactly 90 for constant 90 history", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 21, 90),
        todayStr: "2026-03-22",
      })!;
      for (const day of result.days) {
        expect(day.predicted).toBe(90);
      }
    });

    it("should have stable trend for constant history", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 21, 60),
        todayStr: "2026-03-22",
      })!;
      expect(result.trend).toBe("stable");
    });
  });

  // ── Weekday pattern detection ────────────────────────────────────────────

  describe("weekday pattern detection", () => {
    it("should predict higher scores for historically strong weekdays", () => {
      // Weekdays (Mon-Fri) score 80, weekends score 40
      const weekdayScores: Record<number, number> = {
        0: 40, // Sun
        1: 80, // Mon
        2: 80, // Tue
        3: 80, // Wed
        4: 80, // Thu
        5: 80, // Fri
        6: 40, // Sat
      };
      const result = calcMomentumForecast({
        // 2026-03-22 is Sunday → tomorrow Mon(1), ..., Sun(0)
        momentumHistory: makeWeekdayHistory("2026-03-22", 3, weekdayScores),
        todayStr: "2026-03-22",
      })!;

      // Monday (tomorrow) should be predicted higher than Saturday
      const monday = result.days.find(d => d.weekday === 1)!;
      const saturday = result.days.find(d => d.weekday === 6)!;
      expect(monday.predicted).toBeGreaterThan(saturday.predicted);
    });
  });

  // ── Recent trend influence ───────────────────────────────────────────────

  describe("recent trend influence", () => {
    it("should lift predictions when recent days trend upward", () => {
      // First 14 days at 50, then last 7 days climbing 60→90
      const history: Array<{ date: string; score: number }> = [];
      const [y, m, d] = [2026, 3, 22];
      const baseMs = Date.UTC(y, m - 1, d);
      const MS_PER_DAY = 86_400_000;

      // Days 21..8 (14 days at 50)
      for (let i = 20; i >= 7; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: 50 });
      }
      // Days 7..1 (7 days climbing)
      const climbing = [60, 65, 70, 75, 80, 85, 90];
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: climbing[6 - i] });
      }

      const result = calcMomentumForecast({
        momentumHistory: history,
        todayStr: "2026-03-22",
      })!;

      // Predictions should be lifted above the overall average (~62)
      expect(result.weekAvg).toBeGreaterThan(65);
      expect(result.trend).toBe("improving");
    });

    it("should lower predictions when recent days trend downward", () => {
      const history: Array<{ date: string; score: number }> = [];
      const baseMs = Date.UTC(2026, 2, 22);
      const MS_PER_DAY = 86_400_000;

      // Days 21..8 (14 days at 80)
      for (let i = 20; i >= 7; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: 80 });
      }
      // Days 7..1 (7 days declining)
      const declining = [70, 60, 55, 50, 45, 40, 30];
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: declining[6 - i] });
      }

      const result = calcMomentumForecast({
        momentumHistory: history,
        todayStr: "2026-03-22",
      })!;

      // Predictions should be pulled below the overall average (~67)
      expect(result.weekAvg).toBeLessThan(60);
      expect(result.trend).toBe("declining");
    });
  });

  // ── Weather emoji assignment ──────────────────────────────────────────────

  describe("weather emoji assignment", () => {
    it("should assign ☀️ for predicted >= 75", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 21, 85),
        todayStr: "2026-03-22",
      })!;
      for (const day of result.days) {
        expect(day.emoji).toBe("☀️");
      }
    });

    it("should assign 🌧️ for predicted < 30", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 21, 15),
        todayStr: "2026-03-22",
      })!;
      for (const day of result.days) {
        expect(day.emoji).toBe("🌧️");
      }
    });

    it("should assign distinct emojis for different score tiers", () => {
      // Build history where each weekday has a very different score
      const weekdayScores: Record<number, number> = {
        0: 15, // 🌧️
        1: 35, // ☁️
        2: 50, // ⛅
        3: 65, // 🌤️
        4: 85, // ☀️
        5: 50, // ⛅
        6: 15, // 🌧️
      };
      const result = calcMomentumForecast({
        momentumHistory: makeWeekdayHistory("2026-03-22", 4, weekdayScores),
        todayStr: "2026-03-22",
      })!;

      const emojis = new Set(result.days.map(d => d.emoji));
      // Should have at least 3 distinct emojis given the spread
      expect(emojis.size).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Confidence levels ──────────────────────────────────────────────────────

  describe("confidence levels", () => {
    it("should assign 'high' when a weekday has ≥3 samples", () => {
      // 28 consecutive days → each weekday appears 4 times → all "high"
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 28, 60),
        todayStr: "2026-03-22",
      })!;
      for (const day of result.days) {
        expect(day.confidence).toBe("high");
      }
    });

    it("should assign 'low' when a weekday has ≤1 sample", () => {
      // 7 consecutive days → each weekday appears exactly once → all "low"
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 7, 60),
        todayStr: "2026-03-22",
      })!;
      for (const day of result.days) {
        expect(day.confidence).toBe("low");
      }
    });

    it("should assign 'medium' when a weekday has exactly 2 samples", () => {
      // 14 consecutive days → each weekday appears exactly 2 times → all "medium"
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 14, 60),
        todayStr: "2026-03-22",
      })!;
      for (const day of result.days) {
        expect(day.confidence).toBe("medium");
      }
    });
  });

  // ── Boundary values ─────────────────────────────────────────────────────

  describe("boundary values", () => {
    it("should clamp predictions to 0-100 even with extreme trend adjustment", () => {
      // History at 95, trending up → should not exceed 100
      const history: Array<{ date: string; score: number }> = [];
      const baseMs = Date.UTC(2026, 2, 22);
      const MS_PER_DAY = 86_400_000;
      for (let i = 13; i >= 7; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: 90 });
      }
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: 100 });
      }

      const result = calcMomentumForecast({
        momentumHistory: history,
        todayStr: "2026-03-22",
      })!;
      for (const day of result.days) {
        expect(day.predicted).toBeLessThanOrEqual(100);
        expect(day.predicted).toBeGreaterThanOrEqual(0);
      }
    });

    it("should clamp predictions to 0 even with extreme downward trend", () => {
      const history: Array<{ date: string; score: number }> = [];
      const baseMs = Date.UTC(2026, 2, 22);
      const MS_PER_DAY = 86_400_000;
      for (let i = 13; i >= 7; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: 10 });
      }
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: 0 });
      }

      const result = calcMomentumForecast({
        momentumHistory: history,
        todayStr: "2026-03-22",
      })!;
      for (const day of result.days) {
        expect(day.predicted).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle exactly MIN_HISTORY_DAYS at the boundary", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", MIN_HISTORY_DAYS, 50),
        todayStr: "2026-03-22",
      })!;
      expect(result.days).toHaveLength(7);
      expect(result.weekAvg).toBeGreaterThanOrEqual(0);
    });

    it("should handle today being the last day of month", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-31", 14, 70),
        todayStr: "2026-03-31",
      })!;
      expect(result.days[0].date).toBe("2026-04-01");
      expect(result.days).toHaveLength(7);
    });

    it("should handle today being December 31 (year boundary)", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-12-31", 14, 55),
        todayStr: "2026-12-31",
      })!;
      expect(result.days[0].date).toBe("2027-01-01");
    });
  });

  // ── Duplicate history entries ──────────────────────────────────────────────

  describe("duplicate history entries", () => {
    it("should use latest score when history contains duplicate dates", () => {
      // All days score 60, but override last date to 90
      const base = makeHistory("2026-03-22", 14, 60);
      base.push({ date: "2026-03-22", score: 90 });

      // Compare: without the override all predictions would be 60
      const resultWithOverride = calcMomentumForecast({
        momentumHistory: base,
        todayStr: "2026-03-22",
      })!;
      const resultWithout = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 14, 60),
        todayStr: "2026-03-22",
      })!;

      // The override should influence predictions (recent avg shifts up)
      const avgWith = resultWithOverride.weekAvg;
      const avgWithout = resultWithout.weekAvg;
      expect(avgWith).toBeGreaterThan(avgWithout);
    });

    it("should return null when duplicates reduce unique dates below MIN_HISTORY_DAYS", () => {
      // 7 raw entries but all on the same date → 1 unique → null
      const history = Array.from({ length: MIN_HISTORY_DAYS }, (_, i) => ({
        date: "2026-03-22",
        score: 50 + i,
      }));
      const result = calcMomentumForecast({
        momentumHistory: history,
        todayStr: "2026-03-22",
      });
      expect(result).toBeNull();
    });
  });

  // ── Trend classification ──────────────────────────────────────────────────

  describe("trend classification", () => {
    it("should be stable when recent week avg ≈ prior week avg", () => {
      const result = calcMomentumForecast({
        momentumHistory: makeHistory("2026-03-22", 21, 65),
        todayStr: "2026-03-22",
      })!;
      expect(result.trend).toBe("stable");
    });

    it("should be stable when history is too short for a symmetric prior window", () => {
      // 10 entries: recent 7, prior only 3 → asymmetric → treated as stable
      const history: Array<{ date: string; score: number }> = [];
      const baseMs = Date.UTC(2026, 2, 22);
      const MS_PER_DAY = 86_400_000;
      // First 3 days at 30 (would be "prior")
      for (let i = 9; i >= 7; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: 30 });
      }
      // Last 7 days at 90 (would be "recent")
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(baseMs - i * MS_PER_DAY).toISOString().slice(0, 10);
        history.push({ date: dt, score: 90 });
      }

      const result = calcMomentumForecast({
        momentumHistory: history,
        todayStr: "2026-03-22",
      })!;
      // With only 3 prior entries (< RECENT_WINDOW=7), prior window is too short
      // for symmetric comparison → trend should be stable despite large score difference
      expect(result.trend).toBe("stable");
    });
  });
});
