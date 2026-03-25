// ABOUTME: Unit tests for HealthPulse component — cross-domain vital-signs strip
// ABOUTME: Covers null rendering, burnout risk levels with labels, consistency grade with all trend arrows, growth trajectory grade, and independent nullability

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthPulse } from "./HealthPulse";
import type { BurnoutRisk } from "../lib/burnoutRisk";
import type { ConsistencyScore } from "../lib/consistencyScore";
import type { GrowthTrajectory } from "../lib/growthTrajectory";

// ── Fixtures ────────────────────────────────────────────────

const burnoutLow: BurnoutRisk = {
  score: 12,
  level: "low",
  factors: [],
};

const burnoutHigh: BurnoutRisk = {
  score: 62,
  level: "high",
  factors: ["momentum_crash", "habit_erosion"],
};

const burnoutModerate: BurnoutRisk = {
  score: 40,
  level: "moderate",
  factors: ["momentum_crash"],
};

const burnoutCritical: BurnoutRisk = {
  score: 85,
  level: "critical",
  factors: ["momentum_crash", "habit_erosion", "focus_drought"],
};

const consistencyStrong: ConsistencyScore = {
  domains: {
    habits: { rate: 78, activeDays: 22, totalDays: 28 },
    pomodoro: { rate: 71, activeDays: 20, totalDays: 28 },
    intention: null,
  },
  overall: 75,
  grade: "strong",
  trend: null,
  weakestDomain: null,
};

const consistencyElite: ConsistencyScore = {
  domains: {
    habits: { rate: 92, activeDays: 26, totalDays: 28 },
    pomodoro: { rate: 85, activeDays: 24, totalDays: 28 },
    intention: { rate: 78, activeDays: 22, totalDays: 28 },
  },
  overall: 85,
  grade: "elite",
  trend: "improving",
  weakestDomain: "intention",
};

const consistencyDeclining: ConsistencyScore = {
  domains: {
    habits: { rate: 50, activeDays: 14, totalDays: 28 },
    pomodoro: null,
    intention: { rate: 42, activeDays: 12, totalDays: 28 },
  },
  overall: 46,
  grade: "steady",
  trend: "declining",
  weakestDomain: "intention",
};

const consistencyStable: ConsistencyScore = {
  domains: {
    habits: { rate: 40, activeDays: 11, totalDays: 28 },
    pomodoro: null,
    intention: { rate: 35, activeDays: 10, totalDays: 28 },
  },
  overall: 38,
  grade: "building",
  trend: "stable",
  weakestDomain: "intention",
};

const consistencyNoTrend: ConsistencyScore = {
  domains: {
    habits: { rate: 30, activeDays: 8, totalDays: 28 },
    pomodoro: null,
    intention: null,
  },
  overall: 30,
  grade: "inconsistent",
  trend: null,
  weakestDomain: null,
};

const growthAccelerating: GrowthTrajectory = {
  domains: {
    habits: { current: 85, previous: 60, delta: 25, trend: "up" },
    pomodoro: { current: 4.2, previous: 3.0, delta: 1.2, trend: "up" },
    intention: { current: 70, previous: 55, delta: 15, trend: "up" },
    momentum: { current: 72, previous: 58, delta: 14, trend: "up" },
  },
  overall: 22,
  grade: "accelerating",
  strongestDomain: "habits",
  weakestDomain: "pomodoro",
  summary: "전 영역 급성장 중 — 습관이 견인",
};

const growthDeclining: GrowthTrajectory = {
  domains: {
    habits: { current: 40, previous: 65, delta: -25, trend: "down" },
    pomodoro: null,
    intention: null,
    momentum: { current: 35, previous: 50, delta: -15, trend: "down" },
  },
  overall: -22,
  grade: "declining",
  strongestDomain: null,
  weakestDomain: "habits",
  summary: "전반적 하락세 — 습관 회복 필요",
};

const growthStable: GrowthTrajectory = {
  domains: {
    habits: { current: 60, previous: 58, delta: 2, trend: "stable" },
    pomodoro: null,
    intention: null,
    momentum: { current: 50, previous: 52, delta: -2, trend: "stable" },
  },
  overall: 0,
  grade: "stable",
  strongestDomain: null,
  weakestDomain: null,
  summary: "안정적 유지 중",
};

// ── Tests ────────────────────────────────────────────────────

