use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::{
    docker::{self, DockerComposeDependsOn},
    state::AppState,
};

#[derive(Deserialize, Serialize)]
pub struct DependsOn {
    condition: String,
}

impl From<DockerComposeDependsOn> for DependsOn {
    fn from(value: DockerComposeDependsOn) -> Self {
        Self {
            condition: value.condition,
        }
    }
}

#[derive(Deserialize, Serialize)]
pub struct Service {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub type_name: String,
    #[serde(rename = "dependsOn")]
    pub depends_on: HashMap<String, DependsOn>,
}

#[derive(Deserialize, Serialize)]
pub struct ServiceRelationship {
    pub source: String,
    pub target: String,
}

#[derive(Deserialize, Serialize)]
pub struct Scene {
    pub services: Vec<Service>,
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
            depends_on: service
                .depends_on
                .unwrap_or(HashMap::new())
                .into_iter()
                .map(|depends_on| {
                    (
                        depends_on.0,
                        depends_on.1.into(),
                    )
                })
                .collect(),
        });

        docker::start_emitting_service_status(&app, scene_name, &service_id)?;
    }

    Ok(Scene { services })
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
pub async fn start_emitting_service_logs(
    app: AppHandle,
    scene_name: &str,
    service_id: &str,
) -> Result<(), String> {
    docker::start_emitting_service_logs(&app, scene_name, service_id).await
}

#[tauri::command(async)]
pub async fn stop_emitting_service_logs(
    state: State<'_, AppState>,
    scene_name: &str,
    service_id: &str,
) -> Result<(), String> {
    docker::stop_emitting_service_logs(state, scene_name, service_id).await
}

#[tauri::command(async)]
pub fn create_dependency(scene_name: &str, source: &str, target: &str) -> Result<(), String> {
    docker::add_dependency(scene_name, target, source)
}

#[tauri::command(async)]
pub fn delete_dependency(scene_name: &str, source: &str, target: &str) -> Result<(), String> {
    docker::remove_dependency(scene_name, target, source)
}
