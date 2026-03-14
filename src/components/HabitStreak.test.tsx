// ABOUTME: Unit tests for HabitStreak pure helper functions
// ABOUTME: Covers habitLastCheckDaysAgo — days elapsed since last check-in from checkHistory

import { describe, it, expect } from "vitest";
import { habitLastCheckDaysAgo } from "./HabitStreak";

describe("habitLastCheckDaysAgo", () => {
  const TODAY = "2026-03-14";

  it("should return null when checkHistory is undefined", () => {
    expect(habitLastCheckDaysAgo(undefined, TODAY)).toBeNull();
  });

  it("should return null when checkHistory is empty", () => {
    expect(habitLastCheckDaysAgo([], TODAY)).toBeNull();
  });

  it("should return null when today is the last check", () => {
    expect(habitLastCheckDaysAgo(["2026-03-14"], TODAY)).toBeNull();
  });

  it("should return null when yesterday is the last check (atRisk already shown)", () => {
    expect(habitLastCheckDaysAgo(["2026-03-13"], TODAY)).toBeNull();
  });

  it("should return 2 when 2 days ago is the last check", () => {
    expect(habitLastCheckDaysAgo(["2026-03-12"], TODAY)).toBe(2);
  });

  it("should return 7 when 7 days ago is the last check", () => {
    expect(habitLastCheckDaysAgo(["2026-03-07"], TODAY)).toBe(7);
  });

  it("should use the most recent (last) entry when history has multiple dates", () => {
    // checkHistory is sorted ascending — last entry is most recent
    expect(habitLastCheckDaysAgo(["2026-03-01", "2026-03-10", "2026-03-12"], TODAY)).toBe(2);
  });

  it("should return null for malformed date strings in checkHistory", () => {
    expect(habitLastCheckDaysAgo(["not-a-date"], TODAY)).toBeNull();
  });

  it("should return null when today parameter is malformed", () => {
    expect(habitLastCheckDaysAgo(["2026-03-12"], "not-a-date")).toBeNull();
  });

  it("should return null for future lastCheck dates (clock skew or manual edit)", () => {
    // Future date produces negative days; days >= 2 is false, so null is returned safely
    expect(habitLastCheckDaysAgo(["2026-03-20"], TODAY)).toBeNull();
  });
});
