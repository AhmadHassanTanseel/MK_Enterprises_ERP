import re

with open('src-tauri/src/procurement.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the specific INSERT in process_purchase
old_insert = """        sqlx::query("INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(invoice_id)
            .bind(line.product_id)
            .bind(line.quantity)
            .bind(line.unit_price)
            .bind(disc_per_unit)
            .bind(total_price)
            .execute(&mut *tx)"""

new_insert = """        sqlx::query("INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price, sale_rate) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(invoice_id)
            .bind(line.product_id)
            .bind(line.quantity)
            .bind(line.unit_price)
            .bind(disc_per_unit)
            .bind(total_price)
            .bind(line.sale_rate.unwrap_or(0.0))
            .execute(&mut *tx)"""

code = code.replace(old_insert, new_insert)

with open('src-tauri/src/procurement.rs', 'w', encoding='utf-8') as f:
    f.write(code)
