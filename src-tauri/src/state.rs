use std::{collections::HashMap, sync::Arc};

use tokio::{sync::Mutex, task::JoinHandle};

#[derive(Eq, Hash, PartialEq)]
pub struct ServiceKey {
    pub scene_name: String,
    pub service_id: String,
}

pub struct AppState {
    pub service_log_handles: Arc<Mutex<HashMap<ServiceKey, JoinHandle<()>>>>,
    pub service_status_handles: Arc<Mutex<HashMap<ServiceKey, JoinHandle<()>>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            service_log_handles: Arc::new(Mutex::new(HashMap::new())),
            service_status_handles: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl AppState {
    pub fn new() -> Self {
        Self {
            ..Default::default()
        }
    }
}
