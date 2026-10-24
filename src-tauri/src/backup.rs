use std::fs;
use tauri::{AppHandle, Manager, State};

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
pub async fn backup_to_drive(
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
        let cfg: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'drive_backup_path'")
            .fetch_optional(&*db)
            .await
            .map_err(|e| e.to_string())?;
        if let Some((path_str,)) = cfg {
            std::path::PathBuf::from(path_str)
        } else {
            return Err("Drive backup folder is not configured. Please select your Google Drive or backup folder first.".into());
        }
    };

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to access drive directory: {}", e))?;
    }

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("mk_enterprises_v2.db");

    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H%M%S");
    let dest_filename = format!("Zawar_Traders_Drive_Backup_{}.db", timestamp);
    let dest_path = target_dir.join(&dest_filename);

    fs::copy(&db_path, &dest_path).map_err(|e| format!("Failed to copy backup to Drive: {}", e))?;

    let action_msg = format!("Drive Backup created: {}", dest_filename);
    let _ = crate::audit::log_audit(&db, &action_msg, "System").await;

    Ok(format!("Backup successfully created in Drive: {}", dest_path.to_string_lossy()))
}

#[tauri::command]
pub async fn get_drive_backup_path(db: State<'_, sqlx::SqlitePool>) -> Result<Option<String>, String> {
    let cfg: Option<(String,)> = sqlx::query_as("SELECT value FROM system_config WHERE key = 'drive_backup_path'")
        .fetch_optional(&*db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(cfg.map(|(v,)| v))
}

#[tauri::command]
pub async fn set_drive_backup_path(path: String, db: State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    sqlx::query("INSERT INTO system_config (key, value) VALUES ('drive_backup_path', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(path)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;
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
