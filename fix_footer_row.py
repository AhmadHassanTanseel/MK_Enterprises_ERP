import re

files_to_fix = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx'
]

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # Change to flex-row (always row) + overflow-x-auto + justify-between
    code = code.replace(
        '<div className="flex flex-col md:flex-row gap-6 justify-end items-start md:items-end w-full">',
        '<div className="flex flex-row gap-6 justify-between items-end w-full overflow-x-auto pb-2">'
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
