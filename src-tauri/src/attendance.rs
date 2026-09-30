use serde::{Serialize, Deserialize};
use sqlx::{SqlitePool, Row};
use tauri::State;

#[derive(Serialize, Deserialize, Debug)]
pub struct Worker {
    pub id: i64,
    pub name: String,
    pub designation: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AttendanceRecord {
    pub id: i64,
    pub account_id: i64,
    pub date: String,
    pub status: String,
    pub remarks: Option<String>,
}

#[tauri::command]
pub async fn get_workers(db: State<'_, SqlitePool>) -> Result<Vec<Worker>, String> {
    let pool = db.inner();
    let mut workers = Vec::new();
    
    // account_type_id = 15 is Staff / Employee
    let query = "SELECT id, name, designation FROM accounts WHERE account_type_id = 15 ORDER BY name";
    let rows = sqlx::query(query).fetch_all(&*pool).await.map_err(|e| e.to_string())?;
    
    for row in rows {
        workers.push(Worker {
            id: row.try_get("id").unwrap_or(0),
            name: row.try_get("name").unwrap_or_default(),
            designation: row.try_get("designation").ok(),
        });
    }
    
    Ok(workers)
}

#[tauri::command]
pub async fn get_attendance(date: String, db: State<'_, SqlitePool>) -> Result<Vec<AttendanceRecord>, String> {
    let pool = db.inner();
    let mut records = Vec::new();
    
    let query = "SELECT id, account_id, date, status, remarks FROM attendance WHERE date = ?";
    let rows = sqlx::query(query).bind(date).fetch_all(&*pool).await.map_err(|e| e.to_string())?;
    
    for row in rows {
        records.push(AttendanceRecord {
            id: row.try_get("id").unwrap_or(0),
            account_id: row.try_get("account_id").unwrap_or(0),
            date: row.try_get("date").unwrap_or_default(),
            status: row.try_get("status").unwrap_or_default(),
            remarks: row.try_get("remarks").ok(),
        });
    }
    
    Ok(records)
}

#[derive(Deserialize)]
pub struct AttendanceInput {
    pub account_id: i64,
    pub status: String, // 'PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'
    pub remarks: Option<String>,
}

#[tauri::command]
pub async fn mark_attendance(date: String, records: Vec<AttendanceInput>, db: State<'_, SqlitePool>) -> Result<(), String> {
    let pool = db.inner();
    
    // Start transaction
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    for record in records {
        let check_query = "SELECT id FROM attendance WHERE account_id = ? AND date = ?";
        let exists = sqlx::query(check_query)
            .bind(record.account_id)
            .bind(&date)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
            
        if exists.is_some() {
            let update_query = "UPDATE attendance SET status = ?, remarks = ? WHERE account_id = ? AND date = ?";
            sqlx::query(update_query)
                .bind(&record.status)
                .bind(&record.remarks)
                .bind(record.account_id)
                .bind(&date)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        } else {
            let insert_query = "INSERT INTO attendance (account_id, date, status, remarks) VALUES (?, ?, ?, ?)";
            sqlx::query(insert_query)
                .bind(record.account_id)
                .bind(&date)
                .bind(&record.status)
                .bind(&record.remarks)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
    }
    
    tx.commit().await.map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn quick_add_worker(name: String, designation: Option<String>, db: tauri::State<'_, sqlx::SqlitePool>) -> Result<(), String> {
    let pool = db.inner();
    let query = "INSERT INTO accounts (account_type_id, name, designation, opening_balance, opening_balance_type) VALUES (15, ?, ?, 0.0, 'CREDIT')";
    sqlx::query(query)
        .bind(name)
        .bind(designation)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_worker_attendance_history(account_id: i64, db: tauri::State<'_, sqlx::SqlitePool>) -> Result<Vec<AttendanceRecord>, String> {
    let pool = db.inner();
    let mut records = Vec::new();
    
    let query = "SELECT id, account_id, date, status, remarks FROM attendance WHERE account_id = ? ORDER BY date DESC LIMIT 31";
    let rows = sqlx::query(query).bind(account_id).fetch_all(pool).await.map_err(|e| e.to_string())?;
    
    for row in rows {
        use sqlx::Row;
        records.push(AttendanceRecord {
            id: row.try_get("id").unwrap_or(0),
            account_id: row.try_get("account_id").unwrap_or(0),
            date: row.try_get("date").unwrap_or_default(),
            status: row.try_get("status").unwrap_or_default(),
            remarks: row.try_get("remarks").ok(),
        });
    }
    
    Ok(records)
}
