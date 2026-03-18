// ABOUTME: Tests for calcIntentionStreak, calcIntentionWeek, calcIntentionWeekTrend, calcIntentionDoneNotify, calcMorningIntentionReminder, calcIntentionEveningReminder, calcIntentionDoneStreak, calcWeeklyIntentionReport, calcMonthlyIntentionReport, calcQuarterlyIntentionReport, calcYearlyIntentionReport, calcDayOfWeekIntentionDoneRate, calcWeakIntentionDay, calcBestIntentionDay, calcIntentionMonthDoneRate, and calcIntentionMomentumCorrelation helpers
// ABOUTME: Covers streak gap-detection, 7-day heatmap data, set/done state, week-over-week trend, done-notification transition, morning reminder, evening reminder, consecutive-done streak, weekly done-rate report, monthly done-rate report, quarterly done-rate report, yearly done-rate report, per-weekday intention done rate, weak/best intention day detection, current calendar month done rate, intention-completion vs momentum-score correlation, and edge cases

import { describe, it, expect } from "vitest";
import { calcIntentionStreak, calcIntentionWeek, calcIntentionWeekTrend, calcIntentionDoneNotify, calcMorningIntentionReminder, calcIntentionEveningReminder, calcIntentionDoneStreak, calcWeeklyIntentionReport, calcMonthlyIntentionReport, calcQuarterlyIntentionReport, calcYearlyIntentionReport, calcDayOfWeekIntentionDoneRate, calcWeakIntentionDay, calcBestIntentionDay, calcIntentionMonthDoneRate, calcIntentionMomentumCorrelation } from "./intention";
import type { IntentionEntry, MomentumEntry } from "../types";

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

describe("calcIntentionDoneNotify", () => {
  it("should return notification body with quoted intention when done transitions to true", () => {
    expect(calcIntentionDoneNotify(true, undefined, "운동하기")).toBe('✨ 오늘의 의도 달성! "운동하기"');
  });

  it("should return notification body with quoted intention when prevDone is false", () => {
    expect(calcIntentionDoneNotify(true, false, "독서 30분")).toBe('✨ 오늘의 의도 달성! "독서 30분"');
  });

  it("should return bare notification body when intention text is undefined", () => {
    expect(calcIntentionDoneNotify(true, undefined, undefined)).toBe("✨ 오늘의 의도 달성!");
  });

  it("should return bare notification body when intention text is empty string", () => {
    expect(calcIntentionDoneNotify(true, undefined, "")).toBe("✨ 오늘의 의도 달성!");
  });

  it("should return bare notification body when intention text is whitespace only", () => {
    expect(calcIntentionDoneNotify(true, undefined, "   ")).toBe("✨ 오늘의 의도 달성!");
  });

  it("should return null when done is false", () => {
    expect(calcIntentionDoneNotify(false, undefined, "운동하기")).toBeNull();
  });

  it("should return null when prevDone is already true (no duplicate notify)", () => {
    expect(calcIntentionDoneNotify(true, true, "운동하기")).toBeNull();
  });
});

describe("calcMorningIntentionReminder", () => {
  it("should return reminder body when todayIntention is undefined", () => {
    expect(calcMorningIntentionReminder(undefined)).toBe("☀️ 오늘의 의도를 설정해보세요!");
  });

  it("should return reminder body when todayIntention is empty string", () => {
    expect(calcMorningIntentionReminder("")).toBe("☀️ 오늘의 의도를 설정해보세요!");
  });

  it("should return reminder body when todayIntention is whitespace only", () => {
    expect(calcMorningIntentionReminder("   ")).toBe("☀️ 오늘의 의도를 설정해보세요!");
  });

  it("should return null when todayIntention is set", () => {
    expect(calcMorningIntentionReminder("운동하기")).toBeNull();
  });

  it("should return null when todayIntention is non-empty string with spaces", () => {
    expect(calcMorningIntentionReminder("  독서 30분  ")).toBeNull();
  });
});

describe("calcIntentionEveningReminder", () => {
  it("should return reminder body when intention is set today and not done", () => {
    expect(calcIntentionEveningReminder("운동하기", false, TODAY, TODAY)).toBe(
      "🌙 오늘의 의도를 달성했나요? \"운동하기\""
    );
  });

  it("should return null when intention is already done", () => {
    expect(calcIntentionEveningReminder("운동하기", true, TODAY, TODAY)).toBeNull();
  });

  it("should return reminder body when done is undefined (absent)", () => {
    expect(calcIntentionEveningReminder("운동하기", undefined, TODAY, TODAY)).toBe(
      "🌙 오늘의 의도를 달성했나요? \"운동하기\""
    );
  });

  it("should return null when intention is undefined", () => {
    expect(calcIntentionEveningReminder(undefined, false, TODAY, TODAY)).toBeNull();
  });

  it("should return null when intention is empty string", () => {
    expect(calcIntentionEveningReminder("", false, TODAY, TODAY)).toBeNull();
  });

  it("should return null when intention is whitespace only", () => {
    expect(calcIntentionEveningReminder("   ", false, TODAY, TODAY)).toBeNull();
  });

  it("should return null when intention was set on a different day", () => {
    expect(calcIntentionEveningReminder("운동하기", false, "2026-03-14", TODAY)).toBeNull();
  });

  it("should return null when intentionDate is undefined (not set today)", () => {
    expect(calcIntentionEveningReminder("운동하기", false, undefined, TODAY)).toBeNull();
  });

  it("should include intention text in quotes in the notification body", () => {
    const result = calcIntentionEveningReminder("독서 30분", false, TODAY, TODAY);
    expect(result).toContain("\"독서 30분\"");
  });
});

