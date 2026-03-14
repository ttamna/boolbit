// ABOUTME: Tauri backend for Vision Widget — data/settings persistence via JSON files
// ABOUTME: Exposes load_data, save_data, load_settings, save_settings commands and tray icon setup
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ─── Settings types ──────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowSize {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WidgetSettings {
    pub position: WindowPosition,
    pub size: WindowSize,
    pub opacity: f64,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_clock_format")]
    pub clock_format: String, // "24h" or "12h"
    #[serde(rename = "githubPat", default, skip_serializing_if = "Option::is_none")]
    pub github_pat: Option<String>,
    #[serde(rename = "githubRefreshInterval", default, skip_serializing_if = "Option::is_none")]
    pub github_refresh_interval: Option<u32>,
}

const VALID_THEMES: &[&str] = &["void", "nebula", "forest", "ember", "midnight", "aurora", "rose"];
const VALID_SECTIONS: &[&str] = &["projects", "streaks", "direction", "pomodoro"];
fn default_theme() -> String { "void".to_string() }
fn default_clock_format() -> String { "24h".to_string() }

#[derive(Debug, Serialize, Deserialize, Clone)]
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
    pub github_data: Option<serde_json::Value>,
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PomodoroDay {
    pub date: String,
    pub count: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IntentionEntry {
    pub date: String,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PomodoroDurations {
    pub focus: u32,
    #[serde(rename = "break")]
    pub break_mins: u32,
    #[serde(rename = "longBreak", default, skip_serializing_if = "Option::is_none")]
    pub long_break: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
    #[serde(rename = "intentionHistory")]
    pub intention_history: Option<Vec<IntentionEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "weekGoal")]
    pub week_goal: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "weekGoalDate")]
    pub week_goal_date: Option<String>,
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
                github_repo: None,
                github_data: None,
                deadline: None,
                notes: None,
                is_focus: None,
                pomodoro_sessions: None,
                url: None,
                last_focus_date: None,
                completed_date: None,
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
                github_repo: None,
                github_data: None,
                deadline: None,
                notes: None,
                is_focus: None,
                pomodoro_sessions: None,
                url: None,
                last_focus_date: None,
                completed_date: None,
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
                github_repo: None,
                github_data: None,
                deadline: None,
                notes: None,
                is_focus: None,
                pomodoro_sessions: None,
                url: None,
                last_focus_date: None,
                completed_date: None,
            },
        ],
        habits: vec![
            Habit { id: None, name: "푸시업".into(), streak: 0, icon: "💪".into(), last_checked: None, target_streak: None, best_streak: None, check_history: None, notes: None },
            Habit { id: None, name: "풀업".into(), streak: 0, icon: "🏋️".into(), last_checked: None, target_streak: None, best_streak: None, check_history: None, notes: None },
            Habit { id: None, name: "폰 사용↓".into(), streak: 0, icon: "📵".into(), last_checked: None, target_streak: None, best_streak: None, check_history: None, notes: None },
            Habit { id: None, name: "포모도로".into(), streak: 0, icon: "🍅".into(), last_checked: None, target_streak: None, best_streak: None, check_history: None, notes: None },
        ],
        quotes: vec![
            "Design so it cannot fail fatally, then execute.".into(),
            "시스템이 행동을 만든다. 의지력이 아니라.".into(),
            "Ship small, get feedback, adjust.".into(),
            "완벽보다 실행. 실행보다 피드백.".into(),
        ],
        pomodoro_durations: None,
        pomodoro_sessions_date: None,
        pomodoro_sessions: None,
        pomodoro_auto_start: None,
        pomodoro_session_goal: None,
        collapsed_sections: None,
        quote_interval: None,
        pomodoro_long_break_interval: None,
        pomodoro_notify: None,
        pomodoro_history: None,
        section_order: None,
        today_intention: None,
        today_intention_date: None,
        intention_history: None,
        week_goal: None,
        week_goal_date: None,
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
    // Sanitize pomodoro_history: drop zero-count, dedup by date (keep most-recent count), cap at 14
    // Sort descending so dedup_by_key retains the first (newest) entry per date.
    // Re-sort ascending for consistent chronological storage.
    if let Some(ref mut history) = data.pomodoro_history {
        history.retain(|d| d.count > 0);
        history.sort_by(|a, b| b.date.cmp(&a.date));
        history.dedup_by_key(|d| d.date.clone());
        history.truncate(14);
        history.sort_by(|a, b| a.date.cmp(&b.date));
        if history.is_empty() {
            data.pomodoro_history = None;
        }
    }
    // Sanitize pomodoro_long_break_interval: values < 2 would trigger long break every session
    if data.pomodoro_long_break_interval.map(|n| n < 2).unwrap_or(false) {
        data.pomodoro_long_break_interval = None;
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
    // Sanitize today_intention_date: must be YYYY-MM-DD format (length 10, digit/dash chars, hyphens at positions 4 and 7)
    match &data.today_intention_date {
        Some(d) => {
            let bytes = d.as_bytes();
            let valid = d.len() == 10
                && bytes.iter().all(|&b| b.is_ascii_digit() || b == b'-')
                && bytes[4] == b'-'
                && bytes[7] == b'-';
            if !valid {
                data.today_intention_date = None;
            }
        }
        None => {}
    }
    // Sanitize intention_history: validate dates (YYYY-MM-DD), trim text, drop empties,
    // dedup by date (first text wins — defensive; App ensures no duplicates before saving),
    // drop oldest entries so only the 7 most-recent remain, sort ascending.
    if let Some(ref mut history) = data.intention_history {
        history.retain_mut(|e| {
            e.text = e.text.trim().to_string();
            let b = e.date.as_bytes();
            let valid_date = e.date.len() == 10
                && b.iter().all(|&x| x.is_ascii_digit() || x == b'-')
                && b[4] == b'-'
                && b[7] == b'-';
            valid_date && !e.text.is_empty()
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
            .filter(|s| {
                let b = s.as_bytes();
                s.len() == 10
                    && b.iter().all(|&x| x.is_ascii_digit() || x == b'-')
                    && b[4] == b'-'
                    && b[7] == b'-'
            })
            .map(String::from);
        // completed_date: must be strict YYYY-MM-DD format; any other value → None
        project.completed_date = project.completed_date.as_deref()
            .filter(|s| {
                let b = s.as_bytes();
                s.len() == 10
                    && b.iter().all(|&x| x.is_ascii_digit() || x == b'-')
                    && b[4] == b'-'
                    && b[7] == b'-'
            })
            .map(String::from);
    }
    data
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
