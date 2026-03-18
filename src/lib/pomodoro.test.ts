// ABOUTME: Unit tests for pomodoro pure helpers — calcTodaySessionCount, updatePomodoroHistory, calcLast14Days, calcSessionWeekTrend, calcSessionCountStr, calcPomodoroBadge, calcFocusStreak, phaseAccent, phaseLabel, sessionGoalPct, formatLifetime, playPhaseDone, calcPomodoroMorningReminder, calcPomodoroEveningReminder, calcPomodoroLifetimeMilestone, calcWeeklyPomodoroReport, calcMonthlyPomodoroReport, calcQuarterlyPomodoroReport, calcYearlyPomodoroReport, calcPomodoroGoalStreak, calcPomodoroRecentAvg, calcPomodoroWeekRecord, calcDayOfWeekPomodoroAvg, calcWeakPomodoroDay, calcBestPomodoroDay, calcPomodoroWeekGoalDays, calcPomodoroMonthGoalDays
// ABOUTME: Covers today-count reset/increment, 14-day history upsert, date range derivation, prev-7/cur-7 trend logic, badge string (incl. week sessions 7d·N↑), focus streak, section collapsed badge, phase UI mapping, goal-progress percentage, lifetime format, audio feedback graceful fallback, morning start nudge, evening goal-gap nudge, lifetime milestone crossing, weekly pomodoro session report, monthly pomodoro session report, quarterly pomodoro session report, yearly pomodoro session report, goal-streak consecutive past days, recent rolling average sessions (today excluded), ISO-week record pace comparison (current week vs same-length prev-week window), per-weekday pomodoro session average with weak/best day detection, weekly goal-hit day count (calcPomodoroWeekGoalDays), and 14-day rolling goal-hit day count for monthly badge (calcPomodoroMonthGoalDays)

import { describe, it, expect } from "vitest";
import { calcLast14Days, calcSessionWeekTrend, calcTodaySessionCount, updatePomodoroHistory, calcSessionCountStr, calcPomodoroBadge, calcFocusStreak, phaseAccent, phaseLabel, sessionGoalPct, formatLifetime, playPhaseDone, calcPomodoroMorningReminder, calcPomodoroEveningReminder, calcPomodoroLifetimeMilestone, calcWeeklyPomodoroReport, calcMonthlyPomodoroReport, calcQuarterlyPomodoroReport, calcYearlyPomodoroReport, calcPomodoroGoalStreak, calcPomodoroRecentAvg, calcPomodoroWeekRecord, calcDayOfWeekPomodoroAvg, calcWeakPomodoroDay, calcBestPomodoroDay, calcPomodoroWeekGoalDays, calcPomodoroMonthGoalDays } from "./pomodoro";
import { colors } from "../theme";
import type { PomodoroDay } from "../types";

// Shared fixture: derived from calcLast14Days so partitioning assumptions stay consistent.
// Any change to calcLast14Days semantics (e.g., today at index 12) would immediately fail
// both the calcLast14Days tests AND the calcSessionWeekTrend tests.
const LAST14 = calcLast14Days("2026-03-15");

describe("calcLast14Days", () => {
  const TODAY = "2026-03-15";

  it("should return exactly 14 dates", () => {
    expect(calcLast14Days(TODAY)).toHaveLength(14);
  });

  it("should have today as the last element (index 13)", () => {
    const days = calcLast14Days(TODAY);
    expect(days[13]).toBe(TODAY);
  });

  it("should have 13 days ago as the first element (index 0)", () => {
    const days = calcLast14Days(TODAY);
    expect(days[0]).toBe("2026-03-02");
  });

  it("should order dates ascending (oldest first)", () => {
    const days = calcLast14Days(TODAY);
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
  });

  it("should produce YYYY-MM-DD formatted dates", () => {
    const days = calcLast14Days(TODAY);
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    days.forEach(d => expect(d).toMatch(pattern));
  });

  it("should handle month boundary correctly (March 1 → Feb dates)", () => {
    const days = calcLast14Days("2026-03-05");
    expect(days[0]).toBe("2026-02-20");
    expect(days[13]).toBe("2026-03-05");
  });

  it("should handle year boundary correctly (Jan 5 spans into previous December)", () => {
    const days = calcLast14Days("2026-01-05");
    expect(days[0]).toBe("2025-12-23");
    expect(days[13]).toBe("2026-01-05");
  });

  it("should handle leap year February correctly (Feb 29 exists in 2028)", () => {
    const days = calcLast14Days("2028-03-05");
    // 13 days before 2028-03-05 is 2028-02-21
    expect(days[0]).toBe("2028-02-21");
    expect(days[13]).toBe("2028-03-05");
    // Feb 29 should appear in the range (day 9 = 2028-03-01, day 8 = 2028-02-29)
    expect(days.includes("2028-02-29")).toBe(true);
  });

  it("should produce consecutive days (each date immediately follows the previous in string sort order)", () => {
    // Compare by string sort rather than ms-diff: YYYY-MM-DD lexicographic order equals
    // chronological order, and this comparison is DST-safe (avoids the 23h spring-forward issue).
    const days = calcLast14Days(TODAY);
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
    // Cross-check: the span from first to last is exactly 13 days
    const first = new Date(days[0] + "T00:00:00Z").getTime();
    const last  = new Date(days[13] + "T00:00:00Z").getTime();
    expect(last - first).toBe(13 * 86400000);
  });
});

describe("calcSessionWeekTrend", () => {
  // LAST14 is the module-level fixture (calcLast14Days("2026-03-15"))
  // prev7 = LAST14[0..6] = 2026-03-02..08
  // cur7  = LAST14[7..13] = 2026-03-09..15

  it("should return null when sessionHistory is empty", () => {
    expect(calcSessionWeekTrend([], LAST14)).toBeNull();
  });

  it("should return cur7=0 and prev7=0 when no sessions fall in the 14-day window", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-01", count: 5 }, // far in the past, outside window
    ];
    const result = calcSessionWeekTrend(history, LAST14);
    expect(result).not.toBeNull();
    expect(result!.cur7).toBe(0);
    expect(result!.prev7).toBe(0);
    expect(result!.trend).toBe("");
  });

  it("should sum sessions in cur7 (last14Days[7..13]) correctly", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 2 }, // cur7
      { date: "2026-03-12", count: 3 }, // cur7
      { date: "2026-03-15", count: 1 }, // cur7 (today)
    ];
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.cur7).toBe(6); // 2+3+1
    expect(result.prev7).toBe(0);
  });

  it("should sum sessions in prev7 (last14Days[0..6]) correctly", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-02", count: 1 }, // prev7
      { date: "2026-03-05", count: 4 }, // prev7
    ];
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.prev7).toBe(5); // 1+4
    expect(result.cur7).toBe(0);
  });

  it("should return trend '↑' when cur7 > prev7", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-02", count: 2 }, // prev7 → total 2
      { date: "2026-03-10", count: 5 }, // cur7  → total 5
    ];
    expect(calcSessionWeekTrend(history, LAST14)!.trend).toBe("↑");
  });

  it("should return trend '↓' when cur7 < prev7", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-03", count: 8 }, // prev7 → total 8
      { date: "2026-03-11", count: 1 }, // cur7  → total 1
    ];
    expect(calcSessionWeekTrend(history, LAST14)!.trend).toBe("↓");
  });

  it("should return trend '' when cur7 === prev7", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-04", count: 3 }, // prev7
      { date: "2026-03-13", count: 3 }, // cur7
    ];
    expect(calcSessionWeekTrend(history, LAST14)!.trend).toBe("");
  });

  it("should return trend '' when both cur7 and prev7 are 0", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-01", count: 10 }, // outside window
    ];
    expect(calcSessionWeekTrend(history, LAST14)!.trend).toBe("");
  });

  it("should populate histMap with session counts from history", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-10", count: 4 },
      { date: "2026-03-14", count: 2 },
    ];
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.histMap.get("2026-03-10")).toBe(4);
    expect(result.histMap.get("2026-03-14")).toBe(2);
  });

  it("should return undefined (not 0) from histMap for dates not in sessionHistory", () => {
    const history: PomodoroDay[] = [{ date: "2026-03-10", count: 3 }];
    const result = calcSessionWeekTrend(history, LAST14)!;
    // histMap.get returns undefined for missing keys; callers use ?? 0 for display
    expect(result.histMap.get("2026-03-11")).toBeUndefined();
  });

  it("should handle a single-entry sessionHistory spanning the window", () => {
    const history: PomodoroDay[] = [{ date: "2026-03-15", count: 5 }]; // today
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.cur7).toBe(5);
    expect(result.prev7).toBe(0);
    expect(result.trend).toBe("↑");
  });

  it("should handle history entries outside the 14-day window gracefully (ignored in sums)", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-01", count: 99 }, // way outside window
      { date: "2026-03-10", count: 2 },  // inside cur7
    ];
    const result = calcSessionWeekTrend(history, LAST14)!;
    expect(result.cur7).toBe(2);
    expect(result.prev7).toBe(0);
  });
});

describe("calcTodaySessionCount", () => {
  const TODAY = "2026-03-15";

  it("should return 1 when sessionDate is undefined (first session ever)", () => {
    expect(calcTodaySessionCount(undefined, undefined, TODAY)).toBe(1);
  });

  it("should return 1 when sessionDate is a past date (new day, reset)", () => {
    expect(calcTodaySessionCount("2026-03-14", 7, TODAY)).toBe(1);
  });

  it("should return 1 when sessionDate equals today but sessionCount is undefined", () => {
    // Defensive: sessionDate matches but count absent — treat as first
    expect(calcTodaySessionCount(TODAY, undefined, TODAY)).toBe(1);
  });

  it("should return 2 when sessionDate equals today and sessionCount is 1", () => {
    expect(calcTodaySessionCount(TODAY, 1, TODAY)).toBe(2);
  });

  it("should return 6 when sessionDate equals today and sessionCount is 5", () => {
    expect(calcTodaySessionCount(TODAY, 5, TODAY)).toBe(6);
  });

  it("should reset on any date mismatch, regardless of session count magnitude", () => {
    expect(calcTodaySessionCount("2025-01-01", 999, TODAY)).toBe(1);
  });
});

