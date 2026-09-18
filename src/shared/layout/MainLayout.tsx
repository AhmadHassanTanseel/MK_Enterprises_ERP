import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';
import { 
  LayoutDashboard, Wallet, Receipt, FileText, 
  Package, List, Users, Settings, Search, Bell, User, ChevronDown, ChevronRight, Menu, MapPin, TrendingUp, ArrowLeft, X
} from 'lucide-react';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  level: string;
}

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [salesOpen, setSalesOpen] = useState(true);
  const [purchasesOpen, setPurchasesOpen] = useState(true);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notifs = await invoke<AppNotification[]>('get_notifications');
        setNotifications(notifs);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);


  // New sidebar structure
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    
    // Sales is now a grouped item
    { 
      id: 'sales-group', 
      label: 'Sales', 
      icon: Receipt,
      children: [
        { id: 'sales', label: 'Sale Invoice' },
        { id: 'sale-return', label: 'Sale Return' },
        { id: 'sales-history', label: 'Sales History' },
          { id: 'pending-orders', label: 'Pending Orders' },
      ]
    },

    // Purchases group
    {
      id: 'purchases-group',
      label: 'Purchases',
      icon: Package,
      children: [
        { id: 'purchases', label: 'Purchase (GRN)' },
        { id: 'purchase-return', label: 'Purchase Return' },
        { id: 'purchase-history', label: 'Purchase History' },
      ]
    },

    // Journal Voucher
    { id: 'general-voucher', label: 'Journal Voucher', icon: FileText },
    
    // Product
    { id: 'product', label: 'Product', icon: Package },
    
    // Accounts
    { id: 'accounts', label: 'Account', icon: Users },
    { id: 'other-accounts', label: 'Other Accounts', icon: Wallet },
    
    // Others
    { id: 'inventory', label: 'Stock Dash', icon: List },
    { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'financial-statements', label: 'Financial Statements', icon: TrendingUp },
    { id: 'areas', label: 'Areas', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* SIDEBAR NAVIGATION */}
      {sidebarOpen && (
        <div className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 transition-all duration-300">
          <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
            <h1 className="text-lg font-black tracking-wider text-white" dir="rtl">میاں خان ٹریڈرز</h1>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {navItems.map((item) => {
                if (item.children) {
                  const isActiveGroup = item.children.some(child => location.pathname.includes(`/${child.id}`));
                  const isOpen = item.id === 'sales-group' ? salesOpen : purchasesOpen;
                  const toggleOpen = () => item.id === 'sales-group' ? setSalesOpen(!salesOpen) : setPurchasesOpen(!purchasesOpen);
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={toggleOpen}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-md text-sm font-medium transition-colors ${isActiveGroup ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                      >
                        <div className="flex items-center">
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.label}
                        </div>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {isOpen && (
                        <div className="pl-10 space-y-1">
                          {item.children.map(child => (
                            <NavLink
                              key={child.id}
                              to={`/${child.id}`}
                              className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                                isActive 
                                  ? 'bg-blue-600 text-white shadow-md' 
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

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
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-6 z-10">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
              {location.pathname !== '/dashboard' && (
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}

            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-lg leading-tight">میاں خان ٹریڈرز</span>
              <span className="text-xs text-slate-500 font-medium" dir="rtl">نزد نیشنل بینک جھنگ چنیوٹ روڈ بھوانہ</span>
            </div>
          </div>

          <GlobalSearch />

          {/* Right: Notifications & Avatar */}
          
              {location.pathname !== '/dashboard' && (
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors mr-2"
                  title="Close to Dashboard"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
<div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
                <button 
                  className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                      <h4 className="font-bold text-slate-700">Notifications</h4>
                      <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">{notifications.length} New</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">No new notifications</div>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.id} className="p-4 border-b border-slate-100 hover:bg-slate-50">
                            <h5 className={`font-bold text-sm ${notif.level === 'danger' ? 'text-rose-600' : notif.level === 'warning' ? 'text-amber-600' : 'text-blue-600'} mb-1`}>
                              {notif.title}
                            </h5>
                            <p className="text-slate-600 text-xs leading-relaxed">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
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

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          <Outlet />
        </main>

      </div>
    </div>
  );
};