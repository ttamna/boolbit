// ABOUTME: Tests for useGitHubSync hook — polling GitHub API on PAT presence and configurable interval
// ABOUTME: Covers initial sync, interval cleanup, batch updates, ref freshness, and PAT-change behavior

import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { useGitHubSync } from "./useGitHubSync";
import type { Project, GitHubData } from "../types";

// Mock fetchRepoData so no real HTTP calls are made
vi.mock("../lib/github", () => ({
  fetchRepoData: vi.fn(),
}));

import { fetchRepoData } from "../lib/github";
const mockFetchRepoData = fetchRepoData as ReturnType<typeof vi.fn>;

const GITHUB_DATA: GitHubData = {
  lastCommitAt: "2026-03-23T10:00:00Z",
  lastCommitMsg: "feat: add feature",
  openIssues: 2,
  openPrs: 1,
  ciStatus: "success",
  fetchedAt: "2026-03-23T11:00:00Z",
};

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: "TestProject",
    status: "active",
    goal: "ship it",
    progress: 50,
    metric: "commits",
    metric_value: "10",
    metric_target: "20",
    githubRepo: "owner/repo",
    ...overrides,
  };
}

/**
 * Flush pending microtasks without advancing fake timers.
 * sync() has a 3-level async chain: outer async → allSettled → inner fetchRepoData await.
 * 5 ticks provides comfortable headroom above the minimum depth.
 */
async function flushMicrotasks() {
  await act(async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  });
}