describe("updatePomodoroHistory", () => {
  const TODAY = "2026-03-15";

  it("should return a single-entry array when history is empty", () => {
    const result = updatePomodoroHistory([], TODAY, 3);
    expect(result).toEqual([{ date: TODAY, count: 3 }]);
  });

  it("should append today when today is not yet in history", () => {
    const history: PomodoroDay[] = [{ date: "2026-03-14", count: 2 }];
    const result = updatePomodoroHistory(history, TODAY, 5);
    expect(result).toContainEqual({ date: TODAY, count: 5 });
    expect(result).toContainEqual({ date: "2026-03-14", count: 2 });
    expect(result).toHaveLength(2);
  });

  it("should replace today's existing entry with the new count", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-14", count: 2 },
      { date: TODAY, count: 3 },
    ];
    const result = updatePomodoroHistory(history, TODAY, 5);
    // Only one entry for today, with updated count
    const todayEntries = result.filter(d => d.date === TODAY);
    expect(todayEntries).toHaveLength(1);
    expect(todayEntries[0].count).toBe(5);
  });

  it("should return entries sorted ascending by date", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-10", count: 1 },
      { date: "2026-03-12", count: 2 },
    ];
    const result = updatePomodoroHistory(history, TODAY, 4);
    expect(result[0].date).toBe("2026-03-10");
    expect(result[1].date).toBe("2026-03-12");
    expect(result[2].date).toBe(TODAY);
  });

  it("should cap at 14 entries when history is full and today is not in it", () => {
    // Build 14 past entries — adding today makes 15, so oldest is dropped
    const history: PomodoroDay[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      count: i + 1,
    }));
    const result = updatePomodoroHistory(history, TODAY, 1);
    expect(result).toHaveLength(14);
    expect(result[result.length - 1].date).toBe(TODAY);
    // Oldest entry (2026-02-01) should have been dropped
    expect(result.some(d => d.date === "2026-02-01")).toBe(false);
  });

  it("should stay at 14 entries when history already has today and is at the cap", () => {
    // 13 past entries + today = 14 in, replace today → still 14
    const history: PomodoroDay[] = [
      ...Array.from({ length: 13 }, (_, i) => ({
        date: `2026-02-${String(i + 1).padStart(2, "0")}`,
        count: i + 1,
      })),
      { date: TODAY, count: 2 },
    ];
    const result = updatePomodoroHistory(history, TODAY, 8);
    expect(result).toHaveLength(14);
    expect(result.find(d => d.date === TODAY)?.count).toBe(8);
  });

  it("should not mutate the original history array", () => {
    const history: PomodoroDay[] = [{ date: "2026-03-14", count: 1 }];
    const original = [...history];
    updatePomodoroHistory(history, TODAY, 3);
    expect(history).toEqual(original);
  });
});

describe("calcPomodoroBadge", () => {
  it("should return null when sessionsToday is 0 and sessionGoal is absent (nothing to show)", () => {
    expect(calcPomodoroBadge(0, undefined, 25)).toBeNull();
  });

  it("should return '🍅 ×0/8' without time suffix when sessionsToday is 0 but goal is set", () => {
    expect(calcPomodoroBadge(0, 8, 25)).toBe("🍅 ×0/8");
  });

  it("should return '🍅 ×1 · 25m' when 1 session, no goal, 25min focus", () => {
    expect(calcPomodoroBadge(1, undefined, 25)).toBe("🍅 ×1 · 25m");
  });

  it("should return '🍅 ×3/8 · 1h 15m' when 3 of 8 done, 25min focus", () => {
    expect(calcPomodoroBadge(3, 8, 25)).toBe("🍅 ×3/8 · 1h 15m");
  });

  it("should return '🍅 ✓8 · 3h 20m' when 8 sessions exactly meet goal, 25min focus", () => {
    expect(calcPomodoroBadge(8, 8, 25)).toBe("🍅 ✓8 · 3h 20m");
  });

  it("should return '🍅 ✓10 · 4h 10m' when 10 sessions exceed goal, 25min focus", () => {
    expect(calcPomodoroBadge(10, 8, 25)).toBe("🍅 ✓10 · 4h 10m");
  });

  it("should return '🍅 ×2 · 30m' for 2 sessions with 15min focus", () => {
    expect(calcPomodoroBadge(2, undefined, 15)).toBe("🍅 ×2 · 30m");
  });

  it("should return '🍅 ×4 · 1h' for 4 sessions of 15 minutes (exactly 60min — no trailing 0m)", () => {
    expect(calcPomodoroBadge(4, undefined, 15)).toBe("🍅 ×4 · 1h");
  });

  it("should use focusMins for time calculation, not a hardcoded 25", () => {
    // 3 sessions × 45min = 2h 15m
    expect(calcPomodoroBadge(3, undefined, 45)).toBe("🍅 ×3 · 2h 15m");
  });

  it("should append '🔥Nd streak' suffix when focusStreak is 2 or more", () => {
    expect(calcPomodoroBadge(2, undefined, 25, 3)).toBe("🍅 ×2 · 50m · 🔥3d");
  });

  it("should not append streak suffix when focusStreak is 1 (single day is not notable)", () => {
    expect(calcPomodoroBadge(2, undefined, 25, 1)).toBe("🍅 ×2 · 50m");
  });

  it("should not append streak suffix when focusStreak is 0", () => {
    expect(calcPomodoroBadge(2, undefined, 25, 0)).toBe("🍅 ×2 · 50m");
  });

  it("should not append streak suffix when focusStreak is absent", () => {
    expect(calcPomodoroBadge(2, undefined, 25)).toBe("🍅 ×2 · 50m");
  });

  it("should include streak suffix even when goal is set", () => {
    expect(calcPomodoroBadge(3, 8, 25, 5)).toBe("🍅 ×3/8 · 1h 15m · 🔥5d");
  });

  it("should append '7d·N↑' suffix when weekSessions is positive and trend is ↑", () => {
    expect(calcPomodoroBadge(2, undefined, 25, undefined, 12, "↑")).toBe("🍅 ×2 · 50m · 7d·12↑");
  });

  it("should append '7d·N↓' suffix when weekSessions is positive and trend is ↓", () => {
    expect(calcPomodoroBadge(2, undefined, 25, undefined, 8, "↓")).toBe("🍅 ×2 · 50m · 7d·8↓");
  });

  it("should append '7d·N' without arrow when weekTrend is empty string (stable)", () => {
    expect(calcPomodoroBadge(2, undefined, 25, undefined, 5, "")).toBe("🍅 ×2 · 50m · 7d·5");
  });

  it("should not append week suffix when weekSessions is null", () => {
    expect(calcPomodoroBadge(2, undefined, 25, undefined, null, "↑")).toBe("🍅 ×2 · 50m");
  });

  it("should not append week suffix when weekSessions is undefined", () => {
    expect(calcPomodoroBadge(2, undefined, 25, undefined, undefined, "↑")).toBe("🍅 ×2 · 50m");
  });

  it("should not append week suffix when weekSessions is 0", () => {
    expect(calcPomodoroBadge(2, undefined, 25, undefined, 0, "")).toBe("🍅 ×2 · 50m");
  });

  it("should include both streak and week suffixes when both are present", () => {
    expect(calcPomodoroBadge(3, 8, 25, 5, 12, "↑")).toBe("🍅 ×3/8 · 1h 15m · 🔥5d · 7d·12↑");
  });

  it("should include week suffix without streak when focusStreak is absent", () => {
    expect(calcPomodoroBadge(1, 4, 25, undefined, 6, "↓")).toBe("🍅 ×1/4 · 25m · 7d·6↓");
  });
});

describe("calcSessionCountStr", () => {
  it("should return null when sessionsToday is 0 and sessionGoal is undefined (nothing to show)", () => {
    expect(calcSessionCountStr(0, undefined)).toBeNull();
  });

  it("should return '×0/8' when sessionsToday is 0 and sessionGoal is set (goal set, no progress)", () => {
    expect(calcSessionCountStr(0, 8)).toBe("×0/8");
  });

  it("should return '×3' when sessionsToday is 3 and sessionGoal is undefined", () => {
    expect(calcSessionCountStr(3, undefined)).toBe("×3");
  });

  it("should return '×3/8' when sessionsToday is 3 and sessionGoal is 8 (in progress)", () => {
    expect(calcSessionCountStr(3, 8)).toBe("×3/8");
  });

  it("should return '✓8' when sessionsToday equals sessionGoal (goal exactly reached)", () => {
    expect(calcSessionCountStr(8, 8)).toBe("✓8");
  });

  it("should return '✓10' when sessionsToday exceeds sessionGoal (goal exceeded)", () => {
    expect(calcSessionCountStr(10, 8)).toBe("✓10");
  });

  it("should return '×1' when sessionsToday is 1 and no goal (minimal non-null case)", () => {
    expect(calcSessionCountStr(1, undefined)).toBe("×1");
  });

  it("should return '✓1' when sessionsToday is 1 and sessionGoal is 1 (immediate goal reached)", () => {
    expect(calcSessionCountStr(1, 1)).toBe("✓1");
  });
});

