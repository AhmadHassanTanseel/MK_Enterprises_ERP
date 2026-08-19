import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Filter, Printer, FileText } from 'lucide-react';
import { generateVoucherPDF } from '../../utils/pdfGenerator';
import toast from 'react-hot-toast';

interface JVHeader {
  ref_no: string | null;
  trans_date: string;
  created_at: string | null;
  total_amount: number;
  line_count: number;
}

export const JournalVoucherRegisterPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<JVHeader[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const rows: JVHeader[] = await invoke('get_journal_vouchers');
      setHistory(rows);
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = history.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (row.ref_no?.toLowerCase().includes(term) ?? false) ||
      row.trans_date.includes(term)
    );
  });

  return (
    <div className="flex flex-col h-full bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800">Journal Voucher Register</h3>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ref no or date..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50">
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading register...</div>
      ) : filteredHistory.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
          <FileText className="h-12 w-12 text-slate-200" />
          <p>No journal vouchers recorded yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Ref No</th>
                <th className="px-4 py-3 text-center">Lines</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>{row.trans_date}</div>
                    {row.created_at && <div className="text-xs text-slate-400">Created: {row.created_at}</div>}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.ref_no || '—'}</td>
                  <td className="px-4 py-3 text-center">{row.line_count}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">Rs. {row.total_amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => generateVoucherPDF('JOURNAL_VOUCHER', row.ref_no || `JV-${i}`, row.trans_date, 'Multiple Accounts', row.total_amount, 'Journal Voucher')}
                      className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"
                      title="Print Voucher"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
