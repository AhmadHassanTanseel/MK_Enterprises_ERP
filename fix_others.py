import re
import os

files_to_patch = [
    'src/features/sales/SaleReturnPanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx',
    'src/features/purchases/PurchaseReturnPanel.tsx'
]

for file_path in files_to_patch:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    code = re.sub(
        r"useGridNavigation\(containerRef, addLine, \(\) => saveInvoice\(false\)\);",
        "useGridNavigation(containerRef, () => addLine(), () => handleSave(false, false));",
        code
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
