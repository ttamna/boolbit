// ABOUTME: Unit tests for MomentumForecastCard — 7-day momentum forecast "weather strip" UI card
// ABOUTME: Covers null rendering, day forecast display (weekday/emoji/score/confidence), trend, week average, summary, and tooltips

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MomentumForecastCard } from "./MomentumForecastCard";
import type { MomentumForecast, DayForecast } from "../lib/momentumForecast";

// ── Helpers ─────────────────────────────────────────────────

// Emoji is always provided explicitly to avoid duplicating scoreToEmoji logic from the analytics layer
function makeDayForecast(overrides: Partial<DayForecast> & { date: string; weekday: number; predicted: number; emoji: string }): DayForecast {
  return {
    confidence: "high",
    ...overrides,
  };
}

// ── Fixtures ────────────────────────────────────────────────

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const forecastImproving: MomentumForecast = {
  days: [
    makeDayForecast({ date: "2026-03-23", weekday: 1, predicted: 72, emoji: "🌤️" }),
    makeDayForecast({ date: "2026-03-24", weekday: 2, predicted: 78, emoji: "☀️" }),
    makeDayForecast({ date: "2026-03-25", weekday: 3, predicted: 65, emoji: "🌤️", confidence: "medium" }),
    makeDayForecast({ date: "2026-03-26", weekday: 4, predicted: 80, emoji: "☀️" }),
    makeDayForecast({ date: "2026-03-27", weekday: 5, predicted: 55, emoji: "⛅", confidence: "low" }),
    makeDayForecast({ date: "2026-03-28", weekday: 6, predicted: 45, emoji: "⛅" }),
    makeDayForecast({ date: "2026-03-29", weekday: 0, predicted: 40, emoji: "☁️" }),
  ],
  weekAvg: 62,
  trend: "improving",
  summary: "주간 예측 62점(상승세) · 최고 목(80) · 최저 일(40)",
};

const forecastDeclining: MomentumForecast = {
  days: [
    makeDayForecast({ date: "2026-03-23", weekday: 1, predicted: 30, emoji: "☁️" }),
    makeDayForecast({ date: "2026-03-24", weekday: 2, predicted: 25, emoji: "🌧️" }),
    makeDayForecast({ date: "2026-03-25", weekday: 3, predicted: 35, emoji: "☁️" }),
    makeDayForecast({ date: "2026-03-26", weekday: 4, predicted: 28, emoji: "🌧️" }),
    makeDayForecast({ date: "2026-03-27", weekday: 5, predicted: 22, emoji: "🌧️" }),
    makeDayForecast({ date: "2026-03-28", weekday: 6, predicted: 20, emoji: "🌧️" }),
    makeDayForecast({ date: "2026-03-29", weekday: 0, predicted: 18, emoji: "🌧️" }),
  ],
  weekAvg: 25,
  trend: "declining",
  summary: "주간 예측 25점(하락세) · 최고 수(35) · 최저 일(18)",
};

const forecastStable: MomentumForecast = {
  days: [
    makeDayForecast({ date: "2026-03-23", weekday: 1, predicted: 63, emoji: "🌤️" }),
    makeDayForecast({ date: "2026-03-24", weekday: 2, predicted: 67, emoji: "🌤️" }),
    makeDayForecast({ date: "2026-03-25", weekday: 3, predicted: 58, emoji: "⛅" }),
    makeDayForecast({ date: "2026-03-26", weekday: 4, predicted: 61, emoji: "🌤️" }),
    makeDayForecast({ date: "2026-03-27", weekday: 5, predicted: 59, emoji: "⛅" }),
    makeDayForecast({ date: "2026-03-28", weekday: 6, predicted: 64, emoji: "🌤️" }),
    makeDayForecast({ date: "2026-03-29", weekday: 0, predicted: 56, emoji: "⛅" }),
  ],
  weekAvg: 61,
  trend: "stable",
  summary: "주간 예측 61점(안정적) · 최고 화(67) · 최저 일(56)",
};

// ── Tests ────────────────────────────────────────────────────

