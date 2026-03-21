// ABOUTME: Tests for pure functions in lib/projects.ts
// ABOUTME: Covers calcProjectsBadge, avgRunningProgressPct, sortProjects, calcCompletionForecast, calcProjectPomodoroMilestone, calcFocusSuggestion, and 11 date/deadline/staleness helpers (incl. dateAfterDays, calcScheduleGap)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calcProjectsBadge,
  avgRunningProgressPct,
  sortProjects,
  relativeTime,
  staleColor,
  deadlineDays,
  deadlineRelative,
  lastFocusDaysAgo,
  projectAgeLabel,
  deadlinePresetLabel,
  timeElapsedPct,
  deadlineColor,
  dateAfterDays,
  calcScheduleGap,
  calcCompletionForecast,
  calcProjectMilestone,
  calcProjectCompletionNotify,
  calcProjectPomodoroMilestone,
  calcFocusSuggestion,
} from "./projects";
import { colors } from "../theme";
import type { Project, PomodoroDay } from "../types";

// Minimal project factory
function makeProject(overrides: Partial<Project> & { id: number }): Project {
  return {
    name: "TestProject",
    status: "active",
    goal: "",
    progress: 50,
    metric: "",
    metric_value: "",
    metric_target: "",
    ...overrides,
  };
}

// Fixed 7-day window anchored on a known date
// last7Days[6] = today = "2024-06-10"
const TODAY = "2024-06-10";
const last7Days = [
  "2024-06-04",
  "2024-06-05",
  "2024-06-06",
  "2024-06-07",
  "2024-06-08",
  "2024-06-09",
  TODAY,
];
const todayMidnight = new Date(TODAY + "T00:00:00");

describe("calcProjectsBadge", () => {
  describe("empty / all-done projects", () => {
    it("should return undefined when projects array is empty", () => {
      expect(calcProjectsBadge({ projects: [], last7Days, todayMidnight })).toBeUndefined();
    });

    it("should return undefined when all projects are done", () => {
      const projects = [
        makeProject({ id: 1, status: "done" }),
        makeProject({ id: 2, status: "done" }),
      ];
      expect(calcProjectsBadge({ projects, last7Days, todayMidnight })).toBeUndefined();
    });
  });

  describe("running count and avgProgress", () => {
    it("should show N/total and avgProgress for one active project", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 40 })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toBe("1/1 · 40%");
    });

    it("should show 0/total without avgProgress when no running projects", () => {
      const projects = [
        makeProject({ id: 1, status: "paused", progress: 30 }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toBe("0/1");
    });

    it("should average progress over running projects only (excludes paused)", () => {
      const projects = [
        makeProject({ id: 1, status: "active", progress: 60 }),
        makeProject({ id: 2, status: "in-progress", progress: 40 }),
        makeProject({ id: 3, status: "paused", progress: 10 }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      // avg of 60+40 = 50; total non-done = 3
      expect(badge).toBe("2/3 · 50%");
    });

    it("should round avgProgress to nearest integer", () => {
      const projects = [
        makeProject({ id: 1, status: "active", progress: 10 }),
        makeProject({ id: 2, status: "active", progress: 20 }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      // avg = 15
      expect(badge).toBe("2/2 · 15%");
    });

    it("should not count done projects in nonDoneProjects total", () => {
      const projects = [
        makeProject({ id: 1, status: "active", progress: 50 }),
        makeProject({ id: 2, status: "done", progress: 100 }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toBe("1/1 · 50%");
    });
  });

  describe("focus project name", () => {
    it("should prepend ★ <firstWord> when a non-done project is focused", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 70, isFocus: true, name: "MyProject Alpha" })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toMatch(/^★ MyProject/);
    });

    it("should truncate focus name to exactly 12 characters", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50, isFocus: true, name: "VeryLongProjectNameHere" })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      // "VeryLongProjectNameHere".slice(0, 12) === "VeryLongProj"
      expect(badge).toMatch(/^★ VeryLongProj /);
    });

    it("should not show ★ prefix when focused project has an empty name, but badge is still produced", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50, isFocus: true, name: "" })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toBeDefined();
      expect(badge).not.toContain("★");
    });

    it("should not show ★ prefix for done focused project", () => {
      const projects = [
        makeProject({ id: 1, status: "done", progress: 100, isFocus: true }),
        makeProject({ id: 2, status: "active", progress: 50 }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).not.toContain("★");
    });

    it("should use only the first word of the project name", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50, isFocus: true, name: "First Second Third" })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toContain("★ First");
      expect(badge).not.toContain("Second");
    });

    it("should show no ★ prefix when no project is focused", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50, isFocus: false })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).not.toContain("★");
    });

    it("should use focusProjectName over the isFocus project when both exist", () => {
      // isFocus=true project is present but focusProjectName takes priority
      const projects = [makeProject({ id: 1, status: "active", progress: 50, isFocus: true, name: "InternalName" })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight, focusProjectName: "External" });
      expect(badge).toMatch(/^★ External/);
      expect(badge).not.toContain("InternalName");
    });

    it("should fall back to internal isFocus search when focusProjectName is empty string", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50, isFocus: true, name: "Alpha" })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight, focusProjectName: "" });
      expect(badge).toMatch(/^★ Alpha/);
    });

    it("should fall back to internal isFocus search when focusProjectName is whitespace-only", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50, isFocus: true, name: "Beta" })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight, focusProjectName: "   " });
      expect(badge).toMatch(/^★ Beta/);
    });
  });

  describe("overdue count", () => {
    it("should append ⚠N for non-done projects with past deadline", () => {
      const projects = [
        makeProject({ id: 1, status: "active", progress: 50, deadline: "2024-06-01" }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toContain("⚠1");
    });

    it("should count deadline exactly today (days === 0) as overdue", () => {
      const projects = [
        makeProject({ id: 1, status: "active", progress: 50, deadline: TODAY }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toContain("⚠1");
    });

    it("should not count future deadlines as overdue", () => {
      const projects = [
        makeProject({ id: 1, status: "active", progress: 50, deadline: "2024-12-31" }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).not.toContain("⚠");
    });

    it("should not count done projects with past deadline as overdue", () => {
      const projects = [
        makeProject({ id: 1, status: "done", progress: 100, deadline: "2024-06-01" }),
        makeProject({ id: 2, status: "active", progress: 50 }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).not.toContain("⚠");
    });

    it("should not count projects with invalid deadline format", () => {
      const projects = [
        makeProject({ id: 1, status: "active", progress: 50, deadline: "not-a-date" }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).not.toContain("⚠");
    });

    it("should not show ⚠ segment when overdueCount is 0", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50 })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).not.toContain("⚠");
    });
  });

  describe("recently done count", () => {
    it("should append ✓N·7d for projects completed within last 7 days", () => {
      const projects = [
        makeProject({ id: 1, status: "done", progress: 100, completedDate: "2024-06-08" }),
        makeProject({ id: 2, status: "active", progress: 50 }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toContain("✓1·7d");
    });

    it("should not count done projects completed outside last 7 days", () => {
      const projects = [
        makeProject({ id: 1, status: "done", progress: 100, completedDate: "2024-05-01" }),
        makeProject({ id: 2, status: "active", progress: 50 }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).not.toContain("✓");
    });

    it("should not show ✓ segment when no recent completions", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50 })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).not.toContain("✓");
    });

    it("should count multiple recently done projects", () => {
      const projects = [
        makeProject({ id: 1, status: "done", progress: 100, completedDate: "2024-06-09" }),
        makeProject({ id: 2, status: "done", progress: 100, completedDate: "2024-06-08" }),
        makeProject({ id: 3, status: "active", progress: 20 }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toContain("✓2·7d");
    });
  });

  describe("weekly pomodoro count", () => {
    it("should append 🍅N·7d when pomodoro sessions exist in the window", () => {
      const pomodoroHistory: PomodoroDay[] = [{ date: "2024-06-09", count: 3 }];
      const projects = [makeProject({ id: 1, status: "active", progress: 50 })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight, pomodoroHistory });
      expect(badge).toContain("🍅3·7d");
    });

    it("should sum sessions across multiple days in the window", () => {
      const pomodoroHistory: PomodoroDay[] = [
        { date: "2024-06-08", count: 2 },
        { date: "2024-06-09", count: 3 },
      ];
      const projects = [makeProject({ id: 1, status: "active", progress: 50 })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight, pomodoroHistory });
      expect(badge).toContain("🍅5·7d");
    });

    it("should not count sessions outside the 7-day window", () => {
      const pomodoroHistory: PomodoroDay[] = [{ date: "2024-05-01", count: 10 }];
      const projects = [makeProject({ id: 1, status: "active", progress: 50 })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight, pomodoroHistory });
      expect(badge).not.toContain("🍅");
    });

    it("should not show 🍅 when pomodoroHistory is absent", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50 })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).not.toContain("🍅");
    });
  });

  describe("combined badge format", () => {
    it("should join segments with ` · ` separator", () => {
      const projects = [makeProject({ id: 1, status: "active", progress: 50 })];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight });
      expect(badge).toBe("1/1 · 50%");
    });

    it("should produce full badge with all segments", () => {
      const pomodoroHistory: PomodoroDay[] = [{ date: TODAY, count: 4 }];
      const projects = [
        makeProject({ id: 1, status: "active", progress: 80, isFocus: true, name: "Alpha", deadline: "2024-06-01" }),
        makeProject({ id: 2, status: "done", progress: 100, completedDate: TODAY }),
      ];
      const badge = calcProjectsBadge({ projects, last7Days, todayMidnight, pomodoroHistory });
      // nonDone=1, running=1, avg=80, focus=Alpha, overdue=1, recentDone=1, pomodoro=4
      expect(badge).toBe("★ Alpha · 1/1 · 80% · 🍅4·7d · ⚠1 · ✓1·7d");
    });
  });
});

