// ABOUTME: Tests for github.ts pure helpers — ciStatus, calcOpenIssues, parseLastCommit
// ABOUTME: Verifies GitHub API response parsing and open-issues arithmetic

import { describe, it, expect } from "vitest";
import { ciStatus, calcOpenIssues, parseLastCommit } from "./github";

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
