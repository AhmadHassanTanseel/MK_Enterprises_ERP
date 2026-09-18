import re
with open('src-tauri/src/sales.rs', 'r') as f:
    code = f.read()

code = code.replace('let _ = sqlx::query("BEGIN IMMEDIATE").execute(&mut *tx).await;\n    ', '')

# Insert dummy update for locking
code = code.replace(
    '        // Stock check\n        let stock_row',
    '        // TC-CONC-01: Acquire exclusive write lock explicitly to prevent oversell race condition\n        let _ = sqlx::query("UPDATE products SET id = id WHERE id = ?").bind(line.product_id).execute(&mut *tx).await;\n\n        // Stock check\n        let stock_row'
)

with open('src-tauri/src/sales.rs', 'w') as f:
    f.write(code)

with open('src-tauri/src/procurement.rs', 'r') as f:
    code = f.read()
code = code.replace('let _ = sqlx::query("BEGIN IMMEDIATE").execute(&mut *tx).await;\n    ', '')
with open('src-tauri/src/procurement.rs', 'w') as f:
    f.write(code)

print("Added atomic lock UPDATE")
