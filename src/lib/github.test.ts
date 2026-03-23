// ABOUTME: Tests for github.ts — pure helpers (ciStatus, calcOpenIssues, parseLastCommit)
// ABOUTME: and async API functions (verifyRepo, fetchRepoData) with fetch mocking

import { afterEach, describe, expect, it, vi } from "vitest";
import { ciStatus, calcOpenIssues, parseLastCommit, verifyRepo, fetchRepoData } from "./github";

const FALLBACK = "2026-01-01T00:00:00.000Z";

describe("ciStatus", () => {
  it("should return 'pending' when conclusion is null (run in progress)", () => {
    expect(ciStatus(null)).toBe("pending");
  });

  it("should return 'success' for 'success' conclusion", () => {
    expect(ciStatus("success")).toBe("success");
  });

  it("should return 'failure' for 'failure' conclusion", () => {
    expect(ciStatus("failure")).toBe("failure");
  });

  it("should return 'failure' for 'cancelled' conclusion", () => {
    expect(ciStatus("cancelled")).toBe("failure");
  });

  it("should return 'failure' for 'timed_out' conclusion", () => {
    expect(ciStatus("timed_out")).toBe("failure");
  });

  it("should return 'failure' for unknown conclusion string", () => {
    expect(ciStatus("skipped")).toBe("failure");
  });
});

describe("calcOpenIssues", () => {
  it("should subtract pr count from raw count", () => {
    expect(calcOpenIssues(10, 3)).toBe(7);
  });

  it("should clamp to 0 when prs exceed raw issues count", () => {
    expect(calcOpenIssues(2, 5)).toBe(0);
  });

  it("should return 0 when counts are equal", () => {
    expect(calcOpenIssues(3, 3)).toBe(0);
  });

  it("should return 0 when rawCount is null", () => {
    expect(calcOpenIssues(null, 0)).toBe(0);
  });

  it("should return 0 when rawCount is undefined", () => {
    expect(calcOpenIssues(undefined, 0)).toBe(0);
  });

  it("should return 0 when both counts are zero", () => {
    expect(calcOpenIssues(0, 0)).toBe(0);
  });

  it("should handle large numbers correctly", () => {
    expect(calcOpenIssues(1000, 100)).toBe(900);
  });
});

describe("parseLastCommit", () => {
  it("should return fallbackDate and empty message for empty commits array", () => {
    expect(parseLastCommit([], FALLBACK)).toEqual({
      lastCommitAt: FALLBACK,
      lastCommitMsg: "",
    });
  });

  it("should return fallbackDate and empty message for non-array input", () => {
    expect(parseLastCommit(null, FALLBACK)).toEqual({
      lastCommitAt: FALLBACK,
      lastCommitMsg: "",
    });
  });

  it("should use committer.date when available", () => {
    const commits = [{
      commit: {
        committer: { date: "2026-03-10T12:00:00Z" },
        author: { date: "2026-03-09T00:00:00Z" },
        message: "fix: bug",
      },
    }];
    expect(parseLastCommit(commits, FALLBACK)).toEqual({
      lastCommitAt: "2026-03-10T12:00:00Z",
      lastCommitMsg: "fix: bug",
    });
  });

  it("should fall back to author.date when committer.date is absent", () => {
    const commits = [{
      commit: {
        author: { date: "2026-03-09T00:00:00Z" },
        message: "feat: thing",
      },
    }];
    expect(parseLastCommit(commits, FALLBACK)).toEqual({
      lastCommitAt: "2026-03-09T00:00:00Z",
      lastCommitMsg: "feat: thing",
    });
  });

  it("should fall back to author.date when committer.date is null", () => {
    const commits = [{
      commit: {
        committer: { date: null },
        author: { date: "2026-03-09T00:00:00Z" },
        message: "fix: null date",
      },
    }];
    expect(parseLastCommit(commits, FALLBACK).lastCommitAt).toBe("2026-03-09T00:00:00Z");
  });

  it("should fall back to fallbackDate when both committer.date and author.date are absent", () => {
    const commits = [{ commit: { message: "refactor" } }];
    expect(parseLastCommit(commits, FALLBACK)).toEqual({
      lastCommitAt: FALLBACK,
      lastCommitMsg: "refactor",
    });
  });

  it("should return only the first line of a multiline commit message", () => {
    const commits = [{
      commit: {
        committer: { date: "2026-03-10T00:00:00Z" },
        message: "feat: main title\n\nbody paragraph\nfooter: info",
      },
    }];
    expect(parseLastCommit(commits, FALLBACK).lastCommitMsg).toBe("feat: main title");
  });

  it("should return full message for a single-line commit message", () => {
    const commits = [{
      commit: {
        committer: { date: "2026-03-10T00:00:00Z" },
        message: "chore: update deps",
      },
    }];
    expect(parseLastCommit(commits, FALLBACK).lastCommitMsg).toBe("chore: update deps");
  });

  it("should return empty string when commit has no message field", () => {
    const commits = [{ commit: { committer: { date: "2026-03-10T00:00:00Z" } } }];
    expect(parseLastCommit(commits, FALLBACK).lastCommitMsg).toBe("");
  });
});

