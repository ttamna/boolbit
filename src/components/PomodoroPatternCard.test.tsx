// ABOUTME: Unit tests for PomodoroPatternCard — pomodoro usage pattern analysis UI card
// ABOUTME: Covers null rendering, grade badge, activity/goal metrics, consistency, trend, weekday pattern, summary

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PomodoroPatternCard } from "./PomodoroPatternCard";
import type { PomodoroPattern } from "../lib/pomodoroPattern";

// ── Helpers ─────────────────────────────────────────────

function makePattern(overrides: Partial<PomodoroPattern> = {}): PomodoroPattern {
  return {
    activeDays: 20,
    totalDays: 28,
    activityRate: 71,
    totalSessions: 80,
    avgPerActiveDay: 4.0,
    goalHitRate: 65,
    goalHitDays: 13,
    peakDay: 2,    // 화
    valleyDay: 0,  // 일
    weekdayAvg: 3.2,
    weekendAvg: 1.5,
    consistency: "steady",
    trend: "increasing",
    grade: "strong",
    summary: "💪 포모도로 패턴: 우수 · 활동률 71% · 일평균 4.0회↑",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────

describe("PomodoroPatternCard", () => {
  it("should render nothing when pattern is null", () => {
    const { container } = render(
      <PomodoroPatternCard pattern={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  describe("section label", () => {
    it("should display 포모도로 패턴 label", () => {
      render(<PomodoroPatternCard pattern={makePattern()} />);
      expect(screen.getByText("포모도로 패턴")).toBeDefined();
    });
  });

  describe("grade badge", () => {
    it("should display grade emoji and label for strong", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ grade: "strong" })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("💪");
      expect(text).toContain("우수");
    });

    it("should display elite grade", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ grade: "elite" })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("🔥");
      expect(text).toContain("엘리트");
    });

    it("should display inactive grade", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ grade: "inactive" })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("💤");
      expect(text).toContain("비활성");
    });

    it("should display building grade", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ grade: "building" })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("🌱");
      expect(text).toContain("시작");
    });

    it("should display moderate grade", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ grade: "moderate" })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("📊");
      expect(text).toContain("보통");
    });
  });

  describe("activity metrics", () => {
    it("should display activity rate percentage", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ activityRate: 71 })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("71%");
    });

    it("should display active days fraction", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ activeDays: 20, totalDays: 28 })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("20/28일");
    });

    it("should display average sessions per active day", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ avgPerActiveDay: 4.0 })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("4회");
    });
  });

  describe("goal hit rate", () => {
    it("should display goal hit rate when goal exists", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ goalHitRate: 65, goalHitDays: 13 })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("65%");
      expect(text).toContain("목표 달성");
    });

    it("should not display goal section when goalHitRate is null", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ goalHitRate: null, goalHitDays: null })} />,
      );
      const text = container.textContent ?? "";
      expect(text).not.toContain("목표 달성");
    });

    it("should render goal section when goalHitRate=0 (not null)", () => {
      // goalHitRate=0 is falsy but !== null, so goal section must appear with 0% and 0일
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ goalHitRate: 0, goalHitDays: 0 })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("목표 달성");
      expect(text).toContain("0%");
      expect(text).toContain("0일");
    });
  });

  describe("consistency indicator", () => {
    it("should display steady consistency", () => {
      render(
        <PomodoroPatternCard pattern={makePattern({ consistency: "steady" })} />,
      );
      expect(screen.getByTitle(/steady|꾸준/i)).toBeDefined();
    });

    it("should display sporadic consistency", () => {
      render(
        <PomodoroPatternCard pattern={makePattern({ consistency: "sporadic" })} />,
      );
      expect(screen.getByTitle(/sporadic|산발/i)).toBeDefined();
    });

    it("should display bursty consistency", () => {
      render(
        <PomodoroPatternCard pattern={makePattern({ consistency: "bursty" })} />,
      );
      expect(screen.getByTitle(/bursty|몰아/i)).toBeDefined();
    });
  });

  describe("trend indicator", () => {
    it("should display increasing trend arrow", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ trend: "increasing" })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("↑");
    });

    it("should display stable trend arrow", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ trend: "stable" })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("→");
    });

    it("should display decreasing trend arrow", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ trend: "decreasing" })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("↓");
    });
  });

  describe("weekday pattern", () => {
    it("should display weekday and weekend averages", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ weekdayAvg: 3.2, weekendAvg: 1.5 })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("3.2");
      expect(text).toContain("1.5");
    });

    it("should display peak day name when present", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ peakDay: 2 })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("최고 화");
    });

    it("should not display peak/valley when both null", () => {
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ peakDay: null, valleyDay: null })} />,
      );
      const text = container.textContent ?? "";
      expect(text).not.toContain("최고");
      expect(text).not.toContain("최저");
    });
  });

  describe("summary", () => {
    it("should render the summary string from pattern data", () => {
      const summary = "💪 포모도로 패턴: 우수 · 활동률 71% · 일평균 4.0회↑";
      render(
        <PomodoroPatternCard pattern={makePattern({ summary })} />,
      );
      const el = screen.getByTestId("pattern-summary");
      expect(el.textContent).toBe(summary);
    });
  });

  describe("weekday pattern — edge cases", () => {
    it("should display 최고 일 when peakDay=0 (falsy index)", () => {
      // peakDay=0 is falsy; the component must use !== null, not truthy check
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ peakDay: 0, valleyDay: null })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("최고 일");
      expect(text).not.toContain("최저");
    });

    it("should display 최저 only when peakDay=null and valleyDay is set", () => {
      // valley-only: no peak label and no separator " · " in peak/valley row
      // use a summary without · so we can assert separator absence on full text
      const { container } = render(
        <PomodoroPatternCard
          pattern={makePattern({ peakDay: null, valleyDay: 3, summary: "테스트 요약" })}
        />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("최저 수");
      expect(text).not.toContain("최고");
      expect(text).not.toContain(" · ");
    });

    it("should suppress 최저 when peakDay equals valleyDay", () => {
      // same-index: only peak is shown; valley label is suppressed
      const { container } = render(
        <PomodoroPatternCard pattern={makePattern({ peakDay: 2, valleyDay: 2 })} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("최고 화");
      expect(text).not.toContain("최저");
    });

  });

  describe("accent color", () => {
    it("should apply accent color to grade badge", () => {
      const accent = "#38BDF8";
      render(
        <PomodoroPatternCard pattern={makePattern()} accent={accent} />,
      );
      const badge = screen.getByTestId("grade-badge");
      expect(badge.style.color).toBe("rgb(56, 189, 248)");
    });

    it("should use default status color when no accent for strong grade", () => {
      render(
        <PomodoroPatternCard pattern={makePattern({ grade: "strong" })} />,
      );
      const badge = screen.getByTestId("grade-badge");
      // strong grade → statusProgress #FBBF24 → rgb(251, 191, 36)
      expect(badge.style.color).toBe("rgb(251, 191, 36)");
    });

    it("should use statusActive for elite grade without accent", () => {
      render(
        <PomodoroPatternCard pattern={makePattern({ grade: "elite" })} />,
      );
      const badge = screen.getByTestId("grade-badge");
      // statusActive #4ADE80 → rgb(74, 222, 128)
      expect(badge.style.color).toBe("rgb(74, 222, 128)");
    });
  });
});
