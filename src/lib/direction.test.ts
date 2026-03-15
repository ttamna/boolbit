// ABOUTME: Unit tests for calcDirectionBadge pure helper function
// ABOUTME: Covers goal tokens, urgency thresholds, done state, intention streak suffix, and multi-part joining

import { describe, it, expect } from "vitest";
import { calcDirectionBadge } from "./direction";

// Explicit type annotation ensures this fixture fails at compile time if DirectionBadgeParams changes.
const base: import("./direction").DirectionBadgeParams = {
  yearGoal: undefined,
  yearGoalDone: undefined,
  quarterGoal: undefined,
  quarterGoalDone: undefined,
  monthGoal: undefined,
  monthGoalDone: undefined,
  weekGoal: undefined,
  weekGoalDone: undefined,
  todayIntention: undefined,
  todayIntentionDone: undefined,
  intentionConsecutiveDays: 1,
  intentionSetCount7: undefined,
  intentionDoneCount7: undefined,
  quotesCount: 0,
  daysLeftYear: 100,
  daysLeftQuarter: 50,
  daysLeftMonth: 20,
  daysLeftWeek: 5,
};

describe("calcDirectionBadge", () => {
  it("should return undefined when no goals are set and no quotes", () => {
    expect(calcDirectionBadge(base)).toBeUndefined();
  });

  it("should return 'Y✓' when yearGoal is set, not done, and daysLeftYear > 30", () => {
    expect(calcDirectionBadge({ ...base, yearGoal: "Ship v2", daysLeftYear: 31 })).toBe("Y✓");
  });

  it("should append urgency suffix when yearGoal set and daysLeftYear exactly 30 (inclusive threshold)", () => {
    expect(calcDirectionBadge({ ...base, yearGoal: "Ship v2", daysLeftYear: 30 })).toBe("Y✓·30d");
  });

  it("should treat empty string yearGoal as falsy (no badge part emitted)", () => {
    // if (yearGoal) is a truthy check: "" → no badge, consistent with updateYearGoal clearing to undefined
    expect(calcDirectionBadge({ ...base, yearGoal: "" })).toBeUndefined();
  });

  it("should return 'Y✓✓' when yearGoalDone is true and daysLeftYear > 30", () => {
    expect(calcDirectionBadge({ ...base, yearGoal: "Ship v2", yearGoalDone: true, daysLeftYear: 50 })).toBe("Y✓✓");
  });

  it("should return 'Y✓✓·5d' when yearGoalDone and daysLeftYear within urgency range", () => {
    expect(calcDirectionBadge({ ...base, yearGoal: "Ship v2", yearGoalDone: true, daysLeftYear: 5 })).toBe("Y✓✓·5d");
  });

  it("should append urgency suffix when quarterGoal set and daysLeftQuarter exactly 14 (inclusive threshold)", () => {
    expect(calcDirectionBadge({ ...base, quarterGoal: "Q2 goal", daysLeftQuarter: 14 })).toBe("Q✓·14d");
  });

  it("should NOT append quarter urgency when daysLeftQuarter is 15", () => {
    expect(calcDirectionBadge({ ...base, quarterGoal: "Q2 goal", daysLeftQuarter: 15 })).toBe("Q✓");
  });

  it("should append urgency suffix when monthGoal set and daysLeftMonth exactly 7 (inclusive threshold)", () => {
    expect(calcDirectionBadge({ ...base, monthGoal: "Launch", daysLeftMonth: 7 })).toBe("M✓·7d");
  });

  it("should NOT append month urgency when daysLeftMonth is 8", () => {
    expect(calcDirectionBadge({ ...base, monthGoal: "Launch", daysLeftMonth: 8 })).toBe("M✓");
  });

  it("should append urgency suffix when weekGoal set and daysLeftWeek exactly 3 (inclusive threshold)", () => {
    expect(calcDirectionBadge({ ...base, weekGoal: "Write post", daysLeftWeek: 3 })).toBe("W✓·3d");
  });

  it("should NOT append week urgency when daysLeftWeek is 4", () => {
    expect(calcDirectionBadge({ ...base, weekGoal: "Write post", daysLeftWeek: 4 })).toBe("W✓");
  });

  it("should return '✓' when todayIntention set, not done, consecutiveDays is 1 (no streak suffix)", () => {
    expect(calcDirectionBadge({ ...base, todayIntention: "Focus", intentionConsecutiveDays: 1 })).toBe("✓");
  });

  it("should show streak suffix when consecutiveDays >= 2", () => {
    expect(calcDirectionBadge({ ...base, todayIntention: "Focus", intentionConsecutiveDays: 3 })).toBe("✓·3🔥");
  });

  it("should return '✓✓·5🔥' when intention done with 5-day streak", () => {
    expect(calcDirectionBadge({ ...base, todayIntention: "Focus", todayIntentionDone: true, intentionConsecutiveDays: 5 })).toBe("✓✓·5🔥");
  });

  it("should return '✓✓' when intention done but consecutive is 1 (no streak)", () => {
    expect(calcDirectionBadge({ ...base, todayIntention: "Focus", todayIntentionDone: true, intentionConsecutiveDays: 1 })).toBe("✓✓");
  });

  it("should return '3q' when only quotes are present (no goals)", () => {
    expect(calcDirectionBadge({ ...base, quotesCount: 3 })).toBe("3q");
  });

  it("should join multiple parts with ' · ' separator", () => {
    const result = calcDirectionBadge({
      ...base,
      yearGoal: "Ship v2",
      daysLeftYear: 50,
      weekGoal: "Write post",
      daysLeftWeek: 5,
      quotesCount: 2,
    });
    expect(result).toBe("Y✓ · W✓ · 2q");
  });

  it("should omit parts for goals that are not set", () => {
    // Only monthGoal set → only M✓ in output, no Y✓/Q✓/W✓
    const result = calcDirectionBadge({ ...base, monthGoal: "Launch", daysLeftMonth: 20 });
    expect(result).toBe("M✓");
  });

  // 7-day intention completion rate suffix
  it("should NOT append week suffix when intentionSetCount7 is 0", () => {
    expect(
      calcDirectionBadge({ ...base, todayIntention: "Focus", intentionSetCount7: 0, intentionDoneCount7: 0 })
    ).toBe("✓");
  });

  it("should NOT append week suffix when intentionSetCount7 is undefined", () => {
    expect(
      calcDirectionBadge({ ...base, todayIntention: "Focus" })
    ).toBe("✓");
  });

  it("should append '·N/M' week suffix when intentionSetCount7 > 0", () => {
    expect(
      calcDirectionBadge({ ...base, todayIntention: "Focus", intentionSetCount7: 7, intentionDoneCount7: 5 })
    ).toBe("✓·5/7");
  });

  it("should combine streak and week suffix: '✓·3🔥·4/6'", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        intentionConsecutiveDays: 3,
        intentionSetCount7: 6,
        intentionDoneCount7: 4,
      })
    ).toBe("✓·3🔥·4/6");
  });

  it("should combine done+streak+week: '✓✓·5🔥·7/7'", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        todayIntentionDone: true,
        intentionConsecutiveDays: 5,
        intentionSetCount7: 7,
        intentionDoneCount7: 7,
      })
    ).toBe("✓✓·5🔥·7/7");
  });

  it("should show week suffix without streak when consecutiveDays is 1", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        intentionConsecutiveDays: 1,
        intentionSetCount7: 5,
        intentionDoneCount7: 3,
      })
    ).toBe("✓·3/5");
  });

  it("should append ↑ trend after week suffix when intentionWeekTrend is ↑", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        intentionConsecutiveDays: 1,
        intentionSetCount7: 5,
        intentionDoneCount7: 4,
        intentionWeekTrend: "↑",
      })
    ).toBe("✓·4/5↑");
  });

  it("should append ↓ trend after week suffix when intentionWeekTrend is ↓", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        intentionConsecutiveDays: 3,
        intentionSetCount7: 5,
        intentionDoneCount7: 2,
        intentionWeekTrend: "↓",
      })
    ).toBe("✓·3🔥·2/5↓");
  });

  it("should not append trend when intentionWeekTrend is null", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        intentionConsecutiveDays: 1,
        intentionSetCount7: 5,
        intentionDoneCount7: 3,
        intentionWeekTrend: null,
      })
    ).toBe("✓·3/5");
  });

  it("should not append trend when intentionWeekTrend is absent (backward compat)", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        intentionConsecutiveDays: 1,
        intentionSetCount7: 5,
        intentionDoneCount7: 3,
      })
    ).toBe("✓·3/5");
  });
});
