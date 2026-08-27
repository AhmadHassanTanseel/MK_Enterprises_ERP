use sqlx::SqlitePool;
use tauri::State;
use serde::Deserialize;

use crate::system_accounts::get_system_accounts;

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
    invoice_date: String,
    lines: Vec<SaleLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    amount_received: f64,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    let accounts = get_system_accounts(&db).await?;

    // Create invoice header
    let inv_no = match invoice_number {
        Some(no) => no,
        None => {
            let row: Option<(String,)> = sqlx::query_as(
                "SELECT invoice_number FROM invoices WHERE invoice_type = 'SALE' ORDER BY id DESC LIMIT 1"
            )
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

            let next_seq = if let Some((last_inv,)) = row {
                if let Some(num_str) = last_inv.strip_prefix("INV-") {
                    num_str.parse::<i64>().unwrap_or(0) + 1
                } else {
                    1
                }
            } else {
                1
            };
            format!("INV-{:05}", next_seq)
        }
    };

    let res = sqlx::query(
        "INSERT INTO invoices (invoice_number, invoice_type, invoice_date, account_id, salesman_id, gross_amount, discount_amount, net_amount, amount_received, bakaya, status) VALUES (?, 'SALE', ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED')"
    )
    .bind(&inv_no)
    .bind(&invoice_date)
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
        // Stock check
        let stock_row: (i64,) = sqlx::query_as(
            "SELECT COALESCE(SUM(quantity), 0) FROM inventory_movements WHERE product_id = ?"
        )
        .bind(line.product_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let current_stock = stock_row.0;
        if current_stock - line.quantity < 0 {
            return Err(format!(
                "Insufficient stock for product {}. Available: {}, Requested: {}",
                line.product_id, current_stock, line.quantity
            ));
        }

        let disc_per_unit = line.discount_percent.unwrap_or(0.0);
        let total_price = (line.unit_price - disc_per_unit) * (line.quantity as f64);

        sqlx::query("INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(invoice_id)
            .bind(line.product_id)
            .bind(line.quantity)
            .bind(line.unit_price)
            .bind(disc_per_unit)
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
        .bind(accounts.sales_revenue)
        .bind(net_amount)
        .bind(invoice_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Handle immediate payment (reduce AR)
    if amount_received > 0.0 {
        // Debit Cash Drawer (id 1)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'CASH_RECEIPT', ?, 'Payment Received at POS')")
            .bind(accounts.cash).bind(amount_received).bind(invoice_id)
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
    invoice_date: String,
    lines: Vec<SaleLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    let accounts = get_system_accounts(&db).await?;

    // Create invoice header
    let inv_no = match invoice_number {
        Some(no) => no,
        None => {
            let row: Option<(String,)> = sqlx::query_as(
                "SELECT invoice_number FROM invoices WHERE invoice_type = 'SALE_RETURN' ORDER BY id DESC LIMIT 1"
            )
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

            let next_seq = if let Some((last_inv,)) = row {
                if let Some(num_str) = last_inv.strip_prefix("SR-") {
                    num_str.parse::<i64>().unwrap_or(0) + 1
                } else {
                    1
                }
            } else {
                1
            };
            format!("SR-{:05}", next_seq)
        }
    };

    let res = sqlx::query(
        "INSERT INTO invoices (invoice_number, invoice_type, invoice_date, account_id, gross_amount, discount_amount, net_amount, amount_received, bakaya, status) VALUES (?, 'SALE_RETURN', ?, ?, ?, ?, ?, 0.0, ?, 'POSTED')"
    )
    .bind(&inv_no)
    .bind(&invoice_date)
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
        let disc_per_unit = line.discount_percent.unwrap_or(0.0);
        let total_price = (line.unit_price - disc_per_unit) * (line.quantity as f64);

        sqlx::query("INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(invoice_id)
            .bind(line.product_id)
            .bind(line.quantity)
            .bind(line.unit_price)
            .bind(disc_per_unit)
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
        .bind(accounts.sales_revenue)
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
