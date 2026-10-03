import re

with open('src/features/sales/PendingOrdersPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# State variables
old_state = "const [amountReceived, setAmountReceived] = useState<number | ''>('');"
new_state = """const [amountReceivedCash, setAmountReceivedCash] = useState<number | ''>('');
  const [amountReceivedBank, setAmountReceivedBank] = useState<number | ''>('');"""
code = code.replace(old_state, new_state)

# reset states on open
code = code.replace("setAmountReceived('');", "setAmountReceivedCash(''); setAmountReceivedBank('');")

# handleSettleDispatch invoke
old_invoke = """        await invoke('settle_dispatch', {
          dispatchId: currentDispatch.id,
          lines: settleLines,
          amountReceived: amountReceived === '' ? null : Number(amountReceived)
        });"""

new_invoke = """        await invoke('settle_dispatch', {
          dispatchId: currentDispatch.id,
          lines: settleLines,
          amountReceivedCash: amountReceivedCash === '' ? null : Number(amountReceivedCash),
          amountReceivedBank: amountReceivedBank === '' ? null : Number(amountReceivedBank)
        });"""
code = code.replace(old_invoke, new_invoke)

# HTML for Cash Received
old_html = """                    <tr className="bg-slate-50">
                      <td colSpan={6} className="p-4 text-right font-bold text-slate-700 text-lg">Total Cash Received:</td>
                      <td className="p-3">
                        <input 
                          type="number"
                          placeholder="Auto (Full)"
                          className="w-full p-2 border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 text-right font-bold text-lg"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                    </tr>"""

new_html = """                    <tr className="bg-slate-50">
                      <td colSpan={6} className="p-4 text-right font-bold text-slate-700 text-lg">Cash Received:</td>
                      <td className="p-3">
                        <input 
                          type="number"
                          placeholder="Auto (Full)"
                          className="w-full p-2 border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 text-right font-bold text-lg"
                          value={amountReceivedCash}
                          onChange={(e) => setAmountReceivedCash(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td colSpan={6} className="p-4 text-right font-bold text-slate-700 text-lg">Bank Received:</td>
                      <td className="p-3">
                        <input 
                          type="number"
                          placeholder="0"
                          className="w-full p-2 border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 text-right font-bold text-lg"
                          value={amountReceivedBank}
                          onChange={(e) => setAmountReceivedBank(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                    </tr>"""
code = code.replace(old_html, new_html)

with open('src/features/sales/PendingOrdersPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
