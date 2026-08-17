// use sqlx::SqlitePool;
// use tauri::State;

use sqlx::{SqlitePool, FromRow};
use serde::{Serialize, Deserialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CashTransaction {
    pub id: i64,
    pub trans_type: String, // 'RECEIVE' or 'PAYMENT'
    pub account_id: i64,
    pub amount: f64,
    pub trans_date: String,
    pub description: Option<String>,
    pub payment_method: Option<String>,
    pub ref_no: Option<String>,
    pub attachment_path: Option<String>,
}

#[tauri::command]
pub async fn process_cash_transaction(
    trans_type: String,
    account_id: i64,
    amount: f64,
    trans_date: String,
    description: Option<String>,
    payment_method: Option<String>,
    ref_no: Option<String>,
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    // Persist a real cash receipt/payment into journal_entries
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    // Prepare stable narration and entry_date to avoid moving description/trans_date when binding multiple times
    let narration_default = if trans_type == "RECEIVE" { "Cash Receipt".to_string() } else { "Cash Payment".to_string() };
    let narration = description.clone().unwrap_or(narration_default);
    let entry_date = trans_date.clone();

    if trans_type == "RECEIVE" {
        // Debit Cash Drawer [ID:1]
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (1, ?, 0.0, 'CASH_RECEIPT', ?, ?)")
            .bind(amount).bind(&narration).bind(&entry_date)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Credit the account (reduces receivable)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, 0.0, ?, 'CASH_RECEIPT', ?, ?)")
            .bind(account_id).bind(amount).bind(&narration).bind(&entry_date)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    } else {
        // PAYMENT: Debit the account (expense / supplier reduction)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, ?, 0.0, 'CASH_PAYMENT', ?, ?)")
            .bind(account_id).bind(amount).bind(&narration).bind(&entry_date)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Credit Cash Drawer [ID:1]
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (1, 0.0, ?, 'CASH_PAYMENT', ?, ?)")
            .bind(amount).bind(&narration).bind(&entry_date)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(format!("{} of Rs. {} securely posted to ledger.", trans_type, amount))
}



// --- MULTI-LINE JOURNAL VOUCHER ---

#[derive(Debug, Deserialize)]
pub struct JvLine {
    pub account_id: i64,
    pub entry_type: String, // "DR" or "CR"
    pub amount: f64,
    pub description: Option<String>,
}

#[tauri::command]
pub async fn process_journal_voucher(
    trans_date: String,
    ref_no: Option<String>,
    lines: Vec<JvLine>,
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    // 1. Strict ERP Validation: Double-Entry Math Check
    let mut dr_total = 0.0;
    let mut cr_total = 0.0;
    
    for line in &lines {
        if line.entry_type == "DR" { dr_total += line.amount; }
        else { cr_total += line.amount; }
    }
    
    // Check if totals match (allowing for floating point microscopic drift)
    if (dr_total - cr_total).abs() > 0.01 {
        return Err("Accounting Error: Total Debits (بنام) must exactly equal Total Credits (جمع) before posting.".into());
    }
    if dr_total <= 0.0 {
        return Err("Voucher cannot be zero.".into());
    }

    // Persist lines inside a transaction
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    // Create a simple reference record by inserting a small JV header into system_config (or could be a JV table). We'll just insert lines with a common ref
    for line in &lines {
        if line.entry_type == "DR" {
            sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, ?, 0.0, 'JOURNAL_VOUCHER', ?, ?)")
                .bind(line.account_id).bind(line.amount).bind(line.description.clone().unwrap_or_else(|| "JV Entry".into())).bind(trans_date.clone())
                .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        } else {
            sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, 0.0, ?, 'JOURNAL_VOUCHER', ?, ?)")
                .bind(line.account_id).bind(line.amount).bind(line.description.clone().unwrap_or_else(|| "JV Entry".into())).bind(trans_date.clone())
                .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(format!("Journal Voucher perfectly balanced at Rs. {} and posted successfully!", dr_total))
}