import re

with open('src-tauri/src/sales.rs', 'r', encoding='utf-8') as f:
    sales_code = f.read()

sales_code = sales_code.replace(
    "SELECT invoice_number FROM invoices WHERE invoice_type = 'SALE' ORDER BY id DESC LIMIT 1",
    "SELECT invoice_number FROM invoices WHERE invoice_type = 'SALE' AND invoice_number LIKE 'INV-%' ORDER BY id DESC LIMIT 1"
)

sales_code = sales_code.replace(
    "SELECT invoice_number FROM invoices WHERE invoice_type = 'SALE_RETURN' ORDER BY id DESC LIMIT 1",
    "SELECT invoice_number FROM invoices WHERE invoice_type = 'SALE_RETURN' AND invoice_number LIKE 'SR-%' ORDER BY id DESC LIMIT 1"
)

with open('src-tauri/src/sales.rs', 'w', encoding='utf-8') as f:
    f.write(sales_code)


with open('src-tauri/src/procurement.rs', 'r', encoding='utf-8') as f:
    proc_code = f.read()

proc_code = proc_code.replace(
    "SELECT invoice_number FROM invoices WHERE invoice_type = 'PURCHASE' ORDER BY id DESC LIMIT 1",
    "SELECT invoice_number FROM invoices WHERE invoice_type = 'PURCHASE' AND invoice_number LIKE 'PUR-%' ORDER BY id DESC LIMIT 1"
)

with open('src-tauri/src/procurement.rs', 'w', encoding='utf-8') as f:
    f.write(proc_code)
