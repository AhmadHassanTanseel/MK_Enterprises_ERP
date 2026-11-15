use chrono::Datelike;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool, Row};
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
    pub account_id: i64,
    pub account_name: String,
    pub mobile: Option<String>,
    pub net_amount: f64,
    pub t_amount: f64, // Total Amount (Gross)
    pub discount: f64,
    pub amount_received: f64,
    pub status: String, // DRAFT, POSTED, PAID, OVERDUE
    pub invoice_type: String,
}

#[tauri::command]
pub async fn get_purchase_history(db: State<'_, SqlitePool>) -> Result<Vec<SalesHistoryRow>, String> {
    sqlx::query_as::<_, SalesHistoryRow>(
        r#"
        SELECT 
            i.id, 
            i.invoice_number as invoice_no, 
            datetime(i.invoice_date, 'localtime') as date, 
            i.account_id,
            a.name as account_name, 
            a.contact as mobile, 
            i.net_amount, 
            i.gross_amount as t_amount, 
            i.discount_amount as discount, 
            COALESCE(i.amount_received, 0.0) as amount_received,
            i.status,
            i.invoice_type
        FROM invoices i
        JOIN accounts a ON i.account_id = a.id
        WHERE i.invoice_type IN ('PURCHASE', 'PURCHASE_RETURN')
        ORDER BY i.id DESC
        "#
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_sales_history(db: State<'_, SqlitePool>) -> Result<Vec<SalesHistoryRow>, String> {
    sqlx::query_as::<_, SalesHistoryRow>(
        r#"
        SELECT 
            i.id, 
            i.invoice_number as invoice_no, 
            datetime(i.invoice_date, 'localtime') as date, 
            i.account_id,
            CASE 
                WHEN i.invoice_number LIKE 'DISP-%' AND da.name IS NOT NULL AND da.id != 2 AND ds.name IS NOT NULL 
                    THEN da.name || ' [Driver: ' || ds.name || ']'
                WHEN i.invoice_number LIKE 'DISP-%' AND da.name IS NOT NULL AND da.id != 2 
                    THEN da.name
                WHEN i.invoice_number LIKE 'DISP-%' AND ds.name IS NOT NULL 
                    THEN ds.name || ' (Driver)'
                WHEN i.invoice_number LIKE 'DISP-%' AND s.name IS NOT NULL 
                    THEN s.name || ' (Driver)'
                WHEN (a.id = 2 OR a.name LIKE '%Walk-in%') AND s.name IS NOT NULL 
                    THEN s.name || ' (Driver)'
                ELSE a.name 
            END as account_name, 
            COALESCE(da.contact, ds.contact, s.contact, a.contact) as mobile, 
            i.net_amount, 
            i.gross_amount as t_amount, 
            i.discount_amount as discount, 
            COALESCE(i.amount_received, 0.0) as amount_received,
            i.status,
            i.invoice_type
        FROM invoices i
        JOIN accounts a ON i.account_id = a.id
        LEFT JOIN dispatches d ON (i.invoice_number LIKE 'DISP-%' AND CAST(SUBSTR(i.invoice_number, 6) AS INTEGER) = d.id)
        LEFT JOIN accounts da ON d.customer_id = da.id
        LEFT JOIN salesmen ds ON d.salesman_id = ds.id
        LEFT JOIN salesmen s ON i.salesman_id = s.id
        WHERE i.invoice_type IN ('SALE', 'SALE_RETURN')
        ORDER BY i.id DESC
        "#
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

// --- UNIFIED REPORTING ENGINE ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportFilters {
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub category_id: Option<i64>,
    pub product_id: Option<i64>,
    pub account_id: Option<i64>,
    pub area_id: Option<i64>,
    pub salesman_id: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ReportTotal {
    pub label: String,
    pub value: f64,
}

#[derive(Debug, Serialize)]
pub struct ReportResult {
    pub title: String,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub totals: Vec<ReportTotal>,
}

fn date_filter_clause(from_date: &Option<String>, to_date: &Option<String>, column: &str) -> String {
    match (from_date, to_date) {
        (Some(from), Some(to)) => format!(" AND date({column}) BETWEEN date('{from}') AND date('{to}')"),
        (Some(from), None) => format!(" AND date({column}) >= date('{from}')"),
        (None, Some(to)) => format!(" AND date({column}) <= date('{to}')"),
        (None, None) => String::new(),
    }
}

async fn run_sales_report(pool: &SqlitePool, filters: &ReportFilters) -> Result<ReportResult, String> {
    let date_clause = date_filter_clause(&filters.from_date, &filters.to_date, "i.invoice_date");
    let account_clause = filters
        .account_id
        .map(|id| format!(" AND i.account_id = {id}"))
        .unwrap_or_default();

    let sql = format!(
        r#"
        SELECT
            i.invoice_number,
            datetime(i.invoice_date, 'localtime') as invoice_date,
            a.name as account_name,
            i.gross_amount,
            i.discount_amount,
            i.net_amount,
            i.amount_received,
            i.status
        FROM invoices i
        JOIN accounts a ON i.account_id = a.id
        WHERE i.invoice_type = 'SALE'{date_clause}{account_clause}
        ORDER BY i.id DESC
        "#
    );

    let rows: Vec<(String, String, String, f64, f64, f64, f64, String)> =
        sqlx::query_as(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let mut total_net = 0.0;
    let mut total_received = 0.0;
    let report_rows: Vec<Vec<String>> = rows
        .iter()
        .map(|r| {
            total_net += r.5;
            total_received += r.6;
            vec![
                r.0.clone(),
                r.1.clone(),
                r.2.clone(),
                format!("{:.2}", r.3),
                format!("{:.2}", r.4),
                format!("{:.2}", r.5),
                format!("{:.2}", r.6),
                r.7.clone(),
            ]
        })
        .collect();

    Ok(ReportResult {
        title: "Sales Report".into(),
        headers: vec![
            "Invoice #".into(),
            "Date".into(),
            "Customer".into(),
            "Gross".into(),
            "Discount".into(),
            "Net".into(),
            "Received".into(),
            "Status".into(),
        ],
        rows: report_rows,
        totals: vec![
            ReportTotal { label: "Total Net Sales".into(), value: total_net },
            ReportTotal { label: "Total Received".into(), value: total_received },
        ],
    })
}

async fn run_purchase_report(pool: &SqlitePool, filters: &ReportFilters) -> Result<ReportResult, String> {
    let date_clause = date_filter_clause(&filters.from_date, &filters.to_date, "i.invoice_date");
    let account_clause = filters
        .account_id
        .map(|id| format!(" AND i.account_id = {id}"))
        .unwrap_or_default();

    let sql = format!(
        r#"
        SELECT
            i.invoice_number,
            datetime(i.invoice_date, 'localtime') as invoice_date,
            a.name as account_name,
            i.gross_amount,
            i.discount_amount,
            i.net_amount,
            i.amount_received as amount_paid,
            i.status
        FROM invoices i
        JOIN accounts a ON i.account_id = a.id
        WHERE i.invoice_type = 'PURCHASE'{date_clause}{account_clause}
        ORDER BY i.id DESC
        "#
    );

    let rows: Vec<(String, String, String, f64, f64, f64, f64, String)> =
        sqlx::query_as(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let mut total_net = 0.0;
    let mut total_paid = 0.0;
    let report_rows: Vec<Vec<String>> = rows
        .iter()
        .map(|r| {
            total_net += r.5;
            total_paid += r.6;
            vec![
                r.0.clone(),
                r.1.clone(),
                r.2.clone(),
                format!("{:.2}", r.3),
                format!("{:.2}", r.4),
                format!("{:.2}", r.5),
                format!("{:.2}", r.6),
                r.7.clone(),
            ]
        })
        .collect();

    Ok(ReportResult {
        title: "Purchase Report".into(),
        headers: vec![
            "Invoice #".into(),
            "Date".into(),
            "Supplier".into(),
            "Gross".into(),
            "Discount".into(),
            "Net".into(),
            "Paid".into(),
            "Status".into(),
        ],
        rows: report_rows,
        totals: vec![
            ReportTotal { label: "Total Purchases".into(), value: total_net },
            ReportTotal { label: "Total Paid".into(), value: total_paid },
        ],
    })
}

async fn run_stock_report(pool: &SqlitePool, filters: &ReportFilters) -> Result<ReportResult, String> {
    let category_clause = filters
        .category_id
        .map(|id| format!(" AND p.category_id = {id}"))
        .unwrap_or_default();
    let product_clause = filters
        .product_id
        .map(|id| format!(" AND p.id = {id}"))
        .unwrap_or_default();

    let sql = format!(
        r#"
        SELECT
            p.code,
            p.name,
            c.name as category_name,
            COALESCE(SUM(im.quantity), 0) as available_stock,
            p.purchase_price,
            COALESCE(SUM(im.quantity), 0) * p.purchase_price as stock_value,
            p.reorder_level
        FROM products p
        LEFT JOIN inventory_movements im ON p.id = im.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1{category_clause}{product_clause}
        GROUP BY p.id
        ORDER BY p.name ASC
        "#
    );

    let rows: Vec<(String, String, Option<String>, i64, f64, f64, i64)> =
        sqlx::query_as(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let mut total_value = 0.0;
    let mut total_units: i64 = 0;
    let report_rows: Vec<Vec<String>> = rows
        .iter()
        .map(|r| {
            total_value += r.5;
            total_units += r.3;
            vec![
                r.0.clone(),
                r.1.clone(),
                r.2.clone().unwrap_or_else(|| "—".into()),
                r.3.to_string(),
                format!("{:.2}", r.4),
                format!("{:.2}", r.5),
                r.6.to_string(),
            ]
        })
        .collect();

    Ok(ReportResult {
        title: "Stock Report".into(),
        headers: vec![
            "Code".into(),
            "Product".into(),
            "Category".into(),
            "Qty".into(),
            "Unit Cost".into(),
            "Stock Value".into(),
            "Reorder Level".into(),
        ],
        rows: report_rows,
        totals: vec![
            ReportTotal { label: "Total Units".into(), value: total_units as f64 },
            ReportTotal { label: "Total Stock Value".into(), value: total_value },
        ],
    })
}


async fn run_ledger_report(pool: &SqlitePool, filters: &ReportFilters) -> Result<ReportResult, String> {
    let date_clause = date_filter_clause(&filters.from_date, &filters.to_date, "je.entry_date");
    let account_clause = filters.account_id.map(|id| format!(" AND je.account_id = {id}")).unwrap_or_default();
    
    let sql = format!(
        r#"
        SELECT 
            datetime(je.entry_date, 'localtime') as entry_date, 
            a.name as account_name,
            je.voucher_type, 
            je.ref_no,
            je.narration, 
            je.debit, 
            je.credit 
        FROM journal_entries je
        JOIN accounts a ON je.account_id = a.id
        WHERE 1=1 {date_clause}{account_clause}
        ORDER BY je.id ASC
        "#
    );
    
    let raw_rows: Vec<(String, String, String, Option<String>, Option<String>, f64, f64)> = sqlx::query_as(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;
    
    let mut account_name_for_title = "All Accounts".to_string();
    if let Some(aid) = filters.account_id {
        if let Ok(Some(n)) = sqlx::query_scalar::<_, String>("SELECT name FROM accounts WHERE id = ?").bind(aid).fetch_optional(pool).await {
            account_name_for_title = n;
        }
    }

    let mut rows = Vec::new();
    let mut tot_dr = 0.0;
    let mut tot_cr = 0.0;
    
    for (dt, acc, vt, ref_no, nar, dr, cr) in raw_rows {
        tot_dr += dr;
        tot_cr += cr;
        rows.push(vec![
            dt,
            acc,
            ref_no.unwrap_or_default(),
            vt,
            nar.unwrap_or_default(),
            format!("{:.2}", dr),
            format!("{:.2}", cr)
        ]);
    }
    
    Ok(ReportResult {
        title: format!("Account Ledger - {}", account_name_for_title),
        headers: vec!["Date".into(), "Account".into(), "Ref No".into(), "Voucher Type".into(), "Description".into(), "Debit".into(), "Credit".into()],
        rows,
        totals: vec![
            ReportTotal { label: "Total Debit".into(), value: tot_dr },
            ReportTotal { label: "Total Credit".into(), value: tot_cr },
            ReportTotal { label: "Net Balance".into(), value: (tot_dr - tot_cr).abs() }
        ]
    })
}

async fn run_cashbook_report(pool: &SqlitePool, filters: &ReportFilters) -> Result<ReportResult, String> {
    let date_clause = date_filter_clause(&filters.from_date, &filters.to_date, "je.entry_date");
    
    let sql = format!(
        r#"
        SELECT 
            datetime(je.entry_date, 'localtime') as entry_date, 
            je.voucher_type, 
            je.ref_no,
            je.narration, 
            je.debit, 
            je.credit 
        FROM journal_entries je
        WHERE je.account_id = 1 {date_clause}
        ORDER BY je.id ASC
        "#
    );
    
    let raw_rows: Vec<(String, String, Option<String>, Option<String>, f64, f64)> = sqlx::query_as(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;
    
    let mut rows = Vec::new();
    let mut tot_dr = 0.0;
    let mut tot_cr = 0.0;
    
    for (dt, vt, ref_no, nar, dr, cr) in raw_rows {
        tot_dr += dr;
        tot_cr += cr;
        rows.push(vec![
            dt,
            ref_no.unwrap_or_default(),
            vt,
            nar.unwrap_or_default(),
            format!("{:.2}", dr),
            format!("{:.2}", cr)
        ]);
    }
    
    Ok(ReportResult {
        title: "Cash Book".to_string(),
        headers: vec!["Date".into(), "Ref No".into(), "Voucher Type".into(), "Description".into(), "Receipts (Dr)".into(), "Payments (Cr)".into()],
        rows,
        totals: vec![
            ReportTotal { label: "Total Receipts".into(), value: tot_dr },
            ReportTotal { label: "Total Payments".into(), value: tot_cr },
            ReportTotal { label: "Closing Balance".into(), value: tot_dr - tot_cr }
        ]
    })
}

async fn run_trial_balance_report(pool: &SqlitePool, filters: &ReportFilters) -> Result<ReportResult, String> {
    let date_clause = date_filter_clause(&filters.from_date, &filters.to_date, "je.entry_date");
    
    let sql = format!(
        r#"
        SELECT 
            a.name,
            t.name as type_name,
            SUM(je.debit) as total_dr,
            SUM(je.credit) as total_cr
        FROM accounts a
        JOIN account_types t ON a.account_type_id = t.id
        LEFT JOIN journal_entries je ON a.id = je.account_id {date_clause}
        GROUP BY a.id
        HAVING total_dr > 0 OR total_cr > 0
        ORDER BY t.trial_order ASC, a.name ASC
        "#
    );
    
    let raw_rows: Vec<(String, String, f64, f64)> = sqlx::query_as(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;
    
    let mut rows = Vec::new();
    let mut final_dr = 0.0;
    let mut final_cr = 0.0;
    
    for (name, type_name, dr, cr) in raw_rows {
        let mut net_dr = 0.0;
        let mut net_cr = 0.0;
        
        if dr > cr { net_dr = dr - cr; }
        else { net_cr = cr - dr; }
        
        final_dr += net_dr;
        final_cr += net_cr;
        
        rows.push(vec![
            name,
            type_name,
            if net_dr > 0.0 { format!("{:.2}", net_dr) } else { "-".into() },
            if net_cr > 0.0 { format!("{:.2}", net_cr) } else { "-".into() },
        ]);
    }
    
    Ok(ReportResult {
        title: "Trial Balance".to_string(),
        headers: vec!["Account Name".into(), "Account Type".into(), "Debit Balance".into(), "Credit Balance".into()],
        rows,
        totals: vec![
            ReportTotal { label: "Total Debit".into(), value: final_dr },
            ReportTotal { label: "Total Credit".into(), value: final_cr }
        ]
    })
}


async fn run_profit_report(pool: &SqlitePool, filters: &ReportFilters) -> Result<ReportResult, String> {
    let inv_date_clause = date_filter_clause(&filters.from_date, &filters.to_date, "i.invoice_date");

    // 1. Sales and Cost of Goods Sold (COGS) based on actual items sold
    let sql = format!(
        r#"
        SELECT
            i.invoice_type,
            COUNT(DISTINCT i.id) as txn_count,
            COALESCE(SUM(ii.total_price), 0.0) as total_revenue,
            COALESCE(SUM(ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0)), 0.0) as total_cogs
        FROM invoices i
        JOIN invoice_items ii ON ii.invoice_id = i.id
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE i.invoice_type IN ('SALE', 'SALE_RETURN'){inv_date_clause}
        GROUP BY i.invoice_type
        "#
    );

    let rows: Vec<(String, i64, f64, f64)> =
        sqlx::query_as(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let mut sales_rev = 0.0;
    let mut sales_cogs = 0.0;
    let mut returns_rev = 0.0;
    let mut returns_cogs = 0.0;

    for (invoice_type, _count, rev, cogs) in &rows {
        match invoice_type.as_str() {
            "SALE" => {
                sales_rev = *rev;
                sales_cogs = *cogs;
            }
            "SALE_RETURN" => {
                returns_rev = *rev;
                returns_cogs = *cogs;
            }
            _ => {}
        }
    }

    let net_sales = sales_rev - returns_rev;
    let net_cogs = sales_cogs - returns_cogs;
    let gross_profit = net_sales - net_cogs;

    // 2. Also fetch stock purchases for informational memo
    let purch_sql = format!(
        r#"
        SELECT
            invoice_type,
            COALESCE(SUM(net_amount), 0.0) as total_amount
        FROM invoices
        WHERE invoice_type IN ('PURCHASE', 'PURCHASE_RETURN'){inv_date_clause}
        GROUP BY invoice_type
        "#
    );
    let purch_rows: Vec<(String, f64)> = sqlx::query_as(&purch_sql).fetch_all(pool).await.unwrap_or_default();
    let mut purchases = 0.0;
    let mut purchase_returns = 0.0;
    for (ptype, amt) in &purch_rows {
        if ptype == "PURCHASE" { purchases = *amt; }
        else if ptype == "PURCHASE_RETURN" { purchase_returns = *amt; }
    }
    let net_purchases = purchases - purchase_returns;

    // 3. Operating expenses (strictly excluding inventory purchases)
    let je_date_clause = date_filter_clause(&filters.from_date, &filters.to_date, "je.entry_date");
    let exp_sql = format!(
        r#"
        SELECT a.name, COALESCE(SUM(je.debit - je.credit), 0.0) as exp_total
        FROM journal_entries je
        JOIN accounts a ON je.account_id = a.id
        JOIN account_types at ON a.account_type_id = at.id
        WHERE at.nature = 'EXPENSE'
          AND a.id != 4
          AND at.id != 6
          {je_date_clause}
        GROUP BY a.id, a.name
        HAVING exp_total != 0.0
        ORDER BY exp_total DESC
        "#
    );
    let exp_rows: Vec<(String, f64)> = sqlx::query_as(&exp_sql).fetch_all(pool).await.map_err(|e| e.to_string())?;
    let regular_expenses: f64 = exp_rows.iter().map(|r| r.1).sum();

    let total_expenses = regular_expenses;
    let net_profit = gross_profit - total_expenses;

    let mut report_rows = vec![
        vec!["Gross Sales".into(), "".into(), format!("{:.2}", sales_rev)],
        vec!["Less: Sale Returns".into(), "".into(), format!("{:.2}", returns_rev)],
        vec!["Net Sales Revenue".into(), "".into(), format!("{:.2}", net_sales)],
        vec!["---".into(), "".into(), "---".into()],
        vec!["Cost of Goods Sold (Purchase Cost of Items Sold)".into(), "".into(), format!("{:.2}", net_cogs)],
        vec!["---".into(), "".into(), "---".into()],
        vec!["GROSS PROFIT (Sales - Purchase Cost)".into(), "".into(), format!("{:.2}", gross_profit)],
        vec!["---".into(), "".into(), "---".into()],
    ];

    if exp_rows.is_empty() {
        report_rows.push(vec!["Operating Expenses".into(), "".into(), "0.00".into()]);
    } else {
        for (name, amt) in &exp_rows {
            report_rows.push(vec![format!("Expense: {}", name), "".into(), format!("{:.2}", amt)]);
        }
        report_rows.push(vec!["Total Operating Expenses".into(), "".into(), format!("{:.2}", regular_expenses)]);
    }



    report_rows.push(vec!["---".into(), "".into(), "---".into()]);
    report_rows.push(vec!["NET PROFIT".into(), "".into(), format!("{:.2}", net_profit)]);
    report_rows.push(vec!["---".into(), "".into(), "---".into()]);
    report_rows.push(vec!["Memo: Net Stock Purchases (For Inventory)".into(), "".into(), format!("{:.2}", net_purchases)]);

    Ok(ReportResult {
        title: "Profit Report".into(),
        headers: vec!["Description".into(), "".into(), "Amount".into()],
        rows: report_rows,
        totals: vec![
            ReportTotal { label: "Gross Profit".into(), value: gross_profit },
            ReportTotal { label: "Net Profit".into(), value: net_profit },
        ],
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeriodProfit {
    pub sales: f64,
    pub cogs: f64,
    pub gross_profit: f64,
    pub expenses: f64,
    pub fixed_liabilities: f64,
    pub net_profit: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfitMetrics {
    pub today: PeriodProfit,
    pub week: PeriodProfit,
    pub month: PeriodProfit,
}

async fn calculate_period_profit(
    pool: &SqlitePool, 
    start_date: &str, 
    end_date: &str,
    _fl_rows: &[(String, f64, String)]
) -> Result<PeriodProfit, String> {
    let sql = r#"
        SELECT
            i.invoice_type,
            COALESCE(SUM(ii.total_price), 0.0) as revenue,
            COALESCE(SUM(ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0)), 0.0) as cogs
        FROM invoices i
        JOIN invoice_items ii ON ii.invoice_id = i.id
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE i.invoice_type IN ('SALE', 'SALE_RETURN')
          AND date(i.invoice_date) BETWEEN date(?) AND date(?)
        GROUP BY i.invoice_type
    "#;
    let rows: Vec<(String, f64, f64)> = sqlx::query_as(sql)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut sales_rev = 0.0;
    let mut sales_cogs = 0.0;
    let mut returns_rev = 0.0;
    let mut returns_cogs = 0.0;

    for (itype, rev, cogs) in rows {
        if itype == "SALE" {
            sales_rev = rev;
            sales_cogs = cogs;
        } else if itype == "SALE_RETURN" {
            returns_rev = rev;
            returns_cogs = cogs;
        }
    }

    let sales = sales_rev - returns_rev;
    let cogs = sales_cogs - returns_cogs;
    let gross_profit = sales - cogs;

    let exp_sql = r#"
        SELECT COALESCE(SUM(je.debit - je.credit), 0.0)
        FROM journal_entries je
        JOIN accounts a ON je.account_id = a.id
        JOIN account_types at ON a.account_type_id = at.id
        WHERE at.nature = 'EXPENSE'
          AND a.id != 4
          AND at.id != 6
          AND date(je.entry_date) BETWEEN date(?) AND date(?)
    "#;
    let exp_row: (f64,) = sqlx::query_as(exp_sql)
        .bind(start_date)
        .bind(end_date)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
    let expenses = exp_row.0;

    let fixed_liabilities = 0.0;
    let net_profit = gross_profit - expenses;

    Ok(PeriodProfit {
        sales,
        cogs,
        gross_profit,
        expenses,
        fixed_liabilities,
        net_profit,
    })
}

#[tauri::command]
pub async fn get_profit_metrics(db: State<'_, SqlitePool>) -> Result<ProfitMetrics, String> {
    let now = chrono::Local::now().naive_local().date();
    let today_str = now.format("%Y-%m-%d").to_string();

    let days_from_sun = now.weekday().num_days_from_sunday();
    let start_of_week = now - chrono::Duration::days(days_from_sun as i64);
    let start_of_week_str = start_of_week.format("%Y-%m-%d").to_string();

    let start_of_month = chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap_or(now);
    let start_of_month_str = start_of_month.format("%Y-%m-%d").to_string();

    let fl_rows: Vec<(String, f64, String)> = sqlx::query_as("SELECT name, amount, frequency FROM fixed_liabilities")
        .fetch_all(&*db)
        .await
        .unwrap_or_default();

    let today = calculate_period_profit(&*db, &today_str, &today_str, &fl_rows).await?;
    let week = calculate_period_profit(&*db, &start_of_week_str, &today_str, &fl_rows).await?;
    let month = calculate_period_profit(&*db, &start_of_month_str, &today_str, &fl_rows).await?;

    Ok(ProfitMetrics { today, week, month })
}
async fn run_asset_report(pool: &SqlitePool, filters: &ReportFilters) -> Result<ReportResult, String> {
    let mut sql = String::from(r#"
        SELECT 
            name, 
            purchase_date, 
            purchase_price, 
            status, 
            IFNULL(sold_date, '-') as sold_date, 
            IFNULL(sold_price, 0.0) as sold_price 
        FROM company_assets 
        WHERE 1=1
    "#);

    if let Some(fd) = &filters.from_date {
        sql.push_str(&format!(" AND purchase_date >= '{}'", fd));
    }
    if let Some(td) = &filters.to_date {
        sql.push_str(&format!(" AND purchase_date <= '{}'", td));
    }
    sql.push_str(" ORDER BY purchase_date ASC");

    #[derive(sqlx::FromRow)]
    struct AssetRow {
        name: String,
        purchase_date: String,
        purchase_price: f64,
        status: String,
        sold_date: String,
        sold_price: f64,
    }

    let records: Vec<AssetRow> = sqlx::query_as(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("DB Error: {}", e))?;

    let mut rows = Vec::new();
    let mut total_purchase = 0.0;
    let mut total_sold = 0.0;

    for r in records {
        total_purchase += r.purchase_price;
        total_sold += r.sold_price;

        rows.push(vec![
            r.name,
            r.purchase_date,
            format!("{:.2}", r.purchase_price),
            r.status,
            r.sold_date,
            if r.sold_price > 0.0 { format!("{:.2}", r.sold_price) } else { "-".to_string() }
        ]);
    }

    Ok(ReportResult {
        title: "Company Assets Report".into(),
        headers: vec![
            "Asset Name".into(),
            "Purchase Date".into(),
            "Purchase Price".into(),
            "Status".into(),
            "Sold Date".into(),
            "Sold Price".into(),
        ],
        rows,
        totals: vec![
            ReportTotal { label: "Total Purchase Value".into(), value: total_purchase },
            ReportTotal { label: "Total Sold Value".into(), value: total_sold },
        ],
    })
}

#[tauri::command]
pub async fn generate_report(
    report_name: String,
    filters: ReportFilters,
    db: State<'_, SqlitePool>,
) -> Result<ReportResult, String> {
    let normalized = report_name.to_uppercase().replace(' ', "_");

    match normalized.as_str() {
        "LEDGER" | "LEDGER_REPORT" => run_ledger_report(&db, &filters).await,
        "CASHBOOK" | "CASH_BOOK" => run_cashbook_report(&db, &filters).await,
        "BANKBOOK" | "BANK_BOOK" => run_bankbook_report(&db, &filters).await,
        "TRIAL" | "TRIAL_BALANCE" => run_trial_balance_report(&db, &filters).await,
        "SALES" | "SALES_REPORT" => run_sales_report(&db, &filters).await,
        "PURCHASE" | "PURCHASES" | "PURCHASE_REPORT" => run_purchase_report(&db, &filters).await,
                "STOCK" | "STOCK_REPORT" => run_stock_report(&db, &filters).await,
        "PROFIT" | "PROFIT_REPORT" | "P&L" => run_profit_report(&db, &filters).await,
        "ASSETS" | "ASSET_REPORT" => run_asset_report(&db, &filters).await,
        "EXPENSES" => {
            let from_date = filters.from_date.clone().unwrap_or_else(|| "1970-01-01".to_string());
            let to_date = filters.to_date.clone().unwrap_or_else(|| "2100-01-01".to_string());
            run_expense_report(&from_date, &to_date, db).await
        },
        "ADJUSTMENTS" => {
            let from_date = filters.from_date.clone().unwrap_or_else(|| "1970-01-01".to_string());
            let to_date = filters.to_date.clone().unwrap_or_else(|| "2100-01-01".to_string());
            run_adjustments_report(&from_date, &to_date, db).await
        },
        other => Err(format!(
            "Unknown report type BANKBOOK supported '{}'. Supported: Ledger, CashBook, Trial, Sales, Purchase, Stock, Profit, Assets, Expenses, Adjustments.",
            other
        )),
    }
}


#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct InvoiceLineRaw {
    pub product_id: i64,
    pub qty: i64,
    pub rate: f64,
    pub discount_pct: f64,
    pub amount: f64,
    pub flavor: Option<String>,
}

#[tauri::command]
pub async fn get_invoice_lines(invoice_id: i64, db: State<'_, SqlitePool>) -> Result<Vec<InvoiceLineRaw>, String> {
    sqlx::query_as::<_, InvoiceLineRaw>(
        r#"
        SELECT 
            product_id,
            quantity as qty,
            unit_price as rate,
            discount_percent as discount_pct,
            total_price as amount,
            flavor
        FROM invoice_items
        WHERE invoice_id = ?
        "#
    )
    .bind(invoice_id)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
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
pub async fn run_expense_report(from_date: &str, to_date: &str, db: State<'_, SqlitePool>) -> Result<ReportResult, String> {
    let records = sqlx::query(
        r#"
        SELECT 
            je.entry_date,
            a.name as category,
            je.narration,
            je.debit as amount
        FROM journal_entries je
        JOIN accounts a ON je.account_id = a.id
        JOIN account_types at ON a.account_type_id = at.id
        WHERE at.nature = 'EXPENSE'
          AND je.debit > 0
          AND date(je.entry_date) >= date(?)
          AND date(je.entry_date) <= date(?)
        ORDER BY je.entry_date DESC
        "#
    )
    .bind(from_date)
    .bind(to_date)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())?;

    let mut rows = Vec::new();
    let mut total_amount = 0.0;

    for r in records {
        let entry_date: String = r.try_get("entry_date").unwrap_or_default();
        let category: String = r.try_get("category").unwrap_or_default();
        let narration: String = r.try_get("narration").unwrap_or_default();
        let amount: f64 = r.try_get("amount").unwrap_or(0.0);

        total_amount += amount;

        // format date
        let date_only = if entry_date.len() > 10 { entry_date[0..10].to_string() } else { entry_date };
        
        let row_vec = vec![
            date_only,
            category,
            narration,
            format!("{:.2}", amount)
        ];
        rows.push(row_vec);
    }

    let totals = vec![
        ReportTotal {
            label: "Total Expenses".to_string(),
            value: total_amount,
        }
    ];

    Ok(ReportResult {
        title: format!("Expenses Report ({} to {})", from_date, to_date),
        headers: vec!["Date".to_string(), "Category".to_string(), "Description".to_string(), "Amount".to_string()],
        rows,
        totals,
    })
}

pub async fn run_adjustments_report(from_date: &str, to_date: &str, db: State<'_, SqlitePool>) -> Result<ReportResult, String> {
    // We want to combine Cash, Sales, and Stock adjustments.
    
    // 1. Cash and Sales adjustments from journal_entries
    let financial_adj = sqlx::query(
        r#"
        SELECT 
            entry_date as date,
            voucher_type as type,
            narration as reason,
            debit as amount
        FROM journal_entries
        WHERE voucher_type IN ('CASH_ADJUSTMENT', 'SALES_ADJUSTMENT')
          AND debit > 0
          AND date(entry_date) >= date(?)
          AND date(entry_date) <= date(?)
        "#
    )
    .bind(from_date)
    .bind(to_date)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())?;

    // 2. Stock adjustments from inventory_movements
    let stock_adj = sqlx::query(
        r#"
        SELECT 
            datetime(im.created_at, 'localtime') as date,
            'STOCK_ADJUSTMENT' as type,
            im.notes as reason,
            p.name as product_name,
            im.quantity as qty
        FROM inventory_movements im
        JOIN products p ON im.product_id = p.id
        WHERE im.movement_type = 'ADJUSTMENT'
          AND date(im.created_at) >= date(?)
          AND date(im.created_at) <= date(?)
        "#
    )
    .bind(from_date)
    .bind(to_date)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())?;

    let mut rows = Vec::new();
    
    for r in financial_adj {
        let date_str: String = r.try_get("date").unwrap_or_default();
        let adj_type: String = r.try_get("type").unwrap_or_default();
        let reason: String = r.try_get("reason").unwrap_or_default();
        let amount: f64 = r.try_get("amount").unwrap_or(0.0);
        
        let display_type = if adj_type == "CASH_ADJUSTMENT" { "Cash" } else { "Sales" };
        let date_only = if date_str.len() > 10 { date_str[0..10].to_string() } else { date_str };
        
        rows.push(vec![
            date_only,
            display_type.to_string(),
            reason,
            format!("Rs. {:.2}", amount)
        ]);
    }

    for r in stock_adj {
        let date_str: String = r.try_get("date").unwrap_or_default();
        let reason: String = r.try_get("reason").unwrap_or_default();
        let product: String = r.try_get("product_name").unwrap_or_default();
        let qty: i64 = r.try_get("qty").unwrap_or(0);
        
        let date_only = if date_str.len() > 10 { date_str[0..10].to_string() } else { date_str };
        let qty_str = if qty > 0 { format!("+{} units", qty) } else { format!("{} units", qty) };
        
        rows.push(vec![
            date_only,
            "Stock".to_string(),
            format!("{} ({})", reason, product),
            qty_str
        ]);
    }

    // Sort rows by date descending
    rows.sort_by(|a, b| b[0].cmp(&a[0]));

    Ok(ReportResult {
        title: format!("Adjustments Report ({} to {})", from_date, to_date),
        headers: vec!["Date".to_string(), "Type".to_string(), "Reason / Details".to_string(), "Adjustment".to_string()],
        rows,
        totals: vec![],
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialSummary {
    pub total_revenue: f64,
    pub cogs: f64,
    pub gross_profit: f64,
    pub operating_expenses: f64,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub total_assets: f64,
    pub total_liabilities: f64,
    pub total_equity: f64,
}

#[tauri::command]
pub async fn get_financial_summary(
    start_date: Option<String>,
    end_date: Option<String>,
    db: State<'_, SqlitePool>
) -> Result<FinancialSummary, String> {
    let pool = &*db;
    let sd = start_date.unwrap_or_else(|| "1970-01-01".to_string());
    let ed = end_date.unwrap_or_else(|| "2999-12-31".to_string());

    // 1. Sales Revenue and COGS (Cost of Goods Sold) for the date range
    let cogs_row: (f64, f64) = sqlx::query_as(
        r#"
        SELECT
            COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN ii.total_price 
                              WHEN i.invoice_type = 'SALE_RETURN' THEN -ii.total_price ELSE 0.0 END), 0.0),
            COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN (ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0))
                              WHEN i.invoice_type = 'SALE_RETURN' THEN -(ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0)) ELSE 0.0 END), 0.0)
        FROM invoices i
        JOIN invoice_items ii ON ii.invoice_id = i.id
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE i.invoice_type IN ('SALE', 'SALE_RETURN')
          AND date(i.invoice_date) BETWEEN date(?) AND date(?)
        "#
    )
    .bind(&sd).bind(&ed)
    .fetch_one(pool)
    .await
    .unwrap_or((0.0, 0.0));

    let sales_revenue = cogs_row.0;
    let cogs = cogs_row.1;
    let gross_profit = sales_revenue - cogs;

    // 2. Real Operating Expenses from Journal Entries
    let op_exp: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(je.debit - je.credit), 0.0)
        FROM journal_entries je
        JOIN accounts a ON a.id = je.account_id
        JOIN account_types at ON at.id = a.account_type_id
        WHERE at.nature = 'EXPENSE'
          AND a.account_type_id != 16
          AND a.id NOT IN (4, 8, 18, 24)
          AND at.id != 6
          AND date(je.entry_date) BETWEEN date(?) AND date(?)
        "#
    )
    .bind(&sd).bind(&ed)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    let operating_expenses = op_exp;
    let total_expenses = cogs + operating_expenses;
    let net_profit = gross_profit - operating_expenses;

    // 3. ASSETS (Calculated up to ed)
    // a. Cash in Drawer (Account ID 1)
    let cash_bal: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(debit - credit), 0.0) FROM journal_entries WHERE account_id = 1 AND date(entry_date) <= date(?)"
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    // b. Bank Accounts
    let bank_bal: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(je.debit - je.credit), 0.0)
        FROM accounts a
        LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
        WHERE a.bank_name IS NOT NULL AND a.bank_name != ''
        "#
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    // c. Accounts Receivable (Customers, Salesmen & Loans with debit > credit > 0)
    let recv_bal: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(bal), 0.0) FROM (
            SELECT COALESCE(SUM(je.debit - je.credit), 0.0) as bal
            FROM accounts a
            LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
            WHERE a.account_type_id IN (2, 14, 17)
            GROUP BY a.id
            HAVING bal > 0.001
        )
        "#
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    // d. Live Stock Valuation (Quantity * Cost up to ed)
    let stock_val: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(im.quantity * p.purchase_price), 0.0)
        FROM inventory_movements im
        JOIN products p ON im.product_id = p.id
        WHERE date(im.created_at) <= date(?)
        "#
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    // e. Fixed Assets (Account type 9 with debit > credit > 0)
    let fixed_assets: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(bal), 0.0) FROM (
            SELECT COALESCE(SUM(je.debit - je.credit), 0.0) as bal
            FROM accounts a
            LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
            WHERE a.account_type_id = 9
            GROUP BY a.id
            HAVING bal > 0.001
        )
        "#
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    let total_assets = cash_bal + bank_bal + recv_bal + stock_val + fixed_assets;

    // 4. LIABILITIES (Real Payables up to ed)
    // a. Supplier Payables (Suppliers with credit > debit > 0)
    let supp_pay: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(bal), 0.0) FROM (
            SELECT COALESCE(SUM(je.credit - je.debit), 0.0) as bal
            FROM accounts a
            LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
            WHERE a.account_type_id = 4
            GROUP BY a.id
            HAVING bal > 0.001
        )
        "#
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    // b. Customer & Salesman Overpayments / Advances to pay back (credit > debit > 0)
    let cust_pay: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(bal), 0.0) FROM (
            SELECT COALESCE(SUM(je.credit - je.debit), 0.0) as bal
            FROM accounts a
            LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
            WHERE a.account_type_id IN (2, 14, 17)
            GROUP BY a.id
            HAVING bal > 0.001
        )
        "#
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    // c. Staff Unpaid Salaries (credit > debit > 0)
    let staff_unpaid: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(bal), 0.0) FROM (
            SELECT COALESCE(SUM(je.credit - je.debit), 0.0) as bal
            FROM accounts a
            LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
            WHERE a.account_type_id = 15
            GROUP BY a.id
            HAVING bal > 0.001
        )
        "#
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    // d. Other Liabilities (nature = LIABILITY excluding suppliers, staff, equity)
    let other_liab: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(bal), 0.0) FROM (
            SELECT COALESCE(SUM(je.credit - je.debit), 0.0) as bal
            FROM accounts a
            JOIN account_types at ON a.account_type_id = at.id
            LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
            WHERE at.nature = 'LIABILITY' AND a.account_type_id NOT IN (4, 15, 16)
            GROUP BY a.id
            HAVING bal > 0.001
        )
        "#
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    let total_liabilities = supp_pay + cust_pay + staff_unpaid + other_liab;

    // 5. EQUITY (Capital + Net Profit / Retained Earnings)
    let investor_capital: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(je.credit - je.debit), 0.0)
        FROM accounts a
        LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
        WHERE a.account_type_id = 16
        "#
    )
    .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

    let total_equity = investor_capital + net_profit;

    Ok(FinancialSummary {
        total_revenue: sales_revenue,
        cogs,
        gross_profit,
        operating_expenses,
        total_expenses,
        net_profit,
        total_assets,
        total_liabilities,
        total_equity,
    })
}

