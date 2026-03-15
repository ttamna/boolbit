// ABOUTME: Tests for calcProjectsBadge pure function
// ABOUTME: Covers all badge segments: focus name, running/total, avgProgress, pomodoro, overdue, recently done

import { describe, it, expect } from "vitest";
import { calcProjectsBadge } from "./projects";
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
