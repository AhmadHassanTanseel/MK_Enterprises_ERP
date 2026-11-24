import React, { useMemo, useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { 
  FileText, ShoppingCart, PlusCircle, Users, ArrowDownRight, ArrowUpRight,
  Tags, Bookmark, CornerDownLeft, CornerUpRight,
  MapPin, Activity, DollarSign, Package, TrendingUp, Users as UsersIcon, Box
} from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';

interface PeriodProfit {
  sales: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  fixed_liabilities: number;
  net_profit: number;
}

interface ProfitMetrics {
  today: PeriodProfit;
  week: PeriodProfit;
  month: PeriodProfit;
}

interface DashboardMetricsData {
  sales_today: number;
  sales_week: number;
  sales_month: number;
  purch_today: number;
  purch_week: number;
  purch_month: number;
  cash_today: number;
  cash_week: number;
  cash_month: number;
  cash_all_time: number;
  bank_today: number;
  bank_week: number;
  bank_month: number;
  bank_all_time: number;
  total_receivables: number;
  new_customers_month: number;
  active_customer_count: number;
}

export const Dashboard: React.FC = () => {
  const { accounts } = useAppContext();

  const [profitMetrics, setProfitMetrics] = useState<ProfitMetrics | null>(null);
  const [dbMetrics, setDbMetrics] = useState<DashboardMetricsData | null>(null);

  const fetchMetrics = () => {
    invoke<DashboardMetricsData>('get_dashboard_metrics')
      .then(setDbMetrics)
      .catch(err => console.error('Failed to load dashboard metrics', err));
    invoke<ProfitMetrics>('get_profit_metrics')
      .then(setProfitMetrics)
      .catch(err => console.error('Failed to load profit metrics', err));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const [hideCash, setHideCash] = useState<boolean>(() => {
    return localStorage.getItem('hide_dashboard_cash_flow') === 'true';
  });
  const [hideBank, setHideBank] = useState<boolean>(() => {
    return localStorage.getItem('hide_dashboard_bank_flow') === 'true';
  });
  const [hideProfit, setHideProfit] = useState<boolean>(() => {
    return localStorage.getItem('hide_dashboard_profit') === 'true';
  });

  const toggleHideCash = () => {
    setHideCash(prev => {
      const next = !prev;
      localStorage.setItem('hide_dashboard_cash_flow', String(next));
      return next;
    });
  };

  const toggleHideBank = () => {
    setHideBank(prev => {
      const next = !prev;
      localStorage.setItem('hide_dashboard_bank_flow', String(next));
      return next;
    });
  };

  const toggleHideProfit = () => {
    setHideProfit(prev => {
      const next = !prev;
      localStorage.setItem('hide_dashboard_profit', String(next));
      return next;
    });
  };

  const allHidden = hideCash && hideBank && hideProfit;
  const toggleHideAll = () => {
    const next = !allHidden;
    setHideCash(next);
    setHideBank(next);
    setHideProfit(next);
    localStorage.setItem('hide_dashboard_cash_flow', String(next));
    localStorage.setItem('hide_dashboard_bank_flow', String(next));
    localStorage.setItem('hide_dashboard_profit', String(next));
  };

  // The 8 specific shortcuts (removed Category)
  const quickNav = [
    { label: "Sales Invoice", icon: FileText, to: "/sales", color: "bg-blue-100 text-blue-700" },
    { label: "Purchase", icon: ShoppingCart, to: "/purchases", color: "bg-teal-100 text-teal-700" },
    { label: "Payables & Receivables", icon: UsersIcon, to: "/other-accounts?tab=payables_receivables", color: "bg-emerald-100 text-emerald-700" },
    { label: "New Product", icon: PlusCircle, to: "/product?tab=products&new=true", color: "bg-purple-100 text-purple-700" },
    { label: "Sales Return", icon: CornerDownLeft, to: "/sale-return", color: "bg-red-100 text-red-700" },
    { label: "Purchase Return", icon: CornerUpRight, to: "/purchase-return", color: "bg-indigo-100 text-indigo-700" },
    { label: "Stocks", icon: Box, to: "/inventory", color: "bg-slate-100 text-slate-700" },
    { label: "Expenses", icon: DollarSign, to: "/other-accounts?tab=expenses", color: "bg-rose-100 text-rose-700" },
    { label: "Staff Attendance", icon: UsersIcon, to: "/other-accounts?tab=workers", color: "bg-sky-100 text-sky-700" },
  ];

  const metrics = {
    salesToday: dbMetrics?.sales_today || 0,
    salesWeek: dbMetrics?.sales_week || 0,
    salesMonth: dbMetrics?.sales_month || 0,
    purchToday: dbMetrics?.purch_today || 0,
    purchWeek: dbMetrics?.purch_week || 0,
    purchMonth: dbMetrics?.purch_month || 0,
    cashToday: dbMetrics?.cash_today || 0,
    cashWeek: dbMetrics?.cash_week || 0,
    cashMonth: dbMetrics?.cash_month || 0,
    bankToday: dbMetrics?.bank_today || 0,
    bankWeek: dbMetrics?.bank_week || 0,
    bankMonth: dbMetrics?.bank_month || 0,
    cashAllTime: dbMetrics?.cash_all_time || 0,
    bankAllTime: dbMetrics?.bank_all_time || 0,
    activeCustomerCount: dbMetrics?.active_customer_count || 0,
    totalReceivables: dbMetrics?.total_receivables || 0,
    newCustomersMonth: dbMetrics?.new_customers_month || 0,
  };

  const formatRs = (val: number) => {
    return 'Rs. ' + Math.round(val || 0).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-base font-bold text-slate-800">Business Overview (کاروباری خلاصہ)</h2>
          <p className="text-[11px] text-slate-500">ہر کارڈ کا بیلنس چھپانے یا دیکھنے کے لیے اس کارڈ کے اوپر موجود آنکھ (Eye) کے نشان پر کلک کریں۔</p>
        </div>
      </div>
      
      {/* 5 Summary Sections - Auto-Adaptive, Uncompressed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Sales Summary */}
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 truncate">
              <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" /> Sales (Net)
            </h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">Today</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatRs(metrics.salesToday)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">This Week</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatRs(metrics.salesWeek)}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1">
              <span className="text-slate-600 font-semibold whitespace-nowrap">This Month</span>
              <span className="font-bold text-blue-700 tabular-nums">{formatRs(metrics.salesMonth)}</span>
            </div>
          </div>
        </div>

        {/* Purchases Summary */}
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 truncate">
              <ShoppingCart className="h-4 w-4 text-teal-600 shrink-0" /> Purchases (Net)
            </h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">Today</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatRs(metrics.purchToday)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">This Week</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatRs(metrics.purchWeek)}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1">
              <span className="text-slate-600 font-semibold whitespace-nowrap">This Month</span>
              <span className="font-bold text-teal-700 tabular-nums">{formatRs(metrics.purchMonth)}</span>
            </div>
          </div>
        </div>

        {/* Net Profit Summary */}
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 truncate" title="Daily Profit: (Sold Items Sale Price - Purchase Cost) - Daily Expenses">
              <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" /> Net Profit
            </h3>
            <button
              type="button"
              onClick={toggleHideProfit}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={hideProfit ? "Show Profit" : "Hide Profit"}
            >
              {hideProfit ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">Today</span>
              {hideProfit ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${(profitMetrics?.today.net_profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatRs(profitMetrics?.today.net_profit ?? 0)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">This Week</span>
              {hideProfit ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${(profitMetrics?.week.net_profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatRs(profitMetrics?.week.net_profit ?? 0)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1">
              <span className="text-slate-600 font-semibold whitespace-nowrap">This Month</span>
              {hideProfit ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${(profitMetrics?.month.net_profit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatRs(profitMetrics?.month.net_profit ?? 0)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customers Summary */}
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 truncate">
              <Users className="h-4 w-4 text-purple-600 shrink-0" /> Customers
            </h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">Active (30 days)</span>
              <span className="font-bold text-slate-800 tabular-nums">{metrics.activeCustomerCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">New This Month</span>
              <span className="font-bold text-slate-800 tabular-nums">{metrics.newCustomersMonth}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1">
              <span className="text-slate-600 font-semibold whitespace-nowrap">Receivables</span>
              <span className="font-bold text-purple-700 tabular-nums">{formatRs(metrics.totalReceivables)}</span>
            </div>
          </div>
        </div>

        {/* Cash Summary */}
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 truncate">
              <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" /> Cash Flow
            </h3>
            <button
              type="button"
              onClick={toggleHideCash}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={hideCash ? "Show Cash Flow" : "Hide Cash Flow"}
            >
              {hideCash ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mb-1.5 pb-1.5 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Total in Hand</span>
            {hideCash ? (
              <span className="text-xs font-black tracking-widest text-slate-400 font-mono">••••••••</span>
            ) : (
              <span className={`text-xs font-bold tabular-nums ${metrics.cashAllTime >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatRs(metrics.cashAllTime)}</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">Today</span>
              {hideCash ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.cashToday >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatRs(metrics.cashToday)}</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">This Week</span>
              {hideCash ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.cashWeek >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatRs(metrics.cashWeek)}</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1">
              <span className="text-slate-600 font-semibold whitespace-nowrap">This Month</span>
              {hideCash ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.cashMonth >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatRs(metrics.cashMonth)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bank Summary */}
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 truncate">
              <Activity className="h-4 w-4 text-blue-600 shrink-0" /> Bank Flow
            </h3>
            <button
              type="button"
              onClick={toggleHideBank}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={hideBank ? "Show Bank Flow" : "Hide Bank Flow"}
            >
              {hideBank ? <Eye className="h-3.5 w-3.5 text-blue-600" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mb-1.5 pb-1.5 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Total in Bank</span>
            {hideBank ? (
              <span className="text-xs font-black tracking-widest text-slate-400 font-mono">••••••••</span>
            ) : (
              <span className={`text-xs font-bold tabular-nums ${metrics.bankAllTime >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>{formatRs(metrics.bankAllTime)}</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">Today</span>
              {hideBank ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.bankToday >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatRs(metrics.bankToday)}</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">This Week</span>
              {hideBank ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.bankWeek >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatRs(metrics.bankWeek)}</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1">
              <span className="text-slate-600 font-semibold whitespace-nowrap">This Month</span>
              {hideBank ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.bankMonth >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>{formatRs(metrics.bankMonth)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 9 Quick Navigation Blocks - Balanced 3-column Grid (3 x 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {quickNav.map((nav, i) => (
          <NavLink 
            key={i} 
            to={nav.to}
            className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-start gap-3.5 group"
          >
            <div className={`p-2.5 rounded-xl ${nav.color} group-hover:scale-105 transition-transform duration-200 shadow-sm`}>
              <nav.icon className="h-5 w-5" />
            </div>
            <span className="font-semibold text-slate-800 text-sm">{nav.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};
