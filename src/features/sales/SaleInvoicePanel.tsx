import React, { useState, useEffect, useRef } from 'react';
import { useGridNavigation } from '../../utils/useGridNavigation';
import { Plus, Trash2, Save, Printer, FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../app/context/AppContext';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { printThermalReceipt } from '../../utils/receiptPrinter';
import toast from 'react-hot-toast';
import { EntitySelect } from '../../shared/components/EntitySelect';
import { BankAccountSelect } from '../../shared/components/BankAccountSelect';
import { QuickCreateModal } from '../../shared/components/QuickCreateModal';

interface InvoiceLine {
  flavor?: string;
  id: string;
  
  product_id: number | null;
  qty: number;
  rate: number;
  discount: number;
}

export const SaleInvoicePanel: React.FC = () => {
  const { settings, products, accounts, areas, salesmen, fetchData } = useAppContext();
  
  const [customer_id, setCustomerId] = useState<number | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [salesman_id, setSalesmanId] = useState<number | null>(null);

  useEffect(() => {
    if (customer_id === null && accounts && accounts.length > 0) {
      const walkIn = accounts.find(a => a.name.toLowerCase().includes('walk-in'));
      if (walkIn) {
        setCustomerId(walkIn.id);
      }
    }
  }, [accounts]);
  
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: '1', product_id: null, qty: 1, rate: 0, discount: 0 }
  ]);

  // Split cash/bank
  const [amountReceivedCash, setAmountReceivedCash] = useState<number>(0);
  const [amountReceivedBank, setAmountReceivedBank] = useState<number>(0);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [showQuickCreateCustomer, setShowQuickCreateCustomer] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedBankId && accounts.length > 0) {
      const defaultBank = accounts.find(a => (a.account_type_id === 1 && a.id !== 1) || !!a.bank_name);
      if (defaultBank) {
        setSelectedBankId(defaultBank.id);
      }
    }
  }, [accounts, selectedBankId]);
  
  

  const [loading, setLoading] = useState(false);

  const totalGross = lines.reduce((sum, l) => sum + (l.qty * l.rate), 0);
  const totalDiscount = lines.reduce((sum, l) => sum + ((l.discount || 0) * l.qty), 0);
  const totalNet = totalGross - totalDiscount;
  
  
  const balance = totalNet - (amountReceivedCash + amountReceivedBank);

  const containerRef = useRef<HTMLDivElement>(null);
  useGridNavigation(containerRef, () => addLine(), () => handleSave(false, false));

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), product_id: null, qty: 1, rate: 0, discount: 0 }]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
    if (field === 'product_id' && value) {
      const existingLineIndex = lines.findIndex(l => l.id !== id && l.product_id === value);
      if (existingLineIndex !== -1) {
        const existingLine = lines[existingLineIndex];
        const product = products.find(p => p.id === value);
        toast.error(`"${product?.name || 'Item'}" پہلے سے لائن نمبر ${existingLineIndex + 1} میں موجود ہے!`, { id: 'dup-prod' });
        setTimeout(() => {
          const qtyInput = document.getElementById(`line-qty-${existingLine.id}`);
          if (qtyInput) {
            qtyInput.focus();
            (qtyInput as HTMLInputElement).select();
          }
        }, 50);
        return;
      }
    }

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

  const handleSave = async (printAfter: boolean = false, isPDF: boolean = false) => {
    if (!customer_id) {
      toast.error('Customer is required');
      return;
    }
    const validLines = lines.filter(l => l.product_id && l.qty > 0);
    if (validLines.length === 0) {
      toast.error('Add at least one valid product line');
      return;
    }
    
    // Strict stock validation
    for (const line of validLines) {
      const product = products.find(p => p.id === line.product_id);
      if (product && line.qty > (product.current_stock || 0)) {
        toast.error(`Insufficient stock for ${product.name}. Available: ${product.current_stock || 0}, Requested: ${line.qty}`);
        return;
      }
    }

    // Check Walk-in Udhaar restriction
    const totalRecv = (amountReceivedCash || 0) + (amountReceivedBank || 0);
    const bal = totalNet - totalRecv;
    const selectedAcc = accounts.find(a => a.id === customer_id);
    const isWalkIn = customer_id === 2 || (selectedAcc && selectedAcc.name.toLowerCase().includes('walk-in'));

    if (bal > 0.01 && isWalkIn) {
      toast.error('واک اِن کسٹمر (Walk-in Customer) پر ادھار نہیں کیا جا سکتا۔ برائے مہربانی گاہک کا نام منتخب کریں یا نیا کھاتہ بنائیں!', { duration: 6000 });
      setShowQuickCreateCustomer(true);
      return;
    }

    try {
      setLoading(true);
      const generatedInvNo: string = await invoke('process_sale', {
          accountId: customer_id,
          salesmanId: salesman_id,
          invoiceNumber: null,
          invoiceDate: invoiceDate,
          grossAmount: totalGross,
          discountAmount: totalDiscount,
          netAmount: totalNet,
          amountReceivedCash: amountReceivedCash, 
          amountReceivedBank: amountReceivedBank,
          bankAccountId: selectedBankId || null,
          lines: validLines.map(l => ({
            product_id: l.product_id,
            quantity: l.qty,
            unit_price: l.rate,
            discount_percent: l.discount || 0
          }))
        });
      toast.success('Sale Invoice Saved: ' + generatedInvNo);
      
      
        const chosenBank = accounts.find(a => a.id === selectedBankId);
        const bankName = chosenBank?.bank_name || settings.find(s => s.key === 'bank_name')?.value || '';
        const accountTitle = chosenBank?.account_title || chosenBank?.name || settings.find(s => s.key === 'bank_account_title')?.value || '';
        const accountNumber = chosenBank?.account_number || settings.find(s => s.key === 'bank_account_number')?.value || '';
        const paymentMethod = amountReceivedBank > 0 ? 'Online' : 'Cash';

        if (printAfter) {
        const acc = accounts.find(a => a.id === customer_id);
        const accName = acc ? acc.name : 'Walk-in Customer';
        const prevBalance = acc ? (acc.current_balance ?? 0) : 0;
        const totalPaid = (amountReceivedCash || 0) + (amountReceivedBank || 0);
        const invoiceNetBalance = totalNet - totalPaid;
        const netAccountBalance = prevBalance + invoiceNetBalance;

        if (isPDF) {
          generateInvoicePDF('SALE', generatedInvNo, invoiceDate, acc, lines as any, products, totalGross, totalDiscount, totalNet, totalPaid, paymentMethod, bankName, accountTitle, accountNumber, prevBalance, netAccountBalance);
        } else {
          printThermalReceipt({
            title: 'SALE INVOICE',
            refNo: generatedInvNo,
            date: invoiceDate,
            accountLabel: 'Customer',
            accountName: accName,
            address: acc?.address || '',
            phone: acc?.contact || '',
            lines: lines.map((l: any) => ({
              product: products.find(p => p.id === l.product_id)?.name || 'Unknown',
              qty: l.qty || 0,
              rate: l.rate || 0,
              total: ((l.qty||0) * (l.rate||0)) - (l.discount||0)
            })),
            totalGross: totalGross,
            totalDiscount: totalDiscount,
            totalNet: totalNet,
            amountReceived: totalPaid,
            balance: invoiceNetBalance,
            previousBalance: prevBalance,
            netAccountBalance: netAccountBalance,
            paymentMethod,
            bankName,
            accountTitle,
            accountNumber
          });
        }
      }
      
      // Reset form
      const walkIn = accounts.find(a => a.name.toLowerCase().includes('walk-in'));
      setCustomerId(walkIn ? walkIn.id : null);
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
    <div className="flex flex-col min-h-full gap-4 pb-12" ref={containerRef}>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">New Sale Invoice</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer / Walk-in *</label>
            <EntitySelect autoFocus type="account" accountRole="customer" value={customer_id || 0} onChange={setCustomerId} filter={a => a.is_customer} />
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

      <div className="min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[360px] min-h-[160px]">
          <table className="w-full min-w-[750px] text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-1.5 font-semibold text-slate-600 text-center w-12">#</th>
                <th className="px-3 py-1.5 font-semibold text-slate-600 w-80">Product (Brand)</th>
                <th className="px-3 py-1.5 font-semibold text-slate-600 text-right w-24">Stock</th>
                <th className="px-3 py-1.5 font-semibold text-slate-600 text-right w-24">Qty</th>
                <th className="px-3 py-1.5 font-semibold text-slate-600 text-right w-32">Rate</th>
                <th className="px-3 py-1.5 font-semibold text-slate-600 text-right w-32">Discount</th>
                <th className="px-3 py-1.5 font-semibold text-slate-600 text-right w-32">Line Total</th>
                <th className="px-3 py-1.5 font-semibold text-slate-600 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => {
                const stock = products.find(p => p.id === line.product_id)?.current_stock || 0;
                const lineTotal = (line.rate - (line.discount || 0)) * line.qty;
                return (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 text-center text-slate-400">{index + 1}</td>
                    <td className="px-3 py-1.5 w-1/4">
                      <EntitySelect 
                        type="product" 
                        value={line.product_id || 0} 
                        onChange={v => updateLine(line.id, 'product_id', v)} 
                         
                        className="w-full" 
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={`px-2 py-1 rounded text-xs ${stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {stock}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <input 
                        id={`line-qty-${line.id}`}
                        type="number" 
                        min="1" 
                        className="w-full min-w-[70px] text-right border border-slate-300 rounded p-1 outline-none focus:border-blue-500" 
                        value={line.qty || ''} 
                        onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} 
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-300 rounded p-1 outline-none focus:border-blue-500" value={line.rate === 0 ? 0 : line.rate || ''} onChange={e => updateLine(line.id, 'rate', Number(e.target.value))} />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-300 rounded p-1 outline-none focus:border-blue-500" value={line.discount || ''} onChange={e => updateLine(line.id, 'discount', Number(e.target.value))} />
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium text-slate-700">Rs. {lineTotal.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-center">
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
        
        {/* Footer actions - Fully Adaptive, No Horizontal or Vertical Page Scroll Needed */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5">
          <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2.5 py-1 mb-3 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200">
            <Plus className="h-4 w-4" /> Add Line Item (نیا آئٹم شامل کریں)
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch w-full">
            {/* 1. Totals Card */}
            <div className="flex flex-col justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Gross Total:</span>
                  <span className="font-semibold text-slate-800">Rs. {totalGross.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Discount:</span>
                  <span className="font-semibold text-rose-600">- Rs. {totalDiscount.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-2 mt-2">
                <span className="font-bold text-slate-800">Net Total:</span>
                <span className="font-bold text-blue-700 text-base">Rs. {totalNet.toLocaleString()}</span>
              </div>
            </div>

            {/* 2. Payments & Bank Selector */}
            <div className="flex flex-col justify-between gap-2 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Cash Received:</label>
                  <input 
                    type="number" 
                    className="w-full text-right border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold p-1.5 rounded-md text-xs outline-none focus:ring-1 focus:ring-emerald-500" 
                    value={amountReceivedCash || ''}
                    onChange={e => setAmountReceivedCash(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Bank Received:</label>
                  <input 
                    type="number" 
                    className="w-full text-right border border-blue-300 bg-blue-50 text-blue-800 font-bold p-1.5 rounded-md text-xs outline-none focus:ring-1 focus:ring-blue-500" 
                    value={amountReceivedBank || ''}
                    onChange={e => setAmountReceivedBank(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <BankAccountSelect 
                  value={selectedBankId} 
                  onChange={setSelectedBankId} 
                />
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1.5">
                <span className="text-slate-600 font-medium">Balance (Bakaya):</span>
                <span className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Rs. {balance.toLocaleString()}</span>
              </div>
              {balance > 0.01 && (customer_id === 2 || accounts.find(a => a.id === customer_id)?.name.toLowerCase().includes('walk-in')) && (
                <div className="flex flex-col gap-1 p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700 font-semibold mt-1">
                  <div className="flex items-center justify-between">
                    <span>⚠️ واک اِن پر ادھار نہیں کیا جا سکتا۔</span>
                    <button 
                      type="button" 
                      onClick={() => setShowQuickCreateCustomer(true)} 
                      className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 transition-colors"
                    >
                      + نیا کسٹمر بنائیں
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Action Buttons - Prominent & Always in Sight */}
            <div className="flex flex-col justify-between gap-2 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => handleSave(false, false)} 
                disabled={loading} 
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm"
              >
                <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Only (محفوظ کریں)'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleSave(true, false)} 
                  disabled={loading} 
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors text-xs border border-slate-200"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" /> Save & Print
                </button>
                <button 
                  onClick={() => handleSave(true, true)} 
                  disabled={loading} 
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors text-xs border border-slate-200"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-600" /> Save & PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showQuickCreateCustomer && (
        <QuickCreateModal
          type="account"
          accountRole="customer"
          onClose={() => setShowQuickCreateCustomer(false)}
          onSuccess={async (newId) => {
            await fetchData();
            if (newId > 0) {
              setCustomerId(newId);
              toast.success("نیا کسٹمر منتخب ہو گیا ہے، اب بل محفوظ کریں!");
            }
            setShowQuickCreateCustomer(false);
          }}
        />
      )}
    </div>
  );
};
