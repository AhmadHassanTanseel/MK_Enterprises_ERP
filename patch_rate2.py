import re

with open('src/features/sales/SaleInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the incorrect escaped quotes
code = code.replace(r"value={line.rate === 0 ? 0 : line.rate || \'\'} onChange={e => updateLine(line.id, \'rate\', Number(e.target.value))} />",
                    r"value={line.rate === 0 ? 0 : line.rate || ''} onChange={e => updateLine(line.id, 'rate', Number(e.target.value))} />")

with open('src/features/sales/SaleInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
