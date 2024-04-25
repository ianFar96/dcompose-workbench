use crate::docker::{
    get_docker_compose_file, run_docker_compose_down, run_docker_compose_up, start_emitting_service_status,
};
use serde::{Deserialize, Serialize};
use tauri::{App, AppHandle};

#[derive(Deserialize, Serialize)]
pub struct Service {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub type_name: String,
}

#[derive(Deserialize, Serialize)]
pub struct ServiceRelationship {
    source: String,
    target: String,
}

#[derive(Deserialize, Serialize)]
pub struct Scene {
    pub services: Vec<Service>,
    pub relationships: Vec<ServiceRelationship>,
}

#[tauri::command(async)]
pub fn get_scene(app: AppHandle, scene_name: &str) -> Result<Scene, String> {
    let docker_compose_file = get_docker_compose_file(scene_name)?;
    let mut services: Vec<Service> = vec![];
    for (service_id, service) in docker_compose_file.services {
        services.push(Service {
            id: service_id.clone(),
            label: service.labels.service_name,
            type_name: service.labels.service_type,
        });

        start_emitting_service_status(&app, scene_name, &service_id)?;
    }

    Ok(Scene {
        services,
        // TODO:
        relationships: vec![],
    })
}

#[tauri::command(async)]
pub fn run_service(scene_name: &str, service_id: &str) -> Result<(), String> {
    run_docker_compose_up(scene_name, service_id)?;
    Ok(())
}

#[tauri::command(async)]
pub fn stop_service(scene_name: &str, service_id: &str) -> Result<(), String> {
    run_docker_compose_down(scene_name, service_id)?;
    Ok(())
}
