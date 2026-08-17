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