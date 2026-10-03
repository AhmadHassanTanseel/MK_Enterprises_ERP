import re

# 1. Patch database.rs to add flavor to invoice_items
with open('src-tauri/src/database.rs', 'r', encoding='utf-8') as f:
    db_code = f.read()

# Add to create_full_schema just in case
db_code = db_code.replace(
"""            unit_price REAL NOT NULL,
            discount_percent REAL DEFAULT 0.0,
            total_price REAL NOT NULL,
            FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,""",
"""            unit_price REAL NOT NULL,
            discount_percent REAL DEFAULT 0.0,
            total_price REAL NOT NULL,
            flavor TEXT,
            FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,""")

# Add migration
mig_insert = """
    if current < 3 {
        sqlx::query("ALTER TABLE invoice_items ADD COLUMN flavor TEXT").execute(pool).await.unwrap_or_default();
        record_migration(pool, 3).await?;
    }
    
    Ok(())
}
"""
db_code = db_code.replace("""    if current < 2 {
        migration_002_backfill_opening_stock(pool).await?;
        record_migration(pool, 2).await?;
    }

    Ok(())
}""", """    if current < 2 {
        migration_002_backfill_opening_stock(pool).await?;
        record_migration(pool, 2).await?;
    }""" + mig_insert)

with open('src-tauri/src/database.rs', 'w', encoding='utf-8') as f:
    f.write(db_code)


# 2. Patch sales.rs
with open('src-tauri/src/sales.rs', 'r', encoding='utf-8') as f:
    sales_code = f.read()

# Update INSERT into invoice_items
old_insert_items = """            "INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(invoice_id)
        .bind(line.product_id)
        .bind(line.quantity)
        .bind(line.unit_price)
        .bind(line.discount_percent.unwrap_or(0.0))
        .bind(line_total)"""

new_insert_items = """            "INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price, flavor)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(invoice_id)
        .bind(line.product_id)
        .bind(line.quantity)
        .bind(line.unit_price)
        .bind(line.discount_percent.unwrap_or(0.0))
        .bind(line_total)
        .bind(&line.flavor)"""

sales_code = sales_code.replace(old_insert_items, new_insert_items)

with open('src-tauri/src/sales.rs', 'w', encoding='utf-8') as f:
    f.write(sales_code)


# 3. Patch procurement.rs
with open('src-tauri/src/procurement.rs', 'r', encoding='utf-8') as f:
    proc_code = f.read()

# Update InvoiceLine struct in procurement? No, it uses crate::master_data::InvoiceLine which might need updating. Wait, let's see.
# Actually I'll patch it generally.
old_proc_insert = """            "INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(invoice_id)
        .bind(line.product_id)
        .bind(line.quantity)
        .bind(line.unit_price)
        .bind(line.discount_percent.unwrap_or(0.0))
        .bind(line_total)"""

new_proc_insert = """            "INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price, flavor)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(invoice_id)
        .bind(line.product_id)
        .bind(line.quantity)
        .bind(line.unit_price)
        .bind(line.discount_percent.unwrap_or(0.0))
        .bind(line_total)
        .bind(&line.flavor)"""

proc_code = proc_code.replace(old_proc_insert, new_proc_insert)

with open('src-tauri/src/procurement.rs', 'w', encoding='utf-8') as f:
    f.write(proc_code)

# 4. Patch reporting.rs
with open('src-tauri/src/reporting.rs', 'r', encoding='utf-8') as f:
    rep_code = f.read()

# InvoiceLineRaw struct
old_raw = """pub struct InvoiceLineRaw {
    pub product_id: i64,
    pub qty: i64,
    pub rate: f64,
    pub discount_pct: f64,
    pub amount: f64,
}"""
new_raw = """pub struct InvoiceLineRaw {
    pub product_id: i64,
    pub qty: i64,
    pub rate: f64,
    pub discount_pct: f64,
    pub amount: f64,
    pub flavor: Option<String>,
}"""
rep_code = rep_code.replace(old_raw, new_raw)

old_query = """        SELECT 
            product_id,
            quantity as qty,
            unit_price as rate,
            discount_percent as discount_pct,
            total_price as amount
        FROM invoice_items"""
new_query = """        SELECT 
            product_id,
            quantity as qty,
            unit_price as rate,
            discount_percent as discount_pct,
            total_price as amount,
            flavor
        FROM invoice_items"""
rep_code = rep_code.replace(old_query, new_query)

with open('src-tauri/src/reporting.rs', 'w', encoding='utf-8') as f:
    f.write(rep_code)

print("Backend patched")
