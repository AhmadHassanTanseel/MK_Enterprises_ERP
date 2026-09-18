import re

with open('src/features/reports/ReportPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_useapp = "const { ledgerEntries, accounts } = useAppContext();"
new_useapp = "const { ledgerEntries, accounts, accountTypes } = useAppContext();"

code = code.replace(old_useapp, new_useapp)

# Add the useMemo
old_accounts_map = """{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}"""

# Need to insert useMemo import if not present, but useMemo should be there from React.
# Let's check imports
import_check = "import React, { useState, useEffect, useCallback, useMemo } from 'react';"
if "useMemo" not in code:
    code = code.replace("import React, { useState, useEffect, useCallback } from 'react';", import_check)
    code = code.replace("import React, { useState, useCallback, useEffect } from 'react';", import_check)
    code = code.replace("import React, { useState, useEffect } from 'react';", import_check)

use_memo_block = """
  const filteredAccounts = React.useMemo(() => {
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
  }, [accounts, accountTypes, reportType]);
"""

# Insert right after `const { ledgerEntries, accounts, accountTypes } = useAppContext();`
code = code.replace(new_useapp, new_useapp + use_memo_block)

new_accounts_map = """{filteredAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}"""
code = code.replace(old_accounts_map, new_accounts_map)

# Reset accountId when reportType changes
old_set_report = "onChange={e => setReportType(e.target.value)}"
new_set_report = "onChange={e => { setReportType(e.target.value); setAccountId(null); }}"
code = code.replace(old_set_report, new_set_report)

with open('src/features/reports/ReportPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
