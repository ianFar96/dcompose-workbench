use std::time::SystemTime;

use chrono::{DateTime, Utc};

pub fn get_formatted_date(date: Option<DateTime<Utc>>) -> String {
    let date: DateTime<Utc> = match date {
        None => SystemTime::now().into(),
        Some(x) => x,
    };
    date.format("%d/%m/%Y %H:%M:%S").to_string()
}
