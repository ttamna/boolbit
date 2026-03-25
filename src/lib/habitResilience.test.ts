// ABOUTME: Unit tests for calcHabitResilience — per-habit recovery resilience profiling
// ABOUTME: Covers edge cases (empty input, insufficient checks), grade thresholds, summary format

import { describe, test, expect } from "vitest";
import { calcHabitResilience } from "./habitResilience";

// ── Helper: build day window (N consecutive YYYY-MM-DD strings ending at endDate) ──
function buildWindow(endDate: string, days: number): string[] {
  const [y, m, d] = endDate.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    result.push(new Date(base - i * 86_400_000).toISOString().slice(0, 10));
  }
  return result;
}

describe("calcHabitResilience", () => {
  // ── Null / insufficient data ──────────────────────────────────────

  test("shouldReturnNullWhenNoHabits", () => {
    expect(calcHabitResilience({ habits: [], dayWindow: buildWindow("2026-03-22", 14) })).toBeNull();
  });

  test("shouldReturnNullWhenEmptyDayWindow", () => {
    const habits = [{ name: "운동", checkHistory: ["2026-03-20"] }];
    expect(calcHabitResilience({ habits, dayWindow: [] })).toBeNull();
  });

  test("shouldReturnNullWhenAllHabitsHaveInsufficientChecks", () => {
    // Only 1 check per habit — below MIN_CHECKS (2)
    const habits = [
      { name: "운동", checkHistory: ["2026-03-20"] },
      { name: "독서", checkHistory: ["2026-03-15"] },
    ];
    expect(calcHabitResilience({ habits, dayWindow: buildWindow("2026-03-22", 14) })).toBeNull();
  });

  test("shouldReturnNullWhenAllHabitsHaveNoCheckHistory", () => {
    const habits = [
      { name: "운동" },
      { name: "독서", checkHistory: [] },
    ];
    expect(calcHabitResilience({ habits, dayWindow: buildWindow("2026-03-22", 14) })).toBeNull();
  });

  // ── Grade: elastic (median gap ≤ 2) ───────────────────────────────

  test("shouldGradeElasticWhenPerfectStreakNoBreaks", () => {
    const window = buildWindow("2026-03-22", 14); // 03-09 ~ 03-22
    const habits = [{ name: "운동", checkHistory: [...window] }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result).not.toBeNull();
    expect(result!.habits[0]).toMatchObject({
      name: "운동",
      breakCount: 0,
      medianGapDays: 0,
      maxGapDays: 0,
      grade: "elastic",
    });
  });

  test("shouldGradeElasticWhenAllGapsAreTwoDaysOrLess", () => {
    const window = buildWindow("2026-03-22", 14); // 03-09 ~ 03-22
    // 03-09, (skip 10), 03-11, (skip 12,13), 03-14, (skip 15), 03-16, 03-17, 03-18
    // gaps: [1, 2, 1], median([1,1,2]) = 1
    const habits = [{
      name: "운동",
      checkHistory: ["2026-03-09", "2026-03-11", "2026-03-14", "2026-03-16", "2026-03-17", "2026-03-18"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      name: "운동",
      breakCount: 3,
      medianGapDays: 1,
      maxGapDays: 2,
      grade: "elastic",
    });
  });

  test("shouldGradeElasticWhenTwoConsecutiveChecksOnly", () => {
    const window = buildWindow("2026-03-22", 14);
    // Two consecutive days → gap = 0 → no breaks → elastic
    const habits = [{ name: "운동", checkHistory: ["2026-03-20", "2026-03-21"] }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      breakCount: 0,
      medianGapDays: 0,
      maxGapDays: 0,
      grade: "elastic",
    });
  });

  test("shouldGradeElasticWhenMedianGapIsExactlyTwo", () => {
    const window = buildWindow("2026-03-22", 14);
    // 03-09, (gap 2d: 10,11), 03-12, (gap 2d: 13,14), 03-15
    // gaps: [2, 2], median = 2 → elastic (upper boundary)
    const habits = [{
      name: "운동",
      checkHistory: ["2026-03-09", "2026-03-12", "2026-03-15"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      breakCount: 2,
      medianGapDays: 2,
      maxGapDays: 2,
      grade: "elastic",
    });
  });

  // ── Grade: moderate (median gap 3–5) ──────────────────────────────

  test("shouldGradeModerateWhenMedianGapIsFourPointFive", () => {
    const window = buildWindow("2026-03-22", 30); // 02-21 ~ 03-22
    // 02-21, (gap 4d: Feb 22-25), 02-26, (gap 5d: Feb 27-28, Mar 1-3), 03-04, 03-05
    // gaps: [4, 5], median = 4.5
    const habits = [{
      name: "독서",
      checkHistory: ["2026-02-21", "2026-02-26", "2026-03-04", "2026-03-05"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0].breakCount).toBe(2);
    expect(result!.habits[0].medianGapDays).toBeCloseTo(4.5, 1);
    expect(result!.habits[0].maxGapDays).toBe(5);
    expect(result!.habits[0].grade).toBe("moderate");
  });

  test("shouldGradeModerateWhenMedianGapIsExactlyThree", () => {
    const window = buildWindow("2026-03-22", 14);
    // 03-09, (gap 3d), 03-13, (gap 3d), 03-17, 03-18
    // gaps: [3, 3], median = 3
    const habits = [{
      name: "독서",
      checkHistory: ["2026-03-09", "2026-03-13", "2026-03-17", "2026-03-18"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      breakCount: 2,
      medianGapDays: 3,
      maxGapDays: 3,
      grade: "moderate",
    });
  });

  // ── Grade: slow (median gap 6–13) ─────────────────────────────────

  test("shouldGradeSlowWhenMedianGapIsEight", () => {
    const window = buildWindow("2026-03-22", 30); // 02-21 ~ 03-22
    // 02-21, (gap 8d: 22-28, 01), 03-02, (gap 8d: 03-10), 03-11
    // gaps: [8, 8], median = 8
    const habits = [{
      name: "명상",
      checkHistory: ["2026-02-21", "2026-03-02", "2026-03-11"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      name: "명상",
      breakCount: 2,
      medianGapDays: 8,
      maxGapDays: 8,
      grade: "slow",
    });
  });

  test("shouldGradeSlowWhenMedianGapIsSixBoundary", () => {
    const window = buildWindow("2026-03-22", 30);
    // Single gap of exactly 6 → median = 6 → slow
    const habits = [{
      name: "명상",
      checkHistory: ["2026-03-09", "2026-03-16"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      breakCount: 1,
      medianGapDays: 6,
      maxGapDays: 6,
      grade: "slow",
    });
  });

  test("shouldGradeSlowWhenMedianGapIsExactlyThirteen", () => {
    const window = buildWindow("2026-03-22", 30);
    // 02-21, (gap 13d), 03-07
    // Feb 21 → Mar 7: dayDiff = 14, gap = 13 → slow (upper boundary)
    const habits = [{
      name: "명상",
      checkHistory: ["2026-02-21", "2026-03-07"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      breakCount: 1,
      medianGapDays: 13,
      maxGapDays: 13,
      grade: "slow",
    });
  });

  // ── Grade: fragile (median gap ≥ 14) ──────────────────────────────

  test("shouldGradeFragileWhenMedianGapIsFifteen", () => {
    const window = buildWindow("2026-03-22", 30); // 02-21 ~ 03-22
    // 02-21, (gap 15d: 22-28 + 01-08), 03-09, 03-10
    // gap: [15], median = 15
    const habits = [{
      name: "일기",
      checkHistory: ["2026-02-21", "2026-03-09", "2026-03-10"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      name: "일기",
      breakCount: 1,
      medianGapDays: 15,
      maxGapDays: 15,
      grade: "fragile",
    });
  });

  test("shouldGradeFragileWhenMedianGapIsExactlyFourteen", () => {
    const window = buildWindow("2026-03-22", 30);
    // 02-21, (gap 14d), 03-08, 03-09
    // Feb 21 → Mar 8: 7 remaining Feb days + 7 March days = 14 gap days
    // dayDiff = 15, gap = 14
    const habits = [{
      name: "일기",
      checkHistory: ["2026-02-21", "2026-03-08", "2026-03-09"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      breakCount: 1,
      medianGapDays: 14,
      grade: "fragile",
    });
  });

  // ── Multiple habits ───────────────────────────────────────────────

  test("shouldReturnProfilePerHabitInInputOrder", () => {
    const window = buildWindow("2026-03-22", 14); // 03-09 ~ 03-22

    const habits = [
      { name: "운동", checkHistory: [...window] }, // elastic (no breaks)
      { name: "독서", checkHistory: ["2026-03-09", "2026-03-22"] }, // slow (gap 12)
    ];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits).toHaveLength(2);
    expect(result!.habits[0].name).toBe("운동");
    expect(result!.habits[0].grade).toBe("elastic");
    expect(result!.habits[1].name).toBe("독서");
    expect(result!.habits[1].grade).toBe("slow");
  });

  test("shouldSummarizeGradeCountsWithEmoji", () => {
    const window = buildWindow("2026-03-22", 14);

    const habits = [
      { name: "A", checkHistory: [...window] }, // elastic
      { name: "B", checkHistory: [...window] }, // elastic
      { name: "C", checkHistory: ["2026-03-09", "2026-03-22"] }, // slow (gap 12)
    ];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.summary).toBe("🧬2 · 🐌1");
  });

  test("shouldShowSingleGradeInSummary", () => {
    const window = buildWindow("2026-03-22", 14);

    const habits = [
      { name: "A", checkHistory: [...window] },
      { name: "B", checkHistory: [...window] },
    ];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.summary).toBe("🧬2");
  });

  // ── Edge cases ────────────────────────────────────────────────────

  test("shouldIgnoreDatesOutsideWindow", () => {
    const window = buildWindow("2026-03-22", 7); // 03-16 ~ 03-22

    const habits = [{
      name: "운동",
      checkHistory: ["2026-03-01", "2026-03-05", "2026-03-16", "2026-03-17", "2026-03-18"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    // Only 03-16, 03-17, 03-18 in window → consecutive, no breaks
    expect(result!.habits[0]).toMatchObject({
      breakCount: 0,
      grade: "elastic",
    });
  });

  test("shouldDeduplicateDatesInHistory", () => {
    const window = buildWindow("2026-03-22", 14);

    const habits = [{
      name: "운동",
      checkHistory: ["2026-03-09", "2026-03-09", "2026-03-10", "2026-03-10", "2026-03-22"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    // After dedup: 03-09, 03-10, 03-22 → 1 break, gap = 11 → slow
    expect(result!.habits[0]).toMatchObject({
      breakCount: 1,
      maxGapDays: 11,
      grade: "slow",
    });
  });

  test("shouldExcludeHabitsWithInsufficientChecksFromResult", () => {
    const window = buildWindow("2026-03-22", 14);

    const habits = [
      { name: "운동", checkHistory: [...window] },
      { name: "독서", checkHistory: ["2026-03-20"] }, // only 1 check
    ];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits).toHaveLength(1);
    expect(result!.habits[0].name).toBe("운동");
  });

  test("shouldExcludeHabitsWithUndefinedCheckHistory", () => {
    const window = buildWindow("2026-03-22", 14);

    const habits = [
      { name: "운동", checkHistory: [...window] },
      { name: "독서" }, // undefined checkHistory
    ];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits).toHaveLength(1);
    expect(result!.habits[0].name).toBe("운동");
  });

  test("shouldExcludeHabitsWithEmptyCheckHistory", () => {
    const window = buildWindow("2026-03-22", 14);

    const habits = [
      { name: "운동", checkHistory: [...window] },
      { name: "독서", checkHistory: [] },
    ];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits).toHaveLength(1);
  });

  test("shouldHandleUnsortedCheckHistory", () => {
    const window = buildWindow("2026-03-22", 14);

    // Dates in reverse order — should still produce correct results
    const habits = [{
      name: "운동",
      checkHistory: ["2026-03-18", "2026-03-09", "2026-03-14", "2026-03-11"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    // Sorted: 03-09, 03-11, 03-14, 03-18 → gaps [1, 2, 3]
    // median([1, 2, 3]) = 2 → elastic
    expect(result!.habits[0]).toMatchObject({
      breakCount: 3,
      medianGapDays: 2,
      maxGapDays: 3,
      grade: "elastic",
    });
  });

  // ── Grade boundary: moderate upper (median gap = 5) ───────────────

  test("shouldGradeModerateWhenMedianGapIsExactlyFive", () => {
    const window = buildWindow("2026-03-22", 30);
    // 03-01, (skip 03-02~03-06, 5 days), 03-07, 03-08
    // dayDiff(03-01, 03-07) = 6, gap = 5 → moderate upper boundary (≤5)
    const habits = [{
      name: "독서",
      checkHistory: ["2026-03-01", "2026-03-07", "2026-03-08"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result!.habits[0]).toMatchObject({
      breakCount: 1,
      medianGapDays: 5,
      maxGapDays: 5,
      grade: "moderate",
    });
  });

  // ── Summary: all four grades present ─────────────────────────────

  test("shouldSummarizeAllFourGrades", () => {
    const window = buildWindow("2026-03-22", 90); // 2025-12-23 ~ 2026-03-22
    const habits = [
      // elastic: consecutive days, no breaks
      { name: "elastic", checkHistory: ["2026-03-20", "2026-03-21", "2026-03-22"] },
      // moderate: gaps=[4,4], median=4
      { name: "moderate", checkHistory: ["2026-03-01", "2026-03-06", "2026-03-11"] },
      // slow: gaps=[8,8], median=8
      { name: "slow", checkHistory: ["2026-02-01", "2026-02-10", "2026-02-19"] },
      // fragile: gaps=[15], median=15
      { name: "fragile", checkHistory: ["2026-01-01", "2026-01-17", "2026-01-18"] },
    ];
    const result = calcHabitResilience({ habits, dayWindow: window });

    expect(result).not.toBeNull();
    expect(result!.habits).toHaveLength(4);
    expect(result!.summary).toBe("🧬1 · ⏳1 · 🐌1 · 💔1");
  });

  // ── maxGapDays tracked independently of median grade ─────────────

  test("shouldTrackLargeMaxGapDaysWhenMedianGapIsSmall", () => {
    const window = buildWindow("2026-03-22", 60); // 2026-01-22 ~ 2026-03-22
    // 5 gaps: [1, 1, 1, 1, 14] — median of odd-length array = sorted[mid] = 1 (elastic)
    // maxGapDays = 14 despite elastic grade
    const habits = [{
      name: "운동",
      checkHistory: [
        "2026-02-01", "2026-02-03", "2026-02-05", "2026-02-07", "2026-02-09",
        "2026-02-24", // dayDiff(02-09, 02-24)=15 → gap=14
      ],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    // sorted gaps=[1,1,1,1,14], n=5 odd, mid=2 → sorted[2]=1
    expect(result!.habits[0]).toMatchObject({
      breakCount: 5,
      medianGapDays: 1,
      maxGapDays: 14,
      grade: "elastic",
    });
  });

  // ── February boundary (non-leap year) ────────────────────────────

  test("shouldHandleNonLeapYearFebruaryBoundary", () => {
    const window = buildWindow("2026-03-22", 30); // 2026-02-21 ~ 2026-03-22
    // 2026 is not a leap year: Feb has 28 days
    // Feb 28 → Mar 1: dayDiff=1, gap=0 (consecutive — no break)
    // Mar 1 → Mar 8: dayDiff=7, gap=6 → slow lower boundary
    const habits = [{
      name: "운동",
      checkHistory: ["2026-02-28", "2026-03-01", "2026-03-08"],
    }];
    const result = calcHabitResilience({ habits, dayWindow: window });

    // Only 1 break (Feb 28→Mar 1 is consecutive, not a break)
    expect(result!.habits[0]).toMatchObject({
      breakCount: 1,
      medianGapDays: 6,
      maxGapDays: 6,
      grade: "slow",
    });
  });
});