describe("phaseAccent", () => {
  it("should return statusActive color for focus phase", () => {
    expect(phaseAccent("focus")).toBe(colors.statusActive);
  });

  it("should return statusProgress color for break phase", () => {
    expect(phaseAccent("break")).toBe(colors.statusProgress);
  });

  it("should return statusLongBreak color for longBreak phase", () => {
    expect(phaseAccent("longBreak")).toBe(colors.statusLongBreak);
  });
});

describe("phaseLabel", () => {
  it("should return '집중' for focus phase", () => {
    expect(phaseLabel("focus")).toBe("집중");
  });

  it("should return '휴식' for break phase", () => {
    expect(phaseLabel("break")).toBe("휴식");
  });

  it("should return '긴 휴식' for longBreak phase", () => {
    expect(phaseLabel("longBreak")).toBe("긴 휴식");
  });
});

describe("formatLifetime", () => {
  it("should return '0m' when mins is 0", () => {
    expect(formatLifetime(0)).toBe("0m");
  });

  it("should return '1m' when mins is 1", () => {
    expect(formatLifetime(1)).toBe("1m");
  });

  it("should return '59m' at the boundary just before 1 hour", () => {
    expect(formatLifetime(59)).toBe("59m");
  });

  it("should return '1h' when mins is exactly 60 (no trailing 0m)", () => {
    expect(formatLifetime(60)).toBe("1h");
  });

  it("should return '1h 1m' when mins is 61", () => {
    expect(formatLifetime(61)).toBe("1h 1m");
  });

  it("should return '1h 30m' when mins is 90", () => {
    expect(formatLifetime(90)).toBe("1h 30m");
  });

  it("should return '2h' when mins is exactly 120 (no trailing 0m)", () => {
    expect(formatLifetime(120)).toBe("2h");
  });

  it("should return '2h 1m' when mins is 121", () => {
    expect(formatLifetime(121)).toBe("2h 1m");
  });

  it("should return '23h 59m' for a large value", () => {
    expect(formatLifetime(1439)).toBe("23h 59m");
  });

  it("should pass through negative mins without crashing (data corruption guard — caller must sanitize)", () => {
    // Negative input is not a valid lifetimeMins value; documented here to show the function
    // does not throw and to make the absence of a guard explicit (caller responsibility).
    expect(() => formatLifetime(-1)).not.toThrow();
  });
});

describe("sessionGoalPct", () => {
  it("should return null when sessionGoal is undefined (no goal set)", () => {
    expect(sessionGoalPct(3, undefined)).toBeNull();
  });

  it("should return null when sessionGoal is 0 (guards division by zero)", () => {
    expect(sessionGoalPct(3, 0)).toBeNull();
  });

  it("should return 0 when sessionsToday is 0 and goal is set", () => {
    expect(sessionGoalPct(0, 8)).toBe(0);
  });

  it("should return rounded percentage (3/8 → 37.5 rounds to 38)", () => {
    expect(sessionGoalPct(3, 8)).toBe(38);
  });

  it("should return 50 when exactly half sessions done", () => {
    expect(sessionGoalPct(4, 8)).toBe(50);
  });

  it("should return 100 when sessions exactly equal goal", () => {
    expect(sessionGoalPct(8, 8)).toBe(100);
  });

  it("should clamp to 100 when sessions exceed goal", () => {
    expect(sessionGoalPct(10, 8)).toBe(100);
  });

  it("should return negative percentage for negative sessionsToday without crashing (caller responsibility to sanitize)", () => {
    // sessionsToday is injected from props; documented to show the function does not guard
    // against negative input — callers must sanitize before rendering a progress bar.
    expect(() => sessionGoalPct(-1, 8)).not.toThrow();
  });
});

