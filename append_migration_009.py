import re

with open('src-tauri/src/database.rs', 'r', encoding='utf-8') as f:
    code = f.read()

migration_code = """        let _ = sqlx::query("ALTER TABLE invoice_items ADD COLUMN flavor TEXT").execute(&mut *conn).await;

        // migration_009_add_sale_rate_to_invoice_items
        let _ = sqlx::query("ALTER TABLE invoice_items ADD COLUMN sale_rate REAL DEFAULT 0.0").execute(&mut *conn).await;"""

code = code.replace('let _ = sqlx::query("ALTER TABLE invoice_items ADD COLUMN flavor TEXT").execute(&mut *conn).await;', migration_code)

with open('src-tauri/src/database.rs', 'w', encoding='utf-8') as f:
    f.write(code)
