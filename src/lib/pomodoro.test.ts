// ABOUTME: Unit tests for pomodoro pure helpers — calcTodaySessionCount, updatePomodoroHistory, calcLast14Days, calcSessionWeekTrend, calcSessionCountStr, calcPomodoroBadge, calcFocusStreak, phaseAccent, phaseLabel, sessionGoalPct, formatLifetime, playPhaseDone, calcPomodoroMorningReminder, calcPomodoroEveningReminder, calcPomodoroLifetimeMilestone, calcWeeklyPomodoroReport, calcPomodoroGoalStreak, calcPomodoroRecentAvg, calcPomodoroWeekRecord
// ABOUTME: Covers today-count reset/increment, 14-day history upsert, date range derivation, prev-7/cur-7 trend logic, badge string (incl. week sessions 7d·N↑), focus streak, section collapsed badge, phase UI mapping, goal-progress percentage, lifetime format, audio feedback graceful fallback, morning start nudge, evening goal-gap nudge, lifetime milestone crossing, weekly pomodoro session report, goal-streak consecutive past days, recent rolling average sessions (today excluded), and week-over-week session record detection

import { describe, it, expect } from "vitest";
import { calcLast14Days, calcSessionWeekTrend, calcTodaySessionCount, updatePomodoroHistory, calcSessionCountStr, calcPomodoroBadge, calcFocusStreak, phaseAccent, phaseLabel, sessionGoalPct, formatLifetime, playPhaseDone, calcPomodoroMorningReminder, calcPomodoroEveningReminder, calcPomodoroLifetimeMilestone, calcWeeklyPomodoroReport, calcPomodoroGoalStreak, calcPomodoroRecentAvg, calcPomodoroWeekRecord } from "./pomodoro";
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
  // Fixtures anchored to 2026-03-17 (Tuesday).
  // ISO week: Mon 2026-03-16 – Tue 2026-03-17 (current), Mon 2026-03-09 – Tue 2026-03-10 (prev, same window).
  const TUESDAY = "2026-03-17";

  it("shouldReturnFalseForEmptyHistory", () => {
    expect(calcPomodoroWeekRecord([], TUESDAY)).toBe(false);
  });

  it("shouldReturnFalseWhenNoPrevWeekData", () => {
    // Only current-week entries — prev window has no data, so no record can be claimed.
    const history: PomodoroDay[] = [
      { date: "2026-03-16", count: 3 },
      { date: "2026-03-17", count: 4 },
    ];
    expect(calcPomodoroWeekRecord(history, TUESDAY)).toBe(false);
  });

  it("shouldReturnFalseWhenCurrentWeekHasNoSessions", () => {
    // Prev week has sessions; current week total = 0 — no record.
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 3 },
      { date: "2026-03-10", count: 2 },
    ];
    expect(calcPomodoroWeekRecord(history, TUESDAY)).toBe(false);
  });

  it("shouldReturnCurrentWeekTotalWhenItExceedsPrevWeek", () => {
    // Prev Mon-Tue: 3+2=5; current Mon-Tue: 3+4=7 → 7 > 5 → returns 7 (current week total).
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 3 },
      { date: "2026-03-10", count: 2 },
      { date: "2026-03-16", count: 3 },
      { date: "2026-03-17", count: 4 },
    ];
    expect(calcPomodoroWeekRecord(history, TUESDAY)).toBe(7);
  });

  it("shouldReturnFalseWhenCurrentWeekEqualsPrevWeek", () => {
    // Equal totals (5 vs 5) do not constitute a record.
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 3 },
      { date: "2026-03-10", count: 2 },
      { date: "2026-03-16", count: 2 },
      { date: "2026-03-17", count: 3 },
    ];
    expect(calcPomodoroWeekRecord(history, TUESDAY)).toBe(false);
  });

  it("shouldReturnFalseWhenCurrentWeekBelowPrevWeek", () => {
    // Prev: 4+4=8; current: 2+3=5 → behind, not a record.
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 4 },
      { date: "2026-03-10", count: 4 },
      { date: "2026-03-16", count: 2 },
      { date: "2026-03-17", count: 3 },
    ];
    expect(calcPomodoroWeekRecord(history, TUESDAY)).toBe(false);
  });

  it("shouldWorkForMondayComparingOnlyOneDay", () => {
    // today = Monday 2026-03-16; window = Mon only. Prev Mon 2026-03-09: 2 sessions, current: 3 → returns 3.
    const monday = "2026-03-16";
    const history: PomodoroDay[] = [
      { date: "2026-03-09", count: 2 },
      { date: "2026-03-16", count: 3 },
    ];
    expect(calcPomodoroWeekRecord(history, monday)).toBe(3);
  });

  it("shouldWorkForSundayComparingFullWeek", () => {
    // today = Sunday 2026-03-15; window = Mon 2026-03-09 through Sun 2026-03-15 (current, total 21),
    //   Mon 2026-03-02 through Sun 2026-03-08 (prev, total 14). Fits within 14-day history cap.
    const sunday = "2026-03-15";
    const history: PomodoroDay[] = [
      { date: "2026-03-02", count: 2 }, { date: "2026-03-03", count: 2 }, { date: "2026-03-04", count: 2 },
      { date: "2026-03-05", count: 2 }, { date: "2026-03-06", count: 2 }, { date: "2026-03-07", count: 2 },
      { date: "2026-03-08", count: 2 }, // prev week: 14 total
      { date: "2026-03-09", count: 3 }, { date: "2026-03-10", count: 3 }, { date: "2026-03-11", count: 3 },
      { date: "2026-03-12", count: 3 }, { date: "2026-03-13", count: 3 }, { date: "2026-03-14", count: 3 },
      { date: "2026-03-15", count: 3 }, // current week: 21 total
    ];
    expect(calcPomodoroWeekRecord(history, sunday)).toBe(21); // current week: 7 × 3 = 21
  });

  it("shouldHandleMonthBoundaryCorrectly", () => {
    // today = 2026-03-02 (Monday); prev Mon = 2026-02-23. Returns 4 (current Mon sessions).
    const monday = "2026-03-02";
    const history: PomodoroDay[] = [
      { date: "2026-02-23", count: 3 },
      { date: "2026-03-02", count: 4 },
    ];
    expect(calcPomodoroWeekRecord(history, monday)).toBe(4);
  });

  it("shouldComparePrevWeekUsingOnlyAvailableHistoryEntries", () => {
    // When some prev-week entries are absent (e.g. evicted by 14-day rolling cap or user inactivity),
    // only the entries present in history are counted — absent dates contribute 0 to prevWeekTotal.
    // In this fixture, prev-week Mon (2026-03-09) is absent; only Tue (2026-03-10, 4 sessions) exists.
    // currentWeekTotal: 5 (Mon 3) + 3 (Tue 2) = but wait — let me set up clearly:
    // prev window (Mon-Tue): only Tue present → prevWeekTotal = 2.
    // current window (Mon-Tue): both present → thisWeekTotal = 3+4 = 7 > 2 → returns 7.
    const history: PomodoroDay[] = [
      { date: "2026-03-10", count: 2 }, // only Tue of prev week (Mon 2026-03-09 absent)
      { date: "2026-03-16", count: 3 }, // current Mon
      { date: "2026-03-17", count: 4 }, // current Tue
    ];
    expect(calcPomodoroWeekRecord(history, TUESDAY)).toBe(7); // 7 > 2 (partial prev) → 7
  });

  it("shouldIgnoreEntriesOutsideBothWindows", () => {
    // Entry 3 weeks ago should not be counted in either window.
    // Prev Mon-Tue (2026-03-09, 2026-03-10) both absent → prevWeekTotal=0 → false.
    const history: PomodoroDay[] = [
      { date: "2026-02-28", count: 10 }, // 3 weeks ago — not in either window
      { date: "2026-03-16", count: 5 },  // current Mon
      { date: "2026-03-17", count: 3 },  // current Tue
    ];
    expect(calcPomodoroWeekRecord(history, TUESDAY)).toBe(false);
  });
});