describe("calcFocusStreak", () => {
  // Local date arithmetic — avoids UTC offset shifting (new Date(localStr).toISOString() is TZ-unsafe)
  const D = (offset: number) => {
    const d = new Date(2026, 2, 15 + offset); // month is 0-indexed; local time
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const TODAY = D(0);
  const YTD = D(-1);
  const D2 = D(-2);
  const D3 = D(-3);

  function day(date: string, count: number): PomodoroDay {
    return { date, count };
  }

  it("shouldReturn0WhenHistoryIsEmpty", () => {
    expect(calcFocusStreak([], TODAY)).toBe(0);
  });

  it("shouldReturn1WhenOnlyTodayHasSessions", () => {
    expect(calcFocusStreak([day(TODAY, 2)], TODAY)).toBe(1);
  });

  it("shouldReturn2WhenTodayAndYesterdayHaveSessions", () => {
    expect(calcFocusStreak([day(YTD, 1), day(TODAY, 3)], TODAY)).toBe(2);
  });

  it("shouldReturn0WhenTodayHasNoSessionsAndYesterdayHasNone", () => {
    expect(calcFocusStreak([day(D2, 2)], TODAY)).toBe(0);
  });

  it("shouldCountConsecutiveDaysBackwardFromToday", () => {
    expect(calcFocusStreak([day(D3, 1), day(D2, 2), day(YTD, 1), day(TODAY, 4)], TODAY)).toBe(4);
  });

  it("shouldStopAtGapAndNotCountDaysBeforeIt", () => {
    // D3 and D2 have sessions but YTD is missing → only TODAY counts
    expect(calcFocusStreak([day(D3, 1), day(D2, 2), day(TODAY, 1)], TODAY)).toBe(1);
  });

  it("shouldCountStreakEndingYesterdayWhenTodayHasNoSessions", () => {
    // User hasn't done a session today yet; streak still active from yesterday
    expect(calcFocusStreak([day(D2, 2), day(YTD, 3)], TODAY)).toBe(2);
  });

  it("shouldIgnoreZeroCountEntries", () => {
    // count=0 entries should break the streak just as missing entries do
    expect(calcFocusStreak([day(YTD, 0), day(TODAY, 2)], TODAY)).toBe(1);
  });

  it("shouldReturn0WhenOnlyOlderHistoryExistsWithGap", () => {
    // Only D3 has sessions — gap to today → streak 0
    expect(calcFocusStreak([day(D3, 5)], TODAY)).toBe(0);
  });
});

describe("playPhaseDone", () => {
  // jsdom has no AudioContext — these tests verify graceful no-op in restricted environments.
  // The audio synthesis path is tested indirectly: if the guard is missing the function throws.
  it("should resolve without error for focus phase when AudioContext is unavailable", async () => {
    await expect(playPhaseDone("focus")).resolves.toBeUndefined();
  });

  it("should resolve without error for break phase when AudioContext is unavailable", async () => {
    await expect(playPhaseDone("break")).resolves.toBeUndefined();
  });

  it("should resolve without error for longBreak phase when AudioContext is unavailable", async () => {
    await expect(playPhaseDone("longBreak")).resolves.toBeUndefined();
  });
});

describe("calcPomodoroMorningReminder", () => {
  it("should return nudge body when sessionsToday is 0", () => {
    expect(calcPomodoroMorningReminder(0)).toBe("🍅 오늘 집중 세션을 시작해보세요!");
  });

  it("should return null when sessionsToday is 1", () => {
    expect(calcPomodoroMorningReminder(1)).toBeNull();
  });

  it("should return null when sessionsToday is greater than 1", () => {
    expect(calcPomodoroMorningReminder(5)).toBeNull();
  });

  it("should return nudge body when sessionsToday is negative (caller guarantees ≥0; negative treated as no sessions)", () => {
    expect(calcPomodoroMorningReminder(-1)).toBe("🍅 오늘 집중 세션을 시작해보세요!");
  });
});

describe("calcPomodoroEveningReminder", () => {
  it("should return reminder body when no goal and 0 sessions today", () => {
    expect(calcPomodoroEveningReminder(0, undefined)).toBe("🍅 오늘 아직 집중 세션이 없어요!");
  });

  it("should return null when no goal and 1 session done", () => {
    expect(calcPomodoroEveningReminder(1, undefined)).toBeNull();
  });

  it("should return null when no goal and multiple sessions done", () => {
    expect(calcPomodoroEveningReminder(4, undefined)).toBeNull();
  });

  it("should return reminder with full gap when goal set and 0 sessions done", () => {
    expect(calcPomodoroEveningReminder(0, 4)).toBe("🍅 목표까지 4세션 남았어요! (0/4)");
  });

  it("should return reminder with partial gap when goal set and partially done", () => {
    expect(calcPomodoroEveningReminder(2, 4)).toBe("🍅 목표까지 2세션 남았어요! (2/4)");
  });

  it("should return null when goal exactly reached", () => {
    expect(calcPomodoroEveningReminder(4, 4)).toBeNull();
  });

  it("should return null when sessions exceed goal", () => {
    expect(calcPomodoroEveningReminder(5, 4)).toBeNull();
  });

  it("should treat sessionGoal=0 as no goal (returns reminder when 0 sessions)", () => {
    expect(calcPomodoroEveningReminder(0, 0)).toBe("🍅 오늘 아직 집중 세션이 없어요!");
  });

  it("should return reminder body when sessionsToday is negative and no goal (clamped to 0)", () => {
    expect(calcPomodoroEveningReminder(-1, undefined)).toBe("🍅 오늘 아직 집중 세션이 없어요!");
  });

  it("should return reminder body when sessionsToday is negative with goal set (clamped to 0, displays 0/goal)", () => {
    expect(calcPomodoroEveningReminder(-1, 4)).toBe("🍅 목표까지 4세션 남았어요! (0/4)");
  });
});

describe("calcPomodoroLifetimeMilestone", () => {
  it("should return null when no milestone is crossed (both values in same band)", () => {
    expect(calcPomodoroLifetimeMilestone(65, 90)).toBeNull();
  });

  it("should return null when newMins equals prevMins (no change)", () => {
    expect(calcPomodoroLifetimeMilestone(60, 60)).toBeNull();
  });

  it("should return null when newMins is less than prevMins (regression guard)", () => {
    expect(calcPomodoroLifetimeMilestone(100, 60)).toBeNull();
  });

  it("should return null when both values are below the first milestone", () => {
    expect(calcPomodoroLifetimeMilestone(0, 25)).toBeNull();
  });

  it("should fire 1시간 milestone when crossing 60 mins exactly", () => {
    expect(calcPomodoroLifetimeMilestone(55, 60)).toBe("🎉 누적 집중 1시간 달성!");
  });

  it("should fire 1시간 milestone when crossing 60 mins by more than one session", () => {
    expect(calcPomodoroLifetimeMilestone(35, 85)).toBe("🎉 누적 집중 1시간 달성!");
  });

  it("should fire 5시간 milestone when crossing 300 mins", () => {
    expect(calcPomodoroLifetimeMilestone(275, 325)).toBe("🎉 누적 집중 5시간 달성!");
  });

  it("should fire 10시간 milestone when crossing 600 mins", () => {
    expect(calcPomodoroLifetimeMilestone(595, 625)).toBe("🎉 누적 집중 10시간 달성!");
  });

  it("should fire 25시간 milestone when crossing 1500 mins", () => {
    expect(calcPomodoroLifetimeMilestone(1495, 1525)).toBe("🎉 누적 집중 25시간 달성!");
  });

  it("should fire 50시간 milestone when crossing 3000 mins", () => {
    expect(calcPomodoroLifetimeMilestone(2995, 3025)).toBe("🎉 누적 집중 50시간 달성!");
  });

  it("should fire 100시간 milestone when crossing 6000 mins", () => {
    expect(calcPomodoroLifetimeMilestone(5995, 6025)).toBe("🎉 누적 집중 100시간 달성!");
  });

  it("should fire the highest milestone when multiple are crossed in one jump (mid range)", () => {
    // Skipping from 0 to 700 crosses 60, 300, 600 — highest is 600 (10시간)
    expect(calcPomodoroLifetimeMilestone(0, 700)).toBe("🎉 누적 집중 10시간 달성!");
  });

  it("should fire the highest milestone when all milestones are crossed at once", () => {
    // Skipping from 0 to 7000 crosses all milestones — highest is 6000 (100시간)
    expect(calcPomodoroLifetimeMilestone(0, 7000)).toBe("🎉 누적 집중 100시간 달성!");
  });

  it("should return null when already past milestone (1시간 already crossed)", () => {
    expect(calcPomodoroLifetimeMilestone(60, 85)).toBeNull();
  });

  it("should return null when both values equal the same milestone", () => {
    // prevMins already AT the milestone — no crossing occurred
    expect(calcPomodoroLifetimeMilestone(300, 325)).toBeNull();
  });
});

describe("calcWeeklyPomodoroReport", () => {
  // last7 = Mon–Sun of the previous week (ending 2026-03-15 Sunday)
  const last7 = [
    "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12",
    "2026-03-13", "2026-03-14", "2026-03-15",
  ];

  it("should return null when history is empty", () => {
    expect(calcWeeklyPomodoroReport([], last7)).toBeNull();
  });

  it("should return null when fewer than 3 active days in window", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 5 },
      { date: "2026-03-10", count: 3 },
    ];
    expect(calcWeeklyPomodoroReport(history, last7)).toBeNull();
  });

  it("should return null when entries are outside the last7 window", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-01", count: 5 },
      { date: "2026-03-02", count: 5 },
      { date: "2026-03-03", count: 5 },
    ];
    expect(calcWeeklyPomodoroReport(history, last7)).toBeNull();
  });

  it("should return null for count=0 entries (not counted as active days)", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 0 },
      { date: "2026-03-10", count: 5 },
      { date: "2026-03-11", count: 5 },
    ];
    // only 2 active days (count>0) → null
    expect(calcWeeklyPomodoroReport(history, last7)).toBeNull();
  });

  it("should return 🔥 message when totalSessions >= 25", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 5 },
      { date: "2026-03-10", count: 5 },
      { date: "2026-03-11", count: 5 },
      { date: "2026-03-12", count: 5 },
      { date: "2026-03-13", count: 5 },
    ];
    const result = calcWeeklyPomodoroReport(history, last7);
    expect(result).toContain("🔥");
    expect(result).toContain("25세션");
    expect(result).toContain("5일 활성");
  });

  it("should return 🔥 at boundary (totalSessions === 25)", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 9 },
      { date: "2026-03-10", count: 8 },
      { date: "2026-03-11", count: 8 },
    ];
    const result = calcWeeklyPomodoroReport(history, last7);
    expect(result).toContain("🔥");
    expect(result).toContain("25세션");
  });

  it("should return ✅ message when totalSessions is between 10 and 24", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 6 },
      { date: "2026-03-10", count: 5 },
      { date: "2026-03-11", count: 4 },
    ];
    const result = calcWeeklyPomodoroReport(history, last7);
    expect(result).toContain("✅");
    expect(result).toContain("15세션");
    expect(result).toContain("3일 활성");
  });

  it("should return ✅ at lower boundary (totalSessions === 10)", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 4 },
      { date: "2026-03-10", count: 3 },
      { date: "2026-03-11", count: 3 },
    ];
    const result = calcWeeklyPomodoroReport(history, last7);
    expect(result).toContain("✅");
    expect(result).toContain("10세션");
  });

  it("should return 💪 message when totalSessions < 10", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 2 },
      { date: "2026-03-10", count: 2 },
      { date: "2026-03-11", count: 2 },
    ];
    const result = calcWeeklyPomodoroReport(history, last7);
    expect(result).toContain("💪");
    expect(result).toContain("6세션");
    expect(result).toContain("3일 활성");
  });

  it("should ignore entries outside the last7 window in total count", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-01", count: 10 }, // outside window — must not count
      { date: "2026-03-09", count: 5 },
      { date: "2026-03-10", count: 5 },
      { date: "2026-03-11", count: 5 },
    ];
    const result = calcWeeklyPomodoroReport(history, last7);
    expect(result).toContain("15세션"); // only 5+5+5, not 10+5+5+5
    expect(result).toContain("3일 활성");
  });
});

