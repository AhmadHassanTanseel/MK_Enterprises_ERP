use sqlx::{SqlitePool, FromRow};
use serde::{Serialize, Deserialize};
use tauri::State;
use crate::system_accounts::get_system_accounts;

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
    _payment_method: Option<String>,
    _ref_no: Option<String>,
    _attachment_path: Option<String>,
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    // Persist a real cash receipt/payment into journal_entries
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    let accounts = get_system_accounts(&db).await?;

    // Prepare stable narration and entry_date to avoid moving description/trans_date when binding multiple times
    let narration_default = if trans_type == "RECEIVE" { "Cash Receipt".to_string() } else { "Cash Payment".to_string() };
    let narration = description.clone().unwrap_or(narration_default);
    let entry_date = trans_date.clone();

    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if trans_type == "RECEIVE" {
        // Debit Cash Drawer [ID:1]
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at, ref_no) VALUES (?, ?, 0.0, 'CASH_RECEIPT', ?, ?, ?, ?)")
            .bind(accounts.cash).bind(amount).bind(&narration).bind(&entry_date).bind(&created_at).bind(&_ref_no)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Credit the account (reduces receivable)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at, ref_no) VALUES (?, 0.0, ?, 'CASH_RECEIPT', ?, ?, ?, ?)")
            .bind(account_id).bind(amount).bind(&narration).bind(&entry_date).bind(&created_at).bind(&_ref_no)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    } else {
        // PAYMENT: Debit the account (expense / supplier reduction)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at, ref_no) VALUES (?, ?, 0.0, 'CASH_PAYMENT', ?, ?, ?, ?)")
            .bind(account_id).bind(amount).bind(&narration).bind(&entry_date).bind(&created_at).bind(&_ref_no)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Credit Cash Drawer [ID:1]
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at, ref_no) VALUES (?, 0.0, ?, 'CASH_PAYMENT', ?, ?, ?, ?)")
            .bind(accounts.cash).bind(amount).bind(&narration).bind(&entry_date).bind(&created_at).bind(&_ref_no)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    let audit_action = format!(
        "{} of Rs. {:.2} posted for account #{}",
        if trans_type == "RECEIVE" { "Cash receipt" } else { "Cash payment" },
        amount,
        account_id
    );
    let _ = crate::audit::log_audit(&db, &audit_action, "Operator").await;

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
    _ref_no: Option<String>,
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

    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let internal_ref = _ref_no.unwrap_or_else(|| format!("JV-{}", chrono::Local::now().format("%y%m%d%H%M%S")));

    // Create a simple reference record by inserting a small JV header into system_config (or could be a JV table). We'll just insert lines with a common ref
    for line in &lines {
        if line.entry_type == "DR" {
            sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at, ref_no) VALUES (?, ?, 0.0, 'JOURNAL_VOUCHER', ?, ?, ?, ?)")
                .bind(line.account_id).bind(line.amount).bind(line.description.clone().unwrap_or_else(|| "JV Entry".into())).bind(trans_date.clone()).bind(&created_at).bind(&internal_ref)
                .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        } else {
            sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date, created_at, ref_no) VALUES (?, 0.0, ?, 'JOURNAL_VOUCHER', ?, ?, ?, ?)")
                .bind(line.account_id).bind(line.amount).bind(line.description.clone().unwrap_or_else(|| "JV Entry".into())).bind(trans_date.clone()).bind(&created_at).bind(&internal_ref)
                .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(format!("Journal Voucher perfectly balanced at Rs. {} and posted successfully!", dr_total))
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CashHistoryRow {
    pub id: i64,
    pub trans_type: String,
    pub ref_no: Option<String>,
    pub account_id: i64,
    pub account_name: String,
    pub amount: f64,
    pub trans_date: String,
    pub description: Option<String>,
}

#[tauri::command]
pub async fn get_cash_transaction_history(
    trans_type: Option<String>,
    db: State<'_, SqlitePool>,
) -> Result<Vec<CashHistoryRow>, String> {
    let accounts = get_system_accounts(&db).await?;
    let cash_id = accounts.cash;

    let type_filter = match trans_type.as_deref() {
        Some("RECEIVE") | Some("RECEIPT") => " AND je.voucher_type = 'CASH_RECEIPT'",
        Some("PAYMENT") | Some("PAY") => " AND je.voucher_type = 'CASH_PAYMENT'",
        _ => " AND je.voucher_type IN ('CASH_RECEIPT', 'CASH_PAYMENT')",
    };

    let sql = format!(
        r#"
        SELECT
            je.id,
            je.ref_no,
            CASE je.voucher_type
                WHEN 'CASH_RECEIPT' THEN 'RECEIVE'
                ELSE 'PAYMENT'
            END as trans_type,
            je.account_id,
            a.name as account_name,
            CASE
                WHEN je.voucher_type = 'CASH_RECEIPT' THEN je.credit
                ELSE je.debit
            END as amount,
            datetime(je.entry_date, 'localtime') as trans_date,
            je.narration as description
        FROM journal_entries je
        JOIN accounts a ON je.account_id = a.id
        WHERE je.account_id != ?{type_filter}
        ORDER BY je.id DESC
        LIMIT 500
        "#
    );

    sqlx::query_as::<_, CashHistoryRow>(&sql)
        .bind(cash_id)
        .fetch_all(&*db)
        .await
        .map_err(|e| e.to_string())
}


#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct JournalVoucherHeader {
    pub ref_no: Option<String>,
    pub trans_date: String,
    pub created_at: Option<String>,
    pub total_amount: f64,
    pub line_count: i64,
}

#[tauri::command]
pub async fn get_journal_vouchers(
    db: State<'_, SqlitePool>
) -> Result<Vec<JournalVoucherHeader>, String> {
    let sql = r#"
        SELECT 
            ref_no,
            date(entry_date) as trans_date,
            MIN(created_at) as created_at,
            SUM(debit) as total_amount,
            COUNT(id) as line_count
        FROM journal_entries
        WHERE voucher_type = 'JOURNAL_VOUCHER'
        GROUP BY ref_no, date(entry_date)
        ORDER BY MAX(id) DESC
        LIMIT 500
    "#;

    sqlx::query_as::<_, JournalVoucherHeader>(sql)
        .fetch_all(&*db)
        .await
        .map_err(|e| e.to_string())
}
#[derive(serde::Serialize, sqlx::FromRow)]
pub struct LedgerEntryDetail {
    pub id: i64,
    pub account_id: i64,
    pub account_name: String,
    pub debit: f64,
    pub credit: f64,
    pub remarks: Option<String>,
}

#[tauri::command]
pub async fn get_ledger_entries_by_ref(
    ref_no: String,
    db: State<'_, SqlitePool>
) -> Result<Vec<LedgerEntryDetail>, String> {
    let sql = r#"
        SELECT 
            l.id,
            l.account_id,
            a.name as account_name,
            l.debit,
            l.credit,
            l.remarks
        FROM ledger l
        JOIN accounts a ON l.account_id = a.id
        WHERE l.ref_no = ?
        ORDER BY l.id ASC
    "#;
    
    let entries: Vec<LedgerEntryDetail> = sqlx::query_as(sql)
        .bind(ref_no)
        .fetch_all(&*db)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(entries)
}
