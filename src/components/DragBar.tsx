// ABOUTME: DragBar component - top handle with window drag region and preset position buttons
// ABOUTME: Preset buttons snap the widget flush to screen work area corners (taskbar/dock aware)

import { CSSProperties, useState } from "react";
import { getCurrentWindow, currentMonitor, PhysicalPosition } from "@tauri-apps/api/window";
import { fonts, fontSizes, colors } from "../theme";
import type { WidgetSettings } from "../types";

const mono: CSSProperties = { fontFamily: fonts.mono };

interface WorkBounds { x: number; y: number; width: number; height: number }

interface Preset {
  label: string;
  // w: work area bounds in logical px (physical÷sf, taskbar/dock excluded); fw/fh: widget logical size
  getPos: (w: WorkBounds, fw: number, fh: number) => { x: number; y: number };
}

const PRESETS: Preset[] = [
  { label: "◤", getPos: (w, _fw, _fh) => ({ x: w.x,               y: w.y }) },
  { label: "◥", getPos: (w, fw,  _fh) => ({ x: w.x + w.width - fw, y: w.y }) },
  { label: "◣", getPos: (w, _fw, fh)  => ({ x: w.x,               y: w.y + w.height - fh }) },
  { label: "◢", getPos: (w, fw,  fh)  => ({ x: w.x + w.width - fw, y: w.y + w.height - fh }) },
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
      const winPhys = await win.outerSize();

      // monitor.workArea excludes OS taskbar/dock — flush snap without extra margin
      const work: WorkBounds = {
        x:      monitor.workArea.position.x / sf,
        y:      monitor.workArea.position.y / sf,
        width:  monitor.workArea.size.width  / sf,
        height: monitor.workArea.size.height / sf,
      };

      const { x, y } = preset.getPos(work, winPhys.width / sf, winPhys.height / sf);

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
