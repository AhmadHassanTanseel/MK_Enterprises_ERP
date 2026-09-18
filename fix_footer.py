import re

with open('src/features/purchases/PurchaseInvoicePanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the entire footer panel
old_footer_pattern = r'\{\/\* Footer Panel \*\/\}.*'
new_footer = """{/* Footer actions */}
      <div className="bg-slate-50 border-t border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-6 justify-end items-start md:items-end w-full">
          
          <div className="flex flex-col gap-2 bg-white p-4 rounded border border-slate-200 shadow-sm flex-1 md:flex-none md:w-64">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gross Total:</span>
              <span className="text-slate-800 font-medium">Rs. {totalGross.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Discount:</span>
              <span className="text-rose-600 font-medium">- Rs. {totalDiscount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base border-t border-slate-100 mt-2 pt-2">
              <span className="text-slate-800 font-bold">Net Total:</span>
              <span className="text-slate-800 font-bold">Rs. {totalNet.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white p-4 rounded border border-slate-200 shadow-sm flex-1 md:flex-none md:w-80">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-bold text-slate-800 whitespace-nowrap">Cash Paid Now:</label>
                <input 
                  type="number" 
                  className="w-32 text-right border-b-2 border-slate-300 bg-emerald-50 text-emerald-800 font-bold p-1 outline-none focus:border-emerald-500 rounded-t" 
                  value={amountPaidCash || ''}
                  onChange={e => setAmountPaidCash(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-bold text-slate-800 whitespace-nowrap">Bank Paid Now:</label>
                <input 
                  type="number" 
                  className="w-32 text-right border-b-2 border-slate-300 bg-blue-50 text-blue-800 font-bold p-1 outline-none focus:border-blue-500 rounded-t" 
                  value={amountPaidBank || ''}
                  onChange={e => setAmountPaidBank(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 mt-2 pt-2">
              <span className="text-slate-600 font-medium">Balance Payable:</span>
              <span className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Rs. {balance.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
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
                        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Gross</th>
                        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Disc %</th>
                        <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${lines.map(l => {
                        const p = products.find(prod => prod.id === l.product_id);
                        return '<tr><td style="border: 1px solid #e2e8f0; padding: 8px;">' + (p ? p.name : '') + '</td><td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">' + l.qty + '</td><td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">' + l.rate + '</td><td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">' + ((l.qty||0)*(l.rate||0)) + '</td><td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">' + l.discount_pct + '</td><td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">' + calculateLineTotal(l) + '</td></tr>';
                      }).join('')}
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
            <button onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
              <Save className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Save Bill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PurchaseInvoicePanel;
"""

code = re.sub(old_footer_pattern, new_footer, code, flags=re.DOTALL)

with open('src/features/purchases/PurchaseInvoicePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
