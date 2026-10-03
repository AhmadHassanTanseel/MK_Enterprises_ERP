import re
import os

files = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/sales/SaleReturnPanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx',
    'src/features/purchases/PurchaseReturnPanel.tsx'
]

old_map = """              lines: lines.map((l: any) => ({
                product: products.find(p => p.id === l.product_id)?.name || 'Unknown',
                qty: l.qty || 0,
                rate: l.rate || 0,
                total: ((l.qty||0) * (l.rate||0)) - (l.discount||0)
              })),"""

new_map = """              lines: lines.map((l: any) => ({
                product: products.find(p => p.id === l.product_id)?.name || 'Unknown',
                flavor: l.flavor,
                qty: l.qty || 0,
                rate: l.rate || 0,
                total: ((l.qty||0) * (l.rate||0)) - (l.discount||0)
              })),"""

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            code = file.read()
        if old_map in code:
            code = code.replace(old_map, new_map)
            with open(f, 'w', encoding='utf-8') as file:
                file.write(code)
