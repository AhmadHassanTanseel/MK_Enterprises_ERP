import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../app/context/AppContext';
import { Plus, Search, Filter, Paperclip, CreditCard, Banknote, Building2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface CashHistoryRow {
  id: number;
  trans_type: string;
  account_id: number;
  account_name: string;
  amount: number;
  trans_date: string;
  description: string | null;
}

export const CashReceivedPanel: React.FC = () => {
  const { accounts, postPayment } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddMode, setIsAddMode] = useState(false);
  const [history, setHistory] = useState<CashHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [accountId, setAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerAccounts = accounts.filter(a => a.account_type_id === 1 || a.account_type_id === 3 || a.account_type_id === 4);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const rows: CashHistoryRow[] = await invoke('get_cash_transaction_history', { transType: 'RECEIVE' });
      setHistory(rows);
    } catch (e) {
      console.error('Failed to load receipt history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = history.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.account_name.toLowerCase().includes(term) ||
      (row.description?.toLowerCase().includes(term) ?? false) ||
      row.trans_date.includes(term)
    );
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);

    if (!accountId) { setError("Please select an account"); return; }
    if (amount <= 0) { setError("Amount must be greater than zero"); return; }

    setIsSubmitting(true);
    try {
      await postPayment(
        new Date().toISOString().split('T')[0],
        accountId,
        'RECEIVE',
        amount,
        `${paymentMethod} - ${description}`
      );
      setSuccess(`Receipt of Rs. ${amount} saved successfully!`);
      setIsAddMode(false);
      setAmount(0);
      setDescription('');
      await loadHistory();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      <div className={`w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col ${isAddMode ? 'block' : 'hidden md:flex'}`}>
        <h3 className="text-lg font-bold text-slate-800 mb-6">{isAddMode ? 'New Receipt' : 'Receive Payment'}</h3>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
        {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-md border border-emerald-200">{success}</div>}
        <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account (Customer) *</label>
            <select
              required
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={accountId || ''}
              onChange={e => setAccountId(Number(e.target.value))}
            >
              <option value="">-- Select Account --</option>
              {customerAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} (Bal: {acc.current_balance})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setPaymentMethod('Cash')} className={`flex flex-col items-center justify-center p-3 rounded-lg border ${paymentMethod === 'Cash' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Banknote className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Cash</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod('Bank')} className={`flex flex-col items-center justify-center p-3 rounded-lg border ${paymentMethod === 'Bank' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Building2 className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Bank</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod('Cheque')} className={`flex flex-col items-center justify-center p-3 rounded-lg border ${paymentMethod === 'Cheque' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <CreditCard className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Cheque</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
            <input
              type="number" required min="1"
              className="w-full text-xl font-bold border-b-2 border-slate-300 bg-slate-50 p-2 focus:border-blue-500 outline-none rounded-t"
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="w-full border border-slate-300 rounded-md p-2 h-20 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Payment reference..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Attachment (ERP Feature)</label>
            <button type="button" onClick={async () => {
              try {
                const file = await open({
                  multiple: false,
                  filters: [{ name: 'Images/PDF', extensions: ['png', 'jpeg', 'jpg', 'pdf'] }]
                });
                if (file) alert(`File selected: ${file}`);
              } catch (e) {
                console.error(e);
              }
            }} className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-400 rounded-md p-4 text-slate-500 hover:bg-slate-50 hover:border-slate-500 transition-colors">
              <Paperclip className="h-5 w-5" />
              <span className="text-sm">Click to attach file or image</span>
            </button>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white font-medium py-3 rounded-md hover:bg-emerald-700 transition-colors mt-4 shadow-sm hover:shadow-md disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Save Receipt'}
          </button>
        </form>
      </div>

      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Receipts History</h3>
          <button onClick={() => setIsAddMode(true)} className="md:hidden flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm">
            <Plus className="h-4 w-4" /> New
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by account or description..."
              className="w-full border border-slate-300 rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50">
            <Filter className="h-5 w-5" />
          </button>
        </div>

        {loadingHistory ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Loading receipts...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
            <Banknote className="h-12 w-12 text-slate-200" />
            <p>No receipts recorded yet.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{row.trans_date.split(' ')[0]}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.account_name}</td>
                    <td className="px-4 py-3">{row.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{row.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
