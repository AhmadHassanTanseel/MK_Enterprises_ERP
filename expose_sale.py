import re

with open('src-tauri/src/sales.rs', 'r') as f:
    code = f.read()

# Refactor process_sale to process_sale_internal
code = code.replace("pub async fn process_sale(\n    account_id: i64,\n    invoice_number: Option<String>,\n    invoice_date: String,\n    lines: Vec<SaleLine>,\n    gross_amount: f64,\n    discount_amount: f64,\n    net_amount: f64,\n    amount_received_cash: f64,\n    amount_received_bank: f64,\n    db: State<'_, SqlitePool>,\n) -> Result<String, String> {", "pub async fn process_sale(\n    account_id: i64,\n    invoice_number: Option<String>,\n    invoice_date: String,\n    lines: Vec<SaleLine>,\n    gross_amount: f64,\n    discount_amount: f64,\n    net_amount: f64,\n    amount_received_cash: f64,\n    amount_received_bank: f64,\n    db: State<'_, SqlitePool>,\n) -> Result<String, String> {\n    process_sale_internal(account_id, invoice_number, invoice_date, lines, gross_amount, discount_amount, net_amount, amount_received_cash, amount_received_bank, &*db).await\n}\n\npub async fn process_sale_internal(\n    account_id: i64,\n    invoice_number: Option<String>,\n    invoice_date: String,\n    lines: Vec<SaleLine>,\n    gross_amount: f64,\n    discount_amount: f64,\n    net_amount: f64,\n    amount_received_cash: f64,\n    amount_received_bank: f64,\n    db: &SqlitePool,\n) -> Result<String, String> {")

with open('src-tauri/src/sales.rs', 'w') as f:
    f.write(code)

print("Exposed process_sale_internal")
