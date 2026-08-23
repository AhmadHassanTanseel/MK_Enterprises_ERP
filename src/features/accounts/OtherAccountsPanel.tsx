import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Users, Layout, TrendingDown, DollarSign, Activity, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const OtherAccountsPanel: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'loan');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const menuGroups = [
    {
      title: 'Finance & Lending',
      items: [
        { id: 'loan', label: 'Loan', icon: Wallet },
        { id: 'investors', label: 'Investors', icon: TrendingDown },
        { id: 'banking', label: 'Banking', icon: Layout },
      ]
    },
    {
      title: 'Business Operations',
      items: [
        { id: 'workers', label: 'Workers', icon: Users },
        { id: 'assets', label: 'Assets', icon: Activity },
        { id: 'expenses', label: 'Expenses', icon: DollarSign },
        { id: 'adjustments', label: 'Adjustments', icon: FileText },
      ]
    }
  ];

  const handleNotConnected = () => {
    toast.error('Not yet connected — coming in the next phase');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'loan':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Manage Loans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loan Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="loanDir" className="w-4 h-4 text-blue-600" defaultChecked />
                    <span>Give (Lend)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="loanDir" className="w-4 h-4 text-blue-600" />
                    <span>Take (Borrow)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Interest Structure</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="loanInt" className="w-4 h-4 text-blue-600" defaultChecked />
                    <span>Interest-free</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="loanInt" className="w-4 h-4 text-blue-600" />
                    <span>Interest</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Party Name" className="w-full border border-slate-300 rounded p-2" />
              <input type="number" placeholder="Amount" className="w-full border border-slate-300 rounded p-2" />
              <button onClick={handleNotConnected} className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">Save Loan</button>
            </div>
          </div>
        );
      case 'workers':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Workers & Attendance</h2>
            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
              <button className="font-bold text-blue-600 border-b-2 border-blue-600 pb-2 px-2">Attendance</button>
              <button className="text-slate-500 hover:text-slate-700 px-2 pb-2">Salary</button>
            </div>
            <div className="space-y-4">
              <input type="date" className="w-full border border-slate-300 rounded p-2" />
              <div className="bg-slate-50 p-4 rounded text-center text-slate-500">Worker List (Placeholder)</div>
              <button onClick={handleNotConnected} className="bg-emerald-600 text-white px-4 py-2 rounded font-medium hover:bg-emerald-700">Mark Attendance</button>
            </div>
          </div>
        );
      case 'assets':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Company Assets</h2>
            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
              <button className="font-bold text-blue-600 border-b-2 border-blue-600 pb-2 px-2">Purchase Asset</button>
              <button className="text-slate-500 hover:text-slate-700 px-2 pb-2">Sell Asset</button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Asset Name / Description" className="w-full border border-slate-300 rounded p-2" />
              <input type="number" placeholder="Value" className="w-full border border-slate-300 rounded p-2" />
              <button onClick={handleNotConnected} className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">Record Transaction</button>
            </div>
          </div>
        );
      case 'expenses':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">General Expenses</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Expense Category (e.g. Utility, Office)" className="w-full border border-slate-300 rounded p-2" />
              <input type="number" placeholder="Amount" className="w-full border border-slate-300 rounded p-2" />
              <input type="text" placeholder="Description" className="w-full border border-slate-300 rounded p-2" />
              <button onClick={handleNotConnected} className="bg-rose-600 text-white px-4 py-2 rounded font-medium hover:bg-rose-700">Add Expense</button>
            </div>
          </div>
        );
      case 'investors':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Investor Capital</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Investor Name" className="w-full border border-slate-300 rounded p-2" />
              <input type="number" placeholder="Amount" className="w-full border border-slate-300 rounded p-2" />
              <select className="w-full border border-slate-300 rounded p-2">
                <option>Capital Contribution</option>
                <option>Capital Withdrawal</option>
              </select>
              <button onClick={handleNotConnected} className="bg-indigo-600 text-white px-4 py-2 rounded font-medium hover:bg-indigo-700">Record Capital</button>
            </div>
          </div>
        );
      case 'adjustments':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Adjustments</h2>
            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
              <button className="font-bold text-blue-600 border-b-2 border-blue-600 pb-2 px-2">Cash</button>
              <button className="text-slate-500 hover:text-slate-700 px-2 pb-2">Stock</button>
              <button className="text-slate-500 hover:text-slate-700 px-2 pb-2">Sales</button>
            </div>
            <div className="space-y-4">
              <input type="number" placeholder="Adjustment Amount" className="w-full border border-slate-300 rounded p-2" />
              <input type="text" placeholder="Reason" className="w-full border border-slate-300 rounded p-2" />
              <button onClick={handleNotConnected} className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">Save Adjustment</button>
            </div>
          </div>
        );
      case 'banking':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Bank Accounts</h2>
            <div className="space-y-4 mb-8">
              <input type="text" placeholder="Bank Name (e.g. Meezan Bank)" className="w-full border border-slate-300 rounded p-2" />
              <input type="text" placeholder="Account Number" className="w-full border border-slate-300 rounded p-2" />
              <input type="number" placeholder="Opening Balance" className="w-full border border-slate-300 rounded p-2" />
              <button onClick={handleNotConnected} className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">Add Bank Account</button>
            </div>
            <div className="bg-slate-50 p-4 rounded text-center text-slate-500">No Bank Accounts Configured (Placeholder)</div>
          </div>
        );
      default:
        return <div>Select a section</div>;
    }
  };

  return (
    <div className="flex h-full gap-6">
      <div className="w-64 flex-shrink-0 space-y-6">
        {menuGroups.map((group, gIndex) => (
          <div key={gIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{group.title}</h3>
            </div>
            <div className="p-2 space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};
