// ABOUTME: Unit tests for WeekdayProfileCard — cross-domain weekday productivity profile heatmap
// ABOUTME: Covers null rendering, 7-day composite display, best/worst highlighting, tooltips, and accent color

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekdayProfileCard } from "./WeekdayProfileCard";
import type { WeekdayProfile, WeekdaySlot } from "../lib/weekProfile";

// ── Helpers ─────────────────────────────────────────────────

function makeSlot(overrides: Partial<WeekdaySlot> = {}): WeekdaySlot {
  return {
    habitRate: null,
    pomodoroAvg: null,
    intentionRate: null,
    momentumAvg: null,
    composite: null,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<WeekdayProfile> = {}): WeekdayProfile {
  const defaultDays: Record<number, WeekdaySlot> = {};
  for (let i = 0; i <= 6; i++) defaultDays[i] = makeSlot();
  return {
    days: defaultDays,
    bestDay: null,
    worstDay: null,
    ...overrides,
  };
}

// ── Fixtures ────────────────────────────────────────────────

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const profileWithData: WeekdayProfile = makeProfile({
  days: {
    0: makeSlot({ composite: 42, habitRate: 50, momentumAvg: 34 }),
    1: makeSlot({ composite: 68, habitRate: 75, pomodoroAvg: 2.5, intentionRate: 80, momentumAvg: 60 }),
    2: makeSlot({ composite: 82, habitRate: 90, pomodoroAvg: 3.0, intentionRate: 85, momentumAvg: 72 }),
    3: makeSlot({ composite: 55, habitRate: 60, intentionRate: 50 }),
    4: makeSlot({ composite: 78, habitRate: 85, pomodoroAvg: 2.8, intentionRate: 75, momentumAvg: 68 }),
    5: makeSlot({ composite: 45, habitRate: 40, momentumAvg: 50 }),
    6: makeSlot({ composite: 35, habitRate: 30, momentumAvg: 40 }),
  },
  bestDay: 2,   // 화
  worstDay: 6,  // 토
});

const profileAllNull: WeekdayProfile = makeProfile();

// ── Tests ────────────────────────────────────────────────────

describe("WeekdayProfileCard", () => {
  it("should render nothing when profile is null", () => {
    const { container } = render(
      <WeekdayProfileCard profile={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render nothing when all composites are null", () => {
    const { container } = render(
      <WeekdayProfileCard profile={profileAllNull} />,
    );
    expect(container.firstChild).toBeNull();
  });

  describe("section label", () => {
    it("should display 요일 프로필 label", () => {
      render(<WeekdayProfileCard profile={profileWithData} />);
      expect(screen.getByText("요일 프로필")).toBeDefined();
    });
  });

  describe("weekday display", () => {
    it("should display all 7 weekday names", () => {
      render(<WeekdayProfileCard profile={profileWithData} />);
      for (const name of WEEKDAY_NAMES) {
        expect(screen.getByText(name)).toBeDefined();
      }
    });

    it("should display composite scores for days that have data", () => {
      const { container } = render(
        <WeekdayProfileCard profile={profileWithData} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("82");  // 화 (best)
      expect(text).toContain("35");  // 토 (worst)
      expect(text).toContain("68");  // 월
    });

    it("should display dash for days without composite", () => {
      const partial = makeProfile({
        days: {
          0: makeSlot({ composite: null }),
          1: makeSlot({ composite: 50 }),
          2: makeSlot({ composite: null }),
          3: makeSlot({ composite: null }),
          4: makeSlot({ composite: null }),
          5: makeSlot({ composite: null }),
          6: makeSlot({ composite: null }),
        },
        bestDay: 1,
        worstDay: 1,
      });
      const { container } = render(
        <WeekdayProfileCard profile={partial} />,
      );
      const text = container.textContent ?? "";
      // "–" (en-dash) for no-data slots
      expect(text).toContain("–");
    });
  });

  describe("best/worst highlighting", () => {
    it("should show crown marker for best day", () => {
      render(<WeekdayProfileCard profile={profileWithData} />);
      // Best day (화, index 2) should have a title indicating best
      expect(screen.getByTitle("화 82점 (최고)")).toBeDefined();
    });

    it("should show down marker for worst day", () => {
      render(<WeekdayProfileCard profile={profileWithData} />);
      // Worst day (토, index 6) should have a title indicating worst
      expect(screen.getByTitle("토 35점 (최저)")).toBeDefined();
    });

    it("should show normal title for non-extreme days", () => {
      render(<WeekdayProfileCard profile={profileWithData} />);
      expect(screen.getByTitle("월 68점")).toBeDefined();
    });
  });

  describe("tooltips", () => {
    it("should show score and best marker in tooltip for best day", () => {
      render(<WeekdayProfileCard profile={profileWithData} />);
      expect(screen.getByTitle("화 82점 (최고)")).toBeDefined();
    });

    it("should show no-data title for null composite day", () => {
      const partial = makeProfile({
        days: {
          0: makeSlot({ composite: null }),
          1: makeSlot({ composite: 60 }),
          2: makeSlot({ composite: null }),
          3: makeSlot({ composite: null }),
          4: makeSlot({ composite: null }),
          5: makeSlot({ composite: null }),
          6: makeSlot({ composite: null }),
        },
        bestDay: 1,
        worstDay: 1,
      });
      render(<WeekdayProfileCard profile={partial} />);
      expect(screen.getByTitle("일: 데이터 없음")).toBeDefined();
    });
  });

  describe("summary footer", () => {
    it("should display best and worst day names in summary", () => {
      const { container } = render(
        <WeekdayProfileCard profile={profileWithData} />,
      );
      const text = container.textContent ?? "";
      expect(text).toContain("최고 화");
      expect(text).toContain("최저 토");
    });

    it("should display single day name when bestDay equals worstDay", () => {
      const singleDay = makeProfile({
        days: {
          0: makeSlot({ composite: null }),
          1: makeSlot({ composite: 60 }),
          2: makeSlot({ composite: null }),
          3: makeSlot({ composite: null }),
          4: makeSlot({ composite: null }),
          5: makeSlot({ composite: null }),
          6: makeSlot({ composite: null }),
        },
        bestDay: 1,
        worstDay: 1,
      });
      const { container } = render(
        <WeekdayProfileCard profile={singleDay} />,
      );
      const text = container.textContent ?? "";
      // When only one day has data, show it once (not "최고 월 · 최저 월")
      expect(text).toContain("최고 월");
      expect(text).not.toContain("최저");
    });

    it("should show best-only title when bestDay equals worstDay", () => {
      const singleDay = makeProfile({
        days: {
          0: makeSlot({ composite: null }),
          1: makeSlot({ composite: 60 }),
          2: makeSlot({ composite: null }),
          3: makeSlot({ composite: null }),
          4: makeSlot({ composite: null }),
          5: makeSlot({ composite: null }),
          6: makeSlot({ composite: null }),
        },
        bestDay: 1,
        worstDay: 1,
      });
      render(<WeekdayProfileCard profile={singleDay} />);
      // Title should show "(최고)" only, not both
      expect(screen.getByTitle("월 60점 (최고)")).toBeDefined();
    });
  });

  describe("bar height visualization", () => {
    it("should render bar elements for days with composite scores", () => {
      const { container } = render(
        <WeekdayProfileCard profile={profileWithData} />,
      );
      // Each day slot should have a bar div — verify we have 7 slots
      const slots = container.querySelectorAll("[data-weekday]");
      expect(slots.length).toBe(7);
    });
  });

  describe("accent color", () => {
    it("should apply accent color to best day score", () => {
      const accent = "#38BDF8";
      render(
        <WeekdayProfileCard profile={profileWithData} accent={accent} />,
      );
      // Best day (화) should have accent-colored score
      const bestSlot = screen.getByTitle("화 82점 (최고)");
      const scoreSpan = bestSlot.querySelector("[data-score]") as HTMLElement;
      expect(scoreSpan.style.color).toBe("rgb(56, 189, 248)");
    });

    it("should use default green for best day when no accent", () => {
      render(
        <WeekdayProfileCard profile={profileWithData} />,
      );
      const bestSlot = screen.getByTitle("화 82점 (최고)");
      const scoreSpan = bestSlot.querySelector("[data-score]") as HTMLElement;
      // Default statusActive is #4ADE80 → rgb(74, 222, 128)
      expect(scoreSpan.style.color).toBe("rgb(74, 222, 128)");
    });
  });
});