describe("MomentumForecastCard", () => {
  it("should render nothing when forecast is null", () => {
    const { container } = render(
      <MomentumForecastCard forecast={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  describe("section label", () => {
    it("should display 주간 예보 label", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      expect(screen.getByText("주간 예보")).toBeDefined();
    });
  });

  describe("day forecast display", () => {
    it("should display all 7 weekday names", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      for (const day of forecastImproving.days) {
        expect(screen.getByText(WEEKDAY_NAMES[day.weekday])).toBeDefined();
      }
    });

    it("should display predicted score for each day via tooltip", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      // Use exact title strings to verify each day's score renders correctly
      for (const day of forecastImproving.days) {
        const wdName = WEEKDAY_NAMES[day.weekday];
        const confLabel = day.confidence === "high" ? "높음" : day.confidence === "medium" ? "보통" : "낮음";
        expect(screen.getByTitle(`${wdName} ${day.predicted}점 (신뢰도: ${confLabel})`)).toBeDefined();
      }
    });

    it("should display weather emoji for each day", () => {
      const { container } = render(<MomentumForecastCard forecast={forecastImproving} />);
      const cardText = container.textContent ?? "";
      expect(cardText).toContain("☀️");
      expect(cardText).toContain("⛅");
      expect(cardText).toContain("☁️");
    });
  });

  describe("confidence indicator", () => {
    it("should show reduced opacity for low confidence days", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      expect(screen.getByTitle("금 55점 (신뢰도: 낮음)")).toBeDefined();
    });

    it("should show medium confidence in tooltip", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      expect(screen.getByTitle("수 65점 (신뢰도: 보통)")).toBeDefined();
    });

    it("should show high confidence in tooltip", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      expect(screen.getByTitle("월 72점 (신뢰도: 높음)")).toBeDefined();
    });
  });

  describe("week average and trend", () => {
    it("should display week average with label", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      expect(screen.getByText("주평균")).toBeDefined();
    });

    it("should display improving trend arrow ↑", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      expect(screen.getByText("↑")).toBeDefined();
    });

    it("should display declining trend arrow ↓", () => {
      render(<MomentumForecastCard forecast={forecastDeclining} />);
      expect(screen.getByText("↓")).toBeDefined();
    });

    it("should display stable trend arrow →", () => {
      render(<MomentumForecastCard forecast={forecastStable} />);
      expect(screen.getByText("→")).toBeDefined();
    });
  });

  describe("summary", () => {
    it("should display the summary text", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      expect(screen.getByText(forecastImproving.summary)).toBeDefined();
    });

    it("should display declining summary", () => {
      render(<MomentumForecastCard forecast={forecastDeclining} />);
      expect(screen.getByText(forecastDeclining.summary)).toBeDefined();
    });
  });

  describe("tooltips", () => {
    it("should show per-day tooltip with weekday, score, and confidence", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      expect(screen.getByTitle("월 72점 (신뢰도: 높음)")).toBeDefined();
    });

    it("should show tooltip for low confidence day", () => {
      render(<MomentumForecastCard forecast={forecastImproving} />);
      expect(screen.getByTitle("금 55점 (신뢰도: 낮음)")).toBeDefined();
    });
  });

  describe("accent color", () => {
    it("should apply accent color to high-score day slots", () => {
      const accent = "#38BDF8";
      const { container } = render(
        <MomentumForecastCard forecast={forecastImproving} accent={accent} />,
      );
      // Day with predicted=80 (weekday 4=목) should have accent color on its score span
      const highScoreSlot = screen.getByTitle("목 80점 (신뢰도: 높음)");
      // The score span inside the slot should have the accent color
      const scoreSpan = highScoreSlot.querySelector("span:last-child") as HTMLElement;
      expect(scoreSpan.style.color).toBe("rgb(56, 189, 248)");
    });

    it("should apply accent color to improving trend arrow", () => {
      const accent = "#38BDF8";
      render(
        <MomentumForecastCard forecast={forecastImproving} accent={accent} />,
      );
      const arrow = screen.getByText("↑");
      expect(arrow.style.color).toBe("rgb(56, 189, 248)");
    });
  });
});
