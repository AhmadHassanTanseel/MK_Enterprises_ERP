import re

with open('src/features/reports/ReportPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# The useMemo block to remove
use_memo_block = """  const filteredAccounts = React.useMemo(() => {
    if (reportType === 'SALES') return accounts.filter(a => a.is_customer);
    if (reportType === 'PURCHASE') return accounts.filter(a => a.is_supplier);
    if (reportType === 'EXPENSES') {
      const expTypeIds = accountTypes.filter(t => t.nature === 'EXPENSE').map(t => t.id);
      return accounts.filter(a => expTypeIds.includes(a.account_type_id));
    }
    if (reportType === 'CASHBOOK' || reportType === 'BANKBOOK') {
       // Typically you filter by bank/cash types, but let's just show assets or all for now
       const assetTypeIds = accountTypes.filter(t => t.nature === 'ASSET').map(t => t.id);
       return accounts.filter(a => assetTypeIds.includes(a.account_type_id));
    }
    return accounts;
  }, [accounts, accountTypes, reportType]);"""

code = code.replace(use_memo_block, "")

# Insert it after accountId
target = "const [accountId, setAccountId] = useState<number | null>(null);\n"
code = code.replace(target, target + "\n" + use_memo_block + "\n")

with open('src/features/reports/ReportPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
