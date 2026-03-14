// ABOUTME: Unit tests for ProjectList avgRunningProgressPct helper
// ABOUTME: Validates average progress calculation across running project subsets

import { describe, it, expect, beforeEach } from "vitest";
import { avgRunningProgressPct } from "./ProjectList";
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
