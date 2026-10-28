import React, { useEffect, useRef, useState } from 'react';
import { useGridNavigation } from '../../utils/useGridNavigation';
import { useAppContext, InvoiceLine } from '../../app/context/AppContext';
import { Plus, Trash2, Printer, Save, FileText } from 'lucide-react';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { printThermalReceipt } from '../../utils/receiptPrinter';
import toast from 'react-hot-toast';
import { EntitySelect } from '../../shared/components/EntitySelect';
import { BankAccountSelect } from '../../shared/components/BankAccountSelect';

export const PurchaseInvoicePanel: React.FC = () => {
  const { settings, products, categories, accounts, postInvoice } = useAppContext();
  
  const [accountId, setAccountId] = useState<number | null>(null);
  const [lines, setLines] = useState<(InvoiceLine & { id: string })[]>([
    { id: '1', product_id: 0, qty: 1, rate: 0, discount_pct: 0, amount: 0 }
  ]);
  const [amountPaidCash, setAmountPaidCash] = useState<number>(0);
  const [amountPaidBank, setAmountPaidBank] = useState<number>(0);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedBankId && accounts.length > 0) {
      const defaultBank = accounts.find(a => (a.account_type_id === 1 && a.id !== 1) || !!a.bank_name);
      if (defaultBank) {
        setSelectedBankId(defaultBank.id);
      }
    }
  }, [accounts, selectedBankId]);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplierRef, setSupplierRef] = useState<string>('');

  const supplierAccounts = accounts.filter(a => a.account_type_id === 4 || a.account_type_id === 1); // Suppliers & Cash

  const containerRef = useRef<HTMLDivElement>(null);
  useGridNavigation(containerRef, () => addLine(), () => handleSave(false, false));

  const addLine = () => {
    setLines([...lines, { id: Math.random().toString(), product_id: 0, qty: 1, rate: 0, discount_pct: 0, amount: 0 }]);
  };
  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
    if (field === 'product_id' && value) {
      const existingLineIndex = lines.findIndex(l => l.id !== id && l.product_id === value);
      if (existingLineIndex !== -1) {
        const existingLine = lines[existingLineIndex];
        const product = products.find(p => p.id === value);
        toast.error(`"${product?.name || 'Item'}" پہلے سے لائن نمبر ${existingLineIndex + 1} میں شامل ہے!`, { id: 'dup-prod' });
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
        const newLine = { ...l, [field]: value };
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
    const uniqueBrands = Array.from(new Set(products.map(p => p.name).filter(Boolean)));

  return (line.rate - line.discount_pct) * line.qty;
  };

  const totalGross = lines.reduce((sum, line) => sum + (line.qty * line.rate), 0);
  const totalDiscount = lines.reduce((sum, line) => sum + (line.discount_pct * line.qty), 0);
  const totalNet = totalGross - totalDiscount;
  const balance = totalNet - (amountPaidCash + amountPaidBank);

  
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (printAfter: boolean = false, isPDF: boolean = false) => {
    
    if (!accountId) { toast.error("Please select a supplier"); return; }
    if (lines.length === 0) { toast.error("Please add at least one line."); return; }
    for (const line of lines) {
      if (!line.product_id) { toast.error("Please select a valid product for all lines."); return; }
      if (line.qty <= 0) { toast.error("Quantity must be greater than 0 for all lines."); return; }
      if (line.rate < 0) { toast.error("Rate cannot be negative for all lines."); return; }
    }

    setIsSubmitting(true);
    try {
      const finalRefNo = supplierRef.trim() ? supplierRef.trim() : `PUR-${Date.now().toString().slice(-6)}`;
      await postInvoice({
        type: 'PURCHASE',
        ref_no: finalRefNo,
        account_id: accountId,
        date: invoiceDate,
        lines: lines as any,
        gross_amount: totalGross,
        discount_amount: totalDiscount,
        net_amount: totalNet,
        amount_paid_cash: amountPaidCash, 
        amount_paid_bank: amountPaidBank,
        bank_account_id: selectedBankId || null
      });
      toast.success(`Purchase Invoice saved successfully`);

      if (printAfter) {
        const supp = accounts.find(a => a.id === accountId);
        const suppName = supp ? supp.name : 'Supplier';
        const prevBal = supp ? (supp.current_balance ?? 0) : 0;
        const totalPaid = (amountPaidCash || 0) + (amountPaidBank || 0);
        const billBalance = totalNet - totalPaid;
        const netAccountBal = prevBal - billBalance;

        const chosenBank = accounts.find(a => a.id === selectedBankId);
        const bankName = chosenBank?.bank_name || settings.find(s => s.key === 'bank_name')?.value || '';
        const accountTitle = chosenBank?.account_title || chosenBank?.name || settings.find(s => s.key === 'bank_account_title')?.value || '';
        const accountNumber = chosenBank?.account_number || settings.find(s => s.key === 'bank_account_number')?.value || '';
        const paymentMethod = amountPaidBank > 0 ? 'Online' : 'Cash';

        if (isPDF) {
          generateInvoicePDF('PURCHASE', finalRefNo, invoiceDate, supp, lines as any, products, totalGross, totalDiscount, totalNet, totalPaid, paymentMethod, bankName, accountTitle, accountNumber, prevBal, netAccountBal);
        } else {
          printThermalReceipt({
            title: 'PURCHASE INVOICE',
            refNo: finalRefNo,
            date: invoiceDate,
            accountLabel: 'Supplier',
            accountName: suppName,
            address: supp?.address || '',
            phone: supp?.contact || '',
            lines: lines.map((l: any) => ({
              product: products.find(p => p.id === l.product_id)?.name || 'Unknown',
              qty: l.qty || 0,
              rate: l.rate || 0,
              total: (l.rate - (l.discount_pct || 0)) * l.qty
            })),
            totalGross: totalGross,
            totalDiscount: totalDiscount,
            totalNet: totalNet,
            amountReceived: totalPaid,
            balance: billBalance,
            previousBalance: prevBal,
            netAccountBalance: netAccountBal,
            paymentMethod,
            bankName,
            accountTitle,
            accountNumber,
            isSupplier: true
          });
        }
      }

      setLines([{ id: '1', product_id: 0, qty: 1, rate: 0, discount_pct: 0, amount: 0 }]);
      setAmountPaidCash(0);
      setAmountPaidBank(0);
      setSupplierRef('');
      setAccountId(null);
    } catch (err) { toast.error(`Could not save Purchase Invoice: ${err instanceof Error ? err.message : String(err)}`); } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full gap-4 pb-12" ref={containerRef}>
      
      

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Purchase Invoice (GRN)</h2>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
            <EntitySelect autoFocus type="account" accountRole="supplier" value={accountId || 0} onChange={setAccountId} filter={a => a.is_supplier} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-md p-2" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Ref No.</label>
            <input type="text" className="w-full border border-slate-300 rounded-md p-2" placeholder="e.g. INV-992 (Auto if empty)" value={supplierRef} onChange={e => setSupplierRef(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Grid Panel */}
      <div className="min-w-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[380px] min-h-[160px]">
          <table className="w-full min-w-[750px] text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200 shadow-sm z-10">
              <tr>
                <th className="px-2 py-3 font-medium w-8 text-center">#</th>
                <th className="px-2 py-3 font-medium w-1/5">Product (Brand)</th>
                <th className="px-2 py-3 font-medium text-right w-20">Qty (In)</th>
                <th className="px-2 py-3 font-medium text-right w-24">Pur. Rate</th>
                <th className="px-2 py-3 font-medium text-right w-24">Sale Rate</th>
                <th className="px-2 py-3 font-medium text-right w-24">Gross</th>
                <th className="px-2 py-3 font-medium text-right w-20">Disc/Unit</th>
                <th className="px-2 py-3 font-medium text-right w-28">Net Total</th>
                <th className="px-2 py-3 font-medium w-12 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => (
                <tr key={line.id} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 text-center text-slate-400">{index + 1}</td>
                  <td className="px-2 py-1.5">
                    <EntitySelect 
                      type="product" 
                      value={line.product_id || 0} 
                      onChange={v => updateLine(line.id, 'product_id', v || 0)} 
                      className="w-full" 
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input 
                      id={`line-qty-${line.id}`}
                      type="number" 
                      min="1" 
                      className="w-full min-w-[70px] text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" 
                      value={line.qty || ''} 
                      onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} 
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" min="0" className="w-full min-w-[80px] text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" value={line.rate || ''} onChange={e => updateLine(line.id, 'rate', Number(e.target.value))} />
                    {line.product_id ? (
                      <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Last: Rs. {products.find(p => p.id === line.product_id)?.purchase_price || 0}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" min="0" className="w-full min-w-[80px] text-right border border-emerald-300 bg-emerald-50 rounded p-1 focus:ring-2 outline-none" value={line.sale_rate || ''} onChange={e => updateLine(line.id, 'sale_rate', Number(e.target.value))} />
                    {line.product_id ? (
                      <div className="text-[10px] text-emerald-600 mt-1 whitespace-nowrap">Last: Rs. {products.find(p => p.id === line.product_id)?.sale_price || 0}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium text-slate-700">{((line.qty || 0) * (line.rate || 0)).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" className="w-full min-w-[80px] text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" value={line.discount_pct || ''} onChange={e => updateLine(line.id, 'discount_pct', Number(e.target.value))} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-slate-800 bg-slate-50/50">{calculateLineTotal(line).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => setLines(lines.filter(l => l.id !== line.id))} className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors" disabled={lines.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
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
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Cash Paid Now:</label>
                  <input 
                    type="number" 
                    className="w-full text-right border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold p-1.5 rounded-md text-xs outline-none focus:ring-1 focus:ring-emerald-500" 
                    value={amountPaidCash || ''}
                    onChange={e => setAmountPaidCash(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Bank Paid Now:</label>
                  <input 
                    type="number" 
                    className="w-full text-right border border-blue-300 bg-blue-50 text-blue-800 font-bold p-1.5 rounded-md text-xs outline-none focus:ring-1 focus:ring-blue-500" 
                    value={amountPaidBank || ''}
                    onChange={e => setAmountPaidBank(Number(e.target.value))}
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
                <span className="text-slate-600 font-medium">Balance Payable:</span>
                <span className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Rs. {balance.toLocaleString()}</span>
              </div>
            </div>

            {/* 3. Action Buttons - Prominent & Always in Sight */}
            <div className="flex flex-col justify-between gap-2 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => handleSave(false, false)} 
                disabled={isSubmitting} 
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm"
              >
                <Save className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Save Only (محفوظ کریں)'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleSave(true, false)} 
                  disabled={isSubmitting} 
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors text-xs border border-slate-200"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" /> Save & Print
                </button>
                <button 
                  onClick={() => handleSave(true, true)} 
                  disabled={isSubmitting} 
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors text-xs border border-slate-200"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-600" /> Save & PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PurchaseInvoicePanel;
