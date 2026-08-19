use tauri::{AppHandle, State, Manager};
use sqlx::SqlitePool;
use std::fs;

use uuid::Uuid;

#[derive(serde::Serialize, sqlx::FromRow)]
pub struct Attachment {
    pub id: i64,
    pub transaction_ref: String,
    pub original_filename: String,
    pub stored_filename: String,
    pub mime_type: Option<String>,
    pub size_bytes: Option<i64>,
}

#[tauri::command]
pub async fn save_attachment(
    app_handle: AppHandle,
    db: State<'_, SqlitePool>,
    transaction_ref: String,
    source_path: String,
    original_filename: String,
    mime_type: Option<String>,
) -> Result<Attachment, String> {
    let size_bytes = fs::metadata(&source_path)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    let stored_filename = format!("{}-{}", Uuid::new_v4(), original_filename);
    
    // Copy to app data dir
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|_| "Failed to get app data directory")?;
        
    let attachments_dir = app_dir.join("attachments");
    fs::create_dir_all(&attachments_dir).map_err(|e| e.to_string())?;
    
    let dest_path = attachments_dir.join(&stored_filename);
    fs::copy(&source_path, &dest_path).map_err(|e| e.to_string())?;

    // Save to DB
    let id = sqlx::query("INSERT INTO attachments (transaction_ref, original_filename, stored_filename, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)")
        .bind(&transaction_ref)
        .bind(&original_filename)
        .bind(&stored_filename)
        .bind(&mime_type)
        .bind(size_bytes)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    Ok(Attachment {
        id,
        transaction_ref,
        original_filename,
        stored_filename,
        mime_type,
        size_bytes: Some(size_bytes),
    })
}

#[tauri::command]
pub async fn get_attachments(
    db: State<'_, SqlitePool>,
    transaction_ref: String
) -> Result<Vec<Attachment>, String> {
    let attachments = sqlx::query_as::<_, Attachment>("SELECT * FROM attachments WHERE transaction_ref = ?")
        .bind(transaction_ref)
        .fetch_all(&*db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(attachments)
}

#[tauri::command]
pub async fn get_attachment_path(
    app_handle: AppHandle,
    stored_filename: String
) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|_| "Failed to get app data directory")?;
    let path = app_dir.join("attachments").join(stored_filename);
    Ok(path.to_string_lossy().into_owned())
}
