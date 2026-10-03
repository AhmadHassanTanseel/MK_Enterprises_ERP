import re

with open('src/shared/components/EntitySelect.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add autoFocus to interface
code = code.replace(
    "disabled?: boolean;\n}", 
    "disabled?: boolean;\n  autoFocus?: boolean;\n}"
)

# Add to props
code = code.replace(
    "({ type, value, onChange, filter, className, disabled })",
    "({ type, value, onChange, filter, className, disabled, autoFocus })"
)

# Add to select
code = code.replace(
    "<select\n        value={value ?? ''}",
    "<select\n        autoFocus={autoFocus}\n        value={value ?? ''}"
)

with open('src/shared/components/EntitySelect.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

panels = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx',
    'src/features/sales/SaleReturnPanel.tsx',
    'src/features/purchases/PurchaseReturnPanel.tsx',
    'src/features/sales/PendingOrdersPanel.tsx'
]

for panel in panels:
    with open(panel, 'r', encoding='utf-8') as f:
        panel_code = f.read()
    
    # We want to add autoFocus ONLY to the FIRST EntitySelect in each panel (usually the Customer/Supplier one).
    # Since we can't easily parse JSX with regex, we can just replace the first occurrence of `<EntitySelect` with `<EntitySelect autoFocus`
    panel_code = panel_code.replace("<EntitySelect", "<EntitySelect autoFocus", 1)
    
    with open(panel, 'w', encoding='utf-8') as f:
        f.write(panel_code)