describe("HealthPulse", () => {
  it("should render nothing when all metrics are null", () => {
    const { container } = render(
      <HealthPulse burnout={null} consistency={null} growth={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  describe("burnout risk", () => {
    it("should display burnout score, level label, and tooltip", () => {
      render(
        <HealthPulse burnout={burnoutHigh} consistency={null} growth={null} />,
      );
      expect(screen.getByText("62")).toBeDefined();
      expect(screen.getByText("경고")).toBeDefined();
      expect(screen.getByTitle(/번아웃 위험: 경고/)).toBeDefined();
    });

    it("should show critical level with label", () => {
      render(
        <HealthPulse burnout={burnoutCritical} consistency={null} growth={null} />,
      );
      expect(screen.getByText("85")).toBeDefined();
      expect(screen.getByText("위험")).toBeDefined();
    });

    it("should show low level with label", () => {
      render(
        <HealthPulse burnout={burnoutLow} consistency={null} growth={null} />,
      );
      expect(screen.getByText("12")).toBeDefined();
      expect(screen.getByText("양호")).toBeDefined();
    });

    it("should show moderate level with 주의 label and factors in tooltip", () => {
      render(
        <HealthPulse burnout={burnoutModerate} consistency={null} growth={null} />,
      );
      expect(screen.getByText("40")).toBeDefined();
      expect(screen.getByText("주의")).toBeDefined();
      expect(screen.getByTitle(/번아웃 위험: 주의 \(40\/100\) .* momentum_crash/)).toBeDefined();
    });

    it("should omit factors suffix in tooltip when factors array is empty", () => {
      render(
        <HealthPulse burnout={burnoutLow} consistency={null} growth={null} />,
      );
      const el = screen.getByTitle("번아웃 위험: 양호 (12/100)");
      expect(el.title).not.toContain("\u2212");
    });
  });

  describe("consistency grade", () => {
    it("should display consistency overall score and tooltip", () => {
      render(
        <HealthPulse burnout={null} consistency={consistencyElite} growth={null} />,
      );
      expect(screen.getByText("85%")).toBeDefined();
      expect(screen.getByTitle(/일관성: elite/)).toBeDefined();
    });

    it("should show improving trend arrow (↑)", () => {
      render(
        <HealthPulse burnout={null} consistency={consistencyElite} growth={null} />,
      );
      expect(screen.getByText("↑")).toBeDefined();
    });

    it("should show declining trend arrow (↓)", () => {
      render(
        <HealthPulse burnout={null} consistency={consistencyDeclining} growth={null} />,
      );
      expect(screen.getByText("↓")).toBeDefined();
      expect(screen.getByText("46%")).toBeDefined();
    });

    it("should show stable trend arrow (→)", () => {
      render(
        <HealthPulse burnout={null} consistency={consistencyStable} growth={null} />,
      );
      expect(screen.getByText("→")).toBeDefined();
      expect(screen.getByText("38%")).toBeDefined();
    });

    it("should render strong grade with percentage and tooltip including grade name", () => {
      render(
        <HealthPulse burnout={null} consistency={consistencyStrong} growth={null} />,
      );
      expect(screen.getByText("75%")).toBeDefined();
      expect(screen.getByTitle(/일관성: strong/)).toBeDefined();
    });

    it("should omit trend arrow when trend is null", () => {
      render(
        <HealthPulse burnout={null} consistency={consistencyNoTrend} growth={null} />,
      );
      expect(screen.getByText("30%")).toBeDefined();
      expect(screen.queryByText("↑")).toBeNull();
      expect(screen.queryByText("↓")).toBeNull();
      expect(screen.queryByText("→")).toBeNull();
    });
  });

  describe("growth trajectory", () => {
    it("should display positive growth with + prefix", () => {
      render(
        <HealthPulse burnout={null} consistency={null} growth={growthAccelerating} />,
      );
      expect(screen.getByText("+22")).toBeDefined();
      expect(screen.getByTitle(/성장 궤적: accelerating/)).toBeDefined();
    });

    it("should display negative growth with Unicode minus", () => {
      render(
        <HealthPulse burnout={null} consistency={null} growth={growthDeclining} />,
      );
      // U+2212 MINUS SIGN
      expect(screen.getByText("\u221222")).toBeDefined();
    });

    it("should display zero growth as '0'", () => {
      render(
        <HealthPulse burnout={null} consistency={null} growth={growthStable} />,
      );
      expect(screen.getByText("0")).toBeDefined();
    });

    it("should omit 강점 from tooltip when strongestDomain is null", () => {
      render(
        <HealthPulse burnout={null} consistency={null} growth={growthDeclining} />,
      );
      const el = screen.getByTitle(/성장 궤적: declining/);
      expect(el.title).not.toContain("강점:");
    });
  });

  describe("combined display", () => {
    it("should show all three metrics when all are present", () => {
      render(
        <HealthPulse
          burnout={burnoutLow}
          consistency={consistencyElite}
          growth={growthAccelerating}
        />,
      );
      expect(screen.getByText("12")).toBeDefined();
      expect(screen.getByText("양호")).toBeDefined();
      expect(screen.getByText("85%")).toBeDefined();
      expect(screen.getByText("+22")).toBeDefined();
    });

    it("should show only non-null metrics (burnout null)", () => {
      render(
        <HealthPulse
          burnout={null}
          consistency={consistencyStable}
          growth={growthAccelerating}
        />,
      );
      expect(screen.queryByTitle(/번아웃/)).toBeNull();
      expect(screen.getByTitle(/일관성/)).toBeDefined();
      expect(screen.getByTitle(/성장/)).toBeDefined();
    });
  });
});
