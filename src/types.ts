// ABOUTME: TypeScript type definitions for widget data, settings, and domain models
// ABOUTME: Shared across components and hooks; mirrors the Rust WidgetData struct in lib.rs

import type { ThemeKey } from "./theme";

export interface GitHubData {
  lastCommitAt: string;   // ISO date
  lastCommitMsg: string;
  openIssues: number;
  openPrs: number;
  ciStatus: 'success' | 'failure' | 'pending' | null;
  fetchedAt: string;      // ISO date
}

export interface Project {
  id: number;
  name: string;
  status: "active" | "in-progress" | "paused";
  goal: string;
  progress: number;
  metric: string;
  metric_value: string;
  metric_target: string;
  githubRepo?: string;    // "owner/repo"
  githubData?: GitHubData;
  deadline?: string;      // YYYY-MM-DD, project target completion date
  notes?: string;         // freeform project notes: context, blockers, next steps
}

export interface Habit {
  id?: string;          // stable identity for React keys
  name: string;
  streak: number;
  icon: string;
  lastChecked?: string;    // ISO date string (YYYY-MM-DD), set when habit is checked today
  targetStreak?: number;   // personal goal in days; absent/0 = no target set
  checkHistory?: string[]; // sorted YYYY-MM-DD check-in dates (today included), capped at 14 entries
}

export type SectionKey = "projects" | "streaks" | "direction" | "pomodoro";

export interface WidgetData {
  projects: Project[];
  habits: Habit[];
  quotes: string[];
  pomodoroDurations?: { focus: number; break: number; longBreak?: number };
  pomodoroSessionsDate?: string; // YYYY-MM-DD, date of the last counted session
  pomodoroSessions?: number;     // focus sessions completed on pomodoroSessionsDate
  pomodoroAutoStart?: boolean;   // auto-start next phase when current phase ends
  pomodoroSessionGoal?: number;  // optional daily focus session target
  pomodoroLongBreakInterval?: number; // focus sessions per long-break cycle, default 4
  collapsedSections?: SectionKey[];  // section names currently collapsed
  quoteInterval?: number;            // auto-rotation interval in seconds (default 8)
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WidgetSettings {
  position: WindowPosition;
  size: WindowSize;
  opacity: number; // 0.0 ~ 1.0
  theme: ThemeKey;
  clockFormat?: '12h' | '24h';         // defaults to '24h' when absent
  githubPat?: string;                   // Personal Access Token, stored locally
  githubRefreshInterval?: number;       // minutes, defaults to 10
}
