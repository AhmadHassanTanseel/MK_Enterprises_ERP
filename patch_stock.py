import re

with open('src/features/sales/SaleInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("product.available_stock", "product.current_stock")

with open('src/features/sales/SaleInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
