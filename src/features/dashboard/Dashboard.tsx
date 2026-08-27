import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FileText, ShoppingCart, PlusCircle, Users, 
  Tags, Bookmark, CornerDownLeft, CornerUpRight,
  MapPin, Activity, DollarSign, Package, TrendingUp, Users as UsersIcon, Box
} from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';

export const Dashboard: React.FC = () => {
  const { invoices, accounts } = useAppContext();

  // The 9 specific shortcuts
  const quickNav = [
    { label: "Sales Invoice", icon: FileText, to: "/sales", color: "bg-blue-100 text-blue-700" },
    { label: "Purchase", icon: ShoppingCart, to: "/purchases", color: "bg-teal-100 text-teal-700" },
    { label: "New Product", icon: PlusCircle, to: "/product?tab=products&new=true", color: "bg-purple-100 text-purple-700" },
    { label: "New Category", icon: Tags, to: "/product?tab=categories&new=true", color: "bg-orange-100 text-orange-700" },
    { label: "Sales Return", icon: CornerDownLeft, to: "/sale-return", color: "bg-red-100 text-red-700" },
    { label: "Purchase Return", icon: CornerUpRight, to: "/purchase-return", color: "bg-indigo-100 text-indigo-700" },
    { label: "Stocks", icon: Box, to: "/inventory", color: "bg-slate-100 text-slate-700" },
    { label: "Expenses", icon: DollarSign, to: "/other-accounts?tab=expenses", color: "bg-rose-100 text-rose-700" },
    { label: "Mulazmeen Attendance", icon: UsersIcon, to: "/other-accounts?tab=workers", color: "bg-emerald-100 text-emerald-700" },
  ];

  // Helper functions for dates
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(date.setDate(diff)).toISOString().split('T')[0];
  };

  const getStartOfMonth = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const startOfWeek = getStartOfWeek(now);
  const startOfMonth = getStartOfMonth(now);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const metrics = useMemo(() => {
    let salesToday = 0, salesWeek = 0, salesMonth = 0;
    let purchToday = 0, purchWeek = 0, purchMonth = 0;
    const activeCustomers = new Set<number>();

    invoices.forEach(inv => {
      const invDate = inv.date.split(' ')[0];
      const isToday = invDate === todayStr;
      const isWeek = invDate >= startOfWeek && invDate <= todayStr;
      const isMonth = invDate >= startOfMonth && invDate <= todayStr;
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
      if (createdAtDate && createdAtDate >= startOfMonth && createdAtDate <= todayStr) {
        newCustomersMonth++;
      }
    });
    
    // Ensure active customers are actually marked as customer accounts
    const activeCustomerCount = Array.from(activeCustomers).filter(id => customers.some(c => c.id === id)).length;

    return {
      salesToday, salesWeek, salesMonth,
      purchToday, purchWeek, purchMonth,
      activeCustomerCount, totalReceivables, newCustomersMonth
    };
  }, [invoices, accounts, todayStr, startOfWeek, startOfMonth, thirtyDaysAgoStr]);

  return (
    <div className="space-y-6">
      
      {/* 3 Summary Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sales Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" /> Sales (Net)
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Today</span>
              <span className="font-bold text-slate-800">Rs. {metrics.salesToday.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">This Week</span>
              <span className="font-bold text-slate-800">Rs. {metrics.salesWeek.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">This Month</span>
              <span className="font-bold text-slate-800">Rs. {metrics.salesMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        {/* Purchases Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-teal-600" /> Purchases (Net)
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Today</span>
              <span className="font-bold text-slate-800">Rs. {metrics.purchToday.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">This Week</span>
              <span className="font-bold text-slate-800">Rs. {metrics.purchWeek.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">This Month</span>
              <span className="font-bold text-slate-800">Rs. {metrics.purchMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        {/* Customers Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" /> Customers
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Active (30 days)</span>
              <span className="font-bold text-slate-800">{metrics.activeCustomerCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Total Receivables</span>
              <span className="font-bold text-slate-800">Rs. {metrics.totalReceivables.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">New This Month</span>
              <span className="font-bold text-slate-800">{metrics.newCustomersMonth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 9 Quick Navigation Blocks */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {quickNav.map((nav, i) => (
          <NavLink 
            key={i} 
            to={nav.to}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col items-center justify-center gap-3 group"
          >
            <div className={`p-4 rounded-full ${nav.color} group-hover:scale-110 transition-transform duration-300`}>
              <nav.icon className="h-6 w-6" />
            </div>
            <span className="font-medium text-slate-700 text-center">{nav.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};
