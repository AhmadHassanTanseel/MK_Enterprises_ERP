import re
import os

files = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/sales/SaleReturnPanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx',
    'src/features/purchases/PurchaseReturnPanel.tsx'
]

pattern = r"product: products\.find\(p => p\.id === l\.product_id\)\?\.name \|\| 'Unknown',\s*qty: l\.qty \|\| 0,"
replacement = r"product: products.find(p => p.id === l.product_id)?.name || 'Unknown',\n                flavor: l.flavor,\n                qty: l.qty || 0,"

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            code = file.read()
        
        new_code = re.sub(pattern, replacement, code)
        if new_code != code:
            with open(f, 'w', encoding='utf-8') as file:
                file.write(new_code)
            print(f"Patched {f}")
        else:
            print(f"Could not patch {f}")
