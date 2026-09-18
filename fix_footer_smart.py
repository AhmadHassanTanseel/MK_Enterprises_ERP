import re

files_to_fix = [
    'src/features/sales/SaleInvoicePanel.tsx',
    'src/features/purchases/PurchaseInvoicePanel.tsx'
]

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # Revert my previous change first just in case
    # Current: <div className="flex flex-row gap-6 justify-between items-end w-full overflow-x-auto pb-2">
    
    pattern = r'<div className="flex flex-row gap-6 justify-between items-end w-full overflow-x-auto pb-2">(.*?)            </div>\n          </div>'
    
    # We will replace it with:
    # <div className="w-full overflow-x-auto pb-2">
    #   <div className="flex flex-row gap-6 justify-between items-end min-w-max w-full">
    #     ...
    #   </div>
    # </div>
    
    match = re.search(pattern, code, re.DOTALL)
    if match:
        inner_content = match.group(1)
        new_block = f"""<div className="w-full overflow-x-auto pb-2">
            <div className="flex flex-row gap-6 justify-between items-end min-w-max w-full">{inner_content}            </div>
          </div>"""
        code = code[:match.start()] + new_block + code[match.end():]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
