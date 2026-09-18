import re

with open('src-tauri/src/reporting.rs', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'pub total_price: f64,\n}',
    'pub total_price: f64,\n    pub sale_rate: f64,\n}'
)

code = code.replace(
    'li.total_price as total_price\n        FROM invoice_items li',
    'li.total_price as total_price,\n            COALESCE(li.sale_rate, 0.0) as sale_rate\n        FROM invoice_items li'
)

with open('src-tauri/src/reporting.rs', 'w', encoding='utf-8') as f:
    f.write(code)
