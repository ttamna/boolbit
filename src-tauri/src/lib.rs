// ABOUTME: Tauri backend for Vision Widget — data/settings persistence via JSON files
// ABOUTME: Exposes load_data, save_data, load_settings, save_settings commands and tray icon setup
use serde::{Deserialize, Serialize};
use typeshare::typeshare;
use std::fs;
use std::path::PathBuf;

// ─── Settings types ──────────────────────────────────────

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowPosition {
    pub x: i32,
    pub y: i32,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowSize {
    pub width: u32,
    pub height: u32,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WidgetSettings {
    pub position: WindowPosition,
    pub size: WindowSize,
    pub opacity: f64,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(rename = "clockFormat", default = "default_clock_format")]
    pub clock_format: String, // "24h" or "12h"
    #[serde(rename = "githubPat", default, skip_serializing_if = "Option::is_none")]
    pub github_pat: Option<String>,
    #[serde(rename = "githubRefreshInterval", default, skip_serializing_if = "Option::is_none")]
    pub github_refresh_interval: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pinned: Option<bool>,
}

const VALID_THEMES: &[&str] = &["void", "nebula", "forest", "ember", "midnight", "aurora", "rose", "solarized", "solarized-light"];
const VALID_SECTIONS: &[&str] = &["projects", "streaks", "direction", "pomodoro"];
const VALID_MOMENTUM_TIERS: &[&str] = &["high", "mid", "low"];
fn default_theme() -> String { "void".to_string() }
fn default_clock_format() -> String { "24h".to_string() }

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitHubData {
    #[serde(rename = "lastCommitAt", default)]
    pub last_commit_at: String,
    #[serde(rename = "lastCommitMsg", default)]
    pub last_commit_msg: String,
    #[serde(rename = "openIssues", default)]
    pub open_issues: u32,
    #[serde(rename = "openPrs", default)]
    pub open_prs: u32,
    #[serde(rename = "ciStatus", default, skip_serializing_if = "Option::is_none")]
    pub ci_status: Option<String>,
    #[serde(rename = "fetchedAt", default)]
    pub fetched_at: String,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Project {
    pub id: u32,
    pub name: String,
    pub status: String,
    pub goal: String,
    pub progress: u32,
    pub metric: String,
    pub metric_value: String,
    pub metric_target: String,
    #[serde(rename = "githubRepo", default, skip_serializing_if = "Option::is_none")]
    pub github_repo: Option<String>,
    #[serde(rename = "githubData", default, skip_serializing_if = "Option::is_none")]
    pub github_data: Option<GitHubData>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deadline: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(rename = "isFocus", default, skip_serializing_if = "Option::is_none")]
    pub is_focus: Option<bool>,
    #[serde(rename = "pomodoroSessions", default, skip_serializing_if = "Option::is_none")]
    pub pomodoro_sessions: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(rename = "lastFocusDate", default, skip_serializing_if = "Option::is_none")]
    pub last_focus_date: Option<String>,
    #[serde(rename = "completedDate", default, skip_serializing_if = "Option::is_none")]
    pub completed_date: Option<String>,
    #[serde(rename = "createdDate", default, skip_serializing_if = "Option::is_none")]
    pub created_date: Option<String>,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Habit {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub name: String,
    pub streak: u32,
    pub icon: String,
    #[serde(rename = "lastChecked", default, skip_serializing_if = "Option::is_none")]
    pub last_checked: Option<String>,
    #[serde(rename = "targetStreak", default, skip_serializing_if = "Option::is_none")]
    pub target_streak: Option<u32>,
    #[serde(rename = "bestStreak", default, skip_serializing_if = "Option::is_none")]
    pub best_streak: Option<u32>,
    #[serde(rename = "checkHistory", default, skip_serializing_if = "Option::is_none")]
    pub check_history: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PomodoroDay {
    pub date: String,
    pub count: u32,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IntentionEntry {
    pub date: String,
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub done: Option<bool>,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GoalEntry {
    pub date: String,  // period key: "YYYY-Www" (weekly), "YYYY-MM" (monthly), "YYYY-Q1"…"YYYY-Q4" (quarterly), "YYYY" (yearly)
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub done: Option<bool>,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MomentumEntry {
    pub date: String,   // YYYY-MM-DD
    pub score: f64,     // 0.0–100.0 daily momentum score
    pub tier: String,   // "high", "mid", "low"
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PomodoroDurations {
    pub focus: u32,
    #[serde(rename = "break")]
    pub break_mins: u32,
    #[serde(rename = "longBreak", default, skip_serializing_if = "Option::is_none")]
    pub long_break: Option<u32>,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct WidgetData {
    pub projects: Vec<Project>,
    pub habits: Vec<Habit>,
    pub quotes: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "pomodoroDurations")]
    pub pomodoro_durations: Option<PomodoroDurations>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "pomodoroSessionsDate")]
    pub pomodoro_sessions_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "pomodoroSessions")]
    pub pomodoro_sessions: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "pomodoroAutoStart")]
    pub pomodoro_auto_start: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "pomodoroSessionGoal")]
    pub pomodoro_session_goal: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "collapsedSections")]
    pub collapsed_sections: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "quoteInterval")]
    pub quote_interval: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "pomodoroLongBreakInterval")]
    pub pomodoro_long_break_interval: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "pomodoroNotify")]
    pub pomodoro_notify: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "pomodoroHistory")]
    pub pomodoro_history: Option<Vec<PomodoroDay>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "sectionOrder")]
    pub section_order: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "todayIntention")]
    pub today_intention: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "todayIntentionDate")]
    pub today_intention_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "todayIntentionDone")]
    pub today_intention_done: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "intentionHistory")]
    pub intention_history: Option<Vec<IntentionEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "weekGoal")]
    pub week_goal: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "weekGoalDate")]
    pub week_goal_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "weekGoalDone")]
    pub week_goal_done: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "monthGoal")]
    pub month_goal: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "monthGoalDate")]
    pub month_goal_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "monthGoalDone")]
    pub month_goal_done: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "quarterGoal")]
    pub quarter_goal: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "quarterGoalDate")]
    pub quarter_goal_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "quarterGoalDone")]
    pub quarter_goal_done: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "yearGoal")]
    pub year_goal: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "yearGoalDate")]
    pub year_goal_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "yearGoalDone")]
    pub year_goal_done: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "pomodoroLifetimeMins")]
    pub pomodoro_lifetime_mins: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "habitsAllDoneDate")]
    pub habits_all_done_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "weekGoalHistory")]
    pub week_goal_history: Option<Vec<GoalEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "monthGoalHistory")]
    pub month_goal_history: Option<Vec<GoalEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "quarterGoalHistory")]
    pub quarter_goal_history: Option<Vec<GoalEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "yearGoalHistory")]
    pub year_goal_history: Option<Vec<GoalEntry>>,
    #[serde(rename = "momentumHistory", default, skip_serializing_if = "Option::is_none")]
    pub momentum_history: Option<Vec<MomentumEntry>>,
    #[serde(rename = "habitEveningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub habit_evening_remind_date: Option<String>,
    #[serde(rename = "intentionMorningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub intention_morning_remind_date: Option<String>,
    #[serde(rename = "intentionEveningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub intention_evening_remind_date: Option<String>,
    #[serde(rename = "pomodoroMorningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub pomodoro_morning_remind_date: Option<String>,
    #[serde(rename = "pomodoroEveningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub pomodoro_evening_remind_date: Option<String>,
    #[serde(rename = "habitMilestoneApproachDate", default, skip_serializing_if = "Option::is_none")]
    pub habit_milestone_approach_date: Option<String>,
    #[serde(rename = "weeklyReviewRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub weekly_review_remind_date: Option<String>,
    #[serde(rename = "weeklyGoalMorningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub weekly_goal_morning_remind_date: Option<String>,
    #[serde(rename = "monthlyGoalMorningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub monthly_goal_morning_remind_date: Option<String>,
    #[serde(rename = "quarterlyGoalMorningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub quarterly_goal_morning_remind_date: Option<String>,
    #[serde(rename = "weeklyHabitReportDate", default, skip_serializing_if = "Option::is_none")]
    pub weekly_habit_report_date: Option<String>,
    #[serde(rename = "monthGoalRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub month_goal_remind_date: Option<String>,
    #[serde(rename = "quarterGoalRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub quarter_goal_remind_date: Option<String>,
    #[serde(rename = "yearGoalRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub year_goal_remind_date: Option<String>,
    #[serde(rename = "momentumEveningDigestDate", default, skip_serializing_if = "Option::is_none")]
    pub momentum_evening_digest_date: Option<String>,
    #[serde(rename = "weeklyMomentumReportDate", default, skip_serializing_if = "Option::is_none")]
    pub weekly_momentum_report_date: Option<String>,
    #[serde(rename = "weeklyPomodoroReportDate", default, skip_serializing_if = "Option::is_none")]
    pub weekly_pomodoro_report_date: Option<String>,
    #[serde(rename = "weeklyGoalReportDate", default, skip_serializing_if = "Option::is_none")]
    pub weekly_goal_report_date: Option<String>,
    #[serde(rename = "monthlyGoalReportDate", default, skip_serializing_if = "Option::is_none")]
    pub monthly_goal_report_date: Option<String>,
    #[serde(rename = "quarterlyGoalReportDate", default, skip_serializing_if = "Option::is_none")]
    pub quarterly_goal_report_date: Option<String>,
    #[serde(rename = "yearlyGoalReportDate", default, skip_serializing_if = "Option::is_none")]
    pub yearly_goal_report_date: Option<String>,
    #[serde(rename = "habitsSound", default, skip_serializing_if = "Option::is_none")]
    pub habits_sound: Option<bool>,
    #[serde(rename = "pomodoroSound", default, skip_serializing_if = "Option::is_none")]
    pub pomodoro_sound: Option<bool>,
    #[serde(rename = "hiddenSections", default, skip_serializing_if = "Option::is_none")]
    pub hidden_sections: Option<Vec<String>>,
    #[serde(rename = "habitLifetimeTotalCheckins", default, skip_serializing_if = "Option::is_none")]
    pub habit_lifetime_total_checkins: Option<u32>,
    #[serde(rename = "perfectDayBestStreak", default, skip_serializing_if = "Option::is_none")]
    pub perfect_day_best_streak: Option<u32>,
    #[serde(rename = "intentionDoneBestStreak", default, skip_serializing_if = "Option::is_none")]
    pub intention_done_best_streak: Option<u32>,
    #[serde(rename = "focusBestStreak", default, skip_serializing_if = "Option::is_none")]
    pub focus_best_streak: Option<u32>,
    #[serde(rename = "momentumBestStreak", default, skip_serializing_if = "Option::is_none")]
    pub momentum_best_streak: Option<u32>,
    #[serde(rename = "pomodoroGoalBestStreak", default, skip_serializing_if = "Option::is_none")]
    pub pomodoro_goal_best_streak: Option<u32>,
    #[serde(rename = "habitMorningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub habit_morning_remind_date: Option<String>,
    #[serde(rename = "momentumMorningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub momentum_morning_remind_date: Option<String>,
    #[serde(rename = "yearlyGoalMorningRemindDate", default, skip_serializing_if = "Option::is_none")]
    pub yearly_goal_morning_remind_date: Option<String>,
    #[serde(rename = "weeklyIntentionReportDate", default, skip_serializing_if = "Option::is_none")]
    pub weekly_intention_report_date: Option<String>,
    #[serde(rename = "monthlyIntentionReportDate", default, skip_serializing_if = "Option::is_none")]
    pub monthly_intention_report_date: Option<String>,
    #[serde(rename = "quarterlyIntentionReportDate", default, skip_serializing_if = "Option::is_none")]
    pub quarterly_intention_report_date: Option<String>,
    #[serde(rename = "yearlyIntentionReportDate", default, skip_serializing_if = "Option::is_none")]
    pub yearly_intention_report_date: Option<String>,
    #[serde(rename = "monthlyHabitReportDate", default, skip_serializing_if = "Option::is_none")]
    pub monthly_habit_report_date: Option<String>,
    #[serde(rename = "quarterlyHabitReportDate", default, skip_serializing_if = "Option::is_none")]
    pub quarterly_habit_report_date: Option<String>,
    #[serde(rename = "yearlyHabitReportDate", default, skip_serializing_if = "Option::is_none")]
    pub yearly_habit_report_date: Option<String>,
    #[serde(rename = "weeklyPerfectDayReportDate", default, skip_serializing_if = "Option::is_none")]
    pub weekly_perfect_day_report_date: Option<String>,
    #[serde(rename = "monthlyPerfectDayReportDate", default, skip_serializing_if = "Option::is_none")]
    pub monthly_perfect_day_report_date: Option<String>,
    #[serde(rename = "quarterlyPerfectDayReportDate", default, skip_serializing_if = "Option::is_none")]
    pub quarterly_perfect_day_report_date: Option<String>,
    #[serde(rename = "yearlyPerfectDayReportDate", default, skip_serializing_if = "Option::is_none")]
    pub yearly_perfect_day_report_date: Option<String>,
    #[serde(rename = "monthlyMomentumReportDate", default, skip_serializing_if = "Option::is_none")]
    pub monthly_momentum_report_date: Option<String>,
    #[serde(rename = "quarterlyMomentumReportDate", default, skip_serializing_if = "Option::is_none")]
    pub quarterly_momentum_report_date: Option<String>,
    #[serde(rename = "yearlyMomentumReportDate", default, skip_serializing_if = "Option::is_none")]
    pub yearly_momentum_report_date: Option<String>,
    #[serde(rename = "monthlyPomodoroReportDate", default, skip_serializing_if = "Option::is_none")]
    pub monthly_pomodoro_report_date: Option<String>,
    #[serde(rename = "quarterlyPomodoroReportDate", default, skip_serializing_if = "Option::is_none")]
    pub quarterly_pomodoro_report_date: Option<String>,
    #[serde(rename = "yearlyPomodoroReportDate", default, skip_serializing_if = "Option::is_none")]
    pub yearly_pomodoro_report_date: Option<String>,
}

