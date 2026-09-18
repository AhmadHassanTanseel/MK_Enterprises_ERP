import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../app/context/AppContext';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { printContent } from '../../utils/printHelper';
import toast from 'react-hot-toast';
import { EntitySelect } from '../../shared/components/EntitySelect';

interface InvoiceLine {
  flavor?: string;
  id: string;
  
  product_id: number | null;
  qty: number;
  rate: number;
  discount: number;
}

export const SaleInvoicePanel: React.FC = () => {
  const { products, accounts, areas, salesmen, fetchData } = useAppContext();
  
  const [customer_id, setCustomerId] = useState<number | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [salesman_id, setSalesmanId] = useState<number | null>(null);
  
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: '1', product_id: null, qty: 1, rate: 0, discount: 0 }
  ]);

  // Split cash/bank
  const [amountReceivedCash, setAmountReceivedCash] = useState<number>(0);
  const [amountReceivedBank, setAmountReceivedBank] = useState<number>(0);
  
  

  const [loading, setLoading] = useState(false);

  const totalGross = lines.reduce((sum, l) => sum + (l.qty * l.rate), 0);
  const totalDiscount = lines.reduce((sum, l) => sum + ((l.discount || 0) * l.qty), 0);
  const totalNet = totalGross - totalDiscount;
  
  
  const balance = totalNet - (amountReceivedCash + amountReceivedBank);

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), product_id: null, qty: 1, rate: 0, discount: 0 }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      addLine();
    }
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
    setLines(lines.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value };
        // Category->Product direction logic
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.rate = product.sale_price;
          }
        }
        return updated;
      }
      return l;
    }));
  };

  const handleSave = async () => {
    if (!customer_id) {
      toast.error('Customer is required');
      return;
    }
    const validLines = lines.filter(l => l.product_id && l.qty > 0);
    if (validLines.length === 0) {
      toast.error('Add at least one valid product line');
      return;
    }

    try {
      setLoading(true);
      await invoke('process_sale', {
          accountId: customer_id,
          salesmanId: salesman_id,
          invoiceNumber: null,
          invoiceDate: invoiceDate,
          grossAmount: totalGross,
          discountAmount: totalDiscount,
          netAmount: totalNet,
          amountReceivedCash: amountReceivedCash, amountReceivedBank: amountReceivedBank,
          lines: validLines.map(l => ({
            product_id: l.product_id,
            quantity: l.qty,
            unit_price: l.rate,
            discount_percent: l.discount || 0, flavor: l.flavor
          }))
        });
      toast.success('Sale Invoice Saved');
      
      // Reset form
      setCustomerId(null);
      setSalesmanId(null);
      setLines([{ id: Date.now().toString(), product_id: null, qty: 1, rate: 0, discount: 0 }]);
      setAmountReceivedCash(0);
      setAmountReceivedBank(0);
      
      
      
      fetchData();
    } catch (err: any) {
      toast.error(`Could not save Sale Invoice: ${err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const uniqueBrands = Array.from(new Set(products.map(p => p.name).filter(Boolean)));

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">New Sale Invoice</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer / Walk-in *</label>
            <EntitySelect type="account" value={customer_id || 0} onChange={setCustomerId} filter={a => a.is_customer} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-md p-2" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bill No (Auto)</label>
            <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-md p-2 text-slate-500" placeholder="Generated on save" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Salesman</label>
            <EntitySelect type="salesman" value={salesman_id || 0} onChange={setSalesmanId} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-2 font-semibold text-slate-600 text-center w-12">#</th>
                <th className="px-4 py-2 font-semibold text-slate-600 w-64">Product (Brand)</th>
                <th className="px-4 py-2 font-semibold text-slate-600 w-48">Flavor</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-right w-24">Stock</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-right w-24">Qty</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-right w-32">Rate</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-right w-32">Discount</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-right w-32">Line Total</th>
                <th className="px-4 py-2 font-semibold text-slate-600 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100" onKeyDown={handleKeyDown}>
              {lines.map((line, index) => {
                const stock = products.find(p => p.id === line.product_id)?.current_stock || 0;
                const lineTotal = (line.rate - (line.discount || 0)) * line.qty;
                return (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-center text-slate-400">{index + 1}</td>
                    <td className="px-4 py-2 w-1/4">
                      <EntitySelect 
                        type="product" 
                        value={line.product_id || 0} 
                        onChange={v => updateLine(line.id, 'product_id', v)} 
                         
                        className="w-full" 
                      />
                    </td>
                    <td className="px-4 py-2 w-1/4">
                      {line.product_id ? (
                        <select 
                          className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                          value={line.flavor || ''}
                          onChange={e => updateLine(line.id, 'flavor', e.target.value)}
                        >
                          <option value="">None</option>
                          {(products.find(p => p.id === line.product_id)?.flavors || '').split(',').map(f => f.trim()).filter(f => f).map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400 text-sm">Select product</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`px-2 py-1 rounded text-xs ${stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {stock}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="1" className="w-full min-w-[80px] text-right border border-slate-300 rounded p-1 outline-none focus:border-blue-500" value={line.qty || ''} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-300 rounded p-1 outline-none bg-slate-100 text-slate-500 cursor-not-allowed" value={line.rate === 0 ? 0 : line.rate || ''} readOnly title="Rate is auto-populated from product pricing" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-300 rounded p-1 outline-none focus:border-blue-500" value={line.discount || ''} onChange={e => updateLine(line.id, 'discount', Number(e.target.value))} />
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-700">Rs. {lineTotal.toLocaleString()}</td>
                    <td className="px-4 py-2 text-center">
                      <button type="button" onClick={() => removeLine(line.id)} className="text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors" disabled={lines.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <button type="button" onClick={addLine} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 mb-4">
            <Plus className="h-4 w-4" /> Add Line
          </button>
          
            <div className="w-full overflow-x-auto pb-2">
            <div className="flex flex-row gap-6 justify-between items-end min-w-max w-full">
              
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
                    <label className="text-sm font-bold text-slate-800 whitespace-nowrap">Cash Received:</label>
                    <input 
                      type="number" 
                      className="w-32 text-right border-b-2 border-slate-300 bg-emerald-50 text-emerald-800 font-bold p-1 outline-none focus:border-emerald-500 rounded-t" 
                      value={amountReceivedCash || ''}
                      onChange={e => setAmountReceivedCash(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-bold text-slate-800 whitespace-nowrap">Bank Received:</label>
                    <input 
                      type="number" 
                      className="w-32 text-right border-b-2 border-slate-300 bg-blue-50 text-blue-800 font-bold p-1 outline-none focus:border-blue-500 rounded-t" 
                      value={amountReceivedBank || ''}
                      onChange={e => setAmountReceivedBank(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-100 mt-2 pt-2">
                  <span className="text-slate-600 font-medium">Balance (Bakaya):</span>
                  <span className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Rs. {balance.toLocaleString()}</span>
                </div>
              </div>
            <div className="flex gap-2">
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
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Invoice'}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
