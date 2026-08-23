import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FileText, ShoppingCart, PlusCircle, Users, 
  Tags, Bookmark, CornerDownLeft, CornerUpRight,
  MapPin, Activity, DollarSign, Package, TrendingUp, Users as UsersIcon, Box
} from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';

export const Dashboard: React.FC = () => {
  const { invoices, accounts, products } = useAppContext();

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

  return (
    <div className="space-y-6">
      
      {/* 3 Summary Sections (Mock Data) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sales Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" /> Sales
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Today</span>
              <span className="font-bold text-slate-800">Rs. 45,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">This Week</span>
              <span className="font-bold text-slate-800">Rs. 280,500</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">This Month</span>
              <span className="font-bold text-slate-800">Rs. 1,150,000</span>
            </div>
          </div>
        </div>

        {/* Purchases Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-teal-600" /> Purchases
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Today</span>
              <span className="font-bold text-slate-800">Rs. 12,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">This Week</span>
              <span className="font-bold text-slate-800">Rs. 95,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">This Month</span>
              <span className="font-bold text-slate-800">Rs. 420,000</span>
            </div>
          </div>
        </div>

        {/* Customers Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-orange-600" /> Customers
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Active (30 days)</span>
              <span className="font-bold text-slate-800">42</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Total Receivables</span>
              <span className="font-bold text-slate-800 text-red-600">Rs. 89,500</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">New This Month</span>
              <span className="font-bold text-slate-800">8</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK NAVIGATE */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Quick Navigate</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickNav.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink 
                key={index} 
                to={item.to}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all group flex flex-col items-center justify-center gap-3 text-center h-32"
              >
                <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${item.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="font-semibold text-slate-700 text-sm">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

    </div>
  );
};