// ── verifyRepo ────────────────────────────────────────────────────────────────

function mockRes(body: unknown, ok = true, status = 200) {
  return { ok, status, json: vi.fn().mockResolvedValue(body) };
}

describe("verifyRepo", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("should return ok:true with full_name on 200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockRes({ full_name: "owner/repo" })));
    expect(await verifyRepo("pat", "owner/repo")).toEqual({ ok: true, msg: "✓ owner/repo" });
  });

  it("should return ok:false with not-found message on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockRes({}, false, 404)));
    expect(await verifyRepo("pat", "owner/repo")).toEqual({ ok: false, msg: "저장소를 찾을 수 없음" });
  });

  it("should return ok:false with auth-failure message on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockRes({}, false, 401)));
    expect(await verifyRepo("pat", "owner/repo")).toEqual({ ok: false, msg: "PAT 인증 실패" });
  });

  it("should return ok:false with status code in message on other HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockRes({}, false, 403)));
    expect(await verifyRepo("pat", "owner/repo")).toEqual({ ok: false, msg: "오류 403" });
  });

  it("should return ok:false with network-error message when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));
    expect(await verifyRepo("pat", "owner/repo")).toEqual({ ok: false, msg: "네트워크 오류" });
  });
});

// ── fetchRepoData ─────────────────────────────────────────────────────────────

const REPO_JSON = { open_issues_count: 5 };
const COMMITS_JSON = [{
  commit: { committer: { date: "2026-03-10T12:00:00Z" }, message: "feat: something\n\nbody" },
}];
const RUNS_JSON = { workflow_runs: [{ conclusion: "success" }] };
const PULLS_JSON = [{ id: 1 }, { id: 2 }]; // 2 open PRs

function makeFetch(overrides: { repo?: object; commits?: object; runs?: object; pulls?: object } = {}) {
  const repo = overrides.repo !== undefined ? overrides.repo : REPO_JSON;
  const commits = overrides.commits !== undefined ? overrides.commits : COMMITS_JSON;
  const runs = overrides.runs !== undefined ? overrides.runs : RUNS_JSON;
  const pulls = overrides.pulls !== undefined ? overrides.pulls : PULLS_JSON;
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes("/commits?")) return Promise.resolve(mockRes(commits));
    if (url.includes("/actions/runs")) return Promise.resolve(mockRes(runs));
    if (url.includes("/pulls?")) return Promise.resolve(mockRes(pulls));
    return Promise.resolve(mockRes(repo)); // base repo endpoint
  });
}

