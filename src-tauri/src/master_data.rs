use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::State;

// --- DATA STRUCTURES ---

// --- CATEGORIES (UPGRADED ERP TAXONOMY) ---

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<i64>,
    pub margin_target: Option<f64>,
    pub flavor: Option<String>,
}


#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Area {
    pub id: i64,
    pub name: String,
    pub salesman_id: Option<i64>,
    pub remarks: Option<String>,
    pub active: Option<i64>,
    pub account_count: Option<i64>,
}



#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Salesman {
    pub id: i64,
    pub name: String,
    pub contact: Option<String>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: i64,
    pub code: String, // Legacy Mnemonic
    pub name: String,
    pub packing: Option<String>,
    pub purchase_price: f64,
    pub sale_price: f64,
    pub opening_stock: i64,
    // ERP Enhancements & Khata Logic
    pub category_id: Option<i64>,
    pub real_barcode: Option<String>,
    pub uom: Option<String>,
    pub reorder_level: Option<i64>,
    pub sale_account_id: Option<i64>, 
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Account {
    pub id: i64,
    pub account_type_id: i64,
    pub name: String,
    pub contact: Option<String>,
    pub address: Option<String>,
    pub area_id: Option<i64>,
    pub salesman_id: Option<i64>,
    pub opening_balance: f64,
    pub opening_balance_type: String,
    pub status: String,
}

// --- TAURI COMMANDS (CRUD ENGINES) ---

// 1. Categories

