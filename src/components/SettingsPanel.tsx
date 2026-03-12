// ABOUTME: SettingsPanel component - collapsible panel for widget appearance settings
// ABOUTME: Provides opacity slider and color theme switcher (4 presets)

import { CSSProperties } from "react";
import { fontSizes, colors, THEMES, ThemeKey } from "../theme";
import type { WidgetSettings } from "../types";

interface SettingsPanelProps {
  settings: WidgetSettings;
  onUpdate: (patch: Partial<WidgetSettings>) => void;
}

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 0",
};

const label: CSSProperties = {
  fontSize: fontSizes.xs,
  color: colors.textSubtle,
  flexShrink: 0,
};

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  const currentTheme = settings.theme;
  const themeAccent = THEMES[currentTheme].accent;

  return (
    <div style={{
      borderTop: `1px solid ${colors.borderFaint}`,
      padding: "10px 24px 14px",
    }}>
      <div style={row}>
        <span style={label}>투명도</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <input
            type="range"
            min={20}
            max={100}
            value={Math.round(settings.opacity * 100)}
            onChange={e => onUpdate({ opacity: Number(e.target.value) / 100 })}
            style={{ flex: 1, accentColor: themeAccent, cursor: "pointer" }}
          />
          <span style={{ fontSize: fontSizes.xs, color: colors.textDim, width: 32, textAlign: "right" }}>
            {Math.round(settings.opacity * 100)}%
          </span>
        </div>
      </div>

      <div style={row}>
        <span style={label}>테마</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(Object.keys(THEMES) as ThemeKey[]).map(key => {
            const t = THEMES[key];
            const active = currentTheme === key;
            return (
              <button
                key={key}
                title={t.name}
                onClick={() => onUpdate({ theme: key })}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: `rgb(${t.bgRgb})`,
                  border: active
                    ? `2px solid ${t.accent}`
                    : `2px solid rgba(255,255,255,0.15)`,
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: active ? `0 0 6px ${t.accent}60` : "none",
                  transition: "border 0.15s, box-shadow 0.15s",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
