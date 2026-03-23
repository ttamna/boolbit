// ABOUTME: Regression tests for avgRunningProgressPct and sortProjects re-exported from ProjectList
// ABOUTME: and component rendering tests for the focus suggestion banner (focusSuggestion UI)

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { avgRunningProgressPct, sortProjects, ProjectList } from "./ProjectList";
import type { Project } from "../types";

// ── Tauri / GitHub mocks needed by ProjectCard rendered inside ProjectList ───
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
vi.mock("../lib/github", () => ({
  verifyRepo: vi.fn().mockResolvedValue(null),
  fetchRepoData: vi.fn().mockResolvedValue(null),
}));

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

// ── ProjectList component — focus suggestion banner ───────────────────────────
// Tests the 💡 banner that appears when calcFocusSuggestion returns a non-null
// result. Anchored to "2024-06-10" so _testId resets yield predictable IDs.
// SUGGESTION_THRESHOLD = 20, FOCUS_MARGIN = 10 (see lib/projects.ts).
// "Urgent": 2-day deadline + 20% progress → urgency score well above threshold.

const BANNER_TODAY = "2024-06-10";

describe("ProjectList — focus suggestion banner", () => {
  const onUpdate = vi.fn();
  const onProjectsChange = vi.fn();

  beforeEach(() => {
    _testId = 0;          // reset auto-increment so id=1/2 are predictable per test
    vi.clearAllMocks();
  });

  it("should not render the banner when only one active project exists", () => {
    render(
      <ProjectList
        projects={[makeProject({ name: "Solo" })]}
        onUpdate={onUpdate}
        onProjectsChange={onProjectsChange}
        todayStr={BANNER_TODAY}
      />
    );
    expect(screen.queryByTitle(/우선순위 점수/)).toBeNull();
  });

  it("should not render the banner when two projects have no urgency signals", () => {
    // No deadlines, high progress → calcFocusSuggestion returns null
    render(
      <ProjectList
        projects={[
          makeProject({ name: "A", progress: 80 }),
          makeProject({ name: "B", progress: 90 }),
        ]}
        onUpdate={onUpdate}
        onProjectsChange={onProjectsChange}
        todayStr={BANNER_TODAY}
      />
    );
    expect(screen.queryByTitle(/우선순위 점수/)).toBeNull();
  });

  it("should render the banner with the suggested project name", () => {
    render(
      <ProjectList
        projects={[
          makeProject({ name: "Far",    deadline: "2024-07-10", createdDate: "2024-05-01", progress: 50 }),
          makeProject({ name: "Urgent", deadline: "2024-06-12", createdDate: "2024-05-01", progress: 20 }),
        ]}
        onUpdate={onUpdate}
        onProjectsChange={onProjectsChange}
        todayStr={BANNER_TODAY}
      />
    );
    const banner = screen.getByTitle(/우선순위 점수/);
    expect(banner).toBeTruthy();
    expect(within(banner).getByText("Urgent")).toBeTruthy();
  });

  it("should call onUpdate with isFocus: true for the suggested project when banner is clicked", () => {
    // After _testId reset: Far=id1, Urgent=id2
    render(
      <ProjectList
        projects={[
          makeProject({ name: "Far",    deadline: "2024-07-10", createdDate: "2024-05-01", progress: 50 }),
          makeProject({ name: "Urgent", deadline: "2024-06-12", createdDate: "2024-05-01", progress: 20 }),
        ]}
        onUpdate={onUpdate}
        onProjectsChange={onProjectsChange}
        todayStr={BANNER_TODAY}
      />
    );
    fireEvent.click(screen.getByTitle(/우선순위 점수/));
    expect(onUpdate).toHaveBeenCalledWith(2, { isFocus: true });
  });

  it("should clear isFocus from a previously focused project before setting the new one", () => {
    // Focus=id1 (far deadline, currently focused), Behind=id2 (imminent deadline)
    render(
      <ProjectList
        projects={[
          makeProject({ name: "Focus",  isFocus: true, deadline: "2024-08-01", createdDate: "2024-05-01", progress: 50 }),
          makeProject({ name: "Behind",               deadline: "2024-06-12", createdDate: "2024-05-01", progress: 10 }),
        ]}
        onUpdate={onUpdate}
        onProjectsChange={onProjectsChange}
        todayStr={BANNER_TODAY}
      />
    );
    fireEvent.click(screen.getByTitle(/우선순위 점수/));
    // The existing focus (id=1) must be cleared BEFORE the new focus (id=2) is set
    expect(onUpdate.mock.calls[0]).toEqual([1, { isFocus: undefined }]);
    expect(onUpdate.mock.calls[1]).toEqual([2, { isFocus: true }]);
  });
});
