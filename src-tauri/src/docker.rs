use bollard::{
    container::{InspectContainerOptions, ListContainersOptions},
    secret::{ContainerState, ContainerStateStatusEnum, HealthStatusEnum},
    Docker,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::Duration,
};
use tauri::{api::path::home_dir, AppHandle, Manager};
use tokio::{spawn, time::sleep};

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

pub fn start_emitting_service_logs() {
    // let arc_docker_clone = arc_docker.clone();
    // let arc_container_name_clone = arc_container_name.clone();
    // let logs_handle = spawn(async move {
    //     let logs = &arc_docker_clone
    //         .logs(
    //             arc_container_name_clone.as_ref(),
    //             Some(LogsOptions::<String> {
    //                 stderr: true,
    //                 stdout: true,
    //                 timestamps: true,
    //                 ..Default::default()
    //             }),
    //         )
    //         .try_collect::<Vec<_>>()
    //         .await
    //         .unwrap();

    //     for log in logs {
    //         match log {
    //             LogOutput::StdErr { message: _ } => println!("Error: {}", log),
    //             LogOutput::StdIn { message: _ } => println!("{}", log),
    //             _ => {}
    //         }
    //     }
    // });
}

#[derive(Serialize, Clone)]
pub enum ServiceStatus {
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
pub struct ServiceStatusEventPayload {
    status: ServiceStatus,
    message: Option<String>,
}

pub fn start_emitting_service_status(
    app: &AppHandle,
    scene_name: &str,
    service_id: &str,
) -> Result<(), String> {
    // TODO: out this in state
    let docker = Docker::connect_with_socket_defaults()
        .map_err(|error| format!("Cannot connect to docker socket: {}", error))?;

    let container_name = format!("{}-{}", scene_name, service_id);
    let app = app.to_owned();

    // TODO: put handle in state
    let _status_handle = spawn(async move {
        loop {
            let service_status_event_name = &format!("{container_name}-status-event");
            match does_container_exist(&docker, &container_name).await {
                Ok(true) => {
                    let inspect_result = docker
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
                                                &app,
                                                state,
                                                service_status_event_name,
                                            )
                                        }
                                        status => {
                                            app.emit_all(
                                                service_status_event_name,
                                                ServiceStatusEventPayload {
                                                    status: get_service_status_from_health_status(status).unwrap(),
                                                    message: Some(format!("Status: {}", status)),
                                                },
                                            )
                                            .unwrap();
                                        }
                                    },
                                    None => emit_service_status_by_status(
                                        &app,
                                        state,
                                        service_status_event_name,
                                    ),
                                },
                                None => emit_service_status_by_status(
                                    &app,
                                    state,
                                    service_status_event_name,
                                ),
                            },
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
                        },
                        Err(error) => {
                            app.emit_all(
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
                }
                Ok(false) => {
                    app.emit_all(
                        service_status_event_name,
                        ServiceStatusEventPayload {
                            status: ServiceStatus::Paused,
                            message: None,
                        },
                    )
                    .unwrap();
                }
                Err(error) => {
                    app.emit_all(
                        service_status_event_name,
                        ServiceStatusEventPayload {
                            status: ServiceStatus::Error,
                            message: Some(error),
                        },
                    )
                    .unwrap();
                }
            }

            sleep(Duration::from_secs(1)).await;
        }
    });

    Ok(())
}

async fn does_container_exist(docker: &Docker, container_name: &str) -> Result<bool, String> {
    let mut filters = HashMap::new();
    filters.insert("name", vec![container_name]);

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    let response = docker
        .list_containers(options)
        .await
        .map_err(|error| format!("Cannot retrieve conatiners list: {}", error))?;

    Ok(!response.is_empty())
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
