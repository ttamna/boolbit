// ABOUTME: Tests for calcIntentionStreak and calcIntentionWeek pure helpers
// ABOUTME: Covers streak gap-detection, 7-day heatmap data, set/done state, and edge cases

import { describe, it, expect } from "vitest";
import { calcIntentionStreak, calcIntentionWeek } from "./intention";
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

// ─── calcIntentionWeek ────────────────────────────────────────────────────────

// 7 YYYY-MM-DD strings, oldest→newest, anchored to TODAY (2026-03-15)
const LAST_7 = [
  "2026-03-09", "2026-03-10", "2026-03-11",
  "2026-03-12", "2026-03-13", "2026-03-14",
  TODAY,
];

describe("calcIntentionWeek", () => {
  it("should return all-false days when no intention and no history", () => {
    const { days, setCount, doneCount } = calcIntentionWeek(LAST_7, TODAY, undefined, undefined, []);
    expect(days).toHaveLength(7);
    expect(days.every(d => !d.set && !d.done)).toBe(true);
    expect(setCount).toBe(0);
    expect(doneCount).toBe(0);
  });

  it("should return days in same order as last7Days (oldest→newest)", () => {
    const { days } = calcIntentionWeek(LAST_7, TODAY, undefined, undefined, []);
    expect(days.map(d => d.date)).toEqual(LAST_7);
  });

  it("should mark today as set when todayIntention is non-empty", () => {
    const { days, setCount } = calcIntentionWeek(LAST_7, TODAY, "집중", undefined, []);
    expect(days[6]).toEqual({ date: TODAY, set: true, done: false });
    expect(setCount).toBe(1);
  });

  it("should mark today as set+done when todayIntention is set and todayIntentionDone is true", () => {
    const { days, setCount, doneCount } = calcIntentionWeek(LAST_7, TODAY, "집중", true, []);
    expect(days[6]).toEqual({ date: TODAY, set: true, done: true });
    expect(setCount).toBe(1);
    expect(doneCount).toBe(1);
  });

  it("should treat empty todayIntention as not-set", () => {
    const { days, setCount } = calcIntentionWeek(LAST_7, TODAY, "", undefined, []);
    expect(days[6].set).toBe(false);
    expect(setCount).toBe(0);
  });

  it("should mark past day as set when history entry exists without done", () => {
    const history: IntentionEntry[] = [{ date: "2026-03-14", text: "어제의도" }];
    const { days, setCount, doneCount } = calcIntentionWeek(LAST_7, TODAY, undefined, undefined, history);
    expect(days[5]).toEqual({ date: "2026-03-14", set: true, done: false });
    expect(setCount).toBe(1);
    expect(doneCount).toBe(0);
  });

  it("should mark past day as set+done when history entry has done:true", () => {
    const history: IntentionEntry[] = [{ date: "2026-03-14", text: "어제의도", done: true }];
    const { days, setCount, doneCount } = calcIntentionWeek(LAST_7, TODAY, undefined, undefined, history);
    expect(days[5]).toEqual({ date: "2026-03-14", set: true, done: true });
    expect(setCount).toBe(1);
    expect(doneCount).toBe(1);
  });

  it("should leave past day as not-set when history has no entry for that date", () => {
    const history: IntentionEntry[] = [{ date: "2026-03-13", text: "이틀전" }];
    const { days } = calcIntentionWeek(LAST_7, TODAY, undefined, undefined, history);
    // 2026-03-14 (days[5]) has no entry
    expect(days[5]).toEqual({ date: "2026-03-14", set: false, done: false });
  });

  it("should correctly aggregate setCount and doneCount across mixed days", () => {
    // today: set+done; yesterday: set-not-done; 2daysAgo: set+done; rest: absent
    const history: IntentionEntry[] = [
      { date: "2026-03-14", text: "어제" },
      { date: "2026-03-13", text: "이틀전", done: true },
    ];
    const { setCount, doneCount } = calcIntentionWeek(LAST_7, TODAY, "오늘", true, history);
    expect(setCount).toBe(3);
    expect(doneCount).toBe(2);
  });

  it("should use todayIntention (not history) for today even if history has a today entry", () => {
    // history has an entry for today — but the function should use todayIntention for the today slot
    const history: IntentionEntry[] = [{ date: TODAY, text: "기존의도", done: true }];
    // todayIntention is cleared (undefined) — today should show set=false despite history
    const { days } = calcIntentionWeek(LAST_7, TODAY, undefined, undefined, history);
    expect(days[6]).toEqual({ date: TODAY, set: false, done: false });
  });

  it("should handle todayIntentionDone:false as done=false (explicit false same as absent)", () => {
    const { days } = calcIntentionWeek(LAST_7, TODAY, "집중", false, []);
    expect(days[6].done).toBe(false);
  });

  it("should return setCount=0 and doneCount=0 when last7Days is empty", () => {
    const { days, setCount, doneCount } = calcIntentionWeek([], TODAY, "집중", true, []);
    expect(days).toHaveLength(0);
    expect(setCount).toBe(0);
    expect(doneCount).toBe(0);
  });

  it("should handle a single-day window where today is the only entry", () => {
    const { days, setCount } = calcIntentionWeek([TODAY], TODAY, "단독", undefined, []);
    expect(days).toHaveLength(1);
    expect(days[0]).toEqual({ date: TODAY, set: true, done: false });
    expect(setCount).toBe(1);
  });
});
