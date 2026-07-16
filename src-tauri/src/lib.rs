use serde::Deserialize;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

struct JobHandles {
    render_pid: Mutex<Option<u32>>,
    dub_pid: Mutex<Option<u32>>,
}

fn project_root() -> PathBuf {
    if let Ok(root) = std::env::var("CLIPNEWS_ROOT") {
        let p = PathBuf::from(root);
        if p.is_dir() {
            return p;
        }
    }

    let from_manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(parent) = from_manifest.parent() {
        if parent.join("worker").join("index.ts").exists() {
            return parent.to_path_buf();
        }
    }

    std::env::current_dir()
        .ok()
        .and_then(|d| {
            if d.join("worker").join("index.ts").exists() {
                Some(d)
            } else {
                d.parent().map(|p| p.to_path_buf())
            }
        })
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default())
}

fn tsx_entry(workdir: &PathBuf) -> PathBuf {
    workdir.join("node_modules").join("tsx").join("dist").join("cli.mjs")
}

fn kill_pid(pid: u32) -> Result<(), String> {
    #[cfg(windows)]
    {
        let status = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .status()
            .map_err(|e| format!("taskkill failed: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("taskkill exited with {:?}", status.code()))
        }
    }
    #[cfg(not(windows))]
    {
        let status = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .status()
            .map_err(|e| format!("kill failed: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            // Fallback hard kill
            let _ = Command::new("kill")
                .args(["-KILL", &pid.to_string()])
                .status();
            Ok(())
        }
    }
}

fn pipe_lines(app: AppHandle, event_name: &'static str, pipe: impl std::io::Read + Send + 'static) {
    thread::spawn(move || {
        let reader = BufReader::new(pipe);
        for line in reader.lines().flatten() {
            let _ = app.emit(event_name, line);
        }
    });
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
    app: AppHandle,
    jobs: State<'_, Arc<JobHandles>>,
    url: Option<String>,
    prompt: Option<String>,
    audio_path: Option<String>,
    script: Option<String>,
    platform: Option<String>,
    gemini_api_key: String,
    pexels_api_key: Option<String>,
    options: Option<RenderOptions>,
    stage: Option<String>,
    project_dir: Option<String>,
    plan_file: Option<String>,
) -> Result<(), String> {
    let url = url.unwrap_or_default();
    let prompt = prompt.unwrap_or_default();
    let audio_path = audio_path.unwrap_or_default();
    let script = script.unwrap_or_default();
    let stage = stage.unwrap_or_else(|| "full".to_string());
    let is_render_only = stage == "render";

    if !is_render_only
        && url.trim().is_empty()
        && prompt.trim().is_empty()
        && audio_path.trim().is_empty()
    {
        return Err("Provide a URL, prompt, or audio path".into());
    }
    if is_render_only {
        let has_project = project_dir
            .as_ref()
            .map(|p| !p.trim().is_empty())
            .unwrap_or(false);
        let has_plan = plan_file
            .as_ref()
            .map(|p| !p.trim().is_empty())
            .unwrap_or(false);
        if !has_project && !has_plan {
            return Err("stage=render requires project_dir or plan_file".into());
        }
    }
    if gemini_api_key.trim().is_empty() {
        return Err("Missing GEMINI_API_KEY".into());
    }

    {
        let guard = jobs
            .render_pid
            .lock()
            .map_err(|_| "Job lock poisoned".to_string())?;
        if guard.is_some() {
            return Err("A render job is already running. Cancel it first.".into());
        }
    }

    let jobs_arc = jobs.inner().clone();
    tauri::async_runtime::spawn(async move {
        let workdir = project_root();
        let tsx = tsx_entry(&workdir);

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
            .env("GEMINI_API_KEY", &gemini_api_key)
            .arg(&tsx)
            .arg("./worker/index.ts");

        if let Some(ref pexels_key) = pexels_api_key {
            if !pexels_key.trim().is_empty() {
                cmd.env("PEXELS_API_KEY", pexels_key);
                cmd.arg("--pexelsKey").arg(pexels_key);
            }
        }

        cmd.arg("--stage").arg(&stage);

        if let Some(ref pd) = project_dir {
            if !pd.trim().is_empty() {
                if let Err(msg) = assert_under_output(&workdir, pd) {
                    let _ = app.emit("render_error", msg);
                    return;
                }
                cmd.arg("--projectDir").arg(pd);
            }
        }
        if let Some(ref pf) = plan_file {
            if !pf.trim().is_empty() {
                if let Err(msg) = assert_under_output(&workdir, pf) {
                    let _ = app.emit("render_error", msg);
                    return;
                }
                cmd.arg("--planFile").arg(pf);
            }
        }

        if !url.trim().is_empty() {
            cmd.arg("--url").arg(&url);
        } else if !prompt.trim().is_empty() {
            cmd.arg("--prompt").arg(&prompt);
        } else if !audio_path.trim().is_empty() {
            cmd.arg("--audioPath").arg(&audio_path);
            if !script.trim().is_empty() {
                cmd.arg("--script").arg(&script);
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
                let _ = app.emit(
                    "render_error",
                    format!("Failed to start worker (is Node installed?): {e}"),
                );
                return;
            }
        };

        let pid = child.id();
        if let Ok(mut g) = jobs_arc.render_pid.lock() {
            *g = Some(pid);
        }

        if let Some(stdout) = child.stdout.take() {
            pipe_lines(app.clone(), "render_log", stdout);
        }
        if let Some(stderr) = child.stderr.take() {
            pipe_lines(app.clone(), "render_log", stderr);
        }

        let status = child.wait();
        if let Ok(mut g) = jobs_arc.render_pid.lock() {
            *g = None;
        }

        match status {
            Ok(st) if st.success() => {
                let _ = app.emit("render_done", st.code().unwrap_or(0));
            }
            Ok(st) => {
                let code = st.code().unwrap_or(-1);
                let _ = app.emit("render_error", format!("Worker exited with code {code}"));
            }
            Err(e) => {
                let _ = app.emit("render_error", format!("Worker error: {e}"));
            }
        }
    });

    Ok(())
}

fn assert_under_output(workdir: &PathBuf, path: &str) -> Result<(), String> {
    let output_root = workdir.join("output");
    let output_root_canon = std::fs::canonicalize(&output_root).unwrap_or(output_root.clone());
    let candidate = PathBuf::from(path);
    let file_canon = if candidate.exists() {
        std::fs::canonicalize(&candidate).unwrap_or(candidate)
    } else {
        // Allow non-existent plan paths only if they clearly sit under output/
        let joined = if candidate.is_absolute() {
            candidate
        } else {
            workdir.join(&candidate)
        };
        if joined.starts_with(&output_root) || joined.starts_with(&output_root_canon) {
            return Ok(());
        }
        return Err("Access denied outside output/".into());
    };
    if !file_canon.starts_with(&output_root_canon) {
        return Err("Access denied outside output/".into());
    }
    Ok(())
}

#[tauri::command]
fn copy_scene_asset(
    project_dir: String,
    scene_id: String,
    source_path: String,
) -> Result<String, String> {
    if project_dir.trim().is_empty() || scene_id.trim().is_empty() || source_path.trim().is_empty() {
        return Err("Missing project_dir, scene_id, or source_path".into());
    }
    let workdir = project_root();
    assert_under_output(&workdir, &project_dir)?;

    let src = PathBuf::from(&source_path);
    if !src.is_file() {
        return Err("Source file not found".into());
    }

    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin")
        .to_lowercase();
    let safe_id: String = scene_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();

    let dest_dir = PathBuf::from(&project_dir).join("user_assets");
    std::fs::create_dir_all(&dest_dir).map_err(|e| format!("Cannot create user_assets: {e}"))?;
    let dest = dest_dir.join(format!("{safe_id}.{ext}"));
    std::fs::copy(&src, &dest).map_err(|e| format!("Copy failed: {e}"))?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
fn write_plan_json(project_dir: String, plan_json: String) -> Result<(), String> {
    if project_dir.trim().is_empty() {
        return Err("Missing project_dir".into());
    }
    let workdir = project_root();
    assert_under_output(&workdir, &project_dir)?;

    // Validate JSON
    let _: serde_json::Value =
        serde_json::from_str(&plan_json).map_err(|e| format!("Invalid plan JSON: {e}"))?;

    let plan_dir = PathBuf::from(&project_dir).join("plan");
    std::fs::create_dir_all(&plan_dir).map_err(|e| format!("Cannot create plan dir: {e}"))?;
    let plan_path = plan_dir.join("video_plan.json");
    std::fs::write(&plan_path, plan_json).map_err(|e| format!("Cannot write plan: {e}"))?;
    Ok(())
}

#[tauri::command]
fn clear_scene_asset(project_dir: String, scene_id: String) -> Result<(), String> {
    if project_dir.trim().is_empty() || scene_id.trim().is_empty() {
        return Err("Missing project_dir or scene_id".into());
    }
    let workdir = project_root();
    assert_under_output(&workdir, &project_dir)?;

    let user_assets = PathBuf::from(&project_dir).join("user_assets");
    if !user_assets.is_dir() {
        return Ok(());
    }
    let safe_id: String = scene_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let entries = std::fs::read_dir(&user_assets).map_err(|e| format!("Cannot read user_assets: {e}"))?;
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if name_str.starts_with(&format!("{safe_id}.")) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
    Ok(())
}

/// Delete cached TTS wavs so the next render regenerates voiceover from the plan script.
#[tauri::command]
fn clear_tts_cache(project_dir: String) -> Result<(), String> {
    if project_dir.trim().is_empty() {
        return Err("Missing project_dir".into());
    }
    let workdir = project_root();
    assert_under_output(&workdir, &project_dir)?;

    let tts_dir = PathBuf::from(&project_dir).join("tts");
    if !tts_dir.is_dir() {
        return Ok(());
    }
    let entries = std::fs::read_dir(&tts_dir).map_err(|e| format!("Cannot read tts dir: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name();
        let name_str = name.to_string_lossy().to_lowercase();
        let is_voiceover = name_str.starts_with("voiceover")
            && (name_str.ends_with(".wav")
                || name_str.ends_with(".aiff")
                || name_str.ends_with(".txt")
                || name_str.ends_with(".raw.wav"));
        if is_voiceover || name_str == "voiceover.source.txt" {
            let _ = std::fs::remove_file(&path);
        }
    }
    Ok(())
}

#[tauri::command]
fn cancel_render(jobs: State<'_, Arc<JobHandles>>) -> Result<(), String> {
    let pid = {
        let mut g = jobs
            .render_pid
            .lock()
            .map_err(|_| "Job lock poisoned".to_string())?;
        g.take()
    };
    match pid {
        Some(pid) => kill_pid(pid),
        None => Err("No running render job to cancel".into()),
    }
}

#[tauri::command]
fn cancel_dub(jobs: State<'_, Arc<JobHandles>>) -> Result<(), String> {
    let pid = {
        let mut g = jobs
            .dub_pid
            .lock()
            .map_err(|_| "Job lock poisoned".to_string())?;
        g.take()
    };
    match pid {
        Some(pid) => kill_pid(pid),
        None => Err("No running dub job to cancel".into()),
    }
}

#[tauri::command]
fn path_exists(path: String) -> Result<bool, String> {
    if path.trim().is_empty() {
        return Ok(false);
    }
    let workdir = project_root();
    let output_root = workdir.join("output");
    let output_root_canon = std::fs::canonicalize(&output_root).unwrap_or(output_root.clone());
    let candidate = PathBuf::from(&path);
    let file_canon = if candidate.exists() {
        std::fs::canonicalize(&candidate).unwrap_or(candidate)
    } else {
        return Ok(false);
    };
    if !file_canon.starts_with(&output_root_canon) {
        return Err("Access denied outside output/".into());
    }
    Ok(true)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    if path.trim().is_empty() {
        return Err("Missing path".into());
    }

    let workdir = project_root();
    let output_root = workdir.join("output");
    let output_root_canon = std::fs::canonicalize(&output_root).unwrap_or(output_root.clone());
    let file_canon =
        std::fs::canonicalize(&path).map_err(|e| format!("Cannot read file: {e}"))?;

    if !file_canon.starts_with(&output_root_canon) {
        return Err("Access denied outside output/".into());
    }

    let meta = std::fs::metadata(&file_canon).map_err(|e| format!("Cannot read file: {e}"))?;
    if meta.len() > 5 * 1024 * 1024 {
        return Err("File too large".into());
    }

    std::fs::read_to_string(&file_canon).map_err(|e| format!("Cannot read file: {e}"))
}

#[tauri::command]
fn list_output_dirs() -> Result<Vec<String>, String> {
    let workdir = project_root();
    let output_root = workdir.join("output");

    if !output_root.exists() || !output_root.is_dir() {
        return Ok(vec![]);
    }

    let mut dirs = vec![];
    let entries =
        std::fs::read_dir(&output_root).map_err(|e| format!("Cannot read directory: {e}"))?;
    for entry in entries.flatten() {
        if let Ok(meta) = entry.metadata() {
            if meta.is_dir() {
                dirs.push(entry.path().to_string_lossy().to_string());
            }
        }
    }

    dirs.sort_by(|a, b| b.cmp(a));
    Ok(dirs)
}

#[tauri::command]
fn run_dub_worker(
    app: AppHandle,
    jobs: State<'_, Arc<JobHandles>>,
    action: String,
    video_path: Option<String>,
    audio_path: Option<String>,
    text: Option<String>,
    gemini_key: Option<String>,
    out_dir: Option<String>,
    voice: Option<String>,
    mode: Option<String>,
    duck_level: Option<f64>,
) -> Result<(), String> {
    {
        let guard = jobs
            .dub_pid
            .lock()
            .map_err(|_| "Job lock poisoned".to_string())?;
        if guard.is_some() {
            return Err("A dub job is already running. Cancel it first.".into());
        }
    }

    let jobs_arc = jobs.inner().clone();
    tauri::async_runtime::spawn(async move {
        let workdir = project_root();
        let tsx = tsx_entry(&workdir);

        let mut cmd = Command::new("node");
        cmd.current_dir(&workdir)
            .arg(&tsx)
            .arg("./worker/dub.ts")
            .arg("--action")
            .arg(&action);

        if let Some(v) = video_path {
            cmd.arg("--video").arg(v);
        }
        if let Some(a) = audio_path {
            cmd.arg("--audio").arg(a);
        }
        if let Some(t) = text {
            cmd.arg("--text").arg(t);
        }
        if let Some(o) = out_dir {
            cmd.arg("--outDir").arg(o);
        }
        if let Some(v) = voice {
            cmd.arg("--voice").arg(v);
        }
        if let Some(m) = mode {
            cmd.arg("--mode").arg(m);
        }
        if let Some(d) = duck_level {
            cmd.arg("--duckLevel").arg(d.to_string());
        }

        if let Some(k) = gemini_key {
            cmd.env("GEMINI_API_KEY", k);
        }

        cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit("dub_error", format!("Failed to start dub worker: {e}"));
                return;
            }
        };

        let pid = child.id();
        if let Ok(mut g) = jobs_arc.dub_pid.lock() {
            *g = Some(pid);
        }

        if let Some(stdout) = child.stdout.take() {
            pipe_lines(app.clone(), "dub_log", stdout);
        }
        if let Some(stderr) = child.stderr.take() {
            pipe_lines(app.clone(), "dub_log", stderr);
        }

        let status = child.wait();
        if let Ok(mut g) = jobs_arc.dub_pid.lock() {
            *g = None;
        }

        match status {
            Ok(st) if st.success() => {
                let _ = app.emit("dub_done", st.code().unwrap_or(0));
            }
            Ok(st) => {
                let code = st.code().unwrap_or(-1);
                let _ = app.emit("dub_error", format!("Dub worker exited with code {code}"));
            }
            Err(e) => {
                let _ = app.emit("dub_error", format!("Dub worker error: {e}"));
            }
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let jobs = Arc::new(JobHandles {
        render_pid: Mutex::new(None),
        dub_pid: Mutex::new(None),
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(jobs)
        .invoke_handler(tauri::generate_handler![
            start_render,
            cancel_render,
            cancel_dub,
            read_text_file,
            list_output_dirs,
            path_exists,
            copy_scene_asset,
            write_plan_json,
            clear_scene_asset,
            clear_tts_cache,
            run_dub_worker
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
