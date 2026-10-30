import React, { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { 
  FileText, ShoppingCart, PlusCircle, Users, ArrowDownRight, ArrowUpRight,

  Tags, Bookmark, CornerDownLeft, CornerUpRight,
  MapPin, Activity, DollarSign, Package, TrendingUp, Users as UsersIcon, Box
} from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';

export const Dashboard: React.FC = () => {
  const { invoices, accounts, ledgerEntries } = useAppContext();

  const [hideCashBank, setHideCashBank] = useState<boolean>(() => {
    return localStorage.getItem('hide_dashboard_cash_bank') === 'true';
  });

  const toggleHideCashBank = () => {
    setHideCashBank(prev => {
      const next = !prev;
      localStorage.setItem('hide_dashboard_cash_bank', String(next));
      return next;
    });
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
          onClick={toggleHideCashBank}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
            hideCashBank
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title={hideCashBank ? "Show Cash & Bank Balances" : "Hide Cash & Bank Balances"}
        >
          {hideCashBank ? <Eye className="h-4 w-4 text-blue-600" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
          <span>{hideCashBank ? "Show Cash & Bank Flow" : "Hide Cash & Bank Flow"}</span>
          {hideCashBank && (
            <span className="ml-1 px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[10px]">Hidden</span>
          )}
        </button>
      </div>
      
      {/* 5 Summary Sections - Auto-Adaptive, Uncompressed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
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
              onClick={toggleHideCashBank}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={hideCashBank ? "Show Cash Flow" : "Hide Cash Flow"}
            >
              {hideCashBank ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mb-1.5 pb-1.5 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Total in Hand</span>
            {hideCashBank ? (
              <span className="text-xs font-black tracking-widest text-slate-400 font-mono">••••••••</span>
            ) : (
              <span className={`text-xs font-bold tabular-nums ${metrics.cashAllTime >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatRs(metrics.cashAllTime)}</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">Today</span>
              {hideCashBank ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.cashToday >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatRs(metrics.cashToday)}</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">This Week</span>
              {hideCashBank ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.cashWeek >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatRs(metrics.cashWeek)}</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1">
              <span className="text-slate-600 font-semibold whitespace-nowrap">This Month</span>
              {hideCashBank ? (
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
              onClick={toggleHideCashBank}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={hideCashBank ? "Show Bank Flow" : "Hide Bank Flow"}
            >
              {hideCashBank ? <Eye className="h-3.5 w-3.5 text-blue-600" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mb-1.5 pb-1.5 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Total in Bank</span>
            {hideCashBank ? (
              <span className="text-xs font-black tracking-widest text-slate-400 font-mono">••••••••</span>
            ) : (
              <span className={`text-xs font-bold tabular-nums ${metrics.bankAllTime >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>{formatRs(metrics.bankAllTime)}</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">Today</span>
              {hideCashBank ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.bankToday >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatRs(metrics.bankToday)}</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 whitespace-nowrap">This Week</span>
              {hideCashBank ? (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono">••••••••</span>
              ) : (
                <span className={`font-bold tabular-nums ${metrics.bankWeek >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatRs(metrics.bankWeek)}</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1">
              <span className="text-slate-600 font-semibold whitespace-nowrap">This Month</span>
              {hideCashBank ? (
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
