// ABOUTME: Unit tests for WeekComparisonCard — week-over-week cross-domain comparison card
// ABOUTME: Covers null rendering, per-domain rows, delta display, trend coloring, and partial data

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekComparisonCard, MINUS } from "./WeekComparisonCard";
import type { WeekComparisonResult } from "../lib/weekComparison";

// ── Fixtures ────────────────────────────────────────────────

const ALL_DOMAINS_UP: WeekComparisonResult = {
  habits: { thisWeek: 85, lastWeek: 72, delta: 13, trend: "up" },
  pomodoro: { thisWeek: 5, lastWeek: 3, delta: 2, trend: "up" },
  intention: { thisWeek: 90, lastWeek: 80, delta: 10, trend: "up" },
  momentum: { thisWeek: 74, lastWeek: 63, delta: 11, trend: "up" },
  overallTrend: "up",
  summary: "습관↑ · 포모↑ · 의도↑ · 모멘텀↑",
};

const ALL_DOMAINS_DOWN: WeekComparisonResult = {
  habits: { thisWeek: 50, lastWeek: 72, delta: -22, trend: "down" },
  pomodoro: { thisWeek: 2, lastWeek: 6, delta: -4, trend: "down" },
  intention: { thisWeek: 40, lastWeek: 80, delta: -40, trend: "down" },
  momentum: { thisWeek: 35, lastWeek: 63, delta: -28, trend: "down" },
  overallTrend: "down",
  summary: "습관↓ · 포모↓ · 의도↓ · 모멘텀↓",
};

const STABLE: WeekComparisonResult = {
  habits: { thisWeek: 72, lastWeek: 70, delta: 2, trend: "stable" },
  pomodoro: { thisWeek: 4, lastWeek: 4, delta: 0, trend: "stable" },
  intention: { thisWeek: 75, lastWeek: 75, delta: 0, trend: "stable" },
  momentum: { thisWeek: 62, lastWeek: 60, delta: 2, trend: "stable" },
  overallTrend: "stable",
  summary: "습관→ · 포모→ · 의도→ · 모멘텀→",
};

const PARTIAL_HABITS_ONLY: WeekComparisonResult = {
  habits: { thisWeek: 80, lastWeek: 60, delta: 20, trend: "up" },
  pomodoro: null,
  intention: null,
  momentum: null,
  overallTrend: "up",
  summary: "습관↑",
};

const ALL_NULL: WeekComparisonResult = {
  habits: null,
  pomodoro: null,
  intention: null,
  momentum: null,
  overallTrend: null,
  summary: "",
};

// Has domain data but no summary text (e.g. first-run before summary is computed)
const HABITS_ONLY_NO_SUMMARY: WeekComparisonResult = {
  habits: { thisWeek: 70, lastWeek: 65, delta: 5, trend: "up" },
  pomodoro: null,
  intention: null,
  momentum: null,
  overallTrend: "up",
  summary: "",
};

// ── Tests ────────────────────────────────────────────────────

describe("WeekComparisonCard", () => {
  it("should render nothing when comparison is null", () => {
    const { container } = render(<WeekComparisonCard comparison={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render nothing when all domains are null", () => {
    const { container } = render(<WeekComparisonCard comparison={ALL_NULL} />);
    expect(container.firstChild).toBeNull();
  });

  describe("section label", () => {
    it("should display 주간 비교 label", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByText("주간 비교")).toBeDefined();
    });
  });

  describe("domain rows", () => {
    it("should display 습관 row when habits comparison is present", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByText("습관")).toBeDefined();
    });

    it("should display 포모 row when pomodoro comparison is present", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByText("포모")).toBeDefined();
    });

    it("should display 의도 row when intention comparison is present", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByText("의도")).toBeDefined();
    });

    it("should display 모멘텀 row when momentum comparison is present", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByText("모멘텀")).toBeDefined();
    });

    it("should show only habits row when only habits present", () => {
      render(<WeekComparisonCard comparison={PARTIAL_HABITS_ONLY} />);
      expect(screen.getByText("습관")).toBeDefined();
      expect(screen.queryByText("포모")).toBeNull();
      expect(screen.queryByText("의도")).toBeNull();
      expect(screen.queryByText("모멘텀")).toBeNull();
    });
  });

  describe("this week values", () => {
    it("should display habits this-week percentage", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByTitle("습관: 이번 주 85% → 지난 주 72% (+13)")).toBeDefined();
    });

    it("should display pomodoro this-week session count", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByTitle("포모도로: 이번 주 5세션 → 지난 주 3세션 (+2)")).toBeDefined();
    });

    it("should display intention this-week percentage", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByTitle("의도: 이번 주 90% → 지난 주 80% (+10)")).toBeDefined();
    });

    it("should display momentum this-week score", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByTitle("모멘텀: 이번 주 74점 → 지난 주 63점 (+11)")).toBeDefined();
    });
  });

  describe("negative delta display", () => {
    it("should display negative delta in habits row using Unicode minus", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_DOWN} />);
      expect(screen.getByTitle(`습관: 이번 주 50% → 지난 주 72% (${MINUS}22)`)).toBeDefined();
    });

    it("should display negative delta in pomodoro row using Unicode minus", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_DOWN} />);
      expect(screen.getByTitle(`포모도로: 이번 주 2세션 → 지난 주 6세션 (${MINUS}4)`)).toBeDefined();
    });
  });

  describe("zero delta display", () => {
    it("should display zero delta as = symbol", () => {
      render(<WeekComparisonCard comparison={STABLE} />);
      expect(screen.getByTitle("포모도로: 이번 주 4세션 → 지난 주 4세션 (=)")).toBeDefined();
    });
  });

  describe("summary text", () => {
    it("should display summary text when present", () => {
      render(<WeekComparisonCard comparison={ALL_DOMAINS_UP} />);
      expect(screen.getByText(ALL_DOMAINS_UP.summary)).toBeDefined();
    });

    it("should display summary for stable trend", () => {
      render(<WeekComparisonCard comparison={STABLE} />);
      expect(screen.getByText(STABLE.summary)).toBeDefined();
    });

    it("should not display summary element when summary is empty string", () => {
      render(<WeekComparisonCard comparison={HABITS_ONLY_NO_SUMMARY} />);
      // Domain row renders but the summary div is absent (guarded by falsy check)
      expect(screen.getByText("습관")).toBeDefined();
      expect(screen.queryByTestId("week-comparison-summary")).toBeNull();
    });
  });
});
