import re
import os

files = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx',
    'src/features/sales/SaleReturnPanel.tsx',
    'src/features/purchases/PurchaseReturnPanel.tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        code = f.read()

    pattern = r"paymentMethod:\s*\(amountReceivedCash > 0 && amountReceivedBank > 0\)\s*\?\s*'Cash & Bank'\s*:\s*\(amountReceivedBank > 0\s*\?\s*'Bank'\s*:\s*\(amountReceivedCash > 0\s*\?\s*'Cash'\s*:\s*'Credit'\)\)"
    
    replacement = "paymentMethod: (amountReceivedCash > 0 && amountReceivedBank > 0) ? 'Cash & Bank' : (amountReceivedBank > 0 ? 'Payment in Bank' : (amountReceivedCash > 0 ? 'Payment via Cash' : 'Credit'))"
    
    code = re.sub(pattern, replacement, code)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(code)
