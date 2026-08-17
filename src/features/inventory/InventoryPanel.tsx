import React from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { Package, AlertTriangle } from 'lucide-react';

export const InventoryPanel: React.FC = () => {
  const { products, inventoryMovements } = useAppContext();

  // Calculate real-time stock
  const stockMap = new Map<number, number>();
  products.forEach(p => stockMap.set(p.id, p.opening_stock));
  inventoryMovements.forEach(m => {
    const current = stockMap.get(m.product_id) || 0;
    stockMap.set(m.product_id, current + m.qty_in - m.qty_out);
  });

  const stockRows = products.map(p => ({
    ...p,
    current_stock: stockMap.get(p.id) || 0,
    status: (stockMap.get(p.id) || 0) <= (p.reorder_level || 0) ? 'Low Stock' : 'Optimal'
  }));

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Package className="h-6 w-6 text-indigo-500" /> Stock Dashboard
        </h2>
        <p className="text-sm text-slate-500 mt-1">Real-time inventory levels and reorder alerts</p>
      </div>

      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Product Name</th>
                <th className="px-4 py-3 font-medium text-center">UoM</th>
                <th className="px-4 py-3 font-medium text-right">Reorder Level</th>
                <th className="px-4 py-3 font-medium text-right">Current Stock</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockRows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500">{row.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                  <td className="px-4 py-3 text-center">{row.uom}</td>
                  <td className="px-4 py-3 text-right">{row.reorder_level}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{row.current_stock}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
