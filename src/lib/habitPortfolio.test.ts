// ABOUTME: Tests for calcHabitPortfolio — habit portfolio state classification and one-line summary
// ABOUTME: Covers all 6 states (record, milestone_near, risk, growing, recovering, dormant), priority ordering, counts, and summary

import { describe, it, expect } from "vitest";
import { calcHabitPortfolio } from "./habitPortfolio";

const TODAY = "2026-03-22";

// ── Helper: shorthand habit builder ──────────────────────────────────────────
function h(name: string, streak: number, lastChecked?: string, bestStreak?: number) {
  return { name, streak, lastChecked, bestStreak };
}

describe("calcHabitPortfolio", () => {
  // ── Empty input ────────────────────────────────────────────────────────────

  it("shouldReturnEmptyPortfolioWhenHabitsArrayIsEmpty", () => {
    const result = calcHabitPortfolio({ habits: [], todayStr: TODAY });
    expect(result.habits).toEqual([]);
    expect(result.counts).toEqual({
      record: 0,
      milestone_near: 0,
      risk: 0,
      growing: 0,
      recovering: 0,
      dormant: 0,
    });
    expect(result.summary).toBe("");
  });

  // ── Individual state classification ────────────────────────────────────────

  it("shouldClassifyAsRecordWhenStreakEqualsBestStreakGte4AndCheckedToday", () => {
    const result = calcHabitPortfolio({
      habits: [h("운동", 14, TODAY, 14)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("record");
  });

  it("shouldNotClassifyAsRecordWhenBestStreakBelow4", () => {
    // streak=1, bestStreak=1 — trivial equality on first check-in, not a meaningful record
    const result = calcHabitPortfolio({
      habits: [h("운동", 1, TODAY, 1)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).not.toBe("record");
    // Falls through to milestone_near (1→7=6 away? no), growing
    expect(result.habits[0].state).toBe("growing");
  });

  it("shouldNotClassifyAsRecordWhenBestStreakIs3", () => {
    // streak=3, bestStreak=3 — still below MIN_RECORD_BEST_STREAK (4)
    const result = calcHabitPortfolio({
      habits: [h("운동", 3, TODAY, 3)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).not.toBe("record");
  });

  it("shouldClassifyAsRecordWhenBestStreakIsExactly4", () => {
    const result = calcHabitPortfolio({
      habits: [h("운동", 4, TODAY, 4)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("record");
  });

  it("shouldNotClassifyAsRecordWhenNotCheckedToday", () => {
    // streak matches bestStreak but NOT checked today — it's at risk, not celebratory
    const result = calcHabitPortfolio({
      habits: [h("운동", 14, "2026-03-21", 14)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("risk"); // streak ≥ 7 + not checked → risk
  });

  it("shouldClassifyAsRiskWhenStreakGte7AndNotCheckedToday", () => {
    const result = calcHabitPortfolio({
      habits: [h("독서", 10, "2026-03-21")],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("risk");
  });

  it("shouldClassifyAsMilestoneNearWhenWithin1to2DaysOfMilestone", () => {
    // streak=28, next milestone=30, daysToMilestone=2 → milestone_near
    const result = calcHabitPortfolio({
      habits: [h("명상", 28, TODAY)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("milestone_near");
  });

  it("shouldClassifyAsMilestoneNearWhen1DayFromMilestone", () => {
    // streak=6, next milestone=7, daysToMilestone=1
    const result = calcHabitPortfolio({
      habits: [h("명상", 6, TODAY)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("milestone_near");
  });

  it("shouldClassifyAsMilestoneNearWhenApproaching14DayMilestone", () => {
    // streak=12, next milestone=14, daysToMilestone=2 → milestone_near
    const result = calcHabitPortfolio({
      habits: [h("명상", 12, TODAY, 50)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("milestone_near");
  });

  it("shouldClassifyAsMilestoneNearWhenApproaching50DayMilestone", () => {
    // streak=48, next milestone=50, daysToMilestone=2 → milestone_near
    const result = calcHabitPortfolio({
      habits: [h("명상", 48, TODAY, 80)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("milestone_near");
  });

  it("shouldClassifyAsMilestoneNearWhenNotCheckedTodayAndStreakBelow7", () => {
    // streak=6, NOT checked today, near milestone 7 — milestone_near motivates "check today!"
    // This is intentional: for short streaks (< 7), the milestone approach is more motivating
    // than the generic "recovering" label. risk (priority 2) handles long-streak protection.
    const result = calcHabitPortfolio({
      habits: [h("명상", 6, "2026-03-21")],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("milestone_near");
  });

  it("shouldNotClassifyAsMilestoneNearWhen3DaysAway", () => {
    // streak=4, next milestone=7, daysToMilestone=3 → NOT milestone_near (threshold is 2)
    const result = calcHabitPortfolio({
      habits: [h("명상", 4, TODAY)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("growing"); // just growing, not near milestone
  });

  it("shouldNotClassifyAsMilestoneNearWhenAtMilestoneExactly", () => {
    // streak=7, at milestone → not NEAR it
    const result = calcHabitPortfolio({
      habits: [h("명상", 7, TODAY, 10)],
      todayStr: TODAY,
    });
    // Not at personal best (bestStreak=10), streak=7 (at milestone, not NEAR it)
    // Next milestone is 14, 14-7=7, not within 2 → growing
    expect(result.habits[0].state).toBe("growing");
  });

  it("shouldClassifyAsGrowingWhenActiveStreakAndCheckedToday", () => {
    const result = calcHabitPortfolio({
      habits: [h("운동", 3, TODAY, 10)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("growing");
  });

  it("shouldClassifyAsRecoveringWhenSmallStreakNotCheckedToday", () => {
    // streak=4, not checked today (yesterday was checked → streak 4 is stored from yesterday)
    const result = calcHabitPortfolio({
      habits: [h("운동", 4, "2026-03-21")],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("recovering");
  });

  it("shouldClassifyAsDormantWhenStreakZeroAndNotCheckedToday", () => {
    const result = calcHabitPortfolio({
      habits: [h("운동", 0, "2026-03-15")],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("dormant");
  });

  it("shouldClassifyAsDormantWhenStreakZeroAndNeverChecked", () => {
    const result = calcHabitPortfolio({
      habits: [h("운동", 0, undefined)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("dormant");
  });

  // ── Priority ordering (first match wins) ───────────────────────────────────

  it("shouldPrioritizeRecordOverMilestoneNear", () => {
    // streak=29, bestStreak=29, checked today → at personal best AND 1 day from milestone 30
    // record should win
    const result = calcHabitPortfolio({
      habits: [h("명상", 29, TODAY, 29)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("record");
  });

  it("shouldPrioritizeRiskOverMilestoneNearWhenNotChecked", () => {
    // streak=28, not checked today → near milestone 30 BUT also risk (streak ≥ 7)
    // risk should win (preserving the streak is more urgent)
    const result = calcHabitPortfolio({
      habits: [h("명상", 28, "2026-03-21")],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("risk");
  });

  it("shouldPrioritizeMilestoneNearOverGrowingWhenCheckedToday", () => {
    // streak=5, checked today → near milestone 7 AND growing
    // milestone_near should win
    const result = calcHabitPortfolio({
      habits: [h("명상", 5, TODAY, 10)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("milestone_near");
  });

  it("shouldPrioritizeMilestoneNearOverRecoveringWhenNotChecked", () => {
    // streak=5, not checked today → near milestone 7 (milestone_near) vs recovering
    // milestone_near wins because it motivates the user to check in
    const result = calcHabitPortfolio({
      habits: [h("명상", 5, "2026-03-21")],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("milestone_near");
  });

  // ── Counts ─────────────────────────────────────────────────────────────────

  it("shouldCountStatesCorrectly", () => {
    const result = calcHabitPortfolio({
      habits: [
        h("운동", 14, TODAY, 14),      // record (bestStreak ≥ 4, checked today)
        h("명상", 29, TODAY, 50),      // milestone_near (1 from 30)
        h("독서", 10, "2026-03-21"),   // risk (streak ≥ 7, not checked today)
        h("코딩", 3, TODAY, 20),       // growing
        h("영어", 2, "2026-03-21"),    // recovering (streak < 7, not checked, not near milestone)
        h("일기", 0, "2026-03-10"),    // dormant
      ],
      todayStr: TODAY,
    });
    expect(result.counts).toEqual({
      record: 1,
      milestone_near: 1,
      risk: 1,
      growing: 1,
      recovering: 1,
      dormant: 1,
    });
  });

  // ── Summary string ─────────────────────────────────────────────────────────

  it("shouldGenerateSummaryWithAllStates", () => {
    const result = calcHabitPortfolio({
      habits: [
        h("운동", 14, TODAY, 14),      // record
        h("명상", 29, TODAY, 50),      // milestone_near
        h("독서", 10, "2026-03-21"),   // risk
        h("코딩", 3, TODAY, 20),       // growing
        h("영어", 2, "2026-03-21"),    // recovering
        h("일기", 0, "2026-03-10"),    // dormant
      ],
      todayStr: TODAY,
    });
    // Summary should include non-zero state counts with emojis
    expect(result.summary).toContain("🏆1");
    expect(result.summary).toContain("⚠️1");
    expect(result.summary).toContain("📈1");
  });

  it("shouldOmitZeroCountStatesFromSummary", () => {
    const result = calcHabitPortfolio({
      habits: [
        h("운동", 3, TODAY, 10), // growing
        h("독서", 5, TODAY, 8),  // milestone_near (near 7)
      ],
      todayStr: TODAY,
    });
    // No record, risk, recovering, dormant — should not appear
    expect(result.summary).not.toContain("🏆");
    expect(result.summary).not.toContain("⚠️");
    expect(result.summary).not.toContain("💤");
  });

  it("shouldReturnEmptySummaryWhenNoHabits", () => {
    const result = calcHabitPortfolio({ habits: [], todayStr: TODAY });
    expect(result.summary).toBe("");
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it("shouldHandleSingleHabit", () => {
    const result = calcHabitPortfolio({
      habits: [h("운동", 5, TODAY, 10)],
      todayStr: TODAY,
    });
    expect(result.habits).toHaveLength(1);
    expect(result.habits[0].state).toBe("milestone_near");
    expect(result.summary).not.toBe("");
  });

  it("shouldHandleAllHabitsSameState", () => {
    const result = calcHabitPortfolio({
      habits: [
        h("운동", 3, TODAY, 10),
        h("독서", 4, TODAY, 20),
        h("명상", 2, TODAY, 15),
      ],
      todayStr: TODAY,
    });
    // All growing (no milestone_near for any: 3→7=4away, 4→7=3away, 2→7=5away)
    expect(result.counts.growing).toBe(3);
  });

  it("shouldPreserveInputOrderInOutput", () => {
    const result = calcHabitPortfolio({
      habits: [
        h("A", 3, TODAY, 10),
        h("B", 0, undefined),
        h("C", 10, "2026-03-21"),
      ],
      todayStr: TODAY,
    });
    expect(result.habits[0].name).toBe("A");
    expect(result.habits[1].name).toBe("B");
    expect(result.habits[2].name).toBe("C");
  });

  it("shouldIncludeStreakInHabitStatus", () => {
    const result = calcHabitPortfolio({
      habits: [h("운동", 42, TODAY, 50)],
      todayStr: TODAY,
    });
    expect(result.habits[0].streak).toBe(42);
  });

  it("shouldHandleMissingBestStreak", () => {
    // bestStreak undefined — record check should treat as 0 (never qualifies for record)
    const result = calcHabitPortfolio({
      habits: [h("운동", 5, TODAY, undefined)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("milestone_near"); // 5 → 7 = 2 away
  });

  it("shouldHandleStreakAtLargestMilestoneApproach", () => {
    // streak=98, next milestone=100, daysToMilestone=2 → milestone_near
    const result = calcHabitPortfolio({
      habits: [h("운동", 98, TODAY, 150)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("milestone_near");
  });

  it("shouldClassifyAsGrowingWhenBeyondAllMilestones", () => {
    // streak=150, past all milestones [7,14,30,50,100], checked today, not at bestStreak
    const result = calcHabitPortfolio({
      habits: [h("운동", 150, TODAY, 200)],
      todayStr: TODAY,
    });
    expect(result.habits[0].state).toBe("growing");
  });
});
