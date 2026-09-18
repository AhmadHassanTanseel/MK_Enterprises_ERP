import re

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"<div class=\"mb-2 border-top border-bottom\">[\s\S]*?</div>\s*<!-- Line Items -->"

new_payment_block = """<div class="mb-2 border-top border-bottom">
        <div class="grid-2">
          <span class="font-bold">Payment Method:</span> 
          <span>${data.paymentMethod || 'Cash'}</span>
        </div>
        <div class="mt-1" style="font-size: 11px;">
          <div><strong>For online payment</strong></div>
          <div>Account: ${data.paymentMethod === 'Online' && data.accountTitle ? data.accountTitle : '_________________'}</div>
          <div>Bank: ${data.paymentMethod === 'Online' && data.bankName ? data.bankName : '_________________'}</div>
          <div>Account number: ${data.paymentMethod === 'Online' && data.accountNumber ? data.accountNumber : '_________________'}</div>
        </div>
      </div>
      
      <!-- Line Items -->"""

code = re.sub(pattern, new_payment_block, code)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
