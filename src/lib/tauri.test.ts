// ABOUTME: Tests for tauri.ts — isTauri() environment guard and invoke() fallback behavior
// ABOUTME: Verifies graceful null return when Tauri backend is unavailable

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { isTauri, invoke } from "./tauri";

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

describe("isTauri", () => {
  beforeEach(() => {
    delete (window as TauriWindow).__TAURI_INTERNALS__;
  });

  it("should return true when __TAURI_INTERNALS__ is set to a truthy value", () => {
    (window as TauriWindow).__TAURI_INTERNALS__ = {};
    expect(isTauri()).toBe(true);
  });

  it("should return false when __TAURI_INTERNALS__ is absent", () => {
    // beforeEach guarantees property is deleted — no additional arrangement needed
    expect(isTauri()).toBe(false);
  });

  it("should return false when __TAURI_INTERNALS__ is undefined", () => {
    (window as TauriWindow).__TAURI_INTERNALS__ = undefined;
    expect(isTauri()).toBe(false);
  });

  it("should return false when __TAURI_INTERNALS__ is null", () => {
    (window as TauriWindow).__TAURI_INTERNALS__ = null;
    expect(isTauri()).toBe(false);
  });
});

describe("invoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call tauriInvoke with the given command and args", async () => {
    vi.mocked(tauriInvoke).mockResolvedValue("ok");
    await invoke<string>("load_data", { key: "val" });
    expect(tauriInvoke).toHaveBeenCalledWith("load_data", { key: "val" });
  });

  it("should return the resolved value from tauriInvoke", async () => {
    vi.mocked(tauriInvoke).mockResolvedValue({ items: [1, 2, 3] });
    const result = await invoke<{ items: number[] }>("get_items");
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it("should pass undefined as args when args are omitted", async () => {
    vi.mocked(tauriInvoke).mockResolvedValue(null);
    await invoke("any_cmd");
    expect(tauriInvoke).toHaveBeenCalledWith("any_cmd", undefined);
  });

  it("should return null when tauriInvoke throws an Error", async () => {
    vi.mocked(tauriInvoke).mockRejectedValue(new Error("Tauri unavailable"));
    const result = await invoke<string>("load_data");
    expect(result).toBeNull();
  });

  it("should return null when tauriInvoke rejects with a string error", async () => {
    vi.mocked(tauriInvoke).mockRejectedValue("tauri error");
    const result = await invoke<unknown>("save_data", { data: {} });
    expect(result).toBeNull();
  });
});
