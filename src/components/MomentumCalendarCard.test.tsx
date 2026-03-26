// ABOUTME: Unit tests for MomentumCalendarCard — 28-day momentum history heatmap UI card
// ABOUTME: Covers null rendering, label/stat display, dot grid structure, tooltips, and accent color

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MomentumCalendarCard } from "./MomentumCalendarCard";
import type { MomentumCalendar, MomentumDay } from "../lib/momentumCalendar";

// ── Helpers ─────────────────────────────────────────────────

/**
 * Generate a 28-day array of MomentumDay starting from startDate (YYYY-MM-DD).
 * dataFn receives the 0-based index and returns { score, tier } explicitly —
 * tier is declared by the caller rather than computed here so this helper
 * does not duplicate the threshold logic internal to momentumCalendar.ts.
 */
function make28Days(
  startDate: string,
  dataFn: (i: number) => { score: number | null; tier: MomentumDay["tier"] },
): MomentumDay[] {
  const days: MomentumDay[] = [];
  const base = new Date(startDate + "T12:00:00");
  for (let i = 0; i < 28; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString("sv");
    const { score, tier } = dataFn(i);
    days.push({ date: dateStr, score, tier });
  }
  return days;
}

// ── Fixtures ────────────────────────────────────────────────

const START = "2026-02-23"; // 28 days ending at 2026-03-22

// Tiers below mirror the HIGH_THRESHOLD=65 / MID_THRESHOLD=40 constants in
// momentumCalendar.ts. They are declared explicitly here so that this component
// test does not re-implement tier logic — only the fixture data is described.
// score ≥ 65 → "high", score ≥ 40 → "mid", score < 40 → "low"
type Tier = MomentumDay["tier"];
const FULL_SCORES: Array<{ score: number; tier: Tier }> = [
  { score: 75, tier: "high" }, { score: 80, tier: "high" }, { score: 55, tier: "mid"  },
  { score: 30, tier: "low"  }, { score: 65, tier: "high" }, { score: 72, tier: "high" },
  { score: 48, tier: "mid"  }, { score: 81, tier: "high" }, { score: 35, tier: "low"  },
  { score: 70, tier: "high" }, { score: 60, tier: "mid"  }, { score: 42, tier: "mid"  },
  { score: 28, tier: "low"  }, { score: 77, tier: "high" }, { score: 68, tier: "high" },
  { score: 50, tier: "mid"  }, { score: 38, tier: "low"  }, { score: 82, tier: "high" },
  { score: 74, tier: "high" }, { score: 45, tier: "mid"  }, { score: 32, tier: "low"  },
  { score: 66, tier: "high" }, { score: 71, tier: "high" }, { score: 53, tier: "mid"  },
  { score: 29, tier: "low"  }, { score: 76, tier: "high" }, { score: 64, tier: "mid"  },
  { score: 69, tier: "high" },
];

/** All active days with varying tiers */
const calendarFull: MomentumCalendar = {
  days: make28Days(START, i => FULL_SCORES[i]),
  activeDays: 28,
  avgScore: 59,
};

// calendarPartial: i % 3 === 0 → null (indices 0,3,6,9,12,15,18,21,24,27 = 10 null days)
// Active days = 28 - 10 = 18; tiers declared explicitly to avoid re-implementing thresholds
type PartialEntry = { score: number | null; tier: MomentumDay["tier"] };
const PARTIAL_SCORES: PartialEntry[] = [
  { score: null, tier: null }, { score: 61, tier: "mid"  }, { score: 62, tier: "mid"  },
  { score: null, tier: null }, { score: 64, tier: "mid"  }, { score: 65, tier: "high" },
  { score: null, tier: null }, { score: 67, tier: "high" }, { score: 68, tier: "high" },
  { score: null, tier: null }, { score: 70, tier: "high" }, { score: 71, tier: "high" },
  { score: null, tier: null }, { score: 73, tier: "high" }, { score: 74, tier: "high" },
  { score: null, tier: null }, { score: 76, tier: "high" }, { score: 77, tier: "high" },
  { score: null, tier: null }, { score: 79, tier: "high" }, { score: 60, tier: "mid"  },
  { score: null, tier: null }, { score: 62, tier: "mid"  }, { score: 63, tier: "mid"  },
  { score: null, tier: null }, { score: 65, tier: "high" }, { score: 66, tier: "high" },
  { score: null, tier: null },
];