describe("calcIntentionDoneStreak", () => {
  it("should return 0 when history is empty and today is not done", () => {
    expect(calcIntentionDoneStreak([], false, TODAY)).toBe(0);
  });

  it("should return 0 when history is empty and todayIntentionDone is undefined", () => {
    expect(calcIntentionDoneStreak([], undefined, TODAY)).toBe(0);
  });

  it("should return 1 when today is done and history is empty", () => {
    expect(calcIntentionDoneStreak([], true, TODAY)).toBe(1);
  });

  it("should return 2 when yesterday done in history and today done", () => {
    const history: IntentionEntry[] = [{ date: "2026-03-14", text: "t", done: true }];
    expect(calcIntentionDoneStreak(history, true, TODAY)).toBe(2);
  });

  it("should return 3 when two consecutive past days done and today done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-03-13", text: "t", done: true },
      { date: "2026-03-14", text: "t", done: true },
    ];
    expect(calcIntentionDoneStreak(history, true, TODAY)).toBe(3);
  });

  it("should return 1 when yesterday is in history but done is false and today done", () => {
    const history: IntentionEntry[] = [{ date: "2026-03-14", text: "t", done: false }];
    expect(calcIntentionDoneStreak(history, true, TODAY)).toBe(1);
  });

  it("should return 1 when yesterday absent from history and today done", () => {
    // day-2 done but day-1 (yesterday) absent → gap stops streak at today only
    const history: IntentionEntry[] = [{ date: "2026-03-13", text: "t", done: true }];
    expect(calcIntentionDoneStreak(history, true, TODAY)).toBe(1);
  });

  it("should return 1 when yesterday done in history but today not done", () => {
    // only past days count when today is not done
    const history: IntentionEntry[] = [{ date: "2026-03-14", text: "t", done: true }];
    expect(calcIntentionDoneStreak(history, false, TODAY)).toBe(1);
  });

  it("should return 0 when yesterday not done and today not done", () => {
    const history: IntentionEntry[] = [{ date: "2026-03-14", text: "t", done: false }];
    expect(calcIntentionDoneStreak(history, false, TODAY)).toBe(0);
  });

  it("should cap at 7 with 6 consecutive past done days and today done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-03-09", text: "t", done: true },
      { date: "2026-03-10", text: "t", done: true },
      { date: "2026-03-11", text: "t", done: true },
      { date: "2026-03-12", text: "t", done: true },
      { date: "2026-03-13", text: "t", done: true },
      { date: "2026-03-14", text: "t", done: true },
    ];
    expect(calcIntentionDoneStreak(history, true, TODAY)).toBe(7);
  });

  it("should not exceed 7 even when more past done entries exist", () => {
    const history: IntentionEntry[] = [
      { date: "2026-03-08", text: "t", done: true },
      { date: "2026-03-09", text: "t", done: true },
      { date: "2026-03-10", text: "t", done: true },
      { date: "2026-03-11", text: "t", done: true },
      { date: "2026-03-12", text: "t", done: true },
      { date: "2026-03-13", text: "t", done: true },
      { date: "2026-03-14", text: "t", done: true },
    ];
    expect(calcIntentionDoneStreak(history, true, TODAY)).toBe(7);
  });

  it("should return 6 when today not done and 6 consecutive past done days exist", () => {
    // today not done → starts from 0, walks 6 back → max 6 (not 7)
    const history: IntentionEntry[] = [
      { date: "2026-03-09", text: "t", done: true },
      { date: "2026-03-10", text: "t", done: true },
      { date: "2026-03-11", text: "t", done: true },
      { date: "2026-03-12", text: "t", done: true },
      { date: "2026-03-13", text: "t", done: true },
      { date: "2026-03-14", text: "t", done: true },
    ];
    expect(calcIntentionDoneStreak(history, false, TODAY)).toBe(6);
  });
});

// Arbitrary 7-day window used as test fixture (App.tsx would pass yesterday-ending 7 days on Monday)
// Window: 2026-03-09 → 2026-03-15; 2026-03-16 (a Monday) would be the report-send day in production.
const LAST7_WEEK = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"];

