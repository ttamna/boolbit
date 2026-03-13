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
  pomodoroAutoStart?: boolean;   // auto-start next phase when current phase ends
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
  clockFormat?: '12h' | '24h'; // defaults to '24h' when absent
}
