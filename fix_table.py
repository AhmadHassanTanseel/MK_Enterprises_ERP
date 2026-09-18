import re

with open('src/features/inventory/ProductsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Change min-w-[800px] to w-full min-w-max
code = code.replace('className="w-full min-w-[800px] text-left', 'className="w-full min-w-max text-left')

# 2. Remove UoM header
code = code.replace('<th className="px-4 py-3 font-medium text-center">UoM</th>\n', '')

# 3. Remove UoM td
uom_td = """                  <td className="px-4 py-3 text-center text-xs">
                    <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600">{prod.uom}</span>
                  </td>"""
code = code.replace(uom_td, '')

with open('src/features/inventory/ProductsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
