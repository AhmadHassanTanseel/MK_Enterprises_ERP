import re

with open('src-tauri/src/procurement.rs', 'r') as f:
    code = f.read()

# 1. Fix Bank Account
code = code.replace("let bank_account_id = 2; // Fixed Bank Account ID", "let bank_account_id = 99; // Fixed Bank Account ID")

# 2. Add validation and Lock to process_purchase
loop1 = """    for line in &lines {
        // TC-CONC-01: Acquire exclusive write lock explicitly to prevent oversell race condition
        let _ = sqlx::query("UPDATE products SET id = id WHERE id = ?").bind(line.product_id).execute(&mut *tx).await;
        if line.quantity <= 0 { return Err("Quantity must be strictly positive".into()); }
        if line.unit_price < 0.0 { return Err("Unit price cannot be negative".into()); }
        let disc_per_unit = line.discount_percent.unwrap_or(0.0);"""
code = code.replace("""    for line in &lines {
        let disc_per_unit = line.discount_percent.unwrap_or(0.0);""", loop1, 1)

# 3. Add validation to process_return
loop2 = """    for line in &lines {
        if line.quantity <= 0 { return Err("Quantity must be strictly positive".into()); }
        if line.unit_price < 0.0 { return Err("Unit price cannot be negative".into()); }
        // Stock check"""
code = code.replace("""    for line in &lines {
        // Stock check""", loop2, 1)

with open('src-tauri/src/procurement.rs', 'w') as f:
    f.write(code)

print("Patched procurement.rs correctly.")
