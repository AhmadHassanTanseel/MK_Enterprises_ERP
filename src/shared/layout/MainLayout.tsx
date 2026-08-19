import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';
import { 
  LayoutDashboard, Wallet, Receipt, FileText, 
  Package, List, Users, Settings, Search, Bell, User
} from 'lucide-react';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    
    // Core Operations
    { id: 'sales', label: 'Sale Invoice', icon: Receipt },
    { id: 'sale-return', label: 'Sale Return', icon: Receipt },
    { id: 'sales-history', label: 'Sales History', icon: Receipt },
    { id: 'purchases', label: 'Purchase (GRN)', icon: Package },
    { id: 'purchase-return', label: 'Purchase Return', icon: Package },
    
    // Finance
    { id: 'cash-receive', label: 'Cash Receipt', icon: Wallet },
    { id: 'cash-payment', label: 'Cash Payment', icon: Wallet },
    { id: 'general-voucher', label: 'Journal Voucher', icon: FileText },
    { id: 'journal-history', label: 'JV Register', icon: FileText },
    
    // Master Data
    { id: 'products', label: 'Products Master', icon: Package },
    { id: 'categories', label: 'Categories', icon: Package },
    { id: 'inventory', label: 'Stock Dash', icon: List },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'account-types', label: 'Account Types', icon: Users },
    
    // Config & Reports
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'areas', label: 'Areas', icon: Settings },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* SIDEBAR NAVIGATION */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
          <h1 className="text-lg font-black tracking-wider text-white">MK ENTERPRISES</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={`/${item.id}`}
                  className={({ isActive }) => `flex items-center px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="p-4 bg-slate-950 text-xs text-slate-500 text-center border-t border-slate-800">
          v2.0.0 Production Build
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-6 z-10">
          
          {/* Left: Company & Urdu Subtitle */}
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-lg leading-tight">M K Enterprises</span>
            <span className="text-xs text-slate-500 font-medium" dir="rtl">
              بھوانہ، پنجاب، پاکستان
            </span>
          </div>

          {/* Center: Global Search (ERP Enhancement) */}
          <GlobalSearch />

          {/* Right: Notifications & Avatar */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded" onClick={() => navigate('/settings')}>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700">Guest</span>
                <span className="text-xs text-slate-500">Administrator</span>
              </div>
              <div className="h-9 w-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold border border-blue-200">
                <User className="h-5 w-5" />
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};