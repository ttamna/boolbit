// ABOUTME: Unit tests for calcGoalExpiry — detects stale period goals and builds log-before-clear history patches
// ABOUTME: Covers all five stale flags, boundary values, historyPatch deduplication/capping, and multi-goal scenarios

import { describe, it, expect } from "vitest";
import { calcGoalExpiry } from "./goalExpiry";
import type { WidgetData, GoalEntry } from "../types";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeDate(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00"); // noon local to avoid DST edge at midnight
}

function makeGoalEntry(date: string, text: string, done?: boolean): GoalEntry {
  return { date, text, ...(done ? { done: true } : {}) };
}

// ─── "Nothing set" baseline ────────────────────────────────────────────────

describe("calcGoalExpiry — nothing set", () => {
  it("should return all false and empty historyPatch when no goals are set", () => {
    const result = calcGoalExpiry({}, makeDate("2026-03-15"));
    expect(result.intentionStale).toBe(false);
    expect(result.weekGoalStale).toBe(false);
    expect(result.monthGoalStale).toBe(false);
    expect(result.quarterGoalStale).toBe(false);
    expect(result.yearGoalStale).toBe(false);
    expect(result.historyPatch).toEqual({});
  });
});

// ─── intentionStale ────────────────────────────────────────────────────────

describe("calcGoalExpiry — intentionStale", () => {
  it("should be false when todayIntentionDate equals todayStr (set today)", () => {
    const data: Partial<WidgetData> = {
      todayIntention: "Focus",
      todayIntentionDate: "2026-03-15",
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.intentionStale).toBe(false);
  });

  it("should be true when todayIntentionDate is yesterday", () => {
    const data: Partial<WidgetData> = {
      todayIntention: "Focus",
      todayIntentionDate: "2026-03-14",
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.intentionStale).toBe(true);
  });

  it("should be false when todayIntention is absent even if date is in the past", () => {
    const data: Partial<WidgetData> = { todayIntentionDate: "2026-03-14" };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.intentionStale).toBe(false);
  });

  it("should be false when todayIntentionDate is absent", () => {
    const data: Partial<WidgetData> = { todayIntention: "Focus" };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.intentionStale).toBe(false);
  });

  it("should not produce a historyPatch entry for stale intention (intentions use separate history mechanism)", () => {
    const data: Partial<WidgetData> = {
      todayIntention: "Focus",
      todayIntentionDate: "2026-03-14",
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.intentionStale).toBe(true);
    // intentionHistory is NOT patched here — App.tsx handles it via intentionHistory separately
    expect(result.historyPatch).toEqual({});
  });
});

// ─── weekGoalStale ─────────────────────────────────────────────────────────

