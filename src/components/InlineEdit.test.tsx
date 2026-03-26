// ABOUTME: Unit tests for InlineEdit resolveCommit — pure function that decides whether/what to save
// ABOUTME: Covers multiline vs single-line branching: empty string, whitespace, unchanged value edge cases

import { describe, it, expect } from "vitest";
import { resolveCommit } from "./InlineEdit";

describe("resolveCommit — multiline mode", () => {
  it("should return cleaned value when draft differs from original", () => {
    expect(resolveCommit("hello", "world", true)).toBe("hello");
  });

  it("should return null when draft equals original", () => {
    expect(resolveCommit("hello", "hello", true)).toBeNull();
  });

  it("should return empty string when draft is empty (multiline allows clearing)", () => {
    expect(resolveCommit("", "hello", true)).toBe("");
  });

  it("should return empty string when draft is whitespace-only and original is non-empty", () => {
    expect(resolveCommit("   ", "hello", true)).toBe("");
  });

  it("should return null when draft is whitespace-only and original is also empty (trimEnd collapses to same)", () => {
    expect(resolveCommit("   ", "", true)).toBeNull();
  });

  it("should return empty string when draft is whitespace-only and original is whitespace (trimEnd differs)", () => {
    // trimEnd('   ') = '' but original is '   ', so '' !== '   ' → saves empty string
    expect(resolveCommit("   ", "   ", true)).toBe("");
  });

  it("should preserve leading whitespace in the returned value", () => {
    expect(resolveCommit("  hello", "world", true)).toBe("  hello");
  });

  it("should return null when draft has trailing whitespace that trims to match original", () => {
    expect(resolveCommit("hello   ", "hello", true)).toBeNull();
  });

  it("should strip trailing newline", () => {
    expect(resolveCommit("hello\n", "world", true)).toBe("hello");
  });

  it("should preserve internal newlines", () => {
    expect(resolveCommit("line1\nline2", "line1", true)).toBe("line1\nline2");
  });

  it("should return null when both draft and original are empty", () => {
    expect(resolveCommit("", "", true)).toBeNull();
  });

  // Windows CRLF line endings: trimEnd strips both \r and \n; internal content preserved
  it("should strip trailing Windows CRLF line ending", () => {
    expect(resolveCommit("hello\r\n", "world", true)).toBe("hello");
  });

  // Tab-only draft: trimEnd collapses to "" — saves empty string when original is non-empty (multiline allows clearing)
  it("should save empty string when draft is tab-only and original is non-empty", () => {
    expect(resolveCommit("\t\t", "hello", true)).toBe("");
  });
});

describe("resolveCommit — single-line mode", () => {
  it("should return trimmed value when draft differs from original", () => {
    expect(resolveCommit("hello", "world", false)).toBe("hello");
  });

  it("should return null when draft equals original", () => {
    expect(resolveCommit("hello", "hello", false)).toBeNull();
  });

  it("should return null when draft is empty (single-line forbids clearing)", () => {
    expect(resolveCommit("", "hello", false)).toBeNull();
  });

  it("should return null when draft is whitespace-only", () => {
    expect(resolveCommit("   ", "hello", false)).toBeNull();
  });

  it("should trim leading and trailing whitespace before returning", () => {
    expect(resolveCommit("  hello  ", "world", false)).toBe("hello");
  });

  it("should return null when trimmed value equals original", () => {
    expect(resolveCommit("  hello  ", "hello", false)).toBeNull();
  });

  it("should return null when both draft and original are empty", () => {
    expect(resolveCommit("", "", false)).toBeNull();
  });

  // Tab character is whitespace — trim() collapses it to "" → single-line null (cannot clear)
  it("should return null when draft is a single tab character", () => {
    expect(resolveCommit("\t", "hello", false)).toBeNull();
  });

  // Setting an initial value: original is "" and user types a non-empty draft
  it("should return the non-empty draft when original is empty string", () => {
    expect(resolveCommit("hello", "", false)).toBe("hello");
  });
});

