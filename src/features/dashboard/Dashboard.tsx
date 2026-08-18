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
    // 1. Total Sales
    const totalSales = invoices
      .filter(i => i.type === 'SALE')
      .reduce((sum, i) => sum + i.net_amount, 0);

    // 2. Total Purchases
    const totalPurchases = invoices
      .filter(i => i.type === 'PURCHASE')
      .reduce((sum, i) => sum + i.net_amount, 0);

    // 3. Total Receivable
    const totalReceivable = accounts
      .filter(a => a.account_type_id === 2)
      .reduce((sum, a) => sum + (a.current_balance || 0), 0);

    // 4. Total Payable
    const totalPayable = accounts
      .filter(a => a.account_type_id === 4)
      .reduce((sum, a) => sum + Math.abs(a.current_balance || 0), 0);

    // 5. Cash Balance
    const cashAccount = accounts.find(a => a.id === 1);
    const cashBalance = cashAccount ? (cashAccount.current_balance || 0) : 0;

    // 6. Total Products
    const totalProducts = products.length;

    // 7. Total Customers
    const totalCustomers = accounts.filter(a => a.account_type_id === 2).length;

    // 8. Total Suppliers
    const totalSuppliers = accounts.filter(a => a.account_type_id === 4).length;

    return [
      { title: "Total Sales", value: `Rs. ${totalSales.toLocaleString()}`, icon: DollarSign, trend: "Overall" },
      { title: "Total Purchases", value: `Rs. ${totalPurchases.toLocaleString()}`, icon: ShoppingCart, trend: "Overall" },
      { title: "Total Receivable", value: `Rs. ${totalReceivable.toLocaleString()}`, icon: Activity, trend: "Overall" },
      { title: "Total Payable", value: `Rs. ${totalPayable.toLocaleString()}`, icon: FileText, trend: "Overall" },
      { title: "Cash Balance", value: `Rs. ${cashBalance.toLocaleString()}`, icon: DollarSign, trend: "Current" },
      { title: "Total Products", value: totalProducts.toString(), icon: Package, trend: "Overall" },
      { title: "Total Customers", value: totalCustomers.toString(), icon: Users, trend: "Overall" },
      { title: "Total Suppliers", value: totalSuppliers.toString(), icon: Users, trend: "Overall" },
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
