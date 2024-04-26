use std::{collections::HashMap, sync::Arc};

use tokio::{sync::Mutex, task::JoinHandle};

pub struct AppState {
    pub container_log_handles: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            container_log_handles: Arc::new(Mutex::new(HashMap::new())),
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
