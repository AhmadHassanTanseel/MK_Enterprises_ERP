import os
import re

# 1. Update reporting.rs
with open('src-tauri/src/reporting.rs', 'r', encoding='utf-8') as f:
    reporting_code = f.read()

new_command = """
#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct ProductPurchaseRow {
    pub invoice_date: String,
    pub invoice_no: String,
    pub supplier_name: String,
    pub qty: i64,
    pub unit_price: f64,
    pub total_price: f64,
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
            li.total_price as total_price
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
"""
with open('src-tauri/src/reporting.rs', 'a', encoding='utf-8') as f:
    f.write(new_command)

# 2. Update main.rs
with open('src-tauri/src/main.rs', 'r', encoding='utf-8') as f:
    main_code = f.read()

# Add to imports
main_code = main_code.replace(
    'reporting::{get_account_ledger, get_product_ledger',
    'reporting::{get_account_ledger, get_product_ledger, get_product_purchase_history'
)

# Add to invoke_handler
main_code = main_code.replace(
    'get_account_ledger,\n            get_product_ledger,',
    'get_account_ledger,\n            get_product_ledger,\n            get_product_purchase_history,'
)

with open('src-tauri/src/main.rs', 'w', encoding='utf-8') as f:
    f.write(main_code)
