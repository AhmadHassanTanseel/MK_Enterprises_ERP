use std::fs;
use tauri::{AppHandle, Manager, State};

fn to_base64(bytes: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };
        result.push(CHARSET[(b0 >> 2) as usize] as char);
        result.push(CHARSET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARSET[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARSET[(b2 & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

fn from_base64(s: &str) -> Result<Vec<u8>, String> {
    let mut table = [255u8; 256];
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (i, &c) in CHARSET.iter().enumerate() {
        table[c as usize] = i as u8;
    }
    let s = s.trim().trim_end_matches('=');
    let mut result = Vec::with_capacity(s.len() * 3 / 4);
    let bytes = s.as_bytes();
    for chunk in bytes.chunks(4) {
        let c0 = table[*chunk.get(0).unwrap_or(&b'=') as usize];
        let c1 = table[*chunk.get(1).unwrap_or(&b'=') as usize];
        if c0 == 255 || c1 == 255 { return Err("Invalid base64 payload".into()); }
        result.push((c0 << 2) | (c1 >> 4));
        if chunk.len() > 2 {
            let c2 = table[chunk[2] as usize];
            if c2 == 255 { return Err("Invalid base64 payload".into()); }
            result.push(((c1 & 0x0F) << 4) | (c2 >> 2));
            if chunk.len() > 3 {
                let c3 = table[chunk[3] as usize];
                if c3 == 255 { return Err("Invalid base64 payload".into()); }
                result.push(((c2 & 0x03) << 6) | c3);
            }
        }
    }
    Ok(result)
}

pub async fn perform_backup(app_handle: AppHandle, db: &sqlx::SqlitePool) -> Result<String, String> {
    // Force WAL checkpoint before backup so the .db file contains all data
    let _ = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE);").execute(db).await;

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("mk_enterprises_v2.db");
    let backup_dir = app_dir.join("backups");
    
    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    }
    
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let backup_path = backup_dir.join(format!("Zawar_Traders_Backup_{}.db", timestamp));
    
    fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
    
    Ok(format!("Backup created: {}", backup_path.to_string_lossy()))
}

#[tauri::command]
pub async fn check_internet_connection() -> Result<bool, String> {
    use std::net::TcpStream;
    use std::time::Duration;
    // Check connection to Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1)
    let addrs = ["8.8.8.8:53", "1.1.1.1:53"];
    for addr in addrs {
        if let Ok(socket_addr) = addr.parse() {
            if TcpStream::connect_timeout(&socket_addr, Duration::from_millis(2000)).is_ok() {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

#[tauri::command]
pub async fn get_local_backup_path(db: State<'_, sqlx::SqlitePool>) -> Result<Option<String>, String> {
    let cfg: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'local_backup_path'")
        .fetch_optional(&*db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(cfg.map(|(v,)| v))
}

#[tauri::command]
pub async fn set_local_backup_path(path: String, db: State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    sqlx::query("INSERT INTO system_config (key, value) VALUES ('local_backup_path', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(path)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn backup_to_local(
    custom_path: Option<String>,
    app_handle: AppHandle,
    db: State<'_, sqlx::SqlitePool>
) -> Result<String, String> {
    // 1. Force WAL checkpoint
    let _ = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE);").execute(&*db).await;

    // 2. Resolve target folder
    let target_dir = if let Some(p) = custom_path {
        std::path::PathBuf::from(p)
    } else {
        let cfg: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'local_backup_path'")
            .fetch_optional(&*db)
            .await
            .map_err(|e| e.to_string())?;
        if let Some((path_str,)) = cfg {
            std::path::PathBuf::from(path_str)
        } else {
            let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
            app_dir.join("backups")
        }
    };

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create backup directory: {}", e))?;
    }

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("mk_enterprises_v2.db");

    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H%M%S");
    let dest_filename = format!("Zawar_Traders_Backup_{}.db", timestamp);
    let dest_path = target_dir.join(&dest_filename);

    fs::copy(&db_path, &dest_path).map_err(|e| format!("Failed to create backup: {}", e))?;

    let action_msg = format!("Local Backup created: {}", dest_filename);
    let _ = crate::audit::log_audit(&db, &action_msg, "Operator").await;

    Ok(format!("Backup successfully created: {}", dest_path.to_string_lossy()))
}

#[tauri::command]
pub async fn backup_to_drive(
    custom_path: Option<String>,
    app_handle: AppHandle,
    db: State<'_, sqlx::SqlitePool>
) -> Result<String, String> {
    backup_to_local(custom_path, app_handle, db).await
}

#[tauri::command]
pub async fn get_drive_backup_path(db: State<'_, sqlx::SqlitePool>) -> Result<Option<String>, String> {
    get_local_backup_path(db).await
}

#[tauri::command]
pub async fn set_drive_backup_path(path: String, db: State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    set_local_backup_path(path, db).await
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct CloudBackupPayload {
    pub filename: String,
    pub base64: String,
    pub size_bytes: usize,
}

#[tauri::command]
pub async fn prepare_cloud_backup(
    app_handle: AppHandle,
    db: State<'_, sqlx::SqlitePool>
) -> Result<CloudBackupPayload, String> {
    // 1. Force WAL checkpoint
    let _ = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE);").execute(&*db).await;

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("mk_enterprises_v2.db");

    let bytes = fs::read(&db_path).map_err(|e| format!("Failed to read database: {}", e))?;
    let size_bytes = bytes.len();
    let b64 = to_base64(&bytes);

    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H%M%S");
    let filename = format!("Zawar_Traders_Cloud_Backup_{}.db", timestamp);

    Ok(CloudBackupPayload {
        filename,
        base64: b64,
        size_bytes,
    })
}

#[tauri::command]
pub async fn restore_cloud_backup(
    base64_data: String,
    app_handle: AppHandle,
    db: State<'_, sqlx::SqlitePool>
) -> Result<String, String> {
    let bytes = from_base64(&base64_data)?;
    if bytes.len() < 4096 {
        return Err("Invalid cloud backup: file is too small.".into());
    }
    if !bytes.starts_with(b"SQLite format 3\0") {
        return Err("Invalid cloud backup: not a valid SQLite database.".into());
    }

    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join(format!("zawar_cloud_restore_{}.db", chrono::Local::now().timestamp()));
    fs::write(&temp_file, &bytes).map_err(|e| format!("Failed to write temporary restore file: {}", e))?;

    let res = restore_database(temp_file.to_string_lossy().to_string(), app_handle, db).await;
    let _ = fs::remove_file(temp_file);
    res
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct CloudConfig {
    pub cloud_url: Option<String>,
    pub access_token: Option<String>,
    pub last_sync: Option<String>,
}

#[tauri::command]
pub async fn get_cloud_config(db: State<'_, sqlx::SqlitePool>) -> Result<CloudConfig, String> {
    let url: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'gdrive_cloud_url'")
        .fetch_optional(&*db).await.unwrap_or(None);
    let token: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'gdrive_access_token'")
        .fetch_optional(&*db).await.unwrap_or(None);
    let last_sync: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'gdrive_last_sync'")
        .fetch_optional(&*db).await.unwrap_or(None);
    Ok(CloudConfig {
        cloud_url: url.map(|(v,)| v),
        access_token: token.map(|(v,)| v),
        last_sync: last_sync.map(|(v,)| v),
    })
}

#[tauri::command]
pub async fn set_cloud_config(cloud_url: Option<String>, access_token: Option<String>, db: State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    if let Some(u) = cloud_url {
        sqlx::query("INSERT INTO system_config (key, value) VALUES ('gdrive_cloud_url', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(u).execute(&*db).await.map_err(|e| e.to_string())?;
    }
    if let Some(t) = access_token {
        sqlx::query("INSERT INTO system_config (key, value) VALUES ('gdrive_access_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(t).execute(&*db).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn record_cloud_sync_time(db: State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    sqlx::query("INSERT INTO system_config (key, value) VALUES ('gdrive_last_sync', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(now).execute(&*db).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn restore_database(
    file_path: String,
    app_handle: AppHandle,
    db: tauri::State<'_, sqlx::SqlitePool>
) -> Result<String, String> {
    // Validate backup integrity (basic check: is it a sqlite file?)
    let metadata = fs::metadata(&file_path).map_err(|e| e.to_string())?;
    if metadata.len() < 4096 {
        return Err("Invalid backup file: file is too small.".into());
    }
    let header = fs::read(&file_path).map_err(|e| e.to_string())?;
    if !header.starts_with(b"SQLite format 3\0") {
        return Err("Invalid backup file: not a SQLite database.".into());
    }

    // Backup current DB first
    let _ = perform_backup(app_handle.clone(), &*db).await;

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("mk_enterprises_v2.db");

    // Close the DB pool before overwriting
    db.close().await;

    // Overwrite the DB file
    fs::copy(&file_path, &db_path).map_err(|e| format!("Failed to restore: {}", e))?;

    // We successfully replaced it. For safety, the app should be restarted.
    Ok("Database restored successfully. Please restart the application.".into())
}

#[tauri::command]
pub async fn restart_app(app_handle: tauri::AppHandle) -> Result<(), String> {
    app_handle.restart();
}
