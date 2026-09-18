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

    # Pass the bank settings instead of empty strings
    pattern = r"bankName:\s*amountReceivedBank > 0 \? 'Cash in Bank' : ''"
    
    # Needs to get settings from appContext. Both panels already have `const { ..., settings } = useAppContext();`
    replacement = """bankName: settings.find(s => s.key === 'bank_name')?.value || '_________________',
                  accountTitle: settings.find(s => s.key === 'bank_account_title')?.value || '_________________',
                  accountNumber: settings.find(s => s.key === 'bank_account_number')?.value || '_________________'"""
    
    code = re.sub(pattern, replacement, code)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(code)
