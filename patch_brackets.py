import re

# Update receiptPrinter.ts
with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"\$\{l\.flavor && l\.flavor !== 'None' \? '- ' \+ l\.flavor : ''\}"
replacement = r"${l.flavor && l.flavor !== 'None' ? '(' + l.flavor + ')' : ''}"

code = re.sub(pattern, replacement, code)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)

# Update pdfTemplate.ts
with open('src/utils/pdfTemplate.ts', 'r', encoding='utf-8') as f:
    pdf_code = f.read()

pdf_code = re.sub(pattern, replacement, pdf_code)

with open('src/utils/pdfTemplate.ts', 'w', encoding='utf-8') as f:
    f.write(pdf_code)

print("Formatted brackets")
