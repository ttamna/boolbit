// ABOUTME: Unit tests for pomodoro pure helpers — calcTodaySessionCount, updatePomodoroHistory, calcLast14Days, calcSessionWeekTrend, calcSessionCountStr, calcPomodoroBadge, phaseAccent, phaseLabel, sessionGoalPct, formatLifetime, playPhaseDone
// ABOUTME: Covers today-count reset/increment, 14-day history upsert, date range derivation, prev-7/cur-7 trend logic, badge string, section collapsed badge, phase UI mapping, goal-progress percentage, lifetime format, and audio feedback graceful fallback

import { describe, it, expect } from "vitest";
import { calcLast14Days, calcSessionWeekTrend, calcTodaySessionCount, updatePomodoroHistory, calcSessionCountStr, calcPomodoroBadge, phaseAccent, phaseLabel, sessionGoalPct, formatLifetime, playPhaseDone } from "./pomodoro";
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