// ─── Date/time helpers ────────────────────────────────────────────────────────
// Frozen at 2024-06-10T12:00:00Z (noon UTC) for deterministic tests.
// Local midnight varies by timezone; functions that use new Date() + setHours(0,0,0,0) are tested
// with setSystemTime so they produce a stable "today" regardless of the runner's tz offset.
const FROZEN_ISO = "2024-06-10T12:00:00.000Z";
const FROZEN_DATE = new Date(FROZEN_ISO);

describe("relativeTime", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FROZEN_DATE); });
  afterEach(() => { vi.useRealTimers(); });

  it("should return '—' for an invalid date string", () => {
    expect(relativeTime("not-a-date")).toBe("—");
  });

  it("should return '—' for an empty string", () => {
    expect(relativeTime("")).toBe("—");
  });

  it("should return '0m ago' when the timestamp equals now", () => {
    expect(relativeTime(FROZEN_ISO)).toBe("0m ago");
  });

  it("should return '30m ago' for 30 minutes ago", () => {
    const ts = new Date(FROZEN_DATE.getTime() - 30 * 60000).toISOString();
    expect(relativeTime(ts)).toBe("30m ago");
  });

  it("should return '59m ago' just before the 1-hour threshold", () => {
    const ts = new Date(FROZEN_DATE.getTime() - 59 * 60000).toISOString();
    expect(relativeTime(ts)).toBe("59m ago");
  });

  it("should return '1h ago' exactly at 60 minutes", () => {
    const ts = new Date(FROZEN_DATE.getTime() - 60 * 60000).toISOString();
    expect(relativeTime(ts)).toBe("1h ago");
  });

  it("should return '23h ago' just before the 1-day threshold", () => {
    const ts = new Date(FROZEN_DATE.getTime() - 23 * 3600000).toISOString();
    expect(relativeTime(ts)).toBe("23h ago");
  });

  it("should return '1d ago' exactly at 24 hours", () => {
    const ts = new Date(FROZEN_DATE.getTime() - 24 * 3600000).toISOString();
    expect(relativeTime(ts)).toBe("1d ago");
  });

  it("should return '7d ago' for 7 days ago", () => {
    const ts = new Date(FROZEN_DATE.getTime() - 7 * 86400000).toISOString();
    expect(relativeTime(ts)).toBe("7d ago");
  });

  it("should clamp future timestamps to '0m ago' (Math.max guard)", () => {
    const future = new Date(FROZEN_DATE.getTime() + 60000).toISOString();
    expect(relativeTime(future)).toBe("0m ago");
  });
});

describe("staleColor", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FROZEN_DATE); });
  afterEach(() => { vi.useRealTimers(); });

  it("should return textDim for an invalid date string", () => {
    expect(staleColor("bad")).toBe(colors.textDim);
  });

  it("should return textDim when commit is today (0 days stale)", () => {
    expect(staleColor(FROZEN_ISO)).toBe(colors.textDim);
  });

  it("should return textDim when commit is exactly 2 days ago (boundary: >2 triggers amber)", () => {
    const ts = new Date(FROZEN_DATE.getTime() - 2 * 86400000).toISOString();
    expect(staleColor(ts)).toBe(colors.textDim);
  });

  it("should return statusProgress when commit is 2 days 1 hour ago (just over 2-day threshold)", () => {
    // Use 49 hours (> 2 days) to avoid floating-point ambiguity at the ms-level boundary
    const ts = new Date(FROZEN_DATE.getTime() - 49 * 3600000).toISOString();
    expect(staleColor(ts)).toBe(colors.statusProgress);
  });

  it("should return statusProgress when commit is exactly 7 days ago (boundary: >7 triggers red)", () => {
    const ts = new Date(FROZEN_DATE.getTime() - 7 * 86400000).toISOString();
    expect(staleColor(ts)).toBe(colors.statusProgress);
  });

  it("should return statusPaused when commit is 7 days 1 hour ago (just over 7-day threshold)", () => {
    // Use 169 hours (> 7 days) to avoid floating-point ambiguity at the ms-level boundary
    const ts = new Date(FROZEN_DATE.getTime() - 169 * 3600000).toISOString();
    expect(staleColor(ts)).toBe(colors.statusPaused);
  });

  it("should return statusPaused for a very old commit (30 days ago)", () => {
    const ts = new Date(FROZEN_DATE.getTime() - 30 * 86400000).toISOString();
    expect(staleColor(ts)).toBe(colors.statusPaused);
  });
});

