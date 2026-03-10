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
}

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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Habit {
    pub name: String,
    pub streak: u32,
    pub icon: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WidgetData {
    pub projects: Vec<Project>,
    pub habits: Vec<Habit>,
    pub quotes: Vec<String>,
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
            },
        ],
        habits: vec![
            Habit { name: "푸시업".into(), streak: 0, icon: "💪".into() },
            Habit { name: "풀업".into(), streak: 0, icon: "🏋️".into() },
            Habit { name: "폰 사용↓".into(), streak: 0, icon: "📵".into() },
            Habit { name: "포모도로".into(), streak: 0, icon: "🍅".into() },
        ],
        quotes: vec![
            "Design so it cannot fail fatally, then execute.".into(),
            "시스템이 행동을 만든다. 의지력이 아니라.".into(),
            "Ship small, get feedback, adjust.".into(),
            "완벽보다 실행. 실행보다 피드백.".into(),
        ],
    }
}

#[tauri::command]
fn load_data() -> WidgetData {
    let path = get_data_path();
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| default_data()),
        Err(_) => {
            let data = default_data();
            let _ = fs::write(&path, serde_json::to_string_pretty(&data).unwrap());
            data
        }
    }
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
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| default_settings()),
        Err(_) => default_settings(),
    }
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
