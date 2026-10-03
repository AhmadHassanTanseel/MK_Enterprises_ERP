import re

with open('src/utils/useGridNavigation.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove if (isSelect) return; for ArrowUp and ArrowDown
code = code.replace("if (e.key === 'ArrowUp') {\n        if (isSelect) return;", "if (e.key === 'ArrowUp') {")
code = code.replace("if (e.key === 'ArrowDown') {\n        if (isSelect) return;", "if (e.key === 'ArrowDown') {")

with open('src/utils/useGridNavigation.ts', 'w', encoding='utf-8') as f:
    f.write(code)
