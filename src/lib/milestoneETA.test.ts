// ABOUTME: Tests for calcDailySuccessRate and calcMilestoneETA — streak milestone probability forecasting
// ABOUTME: Covers rate computation from checkHistory, ETA prediction, probability thresholds, and edge cases

import { describe, it, expect } from "vitest";
import { calcDailySuccessRate, calcMilestoneETA, type MilestoneETA } from "./milestoneETA";

describe("calcDailySuccessRate", () => {
  it("should return null for empty window", () => {
    expect(calcDailySuccessRate(["2026-03-01"], [])).toBeNull();
  });

  it("should return 0 for empty history with non-empty window", () => {
    expect(calcDailySuccessRate([], ["2026-03-01", "2026-03-02"])).toBe(0);
  });

  it("should return 0 for undefined history", () => {
    expect(calcDailySuccessRate(undefined, ["2026-03-01", "2026-03-02"])).toBe(0);
  });

  it("should return 1 when all window days are checked", () => {
    const window = ["2026-03-01", "2026-03-02", "2026-03-03"];
    const history = ["2026-03-01", "2026-03-02", "2026-03-03"];
    expect(calcDailySuccessRate(history, window)).toBe(1);
  });

  it("should return correct ratio for partial check-ins", () => {
    const window = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"];
    const history = ["2026-03-01", "2026-03-03"]; // 2 of 4
    expect(calcDailySuccessRate(history, window)).toBe(0.5);
  });

  it("should ignore history entries outside the window", () => {
    const window = ["2026-03-03", "2026-03-04"];
    const history = ["2026-02-28", "2026-03-01", "2026-03-03"]; // only 1 in window
    expect(calcDailySuccessRate(history, window)).toBe(0.5);
  });

  it("should handle 14-day realistic window", () => {
    const window = Array.from({ length: 14 }, (_, i) => {
      const d = new Date("2026-03-08T00:00:00");
      d.setDate(d.getDate() - 13 + i);
      return d.toLocaleDateString("sv");
    });
    // Check 10 of 14 days
    const history = window.filter((_, i) => i % 2 === 0 || i > 9);
    const rate = calcDailySuccessRate(history, window);
    expect(rate).toBeCloseTo(history.length / 14, 5);
  });
});

describe("calcMilestoneETA", () => {
  const MILESTONES = [
    { at: 7, badge: "🔥" },
    { at: 30, badge: "⭐" },
    { at: 100, badge: "💎" },
  ];

  it("should return null when no next milestone exists (past all milestones)", () => {
    expect(calcMilestoneETA(100, MILESTONES, 0.9)).toBeNull();
    expect(calcMilestoneETA(150, MILESTONES, 0.9)).toBeNull();
  });

  it("should return null when daysRemaining is 1-2 (covered by approach badges)", () => {
    // streak=5, next milestone=7, daysRemaining=2
    expect(calcMilestoneETA(5, MILESTONES, 0.9)).toBeNull();
    // streak=6, next milestone=7, daysRemaining=1
    expect(calcMilestoneETA(6, MILESTONES, 0.9)).toBeNull();
  });

  it("should return result when daysRemaining >= 3", () => {
    // streak=4, next milestone=7, daysRemaining=3
    const result = calcMilestoneETA(4, MILESTONES, 0.9);
    expect(result).not.toBeNull();
    expect(result!.target).toBe(7);
    expect(result!.daysRemaining).toBe(3);
    expect(result!.badge).toBe("🔥");
    // probability = 0.9^3 = 0.729
    expect(result!.probability).toBeCloseTo(0.729, 3);
  });

  it("should return null when probability < 10%", () => {
    // streak=0, next milestone=7, daysRemaining=7, rate=0.7
    // probability = 0.7^7 = 0.0824 < 0.10
    expect(calcMilestoneETA(0, MILESTONES, 0.7)).toBeNull();
  });

  it("should return result when probability >= 10%", () => {
    // streak=0, next milestone=7, daysRemaining=7, rate=0.75
    // probability = 0.75^7 = 0.1335 >= 0.10
    const result = calcMilestoneETA(0, MILESTONES, 0.75);
    expect(result).not.toBeNull();
    expect(result!.target).toBe(7);
    expect(result!.probability).toBeCloseTo(0.75 ** 7, 3);
  });

  it("should pick the next milestone above current streak", () => {
    // streak=10 → next milestone=30, daysRemaining=20
    const result = calcMilestoneETA(10, MILESTONES, 0.95);
    expect(result).not.toBeNull();
    expect(result!.target).toBe(30);
    expect(result!.daysRemaining).toBe(20);
    expect(result!.badge).toBe("⭐");
  });

  it("should return null for success rate of 0", () => {
    // probability = 0^N = 0 < 0.10
    expect(calcMilestoneETA(4, MILESTONES, 0)).toBeNull();
  });

  it("should return 100% probability for success rate of 1", () => {
    const result = calcMilestoneETA(4, MILESTONES, 1);
    expect(result).not.toBeNull();
    expect(result!.probability).toBe(1);
  });

  it("should skip milestone at exactly current streak (edge case)", () => {
    // streak=7, at milestone 7 exactly → next milestone=30
    const result = calcMilestoneETA(7, MILESTONES, 0.95);
    expect(result).not.toBeNull();
    expect(result!.target).toBe(30);
    expect(result!.daysRemaining).toBe(23);
  });

  it("should handle single-milestone array", () => {
    const milestones = [{ at: 14, badge: "🎯" }];
    const result = calcMilestoneETA(5, milestones, 0.85);
    expect(result).not.toBeNull();
    expect(result!.target).toBe(14);
    expect(result!.daysRemaining).toBe(9);
    expect(result!.badge).toBe("🎯");
    expect(result!.probability).toBeCloseTo(0.85 ** 9, 3);
  });

  it("should return null for empty milestones array", () => {
    expect(calcMilestoneETA(5, [], 0.9)).toBeNull();
  });

  it("should correctly handle streak=0 with high success rate", () => {
    // streak=0, next milestone=7, daysRemaining=7, rate=0.9
    // probability = 0.9^7 = 0.478
    const result = calcMilestoneETA(0, MILESTONES, 0.9);
    expect(result).not.toBeNull();
    expect(result!.target).toBe(7);
    expect(result!.daysRemaining).toBe(7);
    expect(result!.probability).toBeCloseTo(0.9 ** 7, 3);
  });

  it("should return null when probability is exactly at boundary (< 0.10 strictly)", () => {
    // Find a rate where probability is just below 10%
    // streak=27, next=30, daysRemaining=3, need p^3 < 0.10 → p < 0.464
    const result = calcMilestoneETA(27, MILESTONES, 0.46);
    // 0.46^3 = 0.097 < 0.10
    expect(result).toBeNull();
  });

  it("should return result when probability is exactly at 10% boundary", () => {
    // 0.47^3 = 0.1038 >= 0.10
    const result = calcMilestoneETA(27, MILESTONES, 0.47);
    expect(result).not.toBeNull();
    expect(result!.probability).toBeCloseTo(0.47 ** 3, 3);
  });
});
