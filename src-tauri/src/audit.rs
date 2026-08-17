use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id: i64,
    pub action: String,
    pub user_name: String,
    pub timestamp: String,
}

pub async fn log_audit(pool: &SqlitePool, action: &str, user_name: &str) -> Result<(), String> {
    sqlx::query("INSERT INTO audit_logs (action, user_name) VALUES (?, ?)")
        .bind(action)
        .bind(user_name)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_audit_logs(db: State<'_, SqlitePool>) -> Result<Vec<AuditLog>, String> {
    sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT
            id,
            action,
            user_name,
            datetime(created_at, 'localtime') as timestamp
        FROM audit_logs
        ORDER BY id DESC
        LIMIT 500
        "#,
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}
