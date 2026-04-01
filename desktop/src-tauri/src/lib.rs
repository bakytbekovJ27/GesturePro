use serde::Serialize;
use serde_json::{json, Value};
use std::{
  env,
  io::{BufRead, BufReader, Write},
  path::PathBuf,
  process::{Child, ChildStderr, ChildStdin, ChildStdout, Command, ExitStatus, Stdio},
  sync::{Arc, Mutex},
  thread,
  time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, State};

const CORE_EVENT_NAME: &str = "gesturepro://core-event";

#[derive(Default)]
struct SidecarManager {
  process: Mutex<Option<SidecarProcess>>,
  shutting_down: Mutex<bool>,
}

struct SidecarProcess {
  child: Child,
  stdin: ChildStdin,
}

#[derive(Clone, Serialize)]
struct RuntimeStatusPayload {
  r#type: &'static str,
  status: &'static str,
  message: String,
}

impl SidecarManager {
  fn clear_if_exited(&self) -> Option<ExitStatus> {
    if let Ok(mut guard) = self.process.lock() {
      let exit_status = guard
        .as_mut()
        .and_then(|process| process.child.try_wait().ok().flatten());

      if exit_status.is_some() {
        *guard = None;
      }

      return exit_status;
    }

    None
  }

  fn set_shutting_down(&self, value: bool) {
    if let Ok(mut guard) = self.shutting_down.lock() {
      *guard = value;
    }
  }

  fn is_shutting_down(&self) -> bool {
    if let Ok(guard) = self.shutting_down.lock() {
      return *guard;
    }

    false
  }
}

#[tauri::command]
fn start_sidecar(app: AppHandle, state: State<'_, Arc<SidecarManager>>) -> Result<(), String> {
  start_sidecar_inner(&app, state.inner())
}

#[tauri::command]
fn send_sidecar_command(
  app: AppHandle,
  state: State<'_, Arc<SidecarManager>>,
  payload: Value,
) -> Result<(), String> {
  {
    let guard = state.process.lock().map_err(|_| "sidecar mutex poisoned".to_string())?;
    if guard.is_none() {
      drop(guard);
      start_sidecar_inner(&app, state.inner())?;
    }
  }

  let mut guard = state.process.lock().map_err(|_| "sidecar mutex poisoned".to_string())?;
  let process = guard
    .as_mut()
    .ok_or_else(|| "Python sidecar is not running.".to_string())?;

  let line = serde_json::to_string(&payload).map_err(|err| err.to_string())?;
  process
    .stdin
    .write_all(line.as_bytes())
    .map_err(|err| format!("failed to write sidecar command: {err}"))?;
  process
    .stdin
    .write_all(b"\n")
    .map_err(|err| format!("failed to write sidecar newline: {err}"))?;
  process
    .stdin
    .flush()
    .map_err(|err| format!("failed to flush sidecar stdin: {err}"))?;
  Ok(())
}

#[tauri::command]
fn stop_sidecar(app: AppHandle, state: State<'_, Arc<SidecarManager>>) -> Result<(), String> {
  stop_sidecar_inner(&app, state.inner())
}

fn start_sidecar_inner(app: &AppHandle, manager: &Arc<SidecarManager>) -> Result<(), String> {
  manager.clear_if_exited();
  manager.set_shutting_down(false);

  let mut guard = manager
    .process
    .lock()
    .map_err(|_| "sidecar mutex poisoned".to_string())?;
  if guard.is_some() {
    emit_runtime_status(app, "ready", "Python sidecar already running.");
    return Ok(());
  }

  emit_runtime_status(app, "starting", "Launching the Python sidecar...");
  let (mut child, stdin, stdout, stderr) = spawn_sidecar_process()?;

  let manager_for_stdout = manager.clone();
  let app_for_stdout = app.clone();
  thread::spawn(move || {
    forward_stdout(stdout, app_for_stdout.clone());
    let exit_status = manager_for_stdout.clear_if_exited();
    if manager_for_stdout.is_shutting_down() {
      emit_runtime_status(&app_for_stdout, "stopped", "Python sidecar stream closed.");
      return;
    }

    let message = match exit_status {
      Some(status) => format!("Python sidecar exited unexpectedly with status {status}."),
      None => "Python sidecar stream closed unexpectedly.".to_string(),
    };
    emit_runtime_status(&app_for_stdout, "error", &message);
  });

  let app_for_stderr = app.clone();
  thread::spawn(move || {
    forward_stderr(stderr, app_for_stderr);
  });

  if let Ok(Some(status)) = child.try_wait() {
    return Err(format!("Python sidecar exited immediately with status {status}."));
  }

  *guard = Some(SidecarProcess { child, stdin });
  emit_runtime_status(app, "ready", "Python sidecar is running.");
  Ok(())
}

