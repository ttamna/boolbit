// ABOUTME: DragBar component - top handle with window drag region and preset position buttons
// ABOUTME: Preset buttons snap the widget to screen corners using Tauri window API

import { CSSProperties, useState } from "react";
import { getCurrentWindow, currentMonitor, PhysicalPosition } from "@tauri-apps/api/window";
import { fonts, fontSizes, colors } from "../theme";
import type { WidgetSettings } from "../types";

const mono: CSSProperties = { fontFamily: fonts.mono };

// Margin from screen edges (px)
const EDGE_MARGIN = 20;

interface Preset {
  label: string;
  getPos: (monitor: { x: number; y: number; width: number; height: number }, w: number, h: number) => { x: number; y: number };
}

const PRESETS: Preset[] = [
  { label: "◤", getPos: (m, _w, _h) => ({ x: m.x + EDGE_MARGIN, y: m.y + EDGE_MARGIN }) },
  { label: "◥", getPos: (m, w, _h) => ({ x: m.x + m.width - w - EDGE_MARGIN, y: m.y + EDGE_MARGIN }) },
  { label: "◣", getPos: (m, _w, h) => ({ x: m.x + EDGE_MARGIN, y: m.y + m.height - h - EDGE_MARGIN }) },
  { label: "◢", getPos: (m, w, h) => ({ x: m.x + m.width - w - EDGE_MARGIN, y: m.y + m.height - h - EDGE_MARGIN }) },
];

interface DragBarProps {
  hovered: boolean;
  onSettingsChange: (patch: Partial<WidgetSettings>) => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
}

export function DragBar({ hovered, onSettingsChange, settingsOpen, onToggleSettings }: DragBarProps) {
  const [moving, setMoving] = useState(false);

  const applyPreset = async (preset: Preset) => {
    if (moving) return;
    setMoving(true);
    try {
      const win = getCurrentWindow();
      const monitor = await currentMonitor();
      if (!monitor) return;

      const sf = monitor.scaleFactor;
      // Use actual window size (not stale settings.size)
      const winPhys = await win.outerSize();

      // All values in logical pixels for consistent calculation
      const { x, y } = preset.getPos(
        {
          x: monitor.position.x / sf,
          y: monitor.position.y / sf,
          width: monitor.size.width / sf,
          height: monitor.size.height / sf,
        },
        winPhys.width / sf,
        winPhys.height / sf,
      );

      const xPhys = Math.round(x * sf);
      const yPhys = Math.round(y * sf);
      await win.setPosition(new PhysicalPosition(xPhys, yPhys));
      onSettingsChange({ position: { x: xPhys, y: yPhys } });
    } finally {
      setMoving(false);
    }
  };

  return (
    <div data-tauri-drag-region style={{
      padding: "12px 16px 8px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      cursor: "grab",
    }}>
      <div style={{ ...mono, fontSize: fontSizes.micro, color: colors.textLabel, letterSpacing: 2 }}>VISION</div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {/* Preset buttons: hover-only */}
        <div style={{ display: "flex", gap: 4, opacity: hovered ? 1 : 0, transition: "opacity 0.3s ease" }}>
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={e => { e.stopPropagation(); applyPreset(preset); }}
              title={`이동: ${preset.label}`}
              style={{
                width: 16, height: 16,
                borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: colors.textGhost,
                fontSize: 8,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0,
                lineHeight: 1,
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {/* Settings button: always visible */}
        <button
          onClick={e => { e.stopPropagation(); onToggleSettings(); }}
          title="설정"
          style={{
            width: 16, height: 16, borderRadius: 3,
            background: settingsOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${settingsOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
            color: colors.textGhost, fontSize: 9, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            opacity: hovered ? 1 : 0.4,
            transition: "opacity 0.3s ease",
          }}
        >
          ⚙
        </button>
      </div>
    </div>
  );
}