describe("calcMonthlyPomodoroReport", () => {
  // prevMonthDays = all 31 days of December 2025 (a 31-day month for boundary testing).
  const DEC_2025 = Array.from({ length: 31 }, (_, i) => `2025-12-${String(i + 1).padStart(2, "0")}`);

  it("should return null when history is empty", () => {
    expect(calcMonthlyPomodoroReport([], DEC_2025)).toBeNull();
  });

  it("should return null when fewer than 3 active days in window", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-01", count: 5 },
      { date: "2025-12-02", count: 3 },
    ];
    expect(calcMonthlyPomodoroReport(history, DEC_2025)).toBeNull();
  });

  it("should return null when all entries are outside the prevMonthDays window", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-05", count: 5 },
      { date: "2026-01-06", count: 5 },
      { date: "2026-01-07", count: 5 },
    ];
    expect(calcMonthlyPomodoroReport(history, DEC_2025)).toBeNull();
  });

  it("should not count count=0 entries as active days", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-01", count: 0 },
      { date: "2025-12-02", count: 5 },
      { date: "2025-12-03", count: 3 },
    ];
    // only 2 active days (count > 0) → null
    expect(calcMonthlyPomodoroReport(history, DEC_2025)).toBeNull();
  });

  it("should return 🔥 message when totalSessions >= 100", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-01", count: 20 },
      { date: "2025-12-02", count: 20 },
      { date: "2025-12-03", count: 20 },
      { date: "2025-12-04", count: 20 },
      { date: "2025-12-05", count: 20 },
    ];
    const result = calcMonthlyPomodoroReport(history, DEC_2025);
    expect(result).toContain("🔥");
    expect(result).toContain("100세션");
    expect(result).toContain("5일 활성");
  });

  it("should return 🔥 at boundary (totalSessions === 100)", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-01", count: 40 },
      { date: "2025-12-02", count: 30 },
      { date: "2025-12-03", count: 30 },
    ];
    const result = calcMonthlyPomodoroReport(history, DEC_2025);
    expect(result).toContain("🔥");
    expect(result).toContain("100세션");
  });

  it("should return ✅ message when totalSessions is between 40 and 99", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-01", count: 20 },
      { date: "2025-12-02", count: 15 },
      { date: "2025-12-03", count: 15 },
    ];
    const result = calcMonthlyPomodoroReport(history, DEC_2025);
    expect(result).toContain("✅");
    expect(result).toContain("50세션");
    expect(result).toContain("3일 활성");
  });

  it("should return ✅ at boundary (totalSessions === 40)", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-01", count: 20 },
      { date: "2025-12-02", count: 10 },
      { date: "2025-12-03", count: 10 },
    ];
    const result = calcMonthlyPomodoroReport(history, DEC_2025);
    expect(result).toContain("✅");
    expect(result).toContain("40세션");
  });

  it("should return 💪 message when totalSessions < 40", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-01", count: 5 },
      { date: "2025-12-02", count: 5 },
      { date: "2025-12-03", count: 5 },
    ];
    const result = calcMonthlyPomodoroReport(history, DEC_2025);
    expect(result).toContain("💪");
    expect(result).toContain("15세션");
    expect(result).toContain("3일 활성");
  });

  it("should ignore entries outside prevMonthDays window in total count", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-05", count: 50 }, // outside window — must not count
      { date: "2025-12-01", count: 10 },
      { date: "2025-12-02", count: 10 },
      { date: "2025-12-03", count: 10 },
    ];
    const result = calcMonthlyPomodoroReport(history, DEC_2025);
    expect(result).toContain("30세션"); // only 10+10+10, not 50+10+10+10
    expect(result).toContain("3일 활성");
  });

  it("should return 💪 at ✅ boundary minus one (totalSessions === 39)", () => {
    // 39 is one below the ✅ threshold (40) — must emit 💪, not ✅
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 13 },
      { date: "2025-12-30", count: 13 },
      { date: "2025-12-31", count: 13 },
    ];
    const result = calcMonthlyPomodoroReport(history, DEC_2025);
    expect(result).toContain("💪");
    expect(result).toContain("39세션");
  });

  it("should return ✅ at 🔥 boundary minus one (totalSessions === 99)", () => {
    // 99 is one below the 🔥 threshold (100) — must emit ✅, not 🔥
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 33 },
      { date: "2025-12-30", count: 33 },
      { date: "2025-12-31", count: 33 },
    ];
    const result = calcMonthlyPomodoroReport(history, DEC_2025);
    expect(result).toContain("✅");
    expect(result).toContain("99세션");
  });

  it("should work correctly with at most 14 history entries (pomodoroHistory cap constraint)", () => {
    // pomodoroHistory is capped at 14 days; simulate a realistic 14-entry history
    // covering the last 14 days of December 2025 (Dec 18–31).
    const history: PomodoroDay[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2025-12-${String(18 + i).padStart(2, "0")}`,
      count: 3, // 14 days × 3 sessions = 42 → ✅
    }));
    const result = calcMonthlyPomodoroReport(history, DEC_2025);
    expect(result).toContain("✅");
    expect(result).toContain("42세션");
    expect(result).toContain("14일 활성");
  });
});

describe("calcPomodoroGoalStreak", () => {
  const TODAY = "2026-03-15";

  it("shouldReturnZeroWhenHistoryIsEmpty", () => {
    expect(calcPomodoroGoalStreak([], 4, TODAY)).toBe(0);
  });

  it("shouldReturnZeroWhenSessionGoalIsZero", () => {
    const history: PomodoroDay[] = [{ date: "2026-03-14", count: 4 }];
    expect(calcPomodoroGoalStreak(history, 0, TODAY)).toBe(0);
  });

  it("shouldReturnZeroWhenSessionGoalIsNegative", () => {
    const history: PomodoroDay[] = [{ date: "2026-03-14", count: 4 }];
    expect(calcPomodoroGoalStreak(history, -1, TODAY)).toBe(0);
  });

  it("shouldReturnZeroWhenYesterdayDidNotMeetGoal", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-14", count: 3 }, // goal=4, count=3 → not met
    ];
    expect(calcPomodoroGoalStreak(history, 4, TODAY)).toBe(0);
  });

  it("shouldReturnOneWhenOnlyYesterdayMetGoal", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-14", count: 4 }, // met
      { date: "2026-03-13", count: 2 }, // not met — breaks streak
    ];
    expect(calcPomodoroGoalStreak(history, 4, TODAY)).toBe(1);
  });

  it("shouldReturnTwoWhenLastTwoDaysMetGoal", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-14", count: 5 }, // met (≥4)
      { date: "2026-03-13", count: 4 }, // met (=4)
      { date: "2026-03-12", count: 1 }, // not met
    ];
    expect(calcPomodoroGoalStreak(history, 4, TODAY)).toBe(2);
  });

  it("shouldCountFiveConsecutiveDays", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-14", count: 4 },
      { date: "2026-03-13", count: 6 },
      { date: "2026-03-12", count: 4 },
      { date: "2026-03-11", count: 5 },
      { date: "2026-03-10", count: 4 },
      { date: "2026-03-09", count: 2 }, // not met — streak stops here
    ];
    expect(calcPomodoroGoalStreak(history, 4, TODAY)).toBe(5);
  });

  it("shouldTreatAbsentDateAsZeroSessions", () => {
    // yesterday absent → 0 sessions < goal → streak breaks immediately
    const history: PomodoroDay[] = [
      { date: "2026-03-13", count: 4 }, // day before yesterday met — irrelevant if yesterday absent
    ];
    expect(calcPomodoroGoalStreak(history, 4, TODAY)).toBe(0);
  });

  it("shouldNotCountTodayInStreak", () => {
    // today has a high count but streak counts only PAST days
    const history: PomodoroDay[] = [
      { date: "2026-03-15", count: 10 }, // today — must be ignored
      { date: "2026-03-14", count: 2 },  // yesterday not met
    ];
    expect(calcPomodoroGoalStreak(history, 4, TODAY)).toBe(0);
  });

  it("shouldHandleMonthBoundaryCorrectly", () => {
    // today = 2026-03-01; yesterday = 2026-02-28
    const today = "2026-03-01";
    const history: PomodoroDay[] = [
      { date: "2026-02-28", count: 4 },
      { date: "2026-02-27", count: 4 },
    ];
    expect(calcPomodoroGoalStreak(history, 4, today)).toBe(2);
  });
});

describe("calcPomodoroRecentAvg", () => {
  const TODAY = "2026-03-15";

  it("shouldReturnZeroForEmptyHistory", () => {
    expect(calcPomodoroRecentAvg([], TODAY)).toBe(0);
  });

  it("shouldReturnZeroWhenHistoryContainsOnlyToday", () => {
    const history: PomodoroDay[] = [{ date: TODAY, count: 5 }];
    expect(calcPomodoroRecentAvg(history, TODAY)).toBe(0);
  });

  it("shouldAveragePastEntriesExcludingToday", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-13", count: 2 },
      { date: "2026-03-14", count: 4 },
      { date: TODAY, count: 10 }, // today — excluded
    ];
    expect(calcPomodoroRecentAvg(history, TODAY)).toBe(3); // (2+4)/2
  });

  it("shouldReturnAverageForSinglePastEntry", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-14", count: 6 },
    ];
    expect(calcPomodoroRecentAvg(history, TODAY)).toBe(6);
  });

  it("shouldIncludeAllPastDaysWhenTodayNotInHistory", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-12", count: 3 },
      { date: "2026-03-13", count: 5 },
      { date: "2026-03-14", count: 4 },
    ];
    expect(calcPomodoroRecentAvg(history, TODAY)).toBe(4); // (3+5+4)/3
  });

  it("shouldIncludeZeroCountPastEntriesInAverage", () => {
    // A day with 0 sessions is a valid low-productivity data point — it is included, not skipped.
    // This lowers the average baseline, making the pomodoro_today_above_avg threshold easier to reach.
    const history: PomodoroDay[] = [
      { date: "2026-03-13", count: 0 },
      { date: "2026-03-14", count: 4 },
    ];
    expect(calcPomodoroRecentAvg(history, TODAY)).toBe(2); // (0+4)/2
  });
});

describe("calcPomodoroWeekRecord", () => {
  // Monday anchor: "2024-01-15" is a confirmed Monday (mirrors insight.test.ts fixture).
  const MON = "2024-01-15"; // Monday, ISO position 1
  const TUE = "2024-01-16"; // Tuesday, ISO position 2
  const WED = "2024-01-17"; // Wednesday, ISO position 3
  const PREV_MON = "2024-01-08"; // previous week Monday
  const PREV_TUE = "2024-01-09"; // previous week Tuesday
  const PREV_WED = "2024-01-10"; // previous week Wednesday

  it("shouldReturnOnlySessionsTodayOnMondayWithEmptyHistory", () => {
    // Monday (isoPos=1): no past week days — only today vs. prev Monday
    const result = calcPomodoroWeekRecord([], 3, MON);
    expect(result.currentWeekTotal).toBe(3); // only sessionsToday
    expect(result.prevWeekTotal).toBe(0);    // no prev-Monday entry in history
  });

  it("shouldReturnCorrectTotalsOnTuesday", () => {
    const history = [
      { date: MON, count: 2 },      // current week Mon (past)
      { date: PREV_MON, count: 3 }, // prev week Mon
      { date: PREV_TUE, count: 2 }, // prev week Tue
    ];
    const result = calcPomodoroWeekRecord(history, 4, TUE);
    expect(result.currentWeekTotal).toBe(6); // 2 (Mon) + 4 (today)
    expect(result.prevWeekTotal).toBe(5);    // 3 + 2
  });

  it("shouldReturnCorrectTotalsOnWednesday", () => {
    const history = [
      { date: MON, count: 2 },      // current week Mon
      { date: TUE, count: 4 },      // current week Tue (past)
      { date: PREV_MON, count: 2 }, // prev week Mon
      { date: PREV_TUE, count: 3 }, // prev week Tue
      { date: PREV_WED, count: 2 }, // prev week Wed
    ];
    const result = calcPomodoroWeekRecord(history, 3, WED);
    expect(result.currentWeekTotal).toBe(9); // 2 + 4 + 3
    expect(result.prevWeekTotal).toBe(7);    // 2 + 3 + 2
  });

  it("shouldReturnZeroPrevWeekTotalWhenNoPrevWeekHistory", () => {
    const history = [{ date: MON, count: 5 }]; // only current week; no prev-week entries
    const result = calcPomodoroWeekRecord(history, 3, TUE);
    expect(result.currentWeekTotal).toBe(8); // 5 + 3
    expect(result.prevWeekTotal).toBe(0);
  });

  it("shouldReturnZeroTotalsWhenHistoryEmptyAndNoSessionsToday", () => {
    const result = calcPomodoroWeekRecord([], 0, WED);
    expect(result.currentWeekTotal).toBe(0);
    expect(result.prevWeekTotal).toBe(0);
  });

  it("shouldCountSessionsTodayForCurrentWeekNotFromHistory", () => {
    // Even if history has an entry for today, sessionsToday is the authoritative today-count.
    // calcPomodoroWeekRecord uses sessionsToday directly for today and ignores history[today].
    const history = [
      { date: WED, count: 99 }, // stale history entry for today — should be ignored
      { date: PREV_WED, count: 1 },
    ];
    const result = calcPomodoroWeekRecord(history, 4, WED);
    expect(result.currentWeekTotal).toBe(4); // 0 (Mon absent) + 0 (Tue absent) + 4 (sessionsToday)
    expect(result.prevWeekTotal).toBe(1);    // prev Wed only
  });

  it("shouldHandleSundayCorrectly", () => {
    // Sunday is the only day where jsDay=0 → isoPos must be 7 (not 0) to stay ISO-correct.
    // 2024-01-21 is a Sunday (+6 from confirmed Monday 2024-01-15).
    // daysSinceMonday=6: current week is Mon Jan 15–Sun Jan 21; prev week is Mon Jan 8–Sun Jan 14.
    const SUN = "2024-01-21";
    const PREV_SUN_MON = "2024-01-08"; // prev week Monday (13 days ago — within 14-day history cap)
    const history = [
      { date: "2024-01-15", count: 2 }, // current Mon
      { date: "2024-01-16", count: 3 }, // current Tue
      { date: "2024-01-17", count: 1 }, // current Wed
      { date: "2024-01-18", count: 2 }, // current Thu
      { date: "2024-01-19", count: 3 }, // current Fri
      { date: "2024-01-20", count: 1 }, // current Sat
      { date: PREV_SUN_MON, count: 4 }, // prev Mon
      { date: "2024-01-09", count: 2 }, // prev Tue
      { date: "2024-01-10", count: 1 }, // prev Wed
      { date: "2024-01-11", count: 2 }, // prev Thu
      { date: "2024-01-12", count: 3 }, // prev Fri
      { date: "2024-01-13", count: 2 }, // prev Sat
      { date: "2024-01-14", count: 1 }, // prev Sun
    ];
    const result = calcPomodoroWeekRecord(history, 5, SUN);
    // current: 2+3+1+2+3+1 (Mon–Sat from history) + 5 (Sun sessionsToday) = 17
    expect(result.currentWeekTotal).toBe(17);
    // prev: 4+2+1+2+3+2+1 = 15
    expect(result.prevWeekTotal).toBe(15);
  });
});

describe("calcQuarterlyPomodoroReport", () => {
  // prevQtrDays = all 90 days of Q1 2025 (Jan 1 – Mar 31).
  // Jan: 31 days, Feb: 28 days (2025 is not a leap year), Mar: 31 days = 90 total.
  const Q1_2025: string[] = [
    ...Array.from({ length: 31 }, (_, i) => `2025-01-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 28 }, (_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 31 }, (_, i) => `2025-03-${String(i + 1).padStart(2, "0")}`),
  ];

  it("should return null when history is empty", () => {
    expect(calcQuarterlyPomodoroReport([], Q1_2025)).toBeNull();
  });

  it("should return null when fewer than 3 active days in window", () => {
    const history: PomodoroDay[] = [
      { date: "2025-03-20", count: 5 },
      { date: "2025-03-21", count: 3 },
    ];
    expect(calcQuarterlyPomodoroReport(history, Q1_2025)).toBeNull();
  });

  it("should return null when all entries are outside the prevQtrDays window", () => {
    const history: PomodoroDay[] = [
      { date: "2025-04-05", count: 5 },
      { date: "2025-04-06", count: 5 },
      { date: "2025-04-07", count: 5 },
    ];
    expect(calcQuarterlyPomodoroReport(history, Q1_2025)).toBeNull();
  });

  it("should not count count=0 entries as active days", () => {
    const history: PomodoroDay[] = [
      { date: "2025-03-01", count: 0 },
      { date: "2025-03-02", count: 5 },
      { date: "2025-03-03", count: 3 },
    ];
    // only 2 active days (count > 0) → null
    expect(calcQuarterlyPomodoroReport(history, Q1_2025)).toBeNull();
  });

  it("should return 🔥 message when totalSessions >= 100", () => {
    const history: PomodoroDay[] = [
      { date: "2025-03-01", count: 20 },
      { date: "2025-03-02", count: 20 },
      { date: "2025-03-03", count: 20 },
      { date: "2025-03-04", count: 20 },
      { date: "2025-03-05", count: 20 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q1_2025);
    expect(result).toContain("🔥");
    expect(result).toContain("100세션");
    expect(result).toContain("5일 활성");
  });

  it("should return 🔥 at boundary (totalSessions === 100)", () => {
    const history: PomodoroDay[] = [
      { date: "2025-03-29", count: 40 },
      { date: "2025-03-30", count: 30 },
      { date: "2025-03-31", count: 30 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q1_2025);
    expect(result).toContain("🔥");
    expect(result).toContain("100세션");
  });

  it("should return ✅ message when totalSessions is between 40 and 99", () => {
    const history: PomodoroDay[] = [
      { date: "2025-03-01", count: 20 },
      { date: "2025-03-02", count: 15 },
      { date: "2025-03-03", count: 15 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q1_2025);
    expect(result).toContain("✅");
    expect(result).toContain("50세션");
    expect(result).toContain("3일 활성");
  });

  it("should return ✅ at boundary (totalSessions === 40)", () => {
    const history: PomodoroDay[] = [
      { date: "2025-03-29", count: 20 },
      { date: "2025-03-30", count: 10 },
      { date: "2025-03-31", count: 10 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q1_2025);
    expect(result).toContain("✅");
    expect(result).toContain("40세션");
  });

  it("should return 💪 message when totalSessions < 40", () => {
    const history: PomodoroDay[] = [
      { date: "2025-03-29", count: 5 },
      { date: "2025-03-30", count: 5 },
      { date: "2025-03-31", count: 5 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q1_2025);
    expect(result).toContain("💪");
    expect(result).toContain("15세션");
    expect(result).toContain("3일 활성");
  });

  it("should ignore entries outside prevQtrDays window in total count", () => {
    const history: PomodoroDay[] = [
      { date: "2025-04-10", count: 50 }, // outside window — must not count
      { date: "2025-03-29", count: 10 },
      { date: "2025-03-30", count: 10 },
      { date: "2025-03-31", count: 10 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q1_2025);
    expect(result).toContain("30세션"); // only 10+10+10, not 50+10+10+10
    expect(result).toContain("3일 활성");
  });

  it("should return 💪 at ✅ boundary minus one (totalSessions === 39)", () => {
    // 39 is one below the ✅ threshold (40) — must emit 💪, not ✅
    const history: PomodoroDay[] = [
      { date: "2025-03-29", count: 13 },
      { date: "2025-03-30", count: 13 },
      { date: "2025-03-31", count: 13 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q1_2025);
    expect(result).toContain("💪");
    expect(result).toContain("39세션");
  });

  it("should return ✅ at 🔥 boundary minus one (totalSessions === 99)", () => {
    // 99 is one below the 🔥 threshold (100) — must emit ✅, not 🔥
    const history: PomodoroDay[] = [
      { date: "2025-03-29", count: 33 },
      { date: "2025-03-30", count: 33 },
      { date: "2025-03-31", count: 33 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q1_2025);
    expect(result).toContain("✅");
    expect(result).toContain("99세션");
  });

  it("should include '지난 분기' in output text (full format verification)", () => {
    // Verifies the full message format contains the quarter-specific label
    const history: PomodoroDay[] = [
      { date: "2025-03-01", count: 5 },
      { date: "2025-03-02", count: 5 },
      { date: "2025-03-03", count: 5 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q1_2025);
    expect(result).toBe("💪 지난 분기 포모도로 15세션 — 이번 분기엔 더 집중해봐요 (3일 활성)");
  });

  it("should work correctly with Q4 window (Oct–Dec, 92 days in 2024)", () => {
    // Q4 2024: Oct 1 – Dec 31 = 31 + 30 + 31 = 92 days
    const Q4_2024: string[] = [
      ...Array.from({ length: 31 }, (_, i) => `2024-10-${String(i + 1).padStart(2, "0")}`),
      ...Array.from({ length: 30 }, (_, i) => `2024-11-${String(i + 1).padStart(2, "0")}`),
      ...Array.from({ length: 31 }, (_, i) => `2024-12-${String(i + 1).padStart(2, "0")}`),
    ];
    const history: PomodoroDay[] = [
      { date: "2024-12-29", count: 20 },
      { date: "2024-12-30", count: 20 },
      { date: "2024-12-31", count: 20 },
    ];
    const result = calcQuarterlyPomodoroReport(history, Q4_2024);
    expect(result).toContain("✅");
    expect(result).toContain("60세션");
    expect(result).toContain("3일 활성");
  });
});

describe("calcYearlyPomodoroReport", () => {
  // prevYearDays = all 365 days of 2025 (not a leap year).
  // pomodoroHistory is capped at 14 days, so only the last ≤14 days of prevYearDays will match.
  // Threshold semantics match calcQuarterlyPomodoroReport (same ≤14-day effective window).
  const YEAR_2025: string[] = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(2025, 0, 1);
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("sv");
  });

  it("should return null when history is empty", () => {
    expect(calcYearlyPomodoroReport([], YEAR_2025)).toBeNull();
  });

  it("should return null when fewer than 3 active days in window", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-30", count: 5 },
      { date: "2025-12-31", count: 3 },
    ];
    expect(calcYearlyPomodoroReport(history, YEAR_2025)).toBeNull();
  });

  it("should return null when all entries are outside prevYearDays window", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-05", count: 5 },
      { date: "2026-01-06", count: 5 },
      { date: "2026-01-07", count: 5 },
    ];
    expect(calcYearlyPomodoroReport(history, YEAR_2025)).toBeNull();
  });

  it("should not count count=0 entries as active days", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 0 },
      { date: "2025-12-30", count: 5 },
      { date: "2025-12-31", count: 3 },
    ];
    // only 2 active days (count > 0) → null
    expect(calcYearlyPomodoroReport(history, YEAR_2025)).toBeNull();
  });

  it("should return a message (not null) when exactly 3 active days in window", () => {
    // active.length === 3 is the exact boundary that flips the result from null to a non-null message
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 5 },
      { date: "2025-12-30", count: 5 },
      { date: "2025-12-31", count: 5 },
    ];
    expect(calcYearlyPomodoroReport(history, YEAR_2025)).not.toBeNull();
  });

  it("should return 🔥 message when totalSessions >= 100", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-27", count: 20 },
      { date: "2025-12-28", count: 20 },
      { date: "2025-12-29", count: 20 },
      { date: "2025-12-30", count: 20 },
      { date: "2025-12-31", count: 20 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2025);
    expect(result).toContain("🔥");
    expect(result).toContain("100세션");
    expect(result).toContain("5일 활성");
  });

  it("should return 🔥 at boundary (totalSessions === 100)", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 40 },
      { date: "2025-12-30", count: 30 },
      { date: "2025-12-31", count: 30 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2025);
    expect(result).toContain("🔥");
    expect(result).toContain("100세션");
  });

  it("should return ✅ message when totalSessions is between 40 and 99", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 20 },
      { date: "2025-12-30", count: 15 },
      { date: "2025-12-31", count: 15 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2025);
    expect(result).toContain("✅");
    expect(result).toContain("50세션");
    expect(result).toContain("3일 활성");
  });

  it("should return ✅ at boundary (totalSessions === 40)", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 20 },
      { date: "2025-12-30", count: 10 },
      { date: "2025-12-31", count: 10 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2025);
    expect(result).toContain("✅");
    expect(result).toContain("40세션");
  });

  it("should return 💪 message when totalSessions < 40", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 5 },
      { date: "2025-12-30", count: 5 },
      { date: "2025-12-31", count: 5 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2025);
    expect(result).toContain("💪");
    expect(result).toContain("15세션");
    expect(result).toContain("3일 활성");
  });

  it("should ignore entries outside prevYearDays window in total count", () => {
    const history: PomodoroDay[] = [
      { date: "2026-01-10", count: 50 }, // outside window — must not count
      { date: "2025-12-29", count: 10 },
      { date: "2025-12-30", count: 10 },
      { date: "2025-12-31", count: 10 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2025);
    expect(result).toContain("30세션"); // only 10+10+10, not 50+10+10+10
    expect(result).toContain("3일 활성");
  });

  it("should return 💪 at ✅ boundary minus one (totalSessions === 39)", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 13 },
      { date: "2025-12-30", count: 13 },
      { date: "2025-12-31", count: 13 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2025);
    expect(result).toContain("💪");
    expect(result).toContain("39세션");
  });

  it("should return ✅ at 🔥 boundary minus one (totalSessions === 99)", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 33 },
      { date: "2025-12-30", count: 33 },
      { date: "2025-12-31", count: 33 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2025);
    expect(result).toContain("✅");
    expect(result).toContain("99세션");
  });

  it("should include '지난 해' in output text (full format verification)", () => {
    const history: PomodoroDay[] = [
      { date: "2025-12-29", count: 5 },
      { date: "2025-12-30", count: 5 },
      { date: "2025-12-31", count: 5 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2025);
    expect(result).toBe("💪 지난 해 포모도로 15세션 — 올해엔 더 집중해봐요 (3일 활성)");
  });

  it("should work correctly with leap-year 2024 window (366 days, entries in Dec 2024)", () => {
    // 2024 is a leap year: 366 days. Jan 1 2025 fires report for all of 2024.
    // Verifies the 366-day window is built correctly and entries within it are counted.
    const YEAR_2024: string[] = Array.from({ length: 366 }, (_, i) => {
      const d = new Date(2024, 0, 1);
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("sv");
    });
    const history: PomodoroDay[] = [
      { date: "2024-12-29", count: 20 },
      { date: "2024-12-30", count: 20 },
      { date: "2024-12-31", count: 20 },
    ];
    const result = calcYearlyPomodoroReport(history, YEAR_2024);
    expect(result).toContain("✅");
    expect(result).toContain("60세션");
    expect(result).toContain("3일 활성");
  });
});

