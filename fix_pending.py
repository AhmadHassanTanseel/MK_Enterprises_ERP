import re

with open('src/features/sales/PendingOrdersPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r"useGridNavigation\(createContainerRef, \(\) => setNewLines\(\[\.\.\.newLines, \{product_id: null, qty: 1\}\]\), createDispatch\);",
    "useGridNavigation(createContainerRef, () => setNewLines([...newLines, {product_id: null, qty: 1}]), () => handleCreateDispatch());",
    code
)

code = re.sub(
    r"useGridNavigation\(settleContainerRef, \(\) => \{\}, \(\) => settleDispatch\(false\)\);",
    "useGridNavigation(settleContainerRef, () => {}, () => handleSettleDispatch());",
    code
)

with open('src/features/sales/PendingOrdersPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