describe("calcGoalExpiry — weekGoalStale", () => {
  // 2026-03-15 is 2026-W11 (Sun). 2026-03-09 starts 2026-W11.

  it("should be false when weekGoalDate equals current ISO week", () => {
    const data: Partial<WidgetData> = {
      weekGoal: "Ship feature",
      weekGoalDate: "2026-W11",
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.weekGoalStale).toBe(false);
  });

  it("should be true when weekGoalDate is a prior ISO week", () => {
    const data: Partial<WidgetData> = {
      weekGoal: "Ship feature",
      weekGoalDate: "2026-W10",
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.weekGoalStale).toBe(true);
  });

  it("should be false when weekGoal is absent (no goal to expire)", () => {
    const data: Partial<WidgetData> = { weekGoalDate: "2026-W10" };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.weekGoalStale).toBe(false);
  });

  it("should be false when weekGoalDate is absent", () => {
    const data: Partial<WidgetData> = { weekGoal: "Ship feature" };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.weekGoalStale).toBe(false);
  });

  it("should append stale goal to weekGoalHistory in historyPatch (without done)", () => {
    const data: Partial<WidgetData> = {
      weekGoal: "Ship feature",
      weekGoalDate: "2026-W10",
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.historyPatch.weekGoalHistory).toEqual([
      { date: "2026-W10", text: "Ship feature" },
    ]);
  });

  it("should include done:true in historyPatch entry when weekGoalDone is true", () => {
    const data: Partial<WidgetData> = {
      weekGoal: "Ship feature",
      weekGoalDate: "2026-W10",
      weekGoalDone: true,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.weekGoalStale).toBe(true);
    expect(result.historyPatch.weekGoalHistory).toEqual([
      { date: "2026-W10", text: "Ship feature", done: true },
    ]);
  });

  it("should not include done key in historyPatch entry when weekGoalDone is explicitly false", () => {
    const data: Partial<WidgetData> = {
      weekGoal: "Ship feature",
      weekGoalDate: "2026-W10",
      weekGoalDone: false,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    const entry = result.historyPatch.weekGoalHistory?.[0];
    expect(entry).toBeDefined();
    expect(entry).not.toHaveProperty("done");
  });

  it("should not be stale when weekGoalDate is a future ISO week", () => {
    // W11 is current; W12 is next week — future date must not trigger expiry
    const data: Partial<WidgetData> = {
      weekGoal: "Upcoming goal",
      weekGoalDate: "2026-W12",
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15")); // 2026-W11
    expect(result.weekGoalStale).toBe(false);
    expect(result.historyPatch.weekGoalHistory).toBeUndefined();
  });

  it("should preserve existing history entries and append new one", () => {
    const existing: GoalEntry[] = [
      makeGoalEntry("2026-W08", "Earlier goal"),
      makeGoalEntry("2026-W09", "Last week goal", true),
    ];
    const data: Partial<WidgetData> = {
      weekGoal: "New stale goal",
      weekGoalDate: "2026-W10",
      weekGoalHistory: existing,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.historyPatch.weekGoalHistory).toHaveLength(3);
    expect(result.historyPatch.weekGoalHistory![2]).toEqual({ date: "2026-W10", text: "New stale goal" });
  });

  it("should deduplicate: if same date already in history, replace with new entry", () => {
    const existing: GoalEntry[] = [
      makeGoalEntry("2026-W10", "Old version of same week goal"),
    ];
    const data: Partial<WidgetData> = {
      weekGoal: "Updated goal text",
      weekGoalDate: "2026-W10",
      weekGoalHistory: existing,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.historyPatch.weekGoalHistory).toHaveLength(1);
    expect(result.historyPatch.weekGoalHistory![0]).toEqual({ date: "2026-W10", text: "Updated goal text" });
  });

  it("should cap weekGoalHistory at 8 entries (newest retained)", () => {
    const existing: GoalEntry[] = Array.from({ length: 8 }, (_, i) => {
      const w = String(i + 1).padStart(2, "0");
      return makeGoalEntry(`2026-W${w}`, `Goal W${w}`);
    });
    const data: Partial<WidgetData> = {
      weekGoal: "Overflow goal",
      weekGoalDate: "2026-W10",
      weekGoalHistory: existing,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.historyPatch.weekGoalHistory).toHaveLength(8);
    // Newest (last appended = W10) must be present; oldest (W01) must be dropped
    expect(result.historyPatch.weekGoalHistory!.some(e => e.date === "2026-W10")).toBe(true);
    expect(result.historyPatch.weekGoalHistory!.some(e => e.date === "2026-W01")).toBe(false);
  });
});

// ─── monthGoalStale ────────────────────────────────────────────────────────

describe("calcGoalExpiry — monthGoalStale", () => {
  it("should be false when monthGoalDate equals current month YYYY-MM", () => {
    const data: Partial<WidgetData> = { monthGoal: "Launch", monthGoalDate: "2026-03" };
    expect(calcGoalExpiry(data, makeDate("2026-03-15")).monthGoalStale).toBe(false);
  });

  it("should be true when monthGoalDate is a prior month", () => {
    const data: Partial<WidgetData> = { monthGoal: "Launch", monthGoalDate: "2026-02" };
    expect(calcGoalExpiry(data, makeDate("2026-03-15")).monthGoalStale).toBe(true);
  });

  it("should be true when monthGoalDate is prior year same month string order", () => {
    const data: Partial<WidgetData> = { monthGoal: "Launch", monthGoalDate: "2025-12" };
    expect(calcGoalExpiry(data, makeDate("2026-03-15")).monthGoalStale).toBe(true);
  });

  it("should include done:true in historyPatch entry when monthGoalDone is true", () => {
    const data: Partial<WidgetData> = {
      monthGoal: "Launch product",
      monthGoalDate: "2026-02",
      monthGoalDone: true,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.monthGoalStale).toBe(true);
    expect(result.historyPatch.monthGoalHistory).toEqual([
      { date: "2026-02", text: "Launch product", done: true },
    ]);
  });

  it("should cap monthGoalHistory at 12 entries", () => {
    const existing: GoalEntry[] = Array.from({ length: 12 }, (_, i) =>
      makeGoalEntry(`2025-${String(i + 1).padStart(2, "0")}`, `Month goal ${i + 1}`),
    );
    const data: Partial<WidgetData> = {
      monthGoal: "Overflow goal",
      monthGoalDate: "2026-01",
      monthGoalHistory: existing,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.historyPatch.monthGoalHistory).toHaveLength(12);
    expect(result.historyPatch.monthGoalHistory!.some(e => e.date === "2026-01")).toBe(true);
    expect(result.historyPatch.monthGoalHistory!.some(e => e.date === "2025-01")).toBe(false);
  });
});

