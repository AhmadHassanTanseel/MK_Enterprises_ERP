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

export const Dashboard: React.FC = () => {
  const { invoices, accounts, ledgerEntries } = useAppContext();

  const [profitMetrics, setProfitMetrics] = useState<ProfitMetrics | null>(null);

  useEffect(() => {
    invoke<ProfitMetrics>('get_profit_metrics')
      .then(setProfitMetrics)
      .catch(err => console.error('Failed to load profit metrics', err));
  }, [invoices, ledgerEntries]);

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

  const todayStr = new Date().toISOString().split('T')[0];
  
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(new Date().getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const metrics = useMemo(() => {
    let salesToday = 0, salesWeek = 0, salesMonth = 0;
    let purchToday = 0, purchWeek = 0, purchMonth = 0;

    let cashToday = 0, cashWeek = 0, cashMonth = 0;
    let bankToday = 0, bankWeek = 0, bankMonth = 0;
    let cashAllTime = 0, bankAllTime = 0;

    const activeCustomers = new Set<number>();

    invoices.forEach(inv => {
      const invDate = inv.date.split(' ')[0];
      const isToday = invDate === todayStr;
      const isWeek = invDate >= startOfWeekStr && invDate <= todayStr;
      const isMonth = invDate >= startOfMonthStr && invDate <= todayStr;
      const isLast30 = invDate >= thirtyDaysAgoStr;

      if (inv.type === 'SALE' || inv.type === 'SALE_RETURN') {
        const amt = inv.type === 'SALE' ? inv.net_amount : -inv.net_amount;
        if (isToday) salesToday += amt;
        if (isWeek) salesWeek += amt;
        if (isMonth) salesMonth += amt;
        
        if (inv.type === 'SALE' && isLast30) {
          activeCustomers.add(inv.account_id);
        }
      }

      if (inv.type === 'PURCHASE' || inv.type === 'PURCHASE_RETURN') {
        const amt = inv.type === 'PURCHASE' ? inv.net_amount : -inv.net_amount;
        if (isToday) purchToday += amt;
        if (isWeek) purchWeek += amt;
        if (isMonth) purchMonth += amt;
      }
    });

    let totalReceivables = 0;
    let newCustomersMonth = 0;
    
    // Some accounts might just be marked Customer by account_type_id=2 in legacy
    const customers = accounts.filter(a => a.is_customer || a.account_type_id === 2);
    
    customers.forEach(acc => {
      totalReceivables += acc.current_balance;
      const createdAtDate = acc.created_at?.split(' ')[0];
      if (createdAtDate && createdAtDate >= startOfMonthStr && createdAtDate <= todayStr) {
        newCustomersMonth++;
      }
    });
    
    // Ensure active customers are actually marked as customer accounts
    const activeCustomerCount = Array.from(activeCustomers).filter(id => customers.some(c => c.id === id)).length;

    ledgerEntries.forEach(entry => {
      const entryDate = entry.date.split(' ')[0];
      const isToday = entryDate === todayStr;
      const isWeek = entryDate >= startOfWeekStr && entryDate <= todayStr;
      const isMonth = entryDate >= startOfMonthStr && entryDate <= todayStr;
      
      const net = entry.dr_amount - entry.cr_amount;
      
      const bankAccountIds = new Set(
        accounts.filter(a => (a.account_type_id === 1 && a.id !== 1) || !!a.bank_name).map(a => a.id)
      );

      if (entry.account_id === 1) {
        cashAllTime += net;
        if (isToday) cashToday += net;
        if (isWeek) cashWeek += net;
        if (isMonth) cashMonth += net;
      } else if (bankAccountIds.has(entry.account_id) || entry.account_id === 6) {
        bankAllTime += net;
        if (isToday) bankToday += net;
        if (isWeek) bankWeek += net;
        if (isMonth) bankMonth += net;
      }
    });

    return {
      salesToday, salesWeek, salesMonth,
      purchToday, purchWeek, purchMonth,
      cashToday, cashWeek, cashMonth,
      bankToday, bankWeek, bankMonth,
      cashAllTime, bankAllTime,
      activeCustomerCount, totalReceivables, newCustomersMonth
    };
  }, [invoices, accounts, ledgerEntries, todayStr, startOfWeekStr, startOfMonthStr, thirtyDaysAgoStr]);

  const formatRs = (val: number) => {
    return 'Rs. ' + Math.round(val || 0).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Header bar with Hide/Show Cash & Bank Flow button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <h2 className="text-base font-bold text-slate-800">Business Overview</h2>
        <button
          type="button"
          onClick={toggleHideAll}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
            allHidden
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title={allHidden ? "Show All Balances" : "Hide All Balances"}
        >
          {allHidden ? <Eye className="h-4 w-4 text-blue-600" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
          <span>{allHidden ? "Show All Balances" : "Hide All Balances"}</span>
          {allHidden && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black bg-amber-200/80 text-amber-900 rounded">
              Hidden
            </span>
          )}
        </button>
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
