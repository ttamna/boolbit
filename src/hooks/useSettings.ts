// ABOUTME: useSettings hook - loads and saves WidgetSettings via Rust backend
// ABOUTME: Settings are persisted separately from widget data (settings.json vs data.json)

import { useState, useEffect, useCallback, useRef } from "react";
import type { WidgetSettings } from "../types";
import { invoke } from "../lib/tauri";

const DEFAULT_SETTINGS: WidgetSettings = {
  position: { x: 20, y: 60 },
  size: { width: 380, height: 700 },
  opacity: 1.0,
};

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await invoke<WidgetSettings>("load_settings");
      if (saved) {
        setSettings(saved);
        settingsRef.current = saved;
      }
      setLoaded(true);
    })();
  }, []);

  const updateSettings = useCallback(async (patch: Partial<WidgetSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    await invoke("save_settings", { settings: next });
    return next;
  }, []); // no settings dependency — uses ref to avoid stale closure

  return { settings, updateSettings, loaded };
}
