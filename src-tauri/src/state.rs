use std::{collections::HashMap, sync::Arc};

use tokio::{sync::Mutex, task::JoinHandle};

#[derive(Eq, Hash, PartialEq)]
pub struct ServiceKey {
    pub scene_name: String,
    pub service_id: String,
}

#[derive(Default)]
pub struct AppState {
    pub service_log_handles: Arc<Mutex<HashMap<ServiceKey, JoinHandle<()>>>>,
    pub service_status_handles: Arc<Mutex<HashMap<String, Vec<JoinHandle<()>>>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            ..Default::default()
        }
    }
}
