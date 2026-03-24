// ABOUTME: Unit tests for calcWeekdayProfile — cross-domain weekday productivity analysis
// ABOUTME: Covers empty data, single/multi domain, pomodoro normalization, best/worst day, tiebreaking

import { describe, it, expect } from "vitest";
import { calcWeekdayProfile, type WeekdayProfileParams } from "./weekProfile";

// All-null per-domain record (no data for any weekday)
const NULL_RECORD: Record<number, number | null> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };

function makeParams(overrides: Partial<WeekdayProfileParams> = {}): WeekdayProfileParams {
  return {
    habitRates: { ...NULL_RECORD },
    pomodoroAvgs: { ...NULL_RECORD },
    intentionRates: { ...NULL_RECORD },
    momentumAvgs: { ...NULL_RECORD },
    ...overrides,
  };
}

describe("calcWeekdayProfile", () => {
  // ── Empty / all-null data ───────────────────────────────────────────────────

  it("should return all-null composites when no domain has data", () => {
    const result = calcWeekdayProfile(makeParams());
    for (let dow = 0; dow <= 6; dow++) {
      expect(result.days[dow].composite).toBeNull();
      expect(result.days[dow].habitRate).toBeNull();
      expect(result.days[dow].pomodoroAvg).toBeNull();
      expect(result.days[dow].intentionRate).toBeNull();
      expect(result.days[dow].momentumAvg).toBeNull();
    }
    expect(result.bestDay).toBeNull();
    expect(result.worstDay).toBeNull();
  });

  // ── Single domain ──────────────────────────────────────────────────────────

  it("should compute composite from habits alone when only habits have data", () => {
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 1: 80, 3: 60 },
    }));
    expect(result.days[1].composite).toBe(80);
    expect(result.days[3].composite).toBe(60);
    expect(result.days[0].composite).toBeNull();
    expect(result.bestDay).toBe(1);
    expect(result.worstDay).toBe(3);
  });

  it("should compute composite from momentum alone", () => {
    const result = calcWeekdayProfile(makeParams({
      momentumAvgs: { ...NULL_RECORD, 5: 72, 6: 45 },
    }));
    expect(result.days[5].composite).toBe(72);
    expect(result.days[6].composite).toBe(45);
    expect(result.bestDay).toBe(5);
    expect(result.worstDay).toBe(6);
  });

  // ── Pomodoro normalization ─────────────────────────────────────────────────

  it("should normalize pomodoro avg using provided goal for composite", () => {
    // goal=4, avg=2 → normalized=50; avg=4 → normalized=100; avg=6 → capped at 100
    const result = calcWeekdayProfile(makeParams({
      pomodoroAvgs: { ...NULL_RECORD, 1: 2, 2: 4, 3: 6 },
      pomodoroGoal: 4,
    }));
    expect(result.days[1].composite).toBe(50);
    expect(result.days[2].composite).toBe(100);
    expect(result.days[3].composite).toBe(100); // capped
  });

  it("should use default goal of 3 when pomodoroGoal is absent", () => {
    // default goal=3, avg=1.5 → normalized=50
    const result = calcWeekdayProfile(makeParams({
      pomodoroAvgs: { ...NULL_RECORD, 4: 1.5 },
    }));
    expect(result.days[4].composite).toBe(50);
  });

  it("should use default goal of 3 when pomodoroGoal is 0", () => {
    const result = calcWeekdayProfile(makeParams({
      pomodoroAvgs: { ...NULL_RECORD, 4: 3 },
      pomodoroGoal: 0,
    }));
    expect(result.days[4].composite).toBe(100);
  });

  it("should use default goal of 3 when pomodoroGoal is null at runtime", () => {
    // TypeScript disallows null for optional number, but runtime WidgetData may deliver null
    // when the field was never persisted. The guard uses != null (loose) to catch both.
    const result = calcWeekdayProfile(makeParams({
      pomodoroAvgs: { ...NULL_RECORD, 4: 3 },
      pomodoroGoal: null as unknown as number,
    }));
    expect(result.days[4].composite).toBe(100); // 3/3 = 100%
  });

  it("should preserve raw pomodoroAvg in the slot (not normalized)", () => {
    const result = calcWeekdayProfile(makeParams({
      pomodoroAvgs: { ...NULL_RECORD, 2: 3.5 },
      pomodoroGoal: 4,
    }));
    expect(result.days[2].pomodoroAvg).toBe(3.5);
    // composite uses normalized value: min(3.5/4, 1) * 100 = 87.5 → round = 88
    expect(result.days[2].composite).toBe(88);
  });

  // ── Multi-domain composite ─────────────────────────────────────────────────

  it("should average all available domains for composite", () => {
    // Monday: habits=80, pomodoro=2(goal4→50%), intention=60, momentum=70
    // composite = round((80 + 50 + 60 + 70) / 4) = round(65) = 65
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 1: 80 },
      pomodoroAvgs: { ...NULL_RECORD, 1: 2 },
      intentionRates: { ...NULL_RECORD, 1: 60 },
      momentumAvgs: { ...NULL_RECORD, 1: 70 },
      pomodoroGoal: 4,
    }));
    expect(result.days[1].composite).toBe(65);
  });

  it("should skip null domains when computing composite average", () => {
    // Tuesday: habits=90, pomodoro=null, intention=70, momentum=null
    // composite = round((90 + 70) / 2) = 80
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 2: 90 },
      intentionRates: { ...NULL_RECORD, 2: 70 },
    }));
    expect(result.days[2].composite).toBe(80);
  });

  // ── Best / worst day ───────────────────────────────────────────────────────

  it("should identify best and worst days across the week", () => {
    const result = calcWeekdayProfile(makeParams({
      habitRates: { 0: 50, 1: 90, 2: 70, 3: 85, 4: 60, 5: 95, 6: 40 },
    }));
    expect(result.bestDay).toBe(5); // Friday 95
    expect(result.worstDay).toBe(6); // Saturday 40
  });

  it("should break ties for bestDay by preferring lower weekday number", () => {
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 1: 80, 4: 80, 2: 50 },
    }));
    expect(result.bestDay).toBe(1); // Monday and Thursday tie at 80 → Monday wins
  });

  it("should break ties for worstDay by preferring lower weekday number", () => {
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 3: 40, 5: 40, 6: 80 },
    }));
    expect(result.worstDay).toBe(3); // Wednesday and Friday tie at 40 → Wednesday wins
  });

  it("should break bestDay tie when lower weekday appears later in iteration", () => {
    // Days 5 and 2 tie at 90; iteration encounters 2 before 5 → 2 wins.
    // Proves strict > (not >=) is used — a regression to >= would pick 5.
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 5: 90, 2: 90, 0: 40 },
    }));
    expect(result.bestDay).toBe(2);
  });

  it("should break worstDay tie when lower weekday appears later in iteration", () => {
    // Days 6 and 1 tie at 30; iteration encounters 1 before 6 → 1 wins.
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 6: 30, 1: 30, 4: 80 },
    }));
    expect(result.worstDay).toBe(1);
  });

  it("should return same day for bestDay and worstDay when only one weekday has data", () => {
    const result = calcWeekdayProfile(makeParams({
      momentumAvgs: { ...NULL_RECORD, 2: 55 },
    }));
    expect(result.bestDay).toBe(2);
    expect(result.worstDay).toBe(2);
  });

  // ── Return shape ───────────────────────────────────────────────────────────

  it("should return all 7 weekday slots (0-6)", () => {
    const result = calcWeekdayProfile(makeParams());
    const keys = Object.keys(result.days).map(Number).sort((a, b) => a - b);
    expect(keys).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("should pass through raw domain values unchanged", () => {
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 3: 77 },
      pomodoroAvgs: { ...NULL_RECORD, 3: 2.3 },
      intentionRates: { ...NULL_RECORD, 3: 88 },
      momentumAvgs: { ...NULL_RECORD, 3: 61 },
    }));
    expect(result.days[3].habitRate).toBe(77);
    expect(result.days[3].pomodoroAvg).toBe(2.3);
    expect(result.days[3].intentionRate).toBe(88);
    expect(result.days[3].momentumAvg).toBe(61);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it("should handle pomodoro avg of 0 correctly", () => {
    // avg=0, goal=4 → normalized=0
    const result = calcWeekdayProfile(makeParams({
      pomodoroAvgs: { ...NULL_RECORD, 0: 0 },
      pomodoroGoal: 4,
    }));
    // pomodoroAvg is 0 (not null), so it contributes to composite
    expect(result.days[0].pomodoroAvg).toBe(0);
    expect(result.days[0].composite).toBe(0);
  });

  it("should handle all domains at 100 for maximum composite", () => {
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 1: 100 },
      pomodoroAvgs: { ...NULL_RECORD, 1: 4 },
      intentionRates: { ...NULL_RECORD, 1: 100 },
      momentumAvgs: { ...NULL_RECORD, 1: 100 },
      pomodoroGoal: 4,
    }));
    expect(result.days[1].composite).toBe(100);
  });

  it("should handle mixed weekdays with different domain coverage", () => {
    // Monday: all 4 domains; Tuesday: only habits; Wednesday: habits + momentum
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 1: 80, 2: 60, 3: 70 },
      pomodoroAvgs: { ...NULL_RECORD, 1: 3 },
      intentionRates: { ...NULL_RECORD, 1: 90 },
      momentumAvgs: { ...NULL_RECORD, 1: 75, 3: 55 },
      pomodoroGoal: 3,
    }));
    // Monday: round((80 + 100 + 90 + 75) / 4) = round(86.25) = 86
    expect(result.days[1].composite).toBe(86);
    // Tuesday: only habits = 60
    expect(result.days[2].composite).toBe(60);
    // Wednesday: round((70 + 55) / 2) = round(62.5) = 63
    expect(result.days[3].composite).toBe(63);
  });

  it("should treat habitRate 0 as data-present contributing 0 to composite", () => {
    // 0 is not null — it means "worst possible performance", not "no data"
    // The guard `if (habit !== null)` must include 0 in the composite average
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 2: 0 },
    }));
    expect(result.days[2].habitRate).toBe(0);
    expect(result.days[2].composite).toBe(0);
  });

  it("should return bestDay 0 and worstDay 0 when all seven days share identical composite", () => {
    // Seven-way tie: strict > / < comparisons keep the first (lowest) weekday for both
    const result = calcWeekdayProfile(makeParams({
      habitRates: { 0: 70, 1: 70, 2: 70, 3: 70, 4: 70, 5: 70, 6: 70 },
    }));
    expect(result.bestDay).toBe(0);
    expect(result.worstDay).toBe(0);
  });

  it("should round composite to nearest integer at 0.5 boundary (Math.round half-away-from-zero)", () => {
    // habitRate=0 and intentionRate=1 → avg=(0+1)/2=0.5 → Math.round(0.5)=1, not 0
    const result = calcWeekdayProfile(makeParams({
      habitRates: { ...NULL_RECORD, 4: 0 },
      intentionRates: { ...NULL_RECORD, 4: 1 },
    }));
    expect(result.days[4].composite).toBe(1);
  });

  it("should handle sparse record with missing weekday keys treating absent keys as null", () => {
    // Code comment: "sparse records are valid TS input" — absent keys yield undefined,
    // which the `?? null` guard converts to null (no data for those weekdays)
    const result = calcWeekdayProfile(makeParams({
      habitRates: { 1: 80, 4: 60 } as Record<number, number | null>,
    }));
    expect(result.days[0].composite).toBeNull();
    expect(result.days[1].composite).toBe(80);
    expect(result.days[2].composite).toBeNull();
    expect(result.days[3].composite).toBeNull();
    expect(result.days[4].composite).toBe(60);
    expect(result.days[5].composite).toBeNull();
    expect(result.days[6].composite).toBeNull();
    expect(result.bestDay).toBe(1);
    expect(result.worstDay).toBe(4);
  });
});
