import re

with open('src/features/sales/PendingOrdersPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"amountReceived:\s*amountReceived === '' \? null : Number\(amountReceived\)"
replacement = r"amountReceivedCash: amountReceivedCash === '' ? null : Number(amountReceivedCash), amountReceivedBank: amountReceivedBank === '' ? null : Number(amountReceivedBank)"

new_code = re.sub(pattern, replacement, code)

if new_code != code:
    with open('src/features/sales/PendingOrdersPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Patched PendingOrdersPanel.tsx")
else:
    print("Could not patch PendingOrdersPanel.tsx")
