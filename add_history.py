import re

with open('src/features/purchases/PurchaseInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Prevent autofill when selecting a product
old_onchange = "setLines(lines.map(l => l.id === line.id ? { ...l, product_id: v, rate: p.purchase_price, sale_rate: p.sale_price } : l));"
new_onchange = "setLines(lines.map(l => l.id === line.id ? { ...l, product_id: v, rate: 0, sale_rate: 0 } : l));"
code = code.replace(old_onchange, new_onchange)

# 2. Add history reference under the inputs
old_rate_td = """                  <td className="px-2 py-2 text-right">
                    <input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" value={line.rate || ''} onChange={e => updateLine(line.id, 'rate', Number(e.target.value))} />
                  </td>"""
new_rate_td = """                  <td className="px-2 py-2 text-right">
                    <input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" value={line.rate || ''} onChange={e => updateLine(line.id, 'rate', Number(e.target.value))} />
                    {line.product_id ? (
                      <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Last: Rs. {products.find(p => p.id === line.product_id)?.purchase_price || 0}</div>
                    ) : null}
                  </td>"""
code = code.replace(old_rate_td, new_rate_td)

old_sale_rate_td = """                  <td className="px-2 py-2 text-right">
                    <input type="number" min="0" className="w-full min-w-[80px] text-right border border-emerald-300 bg-emerald-50 rounded p-1 focus:ring-2 outline-none" value={line.sale_rate || ''} onChange={e => updateLine(line.id, 'sale_rate', Number(e.target.value))} />
                  </td>"""
new_sale_rate_td = """                  <td className="px-2 py-2 text-right">
                    <input type="number" min="0" className="w-full min-w-[80px] text-right border border-emerald-300 bg-emerald-50 rounded p-1 focus:ring-2 outline-none" value={line.sale_rate || ''} onChange={e => updateLine(line.id, 'sale_rate', Number(e.target.value))} />
                    {line.product_id ? (
                      <div className="text-[10px] text-emerald-600 mt-1 whitespace-nowrap">Last: Rs. {products.find(p => p.id === line.product_id)?.sale_price || 0}</div>
                    ) : null}
                  </td>"""
code = code.replace(old_sale_rate_td, new_sale_rate_td)

with open('src/features/purchases/PurchaseInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
