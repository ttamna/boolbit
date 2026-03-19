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

  // Goal done states: quarter, month, week (done without urgency)
  it("should return 'Q✓✓' when quarterGoalDone and daysLeftQuarter > 14", () => {
    expect(calcDirectionBadge({ ...base, quarterGoal: "Q2 goal", quarterGoalDone: true, daysLeftQuarter: 15 })).toBe("Q✓✓");
  });

  it("should return 'M✓✓' when monthGoalDone and daysLeftMonth > 7", () => {
    expect(calcDirectionBadge({ ...base, monthGoal: "Launch", monthGoalDone: true, daysLeftMonth: 8 })).toBe("M✓✓");
  });

  it("should return 'W✓✓' when weekGoalDone and daysLeftWeek > 3", () => {
    expect(calcDirectionBadge({ ...base, weekGoal: "Write post", weekGoalDone: true, daysLeftWeek: 4 })).toBe("W✓✓");
  });

  // Goal done states combined with urgency
  it("should return 'Q✓✓·10d' when quarterGoalDone and daysLeftQuarter in urgency range (interior value, threshold is 14)", () => {
    expect(calcDirectionBadge({ ...base, quarterGoal: "Q2 goal", quarterGoalDone: true, daysLeftQuarter: 10 })).toBe("Q✓✓·10d");
  });

  it("should return 'M✓✓·3d' when monthGoalDone and daysLeftMonth within urgency (3 ≤ 7)", () => {
    expect(calcDirectionBadge({ ...base, monthGoal: "Launch", monthGoalDone: true, daysLeftMonth: 3 })).toBe("M✓✓·3d");
  });

  it("should return 'W✓✓·2d' when weekGoalDone and daysLeftWeek within urgency (2 ≤ 3)", () => {
    expect(calcDirectionBadge({ ...base, weekGoal: "Write post", weekGoalDone: true, daysLeftWeek: 2 })).toBe("W✓✓·2d");
  });

  // Intention: exact consecutiveDays boundary
  it("should show streak suffix when consecutiveDays is exactly 2 (minimum trigger)", () => {
    expect(calcDirectionBadge({ ...base, todayIntention: "Focus", intentionConsecutiveDays: 2 })).toBe("✓·2🔥");
  });

  it("should show streak suffix at consecutiveDays=2 combined with weekSuffix (streak+week ordering)", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        intentionConsecutiveDays: 2,
        intentionSetCount7: 6,
        intentionDoneCount7: 5,
      })
    ).toBe("✓·2🔥·5/6");
  });

  // Intention: stable trend arrow →
  it("should append → trend after week suffix when intentionWeekTrend is →", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        intentionConsecutiveDays: 1,
        intentionSetCount7: 5,
        intentionDoneCount7: 4,
        intentionWeekTrend: "→",
      })
    ).toBe("✓·4/5→");
  });

  // Intention: intentionDoneCount7 undefined falls back to 0
  it("should treat intentionDoneCount7=undefined as 0 when intentionSetCount7 > 0", () => {
    expect(
      calcDirectionBadge({
        ...base,
        todayIntention: "Focus",
        intentionConsecutiveDays: 1,
        intentionSetCount7: 5,
        intentionDoneCount7: undefined,
      })
    ).toBe("✓·0/5");
  });

  // Intention: empty string treated as falsy (no badge emitted); base has no other goals/quotes set
  it("should treat empty string todayIntention as falsy (no intention badge emitted)", () => {
    expect(calcDirectionBadge({ ...base, todayIntention: "" })).toBeUndefined();
  });

  // Composite: all 4 goals set simultaneously
  it("should include all four goal parts when all goals are set (undone, no urgency)", () => {
    const result = calcDirectionBadge({
      ...base,
      yearGoal: "Y",
      quarterGoal: "Q",
      monthGoal: "M",
      weekGoal: "W",
    });
    expect(result).toBe("Y✓ · Q✓ · M✓ · W✓");
  });

  it("should include all four goal parts when all goals done and all within urgency", () => {
    const result = calcDirectionBadge({
      ...base,
      yearGoal: "Y", yearGoalDone: true, daysLeftYear: 10,
      quarterGoal: "Q", quarterGoalDone: true, daysLeftQuarter: 7,
      monthGoal: "M", monthGoalDone: true, daysLeftMonth: 5,
      weekGoal: "W", weekGoalDone: true, daysLeftWeek: 1,
    });
    expect(result).toBe("Y✓✓·10d · Q✓✓·7d · M✓✓·5d · W✓✓·1d");
  });
});
