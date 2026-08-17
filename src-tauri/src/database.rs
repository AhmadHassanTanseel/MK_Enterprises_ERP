use sqlx::{sqlite::{SqliteConnectOptions, SqlitePoolOptions}, SqlitePool};
use std::str::FromStr;
use tauri::Manager;

pub async fn initialize_database(app_handle: &tauri::AppHandle) -> Result<SqlitePool, String> {
    let app_dir = app_handle.path().app_data_dir().unwrap();
    std::fs::create_dir_all(&app_dir).unwrap();
    let db_path = app_dir.join("mk_enterprises_v2.db");
    
    let db_url = format!("sqlite://{}?mode=rwc", db_path.to_str().unwrap());

    let options = SqliteConnectOptions::from_str(&db_url)
        .unwrap()
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    create_full_schema(&pool).await?;

    Ok(pool)
}

async fn create_full_schema(pool: &SqlitePool) -> Result<(), String> {
    let schema = r#"
        -- 1. MASTER DATA: FINANCIAL STRUCTURE & ACCOUNT TYPES
        CREATE TABLE IF NOT EXISTS account_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            nature TEXT NOT NULL,          -- 'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'
            trial_bal_type TEXT NOT NULL,  -- 'DEBIT', 'CREDIT'
            trial_order INTEGER DEFAULT 0
        );

        -- 2. MASTER DATA: GEOGRAPHY & SALESMEN
        CREATE TABLE IF NOT EXISTS areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            salesman_id INTEGER,
            remarks TEXT
        );

        CREATE TABLE IF NOT EXISTS salesmen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            status TEXT DEFAULT 'ACTIVE'
        );

        -- 3. MASTER DATA: ACCOUNTS (CUSTOMERS, SUPPLIERS, BANKS, CASH, EXPENSES)
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_type_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            contact TEXT,
            address TEXT,
            area_id INTEGER,
            salesman_id INTEGER,
            opening_balance REAL DEFAULT 0.0,
            opening_balance_type TEXT DEFAULT 'DEBIT', -- 'DEBIT' or 'CREDIT'
            status TEXT DEFAULT 'ACTIVE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_type_id) REFERENCES account_types(id),
            FOREIGN KEY(area_id) REFERENCES areas(id),
            FOREIGN KEY(salesman_id) REFERENCES salesmen(id)
        );

        -- 4. MASTER DATA: CATEGORIES & PRODUCTS
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            parent_id INTEGER,
            margin_target REAL,
            flavor TEXT
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category_id INTEGER,
            packing TEXT,
            purchase_price REAL NOT NULL DEFAULT 0.0,
            sale_price REAL NOT NULL DEFAULT 0.0,
            min_sale_price REAL DEFAULT 0.0,
            reorder_level INTEGER DEFAULT 0,
            opening_stock INTEGER DEFAULT 0,
            status TEXT DEFAULT 'ACTIVE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            real_barcode TEXT,
            uom TEXT DEFAULT 'Piece',
            sale_account_id INTEGER,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        );

        -- 5. TRANSACTIONS: INVOICE HEADERS (SALES & PURCHASES)
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT UNIQUE NOT NULL,
            invoice_type TEXT NOT NULL, -- 'SALE', 'SALE_RETURN', 'PURCHASE', 'PURCHASE_RETURN'
            account_id INTEGER NOT NULL,
            salesman_id INTEGER,
            gross_amount REAL NOT NULL DEFAULT 0.0,
            discount_amount REAL DEFAULT 0.0,
            net_amount REAL NOT NULL DEFAULT 0.0,
            amount_received REAL DEFAULT 0.0, -- 'Amt Recved' / 'Cust Pay'
            bakaya REAL DEFAULT 0.0,          -- Remaining balance
            return_type TEXT,                 -- 'DAMAGE' or 'RETURN' (for Purchase Returns)
            remarks TEXT,
            status TEXT DEFAULT 'POSTED',     -- 'DRAFT', 'POSTED', 'VOID'
            invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES accounts(id),
            FOREIGN KEY(salesman_id) REFERENCES salesmen(id)
        );

        -- 6. TRANSACTIONS: INVOICE LINE ITEMS
        CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            discount_percent REAL DEFAULT 0.0,
            total_price REAL NOT NULL,
            FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)
        );

        -- 7. INVENTORY LEDGER: IMMUTABLE STOCK MOVEMENTS
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL, -- Positive for IN (Purchases/Returns), Negative for OUT (Sales)
            movement_type TEXT NOT NULL, -- 'OPENING', 'PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN', 'DAMAGE_WRITE_OFF'
            reference_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id)
        );

        -- 8. FINANCIAL LEDGER: DOUBLE-ENTRY JOURNAL
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            debit REAL NOT NULL DEFAULT 0.0,
            credit REAL NOT NULL DEFAULT 0.0,
            voucher_type TEXT NOT NULL, -- 'INVOICE', 'CASH_RECEIPT', 'CASH_PAYMENT', 'JOURNAL_VOUCHER'
            reference_id INTEGER,
            narration TEXT,
            entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            payment_method TEXT,
            ref_no TEXT,
            attachment_path TEXT,
            FOREIGN KEY(account_id) REFERENCES accounts(id)
        );

        -- 9. SYSTEM ADMINISTRATION, DRM & SECURITY
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'OPERATOR', -- 'ADMIN', 'OPERATOR', 'VIEWER'
            status TEXT DEFAULT 'ACTIVE'
        );

        CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- SEED ESSENTIAL ACCOUNT TYPES (Financial Tree Baseline)
        INSERT OR IGNORE INTO account_types (id, name, nature, trial_bal_type, trial_order) VALUES 
        (1, 'Cash & Bank', 'ASSET', 'DEBIT', 1),
        (2, 'Customer / Accounts Receivable', 'ASSET', 'DEBIT', 2),
        (3, 'Inventory / Stock', 'ASSET', 'DEBIT', 3),
        (4, 'Supplier / Accounts Payable', 'LIABILITY', 'CREDIT', 4),
        (5, 'Sales Revenue', 'INCOME', 'CREDIT', 5),
        (6, 'Purchases Account', 'EXPENSE', 'DEBIT', 6),
        (7, 'Operating Expense', 'EXPENSE', 'DEBIT', 7),
        (8, 'Damaged Goods Expense', 'EXPENSE', 'DEBIT', 8);

        -- SEED DEFAULT SYSTEM ACCOUNTS
        INSERT OR IGNORE INTO accounts (id, account_type_id, name) VALUES 
        (1, 1, 'Cash Drawer (Main Cash)'),
        (2, 2, 'Walk-in Customer'),
        (3, 5, 'General Sales Revenue'),
        (4, 6, 'General Purchases'),
        (5, 8, 'Damage Loss Account');
    "#;

    sqlx::query(schema)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create production schema: {}", e))?;

    Ok(())
}