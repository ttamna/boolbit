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
});
