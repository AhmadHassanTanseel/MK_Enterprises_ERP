import re

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    pattern = r'sqlx::query\("INSERT INTO invoice_items \(invoice_id, product_id, quantity, unit_price, discount_percent, total_price, sale_rate\) VALUES \(\?, \?, \?, \?, \?, \?, \?\)"\)\s*\.bind\(invoice_id\)\s*\.bind\(line\.product_id\)\s*\.bind\(line\.quantity\)\s*\.bind\(line\.unit_price\)\s*\.bind\(disc_per_unit\)\s*\.bind\(total_price\)\s*\.bind\(line\.sale_rate\.unwrap_or\(0\.0\)\)'
    replacement = r'sqlx::query("INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price, sale_rate, flavor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")\n            .bind(invoice_id)\n            .bind(line.product_id)\n            .bind(line.quantity)\n            .bind(line.unit_price)\n            .bind(disc_per_unit)\n            .bind(total_price)\n            .bind(line.sale_rate.unwrap_or(0.0))\n            .bind(&line.flavor)'

    new_code = re.sub(pattern, replacement, code)
    if new_code != code:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_code)
        print(f"Fixed {path}")
    else:
        print(f"Could not fix {path} - regex did not match")

fix_file('src-tauri/src/procurement.rs')
