use std::{
    fs,
    path::{Path, PathBuf},
};

use tauri::api::path::home_dir;

use crate::commands::ServiceRelationship;

fn get_relationships_filepath(scene_name: &str) -> PathBuf {
    Path::new(&home_dir().unwrap())
        .join(".dcompose-workbench/scenes")
        .join(scene_name)
        .join("relationships.json")
}

pub fn get_relationships(scene_name: &str) -> Result<Vec<ServiceRelationship>, String> {
    let relationships_filepath = get_relationships_filepath(scene_name);

    let relationships_file_string = fs::read_to_string(&relationships_filepath)
        .map_err(|err| format!("Cannot find file {:?}: {}", relationships_filepath, err))?;

    serde_json::from_str::<Vec<ServiceRelationship>>(&relationships_file_string)
        .map_err(|err| format!("Cannot parse relationships.json: {}", err))
}

pub fn create_relationship(scene_name: &str, source: &str, target: &str) -> Result<(), String> {
    let mut relationships = get_relationships(scene_name)?;
    relationships.push(ServiceRelationship {
        source: source.to_string(),
        target: target.to_string(),
    });

    let relationships_filepath = get_relationships_filepath(scene_name);
    fs::write(
        relationships_filepath,
        serde_json::to_string(&relationships).unwrap(),
    )
    .map_err(|err| format!("Could not save relationships config: {}", err))
}

pub fn delete_relationship(scene_name: &str, source: &str, target: &str) -> Result<(), String> {
    let relationships = get_relationships(scene_name)?;
    let relationships: Vec<ServiceRelationship> = relationships
        .into_iter()
        .filter(|relationship| relationship.source != source || relationship.target != target)
        .collect();

    let relationships_filepath = get_relationships_filepath(scene_name);
    fs::write(
        relationships_filepath,
        serde_json::to_string(&relationships).unwrap(),
    )
    .map_err(|err| format!("Could not save relationships config: {}", err))
}
