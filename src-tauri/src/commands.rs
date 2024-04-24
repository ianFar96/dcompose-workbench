use serde::{Deserialize, Serialize};

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

#[tauri::command]
pub fn get_scene() -> Scene {
    Scene {
        services: vec![
            Service {
                id: "1".to_string(),
                label: "patata".to_string(),
                type_name: "svc".to_string(),
            },
            Service {
                id: "2".to_string(),
                label: "patata".to_string(),
                type_name: "svc".to_string(),
            },
            Service {
                id: "3".to_string(),
                label: "patata".to_string(),
                type_name: "svc".to_string(),
            },
            Service {
                id: "4".to_string(),
                label: "patata".to_string(),
                type_name: "svc".to_string(),
            },
        ],
        relationships: vec![ServiceRelationship {
            source: "1".to_string(),
            target: "2".to_string(),
        }],
    }
}