describe("fetchRepoData", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("should return complete GitHubData when all APIs succeed", async () => {
    const mockFetch = makeFetch();
    vi.stubGlobal("fetch", mockFetch);
    const result = await fetchRepoData("pat", "owner/repo");
    expect(result.lastCommitAt).toBe("2026-03-10T12:00:00Z");
    expect(result.lastCommitMsg).toBe("feat: something");
    expect(result.openPrs).toBe(2);
    expect(result.openIssues).toBe(3); // 5 raw - 2 PRs
    expect(result.ciStatus).toBe("success");
    expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // verify all 4 expected endpoints were called
    const urls = mockFetch.mock.calls.map(([url]: [string]) => url);
    expect(urls.some((u: string) => u.includes("/commits?"))).toBe(true);
    expect(urls.some((u: string) => u.includes("/actions/runs"))).toBe(true);
    expect(urls.some((u: string) => u.includes("/pulls?"))).toBe(true);
  });

  it("should throw when repo API returns non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/commits?")) return Promise.resolve(mockRes(COMMITS_JSON));
      if (url.includes("/actions/runs")) return Promise.resolve(mockRes(RUNS_JSON));
      if (url.includes("/pulls?")) return Promise.resolve(mockRes([]));
      return Promise.resolve(mockRes({}, false, 403));
    }));
    await expect(fetchRepoData("pat", "owner/repo")).rejects.toThrow("GitHub API error 403");
  });

  it("should throw when commits API returns non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/commits?")) return Promise.resolve(mockRes({}, false, 500));
      if (url.includes("/actions/runs")) return Promise.resolve(mockRes(RUNS_JSON));
      if (url.includes("/pulls?")) return Promise.resolve(mockRes([]));
      return Promise.resolve(mockRes(REPO_JSON));
    }));
    await expect(fetchRepoData("pat", "owner/repo")).rejects.toThrow("GitHub commits error 500");
  });

  it("should set ciStatus null when CI runs API returns non-ok (Actions not enabled)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/commits?")) return Promise.resolve(mockRes(COMMITS_JSON));
      if (url.includes("/actions/runs")) return Promise.resolve(mockRes({}, false, 404));
      if (url.includes("/pulls?")) return Promise.resolve(mockRes([]));
      return Promise.resolve(mockRes(REPO_JSON));
    }));
    const result = await fetchRepoData("pat", "owner/repo");
    expect(result.ciStatus).toBeNull();
  });

  it("should set ciStatus 'pending' when latest run conclusion is null (run in progress)", async () => {
    vi.stubGlobal("fetch", makeFetch({ runs: { workflow_runs: [{ conclusion: null }] } }));
    const result = await fetchRepoData("pat", "owner/repo");
    expect(result.ciStatus).toBe("pending");
  });

  it("should set ciStatus null when workflow_runs array is empty (no runs yet)", async () => {
    vi.stubGlobal("fetch", makeFetch({ runs: { workflow_runs: [] } }));
    const result = await fetchRepoData("pat", "owner/repo");
    expect(result.ciStatus).toBeNull();
  });

  it("should set openPrs to 0 and preserve raw issues when pulls API fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/commits?")) return Promise.resolve(mockRes(COMMITS_JSON));
      if (url.includes("/actions/runs")) return Promise.resolve(mockRes(RUNS_JSON));
      if (url.includes("/pulls?")) return Promise.resolve(mockRes({}, false, 403));
      return Promise.resolve(mockRes(REPO_JSON));
    }));
    const result = await fetchRepoData("pat", "owner/repo");
    expect(result.openPrs).toBe(0);
    expect(result.openIssues).toBe(REPO_JSON.open_issues_count); // no PRs subtracted
  });

  it("should use empty message and current-time fallback when commits array is empty", async () => {
    const fixedDate = new Date("2026-03-10T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
    vi.stubGlobal("fetch", makeFetch({ commits: [] }));
    const result = await fetchRepoData("pat", "owner/repo");
    vi.useRealTimers();
    expect(result.lastCommitMsg).toBe("");
    expect(result.lastCommitAt).toBe(fixedDate.toISOString());
  });
});
