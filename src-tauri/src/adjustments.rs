use sqlx::SqlitePool;
use tauri::State;
use crate::system_accounts::get_system_accounts;
use chrono::Local;

#[tauri::command]
pub async fn adjust_cash(amount: f64, reason: String, date: String, db: State<'_, SqlitePool>) -> Result<String, String> {
    if amount == 0.0 {
        return Err("Amount cannot be zero".into());
    }

    let accounts = get_system_accounts(&*db).await?;
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    
    // We need an offset account for the cash adjustment. Let's use Operating Expense (7) for now, or Damage Loss (5).
    let offset_account_id = 7; // Operating Expense
    let created_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if amount > 0.0 {
        // Increase Cash, Credit Offset
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at) VALUES (?, ?, 0.0, 'CASH_ADJUSTMENT', ?, ?, ?)")
            .bind(accounts.cash).bind(amount).bind(&reason).bind(&date).bind(&created_at)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at) VALUES (?, 0.0, ?, 'CASH_ADJUSTMENT', ?, ?, ?)")
            .bind(offset_account_id).bind(amount).bind(&reason).bind(&date).bind(&created_at)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    } else {
        // Decrease Cash, Debit Offset
        let abs_amount = amount.abs();
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at) VALUES (?, ?, 0.0, 'CASH_ADJUSTMENT', ?, ?, ?)")
            .bind(offset_account_id).bind(abs_amount).bind(&reason).bind(&date).bind(&created_at)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
            
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at) VALUES (?, 0.0, ?, 'CASH_ADJUSTMENT', ?, ?, ?)")
            .bind(accounts.cash).bind(abs_amount).bind(&reason).bind(&date).bind(&created_at)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok("Cash adjusted successfully".into())
}

#[tauri::command]
pub async fn adjust_stock(product_id: i64, qty: i64, reason: String, date: String, db: State<'_, SqlitePool>) -> Result<String, String> {
    if qty == 0 {
        return Err("Quantity cannot be zero".into());
    }
    
    let created_at = format!("{} 00:00:00", date); // Fake time just to fit the date
    
    // Insert into inventory movements
    sqlx::query("INSERT INTO inventory_movements (product_id, quantity, movement_type, notes, created_at) VALUES (?, ?, 'ADJUSTMENT', ?, ?)")
        .bind(product_id)
        .bind(qty)
        .bind(&reason)
        .bind(&created_at)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;

    Ok("Stock adjusted successfully".into())
}

#[tauri::command]
pub async fn adjust_sales(amount: f64, reason: String, date: String, db: State<'_, SqlitePool>) -> Result<String, String> {
    if amount == 0.0 {
        return Err("Amount cannot be zero".into());
    }

    let accounts = get_system_accounts(&*db).await?;
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    
    let created_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if amount > 0.0 {
        // Increase Sales, Debit Cash
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at) VALUES (?, ?, 0.0, 'SALES_ADJUSTMENT', ?, ?, ?)")
            .bind(accounts.cash).bind(amount).bind(&reason).bind(&date).bind(&created_at)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at) VALUES (?, 0.0, ?, 'SALES_ADJUSTMENT', ?, ?, ?)")
            .bind(accounts.sales_revenue).bind(amount).bind(&reason).bind(&date).bind(&created_at)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    } else {
        // Decrease Sales, Credit Cash
        let abs_amount = amount.abs();
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at) VALUES (?, ?, 0.0, 'SALES_ADJUSTMENT', ?, ?, ?)")
            .bind(accounts.sales_revenue).bind(abs_amount).bind(&reason).bind(&date).bind(&created_at)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
            
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at) VALUES (?, 0.0, ?, 'SALES_ADJUSTMENT', ?, ?, ?)")
            .bind(accounts.cash).bind(abs_amount).bind(&reason).bind(&date).bind(&created_at)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok("Sales adjusted successfully".into())
}
