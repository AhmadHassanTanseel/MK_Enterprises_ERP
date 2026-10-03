import re

with open('src/features/sales/SaleInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r"useGridNavigation\(containerRef, addLine, \(\) => saveInvoice\(false\)\);",
    "useGridNavigation(containerRef, () => addLine(), () => handleSave(false, false));",
    code
)

with open('src/features/sales/SaleInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
