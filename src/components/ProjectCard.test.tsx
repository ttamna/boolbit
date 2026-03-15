// ABOUTME: Unit tests for lib/projects pure helpers — projectAgeLabel, timeElapsedPct, deadlinePresetLabel,
// ABOUTME: and time-dependent helpers: relativeTime, staleColor, deadlineDays, deadlineRelative, lastFocusDaysAgo, deadlineColor

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { projectAgeLabel, timeElapsedPct, deadlinePresetLabel, relativeTime, staleColor, deadlineDays, deadlineRelative, lastFocusDaysAgo, deadlineColor } from "../lib/projects";
import { colors } from "../theme";

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

// Fixed system time for time-dependent helper tests.
// noon UTC on 2025-06-01 (Sunday) — Z suffix makes this timezone-independent.
const FIXED_NOW = new Date("2025-06-01T12:00:00Z");

// All 6 time-dependent describes share a single fake-timer scope to avoid
// stacked vi.useFakeTimers() calls across sequential beforeAll/afterAll pairs.
describe("time-dependent helpers", () => {
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED_NOW); });
  afterAll(() => { vi.useRealTimers(); });

  describe("relativeTime", () => {
    it("should return '—' for an invalid ISO string", () => {
      expect(relativeTime("not-a-date")).toBe("—");
    });

    it("should return minutes ago when diff < 60 minutes", () => {
      expect(relativeTime("2025-06-01T11:30:00Z")).toBe("30m ago");
    });

    it("should return '0m ago' for a timestamp equal to now", () => {
      expect(relativeTime(FIXED_NOW.toISOString())).toBe("0m ago");
    });

    it("should return '59m ago' at the minute boundary (just under 1h)", () => {
      expect(relativeTime("2025-06-01T11:01:00Z")).toBe("59m ago");
    });

    it("should return hours ago when diff ≥ 60 min and < 24h", () => {
      expect(relativeTime("2025-06-01T10:00:00Z")).toBe("2h ago");
    });

    it("should return '23h ago' at the hour boundary (just under 1 day)", () => {
      expect(relativeTime("2025-05-31T13:00:00Z")).toBe("23h ago");
    });

    it("should return days ago when diff ≥ 24h", () => {
      expect(relativeTime("2025-05-31T12:00:00Z")).toBe("1d ago");
    });

    it("should return '3d ago' for 3 days back", () => {
      expect(relativeTime("2025-05-29T12:00:00Z")).toBe("3d ago");
    });
  });

  describe("staleColor", () => {
    it("should return textDim for an invalid ISO string", () => {
      expect(staleColor("invalid")).toBe(colors.textDim);
    });

    it("should return textDim when commit is 1 day ago (≤ 2 days)", () => {
      expect(staleColor("2025-05-31T12:00:00Z")).toBe(colors.textDim);
    });

    it("should return textDim when commit is exactly 2 days ago (boundary: > 2 not met)", () => {
      expect(staleColor("2025-05-30T12:00:00Z")).toBe(colors.textDim);
    });

    it("should return statusProgress at 2 days + 1s ago (> 2 boundary met)", () => {
      expect(staleColor("2025-05-30T11:59:59Z")).toBe(colors.statusProgress);
    });

    it("should return statusProgress when commit is 3 days ago (> 2 days, ≤ 7 days)", () => {
      expect(staleColor("2025-05-29T12:00:00Z")).toBe(colors.statusProgress);
    });

    it("should return statusProgress when commit is exactly 7 days ago (boundary: > 7 not met)", () => {
      expect(staleColor("2025-05-25T12:00:00Z")).toBe(colors.statusProgress);
    });

    it("should return statusPaused when commit is 8 days ago (> 7 days)", () => {
      expect(staleColor("2025-05-24T12:00:00Z")).toBe(colors.statusPaused);
    });
  });

  describe("deadlineDays", () => {
    it("should return null for an empty string", () => {
      expect(deadlineDays("")).toBeNull();
    });

    it("should return null for a non-YYYY-MM-DD string", () => {
      expect(deadlineDays("next week")).toBeNull();
    });

    it("should return 0 when deadline is today", () => {
      expect(deadlineDays("2025-06-01")).toBe(0);
    });

    it("should return 7 when deadline is 7 days in the future", () => {
      expect(deadlineDays("2025-06-08")).toBe(7);
    });

    it("should return -1 when deadline was yesterday (1 day overdue)", () => {
      expect(deadlineDays("2025-05-31")).toBe(-1);
    });

    it("should return -7 when deadline was 7 days ago", () => {
      expect(deadlineDays("2025-05-25")).toBe(-7);
    });
  });

  describe("deadlineRelative", () => {
    it("should return '—' for an invalid date string", () => {
      expect(deadlineRelative("bad")).toBe("—");
    });

    it("should return '오늘 마감' when deadline is today", () => {
      expect(deadlineRelative("2025-06-01")).toBe("오늘 마감");
    });

    it("should return 'D-5' when 5 days remain", () => {
      expect(deadlineRelative("2025-06-06")).toBe("D-5");
    });

    it("should return '1d 초과' when 1 day overdue", () => {
      expect(deadlineRelative("2025-05-31")).toBe("1d 초과");
    });

    it("should return '7d 초과' when 7 days overdue", () => {
      expect(deadlineRelative("2025-05-25")).toBe("7d 초과");
    });
  });

  describe("lastFocusDaysAgo", () => {
    it("should return null when dateStr is undefined", () => {
      expect(lastFocusDaysAgo(undefined)).toBeNull();
    });

    it("should return null for an invalid date string", () => {
      expect(lastFocusDaysAgo("not-a-date")).toBeNull();
    });

    it("should return null when last focus was today (no stale indicator needed)", () => {
      expect(lastFocusDaysAgo("2025-06-01")).toBeNull();
    });

    it("should return 1 when last focus was yesterday", () => {
      expect(lastFocusDaysAgo("2025-05-31")).toBe(1);
    });

    it("should return 7 when last focus was a week ago", () => {
      expect(lastFocusDaysAgo("2025-05-25")).toBe(7);
    });
  });

  describe("deadlineColor", () => {
    it("should return textPhantom for an invalid date string", () => {
      expect(deadlineColor("invalid")).toBe(colors.textPhantom);
    });

    it("should return statusPaused when deadline is today (days = 0, urgent)", () => {
      expect(deadlineColor("2025-06-01")).toBe(colors.statusPaused);
    });

    it("should return statusPaused when deadline is overdue (days < 0)", () => {
      expect(deadlineColor("2025-05-31")).toBe(colors.statusPaused);
    });

    it("should return statusProgress when 7 days remain (boundary: ≤ 7)", () => {
      expect(deadlineColor("2025-06-08")).toBe(colors.statusProgress);
    });

    it("should return statusProgress when 3 days remain", () => {
      expect(deadlineColor("2025-06-04")).toBe(colors.statusProgress);
    });

    it("should return textSubtle when more than 7 days remain", () => {
      expect(deadlineColor("2025-06-09")).toBe(colors.textSubtle);
    });
  });
});
