// ABOUTME: Utility functions for exporting and importing WidgetData as JSON backup files.
// ABOUTME: buildExportBlob and parseImportedData are pure/side-effect-free; triggerDownload handles DOM side effects.

import type { WidgetData } from "../types";

/** Creates a Blob containing the full WidgetData serialised as pretty-printed JSON. */
export function buildExportBlob(data: WidgetData): Blob {
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: "application/json" });
}

/**
 * Triggers a browser file download for the given blob with the specified filename.
 * revokeObjectURL is deferred 100 ms to avoid revoking the URL before WebKit
 * (Tauri's WebView engine) has finished reading the Blob for the download.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  const target = document.body ?? document.documentElement;
  target.appendChild(a);
  a.click();
  target.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

type ParseResult =
  | { ok: true; data: WidgetData }
  | { ok: false; error: string };

/**
 * Parses a JSON string and validates it contains the minimum required WidgetData fields.
 * Each project must have a string name; each habit must have a string name.
 * Returns ok:true with the parsed data, or ok:false with a human-readable error message.
 */
export function parseImportedData(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "유효하지 않은 JSON 파일입니다." };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "올바른 위젯 데이터 형식이 아닙니다." };
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.projects)) {
    return { ok: false, error: "projects 필드가 없거나 올바르지 않습니다." };
  }
  if (!Array.isArray(obj.habits)) {
    return { ok: false, error: "habits 필드가 없거나 올바르지 않습니다." };
  }
  if (!Array.isArray(obj.quotes)) {
    return { ok: false, error: "quotes 필드가 없거나 올바르지 않습니다." };
  }

  // Validate each project has at minimum a string name to prevent corrupted data
  // from reaching the Rust backend via persist → invoke("save_data").
  for (const p of obj.projects as unknown[]) {
    if (typeof p !== "object" || p === null || typeof (p as Record<string, unknown>).name !== "string") {
      return { ok: false, error: "projects 항목에 유효하지 않은 데이터가 있습니다." };
    }
  }

  // Validate each habit has a string name
  for (const h of obj.habits as unknown[]) {
    if (typeof h !== "object" || h === null || typeof (h as Record<string, unknown>).name !== "string") {
      return { ok: false, error: "habits 항목에 유효하지 않은 데이터가 있습니다." };
    }
  }

  return { ok: true, data: obj as unknown as WidgetData };
}