// 14-day window anchored at 2026-03-15 (Sunday).
// Each DoW appears exactly twice:
//   Sun(0): 03-08, 03-15 | Mon(1): 03-02, 03-09 | Tue(2): 03-03, 03-10
//   Wed(3): 03-04, 03-11 | Thu(4): 03-05, 03-12 | Fri(5): 03-06, 03-13 | Sat(6): 03-07, 03-14
const DOW_WINDOW = calcLast14Days("2026-03-15");

describe("calcDayOfWeekPomodoroAvg", () => {
  it("shouldReturnAllNullWhenWindowIsEmpty", () => {
    const result = calcDayOfWeekPomodoroAvg([], []);
    for (let d = 0; d <= 6; d++) expect(result[d]).toBeNull();
  });

  it("shouldReturnNullForDowWithFewerThanTwoAppearances", () => {
    // 13-day window: Mon(1) appears only once (03-02 dropped by slice(1)).
    const window13 = DOW_WINDOW.slice(1); // drops 03-02 → Mon only has 03-09
    const history = [{ date: "2026-03-09", count: 5 }];
    const result = calcDayOfWeekPomodoroAvg(history, window13);
    expect(result[1]).toBeNull();
  });

  it("shouldAverageCountsAcrossTwoOccurrencesCorrectly", () => {
    const history = [
      { date: "2026-03-08", count: 2 }, // Sun
      { date: "2026-03-15", count: 4 }, // Sun
    ];
    const result = calcDayOfWeekPomodoroAvg(history, DOW_WINDOW);
    expect(result[0]).toBe(3); // (2+4)/2
  });

  it("shouldCountMissingHistoryDatesAsZero", () => {
    // Mon appears on 03-02 and 03-09; only 03-02 is in history.
    const history = [{ date: "2026-03-02", count: 4 }];
    const result = calcDayOfWeekPomodoroAvg(history, DOW_WINDOW);
    expect(result[1]).toBe(2); // (4+0)/2
  });

  it("shouldReturnAllNullWhenHistoryHasNoRecordedSessions", () => {
    // Empty history → no session data recorded yet → all-null to prevent spurious weak-day badge.
    // This distinguishes "no data" (null) from "data with 0 sessions on that DoW" (0).
    const result = calcDayOfWeekPomodoroAvg([], DOW_WINDOW);
    for (let d = 0; d <= 6; d++) expect(result[d]).toBeNull();
  });

  it("shouldReturnAllNullWhenAllHistoryEntriesHaveZeroCount", () => {
    // count=0 entries in history are not counted as "session data present".
    const history = [{ date: "2026-03-08", count: 0 }, { date: "2026-03-09", count: 0 }];
    const result = calcDayOfWeekPomodoroAvg(history, DOW_WINDOW);
    for (let d = 0; d <= 6; d++) expect(result[d]).toBeNull();
  });

  it("shouldComputeIndependentAveragesForEachDow", () => {
    const history = [
      { date: "2026-03-06", count: 6 }, // Fri
      { date: "2026-03-13", count: 2 }, // Fri
    ];
    const result = calcDayOfWeekPomodoroAvg(history, DOW_WINDOW);
    expect(result[5]).toBe(4); // Fri avg = (6+2)/2
    expect(result[0]).toBe(0); // Sun avg = 0 (no sessions recorded)
  });
});

