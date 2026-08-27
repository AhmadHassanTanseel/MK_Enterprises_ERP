import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Filter, History, Eye, Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface SalesHistoryRow {
  id: number;
  invoice_no: string;
  invoice_type: string;
  date: string;
  account_name: string;
  mobile: string;
  net_amount: number;
  t_amount: number;
  discount: number;
  status: string;
}

export const SalesHistoryPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [salesHistory, setSalesHistory] = useState<SalesHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  

  const fetchHistory = async () => {
    setLoading(true);
    
    try {
      const data: SalesHistoryRow[] = await invoke('get_sales_history');
      setSalesHistory(data);
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = salesHistory.filter(h => 
    h.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="h-6 w-6 text-blue-500" /> Sales History
          </h2>
          <p className="text-sm text-slate-500 mt-1">Review past sales, check statuses, and reprint invoices</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search invoice or customer..." 
              className="w-full border border-slate-300 rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchHistory} disabled={loading} className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <button className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium text-right">Gross Amt</th>
                <th className="px-4 py-3 font-medium text-right">Discount</th>
                <th className="px-4 py-3 font-medium text-right">Net Total</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map(inv => {
                const isPaid = inv.status === 'PAID';
                const isPartial = inv.status === 'PARTIAL';
                
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{inv.date.split(' ')[0]}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {inv.invoice_no}
                      {inv.invoice_type === 'SALE_RETURN' && <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded ml-2 font-normal">RETURN</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {inv.account_name}
                      {inv.mobile && <div className="text-xs text-slate-400 font-normal">{inv.mobile}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">{inv.t_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-rose-500">{inv.discount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{inv.net_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      {isPaid ? (
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded border border-emerald-200 font-medium">Paid</span>
                      ) : isPartial ? (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded border border-amber-200 font-medium">Partial</span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 text-xs px-2 py-1 rounded border border-rose-200 font-medium">{inv.status || 'Unpaid'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      <button className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors">
                        <Printer className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredHistory.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No sales history found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Loading sales history...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
