// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dcompose_workbench::{commands, state::AppState};

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_scene,
            commands::run_service,
            commands::stop_service,
            commands::start_emitting_service_logs,
            commands::stop_emitting_service_logs,
            commands::create_relationship,
            commands::delete_relationship,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