describe("calcWeakPomodoroDay", () => {
  it("shouldReturnNullWhenAllValuesAreNull", () => {
    const avg: Record<number, number | null> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
    expect(calcWeakPomodoroDay(avg)).toBeNull();
  });

  it("shouldReturnNullWhenNoAverageFallsBelowThreshold", () => {
    const avg: Record<number, number | null> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: null, 5: null, 6: null };
    expect(calcWeakPomodoroDay(avg)).toBeNull();
  });

  it("shouldReturnDowWithLowestAverageBelowThreshold", () => {
    const avg: Record<number, number | null> = { 0: 0, 1: 0.5, 2: null, 3: null, 4: null, 5: null, 6: null };
    expect(calcWeakPomodoroDay(avg)).toBe(0); // 0 < 0.5, both below threshold of 1
  });

  it("shouldPickLowestAvgAmongMultipleCandidates", () => {
    const avg: Record<number, number | null> = { 0: 0.5, 1: 0.2, 2: 0.8, 3: null, 4: null, 5: null, 6: null };
    expect(calcWeakPomodoroDay(avg)).toBe(1); // 0.2 is the lowest
  });

  it("shouldReturnNullAtExactThresholdBoundary", () => {
    // avg exactly 1.0 is NOT strictly below the threshold — not a weak day
    const avg: Record<number, number | null> = { 0: 1.0, 1: 2, 2: null, 3: null, 4: null, 5: null, 6: null };
    expect(calcWeakPomodoroDay(avg)).toBeNull();
  });

  it("shouldReturnLowerDowIndexOnTieAtSameMinimumAverage", () => {
    // DoW 0 and DoW 1 both avg 0.5 — the lower index (0) wins for stability
    const avg: Record<number, number | null> = { 0: 0.5, 1: 0.5, 2: null, 3: null, 4: null, 5: null, 6: null };
    expect(calcWeakPomodoroDay(avg)).toBe(0);
  });
});

