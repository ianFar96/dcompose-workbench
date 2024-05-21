use std::{
  collections::{BTreeMap, HashMap},
  fs,
  path::PathBuf,
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

#[derive(Deserialize, Serialize, Default)]
pub struct Service {
    pub id: String,
    #[serde(rename = "type")]
    pub type_name: Option<String>,
    #[serde(rename = "dependsOn")]
    pub depends_on: HashMap<String, DependsOn>,
    #[serde(rename = "sceneName")]
    pub scene_name: String,
}

#[derive(Deserialize, Serialize)]
pub struct ServiceRelationship {
    pub source: String,
    pub target: String,
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
pub fn create_service(scene_name: &str, service_id: &str, code: &str) -> Result<(), String> {
    let mut docker_compose_file = docker::get_docker_compose_file(scene_name)?;
    if docker_compose_file.services.contains_key(service_id) {
        return Err(format!("Service with Id {service_id} already exists"));
    }

    let deserialized_code = serde_yaml::from_str(code)
        .map_err(|err| format!("Invalid format for service {service_id} configuration: {err}"))?;
    docker_compose_file
        .services
        .insert(service_id.to_string(), deserialized_code);

    docker::write_docker_compose_file(scene_name, &docker_compose_file)?;

    let assets_dirpath = get_config_dirpath()
        .join("scenes")
        .join(scene_name)
        .join(service_id);
    fs::create_dir(&assets_dirpath).map_err(|err| {
        format!(
            "Cannot create local assets directory at {} for service {service_id} in scene {scene_name}: {err}",
            assets_dirpath.to_str().unwrap(),
        )
    })
}

#[tauri::command(async)]
pub fn update_service(
    scene_name: &str,
    service_id: &str,
    previous_service_id: &str,
    code: &str,
) -> Result<(), String> {
    let mut docker_compose_file = docker::get_docker_compose_file(scene_name)?;
    let previous_service = docker_compose_file
        .services
        .remove_entry(previous_service_id);
    if previous_service.is_none() {
        return Err(format!("Cannot find service with Id {service_id}"));
    }

    let service_already_exists = docker_compose_file.services.contains_key(service_id);
    if service_already_exists {
        return Err(format!("Service with Id {service_id} already exists"));
    }

    let deserialized_code = serde_yaml::from_str(code)
        .map_err(|err| format!("Invalid format for service {service_id} configuration: {err}"))?;

    docker_compose_file
        .services
        .insert(service_id.to_string(), deserialized_code);
    docker::write_docker_compose_file(scene_name, &docker_compose_file)
}

#[tauri::command(async)]
pub fn delete_service(scene_name: &str, service_id: &str) -> Result<(), String> {
    let mut docker_compose_file = docker::get_docker_compose_file(scene_name)?;
    docker_compose_file.services.remove_entry(service_id);
    docker::write_docker_compose_file(scene_name, &docker_compose_file)?;

    let assets_dirpath = get_config_dirpath()
        .join("scenes")
        .join(scene_name)
        .join(service_id);
    fs::remove_dir_all(&assets_dirpath).map_err(|err| {
        format!(
            "Cannot delete local assets at {} for service {service_id} in scene {scene_name}: {err}",
            assets_dirpath.to_str().unwrap(),
        )
    })
}

#[tauri::command(async)]
pub async fn start_emitting_scene_status(app: AppHandle, scene_name: &str) -> Result<(), String> {
    docker::start_emitting_scene_status(&app, scene_name).await
}

#[tauri::command(async)]
pub async fn stop_emitting_scene_status(
    state: State<'_, AppState>,
    scene_name: &str,
) -> Result<(), String> {
    docker::stop_emitting_scene_status(state, scene_name).await
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

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum ServiceAssets {
    Leaf,
    Node(BTreeMap<String, ServiceAssets>),
}

#[tauri::command(async)]
pub fn get_service_assets(
    scene_name: &str,
    service_id: &str,
) -> Result<BTreeMap<String, ServiceAssets>, String> {
    let service_assets_dirpath = get_config_dirpath()
        .join("scenes")
        .join(scene_name)
        .join(service_id);

    get_service_assets_recursive(service_assets_dirpath, scene_name, service_id)
}

fn get_service_assets_recursive(
    dirpath: PathBuf,
    scene_name: &str,
    service_id: &str,
) -> Result<BTreeMap<String, ServiceAssets>, String> {
    let mut service_assets = BTreeMap::new();

    match dirpath.try_exists() {
        Ok(exists) => {
            if exists {
                let dir = fs::read_dir(dirpath.clone())
                    .map_err(|err| format!("Cannot read service assets folder for scene {scene_name} and service {service_id}: {err}"))?;
                for entry in dir.into_iter() {
                    let entry = entry.unwrap();

                    let is_dir = entry.path().is_dir();
                    let entry_name = entry.file_name().to_string_lossy().to_string();
                    if is_dir {
                        let next_service_assets = get_service_assets_recursive(entry.path(), scene_name, service_id)?;

                        service_assets.insert(
                            entry_name,
                            ServiceAssets::Node(next_service_assets)
                        );
                    } else {
                        service_assets.insert(
                            entry_name,
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