fn get_data_path() -> PathBuf {
    let mut path = dirs_next().unwrap_or_else(|| PathBuf::from("."));
    path.push("vision-widget-data.json");
    path
}

fn get_settings_path() -> PathBuf {
    let mut path = dirs_next().unwrap_or_else(|| PathBuf::from("."));
    path.push("vision-widget-settings.json");
    path
}

fn default_settings() -> WidgetSettings {
    WidgetSettings {
        position: WindowPosition { x: 20, y: 60 },
        size: WindowSize { width: 380, height: 700 },
        opacity: 1.0,
        theme: "void".to_string(),
        clock_format: "24h".to_string(),
        github_pat: None,
        github_refresh_interval: None,
        pinned: None,
    }
}

fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA").ok().map(PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join(".config"))
    }
}

fn default_data() -> WidgetData {
    WidgetData {
        projects: vec![
            Project {
                id: 1,
                name: "PolicyVote".into(),
                status: "active".into(),
                goal: "SEO 100페이지 인덱싱".into(),
                progress: 35,
                metric: "월간 방문자".into(),
                metric_value: "42".into(),
                metric_target: "100".into(),
                ..Default::default()
            },
            Project {
                id: 2,
                name: "TacGear".into(),
                status: "active".into(),
                goal: "플래시라이트 비교 페이지 완성".into(),
                progress: 20,
                metric: "월 수익".into(),
                metric_value: "₩0".into(),
                metric_target: "₩300K".into(),
                ..Default::default()
            },
            Project {
                id: 3,
                name: "CLMS".into(),
                status: "in-progress".into(),
                goal: "Figma 문서 시스템 완성".into(),
                progress: 60,
                metric: "스크린".into(),
                metric_value: "24".into(),
                metric_target: "40".into(),
                ..Default::default()
            },
        ],
        habits: vec![
            Habit { name: "푸시업".into(), icon: "💪".into(), ..Default::default() },
            Habit { name: "풀업".into(), icon: "🏋️".into(), ..Default::default() },
            Habit { name: "폰 사용↓".into(), icon: "📵".into(), ..Default::default() },
            Habit { name: "포모도로".into(), icon: "🍅".into(), ..Default::default() },
        ],
        quotes: vec![
            "Design so it cannot fail fatally, then execute.".into(),
            "시스템이 행동을 만든다. 의지력이 아니라.".into(),
            "Ship small, get feedback, adjust.".into(),
            "완벽보다 실행. 실행보다 피드백.".into(),
        ],
        ..Default::default()
    }
}

