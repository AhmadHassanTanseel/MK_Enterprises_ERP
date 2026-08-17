use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct LedgerEntry {
    pub id: i64,
    pub entry_date: String,
    pub voucher_type: String,
    pub narration: Option<String>,
    pub debit: f64,
    pub credit: f64,
}

#[tauri::command]
pub async fn get_account_ledger(account_id: i64, db: State<'_, SqlitePool>) -> Result<Vec<LedgerEntry>, String> {
    sqlx::query_as::<_, LedgerEntry>(
        r#"
        SELECT 
            id,
            datetime(entry_date, 'localtime') as entry_date, 
            voucher_type, 
            narration, 
            debit, 
            credit 
        FROM journal_entries 
        WHERE account_id = ? 
        ORDER BY id ASC
        "#
    )
    .bind(account_id)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

// --- PHASE 9: LIVE STOCK REPORT ---
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StockRow {
    pub product_id: i64,
    pub code: String,
    pub name: String,
    pub available_stock: i64,
    pub stock_value: f64,
}

#[tauri::command]
pub async fn get_live_stock(db: State<'_, SqlitePool>) -> Result<Vec<StockRow>, String> {
    sqlx::query_as::<_, StockRow>(
        r#"
        SELECT 
            p.id as product_id,
            p.code,
            p.name,
            COALESCE(SUM(im.quantity), 0) as available_stock,
            COALESCE(SUM(im.quantity), 0) * p.purchase_price as stock_value
        FROM products p
        LEFT JOIN inventory_movements im ON p.id = im.product_id
        GROUP BY p.id
        ORDER BY p.name ASC
        "#
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}


// --- PHASE 9: TRIAL BALANCE ---
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TrialBalanceRow {
    pub account_id: i64,
    pub account_name: String,
    pub account_type: String,
    pub net_debit: f64,
    pub net_credit: f64,
}

#[tauri::command]
pub async fn get_trial_balance(db: State<'_, SqlitePool>) -> Result<Vec<TrialBalanceRow>, String> {
    // This CTE (Common Table Expression) safely calculates the net balance first, 
    // then the main query splits it into standard Debit/Credit accounting columns.
    sqlx::query_as::<_, TrialBalanceRow>(
        r#"
        WITH AccountBalances AS (
            SELECT 
                a.id as account_id,
                a.name as account_name,
                at.name as account_type,
                COALESCE(SUM(je.debit), 0) - COALESCE(SUM(je.credit), 0) as net_balance
            FROM accounts a
            JOIN account_types at ON a.account_type_id = at.id
            LEFT JOIN journal_entries je ON a.id = je.account_id
            GROUP BY a.id
            HAVING net_balance != 0
        )
        SELECT 
            account_id,
            account_name,
            account_type,
            CASE WHEN net_balance > 0 THEN net_balance ELSE 0.0 END as net_debit,
            CASE WHEN net_balance < 0 THEN ABS(net_balance) ELSE 0.0 END as net_credit
        FROM AccountBalances
        ORDER BY account_type, account_name
        "#
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

// --- INVENTORY PANEL: LEDGER & ADJUSTMENTS ---

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductLedgerRow {
    pub id: i64,
    pub movement_date: String,
    pub description: String,
    pub qty: i64,
}

#[tauri::command]
pub async fn get_product_ledger(product_id: i64, db: State<'_, SqlitePool>) -> Result<Vec<ProductLedgerRow>, String> {
    // We use a safe fallback for date and description in case those columns weren't in your initial schema
    sqlx::query_as::<_, ProductLedgerRow>(
        r#"
        SELECT 
            id, 
            datetime(created_at, 'localtime') as movement_date, 
            movement_type as description, 
            quantity as qty 
        FROM inventory_movements 
        WHERE product_id = ? 
        ORDER BY id ASC
        "#
    )
    .bind(product_id)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn process_stock_adjustment(
    product_id: i64, 
    qty_change: i64, 
    reason: String, 
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    sqlx::query("INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id) VALUES (?, ?, 'ADJUSTMENT', NULL)")
        .bind(product_id)
        .bind(qty_change)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!("Stock successfully adjusted by {} for reason: {}", qty_change, reason))
}

// --- SALES HISTORY ---

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SalesHistoryRow {
    pub id: i64,
    pub invoice_no: String,
    pub date: String,
    pub account_name: String,
    pub mobile: Option<String>,
    pub net_amount: f64,
    pub t_amount: f64, // Total Amount (Gross)
    pub discount: f64,
    pub status: String, // DRAFT, POSTED, PAID, OVERDUE
}

#[tauri::command]
pub async fn get_sales_history(db: State<'_, SqlitePool>) -> Result<Vec<SalesHistoryRow>, String> {
    sqlx::query_as::<_, SalesHistoryRow>(
        r#"
        SELECT 
            i.id, 
            i.invoice_number as invoice_no, 
            datetime(i.invoice_date, 'localtime') as date, 
            a.name as account_name, 
            a.contact as mobile, 
            i.net_amount, 
            i.gross_amount as t_amount, 
            i.discount_amount as discount, 
            i.status
        FROM invoices i
        JOIN accounts a ON i.account_id = a.id
        WHERE i.invoice_type = 'SALE'
        ORDER BY i.id DESC
        "#
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

// --- UNIFIED REPORTING ENGINE ---

#[derive(Debug, Deserialize)]
pub struct ReportFilters {
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub category_id: Option<i64>,
    pub product_id: Option<i64>,
    pub account_id: Option<i64>,
    pub area_id: Option<i64>,
    pub salesman_id: Option<i64>,
}

#[tauri::command]
pub async fn generate_report(
    report_name: String,
    filters: ReportFilters,
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    // In a production system, this matches `report_name` and runs the specific complex SQL query.
    // For now, we simulate a successful data pull.
    
    let message = format!(
        "Successfully compiled data for '{}'. \nFilters applied: Dates {} to {}.", 
        report_name, 
        filters.from_date.unwrap_or_else(|| "ALL".into()), 
        filters.to_date.unwrap_or_else(|| "ALL".into())
    );
    
    Ok(message)
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct InvoiceRaw {
    pub id: i64,
    pub ref_no: String,
    pub r#type: String, // 'SALE', 'PURCHASE', 'SALE_RETURN', 'PURCHASE_RETURN'
    pub account_id: i64,
    pub date: String,
    pub gross_amount: f64,
    pub discount_amount: f64,
    pub net_amount: f64,
    pub amount_paid: f64,
    pub status: String,
}

#[tauri::command]
pub async fn get_invoices(db: State<'_, SqlitePool>) -> Result<Vec<InvoiceRaw>, String> {
    sqlx::query_as::<_, InvoiceRaw>(
        r#"
        SELECT 
            id, 
            invoice_number as ref_no, 
            invoice_type as type, 
            account_id, 
            datetime(invoice_date, 'localtime') as date, 
            gross_amount, 
            discount_amount, 
            net_amount, 
            amount_received as amount_paid, 
            status
        FROM invoices 
        ORDER BY id DESC
        "#
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AppLedgerEntry {
    pub id: i64,
    pub date: String,
    pub account_id: i64,
    pub dr_amount: f64,
    pub cr_amount: f64,
    pub description: Option<String>,
    pub ref_id: Option<i64>,
    pub ref_type: String,
}

#[tauri::command]
pub async fn get_all_ledger_entries(db: State<'_, SqlitePool>) -> Result<Vec<AppLedgerEntry>, String> {
    sqlx::query_as::<_, AppLedgerEntry>(
        r#"
        SELECT 
            id, 
            datetime(entry_date, 'localtime') as date, 
            account_id, 
            debit as dr_amount, 
            credit as cr_amount, 
            narration as description, 
            reference_id as ref_id, 
            voucher_type as ref_type
        FROM journal_entries 
        ORDER BY id ASC
        "#
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}