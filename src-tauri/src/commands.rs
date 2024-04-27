use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::{docker, relationships, state::AppState};

#[derive(Deserialize, Serialize)]
pub struct Service {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub type_name: String,
}

#[derive(Deserialize, Serialize)]
pub struct ServiceRelationship {
    pub source: String,
    pub target: String,
}

#[derive(Deserialize, Serialize)]
pub struct Scene {
    pub services: Vec<Service>,
    pub relationships: Vec<ServiceRelationship>,
}

#[tauri::command(async)]
pub fn get_scene(app: AppHandle, scene_name: &str) -> Result<Scene, String> {
    let docker_compose_file = docker::get_docker_compose_file(scene_name)?;
    let mut services: Vec<Service> = vec![];
    for (service_id, service) in docker_compose_file.services {
        services.push(Service {
            id: service_id.clone(),
            label: service.labels.service_name,
            type_name: service.labels.service_type,
        });

        docker::start_emitting_service_status(&app, scene_name, &service_id)?;
    }

    let relationships = relationships::get_relationships(scene_name)?;

    Ok(Scene {
        services,
        relationships,
    })
}

#[tauri::command(async)]
pub fn run_service(scene_name: &str, service_id: &str) -> Result<(), String> {
    docker::run_docker_compose_up(scene_name, service_id)
}

#[tauri::command(async)]
pub fn stop_service(scene_name: &str, service_id: &str) -> Result<(), String> {
    docker::run_docker_compose_down(scene_name, service_id)
}

#[tauri::command(async)]
pub async fn start_emitting_service_logs(app: AppHandle, scene_name: &str, service_id: &str) -> Result<(), String> {
    docker::start_emitting_service_logs(&app, scene_name, service_id).await
}

#[tauri::command(async)]
pub async fn stop_emitting_service_logs(state: State<'_, AppState>, scene_name: &str, service_id: &str) -> Result<(), String> {
    docker::stop_emitting_service_logs(state, scene_name, service_id).await
}

#[tauri::command(async)]
pub fn create_relationship(scene_name: &str, source: &str, target: &str) -> Result<(), String> {
    relationships::create_relationship(scene_name, source, target)
}

#[tauri::command(async)]
pub fn delete_relationship(scene_name: &str, source: &str, target: &str) -> Result<(), String> {
    relationships::delete_relationship(scene_name, source, target)
}