fn stop_sidecar_inner(app: &AppHandle, manager: &Arc<SidecarManager>) -> Result<(), String> {
  manager.set_shutting_down(true);
  let mut guard = manager
    .process
    .lock()
    .map_err(|_| "sidecar mutex poisoned".to_string())?;
  let Some(mut process) = guard.take() else {
    emit_runtime_status(app, "stopped", "Python sidecar already stopped.");
    return Ok(());
  };

  let _ = writeln!(process.stdin, "{}", json!({ "command": "app.shutdown" }));
  let _ = process.stdin.flush();

  thread::sleep(Duration::from_millis(200));
  if process.child.try_wait().map_err(|err| err.to_string())?.is_none() {
    let _ = process.child.kill();
    let _ = process.child.wait();
  }

  emit_runtime_status(app, "stopped", "Python sidecar stopped.");
  Ok(())
}

fn spawn_sidecar_process() -> Result<(Child, ChildStdin, ChildStdout, ChildStderr), String> {
  let script_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../sidecar/runtime.py");
  let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");

  let mut candidates: Vec<String> = Vec::new();
  if let Ok(explicit) = env::var("GESTUREPRO_PYTHON_BIN") {
    if !explicit.trim().is_empty() {
      candidates.push(explicit);
    }
  }
  candidates.push("python3".to_string());
  candidates.push("python".to_string());

  let mut last_error = String::new();
  for python in candidates {
    let mut command = Command::new(&python);
    command
      .arg("-u")
      .arg(&script_path)
      .current_dir(&repo_root)
      .env("PYTHONUNBUFFERED", "1")
      .stdin(Stdio::piped())
      .stdout(Stdio::piped())
      .stderr(Stdio::piped());

    match command.spawn() {
      Ok(mut child) => {
        let stdin = child
          .stdin
          .take()
          .ok_or_else(|| "failed to capture sidecar stdin".to_string())?;
        let stdout = child
          .stdout
          .take()
          .ok_or_else(|| "failed to capture sidecar stdout".to_string())?;
        let stderr = child
          .stderr
          .take()
          .ok_or_else(|| "failed to capture sidecar stderr".to_string())?;
        return Ok((child, stdin, stdout, stderr));
      }
      Err(err) => {
        last_error = format!("{python}: {err}");
      }
    }
  }

  Err(format!("Unable to start Python sidecar. Last error: {last_error}"))
}

fn forward_stdout(stdout: ChildStdout, app: AppHandle) {
  let reader = BufReader::new(stdout);
  for line in reader.lines() {
    match line {
      Ok(payload_line) => {
        if payload_line.trim().is_empty() {
          continue;
        }
        match serde_json::from_str::<Value>(&payload_line) {
          Ok(payload) => {
            let _ = app.emit(CORE_EVENT_NAME, payload);
          }
          Err(err) => emit_runtime_status(&app, "error", &format!("Invalid sidecar event: {err}")),
        }
      }
      Err(err) => {
        emit_runtime_status(&app, "error", &format!("Failed to read sidecar stdout: {err}"));
        break;
      }
    }
  }
}

fn forward_stderr(stderr: ChildStderr, app: AppHandle) {
  let reader = BufReader::new(stderr);
  for line in reader.lines() {
    match line {
      Ok(message) if !message.trim().is_empty() => {
        if is_benign_sidecar_stderr(&message) {
          log::debug!("sidecar stderr (benign): {message}");
        } else if is_fatal_sidecar_stderr(&message) {
          log::error!("sidecar stderr (fatal): {message}");
          emit_runtime_status(&app, "error", &format!("Sidecar runtime error: {message}"));
        } else {
          log::info!("sidecar stderr: {message}");
        }
      }
      Ok(_) => {}
      Err(err) => {
        log::error!("failed to read sidecar stderr: {err}");
        break;
      }
    }
  }
}

fn emit_runtime_status(app: &AppHandle, status: &'static str, message: &str) {
  let payload = RuntimeStatusPayload {
    r#type: "runtime_status",
    status,
    message: message.to_string(),
  };
  let _ = app.emit(CORE_EVENT_NAME, payload);
}

fn is_benign_sidecar_stderr(message: &str) -> bool {
  [
    "tensorflow/core/platform/cpu_feature_guard.cc",
    "To enable the following instructions:",
    "WARNING: All log messages before absl::InitializeLog() is called are written to STDERR",
    "gl_context.cc",
    "Created TensorFlow Lite XNNPACK delegate for CPU.",
    "inference_feedback_manager.cc",
    "landmark_projection_calculator.cc",
    "Using NORM_RECT without IMAGE_DIMENSIONS",
  ]
  .iter()
  .any(|pattern| message.contains(pattern))
}

fn is_fatal_sidecar_stderr(message: &str) -> bool {
  [
    "Traceback (most recent call last):",
    "ModuleNotFoundError",
    "ImportError:",
    "No module named ",
    "FileNotFoundError:",
    "PermissionError:",
  ]
  .iter()
  .any(|pattern| message.contains(pattern))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(Arc::new(SidecarManager::default()))
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![start_sidecar, send_sidecar_command, stop_sidecar])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::Destroyed = event {
        let app = window.app_handle().clone();
        let manager: State<'_, Arc<SidecarManager>> = app.state();
        let _ = stop_sidecar_inner(&app, manager.inner());
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
