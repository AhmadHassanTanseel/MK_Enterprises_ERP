import re

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix the total keys mapping:
# 1. SaleInvoicePanel.tsx passes:
#              totalGross: totalGross,
#              totalDiscount: totalDiscount,
#              totalNet: totalNet,
#              amountReceived: amountReceivedCash + amountReceivedBank,
#              balance: totalNet - (amountReceivedCash + amountReceivedBank)
# 
# But receiptPrinter.ts expects `data.gross`, `data.discount`, `data.net`, `data.paid`, `data.balance`
# Let's just fix receiptPrinter.ts to look for both sets of keys!

code = code.replace("data.gross?.toLocaleString()", "(data.gross || data.totalGross)?.toLocaleString()")
code = code.replace("data.discount?.toLocaleString()", "(data.discount || data.totalDiscount)?.toLocaleString()")
code = code.replace("data.net?.toLocaleString()", "(data.net || data.totalNet)?.toLocaleString()")
code = code.replace("data.paid?.toLocaleString()", "(data.paid || data.amountReceived || data.amountPaid)?.toLocaleString()")
code = code.replace("data.balance?.toLocaleString()", "(data.balance)?.toLocaleString()")

# Fix the item flavor display
old_item = """                <tr>
                  <td colspan="3" class="item-name">${l.product}</td>
                </tr>"""

new_item = """                <tr>
                  <td colspan="3" class="item-name">${l.product} ${l.flavor && l.flavor !== 'None' ? '- ' + l.flavor : ''}</td>
                </tr>"""
code = code.replace(old_item, new_item)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/utils/pdfTemplate.ts', 'r', encoding='utf-8') as f:
    pdf_code = f.read()

old_pdf_item = """                <td style="padding: 10px 5px;">${l.product}</td>"""
new_pdf_item = """                <td style="padding: 10px 5px;">${l.product} ${l.flavor && l.flavor !== 'None' ? '- ' + l.flavor : ''}</td>"""
pdf_code = pdf_code.replace(old_pdf_item, new_pdf_item)

with open('src/utils/pdfTemplate.ts', 'w', encoding='utf-8') as f:
    f.write(pdf_code)

# We also need to ensure SaleInvoicePanel passes flavor to printThermalReceipt
# Let's check SaleInvoicePanel.tsx