describe("calcWeeklyIntentionReport", () => {
  it("should return null when history is empty", () => {
    expect(calcWeeklyIntentionReport([], LAST7_WEEK)).toBeNull();
  });

  it("should return null when only 1 intention was set in the window (insufficient data)", () => {
    const history: IntentionEntry[] = [{ date: "2026-03-11", text: "one", done: true }];
    expect(calcWeeklyIntentionReport(history, LAST7_WEEK)).toBeNull();
  });

  it("should return a message when exactly 2 intentions were set (minimum threshold)", () => {
    const history: IntentionEntry[] = [
      { date: "2026-03-09", text: "a", done: true },
      { date: "2026-03-10", text: "b", done: false },
    ];
    const result = calcWeeklyIntentionReport(history, LAST7_WEEK);
    expect(result).not.toBeNull();
    expect(result).toContain("1/2");
  });

  it("should return null when history entries fall outside the window", () => {
    const history: IntentionEntry[] = [
      { date: "2026-03-05", text: "old", done: true },
      { date: "2026-03-06", text: "old", done: true },
      { date: "2026-03-07", text: "old", done: true },
    ];
    expect(calcWeeklyIntentionReport(history, LAST7_WEEK)).toBeNull();
  });

  it("should return 100% message when all set intentions were done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-03-09", text: "a", done: true },
      { date: "2026-03-10", text: "b", done: true },
      { date: "2026-03-11", text: "c", done: true },
      { date: "2026-03-12", text: "d", done: true },
    ];
    const result = calcWeeklyIntentionReport(history, LAST7_WEEK);
    expect(result).not.toBeNull();
    expect(result).toContain("100%");
    expect(result).toContain("4/4");
  });

  it("should return high (≥70%) message when 3/4 done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-03-09", text: "a", done: true },
      { date: "2026-03-10", text: "b", done: true },
      { date: "2026-03-11", text: "c", done: true },
      { date: "2026-03-12", text: "d", done: false },
    ];
    const result = calcWeeklyIntentionReport(history, LAST7_WEEK);
    expect(result).not.toBeNull();
    expect(result).toContain("75%");
    expect(result).toContain("3/4");
  });

  it("should return medium (≥40%) message when 2/4 done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-03-09", text: "a", done: true },
      { date: "2026-03-10", text: "b", done: true },
      { date: "2026-03-11", text: "c", done: false },
      { date: "2026-03-12", text: "d", done: false },
    ];
    const result = calcWeeklyIntentionReport(history, LAST7_WEEK);
    expect(result).not.toBeNull();
    expect(result).toContain("50%");
    expect(result).toContain("2/4");
  });

  it("should return low (<40%) message when 1/5 done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-03-09", text: "a", done: true },
      { date: "2026-03-10", text: "b", done: false },
      { date: "2026-03-11", text: "c", done: false },
      { date: "2026-03-12", text: "d", done: false },
      { date: "2026-03-13", text: "e", done: false },
    ];
    const result = calcWeeklyIntentionReport(history, LAST7_WEEK);
    expect(result).not.toBeNull();
    expect(result).toContain("20%");
    expect(result).toContain("1/5");
  });

  it("should count absent done field as not done", () => {
    // done absent (undefined) → treated as false
    const history: IntentionEntry[] = [
      { date: "2026-03-09", text: "a" },
      { date: "2026-03-10", text: "b", done: true },
      { date: "2026-03-11", text: "c" },
    ];
    const result = calcWeeklyIntentionReport(history, LAST7_WEEK);
    expect(result).not.toBeNull();
    expect(result).toContain("1/3");
  });

  it("should only count entries within the last7Days window", () => {
    // 2026-03-08 is outside LAST7_WEEK window → should be ignored
    const history: IntentionEntry[] = [
      { date: "2026-03-08", text: "old", done: true },  // outside window
      { date: "2026-03-09", text: "a", done: true },
      { date: "2026-03-10", text: "b", done: true },
      { date: "2026-03-11", text: "c", done: false },
    ];
    const result = calcWeeklyIntentionReport(history, LAST7_WEEK);
    expect(result).not.toBeNull();
    expect(result).toContain("2/3");
  });

  it("should deduplicate by date so duplicate history entries do not inflate setCount", () => {
    // Two entries for 2026-03-09 — only the first should count (dedup by date)
    const history: IntentionEntry[] = [
      { date: "2026-03-09", text: "first", done: true },
      { date: "2026-03-09", text: "dup", done: false },  // duplicate — should be ignored
      { date: "2026-03-10", text: "b", done: true },
      { date: "2026-03-11", text: "c", done: true },
    ];
    const result = calcWeeklyIntentionReport(history, LAST7_WEEK);
    expect(result).not.toBeNull();
    // setCount = 3 (not 4), doneCount = 3 → 100%
    expect(result).toContain("100%");
    expect(result).toContain("3/3");
  });
});

describe("calcMonthlyIntentionReport", () => {
  // Feb 2026: 28 days (2026-02-01 … 2026-02-28), used as prevMonthDays fixture.
  const FEB_2026: string[] = Array.from({ length: 28 }, (_, i) => {
    const d = new Date("2026-02-01T00:00:00");
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("sv");
  });

  it("should return null when fewer than 2 entries in window", () => {
    const history: IntentionEntry[] = [{ date: "2026-02-05", text: "a", done: true }];
    expect(calcMonthlyIntentionReport(history, FEB_2026)).toBeNull();
  });

  it("should return null when history is empty", () => {
    expect(calcMonthlyIntentionReport([], FEB_2026)).toBeNull();
  });

  it("should return 100% perfect message when all done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-02-01", text: "a", done: true },
      { date: "2026-02-02", text: "b", done: true },
      { date: "2026-02-03", text: "c", done: true },
    ];
    const result = calcMonthlyIntentionReport(history, FEB_2026);
    expect(result).not.toBeNull();
    expect(result).toContain("100%");
    expect(result).toContain("3/3");
    expect(result).toContain("지난달");
  });

  it("should return ≥70% excellent message when 3/4 done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-02-01", text: "a", done: true },
      { date: "2026-02-02", text: "b", done: true },
      { date: "2026-02-03", text: "c", done: true },
      { date: "2026-02-04", text: "d", done: false },
    ];
    const result = calcMonthlyIntentionReport(history, FEB_2026);
    expect(result).not.toBeNull();
    expect(result).toContain("75%");
    expect(result).toContain("3/4");
  });

  it("should return ≥40% medium message when 2/4 done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-02-01", text: "a", done: true },
      { date: "2026-02-02", text: "b", done: true },
      { date: "2026-02-03", text: "c", done: false },
      { date: "2026-02-04", text: "d", done: false },
    ];
    const result = calcMonthlyIntentionReport(history, FEB_2026);
    expect(result).not.toBeNull();
    expect(result).toContain("50%");
    expect(result).toContain("2/4");
  });

  it("should return <40% low message when 1/5 done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-02-01", text: "a", done: true },
      { date: "2026-02-02", text: "b", done: false },
      { date: "2026-02-03", text: "c", done: false },
      { date: "2026-02-04", text: "d", done: false },
      { date: "2026-02-05", text: "e", done: false },
    ];
    const result = calcMonthlyIntentionReport(history, FEB_2026);
    expect(result).not.toBeNull();
    expect(result).toContain("20%");
    expect(result).toContain("1/5");
  });

  it("should ignore entries outside the prevMonthDays window", () => {
    // 2026-01-31 is outside Feb window → should be excluded
    const history: IntentionEntry[] = [
      { date: "2026-01-31", text: "old", done: true },
      { date: "2026-02-01", text: "a", done: true },
      { date: "2026-02-02", text: "b", done: true },
    ];
    const result = calcMonthlyIntentionReport(history, FEB_2026);
    expect(result).not.toBeNull();
    expect(result).toContain("2/2");
  });

  it("should deduplicate by date so duplicate history entries do not inflate setCount", () => {
    const history: IntentionEntry[] = [
      { date: "2026-02-01", text: "first", done: true },
      { date: "2026-02-01", text: "dup", done: false },  // duplicate — ignored
      { date: "2026-02-02", text: "b", done: true },
      { date: "2026-02-03", text: "c", done: true },
    ];
    const result = calcMonthlyIntentionReport(history, FEB_2026);
    expect(result).not.toBeNull();
    expect(result).toContain("100%");
    expect(result).toContain("3/3");
  });

  it("should treat absent done field as not done", () => {
    const history: IntentionEntry[] = [
      { date: "2026-02-01", text: "a" },         // done absent → false
      { date: "2026-02-02", text: "b", done: true },
      { date: "2026-02-03", text: "c" },          // done absent → false
    ];
    const result = calcMonthlyIntentionReport(history, FEB_2026);
    expect(result).not.toBeNull();
    expect(result).toContain("1/3");
  });

  it("should return null when only 1 distinct entry in window after dedup", () => {
    const history: IntentionEntry[] = [
      { date: "2026-02-01", text: "a", done: true },
      { date: "2026-02-01", text: "dup", done: false },  // same date → deduped out
    ];
    expect(calcMonthlyIntentionReport(history, FEB_2026)).toBeNull();
  });

  it("should include entries from the first and last day of the month, not just the final 7 days", () => {
    // Validates full-month coverage: entries span Feb 1 (day 1) through Feb 28 (day 28).
    // The 35-day rolling cap lives in App.tsx (persist path); this pure function test verifies
    // that entries at both ends of the month window are correctly aggregated once history is passed in.
    const history: IntentionEntry[] = [
      { date: "2026-02-01", text: "month-start", done: true },  // 27 days before month-end
      { date: "2026-02-14", text: "mid-month", done: false },   // 14 days before month-end
      { date: "2026-02-28", text: "month-end", done: true },    // last day of month
    ];
    const result = calcMonthlyIntentionReport(history, FEB_2026);
    expect(result).not.toBeNull();
    // 2 done out of 3 set → 67%
    expect(result).toContain("2/3");
    expect(result).toContain("지난달");
  });
});

