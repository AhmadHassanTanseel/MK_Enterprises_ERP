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

    # 1. Add hook import and useRef
    code = re.sub(
        r"import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect, useRef } from 'react';\nimport { useGridNavigation } from '../../utils/useGridNavigation';",
        code
    )

    # 2. Add ref inside component
    code = re.sub(
        r"const addLine = \(\) => {",
        "const containerRef = useRef<HTMLDivElement>(null);\n  useGridNavigation(containerRef, addLine, () => saveInvoice(false));\n\n  const addLine = () => {",
        code
    )

    # 3. Add ref to container div
    code = re.sub(
        r'<div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-slate-50">',
        '<div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-slate-50" ref={containerRef}>',
        code
    )

    # 4. Remove old onKeyDown from tbody
    code = re.sub(
        r'<tbody className="divide-y divide-slate-100" onKeyDown=\{handleKeyDown\}>',
        '<tbody className="divide-y divide-slate-100">',
        code
    )

    # 5. Remove handleKeyDown function
    code = re.sub(
        r"const handleKeyDown = \(e: React\.KeyboardEvent\) => \{\s*if \(e\.ctrlKey && e\.key === 'Enter'\) \{\s*addLine\(\);\s*\}\s*\};\s*",
        "",
        code
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)

