use std::time::SystemTime;

use chrono::{DateTime, Utc, };

pub fn get_now_iso_8601() -> String {
    let now = SystemTime::now();
    let now: DateTime<Utc> = now.into();
    now.to_rfc3339()
}
