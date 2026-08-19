import React, { useState } from 'react';
import { useAppContext, InvoiceLine } from '../../app/context/AppContext';
import { Plus, Trash2, Printer, Save, FileText } from 'lucide-react';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { printContent } from '../../utils/printHelper';
import toast from 'react-hot-toast';

export const PurchaseInvoicePanel: React.FC = () => {
  const { products, categories, accounts, postInvoice } = useAppContext();
  
  const [accountId, setAccountId] = useState<number | null>(null);
  const [lines, setLines] = useState<(InvoiceLine & { id: string })[]>([
    { id: '1', product_id: 0, qty: 1, rate: 0, discount_pct: 0, amount: 0 }
  ]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const supplierAccounts = accounts.filter(a => a.account_type_id === 4 || a.account_type_id === 1); // Suppliers & Cash

  const addLine = () => {
    setLines([...lines, { id: Math.random().toString(), product_id: 0, qty: 1, rate: 0, discount_pct: 0, amount: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof InvoiceLine | 'category_id', value: any) => {
    setLines(lines.map(l => {
      if (l.id === id) {
        const newLine = { ...l, [field]: value };
        if (field === 'category_id') {
          newLine.product_id = 0;
          newLine.rate = 0;
        }
        if (field === 'product_id' && value) {
          const product = products.find(p => p.id === value);
          if (product) newLine.rate = product.purchase_price;
        }
        return newLine;
      }
      return l;
    }));
  };

  const calculateLineTotal = (line: InvoiceLine) => {
    const gross = line.qty * line.rate;
    return gross - (gross * (line.discount_pct / 100));
  };

  const totalGross = lines.reduce((sum, line) => sum + (line.qty * line.rate), 0);
  const totalDiscount = lines.reduce((sum, line) => sum + ((line.qty * line.rate) * (line.discount_pct / 100)), 0);
  const totalNet = totalGross - totalDiscount;
  const balance = totalNet - amountPaid;

  
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    
    if (!accountId) { toast.error("Please select a supplier"); return; }
    if (lines.length === 0) { toast.error("Please add at least one line."); return; }
    for (const line of lines) {
      if (!line.product_id) { toast.error("Please select a valid product for all lines."); return; }
      if (line.qty <= 0) { toast.error("Quantity must be greater than 0 for all lines."); return; }
      if (line.rate < 0) { toast.error("Rate cannot be negative for all lines."); return; }
    }

    setIsSubmitting(true);
    try {
      await postInvoice({
        type: 'PURCHASE',
        ref_no: `PUR-${Math.floor(Math.random() * 10000)}`,
        account_id: accountId,
        date: invoiceDate,
        lines: lines as any,
        gross_amount: totalGross,
        discount_amount: totalDiscount,
        net_amount: totalNet,
        amount_paid: amountPaid
      });
      toast.success(`Purchase Invoice saved successfully`);
      setLines([{ id: '1', product_id: 0, qty: 1, rate: 0, discount_pct: 0, amount: 0 }]);
      setAmountPaid(0);
      setAccountId(null);
    } catch (err) { toast.error(`Could not save Purchase Invoice: ${err instanceof Error ? err.message : String(err)}`); } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      
      

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Purchase Invoice (GRN)</h2>
          <div className="flex gap-2">
            <button onClick={() => {
              const acc = accounts.find(a => a.id === accountId);
              const accName = acc ? acc.name : 'Unknown Supplier';
              const date = new Date().toISOString().split('T')[0];
              const html = `
                <div class="header-info">
                  <span><strong>Supplier:</strong> ${accName}</span>
                  <span><strong>Date:</strong> ${date}</span>
                </div>
                <table>
                  <thead>
                    <tr><th>Item</th><th class="text-right">Qty</th><th class="text-right">Rate</th><th class="text-right">Gross</th><th class="text-right">Disc %</th><th class="text-right">Net</th></tr>
                  </thead>
                  <tbody>
                    ${lines.map(l => {
                      const p = products.find(prod => prod.id === l.product_id);
                      return '<tr><td>' + (p ? p.name : '') + '</td><td class="text-right">' + l.qty + '</td><td class="text-right">' + l.rate + '</td><td class="text-right">' + (l.qty * l.rate) + '</td><td class="text-right">' + l.discount_pct + '</td><td class="text-right">' + calculateLineTotal(l) + '</td></tr>';
                    }).join('')}
                  </tbody>
                </table>
                <div class="totals">
                  <div>Gross: Rs. ${totalGross.toLocaleString()}</div>
                  <div>Discount: Rs. ${totalDiscount.toLocaleString()}</div>
                  <div>Net Total: Rs. ${totalNet.toLocaleString()}</div>
                  <div>Amount Paid: Rs. ${amountPaid.toLocaleString()}</div>
                  <div>Balance: Rs. ${balance.toLocaleString()}</div>
                </div>
              `;
              printContent('Purchase Invoice (GRN)', html);
            }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={() => {
              const acc = accounts.find(a => a.id === accountId);
              generateInvoicePDF('PURCHASE', `PUR-${Date.now()}`, new Date().toISOString().split('T')[0], acc, lines as any, products, totalGross, totalDiscount, totalNet, amountPaid);
            }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Save Bill'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
            <select 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={accountId || ''}
              onChange={e => setAccountId(Number(e.target.value))}
            >
              <option value="">-- Select Supplier --</option>
              {supplierAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} (Bal: {acc.current_balance})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-md p-2" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Ref No.</label>
            <input type="text" className="w-full border border-slate-300 rounded-md p-2" placeholder="e.g. INV-992" />
          </div>
        </div>
      </div>

      {/* Grid Panel */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-medium w-12 text-center">#</th>
                <th className="px-4 py-3 font-medium w-1/3">Product Item</th>
                <th className="px-4 py-3 font-medium text-right w-24">Qty (In)</th>
                <th className="px-4 py-3 font-medium text-right w-32">Pur. Rate (Rs)</th>
                <th className="px-4 py-3 font-medium text-right w-32">Gross</th>
                <th className="px-4 py-3 font-medium text-right w-24">Disc %</th>
                <th className="px-4 py-3 font-medium text-right w-32">Net Total</th>
                <th className="px-4 py-3 font-medium w-16 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => (
                <tr key={line.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-center text-slate-400">{index + 1}</td>
                  <td className="px-4 py-2">
                    <select 
                      className="w-full border-none bg-transparent focus:ring-2 focus:ring-blue-500 outline-none p-1"
                      value={line.product_id || ''}
                      onChange={e => updateLine(line.id, 'product_id', Number(e.target.value))}
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" min="1" className="w-full text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" value={line.qty} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" className="w-full text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" value={line.rate} onChange={e => updateLine(line.id, 'rate', Number(e.target.value))} />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-700">{(line.qty * line.rate).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" className="w-full text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" value={line.discount_pct} onChange={e => updateLine(line.id, 'discount_pct', Number(e.target.value))} />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-blue-700">{calculateLineTotal(line).toLocaleString()}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => removeLine(line.id)} className="text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-2">
          <button onClick={addLine} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1">
            <Plus className="h-4 w-4" /> Add Line Item
          </button>
        </div>
      </div>

      {/* Footer Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-end justify-between">
        <div className="w-1/3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
          <textarea className="w-full border border-slate-300 rounded-md p-2 h-20 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Purchase notes..."></textarea>
        </div>

        <div className="w-1/2 max-w-sm flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 font-medium">Gross Amount:</span>
            <span className="text-slate-800 font-medium">Rs. {totalGross.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 font-medium">Discount Amount:</span>
            <span className="text-rose-600 font-medium">- Rs. {totalDiscount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg pt-2 border-t border-slate-200">
            <span className="text-slate-800 font-bold">Net Total:</span>
            <span className="text-slate-800 font-bold">Rs. {totalNet.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-200">
            <label className="text-sm font-bold text-slate-800 whitespace-nowrap">Amount Paid Now:</label>
            <input 
              type="number" 
              className="flex-1 text-right border-b-2 border-slate-300 bg-blue-50 text-blue-800 font-bold p-2 outline-none focus:border-blue-500 rounded-t" 
              value={amountPaid}
              onChange={e => setAmountPaid(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-600 font-medium">Balance Payable:</span>
            <span className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Rs. {balance.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