describe("calcQuarterlyIntentionReport", () => {
  // Q4 2025: Oct 1 – Dec 31 (92 days), used as prevQtrDays fixture.
  const Q4_2025: string[] = Array.from({ length: 92 }, (_, i) => {
    const d = new Date("2025-10-01T00:00:00");
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("sv");
  });

  it("should return null when fewer than 2 entries in window", () => {
    const history: IntentionEntry[] = [{ date: "2025-10-05", text: "a", done: true }];
    expect(calcQuarterlyIntentionReport(history, Q4_2025)).toBeNull();
  });

  it("should return null when history is empty", () => {
    expect(calcQuarterlyIntentionReport([], Q4_2025)).toBeNull();
  });

  it("should return 100% perfect message with 지난 분기 text when all done", () => {
    const history: IntentionEntry[] = [
      { date: "2025-10-01", text: "a", done: true },
      { date: "2025-10-02", text: "b", done: true },
      { date: "2025-10-03", text: "c", done: true },
    ];
    const result = calcQuarterlyIntentionReport(history, Q4_2025);
    expect(result).not.toBeNull();
    expect(result).toContain("100%");
    expect(result).toContain("3/3");
    expect(result).toContain("지난 분기");
    expect(result).not.toContain("지난달");
  });

  it("should return ≥70% excellent message when 3/4 done", () => {
    const history: IntentionEntry[] = [
      { date: "2025-10-01", text: "a", done: true },
      { date: "2025-10-02", text: "b", done: true },
      { date: "2025-10-03", text: "c", done: true },
      { date: "2025-10-04", text: "d", done: false },
    ];
    const result = calcQuarterlyIntentionReport(history, Q4_2025);
    expect(result).not.toBeNull();
    expect(result).toContain("75%");
    expect(result).toContain("3/4");
    expect(result).toContain("지난 분기");
  });

  it("should return ≥40% medium message when 2/4 done", () => {
    const history: IntentionEntry[] = [
      { date: "2025-10-01", text: "a", done: true },
      { date: "2025-10-02", text: "b", done: true },
      { date: "2025-10-03", text: "c", done: false },
      { date: "2025-10-04", text: "d", done: false },
    ];
    const result = calcQuarterlyIntentionReport(history, Q4_2025);
    expect(result).not.toBeNull();
    expect(result).toContain("50%");
    expect(result).toContain("2/4");
    expect(result).toContain("이번 분기엔");
  });

  it("should return <40% low message when 1/5 done", () => {
    const history: IntentionEntry[] = [
      { date: "2025-10-01", text: "a", done: true },
      { date: "2025-10-02", text: "b", done: false },
      { date: "2025-10-03", text: "c", done: false },
      { date: "2025-10-04", text: "d", done: false },
      { date: "2025-10-05", text: "e", done: false },
    ];
    const result = calcQuarterlyIntentionReport(history, Q4_2025);
    expect(result).not.toBeNull();
    expect(result).toContain("20%");
    expect(result).toContain("1/5");
    expect(result).toContain("지난 분기");
  });

  it("should ignore entries outside the prevQtrDays window", () => {
    // 2025-09-30 is before Q4 → should be excluded
    const history: IntentionEntry[] = [
      { date: "2025-09-30", text: "old", done: true },
      { date: "2025-10-01", text: "a", done: true },
      { date: "2025-10-02", text: "b", done: true },
    ];
    const result = calcQuarterlyIntentionReport(history, Q4_2025);
    expect(result).not.toBeNull();
    expect(result).toContain("2/2");
  });

  it("should deduplicate by date so duplicate history entries do not inflate setCount", () => {
    const history: IntentionEntry[] = [
      { date: "2025-10-01", text: "first", done: true },
      { date: "2025-10-01", text: "dup", done: false },  // duplicate — ignored
      { date: "2025-10-02", text: "b", done: true },
      { date: "2025-10-03", text: "c", done: true },
    ];
    const result = calcQuarterlyIntentionReport(history, Q4_2025);
    expect(result).not.toBeNull();
    expect(result).toContain("100%");
    expect(result).toContain("3/3");
  });

  it("should treat absent done field as not done", () => {
    const history: IntentionEntry[] = [
      { date: "2025-10-01", text: "a" },         // done absent → false
      { date: "2025-10-02", text: "b", done: true },
      { date: "2025-10-03", text: "c" },          // done absent → false
    ];
    const result = calcQuarterlyIntentionReport(history, Q4_2025);
    expect(result).not.toBeNull();
    expect(result).toContain("1/3");
  });

  it("should return null when only 1 distinct entry after dedup", () => {
    const history: IntentionEntry[] = [
      { date: "2025-10-01", text: "a", done: true },
      { date: "2025-10-01", text: "dup", done: false },  // same date → deduped out
    ];
    expect(calcQuarterlyIntentionReport(history, Q4_2025)).toBeNull();
  });

  it("should include entries from the first and last day of the quarter", () => {
    // Validates full-quarter coverage: entries span Oct 1 (day 1) through Dec 31 (day 92).
    const history: IntentionEntry[] = [
      { date: "2025-10-01", text: "quarter-start", done: true },  // first day of Q4
      { date: "2025-11-15", text: "mid-quarter", done: false },   // middle of Q4
      { date: "2025-12-31", text: "quarter-end", done: true },    // last day of Q4
    ];
    const result = calcQuarterlyIntentionReport(history, Q4_2025);
    expect(result).not.toBeNull();
    // 2 done out of 3 set → 67%
    expect(result).toContain("2/3");
    expect(result).toContain("지난 분기");
  });
});

