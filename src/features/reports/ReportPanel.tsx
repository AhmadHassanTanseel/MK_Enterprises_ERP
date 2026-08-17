import React, { useState } from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { FileText, Printer, Download, Filter } from 'lucide-react';
import { generateReportPDF } from '../../utils/pdfGenerator';
import { generateReportExcel } from '../../utils/excelGenerator';

export const ReportPanel: React.FC = () => {
  const { ledgerEntries, accounts } = useAppContext();
  
  const [reportType, setReportType] = useState('LEDGER');
  const [fromDate, setFromDate] = useState('2024-01-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<number | null>(null);

  // Simplified Ledger Report Logic
  const filteredEntries = ledgerEntries.filter(e => 
    e.date >= fromDate && e.date <= toDate && (!accountId || e.account_id === accountId)
  );

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-500" /> Unified Report Viewer
        </h2>
        
        <div className="grid grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
            <select className="w-full border border-slate-300 rounded-md p-2" value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="LEDGER">Account Ledger</option>
              <option value="CASHBOOK">Cash Book</option>
              <option value="TRIAL">Trial Balance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-md p-2" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-md p-2" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Filter</label>
            <select className="w-full border border-slate-300 rounded-md p-2" value={accountId || ''} onChange={e => setAccountId(Number(e.target.value))}>
              <option value="">-- All Accounts --</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            {reportType === 'LEDGER' ? 'General Ledger Report' : reportType === 'CASHBOOK' ? 'Cash Book' : 'Trial Balance'}
          </h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button 
              onClick={() => generateReportExcel(reportType, filteredEntries, accounts, fromDate, toDate)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Download className="h-4 w-4" /> Export Excel
            </button>
            <button 
              onClick={() => generateReportPDF(reportType, filteredEntries, accounts, fromDate, toDate)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" /> Export PDF
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 border-b">Date</th>
                <th className="px-4 py-2 border-b">Account</th>
                <th className="px-4 py-2 border-b w-1/3">Description</th>
                <th className="px-4 py-2 border-b text-right">Debit</th>
                <th className="px-4 py-2 border-b text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(e => {
                const acc = accounts.find(a => a.id === e.account_id);
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 border-b">{e.date}</td>
                    <td className="px-4 py-2 border-b font-medium">{acc?.name}</td>
                    <td className="px-4 py-2 border-b">{e.description}</td>
                    <td className="px-4 py-2 border-b text-right">{e.dr_amount > 0 ? e.dr_amount.toLocaleString() : '-'}</td>
                    <td className="px-4 py-2 border-b text-right">{e.cr_amount > 0 ? e.cr_amount.toLocaleString() : '-'}</td>
                  </tr>
                );
              })}
              {filteredEntries.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No records found for the selected criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
