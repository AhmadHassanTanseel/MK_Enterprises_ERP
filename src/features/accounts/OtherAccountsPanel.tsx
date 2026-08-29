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

    // Adjustments state
  const [adjViewTab, setAdjViewTab] = useState<'list' | 'add'>('list');
  const [adjTypeTab, setAdjTypeTab] = useState<'cash'|'stock'|'sales'>('cash');
  const [adjAmount, setAdjAmount] = useState<number | ''>('');
  const [adjQty, setAdjQty] = useState<number | ''>('');
  const [adjProductId, setAdjProductId] = useState<number | ''>('');
  const [adjReason, setAdjReason] = useState('');
  const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjStartDate, setAdjStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [adjEndDate, setAdjEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjList, setAdjList] = useState<any[]>([]);
  // Payables & Receivables State
  const [prViewTab, setPrViewTab] = useState<'balances' | 'history'>('balances');
  const [prSearch, setPrSearch] = useState('');
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAccount, setSettleAccount] = useState<any>(null);
  const [settleAction, setSettleAction] = useState<'receive' | 'pay'>('receive');
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNotes, setSettleNotes] = useState('');



  const handleOpenSettle = (account: any, suggestedAction: 'receive' | 'pay') => {
    setSettleAccount(account);
    setSettleAction(suggestedAction);
    setSettleAmount(Math.abs(account.current_balance));
    setSettleNotes(`Settlement for ${account.name}`);
    setSettleModalOpen(true);
  };

  const submitSettlement = async () => {
    if (!settleAccount || !settleAmount || Number(settleAmount) <= 0) return;
    setIsSubmitting(true);
    try {
      if (settleAction === 'receive') {
        // We receive cash: Debit Cash, Credit Account
        await invoke('process_cash_transaction', {
          transType: 'RECEIVE',
          accountId: settleAccount.id,
          amount: Number(settleAmount),
          transDate: new Date().toISOString().split('T')[0],
          description: settleNotes,
          paymentMethod: 'CASH',
          refNo: null,
          attachmentPath: null
        });
      } else {
        // We pay cash: Credit Cash, Debit Account
        await invoke('process_cash_transaction', {
          transType: 'PAYMENT',
          accountId: settleAccount.id,
          amount: Number(settleAmount),
          transDate: new Date().toISOString().split('T')[0],
          description: settleNotes,
          paymentMethod: 'CASH',
          refNo: null,
          attachmentPath: null
        });
      }
      toast.success('Settlement saved successfully!');
      setSettleModalOpen(false);
      await fetchData();
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'adjustments' && adjViewTab === 'list') {
      invoke('generate_report', { 
        reportName: 'ADJUSTMENTS', 
        filters: { from_date: adjStartDate, to_date: adjEndDate, account_id: null, product_id: null } 
      }).then((res: any) => {
        if (res && res.rows) {
          setAdjList(res.rows);
        }
      }).catch(err => {
        console.error("Failed to load adjustments", err);
      });
    }
  }, [activeTab, adjViewTab, adjStartDate, adjEndDate]);

  const handleSaveAdjustment = async () => {
    if (!adjReason) {
      toast.error('Reason is required');
      return;
    }
    setIsSubmitting(true);
    try {
      if (adjTypeTab === 'cash') {
        if (!adjAmount || Number(adjAmount) === 0) throw new Error("Amount required");
        await invoke('adjust_cash', { amount: Number(adjAmount), reason: adjReason, date: adjDate });
      } else if (adjTypeTab === 'sales') {
        if (!adjAmount || Number(adjAmount) === 0) throw new Error("Amount required");
        await invoke('adjust_sales', { amount: Number(adjAmount), reason: adjReason, date: adjDate });
      } else if (adjTypeTab === 'stock') {
        if (!adjQty || Number(adjQty) === 0) throw new Error("Quantity required");
        if (!adjProductId) throw new Error("Product required");
        await invoke('adjust_stock', { productId: Number(adjProductId), qty: Number(adjQty), reason: adjReason, date: adjDate });
      }
      
      toast.success('Adjustment saved successfully');
      setAdjAmount('');
      setAdjQty('');
      setAdjReason('');
      setAdjViewTab('list'); // switch back to list
      await fetchData(); // refresh app context
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setIsSubmitting(false);
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
  
  const { accountTypes, accounts, postJournalEntry, fetchData, ledgerEntries, products } = useAppContext();

  const toReceiveAccounts = accounts.filter(a => (a.is_customer || a.is_supplier) && a.current_balance > 0);
  const toPayAccounts = accounts.filter(a => (a.is_customer || a.is_supplier) && a.current_balance < 0);
  const settledAccounts = accounts.filter(a => (a.is_customer || a.is_supplier) && a.current_balance === 0);

  // History calculations
  const prHistory = ledgerEntries
    .filter(le => 
      (le.ref_type === 'CASH_RECEIPT' || le.ref_type === 'CASH_PAYMENT') && 
      accounts.some(a => a.id === le.account_id && (a.is_customer || a.is_supplier))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  
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
                          const categoryName = expenseAccounts.find(a => a.id === exp.account_id)?.name || 'Unknown';
                          return (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-3 text-slate-600">{exp.date}</td>
                              <td className="p-3 font-medium text-slate-800">{categoryName}</td>
                              <td className="p-3 text-slate-600">{exp.description}</td>
                              <td className="p-3 text-right font-bold text-rose-600">Rs. {exp.dr_amount.toLocaleString()}</td>
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

      case 'adjustments':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Adjustments</h2>
            
            <div className="flex border-b border-slate-200 mb-6">
              <button
                className={`py-2 px-4 font-medium text-sm transition-colors ${adjViewTab === 'list' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setAdjViewTab('list')}
              >
                Adjustments List
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm transition-colors ${adjViewTab === 'add' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setAdjViewTab('add')}
              >
                Record Adjustment
              </button>
            </div>

            {adjViewTab === 'list' && (
              <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                    <input type="date" value={adjStartDate} onChange={e => setAdjStartDate(e.target.value)} className="border border-slate-300 rounded p-1 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                    <input type="date" value={adjEndDate} onChange={e => setAdjEndDate(e.target.value)} className="border border-slate-300 rounded p-1 text-sm outline-none" />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-sm">
                        <th className="p-3 border-b border-slate-200">Date</th>
                        <th className="p-3 border-b border-slate-200">Type</th>
                        <th className="p-3 border-b border-slate-200">Details</th>
                        <th className="p-3 border-b border-slate-200 text-right">Adjustment</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {adjList.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-slate-500">No adjustments found.</td></tr>
                      ) : (
                        adjList.map((adj, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 text-slate-600">{adj[0]}</td>
                            <td className="p-3 font-medium text-slate-800">{adj[1]}</td>
                            <td className="p-3 text-slate-600">{adj[2]}</td>
                            <td className="p-3 text-right font-medium text-slate-800">{adj[3]}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adjViewTab === 'add' && (
              <div className="space-y-6 max-w-md">
                <div className="flex gap-4 border-b border-slate-100 pb-2">
                  <button 
                    className={`font-medium px-2 py-1 rounded ${adjTypeTab === 'cash' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                    onClick={() => setAdjTypeTab('cash')}
                  >Cash</button>
                  <button 
                    className={`font-medium px-2 py-1 rounded ${adjTypeTab === 'stock' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                    onClick={() => setAdjTypeTab('stock')}
                  >Stock</button>
                  <button 
                    className={`font-medium px-2 py-1 rounded ${adjTypeTab === 'sales' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                    onClick={() => setAdjTypeTab('sales')}
                  >Sales</button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)} className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" />
                  </div>
                  
                  {adjTypeTab === 'stock' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                        <select 
                          value={adjProductId} 
                          onChange={e => setAdjProductId(Number(e.target.value))}
                          className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500"
                        >
                          <option value="">Select Product...</option>
                          {products?.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name} {p.packing} (Stock: {p.current_stock})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Adjustment (+ or -)</label>
                        <input type="number" placeholder="e.g. -5 to reduce, 5 to add" value={adjQty} onChange={e => setAdjQty(Number(e.target.value) || '')} className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount (+ or -)</label>
                      <input type="number" placeholder={`e.g. -500 to reduce ${adjTypeTab}, 500 to add`} value={adjAmount} onChange={e => setAdjAmount(Number(e.target.value) || '')} className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Notes</label>
                    <input type="text" placeholder="e.g. Missing from till, Damaged..." value={adjReason} onChange={e => setAdjReason(e.target.value)} className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" />
                  </div>

                  <button 
                    onClick={handleSaveAdjustment} 
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  >
                    Save {adjTypeTab.charAt(0).toUpperCase() + adjTypeTab.slice(1)} Adjustment
                  </button>
                </div>
              </div>
            )}
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
            case 'payables_receivables':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Payables & Receivables</h2>
              
              <div className="flex border border-slate-200 rounded overflow-hidden">
                <button 
                  className={`px-4 py-1 text-sm font-medium ${prViewTab === 'balances' ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => setPrViewTab('balances')}
                >
                  Active Balances
                </button>
                <button 
                  className={`px-4 py-1 text-sm font-medium ${prViewTab === 'history' ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-500 border-l border-slate-200 hover:bg-slate-50'}`}
                  onClick={() => setPrViewTab('history')}
                >
                  Settlement History
                </button>
              </div>

              <input 
                type="text" 
                placeholder="Search name..." 
                value={prSearch}
                onChange={e => setPrSearch(e.target.value)}
                className="border border-slate-300 rounded px-3 py-1 text-sm outline-none focus:border-blue-500 w-64"
              />
            </div>

            {prViewTab === 'balances' && (
              <>
                <div className="grid grid-cols-2 gap-8">
                  {/* TO RECEIVE */}
              <div>
                <h3 className="font-bold text-emerald-600 mb-4 border-b border-emerald-100 pb-2">To Receive (Receivables)</h3>
                <div className="space-y-3">
                  {toReceiveAccounts.filter(a => a.name.toLowerCase().includes(prSearch.toLowerCase())).length === 0 ? (
                    <div className="text-slate-400 text-sm">No pending receivables.</div>
                  ) : (
                    toReceiveAccounts.filter(a => a.name.toLowerCase().includes(prSearch.toLowerCase())).map(a => (
                      <div key={a.id} className="flex justify-between items-center bg-emerald-50 p-3 rounded border border-emerald-100">
                        <div>
                          <div className="font-semibold text-slate-800">{a.name}</div>
                          <div className="text-xs text-slate-500">{a.is_customer ? 'Customer' : 'Supplier'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600">Rs. {a.current_balance.toLocaleString()}</div>
                          <button 
                            onClick={() => handleOpenSettle(a, 'receive')}
                            className="mt-1 text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors"
                          >
                            Settle Balance
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TO PAY */}
              <div>
                <h3 className="font-bold text-rose-600 mb-4 border-b border-rose-100 pb-2">To Pay (Payables)</h3>
                <div className="space-y-3">
                  {toPayAccounts.filter(a => a.name.toLowerCase().includes(prSearch.toLowerCase())).length === 0 ? (
                    <div className="text-slate-400 text-sm">No pending payables.</div>
                  ) : (
                    toPayAccounts.filter(a => a.name.toLowerCase().includes(prSearch.toLowerCase())).map(a => (
                      <div key={a.id} className="flex justify-between items-center bg-rose-50 p-3 rounded border border-rose-100">
                        <div>
                          <div className="font-semibold text-slate-800">{a.name}</div>
                          <div className="text-xs text-slate-500">{a.is_supplier ? 'Supplier' : 'Customer'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-rose-600">Rs. {Math.abs(a.current_balance).toLocaleString()}</div>
                          <button 
                            onClick={() => handleOpenSettle(a, 'pay')}
                            className="mt-1 text-xs bg-rose-600 text-white px-2 py-1 rounded hover:bg-rose-700 transition-colors"
                          >
                            Settle Balance
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* SETTLED ACCOUNTS */}
            <div className="mt-8">
              <h3 className="font-bold text-slate-500 mb-4 border-b border-slate-100 pb-2">Settled Accounts (Balance 0)</h3>
              <div className="grid grid-cols-2 gap-4">
                {settledAccounts.filter(a => a.name.toLowerCase().includes(prSearch.toLowerCase())).slice(0, 10).map(a => (
                   <div key={a.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200">
                     <span className="text-sm font-medium text-slate-700">{a.name}</span>
                     <button 
                        onClick={() => handleOpenSettle(a, 'receive')}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Add Transaction
                      </button>
                   </div>
                ))}
              </div>
            </div>
            </>
            )}

            {prViewTab === 'history' && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg mt-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm">
                      <th className="p-3 border-b border-slate-200">Date</th>
                      <th className="p-3 border-b border-slate-200">Account</th>
                      <th className="p-3 border-b border-slate-200">Type</th>
                      <th className="p-3 border-b border-slate-200">Details</th>
                      <th className="p-3 border-b border-slate-200 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {prHistory.filter(h => accounts.find(a => a.id === h.account_id)?.name.toLowerCase().includes(prSearch.toLowerCase())).length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-slate-500">No settlement history found.</td></tr>
                    ) : (
                      prHistory.filter(h => accounts.find(a => a.id === h.account_id)?.name.toLowerCase().includes(prSearch.toLowerCase())).map((h, idx) => {
                        const acc = accounts.find(a => a.id === h.account_id);
                        const isPaymentSent = h.dr_amount > 0; // If supplier/customer is debited, it means we paid them cash.
                        const amount = h.dr_amount > 0 ? h.dr_amount : h.cr_amount;
                        return (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 text-slate-600">{h.date}</td>
                            <td className="p-3 font-medium text-slate-800">{acc?.name}</td>
                            <td className="p-3">
                              {isPaymentSent ? (
                                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold">Payment Sent</span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Payment Received</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600">{h.description}</td>
                            <td className={`p-3 text-right font-bold ${isPaymentSent ? 'text-rose-600' : 'text-emerald-600'}`}>Rs. {amount.toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}


            {/* SETTLEMENT MODAL */}
            {settleModalOpen && settleAccount && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Settle Balance: {settleAccount.name}</h3>
                    <button onClick={() => setSettleModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded">
                      <button 
                        className={`flex-1 py-1 text-sm font-medium rounded ${settleAction === 'receive' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                        onClick={() => setSettleAction('receive')}
                      >
                        Receive Cash
                      </button>
                      <button 
                        className={`flex-1 py-1 text-sm font-medium rounded ${settleAction === 'pay' ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}
                        onClick={() => setSettleAction('pay')}
                      >
                        Pay Cash
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                      <input 
                        type="number" 
                        value={settleAmount} 
                        onChange={e => setSettleAmount(Number(e.target.value) || '')} 
                        className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Reference</label>
                      <input 
                        type="text" 
                        value={settleNotes} 
                        onChange={e => setSettleNotes(e.target.value)} 
                        className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" 
                      />
                    </div>
                    <button 
                      onClick={submitSettlement} 
                      disabled={isSubmitting}
                      className={`w-full text-white px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors ${settleAction === 'receive' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                    >
                      {isSubmitting ? 'Processing...' : `Confirm ${settleAction === 'receive' ? 'Receipt' : 'Payment'}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
