use std::{fs, path::Path};

use tauri::api::path::home_dir;

use crate::commands::ServiceRelationship;

pub fn get_relationships(scene_name: &str) -> Result<Vec<ServiceRelationship>, String> {
    let relationships_filepath = Path::new(&home_dir().unwrap())
        .join(".dcompose-workbench/scenes")
        .join(scene_name)
        .join("relationships.json");

    let relationships_file_string = fs::read_to_string(&relationships_filepath)
        .map_err(|err| format!("Cannot find file {:?}: {}", relationships_filepath, err))?;

    serde_json::from_str::<Vec<ServiceRelationship>>(&relationships_file_string)
        .map_err(|err| format!("Cannot parse relationships.json: {}", err))
}