#[tauri::command]
pub async fn get_categories(db: State<'_, SqlitePool>) -> Result<Vec<Category>, String> {

    sqlx::query_as::<_, Category>(
        "SELECT id, name, description, parent_id, margin_target, flavor FROM categories ORDER BY name ASC"
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_category(
    name: String, 
    description: Option<String>, 
    parent_id: Option<i64>,
    margin_target: Option<f64>,
    flavor: Option<String>,
    db: State<'_, SqlitePool>
) -> Result<i64, String> {
    let id = sqlx::query(
        "INSERT INTO categories (name, description, parent_id, margin_target, flavor) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&name)
    .bind(&description)
    .bind(parent_id)
    .bind(margin_target)
    .bind(&flavor)
    .execute(&*db)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    Ok(id)
}

#[tauri::command]
pub async fn update_category(
    id: i64,
    name: String, 
    description: Option<String>, 
    parent_id: Option<i64>,
    margin_target: Option<f64>,
    flavor: Option<String>,
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    sqlx::query(
        "UPDATE categories SET name = ?, description = ?, parent_id = ?, margin_target = ?, flavor = ? WHERE id = ?"
    )
    .bind(&name)
    .bind(&description)
    .bind(parent_id)
    .bind(margin_target)
    .bind(&flavor)
    .bind(id)
    .execute(&*db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(format!("Category {} updated successfully", id))
}

#[tauri::command]
pub async fn delete_category(
    id: i64,
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products WHERE category_id = ?")
        .bind(id)
        .fetch_one(&*db)
        .await
        .map_err(|e| e.to_string())?;
    if count > 0 {
        return Err("Cannot delete this category because products are assigned to it.".into());
    }

    sqlx::query("DELETE FROM categories WHERE id = ?")
    .bind(id)
    .execute(&*db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(format!("Category {} deleted successfully", id))
}

// 2. Areas & Salesmen

// 3. Products

#[tauri::command]
pub async fn get_products(db: State<'_, SqlitePool>) -> Result<Vec<Product>, String> {

    sqlx::query_as::<_, Product>(
        "SELECT id, code, name, packing, purchase_price, sale_price, opening_stock, category_id, real_barcode, uom, reorder_level, sale_account_id FROM products ORDER BY id DESC"
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_product(
    code: String, name: String, category_id: Option<i64>, packing: Option<String>,
    purchase_price: f64, sale_price: f64, opening_stock: i64,
    real_barcode: Option<String>, uom: Option<String>, reorder_level: Option<i64>,
    sale_account_id: Option<i64>,
    db: State<'_, SqlitePool>
) -> Result<i64, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    let id = sqlx::query(
        r#"INSERT INTO products 
        (code, name, category_id, packing, purchase_price, sale_price, opening_stock, real_barcode, uom, reorder_level, sale_account_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#
    )
    .bind(&code).bind(&name).bind(category_id).bind(&packing)
    .bind(purchase_price).bind(sale_price).bind(opening_stock)
    .bind(&real_barcode).bind(&uom).bind(reorder_level).bind(sale_account_id)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?.last_insert_rowid();

    if opening_stock > 0 {
        sqlx::query(
            "INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id) VALUES (?, ?, 'OPENING', ?)"
        )
        .bind(id)
        .bind(opening_stock)
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn update_product(
    id: i64,
    code: String, name: String, category_id: Option<i64>, packing: Option<String>,
    purchase_price: f64, sale_price: f64, opening_stock: i64,
    real_barcode: Option<String>, uom: Option<String>, reorder_level: Option<i64>,
    sale_account_id: Option<i64>,
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    sqlx::query(
        r#"UPDATE products 
        SET code = ?, name = ?, category_id = ?, packing = ?, purchase_price = ?, sale_price = ?, opening_stock = ?, real_barcode = ?, uom = ?, reorder_level = ?, sale_account_id = ?
        WHERE id = ?"#
    )
    .bind(&code).bind(&name).bind(category_id).bind(&packing)
    .bind(purchase_price).bind(sale_price).bind(opening_stock)
    .bind(&real_barcode).bind(&uom).bind(reorder_level).bind(sale_account_id)
    .bind(id)
    .execute(&*db).await.map_err(|e| e.to_string())?;

    Ok(format!("Product {} updated successfully", id))
}

#[tauri::command]
pub async fn delete_product(
    id: i64,
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    let items_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM invoice_items WHERE product_id = ?")
        .bind(id)
        .fetch_one(&*db)
        .await
        .map_err(|e| e.to_string())?;
        
    let movements_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM inventory_movements WHERE product_id = ?")
        .bind(id)
        .fetch_one(&*db)
        .await
        .map_err(|e| e.to_string())?;
        
    if items_count > 0 || movements_count > 0 {
        return Err("Cannot delete this product because it has existing transactions.".into());
    }

    sqlx::query("DELETE FROM products WHERE id = ?")
    .bind(id)
    .execute(&*db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(format!("Product {} deleted successfully", id))
}


// 4. Accounts (Customers, Suppliers, Banks, Expenses)
#[tauri::command]
pub async fn get_accounts(db: State<'_, SqlitePool>) -> Result<Vec<Account>, String> {
    sqlx::query_as::<_, Account>(
        "SELECT id, account_type_id, name, contact, address, area_id, salesman_id, opening_balance, opening_balance_type, status 
         FROM accounts WHERE status = 'ACTIVE' ORDER BY name ASC"
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_account(
    account_type_id: i64,
    name: String,
    contact: Option<String>,
    address: Option<String>,
    area_id: Option<i64>,
    opening_balance: f64,
    opening_balance_type: String,
    db: State<'_, SqlitePool>,
) -> Result<i64, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    let account_id = sqlx::query(
        "INSERT INTO accounts (account_type_id, name, contact, address, area_id, opening_balance, opening_balance_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(account_type_id)
    .bind(&name)
    .bind(contact)
    .bind(address)
    .bind(area_id)
    .bind(opening_balance)
    .bind(&opening_balance_type)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    // If there is an opening balance, record it in the financial journal
    if opening_balance > 0.0 {
        let (debit, credit) = if opening_balance_type == "DEBIT" {
            (opening_balance, 0.0)
        } else {
            (0.0, opening_balance)
        };

        sqlx::query(
            "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) 
             VALUES (?, ?, ?, 'JOURNAL_VOUCHER', ?, 'Opening Balance')"
        )
        .bind(account_id)
        .bind(debit)
        .bind(credit)
        .bind(account_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(account_id)
}

#[tauri::command]
pub async fn update_account(
    id: i64,
    account_type_id: i64,
    name: String,
    contact: Option<String>,
    address: Option<String>,
    area_id: Option<i64>,
    opening_balance: f64,
    opening_balance_type: String,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE accounts SET account_type_id = ?, name = ?, contact = ?, address = ?, area_id = ?, opening_balance = ?, opening_balance_type = ? WHERE id = ?"
    )
    .bind(account_type_id)
    .bind(&name)
    .bind(contact)
    .bind(address)
    .bind(area_id)
    .bind(opening_balance)
    .bind(&opening_balance_type)
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        "DELETE FROM journal_entries WHERE narration = 'Opening Balance' AND reference_id = ? AND voucher_type = 'JOURNAL_VOUCHER'"
    )
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    if opening_balance > 0.0 {
        let (debit, credit) = if opening_balance_type == "DEBIT" {
            (opening_balance, 0.0)
        } else {
            (0.0, opening_balance)
        };

        sqlx::query(
            "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) 
             VALUES (?, ?, ?, 'JOURNAL_VOUCHER', ?, 'Opening Balance')"
        )
        .bind(id)
        .bind(debit)
        .bind(credit)
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(format!("Account {} updated successfully", id))
}

#[tauri::command]
pub async fn delete_account(
    id: i64,
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    let entries_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM journal_entries WHERE account_id = ?")
        .bind(id)
        .fetch_one(&*db)
        .await
        .map_err(|e| e.to_string())?;
        
    let invoices_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM invoices WHERE account_id = ?")
        .bind(id)
        .fetch_one(&*db)
        .await
        .map_err(|e| e.to_string())?;
        
    if entries_count > 0 || invoices_count > 0 {
        return Err("Cannot delete this account because it has existing transactions.".into());
    }

    sqlx::query("DELETE FROM accounts WHERE id = ?")
    .bind(id)
    .execute(&*db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(format!("Account {} deleted successfully", id))
}

// --- ACCOUNT TYPES (CHART OF ACCOUNTS) ---

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AccountType {
    pub id: i64,
    pub name: String,
    pub nature: String, // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
    pub trial_bal_type: String, // BS (Balance Sheet) or IS (Income Statement)
    pub trial_order: i64,
}

#[tauri::command]
pub async fn get_account_types(db: State<'_, SqlitePool>) -> Result<Vec<AccountType>, String> {
    sqlx::query_as::<_, AccountType>(
        "SELECT id, name, nature, trial_bal_type, trial_order FROM account_types ORDER BY trial_order ASC"
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_account_type(
    name: String, 
    nature: String, 
    trial_bal_type: String, 
    trial_order: i64, 
    db: State<'_, SqlitePool>
) -> Result<i64, String> {
    let id = sqlx::query(
        "INSERT INTO account_types (name, nature, trial_bal_type, trial_order) VALUES (?, ?, ?, ?)"
    )
    .bind(&name)
    .bind(&nature)
    .bind(&trial_bal_type)
    .bind(trial_order)
    .execute(&*db)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    Ok(id)
}

// --- AREAS & TERRITORY ---
#[tauri::command]
pub async fn get_areas(db: State<'_, SqlitePool>) -> Result<Vec<Area>, String> {
    sqlx::query_as::<_, Area>(
        "SELECT a.id, a.name, a.salesman_id, a.remarks, a.active, (SELECT COUNT(id) FROM accounts WHERE area_id = a.id) as account_count FROM areas a ORDER BY a.id DESC"
    )
    .fetch_all(&*db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_area(
    name: String, 
    salesman_id: Option<i64>, 
    remarks: Option<String>, 
    db: State<'_, SqlitePool>
) -> Result<i64, String> {
    let id = sqlx::query(
        "INSERT INTO areas (name, salesman_id, remarks) VALUES (?, ?, ?)"
    )
    .bind(&name)
    .bind(salesman_id)
    .bind(&remarks)
    .execute(&*db)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    Ok(id)
}

#[tauri::command]
pub async fn update_area(
    id: i64,
    name: String, 
    salesman_id: Option<i64>, 
    remarks: Option<String>, 
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    sqlx::query("UPDATE areas SET name = ?, salesman_id = ?, remarks = ? WHERE id = ?")
        .bind(&name)
        .bind(salesman_id)
        .bind(&remarks)
        .bind(id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(format!("Area {} updated successfully", id))
}

#[tauri::command]
pub async fn delete_area(
    id: i64, 
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts WHERE area_id = ?")
        .bind(id)
        .fetch_one(&*db)
        .await
        .map_err(|e| e.to_string())?;
    if count > 0 {
        return Err("Cannot delete this area because accounts are assigned to it.".into());
    }

    sqlx::query("DELETE FROM areas WHERE id = ?")
        .bind(id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(format!("Area {} deleted successfully", id))
}

// --- SYSTEM SETTINGS & ADMIN ---

#[tauri::command]
pub async fn create_system_backup(
    app_handle: tauri::AppHandle,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    let result = crate::backup::perform_backup(app_handle)?;
    crate::audit::log_audit(&db, &format!("Database backup created"), "Admin").await?;
    Ok(result)
}

#[tauri::command]
pub async fn execute_factory_reset(
    confirmation: String,
    db: State<'_, SqlitePool>,
) -> Result<String, String> {
    if confirmation != "DELETE" {
        return Err("Invalid confirmation string. Type DELETE to confirm.".into());
    }

    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM invoice_items")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM invoices")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM inventory_movements WHERE movement_type != 'OPENING'")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query(
        "DELETE FROM journal_entries WHERE NOT (voucher_type = 'JOURNAL_VOUCHER' AND narration = 'Opening Balance')",
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    crate::audit::log_audit(&db, "Factory reset executed — all transactional data wiped", "Admin")
        .await?;

    Ok("SUCCESS: All transactional data wiped. Master records (Products/Accounts) preserved.".into())
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AppSetting {
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub async fn get_settings(db: State<'_, SqlitePool>) -> Result<Vec<AppSetting>, String> {
    sqlx::query_as::<_, AppSetting>("SELECT key, value FROM system_config")
        .fetch_all(&*db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_setting(
    key: String, 
    value: String, 
    db: State<'_, SqlitePool>
) -> Result<String, String> {
    sqlx::query("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&key)
        .bind(&value)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(format!("Setting {} saved", key))
}