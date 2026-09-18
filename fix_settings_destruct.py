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

    # Find the useAppContext destructuring and add `settings, ` to it if it's not there
    pattern = r"const \{\s*(.*?)\s*\} = useAppContext\(\);"
    
    def add_settings(match):
        inner = match.group(1)
        if 'settings' not in inner:
            return f"const {{ settings, {inner} }} = useAppContext();"
        return match.group(0)
        
    code = re.sub(pattern, add_settings, code)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(code)
