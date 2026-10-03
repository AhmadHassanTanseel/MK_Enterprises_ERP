import re
import os

files_to_patch = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/sales/SaleReturnPanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx',
    'src/features/purchases/PurchaseReturnPanel.tsx',
    'src/features/sales/PendingOrdersPanel.tsx'
]

for file_path in files_to_patch:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # Make sure useRef is in the React import
    if "import React" in code and "useRef" not in code.split('\n')[0]:
        # Only check the first few lines for React import
        lines = code.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('import React'):
                if 'useRef' not in line:
                    if '{' in line:
                        lines[i] = line.replace('{', '{ useRef,')
                    else:
                        lines[i] = line.replace('import React', 'import React, { useRef }')
                break
        code = '\n'.join(lines)
        
    # Make sure useGridNavigation is imported
    if "useGridNavigation" not in code:
        # Wait, if useGridNavigation is missing but it's used, that's a problem.
        pass

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
