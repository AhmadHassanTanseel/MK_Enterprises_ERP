import re

with open('src-tauri/src/lib.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Add to invoke_handler
code = code.replace(
    'get_account_ledger,',
    'get_account_ledger,\n            get_product_purchase_history,'
)

with open('src-tauri/src/lib.rs', 'w', encoding='utf-8') as f:
    f.write(code)
