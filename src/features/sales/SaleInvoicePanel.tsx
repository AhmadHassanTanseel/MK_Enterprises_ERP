import React, { useState } from 'react';
import { useAppContext, Product, Account } from '../../app/context/AppContext';
import { Plus, Trash2, Printer, Save, FileText } from 'lucide-react';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { printContent } from '../../utils/printHelper';
import toast from 'react-hot-toast';
import { EntitySelect } from '../../shared/components/EntitySelect';

interface InvoiceLine {
  id: string;
  category_id: number | null;
  product_id: number | null;
  qty: number;
  rate: number;
  discount_pct: number;
}

export const SaleInvoicePanel: React.FC = () => {
  
  

  const { products, categories, accounts, postInvoice } = useAppContext();
  
  const [customer_id, setCustomerId] = useState<number | null>(null);
  const [salesman_id, setSalesmanId] = useState<number | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: '1', category_id: null, product_id: null, qty: 1, rate: 0, discount_pct: 0 }
  ]);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerAccounts = accounts.filter(a => a.account_type_id === 2 || a.account_type_id === 1);
  const salesmen = accounts.filter(a => a.account_type_id === 14);

  const addLine = () => {
    setLines([...lines, { id: Math.random().toString(), category_id: null, product_id: null, qty: 1, rate: 0, discount_pct: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
    setLines(lines.map(l => {
      if (l.id === id) {
        const newLine = { ...l, [field]: value };
        if (field === 'category_id') {
          newLine.product_id = null;
          newLine.rate = 0;
        }
        if (field === 'product_id' && value) {
          const product = products.find(p => p.id === value);
          if (product) newLine.rate = product.sale_price;
        }
        return newLine;
      }
      return l;
    }));
  };

  const calculateLineTotal = (line: InvoiceLine) => {
    const gross = line.qty * line.rate;
    const discountAmt = gross * (line.discount_pct / 100);
    return gross - discountAmt;
  };

  const totalGross = lines.reduce((sum, line) => sum + (line.qty * line.rate), 0);
  const totalDiscount = lines.reduce((sum, line) => sum + ((line.qty * line.rate) * (line.discount_pct / 100)), 0);
  const totalNet = totalGross - totalDiscount;
  const balance = totalNet - amountReceived;

  const handleSave = async () => {
    
    if (!customer_id) { toast.error("Please select a customer."); return; }
    if (lines.length === 0) { toast.error("Please add at least one line."); return; }
    for (const line of lines) {
      if (!line.product_id) { toast.error("Please select a valid product for all lines."); return; }
      if (line.qty <= 0) { toast.error("Quantity must be greater than 0 for all lines."); return; }
      if (line.rate < 0) { toast.error("Rate cannot be negative for all lines."); return; }
    }

    setIsSubmitting(true);
    try {
      await postInvoice({
        type: 'SALE',
        ref_no: `INV-${Date.now()}`,
        account_id: customer_id,
        date: invoiceDate,
        lines: lines as any,
        gross_amount: totalGross,
        discount_amount: totalDiscount,
        net_amount: totalNet,
        amount_paid: amountReceived
      });
      toast.success(`Sale Invoice saved successfully`);
      setCustomerId(null);
      setLines([{ id: '1', category_id: null, product_id: null, qty: 1, rate: 0, discount_pct: 0 }]);
      setAmountReceived(0);
      setRemarks('');
    } catch (err) { toast.error(`Could not save Sale Invoice: ${err instanceof Error ? err.message : String(err)}`); } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      
      
      
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Sale Invoice</h2>
          <div className="flex gap-2">
            <button onClick={() => {
              const acc = accounts.find(a => a.id === customer_id);
              const accName = acc ? acc.name : 'Walk-in Customer';
              const date = new Date().toISOString().split('T')[0];
              const html = `
                <div class="header-info">
                  <span><strong>Customer:</strong> ${accName}</span>
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
                  <div>Amount Received: Rs. ${amountReceived.toLocaleString()}</div>
                  <div>Balance: Rs. ${balance.toLocaleString()}</div>
                </div>
              `;
              printContent('Sale Invoice', html);
            }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={() => {
              const acc = accounts.find(a => a.id === customer_id);
              generateInvoicePDF('SALE', `INV-${Date.now()}`, new Date().toISOString().split('T')[0], acc, lines as any, products, totalGross, totalDiscount, totalNet, amountReceived);
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer / Walk-in *</label>
            <EntitySelect type="account" value={customer_id || 0} onChange={setCustomerId} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-md p-2" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bill No (Auto)</label>
            <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-md p-2 text-slate-500" value="INV-25001" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Salesman</label>
            <EntitySelect type="salesman" value={salesman_id || 0} onChange={setSalesmanId} />
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
                <th className="px-4 py-3 font-medium text-right w-24">Stock</th>
                <th className="px-4 py-3 font-medium text-right w-24">Qty</th>
                <th className="px-4 py-3 font-medium text-right w-32">Rate (Rs)</th>
                <th className="px-4 py-3 font-medium text-right w-32">Gross</th>
                <th className="px-4 py-3 font-medium text-right w-24">Disc %</th>
                <th className="px-4 py-3 font-medium text-right w-32">Net Total</th>
                <th className="px-4 py-3 font-medium w-16 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => {
                const product = products.find(p => p.id === line.product_id);
                const stock = product ? product.opening_stock : 0;
                
                return (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-center text-slate-400">{index + 1}</td>
                    <td className="px-4 py-2 w-48">
                        <EntitySelect 
                          type="category" 
                          value={line.category_id || 0} 
                          onChange={v => updateLine(line.id, 'category_id', v)} 
                        />
                      </td>
                      <td className="px-4 py-2">
                      <EntitySelect type="product" value={line.product_id || 0} onChange={v => updateLine(line.id, 'product_id', v)} filter={p => line.category_id ? p.category_id === line.category_id : true} className="w-full" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`px-2 py-1 rounded text-xs ${stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {stock}
                      </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-2">
          <button onClick={addLine} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1">
            <Plus className="h-4 w-4" /> Add Line Item
          </button>
        </div>
      </div>

      {/* Footer / Summary Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-end justify-between">
        <div className="w-1/3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
          <textarea className="w-full border border-slate-300 rounded-md p-2 h-20 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Invoice notes..."></textarea>
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
            <label className="text-sm font-bold text-slate-800 whitespace-nowrap">Amount Received:</label>
            <input 
              type="number" 
              className="flex-1 text-right border-b-2 border-slate-300 bg-emerald-50 text-emerald-800 font-bold p-2 outline-none focus:border-emerald-500 rounded-t" 
              value={amountReceived}
              onChange={e => setAmountReceived(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-600 font-medium">Balance (Bakaya):</span>
            <span className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Rs. {balance.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