describe("deadlineDays", () => {
  // Freeze to a known local date: 2024-06-10 (local midnight determined per runner tz,
  // but since we freeze at noon UTC the local date is stable for UTC±11 timezones)
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2024-06-10T12:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("should return null for an empty string", () => {
    expect(deadlineDays("")).toBeNull();
  });

  it("should return null for an invalid format (not YYYY-MM-DD)", () => {
    expect(deadlineDays("June 10 2024")).toBeNull();
  });

  it("should return null for a partial date string", () => {
    expect(deadlineDays("2024-06")).toBeNull();
  });

  it("should return 0 when the deadline is today", () => {
    expect(deadlineDays("2024-06-10")).toBe(0);
  });

  it("should return 1 when the deadline is tomorrow", () => {
    expect(deadlineDays("2024-06-11")).toBe(1);
  });

  it("should return -1 when the deadline was yesterday", () => {
    expect(deadlineDays("2024-06-09")).toBe(-1);
  });

  it("should return 5 when the deadline is 5 days away", () => {
    expect(deadlineDays("2024-06-15")).toBe(5);
  });

  it("should return -5 when the deadline was 5 days ago", () => {
    expect(deadlineDays("2024-06-05")).toBe(-5);
  });
});

describe("deadlineRelative", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2024-06-10T12:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("should return '—' for an invalid date string", () => {
    expect(deadlineRelative("")).toBe("—");
  });

  it("should return '오늘 마감' when deadline is today", () => {
    expect(deadlineRelative("2024-06-10")).toBe("오늘 마감");
  });

  it("should return 'D-1' when deadline is tomorrow", () => {
    expect(deadlineRelative("2024-06-11")).toBe("D-1");
  });

  it("should return 'D-5' when deadline is 5 days away", () => {
    expect(deadlineRelative("2024-06-15")).toBe("D-5");
  });

  it("should return '1d 초과' when deadline was yesterday", () => {
    expect(deadlineRelative("2024-06-09")).toBe("1d 초과");
  });

  it("should return '10d 초과' when deadline was 10 days ago", () => {
    expect(deadlineRelative("2024-05-31")).toBe("10d 초과");
  });
});

describe("lastFocusDaysAgo", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2024-06-10T12:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("should return null for undefined input", () => {
    expect(lastFocusDaysAgo(undefined)).toBeNull();
  });

  it("should return null for an empty string", () => {
    expect(lastFocusDaysAgo("")).toBeNull();
  });

  it("should return null for an invalid format", () => {
    expect(lastFocusDaysAgo("June 10")).toBeNull();
  });

  it("should return null when lastFocusDate is today (no stale indicator needed)", () => {
    expect(lastFocusDaysAgo("2024-06-10")).toBeNull();
  });

  it("should return 1 when last focused yesterday", () => {
    expect(lastFocusDaysAgo("2024-06-09")).toBe(1);
  });

  it("should return 3 when last focused 3 days ago", () => {
    expect(lastFocusDaysAgo("2024-06-07")).toBe(3);
  });

  it("should return null for a future date (focus date ahead of today — unexpected but guarded)", () => {
    // days = floor((today - future) / 86400000) < 0 → days <= 0 → null
    expect(lastFocusDaysAgo("2024-06-15")).toBeNull();
  });
});

describe("projectAgeLabel", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2024-06-10T12:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("should return null for undefined createdDate", () => {
    expect(projectAgeLabel(undefined)).toBeNull();
  });

  it("should return null for an invalid format", () => {
    expect(projectAgeLabel("2024/06/10")).toBeNull();
  });

  it("should return null when createdDate equals today (0 days elapsed — too new for a label)", () => {
    expect(projectAgeLabel("2024-06-10")).toBeNull();
  });

  it("should return null when createdDate is in the future", () => {
    expect(projectAgeLabel("2024-06-15")).toBeNull();
  });

  it("should return '3d' for a 3-day-old project", () => {
    expect(projectAgeLabel("2024-06-07")).toBe("3d");
  });

  it("should return '6d' just before the 1-week threshold", () => {
    expect(projectAgeLabel("2024-06-04")).toBe("6d");
  });

  it("should return '1w' exactly at 7 days", () => {
    expect(projectAgeLabel("2024-06-03")).toBe("1w");
  });

  it("should return '2w' at 14 days", () => {
    expect(projectAgeLabel("2024-05-27")).toBe("2w");
  });

  it("should return '4w' at 28 days (just under 1 month)", () => {
    expect(projectAgeLabel("2024-05-13")).toBe("4w");
  });

  it("should return '1mo' exactly at 30 days", () => {
    expect(projectAgeLabel("2024-05-11")).toBe("1mo");
  });

  it("should return '2mo' at 60 days", () => {
    expect(projectAgeLabel("2024-04-11")).toBe("2mo");
  });

  it("should use asOfDate as the end anchor instead of today (future asOfDate differs from frozen today)", () => {
    // createdDate = 2024-05-10, asOfDate = 2024-07-10 (ahead of frozen today 2024-06-10)
    // May 10 → July 10 = 61 days → Math.floor(61/30)=2 → "2mo"
    // This verifies asOfDate branch is independent of the "today" branch.
    expect(projectAgeLabel("2024-05-10", "2024-07-10")).toBe("2mo");
  });

  it("should return null when asOfDate equals createdDate (0-day duration)", () => {
    expect(projectAgeLabel("2024-06-10", "2024-06-10")).toBeNull();
  });

  it("should return null for an invalid asOfDate format", () => {
    expect(projectAgeLabel("2024-06-01", "June 10")).toBeNull();
  });
});

describe("deadlinePresetLabel", () => {
  it("should return '+N달' for multiples of 30 days", () => {
    expect(deadlinePresetLabel(30)).toBe("+1달");
    expect(deadlinePresetLabel(60)).toBe("+2달");
    expect(deadlinePresetLabel(90)).toBe("+3달");
  });

  it("should return '+N주' for multiples of 7 days (that are not multiples of 30)", () => {
    expect(deadlinePresetLabel(7)).toBe("+1주");
    expect(deadlinePresetLabel(14)).toBe("+2주");
    expect(deadlinePresetLabel(21)).toBe("+3주");
  });

  it("should return '+N일' for non-week, non-month days", () => {
    expect(deadlinePresetLabel(1)).toBe("+1일");
    expect(deadlinePresetLabel(3)).toBe("+3일");
    expect(deadlinePresetLabel(10)).toBe("+10일");
  });

  it("should return '+0달' for 0 days (edge case: 0 % 30 === 0)", () => {
    expect(deadlinePresetLabel(0)).toBe("+0달");
  });

  it("should prefer 달 over 주 for days that are multiples of both 7 and 30 (30-check runs first)", () => {
    // 210 = 7 × 30, so both conditions match; 달 wins because the 30 condition is checked first
    expect(deadlinePresetLabel(210)).toBe("+7달");
  });
});