describe("calcYearlyIntentionReport", () => {
  // 2024 is a leap year (366 days): Jan 1 – Dec 31. Used as prevYearDays fixture.
  const YEAR_2024: string[] = Array.from({ length: 366 }, (_, i) => {
    const d = new Date("2024-01-01T00:00:00");
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("sv");
  });

  it("should return null when history is empty", () => {
    expect(calcYearlyIntentionReport([], YEAR_2024)).toBeNull();
  });

  it("should return null when fewer than 2 entries in window", () => {
    const history: IntentionEntry[] = [{ date: "2024-01-05", text: "a", done: true }];
    expect(calcYearlyIntentionReport(history, YEAR_2024)).toBeNull();
  });

  it("should return 100% perfect message with 지난 해 text when all done", () => {
    const history: IntentionEntry[] = [
      { date: "2024-01-01", text: "a", done: true },
      { date: "2024-01-02", text: "b", done: true },
      { date: "2024-01-03", text: "c", done: true },
    ];
    const result = calcYearlyIntentionReport(history, YEAR_2024);
    expect(result).not.toBeNull();
    expect(result).toContain("100%");
    expect(result).toContain("3/3");
    expect(result).toContain("지난 해");
    expect(result).not.toContain("지난 분기");
    expect(result).not.toContain("지난달");
  });

  it("should return ≥70% excellent message when 3/4 done", () => {
    const history: IntentionEntry[] = [
      { date: "2024-01-01", text: "a", done: true },
      { date: "2024-01-02", text: "b", done: true },
      { date: "2024-01-03", text: "c", done: true },
      { date: "2024-01-04", text: "d", done: false },
    ];
    const result = calcYearlyIntentionReport(history, YEAR_2024);
    expect(result).not.toBeNull();
    expect(result).toContain("75%");
    expect(result).toContain("3/4");
    expect(result).toContain("지난 해");
  });

  it("should return ≥40% medium message with 올해엔 text when 2/4 done", () => {
    const history: IntentionEntry[] = [
      { date: "2024-01-01", text: "a", done: true },
      { date: "2024-01-02", text: "b", done: true },
      { date: "2024-01-03", text: "c", done: false },
      { date: "2024-01-04", text: "d", done: false },
    ];
    const result = calcYearlyIntentionReport(history, YEAR_2024);
    expect(result).not.toBeNull();
    expect(result).toContain("50%");
    expect(result).toContain("2/4");
    expect(result).toContain("올해엔");
  });

  it("should return <40% low message with warning text when 1/5 done", () => {
    const history: IntentionEntry[] = [
      { date: "2024-01-01", text: "a", done: true },
      { date: "2024-01-02", text: "b", done: false },
      { date: "2024-01-03", text: "c", done: false },
      { date: "2024-01-04", text: "d", done: false },
      { date: "2024-01-05", text: "e", done: false },
    ];
    const result = calcYearlyIntentionReport(history, YEAR_2024);
    expect(result).not.toBeNull();
    expect(result).toContain("20%");
    expect(result).toContain("1/5");
    expect(result).toContain("의도를 실천하는 것이 중요해요");
  });

  it("should ignore entries outside prevYearDays window", () => {
    // 2023-12-31 is before 2024 → should be excluded
    const history: IntentionEntry[] = [
      { date: "2023-12-31", text: "old", done: true },
      { date: "2024-01-01", text: "a", done: true },
      { date: "2024-01-02", text: "b", done: true },
    ];
    const result = calcYearlyIntentionReport(history, YEAR_2024);
    expect(result).not.toBeNull();
    expect(result).toContain("2/2");
  });

  it("should deduplicate by date so duplicate history entries do not inflate setCount", () => {
    const history: IntentionEntry[] = [
      { date: "2024-01-01", text: "first", done: true },
      { date: "2024-01-01", text: "dup", done: false },  // duplicate — ignored
      { date: "2024-01-02", text: "b", done: true },
      { date: "2024-01-03", text: "c", done: true },
    ];
    const result = calcYearlyIntentionReport(history, YEAR_2024);
    expect(result).not.toBeNull();
    expect(result).toContain("100%");
    expect(result).toContain("3/3");
  });

  it("should treat absent done field as not done", () => {
    const history: IntentionEntry[] = [
      { date: "2024-01-01", text: "a" },         // done absent → false
      { date: "2024-01-02", text: "b", done: true },
      { date: "2024-01-03", text: "c" },          // done absent → false
    ];
    const result = calcYearlyIntentionReport(history, YEAR_2024);
    expect(result).not.toBeNull();
    expect(result).toContain("1/3");
  });

  it("should return null when only 1 distinct entry after dedup", () => {
    const history: IntentionEntry[] = [
      { date: "2024-01-01", text: "a", done: true },
      { date: "2024-01-01", text: "dup", done: false },  // same date → deduped out
    ];
    expect(calcYearlyIntentionReport(history, YEAR_2024)).toBeNull();
  });

  it("should include entries from the first and last day of the year", () => {
    // Validates full-year coverage: entries span Jan 1 and Dec 31 of 2024.
    const history: IntentionEntry[] = [
      { date: "2024-01-01", text: "year-start", done: true },   // first day of 2024
      { date: "2024-06-15", text: "mid-year", done: false },    // middle of 2024
      { date: "2024-12-31", text: "year-end", done: true },     // last day of 2024
    ];
    const result = calcYearlyIntentionReport(history, YEAR_2024);
    expect(result).not.toBeNull();
    // 2 done out of 3 set → 67%
    expect(result).toContain("2/3");
    expect(result).toContain("지난 해");
  });
});

