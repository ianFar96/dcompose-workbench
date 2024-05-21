// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dcompose_workbench::{dependencies, scenes, services, state::AppState, utils};

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            scenes::get_scenes,
            scenes::get_included_scenes,
            scenes::create_scene,
            scenes::delete_scene,
            scenes::detach_scene,
            scenes::import_scene,
            scenes::get_scene_services,
            scenes::run_scene,
            scenes::stop_scene,
            services::get_service,
            services::create_service,
            services::delete_service,
            services::get_service_assets,
            services::update_service,
            services::start_emitting_scene_status,
            services::stop_emitting_scene_status,
            services::run_service,
            services::stop_service,
            services::start_emitting_service_logs,
            services::stop_emitting_service_logs,
            dependencies::create_dependency,
            dependencies::delete_dependency,
            dependencies::set_dependency_condition,
            utils::open_vscode,
            utils::copy_target_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
