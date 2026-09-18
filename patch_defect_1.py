import re

# Patch sales.rs
with open('src-tauri/src/sales.rs', 'r') as f:
    sales_code = f.read()

# Replace bank_account_id = 2 with 99
sales_code = sales_code.replace("let bank_account_id = 2; // Fixed Bank Account ID", "let bank_account_id = 99; // Fixed Bank Account ID")

with open('src-tauri/src/sales.rs', 'w') as f:
    f.write(sales_code)

# Patch procurement.rs
with open('src-tauri/src/procurement.rs', 'r') as f:
    proc_code = f.read()

# Replace bank_account_id = 2 with 99
proc_code = proc_code.replace("let bank_account_id = 2; // Fixed Bank Account ID", "let bank_account_id = 99; // Fixed Bank Account ID")

with open('src-tauri/src/procurement.rs', 'w') as f:
    f.write(proc_code)

print("Patched TC-SAL-01 / TC-PUR-01")
