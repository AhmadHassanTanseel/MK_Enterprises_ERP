import re

with open('src/utils/pdfGenerator.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(r"doc\.text\('MK Enterprises', 14, 22\);", r"doc.text('Mian Khan Traders', 14, 22);", code)

with open('src/utils/pdfGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(code)
