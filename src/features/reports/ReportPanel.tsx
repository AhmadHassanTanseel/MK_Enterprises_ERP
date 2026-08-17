import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../app/context/AppContext';
import { FileText, Printer, Download, RefreshCw } from 'lucide-react';
import { generateReportPDF } from '../../utils/pdfGenerator';
import { generateReportExcel } from '../../utils/excelGenerator';

interface ReportTotal {
  label: string;
  value: number;
}

interface ReportResult {
  title: string;
  headers: string[];
  rows: string[][];
  totals: ReportTotal[];
}

const BACKEND_REPORT_TYPES = ['SALES', 'PURCHASE', 'STOCK', 'PROFIT'];

export const ReportPanel: React.FC = () => {
  const { ledgerEntries, accounts } = useAppContext();

  const [reportType, setReportType] = useState('LEDGER');
  const [fromDate, setFromDate] = useState('2024-01-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<number | null>(null);

  const [backendReport, setBackendReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBackendReport = BACKEND_REPORT_TYPES.includes(reportType);

  const loadBackendReport = useCallback(async () => {
    if (!isBackendReport) return;
    try {
      setLoading(true);
      setError(null);
      const result: ReportResult = await invoke('generate_report', {
        reportName: reportType,
        filters: {
          fromDate: fromDate || null,
          toDate: toDate || null,
          categoryId: null,
          productId: null,
          accountId: accountId || null,
          areaId: null,
          salesmanId: null,
        },
      });
      setBackendReport(result);
    } catch (e: any) {
      setError(e.toString());
      setBackendReport(null);
    } finally {
      setLoading(false);
    }
  }, [reportType, fromDate, toDate, accountId, isBackendReport]);

  useEffect(() => {
    if (isBackendReport) {
      loadBackendReport();
    } else {
      setBackendReport(null);
      setError(null);
    }
  }, [isBackendReport, loadBackendReport]);

  const filteredEntries = ledgerEntries.filter(e =>
    e.date >= fromDate && e.date <= toDate && (!accountId || e.account_id === accountId)
  );

  const reportTitle = isBackendReport
    ? backendReport?.title ?? reportType
    : reportType === 'LEDGER'
      ? 'General Ledger Report'
      : reportType === 'CASHBOOK'
        ? 'Cash Book'
        : 'Trial Balance';

  return (
    <div className="flex flex-col h-full gap-6">
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
              <option value="SALES">Sales Report</option>
              <option value="PURCHASE">Purchase Report</option>
              <option value="STOCK">Stock Report</option>
              <option value="PROFIT">Profit Report</option>
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
            <select className="w-full border border-slate-300 rounded-md p-2" value={accountId || ''} onChange={e => setAccountId(Number(e.target.value) || null)}>
              <option value="">-- All Accounts --</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">{reportTitle}</h3>
          <div className="flex gap-2">
            {isBackendReport && (
              <button
                onClick={loadBackendReport}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            )}
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
              <Printer className="h-4 w-4" /> Print
            </button>
            {!isBackendReport && (
              <>
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
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>
        )}

        {loading && isBackendReport && (
          <div className="flex-1 flex items-center justify-center text-slate-400">Generating report...</div>
        )}

        {!loading && isBackendReport && backendReport && (
          <>
            {backendReport.totals.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4">
                {backendReport.totals.map(t => (
                  <div key={t.label} className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2">
                    <p className="text-xs text-indigo-600">{t.label}</p>
                    <p className="text-lg font-bold text-indigo-900">{t.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    {backendReport.headers.map(h => (
                      <th key={h} className="px-4 py-2 border-b">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {backendReport.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-2 border-b">{cell}</td>
                      ))}
                    </tr>
                  ))}
                  {backendReport.rows.length === 0 && (
                    <tr><td colSpan={backendReport.headers.length} className="text-center py-8 text-slate-400">No records found for the selected criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!isBackendReport && (
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
        )}
      </div>
    </div>
  );
};
