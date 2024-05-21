use crate::docker::{self};

#[tauri::command(async)]
pub fn create_dependency(scene_name: &str, source: &str, target: &str) -> Result<(), String> {
    docker::add_dependency(scene_name, target, source)
}

#[tauri::command(async)]
pub fn delete_dependency(scene_name: &str, source: &str, target: &str) -> Result<(), String> {
    docker::remove_dependency(scene_name, target, source)
}

#[tauri::command(async)]
pub fn set_dependency_condition(
    scene_name: &str,
    source: &str,
    target: &str,
    condition: &str,
) -> Result<(), String> {
    docker::set_depends_on_condition(scene_name, target, source, condition)
}
