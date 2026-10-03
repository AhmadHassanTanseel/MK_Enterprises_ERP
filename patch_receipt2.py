import os

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('<td colspan="3" class="item-name">${l.product}</td>', '<td colspan="3" class="item-name">${l.product} ${l.flavor && l.flavor !== \'None\' ? \'- \' + l.flavor : \'\'}</td>')

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)

# Check pdfTemplate.ts
with open('src/utils/pdfTemplate.ts', 'r', encoding='utf-8') as f:
    pdf_code = f.read()

pdf_code = pdf_code.replace('<td style="padding: 10px 5px;">${l.product}</td>', '<td style="padding: 10px 5px;">${l.product} ${l.flavor && l.flavor !== \'None\' ? \'- \' + l.flavor : \'\'}</td>')

with open('src/utils/pdfTemplate.ts', 'w', encoding='utf-8') as f:
    f.write(pdf_code)