// ─── quarterGoalStale ──────────────────────────────────────────────────────

describe("calcGoalExpiry — quarterGoalStale", () => {
  it("should be false when quarterGoalDate equals current quarter", () => {
    // 2026-03-15 → Q1 → "2026-Q1"
    const data: Partial<WidgetData> = { quarterGoal: "Q1 target", quarterGoalDate: "2026-Q1" };
    expect(calcGoalExpiry(data, makeDate("2026-03-15")).quarterGoalStale).toBe(false);
  });

  it("should be true when quarterGoalDate is a prior quarter same year", () => {
    const data: Partial<WidgetData> = { quarterGoal: "Q1 target", quarterGoalDate: "2025-Q4" };
    expect(calcGoalExpiry(data, makeDate("2026-03-15")).quarterGoalStale).toBe(true);
  });

  it("should be true for the prior quarter in the same year (Q1 → Q2 boundary)", () => {
    const data: Partial<WidgetData> = { quarterGoal: "Q1 target", quarterGoalDate: "2026-Q1" };
    // Now it's Q2
    expect(calcGoalExpiry(data, makeDate("2026-04-01")).quarterGoalStale).toBe(true);
  });

  it("should include done:true in historyPatch entry when quarterGoalDone is true", () => {
    const data: Partial<WidgetData> = {
      quarterGoal: "Q1 target",
      quarterGoalDate: "2025-Q4",
      quarterGoalDone: true,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.quarterGoalStale).toBe(true);
    expect(result.historyPatch.quarterGoalHistory).toEqual([
      { date: "2025-Q4", text: "Q1 target", done: true },
    ]);
  });

  it("should cap quarterGoalHistory at 8 entries (oldest dropped when N+1 entries would exceed cap)", () => {
    // 8 unique-dated entries spanning 2 years — no collisions with the stale date "2026-Q1"
    const existing: GoalEntry[] = [
      "2024-Q1", "2024-Q2", "2024-Q3", "2024-Q4",
      "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4",
    ].map((d, i) => makeGoalEntry(d, `Quarter goal ${i}`));
    const data: Partial<WidgetData> = {
      quarterGoal: "Overflow quarter goal",
      quarterGoalDate: "2026-Q1",
      quarterGoalHistory: existing,
    };
    const result = calcGoalExpiry(data, makeDate("2026-04-01"));
    expect(result.historyPatch.quarterGoalHistory).toHaveLength(8);
    expect(result.historyPatch.quarterGoalHistory!.some(e => e.date === "2026-Q1")).toBe(true);
    // "2024-Q1" (oldest) must be dropped when 9 entries are trimmed to 8
    expect(result.historyPatch.quarterGoalHistory!.some(e => e.date === "2024-Q1")).toBe(false);
  });
});

// ─── yearGoalStale ─────────────────────────────────────────────────────────

