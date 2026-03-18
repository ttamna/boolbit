// ABOUTME: TypeScript type surface — thin wrapper over types.generated.ts (auto-generated from Rust structs)
// ABOUTME: Adds TS-only types (GitHubData, SectionKey), narrows overly-broad string types from generated output

import type { ThemeKey } from "./theme";
import type {
  GitHubData as _GitHubData,
  WidgetSettings as _WidgetSettings,
  Project as _Project,
  WidgetData as _WidgetData,
  MomentumEntry as _MomentumEntry,
} from "./types.generated";

// ── Re-exports: unchanged from generated ─────────────────────────────────────
export type {
  WindowPosition,
  WindowSize,
  Habit,
  PomodoroDay,
  IntentionEntry,
  GoalEntry,
  PomodoroDurations,
} from "./types.generated";

// ── TS-only types (no Rust counterpart) ──────────────────────────────────────

export type SectionKey = "projects" | "streaks" | "direction" | "pomodoro";

// ── Narrowed types ────────────────────────────────────────────────────────────

// ciStatus is Option<String> in Rust — narrow to the exact union used at runtime
export type GitHubData = Omit<_GitHubData, "ciStatus"> & {
  ciStatus: 'success' | 'failure' | 'pending' | null;
};

export type MomentumEntry = Omit<_MomentumEntry, "tier"> & {
  tier: "high" | "mid" | "low";
};

export type Project = Omit<_Project, "status" | "githubData"> & {
  status: "active" | "in-progress" | "paused" | "done";
  githubData?: GitHubData;
};

export type WidgetSettings = Omit<_WidgetSettings, "theme" | "clockFormat"> & {
  theme: ThemeKey;
  clockFormat: "12h" | "24h";
};

export type WidgetData = Omit<
  _WidgetData,
  | "projects"
  | "collapsedSections"
  | "sectionOrder"
  | "hiddenSections"
  | "momentumHistory"
> & {
  projects: Project[];
  collapsedSections?: SectionKey[];
  sectionOrder?: SectionKey[];
  hiddenSections?: SectionKey[];
  momentumHistory?: MomentumEntry[];
};
