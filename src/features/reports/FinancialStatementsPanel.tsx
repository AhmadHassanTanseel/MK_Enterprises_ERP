import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DollarSign, TrendingUp, TrendingDown, Building, Wallet, CreditCard, Printer, Calculator, X, ChevronRight, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateFinancialStatementPDF } from '../../utils/pdfGenerator';

interface FinancialBreakdownItem {
  name: string;
  category: string;
  details?: string | null;
  amount: number;
}

interface FinancialBreakdownResult {
  metric: string;
  title: string;
  formula: string;
  items: FinancialBreakdownItem[];
  total: number;
}

interface FinancialSummary {
  total_revenue: number;
  cogs?: number;
  gross_profit?: number;
  operating_expenses?: number;
  total_expenses: number;
  net_profit: number;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

export const FinancialStatementsPanel: React.FC = () => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [breakdownMetric, setBreakdownMetric] = useState<string | null>(null);
  const [breakdownData, setBreakdownData] = useState<FinancialBreakdownResult | null>(null);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);

  const openBreakdown = async (metric: string) => {
    setBreakdownMetric(metric);
    setIsBreakdownLoading(true);
    try {
      const data: FinancialBreakdownResult = await invoke('get_financial_breakdown', {
        metric,
        startDate: startDate ? startDate : null,
        endDate: endDate ? endDate : null
      });
      setBreakdownData(data);
    } catch (err: any) {
      toast.error('Failed to load calculation breakdown: ' + err);
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async (overrideStart?: string, overrideEnd?: string) => {
    const sDate = overrideStart !== undefined ? overrideStart : startDate;
    const eDate = overrideEnd !== undefined ? overrideEnd : endDate;
    try {
      setFiltering(true);
      const data: FinancialSummary = await invoke('get_financial_summary', {
        startDate: sDate ? sDate : null,
        endDate: eDate ? eDate : null
      });
      setSummary(data);
    } catch (err) {
      toast.error('Failed to load financial summary');
      console.error(err);
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    loadSummary('', '');
  };

  if (loading && !summary) {
    return <div className="p-6 flex justify-center text-slate-500 font-medium">Loading financial statements...</div>;
  }

  if (!summary) {
    return <div className="p-6 flex justify-center text-red-500">Failed to load data.</div>;
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-slate-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Financial Statements</h1>
          <p className="text-slate-500 mt-1">Profit & Loss and Balance Sheet.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex-wrap">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase">From Date</label>
            <input 
              type="date" 
              className="outline-none border border-slate-200 rounded px-2 py-1 bg-slate-50 font-medium text-slate-700 text-xs focus:ring-1 focus:ring-indigo-500"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase">To Date</label>
            <input 
              type="date" 
              className="outline-none border border-slate-200 rounded px-2 py-1 bg-slate-50 font-medium text-slate-700 text-xs focus:ring-1 focus:ring-indigo-500"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <button 
            onClick={() => loadSummary()}
            disabled={filtering}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-xs transition-colors shadow-xs disabled:opacity-50"
          >
            {filtering ? 'Filtering...' : 'Apply Filter'}
          </button>
          {(startDate || endDate) && (
            <button 
              onClick={handleResetFilter}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium text-xs transition-colors"
            >
              Reset
            </button>
          )}
          <button 
            onClick={() => summary && generateFinancialStatementPDF(summary, startDate, endDate)}
            className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-medium flex items-center gap-2 text-xs transition-colors"
          >
            <Printer size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Income Statement (P&L) Section */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h2 className="text-xl font-bold text-slate-800">Income Statement (Profit & Loss)</h2>
        <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
          💡 Click any card to see full calculation & math
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div 
          onClick={() => openBreakdown('REVENUE')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
          title="Click to view Revenue calculation"
        >
          <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 mr-3 shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">Total Revenue (Sales)</p>
            <p className="text-lg font-bold text-emerald-600 truncate">{formatCurrency(summary.total_revenue)}</p>
            <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5 group-hover:underline">
              تفصیل دیکھیں &rarr;
            </span>
          </div>
        </div>

        {/* COGS (Purchase Cost) */}
        <div 
          onClick={() => openBreakdown('COGS')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
          title="Click to view COGS calculation"
        >
          <div className="p-3 rounded-full bg-amber-100 text-amber-600 mr-3 shrink-0 group-hover:scale-105 transition-transform">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">Cost of Goods (Cost)</p>
            <p className="text-lg font-bold text-amber-600 truncate">{formatCurrency(summary.cogs ?? 0)}</p>
            <span className="text-[10px] text-amber-700 font-medium flex items-center gap-0.5 group-hover:underline">
              تفصیل دیکھیں &rarr;
            </span>
          </div>
        </div>

        {/* Gross Profit */}
        <div 
          onClick={() => openBreakdown('GROSS_PROFIT')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
          title="Click to view Gross Margin calculation"
        >
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-3 shrink-0 group-hover:scale-105 transition-transform">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">Gross Profit (Margin)</p>
            <p className="text-lg font-bold text-blue-700 truncate">{formatCurrency(summary.gross_profit ?? (summary.total_revenue - (summary.cogs ?? 0)))}</p>
            <span className="text-[10px] text-blue-700 font-medium flex items-center gap-0.5 group-hover:underline">
              تفصیل دیکھیں &rarr;
            </span>
          </div>
        </div>

        {/* Operating Expenses */}
        <div 
          onClick={() => openBreakdown('EXPENSES')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center cursor-pointer hover:border-rose-400 hover:shadow-md transition-all group"
          title="Click to view Operating Expenses breakdown"
        >
          <div className="p-3 rounded-full bg-rose-100 text-rose-600 mr-3 shrink-0 group-hover:scale-105 transition-transform">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">Operating Expenses</p>
            <p className="text-lg font-bold text-rose-600 truncate">{formatCurrency(summary.operating_expenses ?? summary.total_expenses)}</p>
            <span className="text-[10px] text-rose-700 font-medium flex items-center gap-0.5 group-hover:underline">
              تفصیل دیکھیں &rarr;
            </span>
          </div>
        </div>
        
        {/* Net Profit */}
        <div 
          onClick={() => openBreakdown('NET_PROFIT')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center relative overflow-hidden cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group"
          title="Click to view Net Profit calculation"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-10"></div>
          <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-3 z-10 shrink-0 group-hover:scale-105 transition-transform">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="z-10 min-w-0 flex-1">
            <p className="text-xs font-semibold text-indigo-600/80 truncate">Net Profit</p>
            <p className={`text-lg font-bold truncate ${summary.net_profit >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
              {formatCurrency(summary.net_profit)}
            </p>
            <span className="text-[10px] text-indigo-700 font-medium flex items-center gap-0.5 group-hover:underline">
              تفصیل دیکھیں &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Balance Sheet Section */}
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 mt-8">Balance Sheet</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets */}
        <div 
          onClick={() => openBreakdown('ASSETS')}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group"
          title="Click to view Total Assets itemized breakdown"
        >
          <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <Building className="h-5 w-5 text-slate-500" /> Total Assets
            </h3>
            <span className="text-xs text-indigo-600 font-semibold group-hover:underline">
              تفصیل دیکھیں (Breakdown) &rarr;
            </span>
          </div>
          <div className="p-6 flex flex-col justify-center items-center h-32">
            <p className="text-4xl font-extrabold text-slate-800">{formatCurrency(summary.total_assets)}</p>
            <p className="text-sm text-slate-500 mt-2">Cash in Hand, Bank Accounts, Receivables, Stock Valuation, Assets</p>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-slate-500" /> Liabilities & Equity
              </h3>
              <span className="text-xs text-indigo-600 font-semibold">
                Click box below for breakdown
              </span>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div 
                onClick={() => openBreakdown('LIABILITIES')}
                className="p-3 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 cursor-pointer transition-all group"
                title="Click to view Liabilities breakdown"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-bold text-slate-700">Liabilities (واجبات)</p>
                  <span className="text-[10px] text-amber-700 font-semibold group-hover:underline">&rarr;</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.total_liabilities)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Supplier Payables & Fixed Liabilities</p>
              </div>

              <div 
                onClick={() => openBreakdown('EQUITY')}
                className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all group"
                title="Click to view Equity breakdown"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-bold text-slate-700">Equity (سرمایہ)</p>
                  <span className="text-[10px] text-blue-700 font-semibold group-hover:underline">&rarr;</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_equity)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Capital - Drawings + Net Profit</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Total (L + E)</span>
            <span className="font-bold text-slate-800">{formatCurrency(summary.total_liabilities + summary.total_equity)}</span>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-6">
        <p className="text-xs text-slate-400">
          * Mathematically: Assets = Liabilities + Equity. If they do not match exactly, double check manual journal voucher entries.
        </p>
      </div>


      {/* FINANCIAL CALCULATION BREAKDOWN MODAL */}
      {breakdownMetric && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-wide flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-indigo-400" />
                  {breakdownData?.title || 'Calculation Breakdown'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">مکمل ریاضیاتی فارمولا اور اکاؤنٹس کی فہرست</p>
              </div>
              <button 
                onClick={() => { setBreakdownMetric(null); setBreakdownData(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {isBreakdownLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-semibold">Calculating breakdown numbers...</p>
                </div>
              ) : breakdownData ? (
                <>
                  {/* Formula Box */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" /> Mathematical Calculation Formula (حساب کا فارمولا):
                    </div>
                    <div className="font-mono text-xs font-bold text-indigo-950 bg-white/80 p-2.5 rounded-lg border border-indigo-100 leading-relaxed">
                      {breakdownData.formula}
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <span>Item / Account Name</span>
                      <span>Amount (رقم)</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {breakdownData.items.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">No records found for this period.</div>
                      ) : (
                        breakdownData.items.map((item, idx) => (
                          <div key={idx} className="px-4 py-2.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div>
                              <div className="text-xs font-bold text-slate-800">{item.name}</div>
                              <div className="text-[10px] text-slate-500 flex gap-2">
                                <span className="text-indigo-600 font-semibold">{item.category}</span>
                                {item.details && <span>• {item.details}</span>}
                              </div>
                            </div>
                            <div className={`text-xs font-bold tabular-nums ${item.amount < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                              {formatCurrency(item.amount)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="bg-slate-50 px-4 py-3 border-t-2 border-slate-300 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Calculated Total (کل میزان):</span>
                      <span className="text-sm font-black tabular-nums text-indigo-700">
                        {formatCurrency(breakdownData.total)}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => { setBreakdownMetric(null); setBreakdownData(null); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors"
              >
                Close (بند کریں)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

