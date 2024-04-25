use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
use tauri::api::path::home_dir;

#[derive(Serialize, Deserialize, Debug)]
pub struct DockerComposeLabels {
    #[serde(rename = "serviceName")]
    pub service_name: String,
    #[serde(rename = "serviceType")]
    pub service_type: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DockerComposeService {
    pub labels: DockerComposeLabels,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DockerComposeFile {
    pub services: HashMap<String, DockerComposeService>,
}

fn get_docker_compose_dirpath(scene_name: &str) -> PathBuf {
    Path::new(&home_dir().unwrap())
        .join(".dcompose-workbench/scenes")
        .join(scene_name)
}

pub fn get_docker_compose_file(scene_name: &str) -> Result<DockerComposeFile, String> {
    let docker_compose_filepath = get_docker_compose_dirpath(scene_name).join("docker-compose.yml");

    let docker_compose_file_string = fs::read_to_string(&docker_compose_filepath)
        .map_err(|err| format!("Cannot find file {:?}: {}", docker_compose_filepath, err))?;

    serde_yaml::from_str::<DockerComposeFile>(&docker_compose_file_string)
        .map_err(|err| format!("Cannot parse docker-compose.yml: {}", err))
}

pub fn run_docker_compose_up(scene_name: &str, service_id: &str) -> Result<(), String> {
    let output = Command::new("docker-compose")
        .current_dir(get_docker_compose_dirpath(scene_name))
        .args(["up", service_id])
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|error| {
            format!(
                "Could not start `docker-compose up {}` command: {}",
                service_id, error
            )
        })?
        .wait_with_output();

    let output = output.unwrap();
    match output.status.success() {
        true => Ok(()),
        false => Err(format!(
            "Error running `docker-compose up {}` command: {}",
            service_id,
            String::from_utf8(output.stderr).unwrap()
        )),
    }
}

pub fn run_docker_compose_down(scene_name: &str, service_id: &str) -> Result<(), String> {
    let output = Command::new("docker-compose")
        .current_dir(get_docker_compose_dirpath(scene_name))
        .args(["down", service_id])
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|error| {
            format!(
                "Could not start `docker-compose down {}` command: {}",
                service_id, error
            )
        })?
        .wait_with_output();

    let output = output.unwrap();
    match output.status.success() {
        true => Ok(()),
        false => Err(format!(
            "Error running `docker-compose down {}` command: {}",
            service_id,
            String::from_utf8(output.stderr).unwrap()
        )),
    }
}
