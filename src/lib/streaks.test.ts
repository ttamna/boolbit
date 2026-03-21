// ABOUTME: Tests for calcActiveStreaks — aggregates non-momentum streaks into a ranked display list
// ABOUTME: Covers filtering (days < 2 excluded), sorting (descending with explicit tiebreaker), empty input, and all 4 domains

import { describe, it, expect } from "vitest";
import { calcActiveStreaks, type ActiveStreaksParams } from "./streaks";

describe("calcActiveStreaks", () => {
  const full: ActiveStreaksParams = {
    perfectDayStreak: 7,
    intentionDoneStreak: 5,
    focusStreak: 3,
    pomodoroGoalStreak: 10,
  };

  it("should return all 4 streaks sorted by days descending when all ≥ 2", () => {
    const result = calcActiveStreaks(full);
    expect(result).toHaveLength(4);
    expect(result[0].key).toBe("pomodoroGoal");
    expect(result[0].days).toBe(10);
    expect(result[1].key).toBe("perfectDay");
    expect(result[1].days).toBe(7);
    expect(result[2].key).toBe("intentionDone");
    expect(result[2].days).toBe(5);
    expect(result[3].key).toBe("focus");
    expect(result[3].days).toBe(3);
  });

  it("should exclude streaks with days < 2", () => {
    const result = calcActiveStreaks({
      perfectDayStreak: 1,
      intentionDoneStreak: 0,
      focusStreak: 5,
      pomodoroGoalStreak: 2,
    });
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("focus");
    expect(result[1].key).toBe("pomodoroGoal");
  });

  it("should return empty array when all streaks are undefined", () => {
    const result = calcActiveStreaks({});
    expect(result).toEqual([]);
  });

  it("should return empty array when all streaks are 0 or 1", () => {
    const result = calcActiveStreaks({
      perfectDayStreak: 0,
      intentionDoneStreak: 1,
      focusStreak: 0,
      pomodoroGoalStreak: 1,
    });
    expect(result).toEqual([]);
  });

  // key lookup is order-independent; verifies metadata not sort position
  it("should include emoji and label for each streak domain", () => {
    const result = calcActiveStreaks(full);
    const map = Object.fromEntries(result.map(s => [s.key, s]));
    expect(map.perfectDay.emoji).toBe("🌟");
    expect(map.perfectDay.label).toBe("완벽");
    expect(map.intentionDone.emoji).toBe("✨");
    expect(map.intentionDone.label).toBe("의도");
    expect(map.focus.emoji).toBe("⚡");
    expect(map.focus.label).toBe("집중");
    expect(map.pomodoroGoal.emoji).toBe("🎯");
    expect(map.pomodoroGoal.label).toBe("포모");
  });

  it("should handle single active streak", () => {
    const result = calcActiveStreaks({ focusStreak: 14 });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      key: "focus",
      emoji: "⚡",
      label: "집중",
      days: 14,
    });
  });

  // Explicit tiebreaker: when days are equal, STREAK_DEFS definition index breaks the tie
  // (not relying on runtime sort stability alone).
  it("should use STREAK_DEFS index as tiebreaker when days are equal", () => {
    const result = calcActiveStreaks({
      perfectDayStreak: 5,
      intentionDoneStreak: 5,
      focusStreak: 5,
      pomodoroGoalStreak: 5,
    });
    expect(result).toHaveLength(4);
    expect(result.map(s => s.key)).toEqual([
      "perfectDay", "intentionDone", "focus", "pomodoroGoal",
    ]);
  });

  it("should treat undefined values the same as 0", () => {
    const result1 = calcActiveStreaks({ focusStreak: undefined });
    const result2 = calcActiveStreaks({ focusStreak: 0 });
    expect(result1).toEqual(result2);
  });
});
