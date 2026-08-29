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
    pub account_name: String,
    pub mobile: Option<String>,
    pub net_amount: f64,
    pub t_amount: f64, // Total Amount (Gross)
    pub discount: f64,
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
            a.name as account_name, 
            a.contact as mobile, 
            i.net_amount, 
            i.gross_amount as t_amount, 
            i.discount_amount as discount, 
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
            a.name as account_name, 
            a.contact as mobile, 
            i.net_amount, 
            i.gross_amount as t_amount, 
            i.discount_amount as discount, 
            i.status,
            i.invoice_type
        FROM invoices i
        JOIN accounts a ON i.account_id = a.id
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
        title: "Account Ledger".to_string(),
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
    let date_clause = date_filter_clause(&filters.from_date, &filters.to_date, "invoice_date");

    let sql = format!(
        r#"
        SELECT
            invoice_type,
            COUNT(*) as txn_count,
            COALESCE(SUM(net_amount), 0) as total_amount
        FROM invoices
        WHERE invoice_type IN ('SALE', 'SALE_RETURN', 'PURCHASE', 'PURCHASE_RETURN'){date_clause}
        GROUP BY invoice_type
        "#
    );

    let rows: Vec<(String, i64, f64)> =
        sqlx::query_as(&sql).fetch_all(pool).await.map_err(|e| e.to_string())?;

    let mut sales = 0.0;
    let mut sale_returns = 0.0;
    let mut purchases = 0.0;
    let mut purchase_returns = 0.0;

    for (invoice_type, count, amount) in &rows {
        let label = match invoice_type.as_str() {
            "SALE" => {
                sales = *amount;
                "Sales"
            }
            "SALE_RETURN" => {
                sale_returns = *amount;
                "Sale Returns"
            }
            "PURCHASE" => {
                purchases = *amount;
                "Purchases"
            }
            "PURCHASE_RETURN" => {
                purchase_returns = *amount;
                "Purchase Returns"
            }
            _ => "Other",
        };
        // rows built below
        let _ = (label, count);
    }

    let net_sales = sales - sale_returns;
    let net_purchases = purchases - purchase_returns;
    let gross_profit = net_sales - net_purchases;

    let report_rows: Vec<Vec<String>> = rows
        .iter()
        .map(|r| {
            vec![
                r.0.clone(),
                r.1.to_string(),
                format!("{:.2}", r.2),
            ]
        })
        .collect();

    Ok(ReportResult {
        title: "Profit Report".into(),
        headers: vec!["Type".into(), "Transactions".into(), "Amount".into()],
        rows: report_rows,
        totals: vec![
            ReportTotal { label: "Net Sales".into(), value: net_sales },
            ReportTotal { label: "Net Purchases".into(), value: net_purchases },
            ReportTotal { label: "Gross Profit".into(), value: gross_profit },
        ],
    })
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
            "Unknown report type '{}'. Supported: Ledger, CashBook, Trial, Sales, Purchase, Stock, Profit, Assets, Expenses, Adjustments.",
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
            total_price as amount
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
