use sqlx::SqlitePool;
use tauri::State;
use serde::Deserialize;
use chrono::Local;

#[derive(Debug, Deserialize)]
pub struct SaleLine {
    pub product_id: i64,
    pub quantity: i64,
    pub unit_price: f64,
    pub discount_percent: Option<f64>,
}

#[tauri::command]
pub async fn process_sale(
    account_id: i64,
    salesman_id: Option<i64>,
    invoice_number: Option<String>,
    lines: Vec<SaleLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    amount_received: f64,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    // Create invoice header
    let inv_no = invoice_number.unwrap_or_else(|| format!("INV-{}", Local::now().timestamp()));

    let res = sqlx::query(
        "INSERT INTO invoices (invoice_number, invoice_type, account_id, salesman_id, gross_amount, discount_amount, net_amount, amount_received, bakaya, status) VALUES (?, 'SALE', ?, ?, ?, ?, ?, ?, ?, 'POSTED')"
    )
    .bind(&inv_no)
    .bind(account_id)
    .bind(salesman_id)
    .bind(gross_amount)
    .bind(discount_amount)
    .bind(net_amount)
    .bind(amount_received)
    .bind(net_amount - amount_received)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let invoice_id = res.last_insert_rowid();

    // Insert lines and stock movements
    for line in &lines {
        let disc_pct = line.discount_percent.unwrap_or(0.0);
        let line_gross = (line.quantity as f64) * line.unit_price;
        let disc_amt = line_gross * (disc_pct / 100.0);
        let total_price = line_gross - disc_amt;

        sqlx::query("INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(invoice_id)
            .bind(line.product_id)
            .bind(line.quantity)
            .bind(line.unit_price)
            .bind(disc_pct)
            .bind(total_price)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        // Record inventory movement (sale reduces stock)
        sqlx::query("INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id) VALUES (?, ?, 'SALE', ?)")
            .bind(line.product_id)
            .bind(-line.quantity)
            .bind(invoice_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Accounting: Debit Customer (AR) and Credit Sales Revenue
    sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'INVOICE', ?, 'Sale Invoice')")
        .bind(account_id)
        .bind(net_amount)
        .bind(invoice_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'INVOICE', ?, 'Sale Revenue')")
        .bind(3) // Sales revenue account seeded with id 3
        .bind(net_amount)
        .bind(invoice_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Handle immediate payment (reduce AR)
    if amount_received > 0.0 {
        // Debit Cash Drawer (id 1)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (1, ?, 0.0, 'CASH_RECEIPT', ?, 'Payment Received at POS')")
            .bind(amount_received).bind(invoice_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        // Credit Customer (reduce AR)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'CASH_RECEIPT', ?, 'Payment Received at POS')")
            .bind(account_id).bind(amount_received).bind(invoice_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(format!("Sale Invoice {} posted with id {}", inv_no, invoice_id))
}

#[tauri::command]
pub async fn process_sale_return(
    account_id: i64,
    invoice_number: Option<String>,
    lines: Vec<SaleLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    // Create invoice header
    let inv_no = invoice_number.unwrap_or_else(|| format!("SR-{}", Local::now().timestamp()));

    let res = sqlx::query(
        "INSERT INTO invoices (invoice_number, invoice_type, account_id, gross_amount, discount_amount, net_amount, amount_received, bakaya, status) VALUES (?, 'SALE_RETURN', ?, ?, ?, ?, 0.0, ?, 'POSTED')"
    )
    .bind(&inv_no)
    .bind(account_id)
    .bind(gross_amount)
    .bind(discount_amount)
    .bind(net_amount)
    .bind(net_amount)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let invoice_id = res.last_insert_rowid();

    // Insert lines and stock movements
    for line in &lines {
        let disc_pct = line.discount_percent.unwrap_or(0.0);
        let line_gross = (line.quantity as f64) * line.unit_price;
        let disc_amt = line_gross * (disc_pct / 100.0);
        let total_price = line_gross - disc_amt;

        sqlx::query("INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(invoice_id)
            .bind(line.product_id)
            .bind(line.quantity)
            .bind(line.unit_price)
            .bind(disc_pct)
            .bind(total_price)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        // Record inventory movement (sale return increases stock)
        sqlx::query("INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id) VALUES (?, ?, 'SALE_RETURN', ?)")
            .bind(line.product_id)
            .bind(line.quantity)
            .bind(invoice_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Accounting: Debit Sales Returns (use account ID 3) and Credit the customer/account
    sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'SALE_RETURN', ?, 'Sale Return')")
        .bind(3) 
        .bind(net_amount)
        .bind(invoice_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'SALE_RETURN', ?, 'Sale Return')")
        .bind(account_id)
        .bind(net_amount)
        .bind(invoice_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(format!("Sale Return {} posted with id {}", inv_no, invoice_id))
}