describe("calcGoalExpiry — yearGoalStale", () => {
  it("should be false when yearGoalDate equals current year", () => {
    const data: Partial<WidgetData> = { yearGoal: "2026 goal", yearGoalDate: "2026" };
    expect(calcGoalExpiry(data, makeDate("2026-03-15")).yearGoalStale).toBe(false);
  });

  it("should be true when yearGoalDate is a prior year", () => {
    const data: Partial<WidgetData> = { yearGoal: "2025 goal", yearGoalDate: "2025" };
    expect(calcGoalExpiry(data, makeDate("2026-03-15")).yearGoalStale).toBe(true);
  });

  it("should include done:true in historyPatch entry when yearGoalDone is true", () => {
    const data: Partial<WidgetData> = {
      yearGoal: "2025 goal",
      yearGoalDate: "2025",
      yearGoalDone: true,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.yearGoalStale).toBe(true);
    expect(result.historyPatch.yearGoalHistory).toEqual([
      { date: "2025", text: "2025 goal", done: true },
    ]);
  });

  it("should cap yearGoalHistory at 5 entries (oldest dropped when N+1 entries would exceed cap)", () => {
    // Existing history has 5 entries with dates NOT equal to the stale goal date "2025"
    // so adding "2025" yields 6 entries → slice(-5) drops the oldest "2020"
    const existing: GoalEntry[] = Array.from({ length: 5 }, (_, i) =>
      makeGoalEntry(String(2020 + i), `Year goal ${2020 + i}`),
    );
    const data: Partial<WidgetData> = {
      yearGoal: "Overflow year goal",
      yearGoalDate: "2025",
      yearGoalHistory: existing,
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.historyPatch.yearGoalHistory).toHaveLength(5);
    expect(result.historyPatch.yearGoalHistory!.some(e => e.date === "2025")).toBe(true);
    expect(result.historyPatch.yearGoalHistory!.some(e => e.date === "2020")).toBe(false);
  });
});

// ─── Multiple goals stale at once ─────────────────────────────────────────

describe("calcGoalExpiry — multiple goals stale", () => {
  it("should correctly report multiple stale flags when multiple goals have expired", () => {
    const data: Partial<WidgetData> = {
      weekGoal: "Old week goal",
      weekGoalDate: "2026-W10",
      monthGoal: "Old month goal",
      monthGoalDate: "2026-02",
      quarterGoal: "Old Q1 goal",
      quarterGoalDate: "2025-Q4",
      yearGoal: "Old year goal",
      yearGoalDate: "2025",
      todayIntention: "Old intention",
      todayIntentionDate: "2026-03-14",
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.intentionStale).toBe(true);
    expect(result.weekGoalStale).toBe(true);
    expect(result.monthGoalStale).toBe(true);
    expect(result.quarterGoalStale).toBe(true);
    expect(result.yearGoalStale).toBe(true);
    // historyPatch should contain entries for all non-intention stale goals
    expect(result.historyPatch.weekGoalHistory).toHaveLength(1);
    expect(result.historyPatch.monthGoalHistory).toHaveLength(1);
    expect(result.historyPatch.quarterGoalHistory).toHaveLength(1);
    expect(result.historyPatch.yearGoalHistory).toHaveLength(1);
  });

  it("should not include historyPatch keys for non-stale goals", () => {
    const data: Partial<WidgetData> = {
      weekGoal: "Current week goal",
      weekGoalDate: "2026-W11",
      monthGoal: "Old month goal",
      monthGoalDate: "2026-02",
    };
    const result = calcGoalExpiry(data, makeDate("2026-03-15"));
    expect(result.weekGoalStale).toBe(false);
    expect(result.monthGoalStale).toBe(true);
    expect(result.historyPatch.weekGoalHistory).toBeUndefined();
    expect(result.historyPatch.monthGoalHistory).toHaveLength(1);
  });
});

// ─── Year-boundary edge case ───────────────────────────────────────────────

describe("calcGoalExpiry — year boundary edge cases", () => {
  it("should correctly identify week goal as stale across year boundary (W52/W01)", () => {
    // 2025-12-28 is last week of 2025 (2025-W52). On 2026-01-05 (2026-W02), W52 is stale.
    const data: Partial<WidgetData> = {
      weekGoal: "Year-end goal",
      weekGoalDate: "2025-W52",
    };
    expect(calcGoalExpiry(data, makeDate("2026-01-05")).weekGoalStale).toBe(true);
  });

  it("should identify Dec 31 month goal as stale in January of the next year", () => {
    const data: Partial<WidgetData> = { monthGoal: "Dec goal", monthGoalDate: "2025-12" };
    expect(calcGoalExpiry(data, makeDate("2026-01-01")).monthGoalStale).toBe(true);
  });
});
