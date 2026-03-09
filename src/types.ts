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
}

export interface WidgetData {
  projects: Project[];
  habits: Habit[];
  quotes: string[];
}
