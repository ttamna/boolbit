// ABOUTME: useSettings hook - loads and saves WidgetSettings via Rust backend
// ABOUTME: Settings are persisted separately from widget data (settings.json vs data.json)

import { useState, useEffect, useCallback } from "react";
import type { WidgetSettings } from "../types";
import { invoke } from "../lib/tauri";

const DEFAULT_SETTINGS: WidgetSettings = {
  position: { x: 20, y: 60 },
  size: { width: 380, height: 700 },
  opacity: 1.0,
};

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await invoke<WidgetSettings>("load_settings");
      if (saved) setSettings(saved);
      setLoaded(true);
    })();
  }, []);

  const updateSettings = useCallback(async (patch: Partial<WidgetSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await invoke("save_settings", { settings: next });
    return next;
  }, [settings]);

  return { settings, updateSettings, loaded };
}
