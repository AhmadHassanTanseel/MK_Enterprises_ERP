import re
import os

files_to_patch = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/sales/SaleReturnPanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx',
    'src/features/purchases/PurchaseReturnPanel.tsx'
]

for file_path in files_to_patch:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # The root div in these panels usually looks like <div className="flex flex-col h-full gap-4">
    # Let's just find the very first `<div className="flex flex-col h-full gap-4">` right after `return (`
    # and add ref={containerRef}
    
    # Wait, some might have different classNames. Let's just find `return (\n    <div ` and inject it.
    code = re.sub(
        r"return \(\s*<div (className=\"[^\"]+\")>",
        r"return (\n    <div \1 ref={containerRef}>",
        code
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
