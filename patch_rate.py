import re

with open('src/features/sales/SaleInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the readOnly input with an editable one
old_input = r'<input type="number" min="0" className="w-full min-w-\[80px\] text-right border border-slate-300 rounded p-1 outline-none bg-slate-100 text-slate-500 cursor-not-allowed" value=\{line\.rate === 0 \? 0 : line\.rate \|\| \'\'\} readOnly title="Rate is auto-populated from product pricing" />'
new_input = r'<input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-300 rounded p-1 outline-none focus:border-blue-500" value={line.rate === 0 ? 0 : line.rate || \'\'} onChange={e => updateLine(line.id, \'rate\', Number(e.target.value))} />'

code = re.sub(old_input, new_input, code)

with open('src/features/sales/SaleInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
