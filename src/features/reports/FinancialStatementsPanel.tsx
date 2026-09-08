import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DollarSign, TrendingUp, TrendingDown, Building, Wallet, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface FinancialSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

export const FinancialStatementsPanel: React.FC = () => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data: FinancialSummary = await invoke('get_financial_summary');
      setSummary(data);
    } catch (err) {
      toast.error('Failed to load financial summary');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center text-slate-500">Loading financial statements...</div>;
  }

  if (!summary) {
    return <div className="p-6 flex justify-center text-red-500">Failed to load data.</div>;
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-slate-50">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Financial Statements</h1>
        <p className="text-slate-500 mt-1">Real-time Profit & Loss and Balance Sheet.</p>
      </div>

      {/* Income Statement (P&L) Section */}
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2">Income Statement (Profit & Loss)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center">
          <div className="p-4 rounded-full bg-emerald-100 text-emerald-600 mr-4">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.total_revenue)}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center">
          <div className="p-4 rounded-full bg-red-100 text-red-600 mr-4">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_expenses)}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-10"></div>
          <div className="p-4 rounded-full bg-indigo-100 text-indigo-600 mr-4 z-10">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="z-10">
            <p className="text-sm font-medium text-indigo-600/80">Net Profit</p>
            <p className={`text-3xl font-bold ${summary.net_profit >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
              {formatCurrency(summary.net_profit)}
            </p>
          </div>
        </div>
      </div>

      {/* Balance Sheet Section */}
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 mt-8">Balance Sheet</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <Building className="h-5 w-5 text-slate-500" /> Total Assets
            </h3>
          </div>
          <div className="p-6 flex flex-col justify-center items-center h-32">
            <p className="text-4xl font-extrabold text-slate-800">{formatCurrency(summary.total_assets)}</p>
            <p className="text-sm text-slate-500 mt-2">Cash, Bank, Receivables, Inventory</p>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-slate-500" /> Liabilities & Equity
              </h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1">
                  Liabilities
                </p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.total_liabilities)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1">
                  Equity (Incl. Net Profit)
                </p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_equity)}</p>
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

    </div>
  );
};
