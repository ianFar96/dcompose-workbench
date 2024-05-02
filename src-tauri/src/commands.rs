use std::{
    collections::HashMap,
    fs::{self},
    path::PathBuf,
    process::Command,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::{
    docker::{self, DockerComposeDependsOn, DockerComposeService},
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
pub async fn get_scene_services(scene_name: &str) -> Result<Vec<Service>, String> {
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
    }

    Ok(services)
}

#[tauri::command(async)]
pub fn get_service(scene_name: &str, service_id: &str) -> Result<DockerComposeService, String> {
    let docker_compose_file = docker::get_docker_compose_file(scene_name)?;
    let docker_service = docker_compose_file.services.get(service_id).ok_or(format!(
        "Cannot find service {service_id} in docker compose file"
    ))?;
    Ok(docker_service.clone())
}

#[tauri::command(async)]
pub fn overwrite_service_config(
    scene_name: &str,
    service_id: &str,
    config: DockerComposeService,
) -> Result<(), String> {
    let mut docker_compose_file = docker::get_docker_compose_file(scene_name)?;
    let result = docker_compose_file
        .services
        .insert(service_id.to_string(), config);

    match result {
        None => Err(format!("Cannot find service {service_id}")),
        Some(_) => docker::write_docker_compose_file(scene_name, &docker_compose_file),
    }
}

#[tauri::command(async)]
pub async fn start_emitting_service_status(
    app: AppHandle,
    scene_name: &str,
    service_id: &str,
) -> Result<(), String> {
    docker::start_emitting_service_status(&app, scene_name, service_id).await
}

#[tauri::command(async)]
pub async fn stop_emitting_service_status(
    state: State<'_, AppState>,
    scene_name: &str,
    service_id: &str,
) -> Result<(), String> {
    docker::stop_emitting_service_status(state, scene_name, service_id).await
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
pub fn open_vscode(
    scene_name: &str,
    service_id: Option<&str>,
    filepath: Option<&str>,
) -> Result<(), String> {
    let mut args = vec![];

    let binding = format!("/home/mia/.dcompose-workbench/scenes/{scene_name}");
    let mut path = PathBuf::from(&binding);
    if let Some(service_id) = service_id {
        path = path.join(service_id);
    }
    args.push(path.to_string_lossy().to_string());

    if let Some(filepath) = filepath {
        args.push("-g".to_string());
        let absolute_filepath = path.join(filepath);
        args.push(absolute_filepath.to_string_lossy().to_string());
    }

    Command::new("code").args(args).spawn().map_err(|err| {
        format!(
            "Unable to open vs-code in /home/mia/.dcompose-workbench/scenes/{scene_name}: {err}"
        )
    })?;

    Ok(())
}

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum ServiceAssets {
    Leaf,
    Node(HashMap<String, ServiceAssets>),
}

#[tauri::command(async)]
pub fn get_service_assets(
    scene_name: &str,
    service_id: &str,
) -> Result<HashMap<String, ServiceAssets>, String> {
    let service_assets_dirpath = get_config_dirpath()
        .join("scenes")
        .join(scene_name)
        .join(service_id);

    get_service_assets_recursive(
        service_assets_dirpath,
        scene_name,
        service_id,
    )
}

fn get_service_assets_recursive(
    dirpath: PathBuf,
    scene_name: &str,
    service_id: &str,
) -> Result<HashMap<String, ServiceAssets>, String> {
    let mut service_assets = HashMap::new();
    
    match dirpath.try_exists() {
        Ok(exists) => {
            if exists {
                let dir = fs::read_dir(dirpath.clone())
                    .map_err(|err| format!("Cannot read service assets folder for scene {scene_name} and service {service_id}: {err}"))?;
                for entry in dir.into_iter() {
                    let entry = entry.unwrap();
                    
                    let is_dir = entry.path().is_dir();
                    if is_dir {
                        let next_service_assets = get_service_assets_recursive(entry.path(), scene_name, service_id)?;

                        let dir_name = entry.path().iter().last().unwrap().to_string_lossy().to_string();
                        service_assets.insert(
                            dir_name,
                            ServiceAssets::Node(next_service_assets)
                        );
                    } else {
                        let file_name = entry.file_name().to_string_lossy().to_string();
                        service_assets.insert(
                            file_name,
                            ServiceAssets::Leaf,
                        );
                    }
    
                }
            }
        }
        Err(err) => return Err(format!(
            "Cannot read service assets folder for scene {scene_name} and service {service_id}: {err}"
        )),
    }

    Ok(service_assets)
}
