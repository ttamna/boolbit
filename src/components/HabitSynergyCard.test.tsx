// ABOUTME: Unit tests for HabitSynergyCard — keystone habit synergy visualization card
// ABOUTME: Covers null rendering, keystone display (name, lift, rates), no-keystone fallback, and edge cases

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HabitSynergyCard } from "./HabitSynergyCard";
import type { HabitSynergyResult } from "../lib/habitSynergy";

// ── Fixtures ────────────────────────────────────────────────

const synergyWithKeystone: HabitSynergyResult = {
  keystone: {
    habitName: "명상",
    liftPct: 32,
    avgOthersWhenDone: 78,
    avgOthersWhenNotDone: 46,
  },
  summary: "🔑 '명상' 할 때 다른 습관 78% 완료",
};

const synergyHighLift: HabitSynergyResult = {
  keystone: {
    habitName: "운동",
    liftPct: 55,
    avgOthersWhenDone: 90,
    avgOthersWhenNotDone: 35,
  },
  summary: "🔑 '운동' 할 때 다른 습관 90% 완료",
};

const synergyNoKeystone: HabitSynergyResult = {
  keystone: null,
  summary: "습관들이 고르게 독립적",
};

// ── Tests ────────────────────────────────────────────────────

describe("HabitSynergyCard", () => {
  it("should render nothing when result is null", () => {
    const { container } = render(<HabitSynergyCard synergy={null} />);
    expect(container.firstChild).toBeNull();
  });

  describe("keystone display", () => {
    it("should display keystone habit name", () => {
      render(<HabitSynergyCard synergy={synergyWithKeystone} />);
      expect(screen.getByText("명상")).toBeDefined();
    });

    it("should display lift percentage with + prefix", () => {
      render(<HabitSynergyCard synergy={synergyWithKeystone} />);
      expect(screen.getByText("+32%p")).toBeDefined();
    });

    it("should display when-done rate", () => {
      render(<HabitSynergyCard synergy={synergyWithKeystone} />);
      expect(screen.getByText("78%")).toBeDefined();
    });

    it("should display when-not-done rate", () => {
      render(<HabitSynergyCard synergy={synergyWithKeystone} />);
      expect(screen.getByText("46%")).toBeDefined();
    });

    it("should show tooltip with detailed explanation", () => {
      render(<HabitSynergyCard synergy={synergyWithKeystone} />);
      const el = screen.getByTitle("'명상' 할 때 다른 습관 78% vs 안 할 때 46%");
      expect(el).toBeDefined();
    });

    it("should display high lift value correctly", () => {
      render(<HabitSynergyCard synergy={synergyHighLift} />);
      expect(screen.getByText("운동")).toBeDefined();
      expect(screen.getByText("+55%p")).toBeDefined();
      expect(screen.getByText("90%")).toBeDefined();
      expect(screen.getByText("35%")).toBeDefined();
    });
  });

  describe("no-keystone fallback", () => {
    it("should display independence summary when no keystone", () => {
      render(<HabitSynergyCard synergy={synergyNoKeystone} />);
      expect(screen.getByText("습관들이 고르게 독립적")).toBeDefined();
    });

    it("should not display lift or rates when no keystone", () => {
      render(<HabitSynergyCard synergy={synergyNoKeystone} />);
      expect(screen.queryByText(/\+\d+%p/)).toBeNull();
    });
  });

  describe("section label", () => {
    it("should display 시너지 label", () => {
      render(<HabitSynergyCard synergy={synergyWithKeystone} />);
      expect(screen.getByText("시너지")).toBeDefined();
    });

    it("should display 시너지 label even for no-keystone state", () => {
      render(<HabitSynergyCard synergy={synergyNoKeystone} />);
      expect(screen.getByText("시너지")).toBeDefined();
    });
  });

  describe("display precision and boundary values", () => {
    it("should display +10%p for liftPct at minimum library boundary (MIN_LIFT_PCT=10)", () => {
      // calcHabitSynergy enforces MIN_LIFT_PCT=10; verify component renders this boundary correctly
      const synergy: HabitSynergyResult = {
        keystone: { habitName: "요가", liftPct: 10, avgOthersWhenDone: 60, avgOthersWhenNotDone: 50 },
        summary: "",
      };
      render(<HabitSynergyCard synergy={synergy} />);
      expect(screen.getByText("+10%p")).toBeDefined();
    });

    it("should display 100% for avgOthersWhenDone at ceiling rate", () => {
      // avgOthersWhenDone=100 is a valid boundary when all other habits are completed
      const synergy: HabitSynergyResult = {
        keystone: { habitName: "수영", liftPct: 30, avgOthersWhenDone: 100, avgOthersWhenNotDone: 70 },
        summary: "",
      };
      render(<HabitSynergyCard synergy={synergy} />);
      expect(screen.getByText("100%")).toBeDefined();
    });

    it("should display 0% for avgOthersWhenNotDone at floor rate", () => {
      // avgOthersWhenNotDone=0 is valid when no other habits are ever done on days this habit is skipped
      const synergy: HabitSynergyResult = {
        keystone: { habitName: "달리기", liftPct: 75, avgOthersWhenDone: 75, avgOthersWhenNotDone: 0 },
        summary: "",
      };
      render(<HabitSynergyCard synergy={synergy} />);
      expect(screen.getByText("0%")).toBeDefined();
    });

    it("should compute tooltip title dynamically from rate values", () => {
      // Tooltip is a distinct code path from visible spans; verify it reflects the specific fixture values
      const synergy: HabitSynergyResult = {
        keystone: { habitName: "수영", liftPct: 30, avgOthersWhenDone: 100, avgOthersWhenNotDone: 70 },
        summary: "",
      };
      render(<HabitSynergyCard synergy={synergy} />);
      expect(screen.getByTitle("'수영' 할 때 다른 습관 100% vs 안 할 때 70%")).toBeDefined();
    });
  });
});
