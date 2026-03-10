// ABOUTME: SettingsPanel component - collapsible panel for widget appearance settings
// ABOUTME: Currently provides opacity slider; more settings will be added in future tasks

import { CSSProperties } from "react";
import { fontSizes, colors } from "../theme";
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
            style={{ flex: 1, accentColor: colors.statusActive, cursor: "pointer" }}
          />
          <span style={{ fontSize: fontSizes.xs, color: colors.textDim, width: 32, textAlign: "right" }}>
            {Math.round(settings.opacity * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
