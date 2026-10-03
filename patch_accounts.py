import re

with open('src/features/accounts/OtherAccountsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add state for payment method
old_state = """  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNotes, setSettleNotes] = useState('');"""
new_state = """  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleMethod, setSettleMethod] = useState<'CASH' | 'BANK'>('CASH');"""
code = code.replace(old_state, new_state)

# 2. Reset amount and notes
old_init = """    const handleOpenSettle = (account: any, suggestedAction: 'receive' | 'pay') => {
      setSettleAccount(account);
      setSettleAction(suggestedAction);
      setSettleAmount(Math.abs(account.current_balance));
      setSettleNotes(`Settlement for ${account.name}`);
      setSettleModalOpen(true);
    };"""
new_init = """    const handleOpenSettle = (account: any, suggestedAction: 'receive' | 'pay') => {
      setSettleAccount(account);
      setSettleAction(suggestedAction);
      setSettleAmount('');
      setSettleNotes(`Settlement for ${account.name}`);
      setSettleMethod('CASH');
      setSettleModalOpen(true);
    };"""
code = code.replace(old_init, new_init)

# 3. Update submit process
old_receive = """        if (settleAction === 'receive') {
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
            refNo: null,"""

new_receive = """        if (settleAction === 'receive') {
          // We receive cash/bank: Debit Cash/Bank, Credit Account
          await invoke('process_cash_transaction', {
            transType: 'RECEIVE',
            accountId: settleAccount.id,
            amount: Number(settleAmount),
            transDate: new Date().toISOString().split('T')[0],
            description: settleNotes,
            paymentMethod: settleMethod,
            refNo: null,
            attachmentPath: null
          });
        } else {
          // We pay cash/bank: Credit Cash/Bank, Debit Account
          await invoke('process_cash_transaction', {
            transType: 'PAYMENT',
            accountId: settleAccount.id,
            amount: Number(settleAmount),
            transDate: new Date().toISOString().split('T')[0],
            description: settleNotes,
            paymentMethod: settleMethod,
            refNo: null,"""
code = code.replace(old_receive, new_receive)

# 4. Add UI elements
old_ui = """                    <div className="p-6 space-y-4">
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
                      </div>"""

new_ui = """                    <div className="p-6 space-y-4">
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
                      </div>"""
code = code.replace(old_ui, new_ui)


with open('src/features/accounts/OtherAccountsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
