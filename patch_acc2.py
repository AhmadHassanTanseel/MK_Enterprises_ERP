import re

with open('src/features/accounts/OtherAccountsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. State
code = re.sub(
    r"const \[settleAmount, setSettleAmount\] = useState<number \| ''>\(''\);\s*const \[settleNotes, setSettleNotes\] = useState\(''\);",
    "const [settleAmount, setSettleAmount] = useState<number | ''>('');\n  const [settleNotes, setSettleNotes] = useState('');\n  const [settleMethod, setSettleMethod] = useState<'CASH' | 'BANK'>('CASH');",
    code
)

# 2. Init
code = re.sub(
    r"setSettleAmount\(Math\.abs\(account\.current_balance\)\);",
    "setSettleAmount('');\n      setSettleMethod('CASH');",
    code
)

# 3. Process receive
code = re.sub(
    r"paymentMethod: 'CASH',",
    "paymentMethod: settleMethod,",
    code
)

# 4. UI
pattern = r'<div className="flex bg-slate-100 p-1 rounded">.*?Pay Cash\s*</button>\s*</div>'
replacement = """
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
"""
code = re.sub(pattern, replacement, code, flags=re.DOTALL)

# Update button text to dynamic method
code = re.sub(
    r"Confirm Receipt",
    "Confirm {settleAction === 'receive' ? 'Receipt' : 'Payment'}",
    code
)

with open('src/features/accounts/OtherAccountsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
