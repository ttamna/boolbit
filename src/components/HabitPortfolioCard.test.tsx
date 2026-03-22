// ABOUTME: Unit tests for HabitPortfolioCard — compact visual matrix showing per-habit portfolio state
// ABOUTME: Covers null rendering, per-habit state display with emoji+name+streak, tooltips, summary line, and edge cases

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HabitPortfolioCard } from "./HabitPortfolioCard";
import type { HabitPortfolio } from "../lib/habitPortfolio";

// ── Fixtures ────────────────────────────────────────────────

const portfolioMixed: HabitPortfolio = {
  habits: [
    { name: "운동", state: "record", streak: 30 },
    { name: "독서", state: "milestone_near", streak: 28 },
    { name: "명상", state: "risk", streak: 14 },
    { name: "일기", state: "growing", streak: 3 },
    { name: "스트레칭", state: "recovering", streak: 2 },
    { name: "영어", state: "dormant", streak: 0 },
  ],
  counts: { record: 1, milestone_near: 1, risk: 1, growing: 1, recovering: 1, dormant: 1 },
  summary: "🏆1 · 🎯1 · ⚠️1 · 📈1 · 🔄1 · 💤1",
};

const portfolioAllGrowing: HabitPortfolio = {
  habits: [
    { name: "운동", state: "growing", streak: 5 },
    { name: "독서", state: "growing", streak: 3 },
  ],
  counts: { record: 0, milestone_near: 0, risk: 0, growing: 2, recovering: 0, dormant: 0 },
  summary: "📈2",
};

const portfolioEmpty: HabitPortfolio = {
  habits: [],
  counts: { record: 0, milestone_near: 0, risk: 0, growing: 0, recovering: 0, dormant: 0 },
  summary: "",
};

const portfolioSingleRecord: HabitPortfolio = {
  habits: [
    { name: "운동", state: "record", streak: 50 },
  ],
  counts: { record: 1, milestone_near: 0, risk: 0, growing: 0, recovering: 0, dormant: 0 },
  summary: "🏆1",
};

const portfolioEmptySummary: HabitPortfolio = {
  habits: [
    { name: "독서", state: "growing", streak: 2 },
  ],
  counts: { record: 0, milestone_near: 0, risk: 0, growing: 1, recovering: 0, dormant: 0 },
  summary: "",
};

// ── Tests ────────────────────────────────────────────────────

describe("HabitPortfolioCard", () => {
  it("should render nothing when portfolio is null", () => {
    const { container } = render(
      <HabitPortfolioCard portfolio={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render nothing when habits array is empty", () => {
    const { container } = render(
      <HabitPortfolioCard portfolio={portfolioEmpty} />,
    );
    expect(container.firstChild).toBeNull();
  });

  describe("per-habit display", () => {
    it("should display each habit name", () => {
      render(<HabitPortfolioCard portfolio={portfolioMixed} />);
      expect(screen.getByText("운동")).toBeDefined();
      expect(screen.getByText("독서")).toBeDefined();
      expect(screen.getByText("명상")).toBeDefined();
      expect(screen.getByText("일기")).toBeDefined();
      expect(screen.getByText("스트레칭")).toBeDefined();
      expect(screen.getByText("영어")).toBeDefined();
    });

    it("should display state emoji for each habit via tooltip", () => {
      render(<HabitPortfolioCard portfolio={portfolioMixed} />);
      // Verify each state is rendered by checking tooltip (avoids ambiguity with summary emojis)
      expect(screen.getByTitle("운동: record (30일)")).toBeDefined();
      expect(screen.getByTitle("독서: milestone_near (28일)")).toBeDefined();
      expect(screen.getByTitle("명상: risk (14일)")).toBeDefined();
      expect(screen.getByTitle("일기: growing (3일)")).toBeDefined();
      expect(screen.getByTitle("스트레칭: recovering (2일)")).toBeDefined();
      expect(screen.getByTitle("영어: dormant (0일)")).toBeDefined();
    });

    it("should display streak count for habits with streak > 0", () => {
      render(<HabitPortfolioCard portfolio={portfolioMixed} />);
      expect(screen.getByText("30d")).toBeDefined();
      expect(screen.getByText("28d")).toBeDefined();
      expect(screen.getByText("14d")).toBeDefined();
      expect(screen.getByText("3d")).toBeDefined();
      expect(screen.getByText("2d")).toBeDefined();
    });

    it("should not display streak for dormant habits (streak=0)", () => {
      render(<HabitPortfolioCard portfolio={portfolioMixed} />);
      expect(screen.queryByText("0d")).toBeNull();
    });
  });

  describe("tooltips", () => {
    it("should show tooltip with habit state and streak on each row", () => {
      render(<HabitPortfolioCard portfolio={portfolioSingleRecord} />);
      expect(screen.getByTitle("운동: record (50일)")).toBeDefined();
    });

    it("should show streak 0 in tooltip for dormant habits", () => {
      render(<HabitPortfolioCard portfolio={portfolioMixed} />);
      expect(screen.getByTitle("영어: dormant (0일)")).toBeDefined();
    });
  });

  describe("summary", () => {
    it("should display the compact summary line", () => {
      render(<HabitPortfolioCard portfolio={portfolioMixed} />);
      expect(screen.getByText("🏆1 · 🎯1 · ⚠️1 · 📈1 · 🔄1 · 💤1")).toBeDefined();
    });

    it("should display simple summary for uniform states", () => {
      render(<HabitPortfolioCard portfolio={portfolioAllGrowing} />);
      expect(screen.getByText("📈2")).toBeDefined();
    });

    it("should not render summary div when summary is empty string", () => {
      const { container } = render(<HabitPortfolioCard portfolio={portfolioEmptySummary} />);
      // Habit row should render
      expect(screen.getByText("독서")).toBeDefined();
      // Only the container div, label div, and grid div should exist — no summary div
      // container > label + grid (no 3rd child for summary)
      const topDiv = container.firstElementChild!;
      expect(topDiv.children).toHaveLength(2); // label + grid, no summary
    });
  });

  describe("section label", () => {
    it("should display 포트폴리오 label", () => {
      render(<HabitPortfolioCard portfolio={portfolioMixed} />);
      expect(screen.getByText("포트폴리오")).toBeDefined();
    });
  });
});