#[tauri::command]
fn load_data() -> WidgetData {
    let path = get_data_path();
    let mut data = match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| default_data()),
        Err(_) => {
            let d = default_data();
            let _ = fs::write(&path, serde_json::to_string_pretty(&d).unwrap());
            d
        }
    };
    // Sanitize collapsed_sections: reject unknown section keys to prevent stale values persisting
    if let Some(ref mut sections) = data.collapsed_sections {
        sections.retain(|s| VALID_SECTIONS.contains(&s.as_str()));
        if sections.is_empty() {
            data.collapsed_sections = None;
        }
    }
    // Sanitize section_order: must contain all 4 valid sections exactly once; any other value is discarded
    if let Some(ref order) = data.section_order {
        let all_valid = VALID_SECTIONS.iter().all(|s| order.iter().any(|o| o == s));
        let no_duplicates = {
            let mut seen = std::collections::HashSet::new();
            order.iter().all(|o| seen.insert(o.as_str()))
        };
        let no_unknown = order.iter().all(|o| VALID_SECTIONS.contains(&o.as_str()));
        if !all_valid || !no_duplicates || !no_unknown {
            data.section_order = None;
        }
    }
    // Sanitize pomodoro_session_goal: 0 is not a valid goal (0 means "clear" in the UI)
    if data.pomodoro_session_goal == Some(0) {
        data.pomodoro_session_goal = None;
    }
    // Sanitize pomodoro_history: drop zero-count, dedup by date (keep most-recent count), cap at 35
    // 35-day cap covers full calendar months (28–31 days) — mirrors intentionHistory cap.
    // Sort descending so dedup_by_key retains the first (newest) entry per date.
    // Re-sort ascending for consistent chronological storage.
    if let Some(ref mut history) = data.pomodoro_history {
        history.retain(|d| d.count > 0);
        history.sort_by(|a, b| b.date.cmp(&a.date));
        history.dedup_by_key(|d| d.date.clone());
        history.truncate(35);
        history.sort_by(|a, b| a.date.cmp(&b.date));
        if history.is_empty() {
            data.pomodoro_history = None;
        }
    }
    // Sanitize pomodoro_long_break_interval: values < 2 would trigger long break every session
    if data.pomodoro_long_break_interval.map(|n| n < 2).unwrap_or(false) {
        data.pomodoro_long_break_interval = None;
    }
    // Sanitize pomodoro_lifetime_mins: 0 means no sessions recorded (consistent with other counters)
    if data.pomodoro_lifetime_mins == Some(0) {
        data.pomodoro_lifetime_mins = None;
    }
    // Sanitize habit target_streak and best_streak: 0 is equivalent to "no value" (same as pomodoro_session_goal)
    // Sanitize check_history: deduplicate, sort, and cap at 14 entries to prevent unbounded growth
    for habit in &mut data.habits {
        if habit.target_streak == Some(0) {
            habit.target_streak = None;
        }
        if habit.best_streak == Some(0) {
            habit.best_streak = None;
        }
        if let Some(ref mut history) = habit.check_history {
            history.sort();
            history.dedup();
            if history.len() > 14 {
                let excess = history.len() - 14;
                history.drain(0..excess);
            }
            if history.is_empty() {
                habit.check_history = None;
            }
        }
        if habit.notes.as_deref() == Some("") {
            habit.notes = None;
        }
    }
    // Sanitize today_intention and today_intention_date: empty string is equivalent to absent
    if data.today_intention.as_deref() == Some("") {
        data.today_intention = None;
    }
    // Sanitize today_intention_date: must be YYYY-MM-DD format
    if !data.today_intention_date.as_deref().map(is_valid_ymd).unwrap_or(true) {
        data.today_intention_date = None;
    }
    // Sanitize today_intention_done: clear if intention is absent (done without an intention is meaningless)
    if data.today_intention.is_none() {
        data.today_intention_done = None;
    }
    // Sanitize intention_history: validate dates (YYYY-MM-DD), trim text, drop empties,
    // dedup by date (first text wins — defensive; App ensures no duplicates before saving),
    // drop oldest entries so only the 7 most-recent remain, sort ascending.
    if let Some(ref mut history) = data.intention_history {
        history.retain_mut(|e| {
            e.text = e.text.trim().to_string();
            is_valid_ymd(&e.date) && !e.text.is_empty()
        });
        history.sort_by(|a, b| a.date.cmp(&b.date));
        history.dedup_by_key(|e| e.date.clone()); // consecutive dupes after ascending sort → keeps first text per date
        if history.len() > 7 {
            let excess = history.len() - 7;
            history.drain(0..excess); // drop oldest to keep the 7 most-recent entries
        }
        if history.is_empty() {
            data.intention_history = None;
        }
    }
    // Sanitize week_goal: trim whitespace; empty → None; cap at 200 Unicode chars
    // chars().take(200) avoids truncate(200) panic on multi-byte chars (Korean etc.)
    if let Some(ref mut wg) = data.week_goal {
        *wg = wg.trim().to_string();
        if wg.is_empty() {
            data.week_goal = None;
            data.week_goal_date = None;
        } else if wg.chars().count() > 200 {
            *wg = wg.chars().take(200).collect();
        }
    }
    // Sanitize week_goal_date: must be "YYYY-Www" format (8 chars, e.g. "2026-W11")
    // Extract validity first to avoid borrow conflict when clearing both fields.
    let week_goal_date_valid = data.week_goal_date.as_deref().map(|d| {
        let bytes = d.as_bytes();
        d.len() == 8
            && bytes[..4].iter().all(|&b| b.is_ascii_digit())
            && bytes[4] == b'-'
            && bytes[5] == b'W'
            && bytes[6..8].iter().all(|&b| b.is_ascii_digit())
    }).unwrap_or(true); // None is valid (absence is fine)
    if !week_goal_date_valid {
        data.week_goal = None;
        data.week_goal_date = None;
    }
    // Clear week_goal if week_goal_date is absent; clear orphan week_goal_date if week_goal is absent
    if data.week_goal.is_some() && data.week_goal_date.is_none() {
        data.week_goal = None;
    }
    if data.week_goal_date.is_some() && data.week_goal.is_none() {
        data.week_goal_date = None;
    }
    // Clear week_goal_done if week_goal is absent (done without a goal is meaningless)
    if data.week_goal.is_none() {
        data.week_goal_done = None;
    }
    // Sanitize month_goal: trim whitespace; empty → None; cap at 200 Unicode chars
    if let Some(ref mut mg) = data.month_goal {
        *mg = mg.trim().to_string();
        if mg.is_empty() {
            data.month_goal = None;
            data.month_goal_date = None;
        } else if mg.chars().count() > 200 {
            *mg = mg.chars().take(200).collect();
        }
    }
    // Sanitize month_goal_date: must be "YYYY-MM" format (7 chars) with month in 01–12
    let month_goal_date_valid = data.month_goal_date.as_deref().map(|d| {
        let bytes = d.as_bytes();
        if d.len() != 7 { return false; }
        if !bytes[0..4].iter().all(|&b| b.is_ascii_digit()) { return false; }
        if bytes[4] != b'-' { return false; }
        // Month must be 01–12: first digit 0 or 1; if 0 → second 1–9; if 1 → second 0–2
        let m0 = bytes[5];
        let m1 = bytes[6];
        matches!((m0, m1),
            (b'0', b'1'..=b'9') | (b'1', b'0'..=b'2')
        )
    }).unwrap_or(true);
    if !month_goal_date_valid {
        data.month_goal = None;
        data.month_goal_date = None;
    }
    // Clear orphan month_goal/month_goal_date when partner field is absent
    if data.month_goal.is_some() && data.month_goal_date.is_none() {
        data.month_goal = None;
    }
    if data.month_goal_date.is_some() && data.month_goal.is_none() {
        data.month_goal_date = None;
    }
    // Clear month_goal_done if month_goal is absent
    if data.month_goal.is_none() {
        data.month_goal_done = None;
    }
    // Sanitize quarter_goal: trim whitespace; empty → None; cap at 200 Unicode chars
    if let Some(ref mut qg) = data.quarter_goal {
        *qg = qg.trim().to_string();
        if qg.is_empty() {
            data.quarter_goal = None;
            data.quarter_goal_date = None;
        } else if qg.chars().count() > 200 {
            *qg = qg.chars().take(200).collect();
        }
    }
    // Sanitize quarter_goal_date: must be "YYYY-Q1"…"YYYY-Q4" format (7 chars)
    let quarter_goal_date_valid = data.quarter_goal_date.as_deref().map(|d| {
        let bytes = d.as_bytes();
        bytes.len() == 7
            && bytes[..4].iter().all(|&b| b.is_ascii_digit())
            && bytes[4] == b'-'
            && bytes[5] == b'Q'
            && bytes[6] >= b'1'
            && bytes[6] <= b'4'
    }).unwrap_or(true);
    if !quarter_goal_date_valid {
        data.quarter_goal = None;
        data.quarter_goal_date = None;
    }
    // Clear orphan quarter_goal/quarter_goal_date when partner field is absent
    if data.quarter_goal.is_some() && data.quarter_goal_date.is_none() {
        data.quarter_goal = None;
    }
    if data.quarter_goal_date.is_some() && data.quarter_goal.is_none() {
        data.quarter_goal_date = None;
    }
    // Clear quarter_goal_done if quarter_goal is absent
    if data.quarter_goal.is_none() {
        data.quarter_goal_done = None;
    }
    // Sanitize year_goal: trim whitespace; empty → None; cap at 200 Unicode chars
    if let Some(ref mut yg) = data.year_goal {
        *yg = yg.trim().to_string();
        if yg.is_empty() {
            data.year_goal = None;
            data.year_goal_date = None;
        } else if yg.chars().count() > 200 {
            *yg = yg.chars().take(200).collect();
        }
    }
    // Sanitize year_goal_date: must be "YYYY" format (4 digits, e.g. "2026")
    let year_goal_date_valid = data.year_goal_date.as_deref().map(|d| {
        d.len() == 4 && d.bytes().all(|b| b.is_ascii_digit())
    }).unwrap_or(true);
    if !year_goal_date_valid {
        data.year_goal = None;
        data.year_goal_date = None;
    }
    // Clear orphan year_goal/year_goal_date when partner field is absent
    if data.year_goal.is_some() && data.year_goal_date.is_none() {
        data.year_goal = None;
    }
    if data.year_goal_date.is_some() && data.year_goal.is_none() {
        data.year_goal_date = None;
    }
    // Clear year_goal_done if year_goal is absent
    if data.year_goal.is_none() {
        data.year_goal_done = None;
    }
    // Sanitize week_goal_history: validate date format ("YYYY-Www", 8 chars), trim text, drop empties,
    // dedup by date (first text wins — defensive; App ensures no duplicates before saving),
    // drop oldest entries so only the 8 most-recent remain, sort ascending.
    if let Some(ref mut history) = data.week_goal_history {
        history.retain_mut(|e| {
            e.text = e.text.trim().to_string();
            let b = e.date.as_bytes();
            let digits_ok = e.date.len() == 8
                && b[..4].iter().all(|&x| x.is_ascii_digit())
                && b[4] == b'-'
                && b[5] == b'W'
                && b[6].is_ascii_digit()
                && b[7].is_ascii_digit();
            // Week number must be in 01–53
            let wn = if digits_ok { (b[6] - b'0') as u16 * 10 + (b[7] - b'0') as u16 } else { 0 };
            let valid_date = digits_ok && wn >= 1 && wn <= 53;
            valid_date && !e.text.is_empty()
        });
        history.sort_by(|a, b| a.date.cmp(&b.date));
        history.dedup_by_key(|e| e.date.clone()); // consecutive dupes after ascending sort → keeps first text per date
        if history.len() > 8 {
            let excess = history.len() - 8;
            history.drain(0..excess);
        }
        if history.is_empty() {
            data.week_goal_history = None;
        }
    }
    // Sanitize month_goal_history: validate date format ("YYYY-MM", 7 chars), trim text, drop empties,
    // dedup by date, drop oldest so only 12 most-recent remain, sort ascending.
    if let Some(ref mut history) = data.month_goal_history {
        history.retain_mut(|e| {
            e.text = e.text.trim().to_string();
            let b = e.date.as_bytes();
            let valid_date = e.date.len() == 7
                && b[..4].iter().all(|&x| x.is_ascii_digit())
                && b[4] == b'-'
                && b[5].is_ascii_digit()
                && b[6].is_ascii_digit()
                && { let m = (b[5] - b'0') as u8 * 10 + (b[6] - b'0') as u8; m >= 1 && m <= 12 };
            valid_date && !e.text.is_empty()
        });
        history.sort_by(|a, b| a.date.cmp(&b.date));
        history.dedup_by_key(|e| e.date.clone());
        if history.len() > 12 {
            let excess = history.len() - 12;
            history.drain(0..excess);
        }
        if history.is_empty() {
            data.month_goal_history = None;
        }
    }
    // Sanitize quarter_goal_history: validate date format ("YYYY-Q1"…"YYYY-Q4", 7 chars), trim text,
    // drop empties, dedup by date, cap at 8 most-recent, sort ascending.
    if let Some(ref mut history) = data.quarter_goal_history {
        history.retain_mut(|e| {
            e.text = e.text.trim().to_string();
            let b = e.date.as_bytes();
            let valid_date = e.date.len() == 7
                && b[..4].iter().all(|&x| x.is_ascii_digit())
                && b[4] == b'-'
                && b[5] == b'Q'
                && matches!(b[6], b'1'..=b'4');
            valid_date && !e.text.is_empty()
        });
        history.sort_by(|a, b| a.date.cmp(&b.date));
        history.dedup_by_key(|e| e.date.clone());
        if history.len() > 8 {
            let excess = history.len() - 8;
            history.drain(0..excess);
        }
        if history.is_empty() {
            data.quarter_goal_history = None;
        }
    }
    // Sanitize year_goal_history: validate date format ("YYYY", 4 chars), trim text,
    // drop empties, dedup by date, cap at 5 most-recent, sort ascending.
    if let Some(ref mut history) = data.year_goal_history {
        history.retain_mut(|e| {
            e.text = e.text.trim().to_string();
            let valid_date = e.date.len() == 4 && e.date.as_bytes().iter().all(|&x| x.is_ascii_digit());
            valid_date && !e.text.is_empty()
        });
        history.sort_by(|a, b| a.date.cmp(&b.date));
        history.dedup_by_key(|e| e.date.clone());
        if history.len() > 5 {
            let excess = history.len() - 5;
            history.drain(0..excess);
        }
        if history.is_empty() {
            data.year_goal_history = None;
        }
    }
    // Sanitize project fields: remove empty strings; normalize is_focus(false) → absent
    for project in &mut data.projects {
        if project.deadline.as_deref() == Some("") {
            project.deadline = None;
        }
        if project.notes.as_deref() == Some("") {
            project.notes = None;
        }
        // is_focus: false is equivalent to absent (absent = not focused)
        if project.is_focus == Some(false) {
            project.is_focus = None;
        }
        // pomodoro_sessions: clamp to [0, 10000] to guard against corrupt JSON
        if let Some(n) = project.pomodoro_sessions {
            project.pomodoro_sessions = Some(n.min(10000));
        }
        // url: trim whitespace; empty after trim → None
        project.url = project.url.as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from);
        // last_focus_date: must be strict YYYY-MM-DD format; any other value → None
        project.last_focus_date = project.last_focus_date.as_deref()
            .filter(|s| is_valid_ymd(s)).map(String::from);
        // completed_date: must be strict YYYY-MM-DD format; any other value → None
        project.completed_date = project.completed_date.as_deref()
            .filter(|s| is_valid_ymd(s)).map(String::from);
        // created_date: must be strict YYYY-MM-DD format; any other value → None
        project.created_date = project.created_date.as_deref()
            .filter(|s| is_valid_ymd(s)).map(String::from);
    }
    // Sanitize all date guard fields: clear any value that doesn't match YYYY-MM-DD
    sanitize_date(&mut data.habits_all_done_date);
    sanitize_date(&mut data.habit_morning_remind_date);
    sanitize_date(&mut data.habit_evening_remind_date);
    sanitize_date(&mut data.habit_milestone_approach_date);
    sanitize_date(&mut data.intention_morning_remind_date);
    sanitize_date(&mut data.intention_evening_remind_date);
    sanitize_date(&mut data.pomodoro_morning_remind_date);
    sanitize_date(&mut data.pomodoro_evening_remind_date);
    sanitize_date(&mut data.momentum_morning_remind_date);
    sanitize_date(&mut data.momentum_evening_digest_date);
    sanitize_date(&mut data.weekly_review_remind_date);
    sanitize_date(&mut data.weekly_goal_morning_remind_date);
    sanitize_date(&mut data.monthly_goal_morning_remind_date);
    sanitize_date(&mut data.quarterly_goal_morning_remind_date);
    sanitize_date(&mut data.yearly_goal_morning_remind_date);
    sanitize_date(&mut data.month_goal_remind_date);
    sanitize_date(&mut data.quarter_goal_remind_date);
    sanitize_date(&mut data.year_goal_remind_date);
    sanitize_date(&mut data.weekly_habit_report_date);
    sanitize_date(&mut data.monthly_habit_report_date);
    sanitize_date(&mut data.quarterly_habit_report_date);
    sanitize_date(&mut data.yearly_habit_report_date);
    sanitize_date(&mut data.weekly_perfect_day_report_date);
    sanitize_date(&mut data.monthly_perfect_day_report_date);
    sanitize_date(&mut data.quarterly_perfect_day_report_date);
    sanitize_date(&mut data.yearly_perfect_day_report_date);
    sanitize_date(&mut data.weekly_intention_report_date);
    sanitize_date(&mut data.monthly_intention_report_date);
    sanitize_date(&mut data.quarterly_intention_report_date);
    sanitize_date(&mut data.yearly_intention_report_date);
    sanitize_date(&mut data.weekly_momentum_report_date);
    sanitize_date(&mut data.monthly_momentum_report_date);
    sanitize_date(&mut data.quarterly_momentum_report_date);
    sanitize_date(&mut data.yearly_momentum_report_date);
    sanitize_date(&mut data.weekly_pomodoro_report_date);
    sanitize_date(&mut data.monthly_pomodoro_report_date);
    sanitize_date(&mut data.quarterly_pomodoro_report_date);
    sanitize_date(&mut data.yearly_pomodoro_report_date);
    sanitize_date(&mut data.weekly_goal_report_date);
    sanitize_date(&mut data.monthly_goal_report_date);
    sanitize_date(&mut data.quarterly_goal_report_date);
    sanitize_date(&mut data.yearly_goal_report_date);
    // Sanitize hidden_sections: reject unknown section keys (same as collapsed_sections)
    if let Some(ref mut sections) = data.hidden_sections {
        sections.retain(|s| VALID_SECTIONS.contains(&s.as_str()));
        if sections.is_empty() {
            data.hidden_sections = None;
        }
    }
    // Sanitize momentum_history: validate dates, guard NaN, clamp score 0–100, validate tier,
    // sort desc → dedup by date (keeps newest per date) → truncate to 7 → sort asc.
    if let Some(ref mut history) = data.momentum_history {
        history.retain_mut(|e| {
            let valid_tier = VALID_MOMENTUM_TIERS.contains(&e.tier.as_str());
            if !e.score.is_nan() && is_valid_ymd(&e.date) && valid_tier {
                e.score = e.score.clamp(0.0, 100.0);
                true
            } else {
                false
            }
        });
        history.sort_by(|a, b| b.date.cmp(&a.date)); // desc: newest entry wins on dedup
        history.dedup_by_key(|e| e.date.clone());
        history.truncate(7);
        history.sort_by(|a, b| a.date.cmp(&b.date)); // restore chronological asc order
        if history.is_empty() {
            data.momentum_history = None;
        }
    }
    data
}

