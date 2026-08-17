import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FileText, ShoppingCart, PlusCircle, Users, 
  Tags, Bookmark, CornerDownLeft, CornerUpRight,
  MapPin, Activity, DollarSign, Package
} from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';

export const Dashboard: React.FC = () => {
  const { invoices, accounts, products } = useAppContext();

  const kpis = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Today's Sales
    const todaysSales = invoices
      .filter(i => i.type === 'SALE' && i.date.startsWith(today))
      .reduce((sum, i) => sum + i.net_amount, 0);

    // 2. Outstanding Receivables
    // Accounts with type Customer (assuming type 2 is customer, or just any debit balance)
    // Actually we can sum up 'bakaya' from invoices or current_balance of customers.
    // For now we sum current_balance of all Customer accounts (assuming account_type_id == 2)
    const receivables = accounts
      .filter(a => a.account_type_id === 2)
      .reduce((sum, a) => sum + (a.current_balance || 0), 0);

    // 3. Low Stock Items
    const lowStock = products.filter(p => p.opening_stock <= (p.reorder_level || 0)).length;

    // 4. Pending Invoices (Not fully paid)
    const pendingInvoices = invoices.filter(i => i.net_amount > i.amount_paid).length;

    return [
      { title: "Today's Sales", value: `Rs. ${todaysSales.toLocaleString()}`, icon: DollarSign, trend: "Live" },
      { title: "Outstanding Receivables", value: `Rs. ${receivables.toLocaleString()}`, icon: Users, trend: "Live" },
      { title: "Low Stock Items", value: lowStock.toString(), icon: Package, trend: "Live" },
      { title: "Pending Invoices", value: pendingInvoices.toString(), icon: Activity, trend: "Live" },
    ];
  }, [invoices, accounts, products]);

  const quickLinks = [
    { name: 'Sale Invoice', to: '/sales', icon: ShoppingCart, color: 'bg-emerald-500' },
    { name: 'Purchase Invoice', to: '/purchases', icon: FileText, color: 'bg-blue-500' },
    { name: 'New Product', to: '/products', icon: PlusCircle, color: 'bg-indigo-500' },
    { name: 'Add Account', to: '/accounts', icon: Users, color: 'bg-purple-500' },
    { name: 'Accounts Type', to: '/account-types', icon: Tags, color: 'bg-pink-500' },
    { name: 'Add Category', to: '/categories', icon: Bookmark, color: 'bg-rose-500' },
    { name: 'Journal Voucher', to: '/general-voucher', icon: FileText, color: 'bg-orange-500' },
    { name: 'Sale Return', to: '/sale-return', icon: CornerDownLeft, color: 'bg-red-500' },
    { name: 'Purchase Return', to: '/purchase-return', icon: CornerUpRight, color: 'bg-yellow-500' },
    { name: 'Add Area', to: '/areas', icon: MapPin, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
      </div>

      {/* KPI Tiles (ERP Enhancement) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{kpi.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">{kpi.value}</h3>
            </div>
            <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-600">
              <kpi.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Navigate Tiles */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Navigate</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickLinks.map((link, idx) => (
            <NavLink 
              key={idx}
              to={link.to}
              className={`${link.color} text-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 hover:-translate-y-1`}
            >
              <link.icon className="h-8 w-8" />
              <span className="font-semibold text-sm text-center">{link.name}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};
