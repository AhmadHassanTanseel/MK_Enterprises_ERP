import re

with open('src/features/accounts/OtherAccountsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r"const \[settleMethod, setSettleMethod\] = useState<'CASH' \| 'BANK'>\('CASH'\);\n  const \[settleMethod, setSettleMethod\] = useState<'CASH' \| 'BANK'>\('CASH'\);",
    "const [settleMethod, setSettleMethod] = useState<'CASH' | 'BANK'>('CASH');",
    code
)

with open('src/features/accounts/OtherAccountsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