/** Mix of active and null days (18 active, 10 null) */
const calendarPartial: MomentumCalendar = {
  days: make28Days(START, i => PARTIAL_SCORES[i]),
  activeDays: 18,
  avgScore: 68,
};

/** avgScore with fractional part to test Math.round */
const calendarFractional: MomentumCalendar = {
  days: make28Days(START, () => ({ score: 63, tier: "mid" })),
  activeDays: 28,
  avgScore: 63.7,
};

// ── Tests ────────────────────────────────────────────────────

describe("MomentumCalendarCard", () => {
  it("should render nothing when calendar is null", () => {
    const { container } = render(<MomentumCalendarCard calendar={null} />);
    expect(container.firstChild).toBeNull();
  });

  describe("header", () => {
    it("should display 28일 모멘텀 label", () => {
      render(<MomentumCalendarCard calendar={calendarFull} />);
      expect(screen.getByText("28일 모멘텀")).toBeDefined();
    });

    it("should display rounded avg score", () => {
      render(<MomentumCalendarCard calendar={calendarFull} />);
      expect(screen.getByText("avg 59")).toBeDefined();
    });

    it("should round fractional avgScore", () => {
      render(<MomentumCalendarCard calendar={calendarFractional} />);
      expect(screen.getByText("avg 64")).toBeDefined();
    });

    it("should show activeDays and avg in stat tooltip", () => {
      render(<MomentumCalendarCard calendar={calendarFull} />);
      expect(screen.getByTitle("활성 28일 · 평균 모멘텀 59")).toBeDefined();
    });
  });

  describe("dot grid structure", () => {
    it("should render a grid with role img and aria-label", () => {
      render(<MomentumCalendarCard calendar={calendarFull} />);
      const grid = screen.getByRole("img");
      expect(grid).toBeDefined();
    });

    it("should include activeDays in aria-label", () => {
      render(<MomentumCalendarCard calendar={calendarFull} />);
      const grid = screen.getByRole("img");
      expect(grid.getAttribute("aria-label")).toContain("28일");
    });

    it("should include avgScore in aria-label", () => {
      render(<MomentumCalendarCard calendar={calendarFull} />);
      const grid = screen.getByRole("img");
      expect(grid.getAttribute("aria-label")).toContain("59");
    });

    it("should render exactly 28 dot elements", () => {
      const { container } = render(<MomentumCalendarCard calendar={calendarFull} />);
      // Each dot is a div inside the grid rows
      const grid = container.querySelector("[role='img']");
      // 4 row divs × 7 dot divs each
      const rows = grid?.querySelectorAll(":scope > div");
      expect(rows?.length).toBe(4);
      let totalDots = 0;
      rows?.forEach(row => { totalDots += row.children.length; });
      expect(totalDots).toBe(28);
    });
  });

  describe("dot tooltips", () => {
    it("should show date and score in tooltip for active day", () => {
      const firstActiveDay = calendarFull.days.find(d => d.score !== null)!;
      render(<MomentumCalendarCard calendar={calendarFull} />);
      expect(
        screen.getByTitle(`${firstActiveDay.date} · ${firstActiveDay.score}점`),
      ).toBeDefined();
    });

    it("should show only date in tooltip for null-score day", () => {
      const nullDay = calendarPartial.days.find(d => d.score === null)!;
      render(<MomentumCalendarCard calendar={calendarPartial} />);
      expect(screen.getByTitle(nullDay.date)).toBeDefined();
    });

    it("should render tooltips for all 28 days", () => {
      render(<MomentumCalendarCard calendar={calendarFull} />);
      for (const day of calendarFull.days) {
        const expected =
          day.score !== null ? `${day.date} · ${day.score}점` : day.date;
        expect(screen.getByTitle(expected)).toBeDefined();
      }
    });
  });

  describe("accent color", () => {
    it("should apply accent color to high-tier dot", () => {
      const accent = "#38BDF8";
      const highDay = calendarFull.days.find(d => d.tier === "high")!;
      const { container } = render(
        <MomentumCalendarCard calendar={calendarFull} accent={accent} />,
      );
      const titleAttr =
        highDay.score !== null ? `${highDay.date} · ${highDay.score}점` : highDay.date;
      const dot = container.querySelector(`[title="${titleAttr}"]`) as HTMLElement;
      expect(dot.style.background).toBe("rgb(56, 189, 248)");
    });

    it("should not apply accent color to low-tier dot", () => {
      const accent = "#38BDF8";
      const lowDay = calendarFull.days.find(d => d.tier === "low")!;
      const { container } = render(
        <MomentumCalendarCard calendar={calendarFull} accent={accent} />,
      );
      const titleAttr =
        lowDay.score !== null ? `${lowDay.date} · ${lowDay.score}점` : lowDay.date;
      const dot = container.querySelector(`[title="${titleAttr}"]`) as HTMLElement;
      expect(dot.style.background).not.toBe("rgb(56, 189, 248)");
    });
  });

  describe("null score day opacity", () => {
    it("should render null-score dots with reduced opacity 0.35", () => {
      const nullDay = calendarPartial.days.find(d => d.score === null)!;
      const { container } = render(<MomentumCalendarCard calendar={calendarPartial} />);
      const dot = container.querySelector(`[title="${nullDay.date}"]`) as HTMLElement;
      expect(dot.style.opacity).toBe("0.35");
    });

    it("should render high-tier dots with opacity 0.9", () => {
      const highDay = calendarFull.days.find(d => d.tier === "high")!;
      const { container } = render(<MomentumCalendarCard calendar={calendarFull} />);
      const titleAttr = `${highDay.date} · ${highDay.score}점`;
      const dot = container.querySelector(`[title="${titleAttr}"]`) as HTMLElement;
      expect(dot.style.opacity).toBe("0.9");
    });

    it("should render mid-tier dots with opacity 0.75", () => {
      const midDay = calendarFull.days.find(d => d.tier === "mid")!;
      const { container } = render(<MomentumCalendarCard calendar={calendarFull} />);
      const titleAttr = `${midDay.date} · ${midDay.score}점`;
      const dot = container.querySelector(`[title="${titleAttr}"]`) as HTMLElement;
      expect(dot.style.opacity).toBe("0.75");
    });

    it("should render low-tier dots with opacity 0.6", () => {
      const lowDay = calendarFull.days.find(d => d.tier === "low")!;
      const { container } = render(<MomentumCalendarCard calendar={calendarFull} />);
      const titleAttr = `${lowDay.date} · ${lowDay.score}점`;
      const dot = container.querySelector(`[title="${titleAttr}"]`) as HTMLElement;
      expect(dot.style.opacity).toBe("0.6");
    });
  });

  describe("stat tooltip with partial calendar", () => {
    it("should show activeDays and avg in stat tooltip for partial calendar", () => {
      // Verifies the tooltip text reflects actual activeDays (18), not hardcoded 28
      render(<MomentumCalendarCard calendar={calendarPartial} />);
      expect(screen.getByTitle("활성 18일 · 평균 모멘텀 68")).toBeDefined();
    });
  });

  describe("accent scope", () => {
    it("should not apply accent color to mid-tier dot even when accent is provided", () => {
      // accent only applies to high-tier dots; mid-tier always uses colors.statusProgress
      const ACCENT = "#FF0000";
      const midDay = calendarFull.days.find(d => d.tier === "mid")!;
      const { container } = render(
        <MomentumCalendarCard calendar={calendarFull} accent={ACCENT} />,
      );
      const titleAttr = `${midDay.date} · ${midDay.score}점`;
      const dot = container.querySelector(`[title="${titleAttr}"]`) as HTMLElement;
      expect(dot.style.background).not.toBe("rgb(255, 0, 0)");
    });
  });
});
