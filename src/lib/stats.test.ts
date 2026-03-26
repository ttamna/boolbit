// ABOUTME: Unit tests for calcLifetimeStats — formats lifetime achievement data from WidgetData into displayable stat items
// ABOUTME: Covers empty data, partial data, full data, zero-value suppression, and formatting correctness

import { describe, it, expect } from "vitest";
import { calcLifetimeStats } from "./stats";
import { formatLifetime } from "./pomodoro";
import type { WidgetData } from "../types";

const EMPTY_DATA: WidgetData = {
  projects: [],
  habits: [],
  quotes: [],
};

describe("calcLifetimeStats", () => {
  it("should return empty array when no lifetime data exists", () => {
    expect(calcLifetimeStats(EMPTY_DATA)).toEqual([]);
  });

  it("should include focus time when pomodoroLifetimeMins is positive", () => {
    const data: WidgetData = { ...EMPTY_DATA, pomodoroLifetimeMins: 150 };
    const stats = calcLifetimeStats(data);
    const item = stats.find(s => s.key === "focusTime");
    expect(item).toBeDefined();
    expect(item!.value).toBe(formatLifetime(150));
    expect(item!.emoji).toBe("🍅");
  });

  it("should delegate focus time formatting to formatLifetime", () => {
    const mins = [42, 120, 600];
    for (const m of mins) {
      const data: WidgetData = { ...EMPTY_DATA, pomodoroLifetimeMins: m };
      expect(calcLifetimeStats(data).find(s => s.key === "focusTime")!.value).toBe(formatLifetime(m));
    }
  });

  it("should suppress focusTime when pomodoroLifetimeMins is 0", () => {
    const data: WidgetData = { ...EMPTY_DATA, pomodoroLifetimeMins: 0 };
    const stats = calcLifetimeStats(data);
    expect(stats.find(s => s.key === "focusTime")).toBeUndefined();
  });

  it("should include total check-ins when habitLifetimeTotalCheckins is positive", () => {
    const data: WidgetData = { ...EMPTY_DATA, habitLifetimeTotalCheckins: 1234 };
    const stats = calcLifetimeStats(data);
    const item = stats.find(s => s.key === "totalCheckins");
    expect(item).toBeDefined();
    expect(item!.value).toBe("1,234회");
    expect(item!.emoji).toBe("✓");
  });

  it("should suppress totalCheckins when value is 0", () => {
    const data: WidgetData = { ...EMPTY_DATA, habitLifetimeTotalCheckins: 0 };
    expect(calcLifetimeStats(data).find(s => s.key === "totalCheckins")).toBeUndefined();
  });

  it("should include completed projects count", () => {
    const data: WidgetData = {
      ...EMPTY_DATA,
      projects: [
        { id: 1, name: "A", status: "done", goal: "", progress: 100, metric: "", metric_value: "", metric_target: "" },
        { id: 2, name: "B", status: "active", goal: "", progress: 50, metric: "", metric_value: "", metric_target: "" },
        { id: 3, name: "C", status: "done", goal: "", progress: 100, metric: "", metric_value: "", metric_target: "" },
      ],
    };
    const stats = calcLifetimeStats(data);
    const item = stats.find(s => s.key === "completedProjects");
    expect(item).toBeDefined();
    expect(item!.value).toBe("2개");
  });

  it("should suppress completedProjects when none are done", () => {
    const data: WidgetData = {
      ...EMPTY_DATA,
      projects: [
        { id: 1, name: "A", status: "active", goal: "", progress: 50, metric: "", metric_value: "", metric_target: "" },
      ],
    };
    expect(calcLifetimeStats(data).find(s => s.key === "completedProjects")).toBeUndefined();
  });

  it("should include best streak records when positive", () => {
    const data: WidgetData = {
      ...EMPTY_DATA,
      perfectDayBestStreak: 14,
      intentionDoneBestStreak: 21,
      focusBestStreak: 10,
      momentumBestStreak: 30,
      pomodoroGoalBestStreak: 7,
    };
    const stats = calcLifetimeStats(data);
    expect(stats.find(s => s.key === "perfectDayBest")!.value).toBe("14일");
    expect(stats.find(s => s.key === "intentionBest")!.value).toBe("21일");
    expect(stats.find(s => s.key === "focusBest")!.value).toBe("10일");
    expect(stats.find(s => s.key === "momentumBest")!.value).toBe("30일");
    expect(stats.find(s => s.key === "pomodoroBest")!.value).toBe("7일");
  });

  it("should suppress streak records that are 0 or undefined", () => {
    const data: WidgetData = {
      ...EMPTY_DATA,
      perfectDayBestStreak: 0,
      intentionDoneBestStreak: undefined,
      focusBestStreak: 5,
      // momentumBestStreak and pomodoroGoalBestStreak intentionally omitted (undefined)
    };
    const stats = calcLifetimeStats(data);
    expect(stats.find(s => s.key === "perfectDayBest")).toBeUndefined();
    expect(stats.find(s => s.key === "intentionBest")).toBeUndefined();
    expect(stats.find(s => s.key === "momentumBest")).toBeUndefined();
    expect(stats.find(s => s.key === "pomodoroBest")).toBeUndefined();
    expect(stats.find(s => s.key === "focusBest")!.value).toBe("5일");
  });

  it("should return all items in correct order when full data provided", () => {
    const data: WidgetData = {
      ...EMPTY_DATA,
      pomodoroLifetimeMins: 600,
      habitLifetimeTotalCheckins: 500,
      projects: [
        { id: 1, name: "Done", status: "done", goal: "", progress: 100, metric: "", metric_value: "", metric_target: "" },
      ],
      perfectDayBestStreak: 7,
      intentionDoneBestStreak: 14,
      focusBestStreak: 21,
      momentumBestStreak: 28,
      pomodoroGoalBestStreak: 10,
    };
    const stats = calcLifetimeStats(data);
    const keys = stats.map(s => s.key);
    expect(keys).toEqual([
      "focusTime",
      "totalCheckins",
      "completedProjects",
      "perfectDayBest",
      "intentionBest",
      "focusBest",
      "momentumBest",
      "pomodoroBest",
    ]);
  });

  it("should handle NaN gracefully by suppressing the stat", () => {
    const data: WidgetData = { ...EMPTY_DATA, pomodoroLifetimeMins: NaN, habitLifetimeTotalCheckins: NaN };
    const stats = calcLifetimeStats(data);
    expect(stats.find(s => s.key === "focusTime")).toBeUndefined();
    expect(stats.find(s => s.key === "totalCheckins")).toBeUndefined();
  });

  it("should suppress focusTime when pomodoroLifetimeMins is Infinity", () => {
    const data: WidgetData = { ...EMPTY_DATA, pomodoroLifetimeMins: Infinity };
    expect(calcLifetimeStats(data).find(s => s.key === "focusTime")).toBeUndefined();
  });

  it("should suppress focusTime when pomodoroLifetimeMins is -Infinity", () => {
    const data: WidgetData = { ...EMPTY_DATA, pomodoroLifetimeMins: -Infinity };
    expect(calcLifetimeStats(data).find(s => s.key === "focusTime")).toBeUndefined();
  });

  it("should suppress focusTime when pomodoroLifetimeMins is negative", () => {
    const data: WidgetData = { ...EMPTY_DATA, pomodoroLifetimeMins: -1 };
    expect(calcLifetimeStats(data).find(s => s.key === "focusTime")).toBeUndefined();
  });

  it("should suppress totalCheckins when habitLifetimeTotalCheckins is negative", () => {
    const data: WidgetData = { ...EMPTY_DATA, habitLifetimeTotalCheckins: -5 };
    expect(calcLifetimeStats(data).find(s => s.key === "totalCheckins")).toBeUndefined();
  });

  it("should include completedProjects emoji and label when projects are done", () => {
    const data: WidgetData = {
      ...EMPTY_DATA,
      projects: [
        { id: 1, name: "Done", status: "done", goal: "", progress: 100, metric: "", metric_value: "", metric_target: "" },
      ],
    };
    const item = calcLifetimeStats(data).find(s => s.key === "completedProjects");
    expect(item).toBeDefined();
    expect(item!.emoji).toBe("🎉");
    expect(item!.label).toBe("완료한 프로젝트");
  });

  it("should include correct emoji and label for each streak domain when all streaks are positive", () => {
    const data: WidgetData = {
      ...EMPTY_DATA,
      perfectDayBestStreak: 3,
      intentionDoneBestStreak: 3,
      focusBestStreak: 3,
      momentumBestStreak: 3,
      pomodoroGoalBestStreak: 3,
    };
    const stats = calcLifetimeStats(data);
    const byKey = Object.fromEntries(stats.map(s => [s.key, s]));
    expect(byKey.perfectDayBest.emoji).toBe("🌟");
    expect(byKey.perfectDayBest.label).toBe("완벽한 날 최고");
    expect(byKey.intentionBest.emoji).toBe("✨");
    expect(byKey.intentionBest.label).toBe("의도 달성 최고");
    expect(byKey.focusBest.emoji).toBe("🔥");
    expect(byKey.focusBest.label).toBe("집중 연속 최고");
    expect(byKey.momentumBest.emoji).toBe("⚡");
    expect(byKey.momentumBest.label).toBe("모멘텀 연속 최고");
    expect(byKey.pomodoroBest.emoji).toBe("🎯");
    expect(byKey.pomodoroBest.label).toBe("포모도로 목표 최고");
  });

  // Derive expected value from the same toLocaleString call to stay locale-agnostic across ICU builds
  it("should format totalCheckins with Korean locale thousands separator for large values", () => {
    const data: WidgetData = { ...EMPTY_DATA, habitLifetimeTotalCheckins: 1_000_000 };
    const item = calcLifetimeStats(data).find(s => s.key === "totalCheckins");
    expect(item).toBeDefined();
    expect(item!.value).toBe(`${(1_000_000).toLocaleString("ko-KR")}회`);
  });

  // "paused" and "in-progress" are TypeScript union members of Project.status — confirms filter
  // is an exact string equality check ("done"), not a broader type or truthiness guard
  it("should not count projects with 'paused' or 'in-progress' status toward completedProjects", () => {
    const data: WidgetData = {
      ...EMPTY_DATA,
      projects: [
        { id: 1, name: "P1", status: "paused", goal: "", progress: 50, metric: "", metric_value: "", metric_target: "" },
        { id: 2, name: "P2", status: "in-progress", goal: "", progress: 80, metric: "", metric_value: "", metric_target: "" },
      ],
    };
    expect(calcLifetimeStats(data).find(s => s.key === "completedProjects")).toBeUndefined();
  });

  // isPositive(1) = true (1 > 0) — best streak of 1 day is shown, not suppressed
  it("should include best streak of exactly 1 day (minimum positive value)", () => {
    const data: WidgetData = { ...EMPTY_DATA, pomodoroGoalBestStreak: 1 };
    const item = calcLifetimeStats(data).find(s => s.key === "pomodoroBest");
    expect(item).toBeDefined();
    expect(item!.value).toBe("1일");
  });

  // Number.isFinite does not coerce — null is not finite, so the stat is suppressed without conversion
  it("should suppress stat when field is null at runtime (JSON deserialization without type coercion)", () => {
    const data = { ...EMPTY_DATA, pomodoroLifetimeMins: null } as unknown as WidgetData;
    expect(calcLifetimeStats(data).find(s => s.key === "focusTime")).toBeUndefined();
  });
});
