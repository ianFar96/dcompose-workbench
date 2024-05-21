use bollard::{
    container::{InspectContainerOptions, LogOutput, LogsOptions},
    secret::{ContainerState, ContainerStateStatusEnum, HealthStatusEnum},
    Docker,
};
use chrono::DateTime;
use futures::StreamExt;
use path_absolutize::Absolutize;
use serde::{Deserialize, Serialize};
use serde_yaml::Value;
use std::{
    collections::HashMap,
    fs,
    path::PathBuf,
    process::{Command, Stdio},
    time::Duration,
};
use tauri::{AppHandle, Manager, State};
use tokio::{spawn, task::JoinHandle, time::sleep};

use crate::{
    state::{AppState, ServiceKey},
    utils::{get_config_dirpath, get_formatted_date},
};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DockerComposeLabels {
    #[serde(rename = "serviceType", skip_serializing_if = "Option::is_none")]
    pub service_type: Option<String>,

    #[serde(flatten)]
    extra: HashMap<String, Value>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct DockerComposeDependsOn {
    pub condition: String,

    #[serde(flatten)]
    extra: HashMap<String, Value>,
}

impl Default for DockerComposeDependsOn {
    fn default() -> Self {
        Self {
            condition: "service_started".to_string(),
            extra: HashMap::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DockerComposeService {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub labels: Option<DockerComposeLabels>,
    #[serde(skip_serializing_if = "is_none_or_empty")]
    pub depends_on: Option<HashMap<String, DockerComposeDependsOn>>,

    #[serde(flatten)]
    extra: HashMap<String, Value>,
}

fn is_none_or_empty(depends_on: &Option<HashMap<String, DockerComposeDependsOn>>) -> bool {
    match depends_on {
        None => true,
        Some(x) => x.is_empty(),
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DockerComposeFile {
    pub services: HashMap<String, DockerComposeService>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include: Option<Vec<DockerComposeIncludeEnum>>,

    #[serde(flatten)]
    extra: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum DockerComposeIncludeEnum {
    String(String),
    Object(DockerComposeIncludeObject),
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct DockerComposeIncludeObject {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<DockerComposeIncludeStringOrList>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env_file: Option<DockerComposeIncludeStringOrList>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_directory: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum DockerComposeIncludeStringOrList {
    String(String),
    List(Vec<String>),
}

fn get_docker_compose_dirpath(scene_name: &str) -> PathBuf {
    get_config_dirpath().join("scenes").join(scene_name)
}

pub fn get_docker_compose_file(scene_name: &str) -> Result<DockerComposeFile, String> {
    let docker_compose_filepath = get_docker_compose_dirpath(scene_name).join("docker-compose.yml");

    let docker_compose_file_string = fs::read_to_string(&docker_compose_filepath)
        .map_err(|err| format!("Cannot find file {:?}: {}", docker_compose_filepath, err))?;

    serde_yaml::from_str::<DockerComposeFile>(&docker_compose_file_string)
        .map_err(|err| format!("Cannot parse docker-compose.yml: {}", err))
}

pub fn write_docker_compose_file(
    scene_name: &str,
    docker_compose: &DockerComposeFile,
) -> Result<(), String> {
    let docker_compose_filepath = get_docker_compose_dirpath(scene_name).join("docker-compose.yml");

    let docker_compose_stringified = serde_yaml::to_string(docker_compose).unwrap();
    fs::write(&docker_compose_filepath, docker_compose_stringified)
        .map_err(|err| format!("Cannot write file {:?}: {}", docker_compose_filepath, err))
}

pub fn run_docker_compose_up(scene_name: &str, service_id: Option<&str>) -> Result<(), String> {
    let mut args = vec!["--project-name", scene_name, "up", "-d"];
    if let Some(service_id) = service_id {
        args.push(service_id);
    }

    let service_id_format_string = service_id
        .map(|service_id| format!(" {service_id}"))
        .unwrap_or("".to_string());

    let output = Command::new("docker-compose")
        .current_dir(get_docker_compose_dirpath(scene_name))
        .args(args)
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|error| {
            format!(
                "Could not start `docker-compose up{}` command: {}",
                service_id_format_string, error
            )
        })?
        .wait_with_output();

    let output = output.unwrap();
    match output.status.success() {
        true => Ok(()),
        false => Err(format!(
            "Error running `docker-compose up{}` command: {}",
            service_id_format_string,
            String::from_utf8(output.stderr).unwrap()
        )),
    }
}

pub fn run_docker_compose_down(scene_name: &str, service_id: Option<&str>) -> Result<(), String> {
    let args: Vec<&str> = match service_id {
        None => ["down"].to_vec(),
        Some(x) => ["down", x].to_vec(),
    };

    let service_id_format_string = service_id
        .map(|service_id| format!(" {service_id}"))
        .unwrap_or("".to_string());

    let output = Command::new("docker-compose")
        .current_dir(get_docker_compose_dirpath(scene_name))
        .args(args)
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|error| {
            format!(
                "Could not start `docker-compose down {}` command: {}",
                service_id_format_string, error
            )
        })?
        .wait_with_output();

    let output = output.unwrap();
    match output.status.success() {
        true => Ok(()),
        false => Err(format!(
            "Error running `docker-compose down {}` command: {}",
            service_id_format_string,
            String::from_utf8(output.stderr).unwrap()
        )),
    }
}

#[derive(Serialize, Deserialize, Debug)]
struct DockerComposePsResponse {
    #[serde(rename = "Service")]
    service: String,
    #[serde(rename = "Name")]
    name: String,
}

fn get_container_names_from_services(scene_name: &str) -> Result<HashMap<String, String>, String> {
    let output = Command::new("docker-compose")
        .current_dir(get_docker_compose_dirpath(scene_name))
        .args(["ps", "--format", "json"])
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Could not retrieve docker compose list: {}", error))?
        .wait_with_output()
        .unwrap();

    match output.status.code().unwrap() {
        0 => {
            let output_string = String::from_utf8(output.stdout).unwrap();
            let mut output_jsonlike_string = output_string.replace('\n', ",");
            output_jsonlike_string.pop();
            output_jsonlike_string = format!("[{}]", output_jsonlike_string);

            let output_json: Vec<DockerComposePsResponse> =
                serde_json::from_str(&output_jsonlike_string).unwrap();

            Ok(output_json
                .iter()
                .map(|container| (container.service.clone(), container.name.clone()))
                .collect::<HashMap<_, _>>())
        }
        x => Err(format!(
            "Docker compose list command exited with code {x}: {}",
            String::from_utf8(output.stderr).unwrap()
        )),
    }
}

#[derive(Serialize, Clone)]
enum LogType {
    #[serde(rename = "stderr")]
    StdErr,
    #[serde(rename = "stdout")]
    StdOut,
}

#[derive(Serialize, Clone)]
struct ServiceLogEventPayload {
    text: String,
    timestamp: String,
    #[serde(rename = "type")]
    type_name: LogType,
    clear: bool,
}

pub async fn start_emitting_service_logs(
    app: &AppHandle,
    scene_name: &str,
    service_id: &str,
) -> Result<(), String> {
    let docker = Docker::connect_with_socket_defaults()
        .map_err(|error| format!("Cannot connect to docker socket: {}", error))?;

    let thread_app = app.to_owned();
    let thread_scene_name = scene_name.to_string();
    let thread_service_id = service_id.to_string();
    let logs_handle = spawn(async move {
        let service_log_event_name = format!("{thread_scene_name}-{thread_service_id}-log-event");

        let container_name = loop {
            match get_container_names_from_services(&thread_scene_name) {
                Err(err) => {
                    thread_app
                        .emit_all(
                            service_log_event_name.as_ref(),
                            ServiceLogEventPayload {
                                text: format!("Error getting containers: {}", err),
                                timestamp: get_formatted_date(None),
                                clear: true,
                                type_name: LogType::StdErr,
                            },
                        )
                        .unwrap();
                }
                Ok(service_name_map) => {
                    let container_name = service_name_map.get(&thread_service_id);

                    match container_name {
                        Some(container_name) => break container_name.to_string(),
                        None => {
                            thread_app
                                .emit_all(
                                    service_log_event_name.as_ref(),
                                    ServiceLogEventPayload {
                                        text: "Container does not exist for this service..."
                                            .to_string(),
                                        timestamp: get_formatted_date(None),
                                        clear: true,
                                        type_name: LogType::StdErr,
                                    },
                                )
                                .unwrap();
                        }
                    }

                    sleep(Duration::from_secs(1)).await;
                }
            }
        };

        let mut logs_stream = docker.logs::<String>(
            &container_name,
            Some(LogsOptions::<String> {
                follow: true,
                tail: "all".to_string(),
                stderr: true,
                stdout: true,
                timestamps: true,
                ..Default::default()
            }),
        );

        while let Some(log) = logs_stream.next().await {
            match log {
                Ok(log) => {
                    let log_string = log.to_string();
                    let (timestamp, text) = match log_string.split_once(' ') {
                        None => ("".to_string(), log_string),
                        Some((timestamp, text)) => (
                            get_formatted_date(
                                DateTime::parse_from_rfc3339(timestamp)
                                    .map(|date| date.into())
                                    .ok(),
                            ),
                            text.to_string(),
                        ),
                    };

                    match log {
                        LogOutput::StdOut { message: _ } => {
                            thread_app
                                .emit_all(
                                    service_log_event_name.as_ref(),
                                    ServiceLogEventPayload {
                                        text,
                                        timestamp,
                                        clear: false,
                                        type_name: LogType::StdOut,
                                    },
                                )
                                .unwrap();
                        }
                        LogOutput::StdErr { message: _ } => {
                            thread_app
                                .emit_all(
                                    service_log_event_name.as_ref(),
                                    ServiceLogEventPayload {
                                        text,
                                        timestamp,
                                        clear: false,
                                        type_name: LogType::StdErr,
                                    },
                                )
                                .unwrap();
                        }
                        _ => {}
                    }
                }
                Err(error) => {
                    thread_app
                        .emit_all(
                            service_log_event_name.as_ref(),
                            ServiceLogEventPayload {
                                text: format!("Logs stream interrupted: {}", error),
                                timestamp: get_formatted_date(None),
                                clear: true,
                                type_name: LogType::StdErr,
                            },
                        )
                        .unwrap();
                }
            }
        }
    });

    let state = app.state::<AppState>();
    state.service_log_handles.lock().await.insert(
        ServiceKey {
            scene_name: scene_name.to_string(),
            service_id: service_id.to_string(),
        },
        logs_handle,
    );

    Ok(())
}

pub async fn stop_emitting_service_logs(
    state: State<'_, AppState>,
    scene_name: &str,
    service_id: &str,
) -> Result<(), String> {
    let service_log_handles = state.service_log_handles.lock().await;
    let log_handle = service_log_handles.get(&ServiceKey {
        scene_name: scene_name.to_string(),
        service_id: service_id.to_string(),
    });

    match log_handle {
        Some(log_handle) => {
            log_handle.abort();
            Ok(())
        }
        None => Err(format!(
            "Could not find the log emitting process for scene {} and service {}",
            scene_name, service_id
        )),
    }
}

#[derive(Serialize, Clone)]
enum ServiceStatus {
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "paused")]
    Paused,
    #[serde(rename = "loading")]
    Loading,
    #[serde(rename = "error")]
    Error,
}

#[derive(Serialize, Clone)]
struct ServiceStatusEventPayload {
    status: ServiceStatus,
    message: Option<String>,
}

pub async fn start_emitting_scene_status(app: &AppHandle, scene_name: &str) -> Result<(), String> {
    let docker = Docker::connect_with_socket_defaults()
        .map_err(|error| format!("Cannot connect to docker socket: {}", error))?;

    let service_ids: Vec<String> = get_scene_service_ids(scene_name)?;

    let service_status_handles = emit_services_status(app, scene_name, &docker, &service_ids);

    let state = app.state::<AppState>();
    state
        .service_status_handles
        .lock()
        .await
        .insert(scene_name.to_string(), service_status_handles);

    Ok(())
}

pub fn get_scene_service_ids(scene_name: &str) -> Result<Vec<String>, String> {
    let docker_compose_file = get_docker_compose_file(scene_name)?;
    let mut service_ids: Vec<String> = vec![];
    for (service_id, _) in docker_compose_file.services {
        service_ids.push(service_id);
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

                let external_services = get_scene_service_ids(scene_name)?;
                service_ids = service_ids
                    .into_iter()
                    .chain(external_services.into_iter())
                    .collect();
            }
        }
    }

    Ok(service_ids)
}

fn emit_services_status(
    app: &AppHandle,
    scene_name: &str,
    docker: &Docker,
    service_ids: &Vec<String>,
) -> Vec<JoinHandle<()>> {
    let mut status_handles = Vec::with_capacity(service_ids.len());

    for service_id in service_ids {
        let thread_app = app.to_owned();
        let thread_scene_name = scene_name.to_string();
        let thread_docker = docker.clone();
        let thread_service_id = service_id.to_string();

        let status_handle = spawn(async move {
            loop {
                let service_status_event_name =
                    &format!("{thread_scene_name}-{thread_service_id}-status-event");

                let container_name = loop {
                    match get_container_names_from_services(&thread_scene_name) {
                        Err(err) => {
                            thread_app
                                .emit_all(
                                    service_status_event_name.as_ref(),
                                    ServiceStatusEventPayload {
                                        status: ServiceStatus::Error,
                                        message: Some(format!("Error getting containers: {}", err)),
                                    },
                                )
                                .unwrap();
                        }
                        Ok(service_name_map) => {
                            let container_name = service_name_map.get(&thread_service_id);

                            match container_name {
                                Some(container_name) => break container_name.to_string(),
                                None => {
                                    thread_app
                                        .emit_all(
                                            service_status_event_name,
                                            ServiceStatusEventPayload {
                                                status: ServiceStatus::Paused,
                                                message: Some(
                                                    "Status: unexisting container".to_string(),
                                                ),
                                            },
                                        )
                                        .unwrap();
                                }
                            }

                            sleep(Duration::from_secs(3)).await;
                        }
                    }
                };

                let inspect_result = thread_docker
                    .inspect_container(
                        container_name.as_ref(),
                        Some(InspectContainerOptions { size: false }),
                    )
                    .await;

                match inspect_result {
                    Ok(container) => match &container.state {
                        Some(state) => match &state.health {
                            Some(health) => match health.status {
                                Some(status) => match status {
                                    HealthStatusEnum::EMPTY | HealthStatusEnum::NONE => {
                                        emit_service_status_by_status(
                                            &thread_app,
                                            state,
                                            service_status_event_name,
                                        )
                                    }
                                    status => {
                                        thread_app
                                            .emit_all(
                                                service_status_event_name,
                                                ServiceStatusEventPayload {
                                                    status: get_service_status_from_health_status(
                                                        status,
                                                    )
                                                    .unwrap(),
                                                    message: Some(format!("Status: {}", status)),
                                                },
                                            )
                                            .unwrap();
                                    }
                                },
                                None => emit_service_status_by_status(
                                    &thread_app,
                                    state,
                                    service_status_event_name,
                                ),
                            },
                            None => emit_service_status_by_status(
                                &thread_app,
                                state,
                                service_status_event_name,
                            ),
                        },
                        None => {
                            thread_app
                                .emit_all(
                                    service_status_event_name,
                                    ServiceStatusEventPayload {
                                        status: ServiceStatus::Paused,
                                        message: None,
                                    },
                                )
                                .unwrap();
                        }
                    },
                    Err(error) => {
                        thread_app
                            .emit_all(
                                service_status_event_name,
                                ServiceStatusEventPayload {
                                    status: ServiceStatus::Error,
                                    message: Some(format!(
                                        "Error while retrieving service status: {}",
                                        error
                                    )),
                                },
                            )
                            .unwrap();
                    }
                }

                sleep(Duration::from_secs(3)).await;
            }
        });

        status_handles.push(status_handle);
    }

    status_handles
}

fn emit_service_status_by_status(
    app: &AppHandle,
    state: &ContainerState,
    service_status_event_name: &str,
) {
    match state.status {
        Some(ContainerStateStatusEnum::EXITED) => {
            app.emit_all(
                service_status_event_name,
                ServiceStatusEventPayload {
                    status: ServiceStatus::Paused,
                    message: Some(format!(
                        "Container has exited with exit code {}",
                        state
                            .exit_code
                            .map(|exit_code| exit_code.to_string())
                            .unwrap_or("Unknown".to_string())
                    )),
                },
            )
            .unwrap();
        }
        Some(status) => {
            app.emit_all(
                service_status_event_name,
                ServiceStatusEventPayload {
                    status: get_service_status_from_container_status(status),
                    message: Some(format!("Status: {}", status)),
                },
            )
            .unwrap();
        }
        None => {
            app.emit_all(
                service_status_event_name,
                ServiceStatusEventPayload {
                    status: ServiceStatus::Paused,
                    message: None,
                },
            )
            .unwrap();
        }
    }
}

fn get_service_status_from_container_status(
    conatiner_status: ContainerStateStatusEnum,
) -> ServiceStatus {
    match conatiner_status {
        ContainerStateStatusEnum::CREATED
        | ContainerStateStatusEnum::REMOVING
        | ContainerStateStatusEnum::RESTARTING => ServiceStatus::Loading,
        ContainerStateStatusEnum::RUNNING => ServiceStatus::Running,
        ContainerStateStatusEnum::EXITED
        | ContainerStateStatusEnum::DEAD
        | ContainerStateStatusEnum::EMPTY
        | ContainerStateStatusEnum::PAUSED => ServiceStatus::Paused,
    }
}

fn get_service_status_from_health_status(health_status: HealthStatusEnum) -> Option<ServiceStatus> {
    match health_status {
        HealthStatusEnum::HEALTHY => Some(ServiceStatus::Running),
        HealthStatusEnum::UNHEALTHY => Some(ServiceStatus::Error),
        HealthStatusEnum::STARTING => Some(ServiceStatus::Loading),
        HealthStatusEnum::EMPTY | HealthStatusEnum::NONE => None,
    }
}

pub async fn stop_emitting_scene_status(
    state: State<'_, AppState>,
    scene_name: &str,
) -> Result<(), String> {
    let service_status_handles = state.service_status_handles.lock().await;
    let status_handles = service_status_handles.get(scene_name);

    if let Some(status_handles) = status_handles {
        for status_handle in status_handles {
            status_handle.abort();
        }
    }

    Ok(())
}

pub fn add_dependency(scene_name: &str, service_id: &str, depends_on: &str) -> Result<(), String> {
    let mut docker_compose = get_docker_compose_file(scene_name)?;

    let service = docker_compose
        .services
        .get_mut(service_id)
        .ok_or(format!("Cannot find service {service_id} in storage"))?;

    let dependencies = match service.depends_on.as_mut() {
        None => {
            let _ = service.depends_on.insert(HashMap::new());
            service.depends_on.as_mut().unwrap()
        }
        Some(x) => x,
    };

    dependencies.insert(
        depends_on.to_string(),
        DockerComposeDependsOn {
            ..Default::default()
        },
    );

    write_docker_compose_file(scene_name, &docker_compose)
}

pub fn remove_dependency(
    scene_name: &str,
    service_id: &str,
    depends_on: &str,
) -> Result<(), String> {
    let mut docker_compose = get_docker_compose_file(scene_name)?;

    let service_depends_on = docker_compose
        .services
        .get_mut(service_id)
        .ok_or(format!("Cannot find service {service_id} in storage"))?
        .depends_on
        .as_mut();

    match service_depends_on {
        None => {}
        Some(x) => match x.remove(depends_on) {
            None => {}
            Some(_) => {
                write_docker_compose_file(scene_name, &docker_compose)?;
            }
        },
    }

    Ok(())
}

pub fn set_depends_on_condition(
    scene_name: &str,
    service_id: &str,
    depends_on: &str,
    condition: &str,
) -> Result<(), String> {
    let mut docker_compose = get_docker_compose_file(scene_name)?;

    let service = docker_compose
        .services
        .get_mut(service_id)
        .ok_or(format!("Cannot find service {service_id} in storage"))?;

    let dependencies_map = service.depends_on.as_mut().ok_or(format!(
        "Cannot find dependency key in {service_id} in storage"
    ))?;

    dependencies_map
        .get_mut(depends_on)
        .ok_or(format!(
            "Cannot find dependency {depends_on} in {service_id} in storage"
        ))?
        .condition = condition.to_string();

    write_docker_compose_file(scene_name, &docker_compose)
}
