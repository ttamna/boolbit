// ABOUTME: Unit tests for HabitResilienceCard — compact visual card showing per-habit recovery resilience grades
// ABOUTME: Covers null rendering, per-habit grade display with emoji+name+breakCount, tooltips, summary line, and edge cases

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HabitResilienceCard } from "./HabitResilienceCard";
import type { HabitResilienceResult } from "../lib/habitResilience";

// ── Fixtures ────────────────────────────────────────────────

const resilienceMixed: HabitResilienceResult = {
  habits: [
    { name: "운동", breakCount: 1, medianGapDays: 1, maxGapDays: 1, grade: "elastic" },
    { name: "독서", breakCount: 3, medianGapDays: 4, maxGapDays: 6, grade: "moderate" },
    { name: "명상", breakCount: 5, medianGapDays: 8, maxGapDays: 12, grade: "slow" },
    { name: "일기", breakCount: 7, medianGapDays: 16, maxGapDays: 22, grade: "fragile" },
  ],
  summary: "🧬1 · ⏳1 · 🐌1 · 💔1",
};

const resilienceAllElastic: HabitResilienceResult = {
  habits: [
    { name: "운동", breakCount: 0, medianGapDays: 0, maxGapDays: 0, grade: "elastic" },
    { name: "독서", breakCount: 0, medianGapDays: 0, maxGapDays: 0, grade: "elastic" },
  ],
  summary: "🧬2",
};

const resilienceSingle: HabitResilienceResult = {
  habits: [
    { name: "운동", breakCount: 2, medianGapDays: 3, maxGapDays: 5, grade: "moderate" },
  ],
  summary: "⏳1",
};

// ── Tests ────────────────────────────────────────────────────

describe("HabitResilienceCard", () => {
  it("should render nothing when resilience is null", () => {
    const { container } = render(
      <HabitResilienceCard resilience={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render nothing when habits array is empty", () => {
    const empty: HabitResilienceResult = { habits: [], summary: "" };
    const { container } = render(
      <HabitResilienceCard resilience={empty} />,
    );
    expect(container.firstChild).toBeNull();
  });

  describe("per-habit display", () => {
    it("should display each habit name", () => {
      render(<HabitResilienceCard resilience={resilienceMixed} />);
      expect(screen.getByText("운동")).toBeDefined();
      expect(screen.getByText("독서")).toBeDefined();
      expect(screen.getByText("명상")).toBeDefined();
      expect(screen.getByText("일기")).toBeDefined();
    });

    it("should display break count for habits with breaks > 0", () => {
      render(<HabitResilienceCard resilience={resilienceMixed} />);
      // breakCount displayed as "{n}회" — 1회, 3회, 5회, 7회
      expect(screen.getByText("1회")).toBeDefined();
      expect(screen.getByText("3회")).toBeDefined();
      expect(screen.getByText("5회")).toBeDefined();
      expect(screen.getByText("7회")).toBeDefined();
    });

    it("should not display break count when breakCount is 0", () => {
      render(<HabitResilienceCard resilience={resilienceAllElastic} />);
      expect(screen.queryByText("0회")).toBeNull();
    });
  });

  describe("tooltips", () => {
    it("should show tooltip with grade, median gap, and max gap", () => {
      render(<HabitResilienceCard resilience={resilienceMixed} />);
      expect(screen.getByTitle("운동: elastic (중앙값 1일, 최대 1일, 1회 끊김)")).toBeDefined();
      expect(screen.getByTitle("독서: moderate (중앙값 4일, 최대 6일, 3회 끊김)")).toBeDefined();
      expect(screen.getByTitle("명상: slow (중앙값 8일, 최대 12일, 5회 끊김)")).toBeDefined();
      expect(screen.getByTitle("일기: fragile (중앙값 16일, 최대 22일, 7회 끊김)")).toBeDefined();
    });

    it("should show zero-break tooltip for elastic habits with no breaks", () => {
      render(<HabitResilienceCard resilience={resilienceAllElastic} />);
      expect(screen.getByTitle("운동: elastic (끊김 없음)")).toBeDefined();
      expect(screen.getByTitle("독서: elastic (끊김 없음)")).toBeDefined();
    });
  });

  describe("summary", () => {
    it("should display the compact summary line", () => {
      render(<HabitResilienceCard resilience={resilienceMixed} />);
      expect(screen.getByText("🧬1 · ⏳1 · 🐌1 · 💔1")).toBeDefined();
    });

    it("should display simple summary for uniform grades", () => {
      render(<HabitResilienceCard resilience={resilienceAllElastic} />);
      expect(screen.getByText("🧬2")).toBeDefined();
    });

    it("should not render summary text when summary is empty string", () => {
      const noSummary: HabitResilienceResult = {
        habits: [{ name: "운동", breakCount: 0, medianGapDays: 0, maxGapDays: 0, grade: "elastic" }],
        summary: "",
      };
      render(<HabitResilienceCard resilience={noSummary} />);
      expect(screen.getByText("운동")).toBeDefined();
      // Summary should be absent — verify no grade emoji summary text rendered
      expect(screen.queryByText("🧬1")).toBeNull();
    });
  });

  describe("grade emoji per chip", () => {
    it("should display correct emoji for each grade", () => {
      render(<HabitResilienceCard resilience={resilienceMixed} />);
      // Each habit chip renders its grade emoji — verify via tooltip association
      // 운동=elastic→🧬, 독서=moderate→⏳, 명상=slow→🐌, 일기=fragile→💔
      const elasticChip = screen.getByTitle(/운동: elastic/);
      expect(elasticChip.textContent).toContain("🧬");
      const moderateChip = screen.getByTitle(/독서: moderate/);
      expect(moderateChip.textContent).toContain("⏳");
      const slowChip = screen.getByTitle(/명상: slow/);
      expect(slowChip.textContent).toContain("🐌");
      const fragileChip = screen.getByTitle(/일기: fragile/);
      expect(fragileChip.textContent).toContain("💔");
    });
  });

  describe("grade color differentiation", () => {
    it("should apply different colors for elastic vs fragile grades", () => {
      render(<HabitResilienceCard resilience={resilienceMixed} />);
      const elasticChip = screen.getByTitle(/운동: elastic/);
      const fragileChip = screen.getByTitle(/일기: fragile/);
      // Elastic uses statusActive (green), fragile uses statusPaused (red)
      expect(elasticChip.style.color).not.toBe(fragileChip.style.color);
      expect(elasticChip.style.color).toBeTruthy();
      expect(fragileChip.style.color).toBeTruthy();
    });
  });

  describe("section label", () => {
    it("should display 회복탄력성 label", () => {
      render(<HabitResilienceCard resilience={resilienceMixed} />);
      expect(screen.getByText("회복탄력성")).toBeDefined();
    });
  });

  describe("single habit", () => {
    it("should render correctly with a single habit", () => {
      render(<HabitResilienceCard resilience={resilienceSingle} />);
      expect(screen.getByText("운동")).toBeDefined();
      expect(screen.getByText("2회")).toBeDefined();
      expect(screen.getByText("⏳1")).toBeDefined();
      expect(screen.getByTitle("운동: moderate (중앙값 3일, 최대 5일, 2회 끊김)")).toBeDefined();
    });
  });
});
