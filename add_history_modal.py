import re

with open('src/features/inventory/ProductsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update imports
code = code.replace("import { Plus, Edit2, Search, Filter, Trash2, X, Copy } from 'lucide-react';", "import { Plus, Edit2, Search, Filter, Trash2, X, Copy, History } from 'lucide-react';")
code = code.replace("import { useAppContext, Product } from '../../app/context/AppContext';", "import { useAppContext, Product } from '../../app/context/AppContext';\nimport { invoke } from '@tauri-apps/api/core';")

# 2. Add state and handlers
state_code = """
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const openHistory = async (prod: Product) => {
    setSelectedProduct(prod);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const data = await invoke('get_product_purchase_history', { productId: prod.id });
      setPurchaseHistory(data as any[]);
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setLoadingHistory(false);
    }
  };
"""
code = code.replace("const [isSubmitting, setIsSubmitting] = useState(false);", state_code + "\n  const [isSubmitting, setIsSubmitting] = useState(false);")

# 3. Add button in the table row
button_code = """                    <button onClick={() => openHistory(prod)} className="text-amber-600 hover:text-amber-800 p-1 rounded-md hover:bg-amber-50 transition-colors" title="Purchase History">
                      <History className="h-4 w-4" />
                    </button>"""
code = code.replace('<button onClick={() => handleDuplicate(prod)}', button_code + '\n                    <button onClick={() => handleDuplicate(prod)}')

# 4. Add Modal at the end of the file, before the last </div>
modal_code = """
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-800/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Purchase History: {selectedProduct?.name}</h2>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1 bg-slate-50">
              {loadingHistory ? (
                <div className="text-center py-8 text-slate-500">Loading history...</div>
              ) : purchaseHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No purchase history found for this product.</div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Invoice No</th>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseHistory.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600">{new Date(h.invoice_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-mono text-xs">{h.invoice_no}</td>
                          <td className="px-4 py-3 text-slate-800 font-medium">{h.supplier_name}</td>
                          <td className="px-4 py-3 text-right text-slate-800">{h.qty}</td>
                          <td className="px-4 py-3 text-right text-slate-600">Rs. {h.unit_price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-800 font-medium">Rs. {h.total_price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
"""
code = code.replace("    </div>\n  );\n};\n", modal_code + "    </div>\n  );\n};\n")

with open('src/features/inventory/ProductsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
