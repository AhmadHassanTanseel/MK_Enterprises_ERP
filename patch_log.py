import re

with open('src/utils/useGridNavigation.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r"const target = e.target as HTMLElement;",
    "const target = e.target as HTMLElement;\n      console.log('KEY PRESSED:', e.key, 'TARGET:', target.tagName, 'CLASS:', target.className);",
    code
)

with open('src/utils/useGridNavigation.ts', 'w', encoding='utf-8') as f:
    f.write(code)
