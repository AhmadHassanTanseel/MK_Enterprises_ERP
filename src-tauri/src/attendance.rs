use serde::{Serialize, Deserialize};
use sqlx::{SqlitePool, Row};
use tauri::State;
use chrono::NaiveDate;

#[derive(Serialize, Deserialize, Debug)]
pub struct Worker {
    pub id: i64,
    pub name: String,
    pub designation: Option<String>,
    pub contact: Option<String>,
    pub wage_type: Option<String>, // 'MONTHLY' | 'DAILY'
    pub salary_rate: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AttendanceRecord {
    pub id: i64,
    pub account_id: i64,
    pub date: String,
    pub status: String,
    pub remarks: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WorkerSalarySummary {
    pub account_id: i64,
    pub name: String,
    pub designation: Option<String>,
    pub contact: Option<String>,
    pub wage_type: String,
    pub salary_rate: f64,
    pub total_days: i64,
    pub present_days: i64,
    pub absent_days: i64,
    pub half_days: i64,
    pub leave_days: i64,
    pub per_day_rate: f64,
    pub total_earned: f64,
    pub deductions: f64,
    pub advance_paid: f64,
    pub salary_already_paid: f64,
    pub net_payable: f64,
}

#[tauri::command]
pub async fn get_workers(db: State<'_, SqlitePool>) -> Result<Vec<Worker>, String> {
    let pool = db.inner();
    let mut workers = Vec::new();
    
    // account_type_id = 15 is Staff / Employee
    let query = "SELECT id, name, designation, contact, COALESCE(wage_type, 'MONTHLY') as wage_type, COALESCE(salary_rate, 0.0) as salary_rate FROM accounts WHERE account_type_id = 15 AND status = 'ACTIVE' ORDER BY name";
    let rows = sqlx::query(query).fetch_all(&*pool).await.map_err(|e| e.to_string())?;
    
    for row in rows {
        workers.push(Worker {
            id: row.try_get("id").unwrap_or(0),
            name: row.try_get("name").unwrap_or_default(),
            designation: row.try_get("designation").ok(),
            contact: row.try_get("contact").ok(),
            wage_type: row.try_get("wage_type").ok(),
            salary_rate: row.try_get("salary_rate").ok(),
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
pub async fn quick_add_worker(
    name: String, 
    designation: Option<String>, 
    contact: Option<String>,
    wage_type: Option<String>,
    salary_rate: Option<f64>,
    db: tauri::State<'_, sqlx::SqlitePool>
) -> Result<i64, String> {
    let pool = db.inner();
    let w_type = wage_type.unwrap_or_else(|| "MONTHLY".to_string());
    let rate = salary_rate.unwrap_or(0.0);
    let query = "INSERT INTO accounts (account_type_id, name, designation, contact, wage_type, salary_rate, opening_balance, opening_balance_type) VALUES (15, ?, ?, ?, ?, ?, 0.0, 'CREDIT')";
    let res = sqlx::query(query)
        .bind(name)
        .bind(designation)
        .bind(contact)
        .bind(w_type)
        .bind(rate)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(res.last_insert_rowid())
}

#[tauri::command]
pub async fn update_worker(
    id: i64,
    name: String,
    designation: Option<String>,
    contact: Option<String>,
    wage_type: Option<String>,
    salary_rate: Option<f64>,
    db: tauri::State<'_, sqlx::SqlitePool>
) -> Result<(), String> {
    let pool = db.inner();
    let w_type = wage_type.unwrap_or_else(|| "MONTHLY".to_string());
    let rate = salary_rate.unwrap_or(0.0);
    sqlx::query("UPDATE accounts SET name = ?, designation = ?, contact = ?, wage_type = ?, salary_rate = ? WHERE id = ?")
        .bind(name)
        .bind(designation)
        .bind(contact)
        .bind(w_type)
        .bind(rate)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_worker(
    id: i64,
    db: tauri::State<'_, sqlx::SqlitePool>
) -> Result<(), String> {
    let pool = db.inner();
    sqlx::query("UPDATE accounts SET status = 'INACTIVE' WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_worker_attendance_history(account_id: i64, db: tauri::State<'_, sqlx::SqlitePool>) -> Result<Vec<AttendanceRecord>, String> {
    let pool = db.inner();
    let mut records = Vec::new();
    
    let query = "SELECT id, account_id, date, status, remarks FROM attendance WHERE account_id = ? ORDER BY date DESC LIMIT 400";
    let rows = sqlx::query(query).bind(account_id).fetch_all(pool).await.map_err(|e| e.to_string())?;
    
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

#[tauri::command]
pub async fn get_salary_summary(
    start_date: String,
    end_date: String,
    db: State<'_, SqlitePool>,
) -> Result<Vec<WorkerSalarySummary>, String> {
    let pool = db.inner();

    let days_count = if let (Ok(s), Ok(e)) = (
        NaiveDate::parse_from_str(&start_date, "%Y-%m-%d"),
        NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
    ) {
        let diff = (e - s).num_days() + 1;
        if diff > 0 { diff } else { 30 }
    } else {
        30
    };

    let query = "SELECT id, name, designation, contact, COALESCE(wage_type, 'MONTHLY') as wage_type, COALESCE(salary_rate, 0.0) as salary_rate FROM accounts WHERE account_type_id = 15 AND status = 'ACTIVE' ORDER BY name";
    let rows = sqlx::query(query).fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    let mut summaries = Vec::new();

    for row in rows {
        let worker_id: i64 = row.try_get("id").unwrap_or(0);
        let name: String = row.try_get("name").unwrap_or_default();
        let designation: Option<String> = row.try_get("designation").ok();
        let contact: Option<String> = row.try_get("contact").ok();
        let wage_type: String = row.try_get("wage_type").unwrap_or_else(|_| "MONTHLY".to_string());
        let salary_rate: f64 = row.try_get("salary_rate").unwrap_or(0.0);

        // Fetch attendance counts in date range
        let att_rows = sqlx::query(
            "SELECT status, COUNT(*) as cnt FROM attendance WHERE account_id = ? AND date >= ? AND date <= ? GROUP BY status"
        )
        .bind(worker_id)
        .bind(&start_date)
        .bind(&end_date)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

        let mut present_days = 0i64;
        let mut absent_days = 0i64;
        let mut half_days = 0i64;
        let mut leave_days = 0i64;

        for ar in att_rows {
            let status: String = ar.try_get("status").unwrap_or_default();
            let cnt: i64 = ar.try_get("cnt").unwrap_or(0);
            match status.to_uppercase().as_str() {
                "PRESENT" => present_days = cnt,
                "ABSENT" => absent_days = cnt,
                "HALF_DAY" => half_days = cnt,
                "LEAVE" => leave_days = cnt,
                _ => {}
            }
        }

        let per_day_rate = if wage_type == "DAILY" {
            salary_rate
        } else {
            salary_rate / 30.0
        };

        // Fetch advances paid to this worker in or before this period
        let advance_row: Option<(f64,)> = sqlx::query_as(
            "SELECT COALESCE(SUM(debit), 0.0) FROM journal_entries 
             WHERE account_id = ? AND date(entry_date) >= date(?) AND date(entry_date) <= date(?)
             AND (narration LIKE '%Advance%' OR narration LIKE '%پیشگی%' OR narration LIKE '%ایڈوانس%' OR ref_no LIKE 'ADV-%')"
        )
        .bind(worker_id)
        .bind(&start_date)
        .bind(&end_date)
        .fetch_optional(&*pool)
        .await
        .unwrap_or(None);
        let advance_paid = advance_row.map(|r| r.0).unwrap_or(0.0);

        // Fetch salary payments already made for this worker in this period
        let paid_row: Option<(f64,)> = sqlx::query_as(
            "SELECT COALESCE(SUM(debit), 0.0) FROM journal_entries 
             WHERE account_id = ? AND date(entry_date) >= date(?) AND date(entry_date) <= date(?)
             AND (narration LIKE '%Salary%' OR narration LIKE '%تنخواہ%' OR narration LIKE '%Wages%' OR ref_no LIKE 'SAL-%')"
        )
        .bind(worker_id)
        .bind(&start_date)
        .bind(&end_date)
        .fetch_optional(&*pool)
        .await
        .unwrap_or(None);
        let salary_already_paid = paid_row.map(|r| r.0).unwrap_or(0.0);

        let (total_earned, deductions, net_payable) = if wage_type == "DAILY" {
            let earned = (present_days as f64 * salary_rate) + (half_days as f64 * (salary_rate / 2.0));
            let payable = (earned - advance_paid - salary_already_paid).max(0.0);
            (earned, 0.0, payable)
        } else {
            let absent_ded = absent_days as f64 * per_day_rate;
            let half_ded = half_days as f64 * (per_day_rate / 2.0);
            let total_ded = absent_ded + half_ded;
            let earned = (salary_rate - total_ded).max(0.0);
            let payable = (earned - advance_paid - salary_already_paid).max(0.0);
            (earned, total_ded, payable)
        };

        summaries.push(WorkerSalarySummary {
            account_id: worker_id,
            name,
            designation,
            contact,
            wage_type,
            salary_rate,
            total_days: days_count,
            present_days,
            absent_days,
            half_days,
            leave_days,
            per_day_rate,
            total_earned,
            deductions,
            advance_paid,
            salary_already_paid,
            net_payable,
        });
    }

    Ok(summaries)
}
