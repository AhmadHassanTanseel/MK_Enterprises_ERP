import re

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"<div>Account: \$\{data\.paymentMethod\?\.includes\('Bank'\) && data\.accountTitle \? data\.accountTitle : '_________________'\}</div>\s*<div>Bank: \$\{data\.paymentMethod\?\.includes\('Bank'\) && data\.bankName \? data\.bankName : '_________________'\}</div>\s*<div>Account number: \$\{data\.paymentMethod\?\.includes\('Bank'\) && data\.accountNumber \? data\.accountNumber : '_________________'\}</div>"

replacement = """<div>Account: ${data.accountTitle && data.accountTitle !== '_________________' ? data.accountTitle : '_________________'}</div>
          <div>Bank: ${data.bankName && data.bankName !== '_________________' ? data.bankName : '_________________'}</div>
          <div>Account number: ${data.accountNumber && data.accountNumber !== '_________________' ? data.accountNumber : '_________________'}</div>"""

code = re.sub(pattern, replacement, code)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
