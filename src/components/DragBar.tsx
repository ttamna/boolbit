// ABOUTME: DragBar component - top handle with window drag region, preset position buttons, pin toggle, opacity ±5% buttons
// ABOUTME: Preset buttons snap the widget flush to screen work area corners; pin keeps window always-on-top

import { CSSProperties, useState } from "react";
import { getCurrentWindow, currentMonitor, PhysicalPosition } from "@tauri-apps/api/window";
import { fonts, fontSizes, colors, THEMES, ThemeKey } from "../theme";
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

// Theme cycle order — follows THEMES declaration order
const THEME_ORDER = Object.keys(THEMES) as ThemeKey[];

// Width presets in logical pixels: narrow / default / wide
const WIDTH_PRESETS = [300, 380, 460] as const;

interface DragBarProps {
  hovered: boolean;
  onSettingsChange: (patch: Partial<WidgetSettings>) => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  currentTheme: ThemeKey;
  pinned?: boolean;
  opacity?: number;
  widgetWidth?: number;
  onWidthChange?: (w: number) => void;
}

export function DragBar({ hovered, onSettingsChange, settingsOpen, onToggleSettings, currentTheme, pinned = false, opacity = 0.75, widgetWidth = 380, onWidthChange }: DragBarProps) {
  const [moving, setMoving] = useState(false);
  // safeWidthIdx: index of current width in WIDTH_PRESETS; defaults to 1 (middle) for non-preset values
  const widthIdx = WIDTH_PRESETS.indexOf(widgetWidth as typeof WIDTH_PRESETS[number]);
  const safeWidthIdx = widthIdx === -1 ? 1 : widthIdx;

  const cycleTheme = () => {
    const i = THEME_ORDER.indexOf(currentTheme);
    const next = THEME_ORDER[(i + 1) % THEME_ORDER.length];
    onSettingsChange({ theme: next });
  };

  const togglePin = async () => {
    const next = !pinned;
    try {
      await getCurrentWindow().setAlwaysOnTop(next);
      onSettingsChange({ pinned: next });
    } catch {
      // setAlwaysOnTop failed — window state unchanged, settings not updated
    }
  };

  const theme = THEMES[currentTheme] ?? THEMES.void;

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
        {/* Opacity ±5% buttons: hover-only */}
        <div style={{ display: "flex", gap: 2, opacity: hovered ? 1 : 0, transition: "opacity 0.3s ease", alignItems: "center" }}>
          {([-0.05, 0.05] as const).map(delta => (
            <button
              key={delta}
              onClick={e => { e.stopPropagation(); onSettingsChange({ opacity: Math.min(1.0, Math.max(0.20, Math.round((opacity + delta) * 100) / 100)) }); }}
              title={delta < 0 ? `투명도 -5% (현재 ${Math.round(opacity * 100)}%)` : `투명도 +5% (현재 ${Math.round(opacity * 100)}%)`}
              style={{
                width: 14, height: 14,
                borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: colors.textGhost,
                fontSize: 9,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0,
                lineHeight: 1,
              }}
            >
              {delta < 0 ? "−" : "+"}
            </button>
          ))}
        </div>
        {/* Width preset buttons: hover-only; ◂ = narrower, ▸ = wider */}
        {onWidthChange && (
          <div style={{ display: "flex", gap: 2, opacity: hovered ? 1 : 0, transition: "opacity 0.3s ease", alignItems: "center" }}>
            {([[-1, "◂"] as const, [1, "▸"] as const]).map(([dir, label]) => {
              const targetIdx = safeWidthIdx + dir;
              const disabled = targetIdx < 0 || targetIdx >= WIDTH_PRESETS.length;
              return (
                <button
                  key={dir}
                  onClick={e => { e.stopPropagation(); if (!disabled) onWidthChange(WIDTH_PRESETS[targetIdx]); }}
                  disabled={disabled}
                  title={disabled ? undefined : `너비 ${WIDTH_PRESETS[targetIdx]}px로 변경`}
                  style={{
                    width: 14, height: 14,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: disabled ? "rgba(255,255,255,0.15)" : colors.textGhost,
                    fontSize: 9,
                    cursor: disabled ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
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
        {/* Theme cycle button: colored dot showing current theme, click to cycle */}
        <button
          onClick={e => { e.stopPropagation(); cycleTheme(); }}
          title={`테마: ${theme.name} (클릭하여 전환)`}
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: `rgb(${theme.bgRgb})`,
            border: `2px solid ${theme.accent}`,
            cursor: "pointer", padding: 0,
            boxShadow: `0 0 5px ${theme.accent}80`,
            opacity: hovered ? 1 : 0.5,
            transition: "opacity 0.3s ease, border-color 0.25s, box-shadow 0.25s",
          }}
        />
        {/* Pin button: ▲ = always-on-top toggle; accent = pinned, ghost = unpinned */}
        <button
          onClick={e => { e.stopPropagation(); togglePin(); }}
          title={pinned ? "항상 위 켜짐 — 클릭하여 끄기" : "항상 위 꺼짐 — 클릭하여 켜기"}
          style={{
            width: 16, height: 16, borderRadius: 3,
            background: pinned ? `${theme.accent}22` : "rgba(255,255,255,0.06)",
            border: `1px solid ${pinned ? theme.accent + "66" : "rgba(255,255,255,0.1)"}`,
            color: pinned ? theme.accent : colors.textGhost,
            fontSize: 9, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            opacity: hovered ? 1 : (pinned ? 0.7 : 0.4),
            transition: "opacity 0.3s ease, border-color 0.2s, background 0.2s, color 0.2s",
          }}
        >
          ▲
        </button>
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
