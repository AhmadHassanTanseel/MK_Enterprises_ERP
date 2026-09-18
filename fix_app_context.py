import re

with open('src/app/context/AppContext.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix PURCHASE mapping
old_purchase = """          await invoke('process_purchase', {
            supplierId: invoiceData.account_id,
            invoiceDate: invoiceData.date,
            salesmanId: null,
            invoiceNumber: invoiceData.ref_no,
            lines: invoiceData.lines.map(l => ({
              product_id: l.product_id,
              quantity: l.qty,
              unit_price: l.rate,
              discount_percent: l.discount_pct
            })),
            grossAmount: invoiceData.gross_amount,"""

new_purchase = """          await invoke('process_purchase', {
            supplierId: invoiceData.account_id,
            invoiceDate: invoiceData.date,
            salesmanId: null,
            invoiceNumber: invoiceData.ref_no,
            lines: invoiceData.lines.map(l => ({
              product_id: l.product_id,
              quantity: l.qty,
              unit_price: l.rate,
              discount_percent: l.discount_pct,
              sale_rate: l.sale_rate,
              flavor: l.flavor
            })),
            grossAmount: invoiceData.gross_amount,"""

# Also fix SALE mapping
old_sale = """          await invoke('process_sale', {
            accountId: invoiceData.account_id,
            invoiceDate: invoiceData.date,
            salesmanId: null,
            invoiceNumber: invoiceData.ref_no,
            lines: invoiceData.lines.map(l => ({
              product_id: l.product_id,
              quantity: l.qty,
              unit_price: l.rate,
              discount_percent: l.discount_pct
            })),
            grossAmount: invoiceData.gross_amount,"""

new_sale = """          await invoke('process_sale', {
            accountId: invoiceData.account_id,
            invoiceDate: invoiceData.date,
            salesmanId: null,
            invoiceNumber: invoiceData.ref_no,
            lines: invoiceData.lines.map(l => ({
              product_id: l.product_id,
              quantity: l.qty,
              unit_price: l.rate,
              discount_percent: l.discount_pct,
              flavor: l.flavor
            })),
            grossAmount: invoiceData.gross_amount,"""

code = code.replace(old_purchase, new_purchase)
code = code.replace(old_sale, new_sale)

with open('src/app/context/AppContext.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
