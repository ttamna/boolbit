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
  status: "active" | "in-progress" | "paused" | "done";
  goal: string;
  progress: number;
  metric: string;
  metric_value: string;
  metric_target: string;
  githubRepo?: string;    // "owner/repo"
  githubData?: GitHubData;
  deadline?: string;      // YYYY-MM-DD, project target completion date
  notes?: string;         // freeform project notes: context, blockers, next steps
  isFocus?: boolean;      // marks project as today's focus/priority; absent = not focused
  pomodoroSessions?: number; // lifetime focus sessions completed while this project was ★; absent = 0
  url?: string;             // external project link (prod URL, docs, etc.); absent = not set
  lastFocusDate?: string;   // YYYY-MM-DD date of last completed pomodoro focus session; absent = never focused
  completedDate?: string;   // YYYY-MM-DD date when project status was last set to "done"; absent = not completed via cycle
  createdDate?: string;     // YYYY-MM-DD date when the project was first added to the widget; absent = pre-feature
}

export interface Habit {
  id?: string;          // stable identity for React keys
  name: string;
  streak: number;
  icon: string;
  lastChecked?: string;    // ISO date string (YYYY-MM-DD), set when habit is checked today
  targetStreak?: number;   // personal goal in days; absent/0 = no target set
  bestStreak?: number;     // highest streak ever achieved; auto-updated on check-in; absent = no record
  checkHistory?: string[]; // sorted YYYY-MM-DD check-in dates (today included), capped at 14 entries
  notes?: string;          // motivational context or reason for maintaining this habit
}

export type SectionKey = "projects" | "streaks" | "direction" | "pomodoro";

export interface PomodoroDay {
  date: string;  // YYYY-MM-DD
  count: number; // focus sessions completed on this day
}

export interface IntentionEntry {
  date: string;  // YYYY-MM-DD
  text: string;  // the intention text for that day
  done?: boolean; // true when the user marked the intention as accomplished; absent = not done
}

export interface GoalEntry {
  date: string;  // period key: "YYYY-Www" (weekly), "YYYY-MM" (monthly), "YYYY-Q1"…"YYYY-Q4" (quarterly), "YYYY" (yearly)
  text: string;  // the goal text for that period
  done?: boolean; // true when the user marked the goal as accomplished; absent = not done
}

export interface MomentumEntry {
  date: string;  // YYYY-MM-DD
  score: number; // 0-100 daily momentum score
  tier: "high" | "mid" | "low";
}

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
  pomodoroNotify?: boolean;           // desktop notification on phase end; absent/true = enabled
  pomodoroSound?: boolean;            // audio cue on phase end via Web Audio API; absent/false = disabled
  habitsSound?: boolean;              // audio cue on habit check-in via Web Audio API; absent/false = disabled
  pomodoroHistory?: PomodoroDay[];    // rolling 14-day daily session counts for the 7-day heatmap
  collapsedSections?: SectionKey[];  // section names currently collapsed
  sectionOrder?: SectionKey[];       // display order of sections; absent = default order
  quoteInterval?: number;            // auto-rotation interval in seconds (default 8)
  todayIntention?: string;           // one-line daily intention set by user; absent = not set
  todayIntentionDate?: string;       // YYYY-MM-DD when todayIntention was last set; absent = not tracked
  todayIntentionDone?: boolean;      // true when user marks today's intention as accomplished; absent/false = not done
  intentionHistory?: IntentionEntry[]; // rolling 7-day log of daily intentions; newest last; absent = no history
  weekGoal?: string;      // one-line weekly goal; absent = not set
  weekGoalDate?: string;  // ISO week "YYYY-Www" when weekGoal was last set; absent = not tracked
  weekGoalDone?: boolean; // true when user marks weekly goal as accomplished; absent/false = not done
  monthGoal?: string;     // one-line monthly goal; absent = not set
  monthGoalDate?: string; // "YYYY-MM" when monthGoal was last set; absent = not tracked
  monthGoalDone?: boolean; // true when user marks monthly goal as accomplished; absent/false = not done
  quarterGoal?: string;   // one-line quarterly goal; absent = not set
  quarterGoalDate?: string; // "YYYY-Q1"…"YYYY-Q4" when quarterGoal was last set; absent = not tracked
  quarterGoalDone?: boolean; // true when user marks quarterly goal as accomplished; absent/false = not done
  yearGoal?: string;      // one-line yearly goal; absent = not set
  yearGoalDate?: string;  // "YYYY" when yearGoal was last set; absent = not tracked
  yearGoalDone?: boolean; // true when user marks yearly goal as accomplished; absent/false = not done
  pomodoroLifetimeMins?: number; // cumulative focus minutes across all sessions; absent = 0 (pre-feature)
  momentumHistory?: MomentumEntry[]; // rolling 7-day daily momentum scores; newest last; absent = no history
  habitsAllDoneDate?: string;   // YYYY-MM-DD date when the "all habits done today" notification was sent; absent = not sent
  habitEveningRemindDate?: string; // YYYY-MM-DD date when the evening unchecked-habits reminder was sent; absent = not sent
  intentionMorningRemindDate?: string; // YYYY-MM-DD date when the morning intention-setter reminder was sent; absent = not sent
  weekGoalHistory?: GoalEntry[];   // rolling log of past weekly goals; newest last; capped at 8 entries; absent = no history
  monthGoalHistory?: GoalEntry[];  // rolling log of past monthly goals; newest last; capped at 12 entries; absent = no history
  quarterGoalHistory?: GoalEntry[]; // rolling log of past quarterly goals; newest last; capped at 8 entries; absent = no history
  yearGoalHistory?: GoalEntry[];   // rolling log of past yearly goals; newest last; capped at 5 entries; absent = no history
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
  pinned?: boolean;                     // window always-on-top; absent/false = not pinned
}
