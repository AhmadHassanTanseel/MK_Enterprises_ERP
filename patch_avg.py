import re

with open('src/features/inventory/ProductsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add state for filter limit
code = re.sub(
    r"const \[loadingHistory, setLoadingHistory\] = useState\(false\);",
    "const [loadingHistory, setLoadingHistory] = useState(false);\n  const [historyFilterLimit, setHistoryFilterLimit] = useState<string>('all');",
    code
)

# 2. Modify modal header and content to calculate and show average price
# The modal header starts at `<div className="flex justify-between items-center p-6 border-b border-slate-100">`
modal_header = r"""<div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Purchase History: \{selectedProduct\?\.name\}</h2>
              <button onClick=\{\(\) => setHistoryModalOpen\(false\)\} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>"""

new_modal_header = r"""<div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Purchase History: {selectedProduct?.name}</h2>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {!loadingHistory && purchaseHistory.length > 0 && (
              <div className="px-6 py-4 bg-white flex flex-row justify-between items-center border-b border-slate-100 shadow-sm z-10 relative">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-slate-600">Average of:</label>
                  <select 
                    value={historyFilterLimit} 
                    onChange={e => setHistoryFilterLimit(e.target.value)}
                    className="p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Previous Orders</option>
                    <option value="5">Last 5 Orders</option>
                    <option value="10">Last 10 Orders</option>
                    <option value="20">Last 20 Orders</option>
                  </select>
                </div>
                
                {(() => {
                  const limit = historyFilterLimit === 'all' ? purchaseHistory.length : Number(historyFilterLimit);
                  const filtered = purchaseHistory.slice(0, limit);
                  let totalQty = 0;
                  let totalCost = 0;
                  filtered.forEach(h => {
                    totalQty += h.qty;
                    totalCost += h.unit_price * h.qty;
                  });
                  const avg = totalQty > 0 ? (totalCost / totalQty) : 0;
                  
                  return (
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Weighted Average Unit Price</span>
                      <span className="text-xl font-bold text-emerald-600">Rs. {avg.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  );
                })()}
              </div>
            )}"""

code = re.sub(modal_header, new_modal_header, code)

# 3. Apply the filter to the table render
table_render = r"""\{purchaseHistory\.map\(\(h, i\) => \("""
new_table_render = r"""{(historyFilterLimit === 'all' ? purchaseHistory : purchaseHistory.slice(0, Number(historyFilterLimit))).map((h, i) => ("""

code = re.sub(table_render, new_table_render, code)

# 4. Also reset filter when opening modal
open_history = r"""const openHistory = async \(prod: Product\) => \{
    setSelectedProduct\(prod\);
    setHistoryModalOpen\(true\);
    setLoadingHistory\(true\);"""
new_open_history = """const openHistory = async (prod: Product) => {
    setSelectedProduct(prod);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    setHistoryFilterLimit('all');"""

code = re.sub(open_history, new_open_history, code)

with open('src/features/inventory/ProductsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
