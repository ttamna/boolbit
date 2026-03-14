// ABOUTME: Unit tests for ProjectList avgRunningProgressPct and sortProjects helpers
// ABOUTME: Validates average progress calculation and project sort order (isFocus → deadline urgency → done last)

import { describe, it, expect, beforeEach } from "vitest";
import { avgRunningProgressPct, sortProjects } from "./ProjectList";
import type { Project } from "../types";

// Auto-incrementing id ensures each makeProject call produces a unique project identity.
// _testId is reset in beforeEach so tests are independent of execution order.
let _testId = 0;
function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: ++_testId,
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
  beforeEach(() => { _testId = 0; });

  it("should return null for empty project array", () => {
    expect(avgRunningProgressPct([])).toBeNull();
  });

  it("should return null when all projects are done", () => {
    const projects = [
      makeProject({ status: "done", progress: 80 }),
      makeProject({ status: "done", progress: 100 }),
    ];
    expect(avgRunningProgressPct(projects)).toBeNull();
  });

  it("should return null when all projects are paused", () => {
    const projects = [
      makeProject({ status: "paused", progress: 40 }),
    ];
    expect(avgRunningProgressPct(projects)).toBeNull();
  });

  it("should return 0 when single active project has 0 progress", () => {
    const projects = [makeProject({ status: "active", progress: 0 })];
    expect(avgRunningProgressPct(projects)).toBe(0);
  });

  it("should return 100 when single active project is complete", () => {
    const projects = [makeProject({ status: "active", progress: 100 })];
    expect(avgRunningProgressPct(projects)).toBe(100);
  });

  it("should return average progress when only in-progress projects exist", () => {
    const projects = [makeProject({ status: "in-progress", progress: 55 })];
    expect(avgRunningProgressPct(projects)).toBe(55);
  });

  it("should average progress of active and in-progress projects", () => {
    const projects = [
      makeProject({ status: "active", progress: 40 }),
      makeProject({ status: "in-progress", progress: 60 }),
    ];
    expect(avgRunningProgressPct(projects)).toBe(50);
  });

  it("should exclude done and paused projects from average", () => {
    const projects = [
      makeProject({ status: "active", progress: 60 }),
      makeProject({ status: "done", progress: 100 }),
      makeProject({ status: "paused", progress: 20 }),
    ];
    // Only the active project counts: avg = 60
    expect(avgRunningProgressPct(projects)).toBe(60);
  });

  it("should round to nearest integer", () => {
    const projects = [
      makeProject({ status: "active", progress: 10 }),
      makeProject({ status: "active", progress: 21 }),
    ];
    // (10 + 21) / 2 = 15.5 → rounds to 16
    expect(avgRunningProgressPct(projects)).toBe(16);
  });

  it("should clamp result to 100 for out-of-range progress values", () => {
    const projects = [makeProject({ status: "active", progress: 120 })];
    expect(avgRunningProgressPct(projects)).toBe(100);
  });

  it("should clamp result to 0 for negative progress values", () => {
    const projects = [makeProject({ status: "active", progress: -10 })];
    expect(avgRunningProgressPct(projects)).toBe(0);
  });
});