async fn run_bankbook_report(pool: &SqlitePool, filters: &ReportFilters) -> Result<ReportResult, String> {
    let date_clause = date_filter_clause(&filters.from_date, &filters.to_date, "je.entry_date");
    
    let (account_filter, title_suffix) = if let Some(aid) = filters.account_id {
        let acc_name: Option<String> = sqlx::query_scalar("SELECT name FROM accounts WHERE id = ?").bind(aid).fetch_optional(pool).await.unwrap_or(None);
        (format!("je.account_id = {aid}"), format!(" - {}", acc_name.unwrap_or_else(|| format!("Account #{}", aid))))
    } else {
        ("((a.account_type_id = 1 AND a.id != 1) OR a.bank_name IS NOT NULL)".to_string(), " - All Banks".to_string())
    };

    let sql = format!(
        r#"
        SELECT 
            datetime(je.entry_date, 'localtime') as entry_date, 
            a.name as bank_name,
            je.voucher_type, 
            je.ref_no,
            je.narration, 
            je.debit, 
            je.credit 
        FROM journal_entries je
        JOIN accounts a ON a.id = je.account_id
        WHERE {account_filter} {date_clause}
        ORDER BY je.id ASC
        "#
    );
    
    let raw_rows: Vec<(String, String, String, Option<String>, Option<String>, f64, f64)> = sqlx::query_as(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;
    
    let mut rows = Vec::new();
    let mut tot_dr = 0.0;
    let mut tot_cr = 0.0;
    
    for (dt, bank, vt, ref_no, nar, dr, cr) in raw_rows {
        tot_dr += dr;
        tot_cr += cr;
        rows.push(vec![
            dt,
            bank,
            ref_no.unwrap_or_default(),
            vt,
            nar.unwrap_or_default(),
            format!("{:.2}", dr),
            format!("{:.2}", cr),
        ]);
    }
    
    Ok(ReportResult {
        title: format!("Bank Book{}", title_suffix),
        headers: vec!["Date".to_string(), "Bank Account".to_string(), "Ref No".to_string(), "Type".to_string(), "Narration".to_string(), "Deposit (In)".to_string(), "Withdrawal (Out)".to_string()],
        rows,
        totals: vec![
            ReportTotal { label: "Total Inflows (Rs)".to_string(), value: tot_dr },
            ReportTotal { label: "Total Outflows (Rs)".to_string(), value: tot_cr },
            ReportTotal { label: "Net Closing Balance (Rs)".to_string(), value: tot_dr - tot_cr },
        ],
    })
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct ProductPurchaseRow {
    pub invoice_date: String,
    pub invoice_no: String,
    pub supplier_name: String,
    pub qty: i64,
    pub unit_price: f64,
    pub total_price: f64,
    pub sale_rate: f64,
}

#[tauri::command]
pub async fn get_product_purchase_history(product_id: i64, db: tauri::State<'_, sqlx::SqlitePool>) -> Result<Vec<ProductPurchaseRow>, String> {
    sqlx::query_as::<_, ProductPurchaseRow>(
        r#"
        SELECT 
            COALESCE(i.invoice_date, datetime('now', 'localtime')) as invoice_date,
            i.invoice_number as invoice_no,
            a.name as supplier_name,
            li.quantity as qty,
            li.unit_price as unit_price,
            li.total_price as total_price,
            COALESCE(li.sale_rate, 0.0) as sale_rate
        FROM invoice_items li
        JOIN invoices i ON i.id = li.invoice_id
        JOIN accounts a ON a.id = i.account_id
        WHERE li.product_id = ? AND i.invoice_type = 'PURCHASE'
        ORDER BY i.invoice_date DESC
        "#
    )
    .bind(product_id)
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("xdg-open").arg(&path).spawn();
    }
    Ok(())
}


#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialBreakdownItem {
    pub name: String,
    pub category: String,
    pub details: Option<String>,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialBreakdownResult {
    pub metric: String,
    pub title: String,
    pub formula: String,
    pub items: Vec<FinancialBreakdownItem>,
    pub total: f64,
}

#[tauri::command]
pub async fn get_financial_breakdown(
    metric: String,
    start_date: Option<String>,
    end_date: Option<String>,
    db: State<'_, SqlitePool>,
) -> Result<FinancialBreakdownResult, String> {
    let pool = &*db;
    let sd = start_date.unwrap_or_else(|| "1970-01-01".to_string());
    let ed = end_date.unwrap_or_else(|| "2999-12-31".to_string());

    match metric.to_uppercase().as_str() {
        "LIABILITIES" => {
            let mut items = Vec::new();

            // 1. Supplier Payables (Accounts Payable with positive credit balance)
            let supp_rows: Vec<(String, Option<String>, f64)> = sqlx::query_as(
                r#"
                SELECT a.name, a.contact,
                       COALESCE(SUM(je.credit - je.debit), 0.0) as bal
                FROM accounts a
                LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
                WHERE a.account_type_id = 4
                GROUP BY a.id, a.name
                HAVING bal > 0.001
                ORDER BY bal DESC
                "#
            )
            .bind(&ed)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            for (name, contact, bal) in supp_rows {
                items.push(FinancialBreakdownItem {
                    name,
                    category: "Accounts Payable (سپلائر کھاتہ)".into(),
                    details: contact.map(|c| format!("Contact: {}", c)),
                    amount: bal,
                });
            }

            // 2. Customer & Salesman Overpayments / Credit Balances (To Pay / Advance liabilities)
            let cust_rows: Vec<(String, Option<String>, i64, f64)> = sqlx::query_as(
                r#"
                SELECT a.name, a.contact, a.account_type_id,
                       COALESCE(SUM(je.credit - je.debit), 0.0) as bal
                FROM accounts a
                LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
                WHERE a.account_type_id IN (2, 14, 17)
                GROUP BY a.id, a.name
                HAVING bal > 0.001
                ORDER BY bal DESC
                "#
            )
            .bind(&ed)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            for (name, contact, acc_type, bal) in cust_rows {
                let cat_label = if acc_type == 14 {
                    "Salesman Credit / Payable (سیلز مین واجب الاداء بقایا)"
                } else if acc_type == 17 {
                    "Loan Payable / Overpayment (قرضہ واپسی واجب الاداء)"
                } else {
                    "Customer Advance / Overpayment (گاہک ایڈوانس / واجب الاداء بقایا)"
                };
                items.push(FinancialBreakdownItem {
                    name,
                    category: cat_label.into(),
                    details: contact.map(|c| format!("Contact: {}", c)),
                    amount: bal,
                });
            }

            // 3. Staff Unpaid Salaries
            let staff_rows: Vec<(String, Option<String>, f64)> = sqlx::query_as(
                r#"
                SELECT a.name, a.contact,
                       COALESCE(SUM(je.credit - je.debit), 0.0) as bal
                FROM accounts a
                LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
                WHERE a.account_type_id = 15
                GROUP BY a.id, a.name
                HAVING bal > 0.001
                ORDER BY bal DESC
                "#
            )
            .bind(&ed)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            for (name, contact, bal) in staff_rows {
                items.push(FinancialBreakdownItem {
                    name,
                    category: "Staff Unpaid Salary (ملازمین واجب الاداء تنخواہ)".into(),
                    details: contact.map(|c| format!("Contact: {}", c)),
                    amount: bal,
                });
            }

            // 4. Other Liabilities
            let other_rows: Vec<(String, Option<String>, f64)> = sqlx::query_as(
                r#"
                SELECT a.name, at.name,
                       COALESCE(SUM(je.credit - je.debit), 0.0) as bal
                FROM accounts a
                JOIN account_types at ON a.account_type_id = at.id
                LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
                WHERE at.nature = 'LIABILITY' AND a.account_type_id NOT IN (4, 15, 16)
                GROUP BY a.id, a.name
                HAVING bal > 0.001
                ORDER BY bal DESC
                "#
            )
            .bind(&ed)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            for (name, at_name, bal) in other_rows {
                items.push(FinancialBreakdownItem {
                    name,
                    category: format!("Other Liability ({})", at_name.unwrap_or_default()),
                    details: None,
                    amount: bal,
                });
            }

            let total: f64 = items.iter().map(|i| i.amount).sum();
            Ok(FinancialBreakdownResult {
                metric: "LIABILITIES".into(),
                title: "Total Liabilities Breakdown (واجبات کی مکمل تفصیل)".into(),
                formula: "Total Liabilities = Supplier Payables (سپلائرز کے واجبات) + Customer/Salesman Advances & Overpayments (گاہکوں اور سیلزمینوں کے واجب الاداء بقایا جات) + Accrued Liabilities".into(),
                items,
                total,
            })
        }
        "ASSETS" => {
            let mut items = Vec::new();

            // 1. Cash in Drawer (Account ID 1)
            let cash_bal: f64 = sqlx::query_scalar(
                "SELECT COALESCE(SUM(debit - credit), 0.0) FROM journal_entries WHERE account_id = 1 AND date(entry_date) <= date(?)"
            )
            .bind(&ed)
            .fetch_one(pool)
            .await
            .unwrap_or(0.0);

            items.push(FinancialBreakdownItem {
                name: "Cash in Drawer (دکان میں موجود کیش)".into(),
                category: "Cash & Liquid (کیش ان ہینڈ)".into(),
                details: Some("Account ID 1 (Cash In Hand)".into()),
                amount: cash_bal,
            });

            // 2. Bank Accounts
            let bank_rows: Vec<(String, Option<String>, Option<String>, f64)> = sqlx::query_as(
                r#"
                SELECT a.name, a.bank_name, a.account_number,
                       COALESCE(SUM(je.debit - je.credit), 0.0) as bal
                FROM accounts a
                LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
                WHERE a.bank_name IS NOT NULL AND a.bank_name != ''
                GROUP BY a.id, a.name
                HAVING ABS(bal) > 0.001
                "#
            )
            .bind(&ed)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            for (name, b_name, acc_num, bal) in bank_rows {
                let display_name = b_name.filter(|s| !s.trim().is_empty()).unwrap_or(name);
                items.push(FinancialBreakdownItem {
                    name: display_name,
                    category: "Bank Account (بینک اکاؤنٹ)".into(),
                    details: acc_num.map(|n| format!("A/C: {}", n)),
                    amount: bal,
                });
            }

            // 3. Accounts Receivable (Customers & Salesmen with debit > credit > 0)
            let ar_rows: Vec<(String, Option<String>, i64, f64)> = sqlx::query_as(
                r#"
                SELECT a.name, a.contact, a.account_type_id,
                       COALESCE(SUM(je.debit - je.credit), 0.0) as bal
                FROM accounts a
                LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
                WHERE a.account_type_id IN (2, 14, 17)
                GROUP BY a.id, a.name
                HAVING bal > 0.001
                ORDER BY bal DESC
                "#
            )
            .bind(&ed)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            for (name, contact, acc_type, bal) in ar_rows {
                let cat_label = if acc_type == 14 {
                    "Salesman Receivable (سیلز مین کھاتہ)"
                } else if acc_type == 17 {
                    "Loan Receivable (قرضہ دیا - وصول طلب)"
                } else {
                    "Customer Receivable (گاہک کھاتہ)"
                };
                items.push(FinancialBreakdownItem {
                    name,
                    category: cat_label.into(),
                    details: contact.map(|c| format!("Contact: {}", c)),
                    amount: bal,
                });
            }

            // 4. Live Stock Valuation (Quantity * Cost)
            let stock_val: f64 = sqlx::query_scalar(
                r#"
                SELECT COALESCE(SUM(im.quantity * p.purchase_price), 0.0)
                FROM inventory_movements im
                JOIN products p ON im.product_id = p.id
                WHERE date(im.created_at) <= date(?)
                "#
            )
            .bind(&ed)
            .fetch_one(pool)
            .await
            .unwrap_or(0.0);

            items.push(FinancialBreakdownItem {
                name: "Stock Inventory Valuation (گودام میں موجود اسٹاک مالیت)".into(),
                category: "Inventory (اسٹاک)".into(),
                details: Some("Calculated as Live Quantity × Cost / Purchase Price".into()),
                amount: stock_val,
            });

            // 5. Fixed Assets
            let asset_rows: Vec<(String, Option<String>, f64)> = sqlx::query_as(
                r#"
                SELECT a.name, a.designation,
                       COALESCE(SUM(je.debit - je.credit), 0.0) as bal
                FROM accounts a
                LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
                WHERE a.account_type_id = 9
                GROUP BY a.id, a.name
                HAVING bal > 0.001
                "#
            )
            .bind(&ed)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            for (name, desig, bal) in asset_rows {
                items.push(FinancialBreakdownItem {
                    name,
                    category: "Fixed Asset (مستقل اثاثہ جات)".into(),
                    details: desig,
                    amount: bal,
                });
            }

            let total: f64 = items.iter().map(|i| i.amount).sum();
            Ok(FinancialBreakdownResult {
                metric: "ASSETS".into(),
                title: "Total Assets Breakdown (کل اثاثہ جات کی تفصیل)".into(),
                formula: "Total Assets = Cash in Hand + Bank Accounts + Receivables (Customers/Salesmen/Loans) + Stock Valuation + Fixed Assets".into(),
                items,
                total,
            })
        }
        "EXPENSES" => {
            let exp_rows: Vec<(String, f64)> = sqlx::query_as(
                r#"
                SELECT a.name, COALESCE(SUM(je.debit - je.credit), 0.0) as bal
                FROM accounts a
                JOIN account_types at ON a.account_type_id = at.id
                JOIN journal_entries je ON je.account_id = a.id
                WHERE at.nature = 'EXPENSE'
                  AND a.account_type_id != 16
                  AND a.id NOT IN (4, 8, 18, 24)
                  AND at.id != 6
                  AND date(je.entry_date) BETWEEN date(?) AND date(?)
                GROUP BY a.id, a.name
                HAVING bal != 0.0
                ORDER BY bal DESC
                "#
            )
            .bind(&sd).bind(&ed)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            let mut items = Vec::new();
            for (name, bal) in exp_rows {
                items.push(FinancialBreakdownItem {
                    name,
                    category: "Operating Expense (آپریٹنگ خرچہ)".into(),
                    details: None,
                    amount: bal,
                });
            }

            let total: f64 = items.iter().map(|i| i.amount).sum();
            Ok(FinancialBreakdownResult {
                metric: "EXPENSES".into(),
                title: "Operating Expenses Breakdown (کاروباری اخراجات کی تفصیل)".into(),
                formula: "Operating Expenses = Sum of all operational expense entries (Fuel, Salaries, Rent, Utilities, Refreshments)".into(),
                items,
                total,
            })
        }
        "COGS" => {
            let cogs_rows: Vec<(String, i64, f64, f64)> = sqlx::query_as(
                r#"
                SELECT p.name,
                       SUM(CASE WHEN i.invoice_type = 'SALE' THEN ii.quantity WHEN i.invoice_type = 'SALE_RETURN' THEN -ii.quantity ELSE 0 END) as qty_sold,
                       COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0) as unit_cost,
                       SUM(CASE WHEN i.invoice_type = 'SALE' THEN (ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0))
                                WHEN i.invoice_type = 'SALE_RETURN' THEN -(ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0)) ELSE 0.0 END) as line_cogs
                FROM invoices i
                JOIN invoice_items ii ON ii.invoice_id = i.id
                LEFT JOIN products p ON ii.product_id = p.id
                WHERE i.invoice_type IN ('SALE', 'SALE_RETURN')
                  AND date(i.invoice_date) BETWEEN date(?) AND date(?)
                GROUP BY p.id, p.name, unit_cost
                HAVING line_cogs != 0.0
                ORDER BY line_cogs DESC
                "#
            )
            .bind(&sd).bind(&ed)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            let mut items = Vec::new();
            for (p_name, qty, cost, line_cogs) in cogs_rows {
                items.push(FinancialBreakdownItem {
                    name: p_name,
                    category: "Sold Inventory Cost (فروخت شدہ مال کی لاگت)".into(),
                    details: Some(format!("{} units @ Rs. {:.2} cost price", qty, cost)),
                    amount: line_cogs,
                });
            }

            let total: f64 = items.iter().map(|i| i.amount).sum();
            Ok(FinancialBreakdownResult {
                metric: "COGS".into(),
                title: "Cost of Goods Sold (COGS) Breakdown (فروخت شدہ مال کی لاگت)".into(),
                formula: "COGS = Sum(Sold Quantity × Purchase Cost Price)".into(),
                items,
                total,
            })
        }
        "REVENUE" => {
            let row: (f64, f64, f64) = sqlx::query_as(
                r#"
                SELECT 
                    COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN gross_amount ELSE 0.0 END), 0.0) as gross_sales,
                    COALESCE(SUM(CASE WHEN invoice_type = 'SALE_RETURN' THEN net_amount ELSE 0.0 END), 0.0) as returns,
                    COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN discount_amount ELSE 0.0 END), 0.0) as discount
                FROM invoices
                WHERE invoice_type IN ('SALE', 'SALE_RETURN')
                  AND date(invoice_date) BETWEEN date(?) AND date(?)
                "#
            )
            .bind(&sd).bind(&ed)
            .fetch_one(pool)
            .await
            .unwrap_or((0.0, 0.0, 0.0));

            let items = vec![
                FinancialBreakdownItem {
                    name: "Gross Sales Invoices (کل سیلز بلز)".into(),
                    category: "Sales (سیلز)".into(),
                    details: Some("Total invoice gross value before discount".into()),
                    amount: row.0,
                },
                FinancialBreakdownItem {
                    name: "Less: Sales Returns (منہائی: واپسی مال)".into(),
                    category: "Deductions (منہائی)".into(),
                    details: Some("Items returned by customers".into()),
                    amount: -row.1,
                },
                FinancialBreakdownItem {
                    name: "Less: Total Discounts Given (منہائی: ڈسکاؤنٹ)".into(),
                    category: "Deductions (منہائی)".into(),
                    details: Some("Invoice line item discounts".into()),
                    amount: -row.2,
                },
            ];

            let total = row.0 - row.1 - row.2;
            Ok(FinancialBreakdownResult {
                metric: "REVENUE".into(),
                title: "Net Sales Revenue Breakdown (خالص سیلز آمدنی)".into(),
                formula: "Net Revenue = Gross Sales Invoiced - Sales Returns - Discounts Given".into(),
                items,
                total,
            })
        }
        "GROSS_PROFIT" => {
            let rev: f64 = sqlx::query_scalar(
                "SELECT COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN net_amount WHEN invoice_type = 'SALE_RETURN' THEN -net_amount ELSE 0.0 END), 0.0) FROM invoices WHERE invoice_type IN ('SALE', 'SALE_RETURN') AND date(invoice_date) BETWEEN date(?) AND date(?)"
            )
            .bind(&sd).bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

            let cogs: f64 = sqlx::query_scalar(
                r#"
                SELECT COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN (ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0))
                                         WHEN i.invoice_type = 'SALE_RETURN' THEN -(ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0)) ELSE 0.0 END), 0.0)
                FROM invoices i
                JOIN invoice_items ii ON ii.invoice_id = i.id
                LEFT JOIN products p ON ii.product_id = p.id
                WHERE i.invoice_type IN ('SALE', 'SALE_RETURN') AND date(i.invoice_date) BETWEEN date(?) AND date(?)
                "#
            )
            .bind(&sd).bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

            let items = vec![
                FinancialBreakdownItem {
                    name: "Net Sales Revenue (خالص فروخت)".into(),
                    category: "Revenue (آمدنی)".into(),
                    details: None,
                    amount: rev,
                },
                FinancialBreakdownItem {
                    name: "Less: Cost of Goods Sold / COGS (منہائی: مال کی لاگت)".into(),
                    category: "Cost of Goods (لاگت)".into(),
                    details: None,
                    amount: -cogs,
                },
            ];

            Ok(FinancialBreakdownResult {
                metric: "GROSS_PROFIT".into(),
                title: "Gross Profit Margin Breakdown (خام منافع کی تفصیل)".into(),
                formula: "Gross Profit = Net Sales Revenue - Cost of Goods Sold (COGS)".into(),
                items,
                total: rev - cogs,
            })
        }
        "NET_PROFIT" => {
            let rev: f64 = sqlx::query_scalar(
                "SELECT COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN net_amount WHEN invoice_type = 'SALE_RETURN' THEN -net_amount ELSE 0.0 END), 0.0) FROM invoices WHERE invoice_type IN ('SALE', 'SALE_RETURN') AND date(invoice_date) BETWEEN date(?) AND date(?)"
            )
            .bind(&sd).bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

            let cogs: f64 = sqlx::query_scalar(
                r#"
                SELECT COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN (ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0))
                                         WHEN i.invoice_type = 'SALE_RETURN' THEN -(ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0)) ELSE 0.0 END), 0.0)
                FROM invoices i
                JOIN invoice_items ii ON ii.invoice_id = i.id
                LEFT JOIN products p ON ii.product_id = p.id
                WHERE i.invoice_type IN ('SALE', 'SALE_RETURN') AND date(i.invoice_date) BETWEEN date(?) AND date(?
                "#
            )
            .bind(&sd).bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

            let gross = rev - cogs;

            let op_exp: f64 = sqlx::query_scalar(
                r#"
                SELECT COALESCE(SUM(je.debit - je.credit), 0.0)
                FROM journal_entries je
                JOIN accounts a ON a.id = je.account_id
                JOIN account_types at ON at.id = a.account_type_id
                WHERE at.nature = 'EXPENSE' AND a.id != 4 AND at.id != 6 AND date(je.entry_date) BETWEEN date(?) AND date(?)
                "#
            )
            .bind(&sd).bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

            let items = vec![
                FinancialBreakdownItem {
                    name: "Gross Profit / Margin (خام منافع)".into(),
                    category: "Profit (منافع)".into(),
                    details: Some("Revenue minus purchase cost of goods sold".into()),
                    amount: gross,
                },
                FinancialBreakdownItem {
                    name: "Less: Operating Expenses (منہائی: دفتری و دکان کے اخراجات)".into(),
                    category: "Expenses (اخراجات)".into(),
                    details: Some("Salaries, fuel, utilities, tea, rent, etc.".into()),
                    amount: -op_exp,
                },
            ];

            Ok(FinancialBreakdownResult {
                metric: "NET_PROFIT".into(),
                title: "Net Profit Breakdown (خالص منافع کا حساب)".into(),
                formula: "Net Profit = Gross Margin - Operating Expenses".into(),
                items,
                total: gross - op_exp,
            })
        }
        "EQUITY" => {
            let inv_rows: Vec<(String, f64)> = sqlx::query_as(
                r#"
                SELECT a.name, COALESCE(SUM(je.credit - je.debit), 0.0) as bal
                FROM accounts a
                LEFT JOIN journal_entries je ON je.account_id = a.id AND date(je.entry_date) <= date(?)
                WHERE a.account_type_id = 16 AND a.id NOT IN (18, 24)
                GROUP BY a.id, a.name
                HAVING bal != 0.0
                "#
            )
            .bind(&ed).fetch_all(pool).await.unwrap_or_default();

            let mut items = Vec::new();
            for (name, bal) in inv_rows {
                items.push(FinancialBreakdownItem {
                    name,
                    category: "Owner / Investor Capital (اصل سرمایہ)".into(),
                    details: Some("Capital Contributed to Business".into()),
                    amount: bal,
                });
            }

            // Explicit Deduction: Owner Drawings (ذاتی اخراجات)
            let drawings_amount: f64 = sqlx::query_scalar(
                r#"
                SELECT COALESCE(SUM(je.debit - je.credit), 0.0)
                FROM journal_entries je
                WHERE (je.account_id = 24 OR je.ref_no LIKE 'DRW-%' OR je.narration LIKE '%Owner Drawing%' OR je.narration LIKE '%ذاتی خرچ%')
                  AND date(je.entry_date) <= date(?)
                "#
            )
            .bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

            if drawings_amount > 0.001 {
                items.push(FinancialBreakdownItem {
                    name: "Owner Drawings (مالک کے ذاتی و گھریلو اخراجات)".into(),
                    category: "Less: Owner Drawings (منہائی: ذاتی اخراجات)".into(),
                    details: Some("Direct reduction from Owner Equity".into()),
                    amount: -drawings_amount,
                });
            }

            // Calculate Period Net Profit to show as Retained Earnings
            let rev: f64 = sqlx::query_scalar(
                "SELECT COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN net_amount WHEN invoice_type = 'SALE_RETURN' THEN -net_amount ELSE 0.0 END), 0.0) FROM invoices WHERE invoice_type IN ('SALE', 'SALE_RETURN') AND date(invoice_date) BETWEEN date(?) AND date(?)"
            )
            .bind(&sd).bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

            let cogs: f64 = sqlx::query_scalar(
                r#"
                SELECT COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN (ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0))
                                         WHEN i.invoice_type = 'SALE_RETURN' THEN -(ii.quantity * COALESCE(NULLIF(ii.cost_price, 0.0), p.purchase_price, 0.0)) ELSE 0.0 END), 0.0)
                FROM invoices i
                JOIN invoice_items ii ON ii.invoice_id = i.id
                LEFT JOIN products p ON ii.product_id = p.id
                WHERE i.invoice_type IN ('SALE', 'SALE_RETURN') AND date(i.invoice_date) BETWEEN date(?) AND date(?)
                "#
            )
            .bind(&sd).bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

            let op_exp: f64 = sqlx::query_scalar(
                r#"
                SELECT COALESCE(SUM(je.debit - je.credit), 0.0)
                FROM journal_entries je
                JOIN accounts a ON a.id = je.account_id
                JOIN account_types at ON at.id = a.account_type_id
                WHERE at.nature = 'EXPENSE' AND a.account_type_id != 16 AND a.id NOT IN (4, 8, 18, 24) AND at.id != 6 AND date(je.entry_date) BETWEEN date(?) AND date(?)
                "#
            )
            .bind(&sd).bind(&ed).fetch_one(pool).await.unwrap_or(0.0);

            let net_prof = (rev - cogs) - op_exp;

            items.push(FinancialBreakdownItem {
                name: "Retained Earnings / Current Period Net Profit (خالص منافع / نقصان)".into(),
                category: "Accumulated P&L (منافع / نقصان)".into(),
                details: Some("Calculated as Gross Profit minus Operating Expenses".into()),
                amount: net_prof,
            });

            let total: f64 = items.iter().map(|i| i.amount).sum();
            Ok(FinancialBreakdownResult {
                metric: "EQUITY".into(),
                title: "Total Equity & Capital Breakdown (سرمایہ کی تفصیل)".into(),
                formula: "Total Equity = Total Capital (سرمایہ) - Owner Drawings (ذاتی اخراجات) + Net Profit (خالص منافع)".into(),
                items,
                total,
            })
        }
        _ => Err(format!("Unknown financial metric: {}", metric)),
    }
}
