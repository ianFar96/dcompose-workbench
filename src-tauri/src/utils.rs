use std::{
    path::{Path, PathBuf}, process::Command, time::SystemTime
};

use chrono::{DateTime, Utc};
use tauri::api::path::home_dir;

pub fn get_formatted_date(date: Option<DateTime<Utc>>) -> String {
    let date: DateTime<Utc> = match date {
        None => SystemTime::now().into(),
        Some(x) => x,
    };
    date.format("%d/%m/%Y %H:%M:%S").to_string()
}

pub fn get_config_dirpath() -> PathBuf {
    Path::new(&home_dir().unwrap()).join(".dcompose-workbench")
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
