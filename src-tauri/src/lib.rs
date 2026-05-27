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
    template: Option<String>,
    enable_callouts: Option<bool>,
    enable_progress: Option<bool>,
    layout_mode: Option<String>,
    voice: Option<String>,
    #[serde(rename = "contentModel")]
    content_model: Option<String>,
    #[serde(rename = "audioModel")]
    audio_model: Option<String>,
}

#[tauri::command]
fn start_render(
    app: tauri::AppHandle,
    url: Option<String>,
    prompt: Option<String>,
    audio_path: Option<String>,
    script: Option<String>,
    platform: Option<String>,
    gemini_api_key: String,
    pexels_api_key: Option<String>,
    options: Option<RenderOptions>,
) -> Result<(), String> {
    let url = url.unwrap_or_default();
    let prompt = prompt.unwrap_or_default();
    let audio_path = audio_path.unwrap_or_default();
    let script = script.unwrap_or_default();

    if url.trim().is_empty() && prompt.trim().is_empty() && audio_path.trim().is_empty() {
        return Err("Phải cung cấp URL, Prompt hoặc Audio Path".into());
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
        let template = options
            .as_ref()
            .and_then(|o| o.template.as_deref())
            .unwrap_or("NewsStoryV1");
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
        let voice = options
            .as_ref()
            .and_then(|o| o.voice.as_deref())
            .unwrap_or("Zephyr");
        let content_model = options
            .as_ref()
            .and_then(|o| o.content_model.as_deref())
            .unwrap_or("gemini-3.5-flash");
        let audio_model = options
            .as_ref()
            .and_then(|o| o.audio_model.as_deref())
            .unwrap_or("gemini-3.1-flash-tts-preview");

        let mut cmd = Command::new("node");
        cmd.current_dir(&workdir)
            .env("GEMINI_API_KEY", gemini_api_key)
            .arg("./node_modules/.bin/tsx")
            .arg("./worker/index.ts");

        if let Some(ref pexels_key) = pexels_api_key {
            if !pexels_key.trim().is_empty() {
                cmd.env("PEXELS_API_KEY", pexels_key);
                cmd.arg("--pexelsKey").arg(pexels_key);
            }
        }

        if !url.trim().is_empty() {
            cmd.arg("--url").arg(url);
        } else if !prompt.trim().is_empty() {
            cmd.arg("--prompt").arg(prompt);
        } else if !audio_path.trim().is_empty() {
            cmd.arg("--audioPath").arg(audio_path);
            if !script.trim().is_empty() {
                cmd.arg("--script").arg(script);
            }
        }

        if let Some(plat) = platform {
            cmd.arg("--platform").arg(plat);
        }

        cmd.arg("--preset")
            .arg(preset)
            .arg("--template")
            .arg(template)
            .arg("--layoutMode")
            .arg(layout_mode)
            .arg("--enableCallouts")
            .arg(if enable_callouts { "true" } else { "false" })
            .arg("--enableProgress")
            .arg(if enable_progress { "true" } else { "false" })
            .arg("--voice")
            .arg(voice)
            .arg("--contentModel")
            .arg(content_model)
            .arg("--audioModel")
            .arg(audio_model)
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
                if status.success() {
                    let _ = app.emit("render_done", status.code().unwrap_or(0));
                } else {
                    let code = status.code().unwrap_or(-1);
                    let _ = app.emit("render_error", format!("Worker thoat voi ma loi {code}"));
                }
            }
            Err(e) => {
                let _ = app.emit("render_error", format!("Worker lỗi: {e}"));
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    if path.trim().is_empty() {
        return Err("Thiếu path".into());
    }

    let workdir = std::env::current_dir()
        .ok()
        .and_then(|d| d.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    let output_root = workdir.join("output");

    let output_root_canon = std::fs::canonicalize(&output_root).unwrap_or(output_root.clone());
    let file_canon = std::fs::canonicalize(&path).map_err(|e| format!("Không đọc được file: {e}"))?;

    if !file_canon.starts_with(&output_root_canon) {
        return Err("Không được phép truy cập file ngoài output/".into());
    }

    let meta = std::fs::metadata(&file_canon).map_err(|e| format!("Không đọc được file: {e}"))?;
    if meta.len() > 5 * 1024 * 1024 {
        return Err("File quá lớn".into());
    }

    std::fs::read_to_string(&file_canon).map_err(|e| format!("Không đọc được file: {e}"))
}

#[tauri::command]
fn list_output_dirs() -> Result<Vec<String>, String> {
    let workdir = std::env::current_dir()
        .ok()
        .and_then(|d| d.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    let output_root = workdir.join("output");

    if !output_root.exists() || !output_root.is_dir() {
        return Ok(vec![]);
    }

    let mut dirs = vec![];
    let entries = std::fs::read_dir(&output_root).map_err(|e| format!("Không đọc được thư mục: {}", e))?;
    for entry in entries.flatten() {
        if let Ok(meta) = entry.metadata() {
            if meta.is_dir() {
                if let Some(_name) = entry.file_name().to_str() {
                    let path_str = entry.path().to_string_lossy().to_string();
                    dirs.push(path_str);
                }
            }
        }
    }

    // Sort by name descending
    dirs.sort_by(|a, b| b.cmp(a));

    Ok(dirs)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, start_render, read_text_file, list_output_dirs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