describe("sortProjects", () => {
  // Fixed reference date: 2025-06-01 local midnight — numeric constructor guarantees local-time
  // interpretation regardless of TZ env, avoiding the ISO string implicit-UTC ambiguity.
  const REF_DATE = new Date(2025, 5, 1); // month is 0-indexed: 5 = June

  beforeEach(() => { _testId = 0; });

  it("should return empty array for empty input", () => {
    expect(sortProjects([], REF_DATE)).toEqual([]);
  });

  it("should return single project unchanged", () => {
    const p = makeProject({ name: "Only" });
    expect(sortProjects([p], REF_DATE)).toEqual([p]);
  });

  it("should place isFocus project before non-focus project", () => {
    const nonFocus = makeProject({ name: "NonFocus" });
    const focus = makeProject({ name: "Focus", isFocus: true });
    const sorted = sortProjects([nonFocus, focus], REF_DATE);
    expect(sorted[0].name).toBe("Focus");
    expect(sorted[1].name).toBe("NonFocus");
  });

  it("should place done project at the end, after isFocus", () => {
    const done = makeProject({ name: "Done", status: "done" });
    const focus = makeProject({ name: "Focus", isFocus: true });
    const sorted = sortProjects([done, focus], REF_DATE);
    expect(sorted[0].name).toBe("Focus");
    expect(sorted[1].name).toBe("Done");
  });

  it("should place done project at the end, after regular active", () => {
    const done = makeProject({ name: "Done", status: "done" });
    const active = makeProject({ name: "Active" });
    const sorted = sortProjects([done, active], REF_DATE);
    expect(sorted[0].name).toBe("Active");
    expect(sorted[1].name).toBe("Done");
  });

  it("should sort active projects by deadline urgency: soonest first", () => {
    // REF_DATE is 2025-06-01; Jun 10 is sooner than Dec 01
    const farProject = makeProject({ name: "Far", deadline: "2025-12-01" });
    const soonProject = makeProject({ name: "Soon", deadline: "2025-06-10" });
    const sorted = sortProjects([farProject, soonProject], REF_DATE);
    expect(sorted[0].name).toBe("Soon");
    expect(sorted[1].name).toBe("Far");
  });

  it("should place projects with no deadline after those with a deadline", () => {
    const withDeadline = makeProject({ name: "HasDeadline", deadline: "2025-07-01" });
    const noDeadline = makeProject({ name: "NoDeadline" });
    const sorted = sortProjects([noDeadline, withDeadline], REF_DATE);
    expect(sorted[0].name).toBe("HasDeadline");
    expect(sorted[1].name).toBe("NoDeadline");
  });

  it("should place overdue projects before no-deadline projects", () => {
    // Overdue: deadline in the past → negative days (finite < Infinity)
    const overdue = makeProject({ name: "Overdue", deadline: "2025-01-01" });
    const noDeadline = makeProject({ name: "NoDeadline" });
    const sorted = sortProjects([noDeadline, overdue], REF_DATE);
    expect(sorted[0].name).toBe("Overdue");
    expect(sorted[1].name).toBe("NoDeadline");
  });

  it("should sort within focus group by deadline urgency", () => {
    const farFocus = makeProject({ name: "FarFocus", isFocus: true, deadline: "2025-12-01" });
    const soonFocus = makeProject({ name: "SoonFocus", isFocus: true, deadline: "2025-06-10" });
    const sorted = sortProjects([farFocus, soonFocus], REF_DATE);
    expect(sorted[0].name).toBe("SoonFocus");
    expect(sorted[1].name).toBe("FarFocus");
  });

  it("should preserve relative order of done projects at the end (stable)", () => {
    const done1 = makeProject({ name: "Done1", status: "done" });
    const done2 = makeProject({ name: "Done2", status: "done" });
    const active = makeProject({ name: "Active" });
    const sorted = sortProjects([done1, done2, active], REF_DATE);
    expect(sorted[0].name).toBe("Active");
    expect(sorted[1].name).toBe("Done1");
    expect(sorted[2].name).toBe("Done2");
  });

  it("should preserve relative order of equal-priority projects (stable sort)", () => {
    // Both non-focus, no deadline → urgency = Infinity for both; input order must be preserved
    const p1 = makeProject({ name: "First" });
    const p2 = makeProject({ name: "Second" });
    const sorted = sortProjects([p1, p2], REF_DATE);
    expect(sorted[0].name).toBe("First");
    expect(sorted[1].name).toBe("Second");
  });

  it("should treat invalid deadline format as no deadline (Infinity urgency)", () => {
    const invalid = makeProject({ name: "InvalidDeadline", deadline: "not-a-date" });
    const valid = makeProject({ name: "ValidDeadline", deadline: "2025-07-01" });
    const sorted = sortProjects([invalid, valid], REF_DATE);
    expect(sorted[0].name).toBe("ValidDeadline");
    expect(sorted[1].name).toBe("InvalidDeadline");
  });

  it("should place paused projects before done projects", () => {
    const paused = makeProject({ name: "Paused", status: "paused" });
    const done = makeProject({ name: "Done", status: "done" });
    const sorted = sortProjects([done, paused], REF_DATE);
    expect(sorted[0].name).toBe("Paused");
    expect(sorted[1].name).toBe("Done");
  });

  it("should not mutate the input array", () => {
    // Pass projects directly (not a copy) so any in-place sort mutation is detected
    const projects = [
      makeProject({ name: "B", isFocus: false }),
      makeProject({ name: "A", isFocus: true }),
    ];
    sortProjects(projects, REF_DATE);
    // Input order must be preserved (B at index 0, A at index 1)
    expect(projects[0].name).toBe("B");
    expect(projects[1].name).toBe("A");
  });

  it("should use current date when today parameter is omitted", () => {
    // Verify the default path produces correct ordering: overdue (past deadline) sorts
    // before far-future because urgency(overdue) < urgency(future) — soonest first.
    const future = makeProject({ name: "Future", deadline: "2099-12-31" });
    const overdue = makeProject({ name: "Overdue", deadline: "2000-01-01" });
    const result = sortProjects([future, overdue]);
    expect(result[0].name).toBe("Overdue");
    expect(result[1].name).toBe("Future");
  });

  it("should place isFocus+overdue before non-focus+imminent deadline (focus beats urgency)", () => {
    // Cross-group: isFocus dominates even when non-focus has a sooner deadline
    const focusOverdue = makeProject({ name: "FocusOverdue", isFocus: true, deadline: "2025-01-01" });
    const nonFocusImminent = makeProject({ name: "NonFocusImminent", deadline: "2025-06-02" });
    const sorted = sortProjects([nonFocusImminent, focusOverdue], REF_DATE);
    expect(sorted[0].name).toBe("FocusOverdue");
    expect(sorted[1].name).toBe("NonFocusImminent");
  });
});
