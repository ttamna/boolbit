// ABOUTME: Tests for calcIntentionStreak — consecutive days the user has set an intention
// ABOUTME: Verifies gap-detection, today-only, full-7-day, and edge cases

import { describe, it, expect } from "vitest";
import { calcIntentionStreak } from "./intention";
import type { IntentionEntry } from "../types";

function makeHistory(dates: string[], done = false): IntentionEntry[] {
  return dates.map(date => ({ date, text: "test", done }));
}

const TODAY = "2026-03-15";

describe("calcIntentionStreak", () => {
  it("should return 0 when todayIntention is undefined", () => {
    expect(calcIntentionStreak(undefined, TODAY, [])).toBe(0);
  });

  it("should return 0 when todayIntention is empty string", () => {
    expect(calcIntentionStreak("", TODAY, [])).toBe(0);
  });

  it("should return 1 when intention is set today but history is empty", () => {
    expect(calcIntentionStreak("오늘의 의도", TODAY, [])).toBe(1);
  });

  it("should return 2 when today + yesterday in history", () => {
    // yesterday = 2026-03-14
    const history = makeHistory(["2026-03-14"]);
    expect(calcIntentionStreak("의도", TODAY, history)).toBe(2);
  });

  it("should return 3 when today + last 2 days in history (no gap)", () => {
    const history = makeHistory(["2026-03-13", "2026-03-14"]);
    expect(calcIntentionStreak("의도", TODAY, history)).toBe(3);
  });

  it("should return 1 when only day-2 in history (gap at day-1 breaks streak)", () => {
    // day-1 (2026-03-14) missing → streak stops at 1
    const history = makeHistory(["2026-03-13"]);
    expect(calcIntentionStreak("의도", TODAY, history)).toBe(1);
  });

  it("should return 2 when today + yesterday despite non-consecutive extra history", () => {
    // day-1 present, day-2 missing → stops after counting day-1
    const history = makeHistory(["2026-03-14", "2026-03-10"]);
    expect(calcIntentionStreak("의도", TODAY, history)).toBe(2);
  });

  it("should return 7 when today + 6 consecutive days in history", () => {
    const history = makeHistory([
      "2026-03-09", "2026-03-10", "2026-03-11",
      "2026-03-12", "2026-03-13", "2026-03-14",
    ]);
    expect(calcIntentionStreak("의도", TODAY, history)).toBe(7);
  });

  it("should return 7 and not exceed it even when 7 prior history days are present (loop checks back 1..6 only)", () => {
    // The loop runs back=1..6, so today-7 ("2026-03-08") is never examined.
    // Having it in history does not push the result above 7 (today + 6 consecutive days).
    const history = makeHistory([
      "2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11",
      "2026-03-12", "2026-03-13", "2026-03-14",
    ]);
    expect(calcIntentionStreak("의도", TODAY, history)).toBe(7);
  });

  it("should handle unordered history correctly", () => {
    // History out of order — should still find the days
    const history = makeHistory(["2026-03-14", "2026-03-13"]).reverse();
    expect(calcIntentionStreak("의도", TODAY, history)).toBe(3);
  });

  it("should return 1 when history exists for past days but todayIntention is absent", () => {
    const history = makeHistory(["2026-03-14", "2026-03-13"]);
    expect(calcIntentionStreak(undefined, TODAY, history)).toBe(0);
  });

  it("should handle month boundary correctly (March 1 → Feb 28/29)", () => {
    // today = 2026-03-01, yesterday = 2026-02-28
    const history = makeHistory(["2026-02-28"]);
    expect(calcIntentionStreak("의도", "2026-03-01", history)).toBe(2);
  });
});
