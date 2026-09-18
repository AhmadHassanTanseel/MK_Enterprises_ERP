import re

with open('src/features/inventory/ProductsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Update the interface if it exists, otherwise it's dynamically typed.
# Wait, let's see how `purchaseHistory` is typed.
pattern_interface = r"setPurchaseHistory\(.*?\)"
# Actually it probably uses `any[]`. Let's just blindly replace the JSX.

old_header = """<th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Total</th>"""

new_header = """<th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Sale Price</th>
                        <th className="px-4 py-3 text-right">Total</th>"""

old_row = """<td className="px-4 py-3 text-right text-slate-600">Rs. {h.unit_price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-800 font-medium">Rs. {h.total_price.toLocaleString()}</td>"""

new_row = """<td className="px-4 py-3 text-right text-slate-600">Rs. {h.unit_price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-emerald-600">Rs. {h.sale_rate?.toLocaleString() || 0}</td>
                          <td className="px-4 py-3 text-right text-slate-800 font-medium">Rs. {h.total_price.toLocaleString()}</td>"""

code = code.replace(old_header, new_header)
code = code.replace(old_row, new_row)

with open('src/features/inventory/ProductsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
