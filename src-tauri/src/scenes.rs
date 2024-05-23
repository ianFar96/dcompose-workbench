use std::{
    collections::{HashMap, HashSet},
    fs,
    path::PathBuf,
};

use path_absolutize::Absolutize;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::{
    docker::{
        self, DockerComposeIncludeEnum, DockerComposeIncludeObject,
        DockerComposeIncludeStringOrList,
    },
    services::Service,
    utils::get_config_dirpath,
};

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
pub fn get_included_scenes(scene_name: &str) -> Result<Vec<Scene>, String> {
    let docker_compose = docker::get_docker_compose_file(scene_name)?;
    let include = match docker_compose.include {
        Some(x) => x,
        None => vec![],
    };

    include
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

                acc.push(Scene {
                    name: scene_name.to_string(),
                });
            }

            Ok(acc)
        })
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
pub fn import_scene(scene_name: &str, scene_name_to_import: &str) -> Result<(), String> {
    let mut docker_compose = docker::get_docker_compose_file(scene_name)?;
    let mut include = match docker_compose.include {
        Some(x) => x,
        None => vec![],
    };

    let service_ids = docker::get_scene_service_ids(scene_name)?;
    let service_ids_to_import = docker::get_scene_service_ids(scene_name_to_import)?;

    let service_ids_set: HashSet<String> = HashSet::from_iter(service_ids);
    let service_ids_to_import_set: HashSet<String> = HashSet::from_iter(service_ids_to_import);
    let intersection: HashSet<_> = service_ids_set
        .intersection(&service_ids_to_import_set)
        .collect();

    if !intersection.is_empty() {
        let intersection_names = intersection
            .into_iter()
            .map(|str| str.to_string())
            .collect::<Vec<_>>()
            .join(", ");
        return Err(format!("Cannot import scene {scene_name_to_import} because there are services with overlapping names: {intersection_names}"));
    }

    include.push(DockerComposeIncludeEnum::Object(
        DockerComposeIncludeObject {
            path: Some(DockerComposeIncludeStringOrList::String(format!(
                "../{scene_name_to_import}/docker-compose.yml"
            ))),
            ..Default::default()
        },
    ));

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
pub async fn run_scene(app: AppHandle, scene_name: &str) -> Result<(), String> {
    docker::run_docker_compose_up(&app, scene_name, None).await
}

#[tauri::command(async)]
pub fn stop_scene(scene_name: &str) -> Result<(), String> {
    docker::run_docker_compose_down(scene_name, None)
}