/// Sanitizes an optional date field in place: clears it if it doesn't match YYYY-MM-DD format.
fn sanitize_date(field: &mut Option<String>) {
    *field = field.as_deref().filter(|s| is_valid_ymd(s)).map(String::from);
}

/// Returns true for strings strictly matching YYYY-MM-DD format with valid month (01–12) and day (01–31) ranges.
fn is_valid_ymd(s: &str) -> bool {
    let b = s.as_bytes();
    if s.len() != 10 || b[4] != b'-' || b[7] != b'-' {
        return false;
    }
    // Year, month, and day positions must all be ASCII digits
    if !b[0..4].iter().all(|&x| x.is_ascii_digit())
        || !b[5..7].iter().all(|&x| x.is_ascii_digit())
        || !b[8..10].iter().all(|&x| x.is_ascii_digit()) {
        return false;
    }
    let month = (b[5] - b'0') as u16 * 10 + (b[6] - b'0') as u16;
    let day   = (b[8] - b'0') as u16 * 10 + (b[9] - b'0') as u16;
    (1..=12).contains(&month) && (1..=31).contains(&day)
}

#[tauri::command]
fn save_data(data: WidgetData) -> Result<(), String> {
    let path = get_data_path();
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_settings() -> WidgetSettings {
    let path = get_settings_path();
    let mut s = match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| default_settings()),
        Err(_) => default_settings(),
    };
    // Sanitize theme: reject unknown values that could arrive from corrupted files
    if !VALID_THEMES.contains(&s.theme.as_str()) {
        s.theme = default_theme();
    }
    // Sanitize clock_format: only "24h" or "12h" are valid
    if s.clock_format != "12h" && s.clock_format != "24h" {
        s.clock_format = default_clock_format();
    }
    s
}

#[tauri::command]
fn save_settings(settings: WidgetSettings) -> Result<(), String> {
    let path = get_settings_path();
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![load_data, save_data, load_settings, save_settings])
        .setup(|app| {
            use tauri::Manager;
            setup_tray(app)?;
            // Hide to tray instead of closing when X is pressed
            let handle = app.handle().clone();
            if let Some(win) = handle.get_webview_window("main") {
                win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(w) = handle.get_webview_window("main") {
                            w.hide().unwrap_or(());
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
        Manager,
    };

    let show = MenuItem::with_id(app, "show", "표시/숨김", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let visible = win.is_visible().unwrap_or(false);
                    if visible { let _ = win.hide(); } else { let _ = win.show(); let _ = win.set_focus(); }
                }
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
                    let visible = win.is_visible().unwrap_or(false);
                    if visible { let _ = win.hide(); } else { let _ = win.show(); let _ = win.set_focus(); }
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
