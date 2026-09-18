import re

with open('src-tauri/src/sales.rs', 'r') as f:
    code = f.read()

# Instead of fighting tauri::State, we just use a small hack in tests.
# `tauri::State` can be mocked if we bypass it. Let's just remove the Rust test from sales.rs 
# and use a Python script as the regression test that the user can run. It directly queries the database after
# we trigger the Rust backend (e.g. via an API call, but we have no API).
# Wait, I CAN mock tauri::State. It's actually really easy if I just rewrite the function.

# Let's fix process_sale to take pool directly, and the command wrapper will pass it.
# We will do this via Regex carefully.

new_code = re.sub(
    r"pub async fn process_sale\([\s\S]*?db: State<'_, SqlitePool>,\n\) -> Result<String, String> \{",
    """#[tauri::command]
pub async fn process_sale(
    account_id: i64,
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
    process_sale_internal(account_id, invoice_number, invoice_date, lines, gross_amount, discount_amount, net_amount, amount_received_cash, amount_received_bank, &*db).await
}

pub async fn process_sale_internal(
    account_id: i64,
    invoice_number: Option<String>,
    invoice_date: String,
    lines: Vec<SaleLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    amount_received_cash: f64,
    amount_received_bank: f64,
    db: &SqlitePool,
) -> Result<String, String> {""", code, count=1)

# Remove the #[tauri::command] from the ORIGINAL one which is now part of the replacement
new_code = new_code.replace("#[tauri::command]\n#[tauri::command]", "#[tauri::command]")

with open('src-tauri/src/sales.rs', 'w') as f:
    f.write(new_code)

print("Properly exposed process_sale_internal")
