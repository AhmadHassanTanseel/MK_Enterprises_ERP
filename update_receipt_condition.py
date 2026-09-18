import re

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"<div class=\"mt-1\" style=\"font-size: 11px;\">[\s\S]*?</div>"

replacement = """<div class="mt-1" style="font-size: 11px;">
          <div><strong>For online payment</strong></div>
          <div>Account: ${data.paymentMethod?.includes('Bank') && data.accountTitle ? data.accountTitle : '_________________'}</div>
          <div>Bank: ${data.paymentMethod?.includes('Bank') && data.bankName ? data.bankName : '_________________'}</div>
          <div>Account number: ${data.paymentMethod?.includes('Bank') && data.accountNumber ? data.accountNumber : '_________________'}</div>
        </div>"""

code = re.sub(pattern, replacement, code)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
