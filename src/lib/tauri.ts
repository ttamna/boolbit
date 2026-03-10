// ABOUTME: Tauri invoke wrapper - centralizes all Rust backend communication
// ABOUTME: Falls back gracefully when running outside of Tauri (browser dev mode)

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const tauri = (window as any).__TAURI__;
    if (tauri?.core?.invoke) {
      return await tauri.core.invoke(cmd, args);
    }
  } catch {
    // fallback for dev without Tauri
  }
  return null as unknown as T;
}