describe("useGitHubSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchRepoData.mockResolvedValue(GITHUB_DATA);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("shouldNotSyncWhenPatIsUndefined", async () => {
    const onBatchUpdate = vi.fn();
    renderHook(() =>
      useGitHubSync([makeProject()], undefined, 30, onBatchUpdate),
    );

    await flushMicrotasks();

    expect(mockFetchRepoData).not.toHaveBeenCalled();
    expect(onBatchUpdate).not.toHaveBeenCalled();
  });

  test("shouldSyncImmediatelyOnMountWhenPatProvided", async () => {
    const onBatchUpdate = vi.fn();
    renderHook(() =>
      useGitHubSync([makeProject()], "token123", 30, onBatchUpdate),
    );

    await flushMicrotasks();

    expect(mockFetchRepoData).toHaveBeenCalledTimes(1);
    expect(mockFetchRepoData).toHaveBeenCalledWith("token123", "owner/repo");
  });

  test("shouldCallOnBatchUpdateWithFetchedData", async () => {
    const onBatchUpdate = vi.fn();
    renderHook(() =>
      useGitHubSync([makeProject()], "token123", 30, onBatchUpdate),
    );

    await flushMicrotasks();

    expect(onBatchUpdate).toHaveBeenCalledTimes(1);
    expect(onBatchUpdate).toHaveBeenCalledWith([
      { id: 1, patch: { githubData: GITHUB_DATA } },
    ]);
  });

  test("shouldSkipProjectsWithoutGithubRepo", async () => {
    const onBatchUpdate = vi.fn();
    const projects = [
      makeProject({ id: 1, githubRepo: "owner/repo" }),
      makeProject({ id: 2, githubRepo: undefined }),
    ];
    renderHook(() =>
      useGitHubSync(projects, "token123", 30, onBatchUpdate),
    );

    await flushMicrotasks();

    expect(mockFetchRepoData).toHaveBeenCalledTimes(1);
    expect(mockFetchRepoData).toHaveBeenCalledWith("token123", "owner/repo");
    expect(onBatchUpdate).toHaveBeenCalledWith([
      { id: 1, patch: { githubData: GITHUB_DATA } },
    ]);
  });

  test("shouldNotCallOnBatchUpdateWhenNoProjectsHaveGithubRepo", async () => {
    const onBatchUpdate = vi.fn();
    const projects = [makeProject({ githubRepo: undefined })];
    renderHook(() =>
      useGitHubSync(projects, "token123", 30, onBatchUpdate),
    );

    await flushMicrotasks();

    expect(mockFetchRepoData).not.toHaveBeenCalled();
    expect(onBatchUpdate).not.toHaveBeenCalled();
  });

  test("shouldSilentlySkipFailedProjectAndUpdateSuccessful", async () => {
    const onBatchUpdate = vi.fn();
    mockFetchRepoData
      .mockRejectedValueOnce(new Error("network error")) // first project fails
      .mockResolvedValueOnce(GITHUB_DATA);               // second project succeeds

    const projects = [
      makeProject({ id: 1, githubRepo: "owner/repo1" }),
      makeProject({ id: 2, githubRepo: "owner/repo2" }),
    ];
    renderHook(() =>
      useGitHubSync(projects, "token123", 30, onBatchUpdate),
    );

    await flushMicrotasks();

    // Only the successful project should be in the batch
    expect(onBatchUpdate).toHaveBeenCalledTimes(1);
    expect(onBatchUpdate).toHaveBeenCalledWith([
      { id: 2, patch: { githubData: GITHUB_DATA } },
    ]);
  });

  test("shouldResyncOnInterval", async () => {
    const onBatchUpdate = vi.fn();
    renderHook(() =>
      useGitHubSync([makeProject()], "token123", 1, onBatchUpdate),
    );

    await flushMicrotasks();
    expect(mockFetchRepoData).toHaveBeenCalledTimes(1);

    // Advance by exactly 1 minute (interval = 1 min × 60000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(mockFetchRepoData).toHaveBeenCalledTimes(2);
    expect(onBatchUpdate).toHaveBeenCalledTimes(2);
  });

  test("shouldClearIntervalOnUnmount", async () => {
    const onBatchUpdate = vi.fn();
    const { unmount } = renderHook(() =>
      useGitHubSync([makeProject()], "token123", 1, onBatchUpdate),
    );

    await flushMicrotasks();
    expect(mockFetchRepoData).toHaveBeenCalledTimes(1);

    unmount();

    // Advance past the interval — no additional calls should happen
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(mockFetchRepoData).toHaveBeenCalledTimes(1);
  });

  test("shouldUseLatestOnBatchUpdateRefWithoutRestart", async () => {
    const onBatchUpdate1 = vi.fn();
    const onBatchUpdate2 = vi.fn();
    let currentCallback = onBatchUpdate1;

    const { rerender } = renderHook(() =>
      useGitHubSync([makeProject()], "token123", 1, currentCallback),
    );

    await flushMicrotasks();
    expect(onBatchUpdate1).toHaveBeenCalledTimes(1);

    // Swap callback and rerender — the interval should now call the new one
    currentCallback = onBatchUpdate2;
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(onBatchUpdate2).toHaveBeenCalledTimes(1);
    // First callback was only called during initial sync, not on the interval
    expect(onBatchUpdate1).toHaveBeenCalledTimes(1);
  });

  test("shouldUseLatestProjectsRefWithoutRestart", async () => {
    const onBatchUpdate = vi.fn();
    let currentProjects = [makeProject({ id: 1, githubRepo: "owner/repo1" })];

    const { rerender } = renderHook(() =>
      useGitHubSync(currentProjects, "token123", 1, onBatchUpdate),
    );

    await flushMicrotasks();
    expect(mockFetchRepoData).toHaveBeenCalledWith("token123", "owner/repo1");

    // Update projects ref — interval sync should use the new projects
    currentProjects = [makeProject({ id: 2, githubRepo: "owner/repo2" })];
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(mockFetchRepoData).toHaveBeenCalledWith("token123", "owner/repo2");
  });

  test("shouldNotFireImmediatelyAgainWhenOnlyIntervalChanges", async () => {
    const onBatchUpdate = vi.fn();
    let interval = 30;

    const { rerender } = renderHook(() =>
      useGitHubSync([makeProject()], "token123", interval, onBatchUpdate),
    );

    await flushMicrotasks();
    expect(mockFetchRepoData).toHaveBeenCalledTimes(1);

    // Change interval only — should NOT trigger an immediate re-sync
    interval = 60;
    rerender();

    await flushMicrotasks();

    expect(mockFetchRepoData).toHaveBeenCalledTimes(1);
  });

  test("shouldResetAndResyncImmediatelyWhenPatChanges", async () => {
    const onBatchUpdate = vi.fn();
    let pat: string | undefined = "token-v1";

    const { rerender } = renderHook(() =>
      useGitHubSync([makeProject()], pat, 30, onBatchUpdate),
    );

    await flushMicrotasks();
    expect(mockFetchRepoData).toHaveBeenCalledWith("token-v1", "owner/repo");

    // Change PAT — should trigger an immediate re-sync with new PAT
    pat = "token-v2";
    rerender();

    await flushMicrotasks();

    expect(mockFetchRepoData).toHaveBeenCalledWith("token-v2", "owner/repo");
    expect(mockFetchRepoData).toHaveBeenCalledTimes(2);
  });

  test("shouldResetHasSyncedWhenPatBecomesUndefined", async () => {
    const onBatchUpdate = vi.fn();
    let pat: string | undefined = "token123";

    const { rerender } = renderHook(() =>
      useGitHubSync([makeProject()], pat, 30, onBatchUpdate),
    );

    await flushMicrotasks();
    expect(mockFetchRepoData).toHaveBeenCalledTimes(1);

    // Remove PAT — hasSynced resets to false
    pat = undefined;
    rerender();

    await flushMicrotasks();
    expect(mockFetchRepoData).toHaveBeenCalledTimes(1); // no extra call

    // Restore PAT — should fire immediately again (hasSynced was reset)
    pat = "token123";
    rerender();

    await flushMicrotasks();
    expect(mockFetchRepoData).toHaveBeenCalledTimes(2);
  });

  test("shouldBatchMultipleProjectUpdatesInSingleCallback", async () => {
    const onBatchUpdate = vi.fn();
    mockFetchRepoData.mockResolvedValue(GITHUB_DATA);

    const projects = [
      makeProject({ id: 1, githubRepo: "owner/repo1" }),
      makeProject({ id: 2, githubRepo: "owner/repo2" }),
      makeProject({ id: 3, githubRepo: "owner/repo3" }),
    ];
    renderHook(() =>
      useGitHubSync(projects, "token123", 30, onBatchUpdate),
    );

    await flushMicrotasks();

    expect(onBatchUpdate).toHaveBeenCalledTimes(1);
    // All 3 updates in a single callback invocation — verify both IDs and patch content
    const calls = onBatchUpdate.mock.calls[0][0] as Array<{ id: number; patch: { githubData: GitHubData } }>;
    expect(calls).toHaveLength(3);
    const sortedCalls = [...calls].sort((a, b) => a.id - b.id);
    expect(sortedCalls.map(c => c.id)).toEqual([1, 2, 3]);
    sortedCalls.forEach(c => {
      expect(c.patch.githubData).toEqual(GITHUB_DATA);
    });
  });
});