describe("calcBestPomodoroDay", () => {
  it("shouldReturnNullWhenAllValuesAreNull", () => {
    const avg: Record<number, number | null> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
    expect(calcBestPomodoroDay(avg)).toBeNull();
  });

  it("shouldReturnNullWhenNoAverageReachesThreshold", () => {
    const avg: Record<number, number | null> = { 0: 1, 1: 2, 2: 2.9, 3: null, 4: null, 5: null, 6: null };
    expect(calcBestPomodoroDay(avg)).toBeNull();
  });

  it("shouldReturnDowWithHighestAverageAtOrAboveThreshold", () => {
    const avg: Record<number, number | null> = { 0: 5, 1: 3, 2: null, 3: null, 4: null, 5: null, 6: null };
    expect(calcBestPomodoroDay(avg)).toBe(0); // 5 > 3, both >= 3
  });

  it("shouldPickHighestAvgAmongMultipleCandidates", () => {
    const avg: Record<number, number | null> = { 0: 3, 1: 4.5, 2: 3.2, 3: null, 4: null, 5: null, 6: null };
    expect(calcBestPomodoroDay(avg)).toBe(1); // 4.5 is highest
  });

  it("shouldIgnoreDowsThatAreBelowThreshold", () => {
    const avg: Record<number, number | null> = { 0: 2.9, 1: null, 2: 3.1, 3: null, 4: null, 5: null, 6: null };
    expect(calcBestPomodoroDay(avg)).toBe(2); // 2.9 < 3 threshold, so only dow=2 qualifies
  });

  it("shouldReturnLowerDowIndexOnTieAtSameMaximumAverage", () => {
    // DoW 0 and DoW 1 both avg 4.0 — strict > means the first (lower) DoW wins
    const avg: Record<number, number | null> = { 0: 4.0, 1: 4.0, 2: null, 3: null, 4: null, 5: null, 6: null };
    expect(calcBestPomodoroDay(avg)).toBe(0);
  });
});

describe("calcPomodoroWeekGoalDays", () => {
  // last7 from 2026-03-09 (6 days ago) to 2026-03-15 (today)
  const TODAY = "2026-03-15";
  const last7 = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"];

  it("shouldReturn0WhenSessionGoalIsZero", () => {
    const history: PomodoroDay[] = last7.map(d => ({ date: d, count: 5 }));
    expect(calcPomodoroWeekGoalDays(history, 0, last7, 5, TODAY)).toBe(0);
  });

  it("shouldReturn0WhenSessionGoalIsNegative", () => {
    const history: PomodoroDay[] = last7.map(d => ({ date: d, count: 5 }));
    expect(calcPomodoroWeekGoalDays(history, -1, last7, 5, TODAY)).toBe(0);
  });

  it("shouldReturn0WhenHistoryIsEmptyAndSessionsTodayBelowGoal", () => {
    expect(calcPomodoroWeekGoalDays([], 4, last7, 3, TODAY)).toBe(0);
  });

  it("shouldCountDaysFromHistoryWhereCountMeetsOrExceedsGoal", () => {
    // 4 past days meet goal=4; day-6-ago and yesterday below; today=2 does not
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 4 },
      { date: "2026-03-10", count: 4 },
      { date: "2026-03-11", count: 4 },
      { date: "2026-03-12", count: 4 },
      { date: "2026-03-13", count: 3 }, // below goal
      { date: "2026-03-14", count: 3 }, // below goal
    ];
    expect(calcPomodoroWeekGoalDays(history, 4, last7, 2, TODAY)).toBe(4);
  });

  it("shouldUseLiveSessionsTodayForTodayNotHistory", () => {
    // history has today=2 but live sessionsToday=4 (meets goal)
    const history: PomodoroDay[] = [
      { date: "2026-03-15", count: 2 }, // stale history entry for today
    ];
    expect(calcPomodoroWeekGoalDays(history, 4, last7, 4, TODAY)).toBe(1);
  });

  it("shouldIgnoreHistoryEntryForTodayWhenLiveTodayBelowGoal", () => {
    // history has today=10 but live sessionsToday=1 (below goal)
    const history: PomodoroDay[] = [
      { date: "2026-03-15", count: 10 },
    ];
    expect(calcPomodoroWeekGoalDays(history, 4, last7, 1, TODAY)).toBe(0);
  });

  it("shouldReturn7WhenAllDaysMeetOrExceedGoal", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 4 },
      { date: "2026-03-10", count: 5 },
      { date: "2026-03-11", count: 4 },
      { date: "2026-03-12", count: 6 },
      { date: "2026-03-13", count: 4 },
      { date: "2026-03-14", count: 4 },
    ];
    expect(calcPomodoroWeekGoalDays(history, 4, last7, 4, TODAY)).toBe(7);
  });

  it("shouldReturn1WhenOnlyTodayMeetsGoalAndHistoryIsEmpty", () => {
    expect(calcPomodoroWeekGoalDays([], 4, last7, 4, TODAY)).toBe(1);
  });

  it("shouldCountExactGoalAsGoalMet", () => {
    // exactly goal=4 on every past day, today exactly 4 → all 7 count
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 4 },
      { date: "2026-03-10", count: 4 },
      { date: "2026-03-11", count: 4 },
      { date: "2026-03-12", count: 4 },
      { date: "2026-03-13", count: 4 },
      { date: "2026-03-14", count: 4 },
    ];
    expect(calcPomodoroWeekGoalDays(history, 4, last7, 4, TODAY)).toBe(7);
  });

  it("shouldIgnoreDatesOutsideLast7Days", () => {
    // date older than the window should not be counted
    const history: PomodoroDay[] = [
      { date: "2026-03-01", count: 10 }, // older than window
      { date: "2026-03-14", count: 4 },  // in window (yesterday)
    ];
    expect(calcPomodoroWeekGoalDays(history, 4, last7, 0, TODAY)).toBe(1);
  });
});

describe("calcPomodoroMonthGoalDays", () => {
  // last14 from 2026-03-02 (13 days ago) to 2026-03-15 (today)
  const TODAY = "2026-03-15";
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date("2026-03-02T00:00:00");
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("sv");
  }); // ["2026-03-02", ..., "2026-03-15"]

  it("shouldReturn0WhenSessionGoalIsZero", () => {
    const history: PomodoroDay[] = last14.map(d => ({ date: d, count: 5 }));
    expect(calcPomodoroMonthGoalDays(history, 0, last14, 5, TODAY)).toBe(0);
  });

  it("shouldReturn0WhenSessionGoalIsNegative", () => {
    const history: PomodoroDay[] = last14.map(d => ({ date: d, count: 5 }));
    expect(calcPomodoroMonthGoalDays(history, -1, last14, 5, TODAY)).toBe(0);
  });

  it("shouldReturn0WhenHistoryIsEmptyAndSessionsTodayBelowGoal", () => {
    expect(calcPomodoroMonthGoalDays([], 4, last14, 3, TODAY)).toBe(0);
  });

  it("shouldCountDaysFromHistoryWhereCountMeetsOrExceedsGoal", () => {
    // 8 past days (Mar 2–9) meet goal=4; Mar 10–11 not in history (count as 0, below goal);
    // Mar 12–14 below goal; today=2 does not meet goal → 8 total days with goal met
    const history: PomodoroDay[] = [
      { date: "2026-03-02", count: 4 },
      { date: "2026-03-03", count: 4 },
      { date: "2026-03-04", count: 4 },
      { date: "2026-03-05", count: 4 },
      { date: "2026-03-06", count: 4 },
      { date: "2026-03-07", count: 4 },
      { date: "2026-03-08", count: 4 },
      { date: "2026-03-09", count: 4 },
      { date: "2026-03-12", count: 3 }, // below goal
      { date: "2026-03-13", count: 2 }, // below goal
      { date: "2026-03-14", count: 1 }, // below goal (yesterday)
    ];
    expect(calcPomodoroMonthGoalDays(history, 4, last14, 2, TODAY)).toBe(8);
  });

  it("shouldUseLiveSessionsTodayForTodayNotHistory", () => {
    // history has today=2 but live sessionsToday=4 (meets goal)
    const history: PomodoroDay[] = [{ date: "2026-03-15", count: 2 }];
    expect(calcPomodoroMonthGoalDays(history, 4, last14, 4, TODAY)).toBe(1);
  });

  it("shouldIgnoreHistoryEntryForTodayWhenLiveTodayBelowGoal", () => {
    // history has today=10 but live sessionsToday=1 (below goal)
    const history: PomodoroDay[] = [{ date: "2026-03-15", count: 10 }];
    expect(calcPomodoroMonthGoalDays(history, 4, last14, 1, TODAY)).toBe(0);
  });

  it("shouldReturn14WhenAllDaysMeetOrExceedGoal", () => {
    const history: PomodoroDay[] = last14.slice(0, 13).map(d => ({ date: d, count: 4 }));
    expect(calcPomodoroMonthGoalDays(history, 4, last14, 4, TODAY)).toBe(14);
  });

  it("shouldIgnoreHistoryEntriesOutsideLast14Window", () => {
    const history: PomodoroDay[] = [
      { date: "2026-03-01", count: 10 }, // outside window
      { date: "2026-03-14", count: 4 },  // in window (yesterday)
    ];
    expect(calcPomodoroMonthGoalDays(history, 4, last14, 0, TODAY)).toBe(1);
  });
});

