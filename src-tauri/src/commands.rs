use std::{
    collections::{BTreeMap, HashMap},
    fs,
    path::PathBuf,
    process::Command,
};

use path_absolutize::Absolutize;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::{
    docker::{
        self, DockerComposeDependsOn, DockerComposeIncludeEnum, DockerComposeIncludeObject, DockerComposeIncludeStringOrList, DockerComposeService
    },
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
pub fn create_scene(scene_name: &str) -> Result<(), String> {
    let (scene_name_length, _) = PathBuf::from(scene_name).iter().size_hint();
    if scene_name_length > 1 {
        return Err("Cannot create a scene within other folders".to_string());
    }

    let scene_path = get_config_dirpath().join("scenes").join(scene_name);
    fs_extra::dir::create(&scene_path, false)
        .map_err(|err| format!("Could not create scene folder {scene_name}: {err}"))?;

    let docker_compose_path = scene_path.join("docker-compose.yml");
    fs::write(docker_compose_path, "services: {}")
        .map_err(|err| format!("Could not create docker-compose.yml for scene {scene_name}: {err}"))
}

#[tauri::command(async)]
pub fn delete_scene(scene_name: &str) -> Result<(), String> {
    let scene_path = get_config_dirpath().join("scenes").join(scene_name);
    fs::remove_dir_all(scene_path).map_err(|err| format!("Could not delete scene: {err}"))
}

#[tauri::command(async)]
pub fn detach_scene(scene_name: &str, scene_name_to_detach: &str) -> Result<(), String> {
    let mut docker_compose = docker::get_docker_compose_file(scene_name)?;
    if let Some(include) = docker_compose.include {
        let include = include
            .into_iter()
            .try_fold(vec![], |mut acc, include_item| {
                let path = match &include_item {
                    DockerComposeIncludeEnum::String(path) => Some(path),
                    DockerComposeIncludeEnum::Object(obj) => match &obj.path {
                        Some(DockerComposeIncludeStringOrList::String(path)) => Some(path),
                        Some(DockerComposeIncludeStringOrList::List(paths)) => paths.first(),
                        None => None,
                    },
                };

                match path {
                    Some(path) => {
                        let include_filepath = get_config_dirpath()
                            .join("scenes")
                            .join(scene_name)
                            .join(path.clone());
                        let include_filepath = include_filepath.absolutize().map_err(|err| {
                            format!("Unable to resolve local path for ${path}: {err}")
                        })?;

                        let scene_name = include_filepath
                            .parent()
                            .unwrap()
                            .iter()
                            .last()
                            .unwrap()
                            .to_str()
                            .unwrap();

                        if scene_name != scene_name_to_detach {
                            acc.push(include_item);
                        }
                    }
                    None => acc.push(include_item),
                }

                Ok::<_, String>(acc)
            })?;

        docker_compose.include = Some(include);
    }

    docker::write_docker_compose_file(scene_name, &docker_compose)
}

#[tauri::command(async)]
pub fn import_scene(scene_name: &str, scene_name_to_import: &str) -> Result<(), String>  {
    let mut docker_compose = docker::get_docker_compose_file(scene_name)?;
    let mut include = match docker_compose.include {
        Some(x) => x,
        None => vec![]
    };

    include.push(DockerComposeIncludeEnum::Object(DockerComposeIncludeObject {
        path: Some(DockerComposeIncludeStringOrList::String(format!("../{scene_name_to_import}/docker-compose.yml"))),
        ..Default::default()
    }));

    docker_compose.include = Some(include);
    docker::write_docker_compose_file(scene_name, &docker_compose)
}

#[tauri::command(async)]
pub fn get_scene_services(scene_name: &str) -> Result<Vec<Service>, String> {
    let docker_compose_file = docker::get_docker_compose_file(scene_name)?;
    let mut services: Vec<Service> = vec![];
    for (service_id, service) in docker_compose_file.services {
        services.push(Service {
            id: service_id.clone(),
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
            scene_name: scene_name.to_string(),
        });
    }

    if let Some(include) = docker_compose_file.include {
        for include_item in include {
            let path = match include_item {
                DockerComposeIncludeEnum::String(path) => Some(path),
                DockerComposeIncludeEnum::Object(obj) => match obj.path {
                    Some(DockerComposeIncludeStringOrList::String(path)) => Some(path),
                    Some(DockerComposeIncludeStringOrList::List(paths)) => {
                        paths.first().map(|path| path.to_string())
                    }
                    None => None,
                },
            };

            if let Some(path) = path {
                let include_filepath = get_config_dirpath()
                    .join("scenes")
                    .join(scene_name)
                    .join(path.clone());
                let include_filepath = include_filepath
                    .absolutize()
                    .map_err(|err| format!("Unable to resolve local path for ${path}: {err}"))?;

                let scene_name = include_filepath
                    .parent()
                    .unwrap()
                    .iter()
                    .last()
                    .unwrap()
                    .to_str()
                    .unwrap();

                let external_services = get_scene_services(scene_name)?;
                services = services
                    .into_iter()
                    .chain(external_services.into_iter())
                    .collect();
            }
        }
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

#[tauri::command(async)]
pub fn copy_target_entry(
    scene_name: &str,
    service_id: &str,
    source: &str,
    target: &str,
) -> Result<(), String> {
    let source_path = PathBuf::from(source);
    match source_path.try_exists() {
        Err(err) => return Err(format!("Cannot read source path {source}: {err}")),
        Ok(false) => return Err(format!("Folder {source} does not exist in this system")),
        _ => {}
    }

    let target_path = get_config_dirpath()
        .join("scenes")
        .join(scene_name)
        .join(service_id)
        .join(target);

    match target_path.try_exists() {
        Err(err) => return Err(format!("Cannot read target path {source}: {err}")),
        Ok(true) => return Err("entry_already_exists".to_string()),
        _ => {}
    }

    match source_path.is_dir() {
        true => {
            // Create all dirs, even the last bit since we'll copy only the contents
            fs_extra::dir::create_all(&target_path, false).map_err(|err| {
                format!(
                    "Could not create missing folders in {}: {err}",
                    target_path.to_str().unwrap()
                )
            })?;

            let options = fs_extra::dir::CopyOptions {
                content_only: true,
                ..Default::default()
            };
            fs_extra::dir::copy(source_path, &target_path, &options).map_err(|err| {
                format!(
                    "Could not copy files from {} to {}: {err}",
                    source,
                    target_path.to_str().unwrap()
                )
            })?;
        }
        false => {
            // Create all dirs up to the file if necessary
            let mut target_base_dir = target_path.clone();
            target_base_dir.pop();
            if let Ok(false) = target_base_dir.try_exists() {
                fs_extra::dir::create_all(&target_base_dir, false).map_err(|err| {
                    format!(
                        "Could not create missing folders in {}: {err}",
                        target_path.to_str().unwrap()
                    )
                })?;
            }

            let options = fs_extra::file::CopyOptions::new();
            fs_extra::file::copy(source_path, &target_path, &options).map_err(|err| {
                format!(
                    "Could not copy files from {} to {}: {err}",
                    source,
                    target_path.to_str().unwrap()
                )
            })?;
        }
    }

    Ok(())
}
