import re

files_to_fix = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx'
]

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # Revert the flex-wrap changes
    code = code.replace(
        '<div className="flex flex-col xl:flex-row flex-wrap gap-6 justify-end items-start xl:items-end w-full">',
        '<div className="flex flex-col md:flex-row gap-6 justify-end items-start md:items-end w-full">'
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
