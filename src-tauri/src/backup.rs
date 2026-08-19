use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[tauri::command]
pub fn perform_backup(app_handle: AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("mk_enterprises_v2.db");
    let backup_dir = app_dir.join("backups");
    
    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    }
    
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let backup_path = backup_dir.join(format!("backup_{}.db", timestamp));
    
    fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
    
    Ok(format!("Backup created: {}", backup_path.to_string_lossy()))
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

    // Backup current DB
    perform_backup(app_handle.clone())?;

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("mk_enterprises_v2.db");

    // Close the DB pool before overwriting
    db.close().await;

    // Overwrite the DB file
    fs::copy(&file_path, &db_path).map_err(|e| format!("Failed to restore: {}", e))?;

    // We successfully replaced it. For safety, the app should be restarted.
    app_handle.restart();

    Ok("Database restored successfully. Restarting application...".into())
}