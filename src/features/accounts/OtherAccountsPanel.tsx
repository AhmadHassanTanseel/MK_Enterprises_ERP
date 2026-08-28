import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Users, Layout, TrendingDown, DollarSign, Activity, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../app/context/AppContext';

export const OtherAccountsPanel: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'assets');
  const { companyAssets, addCompanyAsset, sellCompanyAsset } = useAppContext();

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
      title: 'Accounts',
      items: [
        { id: 'assets', label: 'Assets', icon: Activity },
        { id: 'expenses', label: 'Expenses', icon: DollarSign },
        { id: 'adjustments', label: 'Adjustments', icon: FileText },
        { id: 'payables_receivables', label: 'Payables & Receivables', icon: Users },
      ]
    }
  ];

  
  // Assets state
  const [assetTab, setAssetTab] = useState<'list' | 'buy' | 'sell'>('list');
  const [assetName, setAssetName] = useState('');
  const [assetPrice, setAssetPrice] = useState<number | ''>('');
  const [assetDate, setAssetDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');

  const handleBuyAsset = async () => {
    if (!assetName || !assetPrice) {
      toast.error('Please fill name and price');
      return;
    }
    try {
      await addCompanyAsset(assetName, Number(assetPrice), assetDate);
      toast.success('Asset purchased successfully');
      setAssetTab('list');
      setAssetName('');
      setAssetPrice('');
    } catch (e: any) {
      toast.error(e.toString());
    }
  };

  const handleSellAsset = async () => {
    if (!selectedAssetId || !assetPrice) {
      toast.error('Please select asset and enter sold price');
      return;
    }
    try {
      await sellCompanyAsset(Number(selectedAssetId), Number(assetPrice), assetDate);
      toast.success('Asset sold successfully');
      setAssetTab('list');
      setSelectedAssetId('');
      setAssetPrice('');
    } catch (e: any) {
      toast.error(e.toString());
    }
  };

  // Expenses state
  const [expenseTab, setExpenseTab] = useState<'list' | 'add'>('list');
  const [expStartDate, setExpStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [expEndDate, setExpEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState('');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { accountTypes, accounts, postJournalEntry, fetchData, ledgerEntries } = useAppContext();
  
  const expenseTypes = accountTypes.filter(t => t.nature === 'EXPENSE').map(t => t.id);
  const expenseAccounts = accounts.filter(a => expenseTypes.includes(a.account_type_id));

  const handleAddExpense = async () => {
    if (!expCategory || !expAmount) {
      toast.error('Category and Amount are required');
      return;
    }
    setIsSubmitting(true);
    try {
      let accId = accounts.find(a => a.name.toLowerCase() === expCategory.toLowerCase() && expenseTypes.includes(a.account_type_id))?.id;
      
      if (!accId) {
        // Create it
        const typeId = expenseTypes[0] || 7; // fallback to 7 (Operating Expense)
        accId = await invoke('create_account', {
          accountTypeId: typeId,
          name: expCategory,
          contact: null, address: null, areaId: null,
          openingBalance: 0, openingBalanceType: 'DEBIT',
          isCustomer: false, isSupplier: false
        });
        await fetchData(); // Refresh accounts in context
      }
      
      // Cash Account is usually ID 1 (Cash Drawer)
      const cashAccountId = 1;
      
      await postJournalEntry(
        expDate,
        [
          { accountId: accId as number, entryType: 'DR', amount: Number(expAmount), description: expDesc },
          { accountId: cashAccountId, entryType: 'CR', amount: Number(expAmount), description: expDesc }
        ],
        `Expense: ${expCategory} - ${expDesc}`
      );
      
      toast.success('Expense recorded successfully');
      setExpCategory('');
      setExpAmount('');
      setExpDesc('');
      
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <button 
                onClick={() => setAssetTab('list')}
                className={`font-bold pb-2 px-2 ${assetTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >Assets List</button>
              <button 
                onClick={() => setAssetTab('buy')}
                className={`font-bold pb-2 px-2 ${assetTab === 'buy' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >Purchase Asset</button>
              <button 
                onClick={() => setAssetTab('sell')}
                className={`font-bold pb-2 px-2 ${assetTab === 'sell' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >Sell Asset</button>
            </div>
            
            {assetTab === 'list' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Asset Name</th>
                      <th className="px-4 py-2 font-medium">Purchase Date</th>
                      <th className="px-4 py-2 font-medium text-right">Purchase Price</th>
                      <th className="px-4 py-2 font-medium text-center">Status</th>
                      <th className="px-4 py-2 font-medium">Sold Date</th>
                      <th className="px-4 py-2 font-medium text-right">Sold Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companyAssets.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-semibold text-slate-700">{a.name}</td>
                        <td className="px-4 py-2">{a.purchase_date}</td>
                        <td className="px-4 py-2 text-right">Rs. {a.purchase_price.toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">{a.sold_date || '-'}</td>
                        <td className="px-4 py-2 text-right">{a.sold_price ? `Rs. ${a.sold_price.toLocaleString()}` : '-'}</td>
                      </tr>
                    ))}
                    {companyAssets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No assets recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {assetTab === 'buy' && (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name / Description</label>
                  <input type="text" value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Delivery Van, Office AC" className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                  <input type="date" value={assetDate} onChange={e => setAssetDate(e.target.value)} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price (Rs)</label>
                  <input type="number" value={assetPrice} onChange={e => setAssetPrice(Number(e.target.value) || '')} placeholder="Amount paid" className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <button onClick={handleBuyAsset} className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 w-full">Record Asset Purchase</button>
              </div>
            )}
            
            {assetTab === 'sell' && (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Asset to Sell</label>
                  <select value={selectedAssetId} onChange={e => setSelectedAssetId(Number(e.target.value) || '')} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Select Active Asset --</option>
                    {companyAssets.filter((a: any) => a.status === 'ACTIVE').map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name} (Purchased for Rs. {a.purchase_price})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sold Date</label>
                  <input type="date" value={assetDate} onChange={e => setAssetDate(e.target.value)} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sold Price (Current Market Price)</label>
                  <input type="number" value={assetPrice} onChange={e => setAssetPrice(Number(e.target.value) || '')} placeholder="Amount received" className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <button onClick={handleSellAsset} className="bg-emerald-600 text-white px-4 py-2 rounded font-medium hover:bg-emerald-700 w-full">Record Asset Sale</button>
              </div>
            )}
          </div>
        );
            case 'expenses': {
        const filteredExpenses = ledgerEntries
          .filter(l => expenseAccounts.some(a => a.id === l.account_id) && l.dr_amount > 0 && l.ref_type === 'JOURNAL_VOUCHER' && !l.description.includes('Opening Balance'))
          .filter(l => {
            if (!l.date) return true;
            const d = l.date.split(' ')[0];
            return d >= expStartDate && d <= expEndDate;
          })
          .sort((a, b) => (a.date > b.date ? -1 : 1));

        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">General Expenses</h2>
            
            <div className="flex border-b border-slate-200 mb-6">
              <button
                className={`py-2 px-4 font-medium text-sm transition-colors ${expenseTab === 'list' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setExpenseTab('list')}
              >
                Expenses List
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm transition-colors ${expenseTab === 'add' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setExpenseTab('add')}
              >
                Record Expense
              </button>
            </div>

            {expenseTab === 'list' && (
              <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                    <input type="date" value={expStartDate} onChange={e => setExpStartDate(e.target.value)} className="border border-slate-300 rounded p-1 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                    <input type="date" value={expEndDate} onChange={e => setExpEndDate(e.target.value)} className="border border-slate-300 rounded p-1 text-sm outline-none" />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-sm">
                        <th className="p-3 border-b border-slate-200">Date</th>
                        <th className="p-3 border-b border-slate-200">Category</th>
                        <th className="p-3 border-b border-slate-200">Description</th>
                        <th className="p-3 border-b border-slate-200 text-right">Amount (Rs)</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filteredExpenses.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-slate-500">No expenses recorded in this period.</td></tr>
                      ) : (
                        filteredExpenses.map((exp, idx) => {
                          const catName = accounts.find(a => a.id === exp.account_id)?.name || 'Unknown';
                          return (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-3 text-slate-600">{exp.date.split(' ')[0]}</td>
                              <td className="p-3 font-medium text-slate-800">{catName}</td>
                              <td className="p-3 text-slate-600">{exp.description}</td>
                              <td className="p-3 text-right text-slate-800">Rs. {exp.dr_amount.toLocaleString()}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {expenseTab === 'add' && (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expense Category</label>
                  <input 
                    list="expense-categories" 
                    type="text" 
                    placeholder="e.g. Utility, Office, Salary" 
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" 
                  />
                  <datalist id="expense-categories">
                    {expenseAccounts.map((a: any) => <option key={a.id} value={a.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (Rs)</label>
                  <input 
                    type="number" 
                    placeholder="Amount Paid" 
                    value={expAmount}
                    onChange={e => setExpAmount(Number(e.target.value) || '')}
                    className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Details of expense..." 
                    value={expDesc}
                    onChange={e => setExpDesc(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" 
                  />
                </div>
                <button 
                  onClick={handleAddExpense} 
                  disabled={isSubmitting}
                  className="w-full bg-rose-600 text-white px-4 py-2 rounded font-medium hover:bg-rose-700 disabled:bg-rose-400 transition-colors"
                >
                  Record Expense
                </button>
              </div>
            )}
          </div>
        );
      }
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
