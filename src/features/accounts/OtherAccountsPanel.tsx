import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Users, Layout, TrendingDown, DollarSign, Activity, FileText, Plus, Building2, Edit2, Landmark, ArrowUpRight, ArrowDownRight, Printer, Search, CheckCircle2, PiggyBank, RefreshCw } from 'lucide-react';
import { printContent } from '../../utils/printHelper';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../app/context/AppContext';
import { AttendanceComponent } from './AttendanceComponent';
import { BankAccountSelect } from '../../shared/components/BankAccountSelect';

export const OtherAccountsPanel: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'assets');
  const { 
    companyAssets, 
    addCompanyAsset, 
    addCompanyAssetOpening, 
    sellCompanyAsset, 
    fixedLiabilities, 
    createFixedLiability, 
    deleteFixedLiability,
    investors,
    fetchInvestors,
    addInvestor,
    addInvestorCapital,
    payInvestorProfit,
    withdrawInvestorCapital,
    getInvestorStatement
  } = useAppContext();

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
        { id: 'banking', label: 'Bank Accounts & Cash Flow', icon: Building2 },
        { id: 'workers', label: 'Mulazmeen / Attendance', icon: Users },
        { id: 'investors', label: 'Investors / سرمایہ کاری', icon: Landmark },
        { id: 'assets', label: 'Assets', icon: Activity },
        { id: 'expenses', label: 'Expenses', icon: DollarSign },
        { id: 'adjustments', label: 'Adjustments', icon: FileText },
        { id: 'payables_receivables', label: 'Payables & Receivables', icon: Users },
        { id: 'fixed_liabilities', label: 'Fixed Liabilities', icon: TrendingDown },
      ]
    }
  ];

  

  // Investors State & Handlers
  const [investorSearch, setInvestorSearch] = useState('');

  // Add Investor Modal State
  const [isAddInvestorOpen, setIsAddInvestorOpen] = useState(false);
  const [newInvName, setNewInvName] = useState('');
  const [newInvContact, setNewInvContact] = useState('');
  const [newInvAddress, setNewInvAddress] = useState('');
  const [newInvTerms, setNewInvTerms] = useState('');
  const [newInvCapital, setNewInvCapital] = useState<number | ''>('');
  const [newInvDate, setNewInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [newInvMethod, setNewInvMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [newInvBankId, setNewInvBankId] = useState<number | null>(null);
  const [isSubmittingInvestor, setIsSubmittingInvestor] = useState(false);

  // Pay Monthly Profit Modal State
  const [isPayProfitOpen, setIsPayProfitOpen] = useState(false);
  const [selectedInvestorForProfit, setSelectedInvestorForProfit] = useState<any>(null);
  const [profitAmount, setProfitAmount] = useState<number | ''>('');
  const [profitDate, setProfitDate] = useState(new Date().toISOString().split('T')[0]);
  const [profitMonth, setProfitMonth] = useState(() => {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });
  const [profitMethod, setProfitMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [profitBankId, setProfitBankId] = useState<number | null>(null);
  const [profitNotes, setProfitNotes] = useState('');
  const [isSubmittingProfit, setIsSubmittingProfit] = useState(false);

  // Deposit Additional Capital Modal State
  const [isAddCapitalOpen, setIsAddCapitalOpen] = useState(false);
  const [selectedInvestorForCapital, setSelectedInvestorForCapital] = useState<any>(null);
  const [addCapitalAmount, setAddCapitalAmount] = useState<number | ''>('');
  const [addCapitalDate, setAddCapitalDate] = useState(new Date().toISOString().split('T')[0]);
  const [addCapitalMethod, setAddCapitalMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [addCapitalBankId, setAddCapitalBankId] = useState<number | null>(null);
  const [addCapitalNotes, setAddCapitalNotes] = useState('');
  const [isSubmittingCapital, setIsSubmittingCapital] = useState(false);

  // Withdraw Capital Modal State
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedInvestorForWithdraw, setSelectedInvestorForWithdraw] = useState<any>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [withdrawMethod, setWithdrawMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [withdrawBankId, setWithdrawBankId] = useState<number | null>(null);
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Investor Statement Modal State
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementInvestor, setStatementInvestor] = useState<any>(null);
  const [statementRecords, setStatementRecords] = useState<any[]>([]);
  const [isStatementLoading, setIsStatementLoading] = useState(false);

  const handleCreateInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvName.trim()) {
      toast.error('براہ کرم انویسٹر کا نام درج کریں');
      return;
    }
    setIsSubmittingInvestor(true);
    try {
      await addInvestor({
        name: newInvName.trim(),
        contact: newInvContact.trim() || undefined,
        address: newInvAddress.trim() || undefined,
        agreement_terms: newInvTerms.trim() || undefined,
        initial_capital: Number(newInvCapital) || 0,
        trans_date: newInvDate,
        payment_method: newInvMethod,
        bank_account_id: newInvMethod === 'BANK' ? newInvBankId : null,
      });
      toast.success('سرمایہ کار اکاؤنٹ کامیابی سے شامل ہو گیا');
      setIsAddInvestorOpen(false);
      setNewInvName('');
      setNewInvContact('');
      setNewInvAddress('');
      setNewInvTerms('');
      setNewInvCapital('');
      setNewInvMethod('CASH');
    } catch (err: any) {
      toast.error('انویسٹر شامل کرنے میں خرابی: ' + (err?.message || err));
    } finally {
      setIsSubmittingInvestor(false);
    }
  };

  const handlePayProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestorForProfit || !profitAmount || Number(profitAmount) <= 0) {
      toast.error('براہ کرم درست منافع رقم درج کریں');
      return;
    }
    setIsSubmittingProfit(true);
    try {
      await payInvestorProfit({
        investor_id: selectedInvestorForProfit.id,
        amount: Number(profitAmount),
        trans_date: profitDate,
        month_period: profitMonth.trim() || undefined,
        payment_method: profitMethod,
        bank_account_id: profitMethod === 'BANK' ? profitBankId : null,
        notes: profitNotes.trim() || undefined,
      });
      toast.success(`ماہانہ منافع کی ادائیگی کامیابی سے درج ہو گئی (${selectedInvestorForProfit.name})`);
      setIsPayProfitOpen(false);
      setSelectedInvestorForProfit(null);
      setProfitAmount('');
      setProfitNotes('');
    } catch (err: any) {
      toast.error('منافع ادائیگی میں خرابی: ' + (err?.message || err));
    } finally {
      setIsSubmittingProfit(false);
    }
  };

  const handleAddCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestorForCapital || !addCapitalAmount || Number(addCapitalAmount) <= 0) {
      toast.error('براہ کرم درست سرمایہ رقم درج کریں');
      return;
    }
    setIsSubmittingCapital(true);
    try {
      await addInvestorCapital({
        investor_id: selectedInvestorForCapital.id,
        amount: Number(addCapitalAmount),
        trans_date: addCapitalDate,
        payment_method: addCapitalMethod,
        bank_account_id: addCapitalMethod === 'BANK' ? addCapitalBankId : null,
        notes: addCapitalNotes.trim() || undefined,
      });
      toast.success(`مزید سرمایہ کاری کامیابی سے جمع ہو گئی (${selectedInvestorForCapital.name})`);
      setIsAddCapitalOpen(false);
      setSelectedInvestorForCapital(null);
      setAddCapitalAmount('');
      setAddCapitalNotes('');
    } catch (err: any) {
      toast.error('سرمایہ جمع کرنے میں خرابی: ' + (err?.message || err));
    } finally {
      setIsSubmittingCapital(false);
    }
  };

  const handleWithdrawCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestorForWithdraw || !withdrawAmount || Number(withdrawAmount) <= 0) {
      toast.error('براہ کرم درست واپسی رقم درج کریں');
      return;
    }
    if (Number(withdrawAmount) > selectedInvestorForWithdraw.current_capital) {
      toast.error(`واپسی کی رقم کل کیپیٹل بیلنس (Rs. ${selectedInvestorForWithdraw.current_capital.toLocaleString()}) سے زیادہ نہیں ہو سکتی`);
      return;
    }
    setIsSubmittingWithdraw(true);
    try {
      await withdrawInvestorCapital({
        investor_id: selectedInvestorForWithdraw.id,
        amount: Number(withdrawAmount),
        trans_date: withdrawDate,
        payment_method: withdrawMethod,
        bank_account_id: withdrawMethod === 'BANK' ? withdrawBankId : null,
        notes: withdrawNotes.trim() || undefined,
      });
      toast.success(`اصل سرمایہ کی واپسی کامیابی سے درج ہو گئی (${selectedInvestorForWithdraw.name})`);
      setIsWithdrawOpen(false);
      setSelectedInvestorForWithdraw(null);
      setWithdrawAmount('');
      setWithdrawNotes('');
    } catch (err: any) {
      toast.error('کیپیٹل واپسی میں خرابی: ' + (err?.message || err));
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const handleOpenStatement = async (inv: any) => {
    setStatementInvestor(inv);
    setIsStatementOpen(true);
    setIsStatementLoading(true);
    try {
      const records = await getInvestorStatement(inv.id);
      setStatementRecords(records || []);
    } catch (err: any) {
      toast.error('اسٹیٹمنٹ لوڈ کرنے میں خرابی: ' + (err?.message || err));
    } finally {
      setIsStatementLoading(false);
    }
  };

  const handlePrintStatement = () => {
    if (!statementInvestor) return;
    let runningCap = 0;
    const rowsHtml = statementRecords.map((rec) => {
      if (rec.trans_type === 'INVESTMENT') runningCap += rec.amount;
      else if (rec.trans_type === 'CAPITAL_WITHDRAWAL') runningCap -= rec.amount;

      const typeLabel = rec.trans_type === 'INVESTMENT' ? 'Capital Deposit' :
        rec.trans_type === 'PROFIT_PAYOUT' ? 'Monthly Profit Payout' : 'Capital Return / Withdrawal';
      const color = rec.trans_type === 'INVESTMENT' ? '#16a34a' :
        rec.trans_type === 'PROFIT_PAYOUT' ? '#2563eb' : '#dc2626';

      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${rec.trans_date}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600; color: ${color};">${typeLabel}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${rec.payment_method}${rec.bank_name ? ` (${rec.bank_name})` : ''}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${rec.month_period ? `[${rec.month_period}] ` : ''}${rec.notes || '-'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600;">Rs. ${Number(rec.amount).toLocaleString()}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; background: #f8fafc;">Rs. ${runningCap.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 10px;">
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #cbd5e1;">
          <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">Investor Account Statement</h2>
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 13px; color: #334155;">
            <div><strong>Investor Name:</strong> ${statementInvestor.name}</div>
            <div><strong>Contact:</strong> ${statementInvestor.contact || 'N/A'}</div>
            <div><strong>Address:</strong> ${statementInvestor.address || 'N/A'}</div>
            <div><strong>Terms:</strong> ${statementInvestor.agreement_terms || 'Standard Agreement'}</div>
          </div>
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #cbd5e1; display: flex; gap: 24px; font-size: 14px;">
            <div><strong>Total Invested:</strong> <span style="color: #16a34a; font-weight: bold;">Rs. ${Number(statementInvestor.total_investment).toLocaleString()}</span></div>
            <div><strong>Total Profit Paid:</strong> <span style="color: #2563eb; font-weight: bold;">Rs. ${Number(statementInvestor.total_profit_paid).toLocaleString()}</span></div>
            <div><strong>Current Capital Balance:</strong> <span style="color: #0f172a; font-weight: bold;">Rs. ${Number(statementInvestor.current_capital).toLocaleString()}</span></div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e3a8a; color: white;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Date</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Transaction Type</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Payment Method</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Period / Remarks</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Amount</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Capital Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="padding: 16px; text-align: center; color: #64748b;">No transactions recorded yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    printContent(`Investor Statement - ${statementInvestor.name}`, html);
  };

  // Fixed Liabilities State
  const [flName, setFlName] = useState('');
  const [flAmount, setFlAmount] = useState<number | ''>('');
  const [flFrequency, setFlFrequency] = useState('MONTHLY');

  const handleAddFixedLiability = async () => {
    if (!flName || !flAmount) {
      toast.error('Please fill name and amount');
      return;
    }
    try {
      await createFixedLiability(flName, Number(flAmount), flFrequency);
      toast.success('Fixed Liability added successfully');
      setFlName('');
      setFlAmount('');
    } catch (e: any) {
      toast.error(e);
    }
  };

  // Assets state
  const [assetTab, setAssetTab] = useState<'list' | 'buy' | 'opening' | 'sell'>('list');
  const [assetName, setAssetName] = useState('');
  const [assetPrice, setAssetPrice] = useState<number | ''>('');
  const [assetDate, setAssetDate] = useState(new Date().toISOString().split('T')[0]);
  const [assetNotes, setAssetNotes] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');

  const handleBuyAsset = async () => {
    if (!assetName || !assetPrice) {
      toast.error('Please fill name and price');
      return;
    }
    try {
      await addCompanyAsset(assetName, Number(assetPrice), assetDate);
      toast.success('Asset purchased successfully (Cash deducted)');
      setAssetTab('list');
      setAssetName('');
      setAssetPrice('');
    } catch (e: any) {
      toast.error(e.toString());
    }
  };

  const handleAddOpeningAsset = async () => {
    if (!assetName || !assetPrice) {
      toast.error('Please enter asset name and purchase price');
      return;
    }
    try {
      await addCompanyAssetOpening(assetName, Number(assetPrice), assetDate, assetNotes);
      toast.success('Existing asset added successfully (No cash deducted)');
      setAssetTab('list');
      setAssetName('');
      setAssetPrice('');
      setAssetNotes('');
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

  // View Ledger Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerAccount, setLedgerAccount] = useState<any>(null);
  const [accountLedgerEntries, setAccountLedgerEntries] = useState<any[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  const handleOpenLedger = async (account: any) => {
    setLedgerAccount(account);
    setIsLedgerModalOpen(true);
    setIsLedgerLoading(true);
    try {
      const entries = await invoke('get_account_ledger', { accountId: account.id });
      setAccountLedgerEntries(entries as any[]);
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setIsLedgerLoading(false);
    }
  };

  // Payables & Receivables: Opening Balance Modal State
  const [obModalOpen, setObModalOpen] = useState(false);
  const [obAccount, setObAccount] = useState<any>(null);
  const [obAmount, setObAmount] = useState<number | ''>('');
  const [obType, setObType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');

  const handleOpenOB = (account: any) => {
    setObAccount(account);
    setObAmount(account.opening_balance || '');
    setObType(account.opening_balance_type || 'DEBIT');
    setObModalOpen(true);
  };

  const handleSubmitOB = async () => {
    if (!obAccount) return;
    setIsSubmitting(true);
    try {
      await invoke('set_account_opening_balance', {
        accountId: obAccount.id,
        openingBalance: Number(obAmount) || 0,
        openingBalanceType: obType
      });
      toast.success(`Opening balance updated for ${obAccount.name}`);
      await fetchData();
      setObModalOpen(false);
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Party Modal State
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyType, setNewPartyType] = useState<'customer' | 'supplier' | 'both'>('customer');
  const [newPartyContact, setNewPartyContact] = useState('');
  const [newPartyOB, setNewPartyOB] = useState<number | ''>('');
  const [newPartyOBType, setNewPartyOBType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) {
      toast.error('Account Name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const isCust = newPartyType === 'customer' || newPartyType === 'both';
      const isSupp = newPartyType === 'supplier' || newPartyType === 'both';
      const typeId = isCust ? 2 : 4;
      await createAccount(
        typeId,
        newPartyName.trim(),
        newPartyContact.trim() || undefined,
        undefined,
        undefined,
        Number(newPartyOB) || 0,
        newPartyOBType,
        isCust,
        isSupp
      );
      toast.success(`Account ${newPartyName} added successfully`);
      setNewPartyName('');
      setNewPartyContact('');
      setNewPartyOB('');
      setIsAddPartyModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(`Failed to add account: ${err.toString()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

    const [prSearch, setPrSearch] = useState('');
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAccount, setSettleAccount] = useState<any>(null);
  const [settleAction, setSettleAction] = useState<'receive' | 'pay'>('receive');
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleMethod, setSettleMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [settleBankId, setSettleBankId] = useState<number | null>(null);



  const handleOpenSettle = (account: any, suggestedAction: 'receive' | 'pay') => {
    setSettleAccount(account);
    setSettleAction(suggestedAction);
    setSettleAmount('');
      setSettleMethod('CASH');
    setSettleBankId(null);
    setSettleNotes('');
    setSettleModalOpen(true);
  };

  const submitSettlement = async () => {
    if (!settleAccount || !settleAmount || Number(settleAmount) <= 0) return;
    setIsSubmitting(true);
    try {
      await invoke('process_cash_transaction', {
        transType: settleAction === 'receive' ? 'RECEIVE' : 'PAYMENT',
        accountId: settleAccount.id,
        amount: Number(settleAmount),
        transDate: new Date().toISOString().split('T')[0],
        description: settleNotes,
        paymentMethod: settleMethod,
        refNo: null,
        attachmentPath: null,
        bankAccountId: settleMethod === 'BANK' ? settleBankId : null
      });
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
  const [expPaymentMethod, setExpPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [expBankId, setExpBankId] = useState<number | null>(null);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { accountTypes, accounts, postJournalEntry, fetchData, ledgerEntries, products, createAccount, createBankAccount, updateAccount } = useAppContext();

  // Bank Accounts State & Calculations
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [bankNickname, setBankNickname] = useState('');
  const [bankNameInput, setBankNameInput] = useState('');
  const [bankAccountTitle, setBankAccountTitle] = useState('Zawar Traders');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankOB, setBankOB] = useState<number | ''>('');
  const [bankOBType, setBankOBType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [isBankSubmitting, setIsBankSubmitting] = useState(false);

  // Edit Bank Account State
  const [isEditBankModalOpen, setIsEditBankModalOpen] = useState(false);
  const [editingBankAcc, setEditingBankAcc] = useState<any>(null);
  const [editBankName, setEditBankName] = useState('');
  const [editAccountTitle, setEditAccountTitle] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editBankNickname, setEditBankNickname] = useState('');
  const [editBankOB, setEditBankOB] = useState<number | string>('');
  const [editBankOBType, setEditBankOBType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');

  // Fixed Liability Payment State
  const [payLiabilityModalOpen, setPayLiabilityModalOpen] = useState(false);
  const [payingLiability, setPayingLiability] = useState<any>(null);
  const [payLiabAmount, setPayLiabAmount] = useState<number | ''>('');
  const [payLiabMethod, setPayLiabMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [payLiabBankId, setPayLiabBankId] = useState<number | null>(null);
  const [payLiabDate, setPayLiabDate] = useState(new Date().toISOString().split('T')[0]);
  const [payLiabNotes, setPayLiabNotes] = useState('');
  const [isPayingLiab, setIsPayingLiab] = useState(false);

  const bankAccountsList = accounts.filter(a => (a.account_type_id === 1 && a.id !== 1) || !!a.bank_name);
  const cashInDrawerAcc = accounts.find(a => a.id === 1);
  const totalInBanks = bankAccountsList.reduce((sum, b) => sum + (b.current_balance ?? 0), 0);
  const totalInCashDrawer = cashInDrawerAcc ? (cashInDrawerAcc.current_balance ?? 0) : 0;

  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankNameInput.trim() || !bankAccountNumber.trim()) {
      toast.error('Bank Name and Account Number are required');
      return;
    }
    const displayName = bankNickname.trim() || `${bankNameInput.trim()} (${bankAccountNumber.slice(-4)})`;
    setIsBankSubmitting(true);
    try {
      await createBankAccount(
        displayName,
        bankNameInput.trim(),
        bankAccountTitle.trim() || 'Zawar Traders',
        bankAccountNumber.trim(),
        Number(bankOB) || 0,
        bankOBType
      );
      toast.success(`Bank account ${displayName} created successfully!`);
      setIsAddBankModalOpen(false);
      setBankNickname('');
      setBankNameInput('');
      setBankAccountTitle('Zawar Traders');
      setBankAccountNumber('');
      setBankOB('');
      setBankOBType('DEBIT');
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setIsBankSubmitting(false);
    }
  };

  const handleOpenEditBank = (acc: any) => {
    setEditingBankAcc(acc);
    setEditBankName(acc.bank_name || acc.name || '');
    setEditAccountTitle(acc.account_title || acc.name || '');
    setEditAccountNumber(acc.account_number || '');
    setEditBankNickname(acc.name || '');
    setEditBankOB(acc.opening_balance ?? 0);
    setEditBankOBType(acc.opening_balance_type === 'CREDIT' ? 'CREDIT' : 'DEBIT');
    setIsEditBankModalOpen(true);
  };

  const handleUpdateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankAcc) return;
    if (!editBankName.trim() || !editAccountNumber.trim()) {
      toast.error('بینک کا نام اور اکاؤنٹ نمبر لازمی ہیں (Bank name and account number required)');
      return;
    }
    const displayName = editBankNickname.trim() || `${editBankName.trim()} (${editAccountNumber.slice(-4)})`;
    setIsBankSubmitting(true);
    try {
      await updateAccount(
        editingBankAcc.id,
        editingBankAcc.account_type_id || 1,
        displayName,
        editingBankAcc.contact || undefined,
        editingBankAcc.address || undefined,
        editingBankAcc.area_id || undefined,
        Number(editBankOB) || 0,
        editBankOBType,
        false,
        false,
        editBankName.trim(),
        editAccountTitle.trim(),
        editAccountNumber.trim(),
        editingBankAcc.wage_type || undefined,
        editingBankAcc.salary_rate || undefined
      );
      toast.success(`بینک اکاؤنٹ "${displayName}" تبدیل کر دیا گیا ہے!`);
      setIsEditBankModalOpen(false);
      setEditingBankAcc(null);
      await fetchData();
    } catch (err: any) {
      toast.error(`تبدیلی ناکام: ${err.toString()}`);
    } finally {
      setIsBankSubmitting(false);
    }
  };

  const handleOpenPayLiability = (fl: any) => {
    setPayingLiability(fl);
    setPayLiabAmount(fl.amount || '');
    setPayLiabMethod('CASH');
    setPayLiabBankId(null);
    setPayLiabDate(new Date().toISOString().split('T')[0]);
    setPayLiabNotes(`Fixed Liability Payment: ${fl.name} (${fl.frequency})`);
    setPayLiabilityModalOpen(true);
  };

  const submitPayLiability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLiability || !payLiabAmount || Number(payLiabAmount) <= 0) {
      toast.error('درست رقم درج کریں (Valid amount required)');
      return;
    }
    if (payLiabMethod === 'BANK' && !payLiabBankId) {
      toast.error('بینک اکاؤنٹ منتخب کریں (Select a bank account)');
      return;
    }
    setIsPayingLiab(true);
    try {
      const ref = `FL-${Date.now().toString().slice(-6)}`;
      await invoke('process_cash_transaction', {
        transType: 'PAYMENT',
        accountId: 7, // Operating Expense / Liability account
        amount: Number(payLiabAmount),
        transDate: payLiabDate,
        description: payLiabNotes || `Fixed Liability Payment: ${payingLiability.name}`,
        paymentMethod: payLiabMethod,
        refNo: ref,
        attachmentPath: null,
        bankAccountId: payLiabMethod === 'BANK' ? payLiabBankId : null
      });
      toast.success(`ادائیگی برائے "${payingLiability.name}" محفوظ ہو گئی!`);
      setPayLiabilityModalOpen(false);
      setPayingLiability(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setIsPayingLiab(false);
    }
  };

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
      
      const creditAccountId = expPaymentMethod === 'BANK' && expBankId ? expBankId : 1;
      
      await postJournalEntry(
        expDate,
        [
          { accountId: accId as number, entryType: 'DR', amount: Number(expAmount), description: expDesc },
          { accountId: creditAccountId, entryType: 'CR', amount: Number(expAmount), description: expDesc }
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
              
            </div>
            <AttendanceComponent />
          </div>
        );
      case 'assets':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Company Assets</h2>
            <div className="flex flex-wrap gap-4 mb-6 border-b border-slate-200 pb-2">
              <button 
                onClick={() => setAssetTab('list')}
                className={`font-bold pb-2 px-2 ${assetTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >Assets List</button>
              <button 
                onClick={() => setAssetTab('opening')}
                className={`font-bold pb-2 px-3 flex items-center gap-1.5 ${assetTab === 'opening' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/70 rounded-t' : 'text-emerald-600 hover:text-emerald-800'}`}
              >
                <Plus className="h-4 w-4" /> Add Existing Asset (No Cash Deducted)
              </button>
              <button 
                onClick={() => setAssetTab('buy')}
                className={`font-bold pb-2 px-2 ${assetTab === 'buy' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >Purchase New Asset with Cash</button>
              <button 
                onClick={() => setAssetTab('sell')}
                className={`font-bold pb-2 px-2 ${assetTab === 'sell' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >Sell Asset</button>
            </div>
            
            {assetTab === 'list' && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left border-collapse text-sm">
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
            
            {assetTab === 'opening' && (
              <div className="space-y-4 max-w-xl bg-emerald-50/50 p-6 rounded-xl border border-emerald-200">
                <div className="bg-white p-3.5 rounded-lg border border-emerald-100 shadow-xs">
                  <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                    <Activity className="h-4 w-4 text-emerald-600" /> Existing / Opening Asset (Already Owned)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Record existing assets owned before business operations or contributed as capital (e.g. Delivery Van, Shop Furniture, Display Chiller, Building, Computer System). Recording an existing asset adds it to fixed assets and owner equity <strong>without deducting any money from cash in drawer or bank</strong>.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Asset Name / Description *</label>
                  <input 
                    type="text" 
                    value={assetName} 
                    onChange={e => setAssetName(e.target.value)} 
                    placeholder="e.g. Suzuki Ravi 2021, Display Chiller 4ft, Office Counter" 
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Value / Cost (Rs) *</label>
                    <input 
                      type="number" 
                      value={assetPrice} 
                      onChange={e => setAssetPrice(Number(e.target.value) || '')} 
                      placeholder="e.g. 350000" 
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Acquisition / Opening Date</label>
                    <input 
                      type="date" 
                      value={assetDate} 
                      onChange={e => setAssetDate(e.target.value)} 
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Additional Notes / Serial / Plate # (Optional)</label>
                  <input 
                    type="text" 
                    value={assetNotes} 
                    onChange={e => setAssetNotes(e.target.value)} 
                    placeholder="e.g. Registration # LEB-2144, Model 2021" 
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                </div>
                <button 
                  onClick={handleAddOpeningAsset} 
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2 mt-2"
                >
                  <Plus className="h-4 w-4" /> Save Existing Asset (No Cash Deducted)
                </button>
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
                  <table className="w-full min-w-[800px] text-left border-collapse">
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method (ادائیگی کا طریقہ)</label>
                  <div className="flex bg-slate-100 p-1 rounded border border-slate-200">
                    <button 
                      type="button"
                      className={`flex-1 py-1.5 text-sm font-medium rounded ${expPaymentMethod === 'CASH' ? 'bg-white shadow text-emerald-600 font-bold' : 'text-slate-500'}`}
                      onClick={() => setExpPaymentMethod('CASH')}
                    >
                      Cash (کیش دراز)
                    </button>
                    <button 
                      type="button"
                      className={`flex-1 py-1.5 text-sm font-medium rounded ${expPaymentMethod === 'BANK' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-500'}`}
                      onClick={() => setExpPaymentMethod('BANK')}
                    >
                      Bank (بینک کھاتہ)
                    </button>
                  </div>
                </div>

                {expPaymentMethod === 'BANK' && (
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                    <BankAccountSelect 
                      value={expBankId} 
                      onChange={setExpBankId} 
                    />
                  </div>
                )}
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
                  <table className="w-full min-w-[800px] text-left border-collapse">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  بینک کھاتے اور کیش فلو / Bank Accounts & Cash Flow
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage all business bank accounts, track live balances and cash flow across accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBankModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Bank Account (نیا بینک کھاتہ)
              </button>
            </div>

            {/* Cash Flow Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Total in Banks (بینک بیلنس)</span>
                <p className="text-2xl font-black text-blue-900 mt-2">
                  Rs. {totalInBanks.toLocaleString()}
                </p>
                <span className="text-[11px] text-blue-600 mt-1 block">
                  Across {bankAccountsList.length} bank accounts
                </span>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Cash in Drawer (دراز میں کیش)</span>
                <p className="text-2xl font-black text-emerald-900 mt-2">
                  Rs. {totalInCashDrawer.toLocaleString()}
                </p>
                <span className="text-[11px] text-emerald-600 mt-1 block">
                  Account #1 (Cash in Drawer)
                </span>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300 rounded-xl p-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Liquid Funds (کل رقم)</span>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  Rs. {(totalInBanks + totalInCashDrawer).toLocaleString()}
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Banks + Cash in Drawer
                </span>
              </div>
            </div>

            {/* Bank Accounts Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider">
                    <th className="p-3">Bank Name (بینک)</th>
                    <th className="p-3">Account Title (عنوان)</th>
                    <th className="p-3">Account / IBAN Number (کھاتہ نمبر)</th>
                    <th className="p-3 text-right">Current Live Balance (بیلنس)</th>
                    <th className="p-3 text-center">Statement (کھاتہ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankAccountsList.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <div>
                            <div>{b.bank_name || b.name}</div>
                            {b.bank_name && b.name !== b.bank_name && (
                              <div className="text-[11px] font-normal text-slate-500">{b.name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">{b.account_title || b.name}</td>
                      <td className="p-3 font-mono text-xs text-slate-600">{b.account_number || '—'}</td>
                      <td className="p-3 text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                          (b.current_balance ?? 0) >= 0 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          Rs. {(b.current_balance ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenLedger(b)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors border border-blue-200"
                          >
                            کھاتہ دیکھیں
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditBank(b)}
                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors border border-amber-200 flex items-center gap-1"
                          >
                            <Edit2 className="h-3 w-3" /> ترمیم
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bankAccountsList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        کوئی بینک کھاتہ موجود نہیں۔ نیا بینک شامل کرنے کے لیے اوپر دیا گیا بٹن دبائیں۔
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Edit Bank Account Modal */}
            {isEditBankModalOpen && editingBankAcc && (
              <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-amber-600" />
                    بینک کھاتہ تبدیل کریں (Edit Bank Account)
                  </h3>
                  <form onSubmit={handleUpdateBankAccount} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Bank Name (بینک کا نام) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Meezan Bank, HBL, Bank Alfalah"
                        value={editBankName}
                        onChange={e => setEditBankName(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account Title (کھاتے دار کا نام) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MK Enterprises"
                        value={editAccountTitle}
                        onChange={e => setEditAccountTitle(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account / IBAN Number (کھاتہ نمبر) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 0101-0103456789 or PK60MEZN00..."
                        value={editAccountNumber}
                        onChange={e => setEditAccountNumber(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account Nickname / Branch (شناختی نام / برانچ)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Main Branch"
                        value={editBankNickname}
                        onChange={e => setEditBankNickname(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Opening Balance (ابتدائی رقم)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={editBankOB}
                          onChange={e => setEditBankOB(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Type
                        </label>
                        <select
                          value={editBankOBType}
                          onChange={e => setEditBankOBType(e.target.value as any)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        >
                          <option value="DEBIT">Debit (Deposit / بقایا)</option>
                          <option value="CREDIT">Credit (Overdrawn / منفی)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditBankModalOpen(false);
                          setEditingBankAcc(null);
                        }}
                        className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isBankSubmitting}
                        className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {isBankSubmitting ? 'تبدیل ہو رہا ہے...' : 'محفوظ کریں (Save Changes)'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add Bank Account Modal */}
            {isAddBankModalOpen && (
              <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    نیا بینک کھاتہ شامل کریں (Add Bank Account)
                  </h3>
                  <form onSubmit={handleCreateBankAccount} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Bank Name (بینک کا نام) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Meezan Bank, HBL, Bank Alfalah"
                        value={bankNameInput}
                        onChange={e => setBankNameInput(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account Title (کھاتے دار کا نام) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Zawar Traders"
                        value={bankAccountTitle}
                        onChange={e => setBankAccountTitle(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account / IBAN Number (کھاتہ نمبر) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 0101-0103456789 or PK60MEZN00..."
                        value={bankAccountNumber}
                        onChange={e => setBankAccountNumber(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account Nickname (شناختی نام - اختیاری)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Main Current Account"
                        value={bankNickname}
                        onChange={e => setBankNickname(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Opening Balance (ابتدائی رقم)
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={bankOB}
                          onChange={e => setBankOB(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                        <select
                          value={bankOBType}
                          onChange={e => setBankOBType(e.target.value as any)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="DEBIT">Debit (Asset / مثبت بیلنس)</option>
                          <option value="CREDIT">Credit (Overdraft / واجب الادا)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddBankModalOpen(false)}
                        className="px-4 py-2 hover:bg-slate-100 rounded-lg text-sm text-slate-600 font-medium"
                      >
                        Cancel (منسوخ)
                      </button>
                      <button
                        type="submit"
                        disabled={isBankSubmitting}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors disabled:opacity-50"
                      >
                        {isBankSubmitting ? 'Saving...' : 'Save Bank Account'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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

              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Search name..." 
                  value={prSearch}
                  onChange={e => setPrSearch(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-1 text-sm outline-none focus:border-blue-500 w-64"
                />
                <button
                  onClick={() => setIsAddPartyModalOpen(true)}
                  className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Add Party
                </button>
              </div>
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
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            OB: Rs. {(a.opening_balance || 0).toLocaleString()} ({a.opening_balance_type === 'CREDIT' ? 'Cr' : 'Dr'})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600">Rs. {a.current_balance.toLocaleString()}</div>
                          <div className="flex gap-2 justify-end mt-1">
                            <button 
                              onClick={() => handleOpenOB(a)}
                              className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200 transition-colors font-medium"
                              title="Set or Edit Opening Balance"
                            >
                              Opening Bal
                            </button>
                            <button 
                              onClick={() => handleOpenOB(a)}
                              className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200 transition-colors font-medium"
                              title="Set or Edit Opening Balance"
                            >
                              Opening Bal
                            </button>
                            <button 
                              onClick={() => handleOpenLedger(a)}
                              className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-300 transition-colors font-medium"
                            >
                              View Ledger
                            </button>
                            <button 
                              onClick={() => handleOpenSettle(a, 'receive')}
                              className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors"
                            >
                              Settle Balance
                            </button>
                          </div>
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
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            OB: Rs. {(a.opening_balance || 0).toLocaleString()} ({a.opening_balance_type === 'CREDIT' ? 'Cr' : 'Dr'})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-rose-600">Rs. {Math.abs(a.current_balance).toLocaleString()}</div>
                            <div className="flex gap-2 justify-end mt-1">
                              <button 
                                onClick={() => handleOpenLedger(a)}
                                className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-300 transition-colors font-medium"
                              >
                                View Ledger
                              </button>
                              <button 
                                onClick={() => handleOpenSettle(a, 'pay')}
                                className="text-xs bg-rose-600 text-white px-2 py-1 rounded hover:bg-rose-700 transition-colors"
                              >
                                Settle Balance
                              </button>
                            </div>
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
                     <div className="flex gap-2 items-center">
                       <button 
                         onClick={() => handleOpenOB(a)}
                         className="text-xs text-amber-700 hover:underline"
                       >
                         Opening Bal
                       </button>
                       <button 
                         onClick={() => handleOpenSettle(a, 'receive')}
                         className="text-xs text-blue-600 hover:underline"
                       >
                         Add Transaction
                       </button>
                     </div>
                   </div>
                ))}
              </div>
            </div>
            </>
            )}

            {prViewTab === 'history' && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg mt-6">
                <table className="w-full min-w-[800px] text-left border-collapse">
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
                    
                      <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <span className="text-sm font-medium text-slate-600">Current Balance:</span>
                        <span className={`text-lg font-bold ${settleAccount.current_balance > 0 ? 'text-emerald-600' : settleAccount.current_balance < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                          Rs. {Math.abs(settleAccount.current_balance).toLocaleString()} {settleAccount.current_balance > 0 ? '(Receivable)' : settleAccount.current_balance < 0 ? '(Payable)' : ''}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Direction</label>
                          <div className="flex bg-slate-100 p-1 rounded border border-slate-200">
                            <button 
                              className={`flex-1 py-1 text-sm font-medium rounded ${settleAction === 'receive' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                              onClick={() => setSettleAction('receive')}
                            >
                              Receive
                            </button>
                            <button 
                              className={`flex-1 py-1 text-sm font-medium rounded ${settleAction === 'pay' ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}
                              onClick={() => setSettleAction('pay')}
                            >
                              Pay
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
                          <div className="flex bg-slate-100 p-1 rounded border border-slate-200">
                            <button 
                              className={`flex-1 py-1 text-sm font-medium rounded ${settleMethod === 'CASH' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                              onClick={() => setSettleMethod('CASH')}
                            >
                              Cash
                            </button>
                            <button 
                              className={`flex-1 py-1 text-sm font-medium rounded ${settleMethod === 'BANK' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                              onClick={() => setSettleMethod('BANK')}
                            >
                              Bank
                            </button>
                          </div>
                        </div>
                      </div>

                      {settleMethod === 'BANK' && (
                        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                          <BankAccountSelect 
                            value={settleBankId} 
                            onChange={setSettleBankId} 
                          />
                        </div>
                      )}


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

            {/* OPENING BALANCE MODAL */}
            {obModalOpen && obAccount && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                    <h3 className="font-bold text-slate-800">Set Opening Balance: {obAccount.name}</h3>
                    <button onClick={() => setObModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="text-sm text-slate-500">
                      Enter the prior balance carried forward for this party's Khata before entering invoices.
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance (Rs.)</label>
                      <div className="flex">
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          value={obAmount} 
                          onChange={e => setObAmount(Number(e.target.value) || '')} 
                          className="w-full border border-slate-300 rounded-l p-2 outline-none focus:border-amber-500" 
                          placeholder="0.00"
                          autoFocus
                        />
                        <select 
                          value={obType} 
                          onChange={e => setObType(e.target.value as any)}
                          className="border border-slate-300 border-l-0 rounded-r p-2 bg-slate-50 outline-none font-medium"
                        >
                          <option value="DEBIT">Dr (Receivable / Lena)</option>
                          <option value="CREDIT">Cr (Payable / Dena)</option>
                        </select>
                      </div>
                    </div>
                    <button 
                      onClick={handleSubmitOB} 
                      disabled={isSubmitting}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Opening Balance'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* QUICK ADD PARTY MODAL */}
            {isAddPartyModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
                    <h3 className="font-bold text-slate-800">Add New Khata Party</h3>
                    <button onClick={() => setIsAddPartyModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
                  </div>
                  <form onSubmit={handleCreateParty} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Party / Account Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={newPartyName} 
                        onChange={e => setNewPartyName(e.target.value)} 
                        className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" 
                        placeholder="e.g. Aslam Goods"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Party Type *</label>
                      <select 
                        value={newPartyType} 
                        onChange={e => setNewPartyType(e.target.value as any)}
                        className="w-full border border-slate-300 rounded p-2 outline-none bg-white"
                      >
                        <option value="customer">Customer (Receivables)</option>
                        <option value="supplier">Supplier (Payables)</option>
                        <option value="both">Both (Customer & Supplier)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact / Mobile</label>
                      <input 
                        type="text" 
                        value={newPartyContact} 
                        onChange={e => setNewPartyContact(e.target.value)} 
                        className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" 
                        placeholder="0300-1234567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance</label>
                      <div className="flex">
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          value={newPartyOB} 
                          onChange={e => setNewPartyOB(Number(e.target.value) || '')} 
                          className="w-full border border-slate-300 rounded-l p-2 outline-none focus:border-blue-500" 
                          placeholder="0.00"
                        />
                        <select 
                          value={newPartyOBType} 
                          onChange={e => setNewPartyOBType(e.target.value as any)}
                          className="border border-slate-300 border-l-0 rounded-r p-2 bg-slate-50 outline-none font-medium"
                        >
                          <option value="DEBIT">Dr (Lena)</option>
                          <option value="CREDIT">Cr (Dena)</option>
                        </select>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Party & Save Khata'}
                    </button>
                  </form>
                </div>
              </div>
            )}

                case 'fixed_liabilities':
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Fixed Liabilities</h2>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input type="text" value={flName} onChange={e => setFlName(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Rent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (Rs.)</label>
                  <input type="number" value={flAmount} onChange={e => setFlAmount(Number(e.target.value) || '')} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                  <select value={flFrequency} onChange={e => setFlFrequency(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="DAILY">Daily</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={handleAddFixedLiability} className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                    Add Liability
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Frequency</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fixedLiabilities.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No fixed liabilities configured.</td></tr>
                    ) : (
                      fixedLiabilities.map(fl => (
                        <tr key={fl.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{fl.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${fl.frequency === 'DAILY' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                              {fl.frequency}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">Rs. {fl.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPayLiability(fl)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-xs"
                              >
                                ادائیگی کریں (Pay)
                              </button>
                              <button onClick={() => deleteFixedLiability(fl.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            {/* Pay Fixed Liability Modal */}
            {payLiabilityModalOpen && payingLiability && (
              <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-emerald-600" />
                    ادائیگی برائے: {payingLiability.name}
                  </h3>
                  <form onSubmit={submitPayLiability} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم (Payment Amount Rs.) *
                      </label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={payLiabAmount}
                        onChange={e => setPayLiabAmount(Number(e.target.value) || '')}
                        className="w-full border border-slate-300 rounded-lg p-2 text-base font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ادائیگی کا ذریعہ (Payment Method) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPayLiabMethod('CASH')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            payLiabMethod === 'CASH'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          💵 کیش (Cash in Drawer)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayLiabMethod('BANK')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            payLiabMethod === 'BANK'
                              ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          🏦 بینک اکاؤنٹ (Bank)
                        </button>
                      </div>
                    </div>

                    {payLiabMethod === 'BANK' && (
                      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                        <label className="block text-xs font-bold text-slate-700 mb-1">بینک اکاؤنٹ منتخب کریں:</label>
                        <BankAccountSelect
                          value={payLiabBankId}
                          onChange={setPayLiabBankId}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ (Date)</label>
                      <input
                        type="date"
                        value={payLiabDate}
                        onChange={e => setPayLiabDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تفصیل / نوٹس (Notes)</label>
                      <input
                        type="text"
                        value={payLiabNotes}
                        onChange={e => setPayLiabNotes(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g. Rent for this month"
                      />
                    </div>

                    <div className="flex gap-3 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setPayLiabilityModalOpen(false);
                          setPayingLiability(null);
                        }}
                        className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPayingLiab}
                        className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {isPayingLiab ? 'ادائیگی جاری ہے...' : 'ادائیگی تصدیق کریں (Confirm Pay)'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            </div>
          );

      case 'investors': {
        const filteredInvestors = investors.filter(inv =>
          inv.name.toLowerCase().includes(investorSearch.toLowerCase()) ||
          (inv.contact && inv.contact.includes(investorSearch)) ||
          (inv.address && inv.address.toLowerCase().includes(investorSearch.toLowerCase()))
        );

        const totalInvestedSum = investors.reduce((sum, i) => sum + (i.total_investment || 0), 0);
        const totalProfitPaidSum = investors.reduce((sum, i) => sum + (i.total_profit_paid || 0), 0);
        const currentCapitalSum = investors.reduce((sum, i) => sum + (i.current_capital || 0), 0);

        return (
          <div className="space-y-6">
            {/* Header & KPI Summary Cards */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Landmark className="h-6 w-6 text-blue-600" />
                  Investor Accounts & Capital Management (سرمایہ کار کھاتے)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  کاروباری سرمایہ کار، ان کا اصل کیپیٹل، اور ماہانہ منافع کی تقسیم کا ریکارڈ
                </p>
              </div>

              <button
                onClick={() => setIsAddInvestorOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
              >
                <Plus className="h-4 w-4" />
                نیا سرمایہ کار شامل کریں (Add Investor)
              </button>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">کل سرمایہ کار (Total Investors)</div>
                  <div className="text-xl font-bold text-slate-800">{investors.length}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">کل موصولہ سرمایہ (Total Invested)</div>
                  <div className="text-xl font-bold text-emerald-600">
                    Rs. {totalInvestedSum.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">ادا شدہ ماہانہ منافع (Total Profit Paid)</div>
                  <div className="text-xl font-bold text-purple-600">
                    Rs. {totalProfitPaidSum.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">موجودہ اصل کیپیٹل (Current Capital)</div>
                  <div className="text-xl font-bold text-slate-900">
                    Rs. {currentCapitalSum.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="سرمایہ کار تلاش کریں (نام، فون، یا پتہ)..."
                  value={investorSearch}
                  onChange={(e) => setInvestorSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              {investorSearch && (
                <button
                  onClick={() => setInvestorSearch('')}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Investors Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5">سرمایہ کار (Investor)</th>
                      <th className="p-3.5">معاہدہ / منافع شرح (Terms)</th>
                      <th className="p-3.5 text-right">کل سرمایہ کاری (Total Invested)</th>
                      <th className="p-3.5 text-right">ادا شدہ منافع (Profit Paid)</th>
                      <th className="p-3.5 text-right">موجودہ کیپیٹل (Current Capital)</th>
                      <th className="p-3.5 text-center">آخری منافع ادائیگی</th>
                      <th className="p-3.5 text-center">ایکشنز (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvestors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          کوئی سرمایہ کار نہیں ملا۔ اوپر موجود بٹن سے نیا سرمایہ کار شامل کریں۔
                        </td>
                      </tr>
                    ) : (
                      filteredInvestors.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800 text-sm">{inv.name}</div>
                            <div className="text-[11px] text-slate-500 flex gap-2 mt-0.5">
                              {inv.contact && <span>📞 {inv.contact}</span>}
                              {inv.address && <span>📍 {inv.address}</span>}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-semibold text-[11px] border border-blue-100">
                              {inv.agreement_terms || 'Standard Agreement'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-semibold text-emerald-600 text-sm">
                            Rs. {Number(inv.total_investment || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-semibold text-purple-600 text-sm">
                            Rs. {Number(inv.total_profit_paid || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-900 text-sm">
                            Rs. {Number(inv.current_capital || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center text-slate-500 text-[11px]">
                            {inv.last_payout_date || '—'}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Pay Profit Button */}
                              <button
                                onClick={() => {
                                  setSelectedInvestorForProfit(inv);
                                  setProfitAmount('');
                                  setProfitNotes('');
                                  setIsPayProfitOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                                title="ماہانہ منافع ادا کریں"
                              >
                                <DollarSign className="h-3 w-3" />
                                منافع ادائیگی
                              </button>

                              {/* Add Additional Capital */}
                              <button
                                onClick={() => {
                                  setSelectedInvestorForCapital(inv);
                                  setAddCapitalAmount('');
                                  setAddCapitalNotes('');
                                  setIsAddCapitalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                                title="مزید سرمایہ جمع کریں"
                              >
                                <Plus className="h-3 w-3" />
                                +سرمایہ
                              </button>

                              {/* Withdraw Capital */}
                              <button
                                onClick={() => {
                                  setSelectedInvestorForWithdraw(inv);
                                  setWithdrawAmount('');
                                  setWithdrawNotes('');
                                  setIsWithdrawOpen(true);
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-medium text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                                title="اصل سرمایہ واپس کریں"
                              >
                                <ArrowUpRight className="h-3 w-3" />
                                واپسی
                              </button>

                              {/* View Statement */}
                              <button
                                onClick={() => handleOpenStatement(inv)}
                                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded font-medium text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                                title="اسٹیٹمنٹ / لیجر دیکھیں"
                              >
                                <FileText className="h-3 w-3" />
                                اسٹیٹمنٹ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- MODAL 1: ADD NEW INVESTOR --- */}
            {isAddInvestorOpen && (
              <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-blue-600" />
                      نیا سرمایہ کار اکاؤنٹ شامل کریں (Add New Investor)
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsAddInvestorOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleCreateInvestor} className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        سرمایہ کار کا نام (Investor Name) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newInvName}
                        onChange={(e) => setNewInvName(e.target.value)}
                        placeholder="e.g. حاجی محمد اسلم / Haji Aslam"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          رابطہ نمبر (Phone / Mobile)
                        </label>
                        <input
                          type="text"
                          value={newInvContact}
                          onChange={(e) => setNewInvContact(e.target.value)}
                          placeholder="0300-1234567"
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          پتہ / شہر (Address)
                        </label>
                        <input
                          type="text"
                          value={newInvAddress}
                          onChange={(e) => setNewInvAddress(e.target.value)}
                          placeholder="e.g. بھوآنہ / Bhowana"
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        معاہدہ / منافع شرح (Profit Agreement Terms)
                      </label>
                      <input
                        type="text"
                        value={newInvTerms}
                        onChange={(e) => setNewInvTerms(e.target.value)}
                        placeholder="e.g. 5% Monthly Profit, or Rs. 25,000 Fixed / month"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <div className="text-xs font-bold text-slate-800 border-b pb-1">
                        ابتدائی سرمایہ کی تفصیل (Initial Capital Details)
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            سرمایہ رقم (Capital Amount Rs.)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={newInvCapital}
                            onChange={(e) => setNewInvCapital(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0.00"
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ (Date)</label>
                          <input
                            type="date"
                            value={newInvDate}
                            onChange={(e) => setNewInvDate(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      {Number(newInvCapital) > 0 && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            سرمایہ کی وصولی کا ذریعہ (Received In)
                          </label>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => setNewInvMethod('CASH')}
                              className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                                newInvMethod === 'CASH'
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              💵 کیش دراز (Cash in Drawer)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewInvMethod('BANK')}
                              className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                                newInvMethod === 'BANK'
                                  ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              🏦 بینک اکاؤنٹ (Bank)
                            </button>
                          </div>

                          {newInvMethod === 'BANK' && (
                            <BankAccountSelect
                              value={newInvBankId}
                              onChange={setNewInvBankId}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => setIsAddInvestorOpen(false)}
                        className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                      >
                        کینسل (Cancel)
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingInvestor}
                        className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isSubmittingInvestor ? 'شامل ہو رہا ہے...' : 'محفوظ کریں (Save Investor)'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* --- MODAL 2: PAY MONTHLY PROFIT --- */}
            {isPayProfitOpen && selectedInvestorForProfit && (
              <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-emerald-50">
                    <div>
                      <h2 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        ماہانہ منافع کی ادائیگی (Pay Monthly Profit)
                      </h2>
                      <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                        {selectedInvestorForProfit.name} | کیپیٹل: Rs. {Number(selectedInvestorForProfit.current_capital).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPayProfitOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handlePayProfit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          منافع رقم (Profit Amount Rs.) *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="any"
                          value={profitAmount}
                          onChange={(e) => setProfitAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-700 text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          مہینہ / دورانیہ (Month / Period)
                        </label>
                        <input
                          type="text"
                          value={profitMonth}
                          onChange={(e) => setProfitMonth(e.target.value)}
                          placeholder="e.g. October 2026"
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ادائیگی کا ذریعہ (Paid From) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setProfitMethod('CASH')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            profitMethod === 'CASH'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          💵 کیش دراز (Cash in Drawer)
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfitMethod('BANK')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            profitMethod === 'BANK'
                              ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          🏦 بینک اکاؤنٹ (Bank)
                        </button>
                      </div>
                    </div>

                    {profitMethod === 'BANK' && (
                      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                        <BankAccountSelect
                          value={profitBankId}
                          onChange={setProfitBankId}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ (Date)</label>
                        <input
                          type="date"
                          value={profitDate}
                          onChange={(e) => setProfitDate(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          چیک نمبر / حوالہ (Ref / Cheque)
                        </label>
                        <input
                          type="text"
                          value={profitNotes}
                          onChange={(e) => setProfitNotes(e.target.value)}
                          placeholder="e.g. Cheque # 12345"
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => setIsPayProfitOpen(false)}
                        className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                      >
                        کینسل (Cancel)
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingProfit}
                        className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isSubmittingProfit ? 'ادائیگی جاری ہے...' : 'منافع کی ادائیگی تصدیق کریں'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* --- MODAL 3: DEPOSIT ADDITIONAL CAPITAL --- */}
            {isAddCapitalOpen && selectedInvestorForCapital && (
              <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-blue-50">
                    <div>
                      <h2 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-600" />
                        مزید سرمایہ کاری جمع کریں (Add Additional Capital)
                      </h2>
                      <p className="text-xs text-blue-700 font-semibold mt-0.5">
                        {selectedInvestorForCapital.name} | موجودہ کیپیٹل: Rs. {Number(selectedInvestorForCapital.current_capital).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddCapitalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleAddCapital} className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        اضافی سرمایہ رقم (Additional Capital Rs.) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="any"
                        value={addCapitalAmount}
                        onChange={(e) => setAddCapitalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700 text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        سرمایہ وصولی کا ذریعہ (Received In) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAddCapitalMethod('CASH')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            addCapitalMethod === 'CASH'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          💵 کیش دراز (Cash in Drawer)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddCapitalMethod('BANK')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            addCapitalMethod === 'BANK'
                              ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          🏦 بینک اکاؤنٹ (Bank)
                        </button>
                      </div>
                    </div>

                    {addCapitalMethod === 'BANK' && (
                      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                        <BankAccountSelect
                          value={addCapitalBankId}
                          onChange={setAddCapitalBankId}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ (Date)</label>
                        <input
                          type="date"
                          value={addCapitalDate}
                          onChange={(e) => setAddCapitalDate(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">نوٹس (Notes)</label>
                        <input
                          type="text"
                          value={addCapitalNotes}
                          onChange={(e) => setAddCapitalNotes(e.target.value)}
                          placeholder="e.g. Additional investment"
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => setIsAddCapitalOpen(false)}
                        className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                      >
                        کینسل (Cancel)
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingCapital}
                        className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isSubmittingCapital ? 'جمع ہو رہا ہے...' : 'سرمایہ جمع کریں (Confirm Deposit)'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* --- MODAL 4: WITHDRAW CAPITAL --- */}
            {isWithdrawOpen && selectedInvestorForWithdraw && (
              <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-amber-50">
                    <div>
                      <h2 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-amber-600" />
                        اصل سرمایہ کی واپسی (Capital Withdrawal / Return)
                      </h2>
                      <p className="text-xs text-amber-700 font-semibold mt-0.5">
                        {selectedInvestorForWithdraw.name} | موجودہ کیپیٹل بیلنس: Rs. {Number(selectedInvestorForWithdraw.current_capital).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWithdrawOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleWithdrawCapital} className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        واپسی رقم (Withdrawal Amount Rs.) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max={selectedInvestorForWithdraw.current_capital}
                        step="any"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-bold text-amber-800 text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ادائیگی کا ذریعہ (Paid From) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWithdrawMethod('CASH')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            withdrawMethod === 'CASH'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          💵 کیش دراز (Cash in Drawer)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWithdrawMethod('BANK')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            withdrawMethod === 'BANK'
                              ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          🏦 بینک اکاؤنٹ (Bank)
                        </button>
                      </div>
                    </div>

                    {withdrawMethod === 'BANK' && (
                      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                        <BankAccountSelect
                          value={withdrawBankId}
                          onChange={setWithdrawBankId}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ (Date)</label>
                        <input
                          type="date"
                          value={withdrawDate}
                          onChange={(e) => setWithdrawDate(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">تفصیل / نوٹس</label>
                        <input
                          type="text"
                          value={withdrawNotes}
                          onChange={(e) => setWithdrawNotes(e.target.value)}
                          placeholder="e.g. Principal return"
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => setIsWithdrawOpen(false)}
                        className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                      >
                        کینسل (Cancel)
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingWithdraw}
                        className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isSubmittingWithdraw ? 'واپسی جاری ہے...' : 'کیپیٹل واپسی تصدیق کریں'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* --- MODAL 5: INVESTOR STATEMENT --- */}
            {isStatementOpen && statementInvestor && (
              <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-200">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-blue-600" />
                        سرمایہ کار کھاتہ اسٹیٹمنٹ (Investor Account Statement)
                      </h2>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {statementInvestor.name} | معاہدہ: {statementInvestor.agreement_terms || 'Standard'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsStatementOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex flex-wrap gap-6 text-xs">
                    <div>
                      <span className="text-slate-500">کل موصولہ سرمایہ:</span>{' '}
                      <strong className="text-emerald-600 font-bold">
                        Rs. {Number(statementInvestor.total_investment || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">کل ادا شدہ منافع:</span>{' '}
                      <strong className="text-purple-600 font-bold">
                        Rs. {Number(statementInvestor.total_profit_paid || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">موجودہ اصل کیپیٹل:</span>{' '}
                      <strong className="text-slate-900 font-bold text-sm">
                        Rs. {Number(statementInvestor.current_capital || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="p-0 overflow-y-auto flex-1">
                    {isStatementLoading ? (
                      <div className="p-8 text-center text-slate-500 text-xs">لوڈ ہو رہا ہے...</div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-xs text-[11px] uppercase">
                          <tr>
                            <th className="p-3 border-b border-slate-200 font-semibold">تاریخ (Date)</th>
                            <th className="p-3 border-b border-slate-200 font-semibold">قسم (Type)</th>
                            <th className="p-3 border-b border-slate-200 font-semibold">ذریعہ (Method)</th>
                            <th className="p-3 border-b border-slate-200 font-semibold">دورانیہ / تفصیل (Remarks)</th>
                            <th className="p-3 border-b border-slate-200 font-semibold text-right">رقم (Amount)</th>
                            <th className="p-3 border-b border-slate-200 font-semibold text-right">کیپیٹل بیلنس (Capital)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            let runningCap = 0;
                            if (statementRecords.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="p-6 text-center text-slate-500">
                                    اس سرمایہ کار کا کوئی ٹرانزیکشن ریکارڈ موجود نہیں۔
                                  </td>
                                </tr>
                              );
                            }

                            return statementRecords.map((rec, idx) => {
                              if (rec.trans_type === 'INVESTMENT') runningCap += rec.amount;
                              else if (rec.trans_type === 'CAPITAL_WITHDRAWAL') runningCap -= rec.amount;

                              const isInvest = rec.trans_type === 'INVESTMENT';
                              const isProfit = rec.trans_type === 'PROFIT_PAYOUT';
                              const isWithdraw = rec.trans_type === 'CAPITAL_WITHDRAWAL';

                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-3 text-slate-600 whitespace-nowrap">{rec.trans_date}</td>
                                  <td className="p-3">
                                    {isInvest && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        + سرمایہ کاری (Deposit)
                                      </span>
                                    )}
                                    {isProfit && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        ماہانہ منافع (Profit)
                                      </span>
                                    )}
                                    {isWithdraw && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        - کیپیٹل واپسی (Withdraw)
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-slate-600">
                                    {rec.payment_method}
                                    {rec.bank_name ? ` (${rec.bank_name})` : ''}
                                  </td>
                                  <td className="p-3 text-slate-600">
                                    {rec.month_period && (
                                      <span className="font-semibold text-blue-700 mr-1">
                                        [{rec.month_period}]
                                      </span>
                                    )}
                                    {rec.notes || '—'}
                                  </td>
                                  <td className={`p-3 text-right font-bold ${
                                    isInvest ? 'text-emerald-600' : isProfit ? 'text-purple-600' : 'text-amber-600'
                                  }`}>
                                    Rs. {Number(rec.amount).toLocaleString()}
                                  </td>
                                  <td className="p-3 text-right font-bold text-slate-900 bg-slate-50/50">
                                    Rs. {runningCap.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                    <button
                      onClick={handlePrintStatement}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-xs"
                    >
                      <Printer className="h-4 w-4" />
                      پرنٹ اسٹیٹمنٹ (Print Statement)
                    </button>
                    <button
                      onClick={() => setIsStatementOpen(false)}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      بند کریں (Close)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

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

      {/* Ledger Modal */}
      {isLedgerModalOpen && ledgerAccount && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Account Ledger</h2>
                <p className="text-slate-500 font-medium">{ledgerAccount.name} ({ledgerAccount.is_customer ? 'Customer' : 'Supplier'})</p>
              </div>
              <button onClick={() => setIsLedgerModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              {isLedgerLoading ? (
                <div className="p-8 text-center text-slate-500">Loading ledger entries...</div>
              ) : (
                <table className="w-full min-w-[800px] text-left border-collapse text-sm">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-sm">
                    <tr>
                      <th className="p-3 border-b border-slate-200 font-semibold whitespace-nowrap">Date</th>
                      <th className="p-3 border-b border-slate-200 font-semibold">Ref Type</th>
                      <th className="p-3 border-b border-slate-200 font-semibold w-1/3">Description</th>
                      <th className="p-3 border-b border-slate-200 font-semibold text-right">Debit (Dr)</th>
                      <th className="p-3 border-b border-slate-200 font-semibold text-right">Credit (Cr)</th>
                      <th className="p-3 border-b border-slate-200 font-semibold text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      let runningBalance = 0;
                      if (accountLedgerEntries.length === 0) {
                        return <tr><td colSpan={6} className="p-6 text-center text-slate-500">No transactions found for this account.</td></tr>;
                      }
                      
                      return accountLedgerEntries.map((entry, idx) => {
                        // Assuming Asset (Customer) increases with Debit, Liability (Supplier) increases with Credit
                        if (ledgerAccount.is_customer) {
                          runningBalance += (entry.debit - entry.credit);
                        } else {
                          runningBalance += (entry.credit - entry.debit);
                        }
                        
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 whitespace-nowrap text-slate-600">{entry.entry_date}</td>
                            <td className="p-3 text-slate-600 font-medium">{entry.voucher_type}</td>
                            <td className="p-3 text-slate-500">{entry.narration || '-'}</td>
                            <td className="p-3 text-right text-emerald-600 font-medium">
                              {entry.debit > 0 ? entry.debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                            </td>
                            <td className="p-3 text-right text-red-500 font-medium">
                              {entry.credit > 0 ? entry.credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                            </td>
                            <td className="p-3 text-right text-slate-800 font-bold bg-slate-50/50">
                              {runningBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                              <span className="text-xs text-slate-400 font-normal ml-1">
                                {ledgerAccount.is_customer ? (runningBalance >= 0 ? 'Dr' : 'Cr') : (runningBalance >= 0 ? 'Cr' : 'Dr')}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-between items-center">
              <p className="text-sm text-slate-500 italic">* Chronological statement of account. Balance reflects Dr-Cr for Customers, Cr-Dr for Suppliers.</p>
              <button onClick={() => setIsLedgerModalOpen(false)} className="px-6 py-2 bg-slate-800 text-white font-medium hover:bg-slate-900 rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
