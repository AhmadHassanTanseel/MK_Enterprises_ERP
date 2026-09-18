import re

# 1. Update PurchaseInvoicePanel.tsx
with open('src/features/purchases/PurchaseInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    purchase_code = f.read()

# Remove the buttons from the header in PurchaseInvoicePanel
header_pattern = r'(<div className="flex justify-between items-center pb-4 border-b border-slate-100">\s*<h2 className="text-xl font-bold text-slate-800">Purchase Invoice \(GRN\)</h2>\s*)<div className="flex gap-2">.*?</div>(\s*</div>)'
purchase_code = re.sub(header_pattern, r'\1\2', purchase_code, flags=re.DOTALL)

# Insert the buttons at the end of the footer
footer_pattern = r'(<div className="flex justify-between text-sm mt-2 border-t border-slate-100 pt-2">\s*<span className="text-slate-600 font-medium">Balance Payable:</span>\s*<span className={`font-bold \${balance > 0 \? \'text-amber-600\' : \'text-slate-500\'}`>Rs\. \{balance\.toLocaleString\(\)\}<\/span>\s*<\/div>\s*<\/div>)'

buttons_html = """
          <div className="flex gap-2 flex-col md:flex-row mt-4 md:mt-0 xl:mt-0">
            <button onClick={() => {
              const acc = accounts.find(a => a.id === accountId);
              const accName = acc ? acc.name : 'Unknown Supplier';
              const date = new Date().toISOString().split('T')[0];
              const html = `
                <div style="font-family: sans-serif; padding: 20px;">
                  <h2 style="text-align: center; margin-bottom: 20px;">PURCHASE INVOICE (GRN)</h2>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div><strong>Supplier:</strong> ${accName}</div>
                    <div><strong>Date:</strong> ${date}</div>
                  </div>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                      <tr style="background-color: #f8fafc;">
                        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">Product</th>
                        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Qty</th>
                        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Rate</th>
                        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Discount</th>
                        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${lines.map((l: any) => `
                        <tr>
                          <td style="border: 1px solid #e2e8f0; padding: 8px;">${products.find(p => p.id === l.product_id)?.name || ''}</td>
                          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">${l.qty}</td>
                          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">${l.rate}</td>
                          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">${l.discount_pct || 0}</td>
                          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">${calculateLineTotal(l)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  <div style="text-align: right; margin-top: 20px;">
                    <div><strong>Gross:</strong> Rs. ${totalGross.toLocaleString()}</div>
                    <div><strong>Discount:</strong> Rs. ${totalDiscount.toLocaleString()}</div>
                    <div style="font-size: 1.2em; margin-top: 10px;"><strong>Net Total:</strong> Rs. ${totalNet.toLocaleString()}</div>
                    <div style="margin-top: 10px;">Paid: Rs. ${(amountPaidCash + amountPaidBank).toLocaleString()}</div>
                    <div>Balance: Rs. ${balance.toLocaleString()}</div>
                  </div>
                </div>
              `;
              printContent('Purchase Invoice (GRN)', html);
            }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={() => {
              const acc = accounts.find(a => a.id === accountId);
              generateInvoicePDF('PURCHASE', `PUR-${Date.now()}`, new Date().toISOString().split('T')[0], acc, lines as any, products, totalGross, totalDiscount, totalNet, (amountPaidCash + amountPaidBank));
            }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button onClick={handleSave} disabled={isSubmitting} className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 min-w-[140px]">
              <Save className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Save Bill'}
            </button>
          </div>"""

# Insert buttons into footer
purchase_code = purchase_code.replace(
    '            <div className="flex justify-between text-sm mt-2 border-t border-slate-100 pt-2">\n              <span className="text-slate-600 font-medium">Balance Payable:</span>\n              <span className={`font-bold ${balance > 0 ? \'text-amber-600\' : \'text-slate-500\'}`}>Rs. {balance.toLocaleString()}</span>\n            </div>\n          </div>',
    '            <div className="flex justify-between text-sm mt-2 border-t border-slate-100 pt-2">\n              <span className="text-slate-600 font-medium">Balance Payable:</span>\n              <span className={`font-bold ${balance > 0 ? \'text-amber-600\' : \'text-slate-500\'}`}>Rs. {balance.toLocaleString()}</span>\n            </div>\n          </div>\n' + buttons_html
)

with open('src/features/purchases/PurchaseInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(purchase_code)

# 2. Update SaleInvoicePanel.tsx
with open('src/features/sales/SaleInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    sales_code = f.read()

# Add FileText to lucide-react import
sales_code = sales_code.replace("import { Plus, Trash2, Save, Printer } from 'lucide-react';", "import { Plus, Trash2, Save, Printer, FileText } from 'lucide-react';")

sales_buttons_html = """
              <div className="flex gap-2 flex-col md:flex-row mt-4 md:mt-0">
                <button onClick={() => {
                  const acc = accounts.find(a => a.id === customer_id);
                  const accName = acc ? acc.name : 'Walk-in Customer';
                  const date = new Date().toISOString().split('T')[0];
                  const html = `
                    <div style="font-family: sans-serif; padding: 20px;">
                      <h2 style="text-align: center; margin-bottom: 20px;">SALE INVOICE</h2>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div><strong>Customer:</strong> ${accName}</div>
                        <div><strong>Date:</strong> ${date}</div>
                      </div>
                      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                          <tr style="background-color: #f8fafc;">
                            <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">Product</th>
                            <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Qty</th>
                            <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Rate</th>
                            <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Discount</th>
                            <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${lines.map((l: any) => `
                            <tr>
                              <td style="border: 1px solid #e2e8f0; padding: 8px;">${products.find(p => p.id === l.product_id)?.name || ''}</td>
                              <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">${l.qty}</td>
                              <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">${l.rate}</td>
                              <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">${l.discount}</td>
                              <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">${((l.qty||0)*(l.rate||0) - (l.discount||0))}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      <div style="text-align: right; margin-top: 20px;">
                        <div><strong>Gross:</strong> Rs. ${totalGross.toLocaleString()}</div>
                        <div><strong>Discount:</strong> Rs. ${totalDiscount.toLocaleString()}</div>
                        <div style="font-size: 1.2em; margin-top: 10px;"><strong>Net Total:</strong> Rs. ${totalNet.toLocaleString()}</div>
                        <div style="margin-top: 10px;">Received: Rs. ${(amountReceivedCash + amountReceivedBank).toLocaleString()}</div>
                        <div>Balance: Rs. ${balance.toLocaleString()}</div>
                      </div>
                    </div>
                  `;
                  printContent('Sale Invoice', html);
                }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors">
                  <Printer className="h-4 w-4" /> Print
                </button>
                <button onClick={() => {
                  const acc = accounts.find(a => a.id === customer_id);
                  generateInvoicePDF('SALE', `INV-${Date.now()}`, new Date().toISOString().split('T')[0], acc, lines as any, products, totalGross, totalDiscount, totalNet, (amountReceivedCash + amountReceivedBank));
                }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors">
                  <FileText className="h-4 w-4" /> PDF
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 min-w-[140px]"
                >
                  <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Invoice'}
                </button>
              </div>"""

# Find the old buttons container and replace it
import re
old_buttons_pattern = r'<div className="flex gap-2">\s*<button onClick=\{\(\) => \{\s*const acc = accounts\.find\(a => a\.id === customer_id\);\s*// Note: local state printing only.*?</button>\s*</div>'
sales_code = re.sub(old_buttons_pattern, sales_buttons_html, sales_code, flags=re.DOTALL)

with open('src/features/sales/SaleInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(sales_code)