// 14-day window covering each weekday twice: Jan 7–20 2024 (Sun–Sat, Sun–Sat)
const DOW_WINDOW_14 = [
  "2024-01-07", // Sun (0)
  "2024-01-08", // Mon (1)
  "2024-01-09", // Tue (2)
  "2024-01-10", // Wed (3)
  "2024-01-11", // Thu (4)
  "2024-01-12", // Fri (5)
  "2024-01-13", // Sat (6)
  "2024-01-14", // Sun (0)
  "2024-01-15", // Mon (1)
  "2024-01-16", // Tue (2)
  "2024-01-17", // Wed (3)
  "2024-01-18", // Thu (4)
  "2024-01-19", // Fri (5)
  "2024-01-20", // Sat (6)
];

// ─── calcDayOfWeekIntentionDoneRate ───────────────────────────────────────────
describe("calcDayOfWeekIntentionDoneRate", () => {
  it("should return all-null when history is empty", () => {
    const result = calcDayOfWeekIntentionDoneRate([], DOW_WINDOW_14);
    expect(Object.values(result).every(v => v === null)).toBe(true);
  });

  it("should return all-null when dayWindow is empty", () => {
    const history: IntentionEntry[] = [{ date: "2024-01-08", text: "a", done: true }];
    const result = calcDayOfWeekIntentionDoneRate(history, []);
    expect(Object.values(result).every(v => v === null)).toBe(true);
  });

  it("should return null for a weekday with only 1 set intention (below min appearances)", () => {
    // 2024-01-08 is the only Monday in history → below MIN_INTENTION_DOW_APPEARANCES (2) → null
    const history: IntentionEntry[] = [{ date: "2024-01-08", text: "a", done: true }];
    const result = calcDayOfWeekIntentionDoneRate(history, DOW_WINDOW_14);
    expect(result[1]).toBeNull(); // Monday: 1 set intention, below min
  });

  it("should compute 50% when 2 set intentions on same weekday with 1 done", () => {
    // Mon Jan 8 (done=true) + Mon Jan 15 (done=false) → 1/2 = 50%
    const history: IntentionEntry[] = [
      { date: "2024-01-08", text: "a", done: true },
      { date: "2024-01-15", text: "b", done: false },
    ];
    const result = calcDayOfWeekIntentionDoneRate(history, DOW_WINDOW_14);
    expect(result[1]).toBe(50);
  });

  it("should compute 100% when all set intentions on a weekday are done", () => {
    const history: IntentionEntry[] = [
      { date: "2024-01-08", text: "a", done: true },
      { date: "2024-01-15", text: "b", done: true },
    ];
    const result = calcDayOfWeekIntentionDoneRate(history, DOW_WINDOW_14);
    expect(result[1]).toBe(100);
  });

  it("should compute 0% when all set intentions on a weekday have done=false", () => {
    const history: IntentionEntry[] = [
      { date: "2024-01-08", text: "a", done: false },
      { date: "2024-01-15", text: "b", done: false },
    ];
    const result = calcDayOfWeekIntentionDoneRate(history, DOW_WINDOW_14);
    expect(result[1]).toBe(0);
  });

  it("should not count history entries outside dayWindow", () => {
    // 2024-01-01 (Mon) is outside DOW_WINDOW_14; 2024-01-08 (Mon) is inside → only 1 Mon set → null
    const history: IntentionEntry[] = [
      { date: "2024-01-01", text: "outside", done: true },
      { date: "2024-01-08", text: "inside", done: false },
    ];
    const result = calcDayOfWeekIntentionDoneRate(history, DOW_WINDOW_14);
    expect(result[1]).toBeNull(); // only 1 Monday in window
  });

  it("should compute rates independently per weekday", () => {
    // Mon: 2 done / 2 set = 100%; Tue: 1 done / 2 set = 50%
    const history: IntentionEntry[] = [
      { date: "2024-01-08", text: "mon1", done: true },
      { date: "2024-01-15", text: "mon2", done: true },
      { date: "2024-01-09", text: "tue1", done: true },
      { date: "2024-01-16", text: "tue2", done: false },
    ];
    const result = calcDayOfWeekIntentionDoneRate(history, DOW_WINDOW_14);
    expect(result[1]).toBe(100); // Monday
    expect(result[2]).toBe(50);  // Tuesday
  });

  it("should treat absent done field as not done", () => {
    // done is optional on IntentionEntry; absent means not done (done !== true)
    const history: IntentionEntry[] = [
      { date: "2024-01-08", text: "a" }, // done absent → not done
      { date: "2024-01-15", text: "b", done: true },
    ];
    const result = calcDayOfWeekIntentionDoneRate(history, DOW_WINDOW_14);
    expect(result[1]).toBe(50); // 1 done out of 2 set
  });

  it("should use first occurrence when duplicate dates exist in history (first-wins)", () => {
    // First entry: done=true; duplicate: done=false → first-wins: rate = 100%
    const history: IntentionEntry[] = [
      { date: "2024-01-08", text: "first", done: true },
      { date: "2024-01-08", text: "dup",   done: false }, // duplicate, discarded
      { date: "2024-01-15", text: "b",     done: true },
    ];
    const result = calcDayOfWeekIntentionDoneRate(history, DOW_WINDOW_14);
    expect(result[1]).toBe(100); // first-wins: both Mondays count as done
  });
});

