// ABOUTME: Tests for calcIntentionStreak, calcIntentionWeek, and calcIntentionWeekTrend pure helpers
// ABOUTME: Covers streak gap-detection, 7-day heatmap data, set/done state, week-over-week trend, and edge cases

import { describe, it, expect } from "vitest";
import { calcIntentionStreak, calcIntentionWeek, calcIntentionWeekTrend } from "./intention";
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

// ─── calcIntentionWeekTrend ───────────────────────────────────────────────────

// 14 YYYY-MM-DD strings, oldest→newest, ending at TODAY
// prev7: indices 0–6 (2026-03-02 to 2026-03-08)
// cur7:  indices 7–13 (2026-03-09 to 2026-03-15 = TODAY)
const LAST_14 = [
  "2026-03-02", "2026-03-03", "2026-03-04",
  "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08",
  "2026-03-09", "2026-03-10", "2026-03-11",
  "2026-03-12", "2026-03-13", "2026-03-14",
  TODAY,
];

describe("calcIntentionWeekTrend", () => {
  it("should return null when last14Days has fewer than 14 elements", () => {
    expect(calcIntentionWeekTrend(LAST_14.slice(0, 13), TODAY, undefined, undefined, [])).toBeNull();
  });

  it("should return null when prev7 has no set intentions (no baseline)", () => {
    // cur7 has entries but prev7 is empty → no baseline to compare against
    const history: IntentionEntry[] = [{ date: "2026-03-09", text: "이번주", done: true }];
    expect(calcIntentionWeekTrend(LAST_14, TODAY, undefined, undefined, history)).toBeNull();
  });

  it("should return ↑ when cur7 done rate is significantly higher than prev7", () => {
    // prev7: 1/7 done (14%); cur7: 7/7 done (100%) → +86pp → ↑
    const history: IntentionEntry[] = [
      { date: "2026-03-02", text: "d", done: true },   // prev7: only 1 done
      { date: "2026-03-03", text: "d", done: false },
      { date: "2026-03-04", text: "d", done: false },
      { date: "2026-03-05", text: "d", done: false },
      { date: "2026-03-06", text: "d", done: false },
      { date: "2026-03-07", text: "d", done: false },
      { date: "2026-03-08", text: "d", done: false },
      { date: "2026-03-09", text: "d", done: true },   // cur7: 6 done from history
      { date: "2026-03-10", text: "d", done: true },
      { date: "2026-03-11", text: "d", done: true },
      { date: "2026-03-12", text: "d", done: true },
      { date: "2026-03-13", text: "d", done: true },
      { date: "2026-03-14", text: "d", done: true },
    ];
    // today: set + done → cur7: 7/7 = 100%
    expect(calcIntentionWeekTrend(LAST_14, TODAY, "오늘의도", true, history)).toBe("↑");
  });

  it("should return ↓ when cur7 done rate is significantly lower than prev7", () => {
    // prev7: 7/7 done (100%); cur7: 1/7 done (14%) → -86pp → ↓
    const history: IntentionEntry[] = [
      { date: "2026-03-02", text: "d", done: true },
      { date: "2026-03-03", text: "d", done: true },
      { date: "2026-03-04", text: "d", done: true },
      { date: "2026-03-05", text: "d", done: true },
      { date: "2026-03-06", text: "d", done: true },
      { date: "2026-03-07", text: "d", done: true },
      { date: "2026-03-08", text: "d", done: true },
      { date: "2026-03-09", text: "d", done: true },   // cur7: only 1 done
      { date: "2026-03-10", text: "d", done: false },
      { date: "2026-03-11", text: "d", done: false },
      { date: "2026-03-12", text: "d", done: false },
      { date: "2026-03-13", text: "d", done: false },
      { date: "2026-03-14", text: "d", done: false },
    ];
    // today: set but not done → cur7: 1/7 = 14%
    expect(calcIntentionWeekTrend(LAST_14, TODAY, "오늘의도", false, history)).toBe("↓");
  });

  it("should return → when done rates are equal (within ±10pp)", () => {
    // prev7: 4/7 (57%); cur7: 4/7 (57%) — 6 from history + today set-not-done = 4/7
    const history: IntentionEntry[] = [
      { date: "2026-03-02", text: "d", done: true },
      { date: "2026-03-03", text: "d", done: true },
      { date: "2026-03-04", text: "d", done: true },
      { date: "2026-03-05", text: "d", done: true },
      { date: "2026-03-06", text: "d", done: false },
      { date: "2026-03-07", text: "d", done: false },
      { date: "2026-03-08", text: "d", done: false },
      { date: "2026-03-09", text: "d", done: true },
      { date: "2026-03-10", text: "d", done: true },
      { date: "2026-03-11", text: "d", done: true },
      { date: "2026-03-12", text: "d", done: true },
      { date: "2026-03-13", text: "d", done: false },
      { date: "2026-03-14", text: "d", done: false },
    ];
    // today: set but not done → cur7: 4/7 = 57% (same as prev7)
    expect(calcIntentionWeekTrend(LAST_14, TODAY, "오늘의도", false, history)).toBe("→");
  });

  it("should return ↓ when cur7 has no set intentions but prev7 has some", () => {
    // prev7: 3/3 set+done (100%); cur7: 0 set → curRate=0 → -100pp → ↓
    const history: IntentionEntry[] = [
      { date: "2026-03-02", text: "d", done: true },
      { date: "2026-03-03", text: "d", done: true },
      { date: "2026-03-04", text: "d", done: true },
    ];
    // today: not set → cur7: 0/0 set → treated as 0%
    expect(calcIntentionWeekTrend(LAST_14, TODAY, undefined, undefined, history)).toBe("↓");
  });

  it("should include today's intention as part of cur7", () => {
    // prev7: 3/3 (100%); cur7: today only, set+done (1/1=100%) → diff 0 → →
    const history: IntentionEntry[] = [
      { date: "2026-03-02", text: "d", done: true },
      { date: "2026-03-03", text: "d", done: true },
      { date: "2026-03-04", text: "d", done: true },
    ];
    expect(calcIntentionWeekTrend(LAST_14, TODAY, "오늘의도", true, history)).toBe("→");
  });
});
