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
    pub flavor: Option<String>,
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
    amount_received_cash: f64,
    amount_received_bank: f64,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    process_sale_internal(account_id, salesman_id, invoice_number, invoice_date, lines, gross_amount, discount_amount, net_amount, amount_received_cash, amount_received_bank, &*db).await
}

pub async fn process_sale_internal(
    account_id: i64,
    salesman_id: Option<i64>,
    invoice_number: Option<String>,
    invoice_date: String,
    lines: Vec<SaleLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    amount_received_cash: f64,
    amount_received_bank: f64,
    db: &SqlitePool,
) -> Result<String, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    let accounts = get_system_accounts(&db).await?;

    // Create invoice header
    let amount_received = amount_received_cash + amount_received_bank;
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
        if line.quantity <= 0 {
            return Err("Quantity must be strictly positive".into());
        }
        if line.unit_price < 0.0 {
            return Err("Unit price cannot be negative".into());
        }

        // TC-CONC-01: Acquire exclusive write lock explicitly to prevent oversell race condition
        let _ = sqlx::query("UPDATE products SET id = id WHERE id = ?").bind(line.product_id).execute(&mut *tx).await;

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
    if amount_received_cash > 0.0 {
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'CASH_RECEIPT', ?, 'Cash Received at POS')")
            .bind(accounts.cash).bind(amount_received_cash).bind(invoice_id)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'CASH_RECEIPT', ?, 'Cash Received at POS')")
            .bind(account_id).bind(amount_received_cash).bind(invoice_id)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    if amount_received_bank > 0.0 {
        let bank_account_id = 99; // Fixed Bank Account ID
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'BANK_RECEIPT', ?, 'Bank Transfer Received at POS')")
            .bind(bank_account_id).bind(amount_received_bank).bind(invoice_id)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'BANK_RECEIPT', ?, 'Bank Transfer Received at POS')")
            .bind(account_id).bind(amount_received_bank).bind(invoice_id)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
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
        if line.quantity <= 0 {
            return Err("Quantity must be strictly positive".into());
        }
        if line.unit_price < 0.0 {
            return Err("Unit price cannot be negative".into());
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



#[derive(Deserialize)]
pub struct DispatchLine {
    pub product_id: i64,
    pub qty: i64,
}

#[derive(Deserialize)]
pub struct SettleLine {
    pub dispatch_item_id: i64,
    pub product_id: i64,
    pub qty_sold: i64,
    pub qty_returned: i64,
    pub unit_price: f64,
    pub discount_percent: f64,
}

#[tauri::command]
pub async fn create_dispatch(
    salesman_id: i64,
    lines: Vec<DispatchLine>,
    db: State<'_, SqlitePool>,
) -> Result<i64, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    let _ = sqlx::query("BEGIN IMMEDIATE").execute(&mut *tx).await;

    let dispatch_id = sqlx::query(
        "INSERT INTO dispatches (salesman_id, dispatch_date, status) VALUES (?, date('now'), 'PENDING')"
    )
    .bind(salesman_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    for line in lines {
        sqlx::query(
            "INSERT INTO dispatch_items (dispatch_id, product_id, dispatched_quantity, unit_price) VALUES (?, ?, ?, 0.0)"
        )
        .bind(dispatch_id)
        .bind(line.product_id)
        .bind(line.qty)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id) VALUES (?, -?, 'DISPATCH', ?)"
        )
        .bind(line.product_id)
        .bind(line.qty)
        .bind(dispatch_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(dispatch_id)
}

#[tauri::command]
pub async fn settle_dispatch(
    dispatch_id: i64,
    lines: Vec<SettleLine>,
    db: State<'_, SqlitePool>,
) -> Result<i64, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;
    let _ = sqlx::query("BEGIN IMMEDIATE").execute(&mut *tx).await;

    // Update dispatch status
    sqlx::query("UPDATE dispatches SET status = 'SETTLED' WHERE id = ?")
        .bind(dispatch_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let mut total_gross = 0.0;
    let mut total_discount = 0.0;
    
    // We get salesman_id to use as customer for the invoice, or maybe create a generic cash sale?
    let row = sqlx::query("SELECT salesman_id FROM dispatches WHERE id = ?").bind(dispatch_id).fetch_one(&mut *tx).await.map_err(|e| e.to_string())?;
    let salesman_id: i64 = sqlx::Row::try_get(&row, "salesman_id").map_err(|e: sqlx::Error| e.to_string())?;

    // Prepare lines for invoice
    let mut sale_lines = Vec::new();

    for line in lines {
        // Update dispatch item
        sqlx::query("UPDATE dispatch_items SET sold_quantity = ?, returned_quantity = ?, unit_price = ? WHERE id = ?")
            .bind(line.qty_sold)
            .bind(line.qty_returned)
            .bind(line.unit_price)
            .bind(line.dispatch_item_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        // Restock returned items
        if line.qty_returned > 0 {
            sqlx::query(
                "INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id) VALUES (?, ?, 'DISPATCH_RETURN', ?)"
            )
            .bind(line.product_id)
            .bind(line.qty_returned)
            .bind(dispatch_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        if line.qty_sold > 0 {
            let gross = (line.qty_sold as f64) * line.unit_price;
            let discount = gross * (line.discount_percent / 100.0);
            total_gross += gross;
            total_discount += discount;
            sale_lines.push((line.product_id, line.qty_sold, line.unit_price, line.discount_percent));
        }
    }
    
    // Create Sale Invoice for the sold items
    let mut invoice_id = 0;
    if !sale_lines.is_empty() {
        let net = total_gross - total_discount;
        let ref_no = format!("DISP-{}", dispatch_id);
        
        invoice_id = sqlx::query(
            "INSERT INTO invoices (invoice_type, invoice_number, invoice_date, account_id, salesman_id, gross_amount, discount_amount, net_amount, amount_received, bakaya, status)
             VALUES ('SALE', ?, date('now'), ?, ?, ?, ?, ?, ?, 0, 'POSTED')"
        )
        .bind(&ref_no).bind(salesman_id).bind(salesman_id).bind(total_gross).bind(total_discount).bind(net).bind(net)
        .execute(&mut *tx)
        .await.map_err(|e| e.to_string())?.last_insert_rowid();

        for (pid, qty, price, disc) in sale_lines {
            let total_price = (qty as f64) * price * (1.0 - (disc / 100.0));
            sqlx::query(
                "INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(invoice_id).bind(pid).bind(qty).bind(price).bind(disc).bind(total_price)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        }
        
        // Ledger Entries (Cash Received automatically since it's a salesman)
        let cash_acc_id = 1; // Default Cash account
        let sales_acc_id = 3; // Default Sales account
        
        // Debit Cash
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0, 'SALE', ?, 'Dispatch Sale Cash')")
            .bind(cash_acc_id).bind(net).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
            
        // Credit Sales
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0, ?, 'SALE', ?, 'Dispatch Sale Revenue')")
            .bind(sales_acc_id).bind(net).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(dispatch_id)
}

use serde::Serialize;

#[derive(Serialize)]
pub struct DispatchItemRow {
    pub id: i64,
    pub dispatch_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub qty_dispatched: i64,
    pub qty_sold: i64,
    pub qty_returned: i64,
    pub sale_price: f64,
}

#[derive(Serialize)]
pub struct DispatchRow {
    pub id: i64,
    pub salesman_id: i64,
    pub salesman_name: String,
    pub dispatch_date: String,
    pub status: String,
    pub items: Vec<DispatchItemRow>,
}

#[tauri::command]
pub async fn get_pending_dispatches(db: State<'_, SqlitePool>) -> Result<Vec<DispatchRow>, String> {
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let dispatches = sqlx::query(
        r#"
        SELECT d.id, d.salesman_id, d.dispatch_date, d.status, a.name as salesman_name
        FROM dispatches d
        LEFT JOIN accounts a ON a.id = d.salesman_id
        WHERE d.status = 'PENDING'
        ORDER BY d.id DESC
        "#
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    let mut result = Vec::new();

    for d in dispatches {
        let d_id: i64 = sqlx::Row::try_get(&d, "id").unwrap_or_default();
        let d_salesman_id: i64 = sqlx::Row::try_get(&d, "salesman_id").unwrap_or_default();
        let d_salesman_name: String = sqlx::Row::try_get(&d, "salesman_name").unwrap_or_default();
        let d_dispatch_date: String = sqlx::Row::try_get(&d, "dispatch_date").unwrap_or_default();
        let d_status: String = sqlx::Row::try_get(&d, "status").unwrap_or_default();

        let items = sqlx::query(
            r#"
            SELECT di.id, di.dispatch_id, di.product_id, di.dispatched_quantity, di.sold_quantity, di.returned_quantity, p.name as product_name, p.sale_price
            FROM dispatch_items di
            JOIN products p ON p.id = di.product_id
            WHERE di.dispatch_id = ?
            "#
        )
        .bind(d_id)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

        let mut item_rows = Vec::new();
        for i in items {
            item_rows.push(DispatchItemRow {
                id: sqlx::Row::try_get(&i, "id").unwrap_or_default(),
                dispatch_id: sqlx::Row::try_get(&i, "dispatch_id").unwrap_or_default(),
                product_id: sqlx::Row::try_get(&i, "product_id").unwrap_or_default(),
                product_name: sqlx::Row::try_get(&i, "product_name").unwrap_or_default(),
                qty_dispatched: sqlx::Row::try_get(&i, "dispatched_quantity").unwrap_or_default(),
                qty_sold: sqlx::Row::try_get(&i, "sold_quantity").unwrap_or_default(),
                qty_returned: sqlx::Row::try_get(&i, "returned_quantity").unwrap_or_default(),
                sale_price: sqlx::Row::try_get(&i, "sale_price").unwrap_or_default(),
            });
        }

        result.push(DispatchRow {
            id: d_id,
            salesman_id: d_salesman_id,
            salesman_name: d_salesman_name,
            dispatch_date: d_dispatch_date,
            status: d_status,
            items: item_rows,
        });
    }

    Ok(result)
}

