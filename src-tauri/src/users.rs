use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;
use argon2::{
    password_hash::{
        
        rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use crate::audit::log_audit;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub role: String,
    pub status: String,
}

#[tauri::command]
pub async fn get_users(db: State<'_, SqlitePool>) -> Result<Vec<User>, String> {
    sqlx::query_as::<_, User>("SELECT id, username, role, status FROM users ORDER BY username ASC")
        .fetch_all(&*db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_user(
    username: String,
    password_plain: String,
    role: String,
    db: State<'_, SqlitePool>,
) -> Result<i64, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password_plain.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();

    let id = sqlx::query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
        .bind(&username)
        .bind(password_hash)
        .bind(&role)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?
        .last_insert_rowid();

    let _ = log_audit(&*db, &format!("Created user '{}' with role '{}'", username, role), "System").await;
    Ok(id)
}

#[tauri::command]
pub async fn update_user(
    id: i64,
    username: String,
    password_plain: Option<String>,
    role: String,
    status: String,
    db: State<'_, SqlitePool>,
) -> Result<(), String> {
    if let Some(pwd) = password_plain {
        if !pwd.is_empty() {
            let salt = SaltString::generate(&mut OsRng);
            let argon2 = Argon2::default();
            let password_hash = argon2.hash_password(pwd.as_bytes(), &salt)
                .map_err(|e| e.to_string())?
                .to_string();

            sqlx::query("UPDATE users SET username = ?, password_hash = ?, role = ?, status = ? WHERE id = ?")
                .bind(&username)
                .bind(password_hash)
                .bind(&role)
                .bind(&status)
                .bind(id)
                .execute(&*db)
                .await
                .map_err(|e| e.to_string())?;
            let _ = log_audit(&*db, &format!("Updated user '{}' (including password) to role '{}'", username, role), "System").await;
            return Ok(());
        }
    }

    sqlx::query("UPDATE users SET username = ?, role = ?, status = ? WHERE id = ?")
        .bind(&username)
        .bind(&role)
        .bind(&status)
        .bind(id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;

    let _ = log_audit(&*db, &format!("Updated user '{}' to role '{}'", username, role), "System").await;
    Ok(())
}

#[tauri::command]
pub async fn delete_user(id: i64, db: State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;
    
    let _ = log_audit(&*db, &format!("Deleted user ID {}", id), "System").await;
    Ok(())
}
