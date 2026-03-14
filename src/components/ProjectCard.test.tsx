// ABOUTME: Unit tests for ProjectCard projectAgeLabel helper
// ABOUTME: Validates age label (active projects, today anchor) and duration label (done projects, completedDate anchor)

import { describe, it, expect } from "vitest";
import { projectAgeLabel } from "./ProjectCard";

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
