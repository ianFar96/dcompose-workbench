use std::{collections::HashMap, fs, process::Command};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::{
    docker::{self, DockerComposeDependsOn},
    state::AppState,
    utils::get_config_dirpath,
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
    pub type_name: Option<String>,
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
    pub name: String,
}

#[tauri::command(async)]
pub fn get_scenes() -> Result<Vec<Scene>, String> {
    let dir = fs::read_dir(get_config_dirpath().join("scenes"))
        .map_err(|err| format!("Cannot read scenes list: {}", err))?;

    let mut scenes = vec![];
    for entry in dir {
        let entry = entry.unwrap();
        if entry.path().is_dir() {
            scenes.push(Scene {
                name: entry.file_name().to_string_lossy().to_string(),
            })
        }
    }

    Ok(scenes)
}

#[tauri::command(async)]
pub fn get_scene_services(app: AppHandle, scene_name: &str) -> Result<Vec<Service>, String> {
    let docker_compose_file = docker::get_docker_compose_file(scene_name)?;
    let mut services: Vec<Service> = vec![];
    for (service_id, service) in docker_compose_file.services {
        services.push(Service {
            id: service_id.clone(),
            label: match service.labels {
                None => service_id.clone(),
                Some(ref labels) => labels.service_name.clone().unwrap_or(service_id.clone()),
            },
            type_name: match service.labels {
                None => None,
                Some(labels) => labels.service_type,
            },
            depends_on: service
                .depends_on
                .unwrap_or(HashMap::new())
                .into_iter()
                .map(|depends_on| (depends_on.0, depends_on.1.into()))
                .collect(),
        });

        docker::start_emitting_service_status(&app, scene_name, &service_id)?;
    }

    Ok(services)
}

#[tauri::command(async)]
pub fn run_scene(scene_name: &str) -> Result<(), String> {
    docker::run_docker_compose_up(scene_name, None)
}

#[tauri::command(async)]
pub fn stop_scene(scene_name: &str) -> Result<(), String> {
    docker::run_docker_compose_down(scene_name, None)
}

#[tauri::command(async)]
pub fn run_service(scene_name: &str, service_id: &str) -> Result<(), String> {
    docker::run_docker_compose_up(scene_name, Some(service_id))
}

#[tauri::command(async)]
pub fn stop_service(scene_name: &str, service_id: &str) -> Result<(), String> {
    docker::run_docker_compose_down(scene_name, Some(service_id))
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

#[tauri::command(async)]
pub fn set_dependency_condition(
    scene_name: &str,
    source: &str,
    target: &str,
    condition: &str,
) -> Result<(), String> {
    docker::set_depends_on_condition(scene_name, target, source, condition)
}

#[tauri::command(async)]
pub fn open_vscode(scene_name: &str) -> Result<(), String> {
    Command::new("code")
        .arg(format!("/home/mia/.dcompose-workbench/scenes/{scene_name}"))
        .spawn().map_err(|err| format!("Unable to open vs-code in /home/mia/.dcompose-workbench/scenes/{scene_name}: {err}"))?;

    Ok(())
}
