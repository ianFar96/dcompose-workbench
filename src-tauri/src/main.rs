// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dcompose_workbench::{commands, state::AppState};

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_scenes,
            commands::get_scene_services,
            commands::get_service,
            commands::get_service_assets,
            commands::overwrite_service_config,
            commands::start_emitting_service_status,
            commands::stop_emitting_service_status,
            commands::run_scene,
            commands::stop_scene,
            commands::run_service,
            commands::stop_service,
            commands::start_emitting_service_logs,
            commands::stop_emitting_service_logs,
            commands::create_dependency,
            commands::delete_dependency,
            commands::set_dependency_condition,
            commands::open_vscode,
            commands::copy_target_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
