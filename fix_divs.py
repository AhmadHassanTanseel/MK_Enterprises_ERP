import re

files_to_fix = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx'
]

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # Append missing div
    code = code.replace(
        '      </div>\n    </div>\n  );\n};\n',
        '        </div>\n      </div>\n    </div>\n  );\n};\n'
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
