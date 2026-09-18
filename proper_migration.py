import re

with open('src-tauri/src/database.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Add the migration check for sale_rate in invoice_items
old_block = """    if !column_exists(pool, "invoice_items", "flavor").await? {
        sqlx::query("ALTER TABLE invoice_items ADD COLUMN flavor TEXT").execute(pool).await.map_err(|e| e.to_string())?;
    }"""

new_block = """    if !column_exists(pool, "invoice_items", "flavor").await? {
        sqlx::query("ALTER TABLE invoice_items ADD COLUMN flavor TEXT").execute(pool).await.map_err(|e| e.to_string())?;
    }
    if !column_exists(pool, "invoice_items", "sale_rate").await? {
        sqlx::query("ALTER TABLE invoice_items ADD COLUMN sale_rate REAL DEFAULT 0.0").execute(pool).await.map_err(|e| e.to_string())?;
    }"""

code = code.replace(old_block, new_block)

with open('src-tauri/src/database.rs', 'w', encoding='utf-8') as f:
    f.write(code)
