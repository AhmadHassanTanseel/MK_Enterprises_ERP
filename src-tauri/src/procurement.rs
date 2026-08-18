use sqlx::SqlitePool;
use tauri::State;

use serde::Deserialize;

use crate::system_accounts::get_system_accounts;

// 1. Process a New Purchase Invoice (FULL Persistence)
#[derive(Debug, Deserialize)]
pub struct InvoiceLine {
    pub product_id: i64,
    pub quantity: i64,
    pub unit_price: f64,
    pub discount_percent: Option<f64>,
}

#[tauri::command]
pub async fn process_purchase(
    supplier_id: i64,
    salesman_id: Option<i64>,
    invoice_number: Option<String>,
    invoice_date: String,
    lines: Vec<InvoiceLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    amount_paid: f64,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    let accounts = get_system_accounts(&db).await?;

    // Create an invoice header
    let inv_no = match invoice_number {
        Some(no) => no,
        None => {
            let row: Option<(String,)> = sqlx::query_as(
                "SELECT invoice_number FROM invoices WHERE invoice_type = 'PURCHASE' ORDER BY id DESC LIMIT 1"
            )
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

            let next_seq = if let Some((last_inv,)) = row {
                if let Some(num_str) = last_inv.strip_prefix("PUR-") {
                    num_str.parse::<i64>().unwrap_or(0) + 1
                } else {
                    1
                }
            } else {
                1
            };
            format!("PUR-{:05}", next_seq)
        }
    };

    let res = sqlx::query(
        "INSERT INTO invoices (invoice_number, invoice_type, invoice_date, account_id, salesman_id, gross_amount, discount_amount, net_amount, amount_received, bakaya, status) VALUES (?, 'PURCHASE', ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED')"
    )
    .bind(&inv_no)
    .bind(&invoice_date)
    .bind(supplier_id)
    .bind(salesman_id)
    .bind(gross_amount)
    .bind(discount_amount)
    .bind(net_amount)
    .bind(amount_paid)
    .bind(net_amount - amount_paid)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let invoice_id = res.last_insert_rowid();

    // Insert invoice lines and inventory movements
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

        // Record inventory movement (purchase adds positive stock)
        sqlx::query("INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id) VALUES (?, ?, 'PURCHASE', ?)")
            .bind(line.product_id)
            .bind(line.quantity)
            .bind(invoice_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Accounting: Credit Supplier (increase payable) and Debit Purchases (expense)
    sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'PURCHASE', ?, 'Purchase Invoice')")
        .bind(accounts.purchases)
        .bind(net_amount)
        .bind(invoice_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'PURCHASE', ?, 'Purchase Invoice Payable')")
        .bind(supplier_id)
        .bind(net_amount)
        .bind(invoice_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Handle immediate cash payment
    if amount_paid > 0.0 {
        // Debit Supplier (reduces payable)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'CASH_PAYMENT', ?, 'Paid Supplier at Purchase')")
            .bind(supplier_id)
            .bind(amount_paid)
            .bind(invoice_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        // Credit Cash Drawer (decrease cash)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'CASH_PAYMENT', ?, 'Paid Supplier at Purchase')")
            .bind(accounts.cash).bind(amount_paid).bind(invoice_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(format!("Purchase Invoice {} posted with id {}", inv_no, invoice_id))
}

// 2. The MS Access "D vs R" Return Engine
#[tauri::command]
pub async fn process_return(
    supplier_id: i64,
    invoice_number: Option<String>,
    invoice_date: String,
    lines: Vec<InvoiceLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    return_type: String, // "R" or "D"
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    let accounts = get_system_accounts(&db).await?;

    let inv_no = match invoice_number {
        Some(no) => no,
        None => {
            let row: Option<(String,)> = sqlx::query_as(
                "SELECT invoice_number FROM invoices WHERE invoice_type = 'PURCHASE_RETURN' ORDER BY id DESC LIMIT 1"
            )
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

            let next_seq = if let Some((last_inv,)) = row {
                if let Some(num_str) = last_inv.strip_prefix("PR-") {
                    num_str.parse::<i64>().unwrap_or(0) + 1
                } else {
                    1
                }
            } else {
                1
            };
            format!("PR-{:05}", next_seq)
        }
    };

    let res = sqlx::query(
        "INSERT INTO invoices (invoice_number, invoice_type, invoice_date, account_id, gross_amount, discount_amount, net_amount, amount_received, bakaya, status) VALUES (?, 'PURCHASE_RETURN', ?, ?, ?, ?, ?, 0.0, ?, 'POSTED')"
    )
    .bind(&inv_no)
    .bind(&invoice_date)
    .bind(supplier_id)
    .bind(gross_amount)
    .bind(discount_amount)
    .bind(net_amount)
    .bind(net_amount)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let invoice_id = res.last_insert_rowid();
    let movement = if return_type == "D" { "DAMAGE_WRITE_OFF" } else { "PURCHASE_RETURN" };

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

        // Record inventory movement (both D & R reduce inventory physically)
        sqlx::query("INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id) VALUES (?, ?, ?, ?)")
            .bind(line.product_id)
            .bind(-line.quantity)
            .bind(movement)
            .bind(invoice_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    if return_type == "R" {
        // RETURN (R): Debit Supplier, Credit Purchases (Supplier takes the hit)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'PURCHASE_RETURN', ?, 'Returned to Supplier')")
            .bind(supplier_id).bind(net_amount).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'PURCHASE_RETURN', ?, 'Returned to Supplier')")
            .bind(accounts.purchases).bind(net_amount).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    } else {
        // DAMAGE (D): Debit Damage Loss, Credit Purchases (We take the hit)
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'DAMAGE', ?, 'Damaged Goods Written Off')")
            .bind(accounts.damage_loss).bind(net_amount).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'DAMAGE', ?, 'Damaged Goods Written Off')")
            .bind(accounts.purchases).bind(net_amount).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(format!("Processed successfully as {}!", if return_type == "D" { "Damage Write-off" } else { "Supplier Return" }))
}
