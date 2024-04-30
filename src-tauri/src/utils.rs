use std::{path::{Path, PathBuf}, time::SystemTime};

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
    Path::new(&home_dir().unwrap())
        .join(".dcompose-workbench")
}