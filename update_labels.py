import re

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Change Paid to Total Paid, Balance to Bakaya
code = code.replace("<div>Paid:</div>", "<div>Total Paid:</div>")
code = code.replace("<div class=\"mt-1\">Paid:</div>", "<div class=\"mt-1\">Total Paid:</div>")
code = code.replace("<div>Balance:</div>", "<div>Bakaya:</div>")

# Adjust the interface to accept more payment details if needed, or just let the caller pass paymentMethod
# The payment method logic will be driven by the caller.

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