describe("timeElapsedPct", () => {
  it("should return null when createdDate is undefined", () => {
    expect(timeElapsedPct(undefined, "2024-12-31")).toBeNull();
  });

  it("should return null when deadline is undefined", () => {
    expect(timeElapsedPct("2024-01-01", undefined)).toBeNull();
  });

  it("should return null for an invalid createdDate format", () => {
    expect(timeElapsedPct("2024/01/01", "2024-12-31")).toBeNull();
  });

  it("should return null for an invalid deadline format", () => {
    expect(timeElapsedPct("2024-01-01", "Dec 31 2024")).toBeNull();
  });

  it("should return null when deadline equals createdDate (degenerate range)", () => {
    expect(timeElapsedPct("2024-06-10", "2024-06-10")).toBeNull();
  });

  it("should return null when deadline is before createdDate", () => {
    expect(timeElapsedPct("2024-06-10", "2024-06-01")).toBeNull();
  });

  it("should return 0 when today equals createdDate (start of project)", () => {
    // T00:00:00 (no Z) = local midnight; implementation calls setHours(0,0,0,0) after copying,
    // which is a no-op on local midnight. UTC midnight ("T00:00:00Z") would shift to a different
    // local day in non-UTC timezones, breaking the test.
    const today = new Date("2024-01-01T00:00:00");
    expect(timeElapsedPct("2024-01-01", "2024-12-31", today)).toBe(0);
  });

  it("should return 100 when today equals deadline (end of project)", () => {
    const today = new Date("2024-12-31T00:00:00");
    expect(timeElapsedPct("2024-01-01", "2024-12-31", today)).toBe(100);
  });

  it("should return 100 when today is after the deadline (clamped)", () => {
    const today = new Date("2025-03-01T00:00:00");
    expect(timeElapsedPct("2024-01-01", "2024-12-31", today)).toBe(100);
  });

  it("should return 0 when today is before createdDate (clamped)", () => {
    const today = new Date("2023-12-31T00:00:00");
    expect(timeElapsedPct("2024-01-01", "2024-12-31", today)).toBe(0);
  });

  it("should return exactly 50 at the midpoint of a 60-day range", () => {
    // 2024-01-01 → 2024-03-01 is exactly 60 days (Jan=31, Feb=29 leap year)
    // today = 2024-01-31 (30 days in) → Math.round(30/60*100) = Math.round(50.0) = 50
    const today = new Date("2024-01-31T00:00:00");
    expect(timeElapsedPct("2024-01-01", "2024-03-01", today)).toBe(50);
  });
});

