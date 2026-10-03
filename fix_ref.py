import re

files = [
    'src/features/sales/SaleReturnPanel.tsx',
    'src/features/purchases/PurchaseReturnPanel.tsx'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Update imports
    code = re.sub(
        r"import React, \{ useState \} from 'react';",
        "import React, { useState, useRef } from 'react';\nimport { useGridNavigation } from '../../utils/useGridNavigation';",
        code
    )

    # 2. Insert containerRef and useGridNavigation
    # Let's insert it right after `const [lines, setLines] = useState...`
    # Or find `const addLine = ` and insert before it.
    code = re.sub(
        r"(const addLine = \(\) => .*?;)",
        r"const containerRef = useRef<HTMLDivElement>(null);\n  useGridNavigation(containerRef, () => addLine(), () => handleSave(false, false));\n\n  \1",
        code
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)
