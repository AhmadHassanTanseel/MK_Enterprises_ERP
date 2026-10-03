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

    lines = code.split('\n')
    
    # 1. Ensure useRef
    for i, line in enumerate(lines):
        if line.startswith('import React'):
            if 'useRef' not in line:
                if '{' in line:
                    lines[i] = line.replace('{', '{ useRef,')
                else:
                    lines[i] = line.replace('import React', "import React, { useRef }")
            break
            
    # 2. Ensure useGridNavigation
    has_use_grid = any("useGridNavigation" in line for line in lines[:20])
    if not has_use_grid:
        # Insert after the React import
        for i, line in enumerate(lines):
            if line.startswith('import React'):
                lines.insert(i + 1, "import { useGridNavigation } from '../../utils/useGridNavigation';")
                break

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