// ─── calcWeakIntentionDay ────────────────────────────────────────────────────
describe("calcWeakIntentionDay", () => {
  it("should return null when all rates are null", () => {
    expect(calcWeakIntentionDay({ 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null })).toBeNull();
  });

  it("should return the weekday with rate strictly below 50% threshold", () => {
    expect(calcWeakIntentionDay({ 0: null, 1: 40, 2: null, 3: null, 4: null, 5: null, 6: null })).toBe(1);
  });

  it("should return null when weakest rate is exactly at 50% threshold (not strictly below)", () => {
    expect(calcWeakIntentionDay({ 0: null, 1: 50, 2: null, 3: null, 4: null, 5: null, 6: null })).toBeNull();
  });

  it("should return lowest weekday number when multiple weekdays tie at the minimum rate", () => {
    // dow=2 and dow=4 both at 30% → lowest dow wins (2)
    expect(calcWeakIntentionDay({ 0: null, 1: null, 2: 30, 3: null, 4: 30, 5: null, 6: null })).toBe(2);
  });
});

// ─── calcBestIntentionDay ────────────────────────────────────────────────────
describe("calcBestIntentionDay", () => {
  it("should return null when all rates are null", () => {
    expect(calcBestIntentionDay({ 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null })).toBeNull();
  });

  it("should return the weekday with rate at or above 80% threshold", () => {
    expect(calcBestIntentionDay({ 0: null, 1: 80, 2: null, 3: null, 4: null, 5: null, 6: null })).toBe(1);
  });

  it("should return null when all non-null rates are below 80% threshold", () => {
    expect(calcBestIntentionDay({ 0: null, 1: 79, 2: null, 3: null, 4: null, 5: null, 6: null })).toBeNull();
  });

  it("should return the weekday with the highest rate when multiple exceed threshold", () => {
    // dow=3 at 90% > dow=1 at 80% → return 3 (highest rate)
    expect(calcBestIntentionDay({ 0: null, 1: 80, 2: null, 3: 90, 4: null, 5: null, 6: null })).toBe(3);
  });

  it("should return lowest weekday number when multiple weekdays tie at the best rate", () => {
    // dow=1 and dow=4 both at 90% → lowest dow wins (1)
    expect(calcBestIntentionDay({ 0: null, 1: 90, 2: null, 3: null, 4: 90, 5: null, 6: null })).toBe(1);
  });
});

// ── calcIntentionMonthDoneRate ────────────────────────────────────────────────
describe("calcIntentionMonthDoneRate", () => {
  // todayStr = "2024-01-15" → monthPrefix = "2024-01"

  it("should return undefined when setCount < 14 (insufficient data)", () => {
    // 13 past entries + today not set → setCount=13 < 14
    const history: IntentionEntry[] = Array.from({ length: 13 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      text: "test",
      done: true,
    }));
    expect(calcIntentionMonthDoneRate(history, "2024-01-15", undefined, undefined)).toBeUndefined();
  });

  it("should return 100 when all 14 entries are done (exact boundary)", () => {
    // 13 past entries (all done) + today set and done → setCount=14, doneCount=14
    const history: IntentionEntry[] = Array.from({ length: 13 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      text: "test",
      done: true,
    }));
    expect(calcIntentionMonthDoneRate(history, "2024-01-14", "오늘 의도", true)).toBe(100);
  });

  it("should exclude today from history to avoid double-counting", () => {
    // intentionHistory includes today's entry (persisted), plus todayIntention is set done.
    // Without exclusion: setCount=15, doneCount=14 → 93%. With exclusion: setCount=14, doneCount=14 → 100%.
    const history: IntentionEntry[] = Array.from({ length: 13 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      text: "test",
      done: true,
    }));
    // Add today's entry to history as if it were persisted (done=false, but live state says done=true)
    history.push({ date: "2024-01-14", text: "old entry", done: false });
    // todayStr = "2024-01-14"; live state: todayIntentionDone=true
    // Without today-exclusion: history has 14 entries (13 done=true + today done=false), plus today set done → 15 set, 14 done → 93%
    // With today-exclusion: history has 13 entries (all done=true), today set done → 14 set, 14 done → 100%
    expect(calcIntentionMonthDoneRate(history, "2024-01-14", "오늘 의도", true)).toBe(100);
  });

  it("should compute rate correctly when some entries are not done", () => {
    // 13 past entries (10 done, 3 not done) + today set and done → setCount=14, doneCount=11 → 79%
    const history: IntentionEntry[] = [
      ...Array.from({ length: 10 }, (_, i) => ({ date: `2024-01-${String(i + 1).padStart(2, "0")}`, text: "t", done: true })),
      ...Array.from({ length: 3 }, (_, i) => ({ date: `2024-01-${String(i + 11).padStart(2, "0")}`, text: "t", done: false })),
    ];
    expect(calcIntentionMonthDoneRate(history, "2024-01-14", "오늘 의도", true)).toBe(Math.round(11 / 14 * 100));
  });

  it("should not count today when todayIntention is absent", () => {
    // 14 past entries (all done), today not set → setCount=14, doneCount=14 → 100%
    const history: IntentionEntry[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      text: "test",
      done: true,
    }));
    expect(calcIntentionMonthDoneRate(history, "2024-01-15", undefined, undefined)).toBe(100);
  });

  it("should not include entries from a different month", () => {
    // 13 December entries + 1 January entry (all done) → January setCount=1 < 14 → undefined
    const history: IntentionEntry[] = [
      ...Array.from({ length: 13 }, (_, i) => ({ date: `2023-12-${String(i + 1).padStart(2, "0")}`, text: "t", done: true })),
      { date: "2024-01-01", text: "jan", done: true },
    ];
    expect(calcIntentionMonthDoneRate(history, "2024-01-15", undefined, undefined)).toBeUndefined();
  });
});

