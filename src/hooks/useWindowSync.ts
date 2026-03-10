// ABOUTME: useWindowSync hook - restores saved window position on startup and saves on move
// ABOUTME: Uses Tauri window API to sync position state with WidgetSettings

import { useEffect, useRef } from "react";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import type { WidgetSettings } from "../types";

interface UseWindowSyncOptions {
  settings: WidgetSettings;
  settingsLoaded: boolean;
  onPositionSave: (x: number, y: number) => void;
}

export function useWindowSync({ settings, settingsLoaded, onPositionSave }: UseWindowSyncOptions) {
  const restoredRef = useRef(false);

  // Restore position once on startup after settings load
  useEffect(() => {
    if (!settingsLoaded || restoredRef.current) return;
    restoredRef.current = true;

    const win = getCurrentWindow();
    win.setPosition(new PhysicalPosition(settings.position.x, settings.position.y)).catch(() => {
      // Ignore if window API unavailable (browser dev mode)
    });
  }, [settingsLoaded, settings.position.x, settings.position.y]);

  // Save position after drag ends
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;

    win.onMoved(({ payload }) => {
      // payload is PhysicalPosition with x, y in physical pixels
      // We store logical pixels for settings consistency
      onPositionSave(payload.x, payload.y);
    }).then(fn => { unlisten = fn; }).catch(() => {});

    return () => { unlisten?.(); };
  }, [onPositionSave]);
}
