// ABOUTME: useSettings hook - loads and saves WidgetSettings via Rust backend
// ABOUTME: Settings are persisted separately from widget data (settings.json vs data.json)

import { useState, useEffect, useCallback, useRef } from "react";
import type { WidgetSettings } from "../types";
import { invoke } from "../lib/tauri";

const DEFAULT_SETTINGS: WidgetSettings = {
  position: { x: 20, y: 60 },
  size: { width: 380, height: 700 },
  opacity: 1.0,
  theme: "void",
  clockFormat: "24h",
  pinned: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await invoke<WidgetSettings>("load_settings");
      if (saved) {
        // Shallow merge is safe: Rust always serializes complete position/size objects,
        // so partial nested objects cannot arrive. New top-level fields (e.g. theme)
        // get DEFAULT_SETTINGS fallback when loading pre-existing save files.
        const merged = { ...DEFAULT_SETTINGS, ...saved };
        setSettings(merged);
        settingsRef.current = merged;
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
