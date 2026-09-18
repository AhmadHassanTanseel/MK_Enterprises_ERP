import re

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# I will find the entire section between Payment Method and Line Items and replace it
pattern = r"<div class=\"grid-2\">\s*<span class=\"font-bold\">Payment Method:</span>\s*<span>\$\{data\.paymentMethod \|\| 'Cash'\}</span>\s*</div>[\s\S]*?<!-- Line Items -->"

replacement = """<div class="grid-2">
          <span class="font-bold">Payment Method:</span> 
          <span>${data.paymentMethod || 'Cash'}</span>
        </div>
        <div class="mt-1" style="font-size: 11px;">
          <div><strong>For online payment</strong></div>
          <div>Account: ${data.paymentMethod?.includes('Bank') && data.accountTitle ? data.accountTitle : '_________________'}</div>
          <div>Bank: ${data.paymentMethod?.includes('Bank') && data.bankName ? data.bankName : '_________________'}</div>
          <div>Account number: ${data.paymentMethod?.includes('Bank') && data.accountNumber ? data.accountNumber : '_________________'}</div>
        </div>
      </div>
      
      <!-- Line Items -->"""

code = re.sub(pattern, replacement, code)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