describe("dateAfterDays", () => {
  it("should return a YYYY-MM-DD string 7 days after the given anchor date", () => {
    const from = new Date("2024-06-10T00:00:00");
    expect(dateAfterDays(7, from)).toBe("2024-06-17");
  });

  it("should return the anchor date itself when n is 0", () => {
    const from = new Date("2024-06-10T00:00:00");
    expect(dateAfterDays(0, from)).toBe("2024-06-10");
  });

  it("should cross month boundaries correctly", () => {
    const from = new Date("2024-01-28T00:00:00");
    expect(dateAfterDays(7, from)).toBe("2024-02-04");
  });

  it("should cross year boundaries correctly", () => {
    const from = new Date("2024-12-28T00:00:00");
    expect(dateAfterDays(7, from)).toBe("2025-01-04");
  });

  it("should return a date in the past when n is negative", () => {
    const from = new Date("2024-06-10T00:00:00");
    expect(dateAfterDays(-3, from)).toBe("2024-06-07");
  });

  it("should handle n=30 (month preset)", () => {
    const from = new Date("2024-06-10T00:00:00");
    expect(dateAfterDays(30, from)).toBe("2024-07-10");
  });

  it("should handle n=90 (3-month preset)", () => {
    const from = new Date("2024-06-10T00:00:00");
    expect(dateAfterDays(90, from)).toBe("2024-09-08");
  });

  it("should use today when from is omitted (production-usage path)", () => {
    // Matches how ProjectCard.tsx calls: dateAfterDays(days) — no injection
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-10T12:00:00Z"));
    try {
      expect(dateAfterDays(7)).toBe("2024-06-17");
      expect(dateAfterDays(14)).toBe("2024-06-24");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("calcScheduleGap", () => {
  // Uses timeElapsedPct internally, so inject today for determinism
  const START = "2024-01-01";
  const END   = "2024-03-01"; // 60 days from START (2024 is a leap year; Jan=31, Feb=29)

  it("should return null when createdDate is undefined", () => {
    expect(calcScheduleGap(50, undefined, END)).toBeNull();
  });

  it("should return null when deadline is undefined", () => {
    expect(calcScheduleGap(50, START, undefined)).toBeNull();
  });

  it("should return null when timePct is null (invalid dates)", () => {
    expect(calcScheduleGap(50, "bad-date", END)).toBeNull();
  });

  it("should return null when timePct < 10 (too early to judge schedule)", () => {
    // 3 of 60 days elapsed → timePct = Math.round(3/60*100) = 5 → < 10 → null
    const today = new Date("2024-01-04T00:00:00");
    expect(calcScheduleGap(50, START, END, today)).toBeNull();
  });

  it("should return null when timePct rounds to 8 (< 10 boundary still suppresses)", () => {
    // 5 of 60 days elapsed → timePct = Math.round(5/60*100) = Math.round(8.33) = 8 → < 10 → null
    const today = new Date("2024-01-06T00:00:00");
    expect(calcScheduleGap(50, START, END, today)).toBeNull();
  });

  it("should NOT return null when timePct equals exactly 10 (first non-suppressed value)", () => {
    // 6 of 60 days elapsed → timePct = Math.round(6/60*100) = Math.round(10) = 10 → >= 10 → non-null
    const today = new Date("2024-01-07T00:00:00");
    const result = calcScheduleGap(50, START, END, today);
    expect(result).not.toBeNull();
    expect(result?.timePct).toBe(10);
  });

  it("should return { gap, timePct } when timePct >= 10", () => {
    // 30 of 60 days elapsed → timePct = 50; progress = 70 → gap = 20
    const today = new Date("2024-01-31T00:00:00");
    expect(calcScheduleGap(70, START, END, today)).toEqual({ gap: 20, timePct: 50 });
  });

  it("should return negative gap when progress is behind schedule", () => {
    // timePct = 50, progress = 30 → gap = -20
    const today = new Date("2024-01-31T00:00:00");
    expect(calcScheduleGap(30, START, END, today)).toEqual({ gap: -20, timePct: 50 });
  });

  it("should return gap = 0 when progress exactly matches elapsed time", () => {
    // timePct = 50, progress = 50 → gap = 0
    const today = new Date("2024-01-31T00:00:00");
    expect(calcScheduleGap(50, START, END, today)).toEqual({ gap: 0, timePct: 50 });
  });

  it("should round gap to nearest integer when progress - timePct is not a whole number", () => {
    // 7 of 60 days elapsed → timePct = Math.round(7/60*100) = Math.round(11.67) = 12
    // progress=20 → gap = Math.round(20 - 12) = 8
    const today = new Date("2024-01-08T00:00:00");
    const result = calcScheduleGap(20, START, END, today);
    expect(result?.gap).toBe(8);
    expect(result?.timePct).toBe(12);
  });

  it("should clamp timePct to 100 when today is past deadline", () => {
    // today well past deadline → timePct = 100; progress = 80 → gap = -20
    const today = new Date("2025-06-01T00:00:00");
    expect(calcScheduleGap(80, START, END, today)).toEqual({ gap: -20, timePct: 100 });
  });
});

describe("deadlineColor", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2024-06-10T12:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("should return textPhantom for an invalid date string", () => {
    expect(deadlineColor("")).toBe(colors.textPhantom);
  });

  it("should return statusPaused when deadline is today (days = 0, due today = urgent)", () => {
    expect(deadlineColor("2024-06-10")).toBe(colors.statusPaused);
  });

  it("should return statusPaused when deadline is in the past (overdue)", () => {
    expect(deadlineColor("2024-06-01")).toBe(colors.statusPaused);
  });

  it("should return statusProgress when deadline is 1 day away (within 7-day warning)", () => {
    expect(deadlineColor("2024-06-11")).toBe(colors.statusProgress);
  });

  it("should return statusProgress exactly at 7 days remaining (boundary)", () => {
    expect(deadlineColor("2024-06-17")).toBe(colors.statusProgress);
  });

  it("should return textSubtle when deadline is 8 days away (beyond 7-day warning)", () => {
    expect(deadlineColor("2024-06-18")).toBe(colors.textSubtle);
  });

  it("should return textSubtle for a far-future deadline", () => {
    expect(deadlineColor("2025-12-31")).toBe(colors.textSubtle);
  });
});

// ─── avgRunningProgressPct ───────────────────────────────────────────────────

// Auto-incrementing id helper — unique per describe block; reset in beforeEach.
let _pct_id = 0;
function makePctProject(overrides: Partial<Project> = {}): Project {
  return {
    id: ++_pct_id,
    name: "Test",
    status: "active",
    goal: "goal",
    progress: 0,
    metric: "m",
    metric_value: "0",
    metric_target: "100",
    ...overrides,
  };
}

describe("avgRunningProgressPct", () => {
  beforeEach(() => { _pct_id = 0; });

  it("should return null for empty project array", () => {
    expect(avgRunningProgressPct([])).toBeNull();
  });

  it("should return null when all projects are done", () => {
    const projects = [
      makePctProject({ status: "done", progress: 80 }),
      makePctProject({ status: "done", progress: 100 }),
    ];
    expect(avgRunningProgressPct(projects)).toBeNull();
  });

  it("should return null when all projects are paused", () => {
    expect(avgRunningProgressPct([makePctProject({ status: "paused", progress: 40 })])).toBeNull();
  });

  it("should return 0 when single active project has 0 progress", () => {
    expect(avgRunningProgressPct([makePctProject({ status: "active", progress: 0 })])).toBe(0);
  });

  it("should return 100 when single active project is complete", () => {
    expect(avgRunningProgressPct([makePctProject({ status: "active", progress: 100 })])).toBe(100);
  });

  it("should return progress when only in-progress project exists", () => {
    expect(avgRunningProgressPct([makePctProject({ status: "in-progress", progress: 55 })])).toBe(55);
  });

  it("should average progress of active and in-progress projects", () => {
    const projects = [
      makePctProject({ status: "active", progress: 40 }),
      makePctProject({ status: "in-progress", progress: 60 }),
    ];
    expect(avgRunningProgressPct(projects)).toBe(50);
  });

  it("should exclude done and paused projects from average", () => {
    const projects = [
      makePctProject({ status: "active", progress: 60 }),
      makePctProject({ status: "done", progress: 100 }),
      makePctProject({ status: "paused", progress: 20 }),
    ];
    expect(avgRunningProgressPct(projects)).toBe(60);
  });

  it("should round to nearest integer", () => {
    const projects = [
      makePctProject({ status: "active", progress: 10 }),
      makePctProject({ status: "active", progress: 21 }),
    ];
    // (10 + 21) / 2 = 15.5 → rounds to 16
    expect(avgRunningProgressPct(projects)).toBe(16);
  });

  it("should clamp result to 100 for out-of-range progress values", () => {
    expect(avgRunningProgressPct([makePctProject({ status: "active", progress: 120 })])).toBe(100);
  });

  it("should clamp result to 0 for negative progress values", () => {
    expect(avgRunningProgressPct([makePctProject({ status: "active", progress: -10 })])).toBe(0);
  });
});

// ─── sortProjects ────────────────────────────────────────────────────────────

let _sort_id = 0;
function makeSortProject(overrides: Partial<Project> = {}): Project {
  return {
    id: ++_sort_id,
    name: "Test",
    status: "active",
    goal: "goal",
    progress: 0,
    metric: "m",
    metric_value: "0",
    metric_target: "100",
    ...overrides,
  };
}

describe("sortProjects", () => {
  // Fixed reference date: 2025-06-01 local midnight.
  // Numeric constructor guarantees local-time interpretation (avoids ISO implicit-UTC).
  const REF_DATE = new Date(2025, 5, 1); // 0-indexed month: 5 = June

  beforeEach(() => { _sort_id = 0; });

  it("should return empty array for empty input", () => {
    expect(sortProjects([], REF_DATE)).toEqual([]);
  });

  it("should return single project unchanged", () => {
    const p = makeSortProject({ name: "Only" });
    expect(sortProjects([p], REF_DATE)).toEqual([p]);
  });

  it("should place isFocus project before non-focus project", () => {
    const nonFocus = makeSortProject({ name: "NonFocus" });
    const focus = makeSortProject({ name: "Focus", isFocus: true });
    const sorted = sortProjects([nonFocus, focus], REF_DATE);
    expect(sorted[0].name).toBe("Focus");
    expect(sorted[1].name).toBe("NonFocus");
  });

  it("should place done project at the end, after isFocus", () => {
    const done = makeSortProject({ name: "Done", status: "done" });
    const focus = makeSortProject({ name: "Focus", isFocus: true });
    const sorted = sortProjects([done, focus], REF_DATE);
    expect(sorted[0].name).toBe("Focus");
    expect(sorted[1].name).toBe("Done");
  });

  it("should place done project at the end, after regular active", () => {
    const done = makeSortProject({ name: "Done", status: "done" });
    const active = makeSortProject({ name: "Active" });
    const sorted = sortProjects([done, active], REF_DATE);
    expect(sorted[0].name).toBe("Active");
    expect(sorted[1].name).toBe("Done");
  });

  it("should sort active projects by deadline urgency: soonest first", () => {
    const farProject = makeSortProject({ name: "Far", deadline: "2025-12-01" });
    const soonProject = makeSortProject({ name: "Soon", deadline: "2025-06-10" });
    const sorted = sortProjects([farProject, soonProject], REF_DATE);
    expect(sorted[0].name).toBe("Soon");
    expect(sorted[1].name).toBe("Far");
  });

  it("should place projects with no deadline after those with a deadline", () => {
    const withDeadline = makeSortProject({ name: "HasDeadline", deadline: "2025-07-01" });
    const noDeadline = makeSortProject({ name: "NoDeadline" });
    const sorted = sortProjects([noDeadline, withDeadline], REF_DATE);
    expect(sorted[0].name).toBe("HasDeadline");
    expect(sorted[1].name).toBe("NoDeadline");
  });

  it("should place overdue projects before no-deadline projects", () => {
    const overdue = makeSortProject({ name: "Overdue", deadline: "2025-01-01" });
    const noDeadline = makeSortProject({ name: "NoDeadline" });
    const sorted = sortProjects([noDeadline, overdue], REF_DATE);
    expect(sorted[0].name).toBe("Overdue");
    expect(sorted[1].name).toBe("NoDeadline");
  });

  it("should sort within focus group by deadline urgency", () => {
    const farFocus = makeSortProject({ name: "FarFocus", isFocus: true, deadline: "2025-12-01" });
    const soonFocus = makeSortProject({ name: "SoonFocus", isFocus: true, deadline: "2025-06-10" });
    const sorted = sortProjects([farFocus, soonFocus], REF_DATE);
    expect(sorted[0].name).toBe("SoonFocus");
    expect(sorted[1].name).toBe("FarFocus");
  });

  it("should preserve relative order of done projects at the end (stable)", () => {
    const done1 = makeSortProject({ name: "Done1", status: "done" });
    const done2 = makeSortProject({ name: "Done2", status: "done" });
    const active = makeSortProject({ name: "Active" });
    const sorted = sortProjects([done1, done2, active], REF_DATE);
    expect(sorted[0].name).toBe("Active");
    expect(sorted[1].name).toBe("Done1");
    expect(sorted[2].name).toBe("Done2");
  });

  it("should preserve relative order of equal-priority projects (stable sort)", () => {
    // Both non-focus, no deadline → urgency = Infinity for both; input order must be preserved
    const p1 = makeSortProject({ name: "First" });
    const p2 = makeSortProject({ name: "Second" });
    const sorted = sortProjects([p1, p2], REF_DATE);
    expect(sorted[0].name).toBe("First");
    expect(sorted[1].name).toBe("Second");
  });

  it("should treat invalid deadline format as no deadline (Infinity urgency)", () => {
    const invalid = makeSortProject({ name: "InvalidDeadline", deadline: "not-a-date" });
    const valid = makeSortProject({ name: "ValidDeadline", deadline: "2025-07-01" });
    const sorted = sortProjects([invalid, valid], REF_DATE);
    expect(sorted[0].name).toBe("ValidDeadline");
    expect(sorted[1].name).toBe("InvalidDeadline");
  });

  it("should place paused projects before done projects", () => {
    const paused = makeSortProject({ name: "Paused", status: "paused" });
    const done = makeSortProject({ name: "Done", status: "done" });
    const sorted = sortProjects([done, paused], REF_DATE);
    expect(sorted[0].name).toBe("Paused");
    expect(sorted[1].name).toBe("Done");
  });

  it("should not mutate the input array", () => {
    const projects = [
      makeSortProject({ name: "B", isFocus: false }),
      makeSortProject({ name: "A", isFocus: true }),
    ];
    sortProjects(projects, REF_DATE);
    // Input order must be preserved (B at index 0, A at index 1)
    expect(projects[0].name).toBe("B");
    expect(projects[1].name).toBe("A");
  });

  it("should use current date when today parameter is omitted", () => {
    // Overdue (past) sorts before far-future — verifies the default-date code path
    const future = makeSortProject({ name: "Future", deadline: "2099-12-31" });
    const overdue = makeSortProject({ name: "Overdue", deadline: "2000-01-01" });
    const result = sortProjects([future, overdue]);
    expect(result[0].name).toBe("Overdue");
    expect(result[1].name).toBe("Future");
  });

  it("should place isFocus+overdue before non-focus+imminent deadline (focus beats urgency)", () => {
    const focusOverdue = makeSortProject({ name: "FocusOverdue", isFocus: true, deadline: "2025-01-01" });
    const nonFocusImminent = makeSortProject({ name: "NonFocusImminent", deadline: "2025-06-02" });
    const sorted = sortProjects([nonFocusImminent, focusOverdue], REF_DATE);
    expect(sorted[0].name).toBe("FocusOverdue");
    expect(sorted[1].name).toBe("NonFocusImminent");
  });
});

describe("calcCompletionForecast", () => {
  // Reference: today = 2026-01-20, created = 2026-01-10 (10 days elapsed)
  // progress = 50 → velocity = 5%/day → remaining 50% → 10 more days → forecastDate = 2026-01-30
  const TODAY = new Date("2026-01-20T12:00:00");

  it("should return null when progress is 0", () => {
    expect(calcCompletionForecast(0, "2026-01-10", undefined, TODAY)).toBeNull();
  });

  it("should return null when progress is 100", () => {
    expect(calcCompletionForecast(100, "2026-01-10", undefined, TODAY)).toBeNull();
  });

  it("should return null when createdDate is undefined", () => {
    expect(calcCompletionForecast(50, undefined, undefined, TODAY)).toBeNull();
  });

  it("should return null when fewer than 3 days have elapsed since creation", () => {
    // Only 2 days elapsed — too early to judge velocity reliably
    const almostToday = new Date("2026-01-12T12:00:00");
    expect(calcCompletionForecast(50, "2026-01-10", undefined, almostToday)).toBeNull();
  });

  it("should return a result when exactly 3 days have elapsed (boundary)", () => {
    // Exactly 3 days elapsed: daysElapsed=3 → guard daysElapsed<3 does not fire
    const exactly3Days = new Date("2026-01-13T12:00:00");
    expect(calcCompletionForecast(50, "2026-01-10", undefined, exactly3Days)).not.toBeNull();
  });

  it("should return null when createdDate is an invalid format string", () => {
    expect(calcCompletionForecast(50, "bad-date", undefined, TODAY)).toBeNull();
    expect(calcCompletionForecast(50, "2026-1-5", undefined, TODAY)).toBeNull();
  });

  it("should compute forecastDate as today + remaining/velocity days", () => {
    // velocity = 50%/10d = 5%/day; remaining = 50%; 50/5 = 10 days → 2026-01-30
    const result = calcCompletionForecast(50, "2026-01-10", undefined, TODAY);
    expect(result).not.toBeNull();
    expect(result!.forecastDate).toBe("2026-01-30");
  });

  it("should return null daysVsDeadline when deadline is absent", () => {
    const result = calcCompletionForecast(50, "2026-01-10", undefined, TODAY);
    expect(result!.daysVsDeadline).toBeNull();
  });

  it("should return positive daysVsDeadline when forecast is before deadline (ahead)", () => {
    // forecast = 2026-01-30, deadline = 2026-02-01 → 2 days ahead
    const result = calcCompletionForecast(50, "2026-01-10", "2026-02-01", TODAY);
    expect(result!.daysVsDeadline).toBe(2);
  });

  it("should return negative daysVsDeadline when forecast is after deadline (behind)", () => {
    // forecast = 2026-01-30, deadline = 2026-01-25 → -5 days (5 days late)
    const result = calcCompletionForecast(50, "2026-01-10", "2026-01-25", TODAY);
    expect(result!.daysVsDeadline).toBe(-5);
  });

  it("should return 0 daysVsDeadline when forecast matches deadline exactly", () => {
    // forecast = 2026-01-30, deadline = 2026-01-30
    const result = calcCompletionForecast(50, "2026-01-10", "2026-01-30", TODAY);
    expect(result!.daysVsDeadline).toBe(0);
  });

  it("should handle slow progress correctly (low velocity)", () => {
    // 10% done in 10 days = 1%/day; remaining 90% / 1%/day = 90 days → 2026-04-20
    const result = calcCompletionForecast(10, "2026-01-10", undefined, TODAY);
    expect(result).not.toBeNull();
    expect(result!.forecastDate).toBe("2026-04-20");
  });

  it("should use current date when today parameter is omitted", () => {
    // Should not throw and must return a result or null — verifies default-date code path
    const result = calcCompletionForecast(50, "2020-01-01", undefined);
    // velocity > 0 and elapsed > 3 days → forecast returned
    expect(result).not.toBeNull();
  });
});

describe("calcProjectMilestone", () => {
  it("should return 25 milestone when crossing 25% for the first time", () => {
    const result = calcProjectMilestone(0, 25);
    expect(result).not.toBeNull();
    expect(result!.milestone).toBe(25);
  });

  it("should return 50 milestone when crossing 50%", () => {
    const result = calcProjectMilestone(30, 50);
    expect(result!.milestone).toBe(50);
  });

  it("should return 75 milestone when crossing 75%", () => {
    const result = calcProjectMilestone(60, 75);
    expect(result!.milestone).toBe(75);
  });

  it("should return 100 milestone when reaching 100%", () => {
    const result = calcProjectMilestone(80, 100);
    expect(result!.milestone).toBe(100);
  });

  it("should return the highest milestone when multiple are crossed at once (0→100)", () => {
    const result = calcProjectMilestone(0, 100);
    expect(result!.milestone).toBe(100);
  });

  it("should return the highest milestone when jumping from 0 to 80 (crosses 25, 50, 75)", () => {
    const result = calcProjectMilestone(0, 80);
    expect(result!.milestone).toBe(75);
  });

  it("should return null when progress stays the same", () => {
    expect(calcProjectMilestone(50, 50)).toBeNull();
  });

  it("should return null when progress decreases", () => {
    expect(calcProjectMilestone(80, 30)).toBeNull();
  });

  it("should return null when no milestone is crossed (30→40 skips between milestones)", () => {
    expect(calcProjectMilestone(30, 40)).toBeNull();
  });

  it("should cross 25 milestone when going from 24 to 25", () => {
    const result = calcProjectMilestone(24, 25);
    expect(result!.milestone).toBe(25);
  });

  it("should not re-cross a milestone already passed (25→30 does not return 25)", () => {
    expect(calcProjectMilestone(25, 30)).toBeNull();
  });

  it("should return non-null label string", () => {
    const result = calcProjectMilestone(0, 50);
    expect(typeof result!.label).toBe("string");
    expect(result!.label.length).toBeGreaterThan(0);
  });
});

describe("calcProjectCompletionNotify", () => {
  it("should return a message when active project becomes done", () => {
    const result = calcProjectCompletionNotify("active", "done", "My App");
    expect(result).not.toBeNull();
    expect(result).toContain("My App");
  });

  it("should return a message when in-progress project becomes done", () => {
    const result = calcProjectCompletionNotify("in-progress", "done", "Side Project");
    expect(result).not.toBeNull();
    expect(result).toContain("Side Project");
  });

  it("should return a message when paused project becomes done", () => {
    const result = calcProjectCompletionNotify("paused", "done", "Archive");
    expect(result).not.toBeNull();
    expect(result).toContain("Archive");
  });

  it("should return null when projectName is empty string", () => {
    expect(calcProjectCompletionNotify("active", "done", "")).toBeNull();
  });

  it("should return null when projectName is whitespace only", () => {
    expect(calcProjectCompletionNotify("active", "done", "   ")).toBeNull();
  });

  it("should return null when project was already done before", () => {
    expect(calcProjectCompletionNotify("done", "done", "My App")).toBeNull();
  });

  it("should return null when status changes to non-done (active→paused)", () => {
    expect(calcProjectCompletionNotify("active", "paused", "My App")).toBeNull();
  });

  it("should return null when status changes to active from done (un-completing)", () => {
    expect(calcProjectCompletionNotify("done", "active", "My App")).toBeNull();
  });

  it("should return null when newStatus is undefined", () => {
    expect(calcProjectCompletionNotify("active", undefined, "My App")).toBeNull();
  });

  it("should return a message when prevStatus is undefined and newStatus is done", () => {
    const result = calcProjectCompletionNotify(undefined, "done", "New Project");
    expect(result).not.toBeNull();
    expect(result).toContain("New Project");
  });
});

describe("calcProjectPomodoroMilestone", () => {
  it("should return message with project name and '10' when sessions cross 10 milestone (9→10)", () => {
    const result = calcProjectPomodoroMilestone(9, 10, "My App");
    expect(result).not.toBeNull();
    expect(result).toContain("My App");
    expect(result).toContain("10");
  });

  it("should return message with project name and '25' when sessions cross 25 milestone (24→25)", () => {
    const result = calcProjectPomodoroMilestone(24, 25, "My App");
    expect(result).not.toBeNull();
    expect(result).toContain("My App");
    expect(result).toContain("25");
  });

  it("should return message with project name and '50' when sessions cross 50 milestone (49→50)", () => {
    const result = calcProjectPomodoroMilestone(49, 50, "My App");
    expect(result).not.toBeNull();
    expect(result).toContain("My App");
    expect(result).toContain("50");
  });

  it("should return message with project name and '100' when sessions cross 100 milestone (99→100)", () => {
    const result = calcProjectPomodoroMilestone(99, 100, "My App");
    expect(result).not.toBeNull();
    expect(result).toContain("My App");
    expect(result).toContain("100");
  });

  it("should include correct project name when name differs from milestone number", () => {
    const result = calcProjectPomodoroMilestone(9, 10, "Vision Widget");
    expect(result).toContain("Vision Widget");
  });

  it("should return null when no milestone is crossed (5→8)", () => {
    expect(calcProjectPomodoroMilestone(5, 8, "My App")).toBeNull();
  });

  it("should return null when prevSessions=0 and newSessions below first threshold (0→9)", () => {
    expect(calcProjectPomodoroMilestone(0, 9, "My App")).toBeNull();
  });

  it("should return null when sessions stay the same (5→5, equality guard)", () => {
    expect(calcProjectPomodoroMilestone(5, 5, "My App")).toBeNull();
  });

  it("should return null when sessions decrease (15→10)", () => {
    expect(calcProjectPomodoroMilestone(15, 10, "My App")).toBeNull();
  });

  it("should return null when projectName is empty string", () => {
    expect(calcProjectPomodoroMilestone(9, 10, "")).toBeNull();
  });

  it("should return null when projectName is whitespace only", () => {
    expect(calcProjectPomodoroMilestone(9, 10, "   ")).toBeNull();
  });

  it("should return highest milestone when multiple are crossed in one jump (0→100)", () => {
    const result = calcProjectPomodoroMilestone(0, 100, "My App");
    expect(result).not.toBeNull();
    expect(result).toContain("100");
  });

  it("should return null when sessions land above an already-passed milestone (10→15)", () => {
    expect(calcProjectPomodoroMilestone(10, 15, "My App")).toBeNull();
  });

  it("should return 25-milestone message when prev=15 (10 already passed) and new=26", () => {
    const result = calcProjectPomodoroMilestone(15, 26, "My App");
    expect(result).not.toBeNull();
    expect(result).toContain("25");
  });
});

// ── calcFocusSuggestion ───────────────────────────────────────────────────────
// Recommends which project needs attention based on deadline urgency,
// schedule gap, and focus recency. Returns null when no actionable suggestion.

describe("calcFocusSuggestion — smart project focus recommendation", () => {
  // All tests use TODAY="2024-06-10" as the anchor date

  it("should return null when projects array is empty", () => {
    expect(calcFocusSuggestion([], TODAY)).toBeNull();
  });

  it("should return null when all projects are done", () => {
    const projects = [
      makeProject({ id: 1, status: "done" }),
      makeProject({ id: 2, status: "done" }),
    ];
    expect(calcFocusSuggestion(projects, TODAY)).toBeNull();
  });

  it("should return null when all projects are paused", () => {
    const projects = [
      makeProject({ id: 1, status: "paused" }),
      makeProject({ id: 2, status: "paused" }),
    ];
    expect(calcFocusSuggestion(projects, TODAY)).toBeNull();
  });

  it("should return null when only one active project exists", () => {
    // Single active project — no alternative to suggest
    const projects = [
      makeProject({ id: 1, status: "active", deadline: "2024-06-12", createdDate: "2024-05-01", progress: 30 }),
    ];
    expect(calcFocusSuggestion(projects, TODAY)).toBeNull();
  });

  it("should return null when no project has urgency signals", () => {
    // Two active projects with no deadlines, no stale focus, high progress — nothing urgent
    const projects = [
      makeProject({ id: 1, name: "A", status: "active", progress: 80 }),
      makeProject({ id: 2, name: "B", status: "active", progress: 90 }),
    ];
    expect(calcFocusSuggestion(projects, TODAY)).toBeNull();
  });

  it("should suggest project with nearest deadline when no focus set", () => {
    const projects = [
      makeProject({ id: 1, name: "Far", status: "active", deadline: "2024-07-10", createdDate: "2024-05-01", progress: 50 }),
      makeProject({ id: 2, name: "Urgent", status: "active", deadline: "2024-06-12", createdDate: "2024-05-01", progress: 20 }),
    ];
    const result = calcFocusSuggestion(projects, TODAY);
    expect(result).not.toBeNull();
    expect(result!.projectId).toBe(2);
    expect(result!.name).toBe("Urgent");
  });

  it("should return null when current focus project is already most urgent", () => {
    const projects = [
      makeProject({ id: 1, name: "Focus", status: "active", isFocus: true, deadline: "2024-06-12", createdDate: "2024-05-01", progress: 30 }),
      makeProject({ id: 2, name: "Other", status: "active", deadline: "2024-07-10", createdDate: "2024-05-01", progress: 50 }),
    ];
    expect(calcFocusSuggestion(projects, TODAY)).toBeNull();
  });

  it("should suggest when non-focus project is much more urgent than focus", () => {
    // Focus project has a far deadline; another project is about to miss its deadline
    const projects = [
      makeProject({ id: 1, name: "Focus", status: "active", isFocus: true, deadline: "2024-08-01", createdDate: "2024-05-01", progress: 50 }),
      makeProject({ id: 2, name: "Behind", status: "active", deadline: "2024-06-12", createdDate: "2024-05-01", progress: 10 }),
    ];
    const result = calcFocusSuggestion(projects, TODAY);
    expect(result).not.toBeNull();
    expect(result!.projectId).toBe(2);
    expect(result!.name).toBe("Behind");
    expect(result!.reason).toBeTruthy();
  });

  it("should consider focus staleness when deadlines are absent", () => {
    // No deadlines, but one project hasn't been worked on in 14 days while the focus project was active today
    const projects = [
      makeProject({ id: 1, name: "Recent", status: "active", isFocus: true, lastFocusDate: TODAY }),
      makeProject({ id: 2, name: "Neglected", status: "active", lastFocusDate: "2024-05-27" }),
    ];
    const result = calcFocusSuggestion(projects, TODAY);
    expect(result).not.toBeNull();
    expect(result!.projectId).toBe(2);
    expect(result!.name).toBe("Neglected");
  });

  it("should consider schedule gap in scoring", () => {
    // Project A is on schedule; Project B is significantly behind with same deadline
    const projects = [
      makeProject({ id: 1, name: "OnTrack", status: "active", deadline: "2024-06-30", createdDate: "2024-05-11", progress: 50 }),
      makeProject({ id: 2, name: "Behind", status: "active", deadline: "2024-06-30", createdDate: "2024-05-11", progress: 10 }),
    ];
    const result = calcFocusSuggestion(projects, TODAY);
    expect(result).not.toBeNull();
    expect(result!.projectId).toBe(2);
  });

  it("should exclude done and paused projects from suggestion", () => {
    // Done project has urgent deadline — should NOT be suggested
    const projects = [
      makeProject({ id: 1, name: "Active", status: "active", deadline: "2024-07-10", createdDate: "2024-05-01", progress: 50 }),
      makeProject({ id: 2, name: "Done", status: "done", deadline: "2024-06-11", createdDate: "2024-05-01", progress: 90 }),
      makeProject({ id: 3, name: "Paused", status: "paused", deadline: "2024-06-11", createdDate: "2024-05-01", progress: 10 }),
    ];
    // Only 1 eligible project, so returns null (no alternative to suggest)
    expect(calcFocusSuggestion(projects, TODAY)).toBeNull();
  });

  it("should include in-progress projects in candidates", () => {
    const projects = [
      makeProject({ id: 1, name: "Active", status: "active", deadline: "2024-07-10", createdDate: "2024-05-01", progress: 80 }),
      makeProject({ id: 2, name: "InProg", status: "in-progress", deadline: "2024-06-12", createdDate: "2024-05-01", progress: 20 }),
    ];
    const result = calcFocusSuggestion(projects, TODAY);
    expect(result).not.toBeNull();
    expect(result!.projectId).toBe(2);
  });

  it("should return score field between 0 and 100 on suggestion", () => {
    const projects = [
      makeProject({ id: 1, name: "A", status: "active", deadline: "2024-07-10", createdDate: "2024-05-01", progress: 50 }),
      makeProject({ id: 2, name: "B", status: "active", deadline: "2024-06-12", createdDate: "2024-05-01", progress: 10 }),
    ];
    const result = calcFocusSuggestion(projects, TODAY);
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThan(0);
    expect(result!.score).toBeLessThanOrEqual(100);
  });

  it("should suggest overdue project because it has max deadline urgency", () => {
    // Project 30 days overdue: deadline factor clamped at 0 days → max score (40 pts).
    // Combined with schedule gap (progress=10 vs ~100% time elapsed) → high total score.
    const projects = [
      makeProject({ id: 1, name: "Relaxed", status: "active", deadline: "2024-07-10", createdDate: "2024-05-01", progress: 50 }),
      makeProject({ id: 2, name: "Overdue", status: "active", deadline: "2024-05-10", createdDate: "2024-03-01", progress: 10 }),
    ];
    const result = calcFocusSuggestion(projects, TODAY);
    expect(result).not.toBeNull();
    expect(result!.projectId).toBe(2);
    expect(result!.score).toBeGreaterThan(0);
  });
});
