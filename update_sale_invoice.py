import re

with open('src/features/sales/SaleInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"const html = `[\s\S]*?printContent\('Sale Invoice', html\);"

new_code = """
                printThermalReceipt({
                  title: 'SALE INVOICE',
                  refNo: '',
                  date: new Date().toLocaleDateString(),
                  accountLabel: 'Customer',
                  accountName: accName,
                  lines: lines.map((l: any) => ({
                    product: products.find(p => p.id === l.product_id)?.name || 'Unknown',
                    qty: l.qty || 0,
                    rate: l.rate || 0,
                    total: ((l.qty||0) * (l.rate||0)) - (l.discount||0)
                  })),
                  gross: totalGross,
                  discount: totalDiscount,
                  net: totalNet,
                  paid: amountReceivedCash + amountReceivedBank,
                  balance: balance
                });
"""

code = re.sub(pattern, new_code.strip(), code)

with open('src/features/sales/SaleInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
