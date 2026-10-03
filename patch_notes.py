import re

with open('src/features/accounts/OtherAccountsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Make Notes empty by default
code = re.sub(
    r"setSettleNotes\(`Settlement for \$\{account\.name\}`\);",
    "setSettleNotes('');",
    code
)

with open('src/features/accounts/OtherAccountsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
