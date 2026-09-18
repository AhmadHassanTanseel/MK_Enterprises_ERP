import re

with open('src/features/sales/SaleInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# I am changing it back to readOnly, but using `value={line.rate}` instead of `value={line.rate || ''}` so 0 shows as 0.
old_rate = '<input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-300 rounded p-1 outline-none focus:border-blue-500" value={line.rate || \'\'} onChange={e => updateLine(line.id, \'rate\', Number(e.target.value))} title="Sale Rate (Auto-populated but editable)" />'
new_rate = '<input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-300 rounded p-1 outline-none bg-slate-100 text-slate-500 cursor-not-allowed" value={line.rate === 0 ? 0 : line.rate || \'\'} readOnly title="Rate is auto-populated from product pricing" />'

code = code.replace(old_rate, new_rate)

with open('src/features/sales/SaleInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
