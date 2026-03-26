// ABOUTME: Unit tests for dataIO helpers — JSON export blob creation, download trigger, and import validation.
// ABOUTME: Covers invalid JSON, missing required fields, item-level validation, and happy-path round-trips.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildExportBlob, triggerDownload, parseImportedData } from "./dataIO";
import type { WidgetData } from "../types";

const MINIMAL_DATA: WidgetData = {
  projects: [],
  habits: [],
  quotes: [],
};

describe("buildExportBlob", () => {
  it("should create a Blob with application/json type", async () => {
    const blob = buildExportBlob(MINIMAL_DATA);
    expect(blob.type).toBe("application/json");
  });

  it("should serialise data to valid JSON", async () => {
    const blob = buildExportBlob(MINIMAL_DATA);
    const text = await blob.text();
    const parsed = JSON.parse(text);
    expect(parsed.projects).toEqual([]);
    expect(parsed.habits).toEqual([]);
    expect(parsed.quotes).toEqual([]);
  });

  it("should include all WidgetData fields present in the source", async () => {
    const data: WidgetData = { ...MINIMAL_DATA, pomodoroSessions: 3, pomodoroSessionGoal: 5 };
    const blob = buildExportBlob(data);
    const parsed = JSON.parse(await blob.text());
    expect(parsed.pomodoroSessions).toBe(3);
    expect(parsed.pomodoroSessionGoal).toBe(5);
  });

  it("should produce pretty-printed JSON with newlines and 2-space indentation", async () => {
    // JSON.stringify(data, null, 2) — indent=2 guarantees human-readable output for manual editing
    // Assertion checks an exact indented line to distinguish indent=2 from indent=4/8
    const blob = buildExportBlob(MINIMAL_DATA);
    const text = await blob.text();
    const lines = text.split("\n");
    // Line 0: "{", line 1: first key indented with exactly 2 spaces (trailing comma present because more keys follow)
    expect(lines[1]).toBe('  "projects": [],');
  });
});

describe("triggerDownload", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    Object.defineProperty(globalThis.URL, "createObjectURL", { value: createObjectURL, writable: true });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", { value: revokeObjectURL, writable: true });
    appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(node => node as Element);
    removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(node => node as Element);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should call createObjectURL with the blob", () => {
    const blob = buildExportBlob(MINIMAL_DATA);
    triggerDownload(blob, "test.json");
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("should append and remove an anchor element", () => {
    const blob = buildExportBlob(MINIMAL_DATA);
    triggerDownload(blob, "test.json");
    expect(appendChildSpy).toHaveBeenCalledOnce();
    expect(removeChildSpy).toHaveBeenCalledOnce();
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.tagName).toBe("A");
    expect(anchor.download).toBe("test.json");
    expect(anchor.href).toContain("mock-url");
  });

  it("should defer revokeObjectURL by 100 ms to avoid premature revoke in WebKit", () => {
    const blob = buildExportBlob(MINIMAL_DATA);
    triggerDownload(blob, "test.json");
    // Not yet revoked synchronously
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});

describe("parseImportedData", () => {
  it("should return ok:true for minimal valid data", () => {
    const result = parseImportedData(JSON.stringify(MINIMAL_DATA));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.projects).toEqual([]);
      expect(result.data.habits).toEqual([]);
      expect(result.data.quotes).toEqual([]);
    }
  });

  it("should return ok:true and preserve all fields in a round-trip", () => {
    const data: WidgetData = { ...MINIMAL_DATA, pomodoroSessions: 7, weekGoal: "출시" };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.pomodoroSessions).toBe(7);
      expect(result.data.weekGoal).toBe("출시");
      expect(result.data.quotes).toEqual([]);
    }
  });

  it("should return ok:true for data with valid project and habit items", () => {
    const data = {
      ...MINIMAL_DATA,
      projects: [{ name: "feat X", status: "active", progress: 0 }],
      habits: [{ name: "운동", streak: 3 }],
    };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(true);
  });

  it("should return ok:false for malformed JSON", () => {
    const result = parseImportedData("{invalid json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("JSON");
  });

  it("should return ok:false for JSON string (not object)", () => {
    const result = parseImportedData('"hello"');
    expect(result.ok).toBe(false);
  });

  it("should return ok:false for JSON null", () => {
    const result = parseImportedData("null");
    expect(result.ok).toBe(false);
  });

  it("should return ok:false for JSON array", () => {
    const result = parseImportedData("[]");
    expect(result.ok).toBe(false);
  });

  it("should return ok:false when projects is missing", () => {
    const result = parseImportedData(JSON.stringify({ habits: [], quotes: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("projects");
  });

  it("should return ok:false when habits is missing", () => {
    const result = parseImportedData(JSON.stringify({ projects: [], quotes: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("habits");
  });

  it("should return ok:false when quotes is missing", () => {
    const result = parseImportedData(JSON.stringify({ projects: [], habits: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("quotes");
  });

  it("should return ok:false when projects is not an array", () => {
    const result = parseImportedData(JSON.stringify({ projects: {}, habits: [], quotes: [] }));
    expect(result.ok).toBe(false);
  });

  it("should return ok:false when a project item has no name", () => {
    const data = { ...MINIMAL_DATA, projects: [{ status: "active" }] };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("projects");
  });

  it("should return ok:false when a habit item has no name", () => {
    const data = { ...MINIMAL_DATA, habits: [{ streak: 5 }] };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("habits");
  });

  it("should accept data with extra unknown fields (forwards compatibility)", () => {
    const json = JSON.stringify({ ...MINIMAL_DATA, futureField: "ignored" });
    const result = parseImportedData(json);
    expect(result.ok).toBe(true);
  });

  it("should return ok:false when projects array contains null item", () => {
    // typeof null === "object" so the explicit p === null guard (line 65) is required
    const data = { ...MINIMAL_DATA, projects: [null] };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("projects");
  });

  it("should return ok:false when habits array contains null item", () => {
    // typeof null === "object" so the explicit h === null guard (line 72) is required
    const data = { ...MINIMAL_DATA, habits: [null] };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("habits");
  });

  it("should return ok:false when project name is a number not a string", () => {
    // name field exists but typeof 42 !== "string" — type coercion cannot sneak past the guard
    const data = { ...MINIMAL_DATA, projects: [{ name: 42, status: "active" }] };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("projects");
  });

  it("should return ok:false when habit name is null", () => {
    // typeof null !== "string" — null name must be rejected even though the field is present
    const data = { ...MINIMAL_DATA, habits: [{ name: null, streak: 5 }] };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("habits");
  });

  // ── Edge cases: root type guard and item primitive guard ──────────────────

  it("should return ok:false when root JSON value is a boolean (not an object)", () => {
    // typeof true !== "object" → triggers the non-object/non-null/non-array guard
    // Distinct from string/null/array roots already tested above
    const result = parseImportedData("true");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("형식");
  });

  it("should return ok:false when projects array contains a primitive string item", () => {
    // typeof "item" !== "object" → fails the item type guard (primitive, not {name:string})
    // Distinct from null-item (passes typeof check but fails === null) and missing-name tests
    const data = { ...MINIMAL_DATA, projects: ["item"] };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("projects");
  });

  it("should return ok:true when habit name is an empty string (valid string type)", () => {
    // typeof "" === "string" → passes the name type guard; empty string is structurally valid
    // Guards test string type, not string length — callers decide what makes a name meaningful
    const data = { ...MINIMAL_DATA, habits: [{ name: "" }] };
    const result = parseImportedData(JSON.stringify(data));
    expect(result.ok).toBe(true);
  });
});
