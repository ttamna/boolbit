// ABOUTME: Unit tests for calcHabitSynergy — keystone habit detection via conditional completion lift
// ABOUTME: Covers edge cases (empty/single habits, insufficient data), lift ranking, summary generation

import { describe, test, expect } from "vitest";
import { calcHabitSynergy } from "./habitSynergy";

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

describe("calcHabitSynergy", () => {
  // ── Null / insufficient data cases ──────────────────────────────────────

  test("shouldReturnNullWhenNoHabits", () => {
    expect(calcHabitSynergy({ habits: [], dayWindow: buildWindow("2026-03-22", 14) })).toBeNull();
  });

  test("shouldReturnNullWhenSingleHabit", () => {
    const habits = [{ name: "운동", checkHistory: ["2026-03-20", "2026-03-21"] }];
    expect(calcHabitSynergy({ habits, dayWindow: buildWindow("2026-03-22", 14) })).toBeNull();
  });

  test("shouldReturnNullWhenDayWindowEmpty", () => {
    const habits = [
      { name: "운동", checkHistory: ["2026-03-20"] },
      { name: "독서", checkHistory: ["2026-03-20"] },
    ];
    expect(calcHabitSynergy({ habits, dayWindow: [] })).toBeNull();
  });

  test("shouldReturnNullWhenInsufficientActiveDays", () => {
    // Only 2 active days — below MIN_ACTIVE_DAYS threshold (7)
    const habits = [
      { name: "운동", checkHistory: ["2026-03-20", "2026-03-21"] },
      { name: "독서", checkHistory: ["2026-03-20"] },
    ];
    expect(calcHabitSynergy({ habits, dayWindow: buildWindow("2026-03-22", 14) })).toBeNull();
  });

  // ── Keystone detection ─────────────────────────────────────────────────

  test("shouldDetectKeystoneHabitWithHighestLift", () => {
    // "명상" is the keystone: when done, others are always done too.
    // When "명상" is NOT done, others rarely complete.
    const window = buildWindow("2026-03-22", 14); // 03-09 ~ 03-22

    // Days where 명상 is done → all three done (7 days)
    const meditationDays = window.slice(0, 7); // 03-09 ~ 03-15
    // Days where 명상 is NOT done → only 운동 done (7 days)
    const noMeditationDays = window.slice(7); // 03-16 ~ 03-22

    const habits = [
      { name: "명상", checkHistory: [...meditationDays] },
      { name: "운동", checkHistory: [...meditationDays, ...noMeditationDays] },
      { name: "독서", checkHistory: [...meditationDays] },
    ];

    const result = calcHabitSynergy({ habits, dayWindow: window });
    expect(result).not.toBeNull();
    expect(result!.keystone).not.toBeNull();
    expect(result!.keystone!.habitName).toBe("명상");
    // When 명상 done: 운동 100% + 독서 100% = avg 100%
    // When 명상 not done: 운동 100% + 독서 0% = avg 50%
    // Lift = 100 - 50 = 50
    expect(result!.keystone!.liftPct).toBe(50);
  });

  test("shouldReturnNullKeystoneWhenAllHabitsIndependent", () => {
    // All habits have same pattern — no one habit "lifts" others
    const window = buildWindow("2026-03-22", 14);
    const habits = [
      { name: "운동", checkHistory: [...window] },
      { name: "독서", checkHistory: [...window] },
      { name: "명상", checkHistory: [...window] },
    ];

    const result = calcHabitSynergy({ habits, dayWindow: window });
    expect(result).not.toBeNull();
    // All always done → lift is 0 for everyone (no variance)
    expect(result!.keystone).toBeNull();
  });

  // ── Lift calculation precision ─────────────────────────────────────────

  test("shouldComputeLiftCorrectlyForPartialOverlap", () => {
    const window = buildWindow("2026-03-22", 10); // 03-13 ~ 03-22

    // A done on first 8 days, B done on first 6 days, C done on all 10 days
    const habits = [
      { name: "A", checkHistory: window.slice(0, 8) },
      { name: "B", checkHistory: window.slice(0, 6) },
      { name: "C", checkHistory: [...window] },
    ];

    const result = calcHabitSynergy({ habits, dayWindow: window });
    expect(result).not.toBeNull();

    // A (done 8, not 2): avgDone=round(87.5)=88, avgNotDone=round(50)=50 → lift=38
    // B (done 6, not 4): avgDone=round(100)=100, avgNotDone=round(75)=75 → lift=25
    // C (done 10, not 0): cannot compute lift (never not-done) → skipped
    // A has highest lift → keystone
    expect(result!.keystone!.habitName).toBe("A");
    expect(result!.keystone!.liftPct).toBe(38);
    // Verify rounding consistency: liftPct === avgOthersWhenDone − avgOthersWhenNotDone
    expect(result!.keystone!.liftPct).toBe(
      result!.keystone!.avgOthersWhenDone - result!.keystone!.avgOthersWhenNotDone,
    );
  });

  // ── Summary generation ─────────────────────────────────────────────────

  test("shouldGenerateKoreanSummaryWithKeystoneHabit", () => {
    const window = buildWindow("2026-03-22", 14);
    const meditationDays = window.slice(0, 7);
    const noMeditationDays = window.slice(7);

    const habits = [
      { name: "명상", checkHistory: [...meditationDays] },
      { name: "운동", checkHistory: [...meditationDays, ...noMeditationDays] },
      { name: "독서", checkHistory: [...meditationDays] },
    ];

    const result = calcHabitSynergy({ habits, dayWindow: window });
    expect(result).not.toBeNull();
    expect(result!.summary).toContain("명상");
    expect(result!.summary).toContain("🔑");
  });

  test("shouldGenerateNeutralSummaryWhenNoKeystone", () => {
    const window = buildWindow("2026-03-22", 14);
    const habits = [
      { name: "운동", checkHistory: [...window] },
      { name: "독서", checkHistory: [...window] },
    ];

    const result = calcHabitSynergy({ habits, dayWindow: window });
    expect(result).not.toBeNull();
    expect(result!.summary).not.toContain("🔑");
  });

  // ── Edge: habits with no checkHistory ──────────────────────────────────

  test("shouldHandleHabitsWithUndefinedCheckHistory", () => {
    const window = buildWindow("2026-03-22", 14);
    const habits = [
      { name: "운동", checkHistory: [...window] },
      { name: "독서" }, // no checkHistory
    ];

    const result = calcHabitSynergy({ habits, dayWindow: window });
    // 운동: always done → no "not done" days → lift undefined → skipped
    // 독서: never done → no "done" days → lift undefined → skipped
    // Both habits lack variance → no keystone
    expect(result).not.toBeNull();
    expect(result!.keystone).toBeNull();
  });

  // ── Edge: checkHistory dates outside dayWindow are ignored ─────────────

  test("shouldIgnoreCheckHistoryOutsideWindow", () => {
    const window = buildWindow("2026-03-22", 7); // 03-16 ~ 03-22

    // All check-ins are before the window
    const habits = [
      { name: "운동", checkHistory: ["2026-03-01", "2026-03-02", "2026-03-03"] },
      { name: "독서", checkHistory: ["2026-03-01", "2026-03-02"] },
    ];

    // No active days within window → null
    expect(calcHabitSynergy({ habits, dayWindow: window })).toBeNull();
  });

  // ── Minimum lift threshold ─────────────────────────────────────────────

  test("shouldReturnNullKeystoneWhenLiftBelowThreshold", () => {
    // If all habits are nearly independent (very small lift), keystone should be null
    const window = buildWindow("2026-03-22", 10);

    // A done on days 0-4, B done on days 3-7 (small overlap)
    // C done on all days (independent)
    const habits = [
      { name: "A", checkHistory: window.slice(0, 5) },
      { name: "B", checkHistory: window.slice(3, 8) },
      { name: "C", checkHistory: [...window] },
    ];

    const result = calcHabitSynergy({ habits, dayWindow: window });
    expect(result).not.toBeNull();

    // For A (done 5, not done 5):
    //   When A done (0-4): B done on 3,4 = 2/5=40%, C done 5/5=100%. Avg=70%
    //   When A not done (5-9): B done on 5,6,7 = 3/5=60%, C done 5/5=100%. Avg=80%
    //   Lift = 70 - 80 = -10 (negative! A being done hurts B)

    // For B (done 5, not done 5):
    //   When B done (3-7): A done on 3,4 = 2/5=40%, C done 5/5=100%. Avg=70%
    //   When B not done (0-2,8-9): A done on 0,1,2 = 3/5=60%, C done 5/5=100%. Avg=80%
    //   Lift = 70 - 80 = -10

    // For C (done 10, not done 0): lift=0

    // All lifts ≤ 0 or below MIN_LIFT_PCT (10) → no keystone
    expect(result!.keystone).toBeNull();
  });
});
