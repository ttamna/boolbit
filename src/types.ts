// ABOUTME: TypeScript type definitions for widget data, settings, and domain models
// ABOUTME: Shared across components and hooks; mirrors the Rust WidgetData struct in lib.rs

export interface Project {
  id: number;
  name: string;
  status: "active" | "in-progress" | "paused";
  goal: string;
  progress: number;
  metric: string;
  metric_value: string;
  metric_target: string;
}

export interface Habit {
  name: string;
  streak: number;
  icon: string;
  lastChecked?: string; // ISO date string (YYYY-MM-DD), set when habit is checked today
}

export interface WidgetData {
  projects: Project[];
  habits: Habit[];
  quotes: string[];
  pomodoroDurations?: { focus: number; break: number };
  pomodoroSessionsDate?: string; // YYYY-MM-DD, date of the last counted session
  pomodoroSessions?: number;     // focus sessions completed on pomodoroSessionsDate
  pomodoroAutoStart?: boolean;   // whether the next phase starts automatically after each phase ends
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

import type { ThemeKey } from "./theme";

export interface WidgetSettings {
  position: WindowPosition;
  size: WindowSize;
  opacity: number; // 0.0 ~ 1.0
  theme: ThemeKey;
}
