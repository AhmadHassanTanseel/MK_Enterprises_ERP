import re

with open('src/features/purchases/PurchaseInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"balance: balance\n\s*\}\);"

replacement = """balance: balance,
                  paymentMethod: (amountReceivedCash > 0 && amountReceivedBank > 0) ? 'Cash & Bank' : (amountReceivedBank > 0 ? 'Bank' : (amountReceivedCash > 0 ? 'Cash' : 'Credit')),
                  bankName: amountReceivedBank > 0 ? 'Cash in Bank' : ''
                });"""

code = re.sub(pattern, replacement, code)

with open('src/features/purchases/PurchaseInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
