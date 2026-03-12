// ABOUTME: Tauri invoke wrapper - centralizes all Rust backend communication
// ABOUTME: Falls back gracefully when running outside of Tauri (browser dev mode)

import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export const isTauri = () =>
  Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch {
    // fallback for dev without Tauri
  }
  return null as unknown as T;
}
