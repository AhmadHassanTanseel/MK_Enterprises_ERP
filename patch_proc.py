import re
with open('src-tauri/src/procurement.rs', 'r') as f:
    code = f.read()

new_code = re.sub(
    r"pub async fn process_purchase\([\s\S]*?db: State<'_, SqlitePool>,\n\) -> Result<String, String> \{",
    """#[tauri::command]
pub async fn process_purchase(
    supplier_id: i64,
    reference_number: Option<String>,
    invoice_date: String,
    lines: Vec<PurchaseLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    amount_paid_cash: f64,
    amount_paid_bank: f64,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    process_purchase_internal(supplier_id, reference_number, invoice_date, lines, gross_amount, discount_amount, net_amount, amount_paid_cash, amount_paid_bank, &*db).await
}

pub async fn process_purchase_internal(
    supplier_id: i64,
    reference_number: Option<String>,
    invoice_date: String,
    lines: Vec<PurchaseLine>,
    gross_amount: f64,
    discount_amount: f64,
    net_amount: f64,
    amount_paid_cash: f64,
    amount_paid_bank: f64,
    db: &SqlitePool,
) -> Result<String, String> {""", code, count=1)

new_code = new_code.replace("#[tauri::command]\n#[tauri::command]", "#[tauri::command]")

with open('src-tauri/src/procurement.rs', 'w') as f:
    f.write(new_code)