describe("calcIntentionMomentumCorrelation — intention done vs. momentum gap (≥5 samples each bucket, ≥15 pt gap)", () => {
  // ABOUTME: Tests for calcIntentionMomentumCorrelation — compares avg momentum on intention-done days
  // ABOUTME: vs intention-not-done/not-set days; returns the gap (≥15 pt) or null if insufficient data.
  const TODAY = "2026-03-19";

  function makeMomentumHistory(entries: { date: string; score: number }[]): MomentumEntry[] {
    return entries.map(({ date, score }) => ({
      date,
      score,
      tier: score >= 75 ? "high" : score >= 40 ? "mid" : "low",
    }));
  }

  it("shouldReturnGapWhenIntentionDoneAverageIsHigherByAtLeast15", () => {
    // doneDates: 5 days with score 80; notDoneDates: 5 days with score 60; gap = 20
    const doneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history: IntentionEntry[] = [
      ...doneDates.map(date => ({ date, text: "test", done: true })),
      ...notDoneDates.map(date => ({ date, text: "test", done: false })),
    ];
    const momentum = makeMomentumHistory([
      ...doneDates.map(date => ({ date, score: 80 })),
      ...notDoneDates.map(date => ({ date, score: 60 })),
    ]);
    const result = calcIntentionMomentumCorrelation(history, momentum, TODAY);
    expect(result).toBe(20);
  });

  it("shouldReturnNullWhenGapBelow15", () => {
    // done: score 74; not done: score 61; gap = 13 → null
    const doneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history: IntentionEntry[] = [
      ...doneDates.map(date => ({ date, text: "test", done: true })),
      ...notDoneDates.map(date => ({ date, text: "test", done: false })),
    ];
    const momentum = makeMomentumHistory([
      ...doneDates.map(date => ({ date, score: 74 })),
      ...notDoneDates.map(date => ({ date, score: 61 })),
    ]);
    const result = calcIntentionMomentumCorrelation(history, momentum, TODAY);
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenFewerThan5SamplesInDoneBucket", () => {
    // Only 4 intention-done days — insufficient for correlation
    const doneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history: IntentionEntry[] = [
      ...doneDates.map(date => ({ date, text: "test", done: true })),
      ...notDoneDates.map(date => ({ date, text: "test", done: false })),
    ];
    const momentum = makeMomentumHistory([
      ...doneDates.map(date => ({ date, score: 90 })),
      ...notDoneDates.map(date => ({ date, score: 50 })),
    ]);
    const result = calcIntentionMomentumCorrelation(history, momentum, TODAY);
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenFewerThan5SamplesInNotDoneBucket", () => {
    // 5 done days but only 4 not-done days (momentum entries without a done history entry)
    const doneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09"];
    const history: IntentionEntry[] = doneDates.map(date => ({ date, text: "test", done: true }));
    const momentum = makeMomentumHistory([
      ...doneDates.map(date => ({ date, score: 90 })),
      ...notDoneDates.map(date => ({ date, score: 50 })),
    ]);
    const result = calcIntentionMomentumCorrelation(history, momentum, TODAY);
    expect(result).toBeNull();
  });

  it("shouldReturnNullWhenIntentionHistoryIsEmpty", () => {
    const momentum = makeMomentumHistory([{ date: "2026-03-01", score: 80 }]);
    expect(calcIntentionMomentumCorrelation([], momentum, TODAY)).toBeNull();
  });

  it("shouldReturnNullWhenMomentumHistoryIsEmpty", () => {
    const history: IntentionEntry[] = [{ date: "2026-03-01", text: "test", done: true }];
    expect(calcIntentionMomentumCorrelation(history, [], TODAY)).toBeNull();
  });

  it("shouldExcludeTodayFromCorrelationCalculation", () => {
    // 5 past done days with score 80; TODAY entry score 0 — today must be excluded
    const doneDates = ["2026-03-13", "2026-03-14", "2026-03-15", "2026-03-16", "2026-03-17"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history: IntentionEntry[] = [
      ...doneDates.map(date => ({ date, text: "test", done: true })),
      { date: TODAY, text: "test", done: true }, // today's entry — excluded by doneDates filter (e.date < todayStr)
    ];
    const momentum = makeMomentumHistory([
      ...doneDates.map(date => ({ date, score: 80 })),
      { date: TODAY, score: 0 }, // in-progress today score — excluded by momentum loop guard (entry.date >= todayStr)
      ...notDoneDates.map(date => ({ date, score: 60 })),
    ]);
    // Two-layer exclusion: (1) doneDates filter drops today's intention entry; (2) momentum loop skips today's score.
    // Without today excluded: doneAvg = (80*5+0)/6 ≈ 66.7, gap vs 60 = 6.7 → null
    // With today excluded: doneAvg = 80, gap vs 60 = 20 → 20
    const result = calcIntentionMomentumCorrelation(history, momentum, TODAY);
    expect(result).toBe(20);
  });

  it("shouldTreatNotSetDaysAsNotDoneBucket", () => {
    // Days without an IntentionEntry (not set) are counted in the not-done bucket
    const doneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    // notDoneDates have no entry in history — they fall into not-done bucket by absence
    const notSetDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history: IntentionEntry[] = doneDates.map(date => ({ date, text: "test", done: true }));
    const momentum = makeMomentumHistory([
      ...doneDates.map(date => ({ date, score: 80 })),
      ...notSetDates.map(date => ({ date, score: 55 })),
    ]);
    const result = calcIntentionMomentumCorrelation(history, momentum, TODAY);
    expect(result).toBe(25); // 80 - 55 = 25
  });

  it("shouldRoundGapCorrectly", () => {
    // doneAvg = (75+76+76+75+76)/5 = 378/5 = 75.6; notDoneAvg = 60; gap = 15.6 → rounds to 16
    const doneDates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const notDoneDates = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];
    const history: IntentionEntry[] = doneDates.map(date => ({ date, text: "test", done: true }));
    const momentum = makeMomentumHistory([
      { date: "2026-03-01", score: 75 },
      { date: "2026-03-02", score: 76 },
      { date: "2026-03-03", score: 76 },
      { date: "2026-03-04", score: 75 },
      { date: "2026-03-05", score: 76 },
      ...notDoneDates.map(date => ({ date, score: 60 })),
    ]);
    const result = calcIntentionMomentumCorrelation(history, momentum, TODAY);
    expect(result).toBe(16);
  });
});
