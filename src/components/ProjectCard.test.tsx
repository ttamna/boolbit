// ABOUTME: Unit tests for ProjectCard projectAgeLabel and timeElapsedPct helpers
// ABOUTME: Validates age label (active/done projects) and schedule elapsed-time percentage

import { describe, it, expect } from "vitest";
import { projectAgeLabel, timeElapsedPct, deadlinePresetLabel } from "./ProjectCard";

describe("projectAgeLabel", () => {
  it("should return null when dateStr is undefined", () => {
    expect(projectAgeLabel(undefined)).toBeNull();
  });

  it("should return null when dateStr is invalid", () => {
    expect(projectAgeLabel("not-a-date")).toBeNull();
  });

  // today anchor (asOfDate absent) — tests the default path used for active projects
  it("should return month label for a date 60 days ago with no asOfDate (today anchor)", () => {
    // Dynamically compute a date 60 days before today so the test never becomes stale
    const d = new Date();
    d.setDate(d.getDate() - 60);
    const sixtyDaysAgo = d.toLocaleDateString("sv"); // YYYY-MM-DD
    expect(projectAgeLabel(sixtyDaysAgo)).toBe("2mo"); // Math.floor(60/30) = 2
  });

  it("should return null when dateStr is today with no asOfDate (no age yet)", () => {
    const today = new Date().toLocaleDateString("sv"); // YYYY-MM-DD
    expect(projectAgeLabel(today)).toBeNull();
  });

  // asOfDate param: done-project duration (createdDate → completedDate)
  it("should return day label when asOfDate is 6 days later", () => {
    // 6 days → "6d"; 7 days crosses week boundary → "1w"
    expect(projectAgeLabel("2025-01-01", "2025-01-07")).toBe("6d");
  });

  it("should return week label at the 7-day boundary", () => {
    expect(projectAgeLabel("2025-01-01", "2025-01-08")).toBe("1w");
  });

  it("should return week label when asOfDate is 14 days later", () => {
    expect(projectAgeLabel("2025-01-01", "2025-01-15")).toBe("2w");
  });

  it("should return week label at the 28-day boundary (last multiple of 7 before month)", () => {
    // days=28: Math.floor(28/7)=4 → "4w"; same as 29d — both under 30-day month threshold
    expect(projectAgeLabel("2025-01-01", "2025-01-29")).toBe("4w");
  });

  it("should return week label at the 29-day boundary (last week before month)", () => {
    // days=29: Math.floor(29/7)=4 → "4w"; days=30 crosses to month boundary
    expect(projectAgeLabel("2025-01-01", "2025-01-30")).toBe("4w");
  });

  it("should return month label at the 30-day boundary", () => {
    expect(projectAgeLabel("2025-01-01", "2025-01-31")).toBe("1mo");
  });

  it("should return month label when asOfDate is 31 days later", () => {
    expect(projectAgeLabel("2025-01-01", "2025-02-01")).toBe("1mo");
  });

  it("should return null when asOfDate equals createdDate (same day completion)", () => {
    // days === 0 → null; intentional — "∑0d" would be confusing
    expect(projectAgeLabel("2025-01-01", "2025-01-01")).toBeNull();
  });

  it("should return null when asOfDate is before createdDate", () => {
    expect(projectAgeLabel("2025-06-01", "2025-05-01")).toBeNull();
  });

  it("should return null when asOfDate is an invalid format", () => {
    expect(projectAgeLabel("2025-01-01", "bad-date")).toBeNull();
  });
});

describe("timeElapsedPct", () => {
  // Fixed reference point: project started Jan 1, deadline Mar 2 (60 days).
  // Tests inject `today` so they are deterministic regardless of when they run.
  const START = "2025-01-01";
  const END   = "2025-03-02"; // exactly 60 days after START

  it("should return null when createdDate is undefined", () => {
    expect(timeElapsedPct(undefined, END, new Date("2025-02-01T00:00:00"))).toBeNull();
  });

  it("should return null when deadline is undefined", () => {
    expect(timeElapsedPct(START, undefined, new Date("2025-02-01T00:00:00"))).toBeNull();
  });

  it("should return null when createdDate is invalid", () => {
    expect(timeElapsedPct("not-a-date", END, new Date("2025-02-01T00:00:00"))).toBeNull();
  });

  it("should return null when deadline is invalid", () => {
    expect(timeElapsedPct(START, "not-a-date", new Date("2025-02-01T00:00:00"))).toBeNull();
  });

  it("should return null when deadline equals createdDate (degenerate range)", () => {
    expect(timeElapsedPct("2025-01-01", "2025-01-01", new Date("2025-01-01T00:00:00"))).toBeNull();
  });

  it("should return null when deadline is before createdDate", () => {
    expect(timeElapsedPct("2025-06-01", "2025-01-01", new Date("2025-03-01T00:00:00"))).toBeNull();
  });

  it("should return 0 when today equals createdDate", () => {
    expect(timeElapsedPct(START, END, new Date("2025-01-01T00:00:00"))).toBe(0);
  });

  it("should return 50 at the midpoint (30 of 60 days elapsed)", () => {
    // START=Jan 1, END=Mar 2 (60 days); midpoint=Jan 31 (30 days elapsed)
    expect(timeElapsedPct(START, END, new Date("2025-01-31T00:00:00"))).toBe(50);
  });

  it("should return 100 when today equals deadline", () => {
    expect(timeElapsedPct(START, END, new Date("2025-03-02T00:00:00"))).toBe(100);
  });

  it("should clamp to 100 when today is past deadline", () => {
    expect(timeElapsedPct(START, END, new Date("2025-06-01T00:00:00"))).toBe(100);
  });

  it("should clamp to 0 when today is before createdDate", () => {
    expect(timeElapsedPct(START, END, new Date("2024-12-01T00:00:00"))).toBe(0);
  });

  it("should normalize sub-day today to midnight (same result for noon vs midnight)", () => {
    // Both noon and midnight on the midpoint day should yield 50%
    expect(timeElapsedPct(START, END, new Date("2025-01-31T12:00:00"))).toBe(50);
  });
});

describe("deadlinePresetLabel", () => {
  it("should return month label for 30-day multiples", () => {
    expect(deadlinePresetLabel(30)).toBe("+1달");
    expect(deadlinePresetLabel(90)).toBe("+3달");
    expect(deadlinePresetLabel(180)).toBe("+6달");
  });

  it("should return week label for 7-day multiples that are not month multiples", () => {
    expect(deadlinePresetLabel(7)).toBe("+1주");
    expect(deadlinePresetLabel(14)).toBe("+2주");
  });

  it("should return day label for values that are not week or month multiples", () => {
    expect(deadlinePresetLabel(1)).toBe("+1일");
    expect(deadlinePresetLabel(10)).toBe("+10일");
  });
});
