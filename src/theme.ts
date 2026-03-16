// ABOUTME: Design token definitions - single source of truth for the widget's visual language
// ABOUTME: Covers colors, typography, border radius, and shadows used via inline React styles

export const colors = {
  // Container background
  bgBase: "rgba(12, 12, 16, 0.75)",

  // Borders
  borderSubtle: "rgba(255,255,255,0.06)",
  borderFaint: "rgba(255,255,255,0.04)",
  borderAccent: "rgba(255,255,255,0.08)",

  // Text hierarchy (descending opacity)
  // Floor raised from 0.20→0.26 to improve readability on varying desktop backgrounds (#26)
  textPrimary: "rgba(255,255,255,0.95)",
  textHigh: "rgba(255,255,255,0.88)",
  textMid: "rgba(255,255,255,0.62)",
  textLow: "rgba(255,255,255,0.56)",
  textMuted: "rgba(255,255,255,0.50)",
  textFaint: "rgba(255,255,255,0.46)",
  textDim: "rgba(255,255,255,0.42)",
  textSubtle: "rgba(255,255,255,0.38)",
  textGhost: "rgba(255,255,255,0.34)",
  textPhantom: "rgba(255,255,255,0.30)",
  textLabel: "rgba(255,255,255,0.26)",

  // Surfaces
  surfaceFaint: "rgba(255,255,255,0.04)",
  surfaceHover: "rgba(255,255,255,0.15)",

  // Status accents (project status, habit streaks)
  statusActive: "#4ADE80",
  statusProgress: "#FBBF24",
  statusPaused: "#F87171",
  statusLongBreak: "#7DD3FC",  // long-break phase in pomodoro (sky blue)
  statusDone: "#A78BFA",       // violet — project completed

  // CI build status — intentionally separate tokens from project-status tokens above
  // so CI badge colors can evolve independently (values coincide with statusActive/Paused today)
  ciSuccess: "#4ADE80",        // green — build passed
  ciFailure: "#F87171",        // red — build failed or cancelled/timed-out
  ciPending: "#FACC15",        // lighter yellow (≠ statusProgress #FBBF24 amber) — build in flight
} as const;

export const fonts = {
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sans: "'Noto Sans KR', -apple-system, sans-serif",
} as const;

export const fontSizes = {
  clock: 56,    // Main clock digits
  clockSec: 32, // Clock seconds
  lg: 14,       // Project names, habit icons
  base: 13,     // Dates, general text
  sm: 12,       // Goals, habits, quotes
  xs: 11,       // Progress %, metrics
  label: 10,    // Section labels
  mini: 9,      // Footer, chips
  micro: 9,     // Drag bar label (raised 8→9 for readability #26)
} as const;

export const radius = {
  container: 16,
  chip: 4,
  bar: 2,
} as const;

export const shadows = {
  container: "0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
} as const;

// Color themes — each defines the background RGB and accent colors
export const THEMES = {
  void:     { name: "Void",     bgRgb: "10, 10, 14",  accent: "#4ADE80" },
  nebula:   { name: "Nebula",   bgRgb: "6, 8, 28",    accent: "#38BDF8" },
  forest:   { name: "Forest",   bgRgb: "6, 18, 10",   accent: "#86EFAC" },
  ember:    { name: "Ember",    bgRgb: "24, 10, 6",   accent: "#FB923C" },
  midnight: { name: "Midnight", bgRgb: "8, 6, 22",    accent: "#818CF8" },
  aurora:   { name: "Aurora",   bgRgb: "6, 20, 20",   accent: "#2DD4BF" },
  rose:     { name: "Rose",     bgRgb: "22, 6, 14",   accent: "#F472B6" },
} as const;

export type ThemeKey = keyof typeof THEMES;

// Project status → accent color map (single source of truth for status color logic)
export const PROJECT_STATUS_COLORS: Record<"active" | "in-progress" | "paused" | "done", string> = {
  active: colors.statusActive,
  "in-progress": colors.statusProgress,
  paused: colors.statusPaused,
  done: colors.statusDone,
};
