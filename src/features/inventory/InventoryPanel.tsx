import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../app/context/AppContext';
import { Package, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface StockRow {
  product_id: number;
  code: string;
  name: string;
  available_stock: number;
  stock_value: number;
}

export const InventoryPanel: React.FC = () => {
  const { products } = useAppContext();
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  const loadStock = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const rows: StockRow[] = await invoke('get_live_stock');
      setStockRows(rows);
    } catch (e) {
      console.error('Failed to load live stock:', e);
      toast.error('Unable to load stock levels. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStock();
  }, [loadStock, products]);

  const productMeta = new Map(products.map(p => [p.id, p]));

  const rows = stockRows.map(row => {
    const product = productMeta.get(row.product_id);
    const reorderLevel = product?.reorder_level ?? 0;
    return {
      ...row,
      uom: product?.uom ?? 'Piece',
      reorder_level: reorderLevel,
      status: row.available_stock <= reorderLevel ? 'Low Stock' : 'Optimal',
    };
  });

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-500" /> Stock Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">Real-time inventory levels from movement ledger</p>
        </div>
        <button
          onClick={loadStock}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        {loading && (
          <p className="text-sm text-slate-500">Loading stock levels...</p>
        )}
        {error && (
          <p className="text-sm text-rose-600">{error}</p>
        )}
        {!loading && !error && (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Product Name</th>
                  <th className="px-4 py-3 font-medium text-center">UoM</th>
                  <th className="px-4 py-3 font-medium text-right">Reorder Level</th>
                  <th className="px-4 py-3 font-medium text-right">Current Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Stock Value</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No products found. Add products to see stock levels.
                    </td>
                  </tr>
                ) : (
                  rows.map(row => (
                    <tr key={row.product_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500">{row.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                      <td className="px-4 py-3 text-center">{row.uom}</td>
                      <td className="px-4 py-3 text-right">{row.reorder_level}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{row.available_stock}</td>
                      <td className="px-4 py-3 text-right">{row.stock_value.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        {row.status === 'Low Stock' ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-1 rounded-md text-xs font-bold border border-rose-200">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold border border-emerald-200">
                            Optimal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
