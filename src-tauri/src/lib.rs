use serde::Deserialize;
use tauri::Emitter;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Debug, Clone, Deserialize)]
struct RenderOptions {
    preset: Option<String>,
    enable_callouts: Option<bool>,
    enable_progress: Option<bool>,
    layout_mode: Option<String>,
}

#[tauri::command]
fn start_render(
    app: tauri::AppHandle,
    url: String,
    gemini_api_key: String,
    options: Option<RenderOptions>,
) -> Result<(), String> {
    if url.trim().is_empty() {
        return Err("URL trống".into());
    }
    if gemini_api_key.trim().is_empty() {
        return Err("Thiếu GEMINI_API_KEY".into());
    }

    tauri::async_runtime::spawn(async move {
        use std::io::{BufRead, BufReader};
        use std::process::{Command, Stdio};

        let workdir = std::env::current_dir()
            .ok()
            .and_then(|d| d.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

        let preset = options
            .as_ref()
            .and_then(|o| o.preset.as_deref())
            .unwrap_or("deep_explainer");
        let layout_mode = options
            .as_ref()
            .and_then(|o| o.layout_mode.as_deref())
            .unwrap_or("tri");
        let enable_callouts = options
            .as_ref()
            .and_then(|o| o.enable_callouts)
            .unwrap_or(true);
        let enable_progress = options
            .as_ref()
            .and_then(|o| o.enable_progress)
            .unwrap_or(true);

        let mut cmd = Command::new("node");
        cmd.current_dir(&workdir)
            .env("GEMINI_API_KEY", gemini_api_key)
            .arg("./node_modules/.bin/tsx")
            .arg("./worker/index.ts")
            .arg("--url")
            .arg(url)
            .arg("--preset")
            .arg(preset)
            .arg("--layoutMode")
            .arg(layout_mode)
            .arg("--enableCallouts")
            .arg(if enable_callouts { "true" } else { "false" })
            .arg("--enableProgress")
            .arg(if enable_progress { "true" } else { "false" })
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit("render_error", format!("Không chạy được worker: {e}"));
                return;
            }
        };

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                let _ = app.emit("render_log", line);
            }
        }

        if let Some(stderr) = child.stderr.take() {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                let _ = app.emit("render_log", line);
            }
        }

        match child.wait() {
            Ok(status) => {
                let _ = app.emit("render_done", status.code().unwrap_or(-1));
            }
            Err(e) => {
                let _ = app.emit("render_error", format!("Worker lỗi: {e}"));
            }
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, start_render])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
