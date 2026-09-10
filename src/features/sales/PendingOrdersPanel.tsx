import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../app/context/AppContext';
import toast from 'react-hot-toast';
import { EntitySelect } from '../../shared/components/EntitySelect';

interface DispatchItem {
  id: number;
  dispatch_id: number;
  product_id: number;
  product_name: string;
  qty_dispatched: number;
  qty_sold: number;
  qty_returned: number;
  sale_price: number;
}

interface Dispatch {
  id: number;
  salesman_id: number;
  salesman_name: string;
  dispatch_date: string;
  status: string;
  items: DispatchItem[];
}

export const PendingOrdersPanel: React.FC = () => {
  const { products, salesmen, fetchData } = useAppContext();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [currentDispatch, setCurrentDispatch] = useState<Dispatch | null>(null);

  // Create Form State
  const [newSalesmanId, setNewSalesmanId] = useState<number | null>(null);
  const [newLines, setNewLines] = useState<{product_id: number | null, qty: number}[]>([
    { product_id: null, qty: 1 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settle Form State
  const [settleLines, setSettleLines] = useState<{dispatch_item_id: number, product_id: number, qty_sold: number, qty_returned: number, unit_price: number, discount_percent: number}[]>([]);

  useEffect(() => {
    loadDispatches();
  }, []);

  const loadDispatches = async () => {
    try {
      const data: Dispatch[] = await invoke('get_pending_dispatches');
      setDispatches(data);
    } catch (err) {
      toast.error('Failed to load pending dispatches');
    }
  };

  const handleCreateDispatch = async () => {
    if (!newSalesmanId) return toast.error('Select a salesman');
    const validLines = newLines.filter(l => l.product_id && l.qty > 0);
    if (validLines.length === 0) return toast.error('Add at least one product');

    setIsSubmitting(true);
    try {
      await invoke('create_dispatch', {
        salesmanId: newSalesmanId,
        lines: validLines
      });
      toast.success('Dispatch created successfully');
      setIsCreateModalOpen(false);
      setNewSalesmanId(null);
      setNewLines([{ product_id: null, qty: 1 }]);
      await loadDispatches();
      await fetchData(); // refresh inventory
    } catch (err) {
      toast.error(`Error: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSettleModal = (dispatch: Dispatch) => {
    setCurrentDispatch(dispatch);
    setSettleLines(dispatch.items.map(item => ({
      dispatch_item_id: item.id,
      product_id: item.product_id,
      qty_sold: item.qty_dispatched, // Default to all sold
      qty_returned: 0,
      unit_price: item.sale_price,
      discount_percent: 0
    })));
    setIsSettleModalOpen(true);
  };

  const handleSettleDispatch = async () => {
    if (!currentDispatch) return;

    // Validate quantities
    for (const line of settleLines) {
      const item = currentDispatch.items.find(i => i.id === line.dispatch_item_id);
      if (item && (line.qty_sold + line.qty_returned !== item.qty_dispatched)) {
        return toast.error(`Qty Sold + Qty Returned must equal Dispatched Qty for ${item.product_name}`);
      }
    }

    setIsSubmitting(true);
    try {
      await invoke('settle_dispatch', {
        dispatchId: currentDispatch.id,
        lines: settleLines
      });
      toast.success('Dispatch settled and Sale Invoice generated');
      setIsSettleModalOpen(false);
      setCurrentDispatch(null);
      await loadDispatches();
      await fetchData(); // refresh inventory & ledger
    } catch (err) {
      toast.error(`Error: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pending Orders (Dispatches)</h1>
          <p className="text-sm text-slate-500 mt-1">Manage stock sent with salesmen and settle returns</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Dispatch
        </button>
      </div>

      <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
              <tr>
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Salesman</th>
                <th className="p-4 font-medium">Items Dispatched</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dispatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No pending orders found.</td>
                </tr>
              ) : dispatches.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-medium text-slate-700">DISP-{d.id}</td>
                  <td className="p-4 text-slate-600">{d.dispatch_date}</td>
                  <td className="p-4 text-slate-600 font-medium">{d.salesman_name}</td>
                  <td className="p-4 text-slate-600">
                    <ul className="list-disc list-inside text-sm">
                      {d.items.map(i => (
                        <li key={i.id}>{i.qty_dispatched}x {i.product_name}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                      <Clock className="h-3.5 w-3.5" /> Pending
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => openSettleModal(d)}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-medium rounded-lg transition-colors border border-emerald-200"
                    >
                      Settle Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-slate-800">New Salesman Dispatch</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Salesman</label>
                <EntitySelect 
                  type="salesman" 
                  value={newSalesmanId || 0} 
                  onChange={setNewSalesmanId} 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Products (Stock taken)</label>
                  <button onClick={() => setNewLines([...newLines, {product_id: null, qty: 1}])} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Product
                  </button>
                </div>
                <div className="space-y-2">
                  {newLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <EntitySelect 
                          type="product" 
                          value={line.product_id || 0} 
                          onChange={(v) => {
                            const l = [...newLines]; l[idx].product_id = v; setNewLines(l);
                          }}
                        />
                      </div>
                      <div className="w-24">
                        <input 
                          type="number" min="1"
                          className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none text-center"
                          value={line.qty || ''}
                          onChange={(e) => {
                            const l = [...newLines]; l[idx].qty = Number(e.target.value); setNewLines(l);
                          }}
                          placeholder="Qty"
                        />
                      </div>
                      <button onClick={() => setNewLines(newLines.filter((_, i) => i !== idx))} className="text-red-500 p-2 hover:bg-red-50 rounded">
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreateDispatch} disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50">
                {isSubmitting ? 'Dispatching...' : 'Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {isSettleModalOpen && currentDispatch && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-emerald-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-emerald-800">Settle Dispatch (DISP-{currentDispatch.id})</h2>
              <button onClick={() => setIsSettleModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <strong>Salesman:</strong> {currentDispatch.salesman_name} <br/>
                Record what was sold vs returned. Sold items will generate a cash invoice. Returned items will restock.
              </div>

              <table className="w-full min-w-[800px] text-left border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-600 text-sm">
                  <tr>
                    <th className="p-3 border-b border-slate-200">Product</th>
                    <th className="p-3 border-b border-slate-200 text-center w-24">Dispatched</th>
                    <th className="p-3 border-b border-slate-200 w-32">Qty Sold</th>
                    <th className="p-3 border-b border-slate-200 w-32">Qty Returned</th>
                    <th className="p-3 border-b border-slate-200 w-32">Sale Rate</th>
                    <th className="p-3 border-b border-slate-200 w-24">Disc %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentDispatch.items.map(item => {
                    const lineIdx = settleLines.findIndex(l => l.dispatch_item_id === item.id);
                    const line = settleLines[lineIdx];
                    if (!line) return null;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-700">{item.product_name}</td>
                        <td className="p-3 text-center text-slate-500 font-bold">{item.qty_dispatched}</td>
                        <td className="p-3">
                          <input 
                            type="number" min="0" max={item.qty_dispatched}
                            className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none text-center bg-emerald-50 font-bold"
                            value={line.qty_sold === 0 && line.qty_returned > 0 ? 0 : line.qty_sold}
                            onChange={e => {
                              const val = Number(e.target.value);
                              const newLines = [...settleLines];
                              newLines[lineIdx].qty_sold = val;
                              newLines[lineIdx].qty_returned = item.qty_dispatched - val;
                              setSettleLines(newLines);
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <input 
                            type="number" min="0" max={item.qty_dispatched}
                            className="w-full p-2 border border-slate-300 rounded focus:border-amber-500 outline-none text-center bg-amber-50 font-bold"
                            value={line.qty_returned === 0 && line.qty_sold > 0 ? 0 : line.qty_returned}
                            onChange={e => {
                              const val = Number(e.target.value);
                              const newLines = [...settleLines];
                              newLines[lineIdx].qty_returned = val;
                              newLines[lineIdx].qty_sold = item.qty_dispatched - val;
                              setSettleLines(newLines);
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <input 
                            type="number" min="0" step="any"
                            className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none text-right"
                            value={line.unit_price}
                            onChange={e => {
                              const newLines = [...settleLines];
                              newLines[lineIdx].unit_price = Number(e.target.value);
                              setSettleLines(newLines);
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <input 
                            type="number" min="0" max="100"
                            className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none text-right"
                            value={line.discount_percent}
                            onChange={e => {
                              const newLines = [...settleLines];
                              newLines[lineIdx].discount_percent = Number(e.target.value);
                              setSettleLines(newLines);
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-slate-500">Estimated Total Revenue</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    Rs. {settleLines.reduce((sum, l) => sum + (l.qty_sold * l.unit_price * (1 - l.discount_percent/100)), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setIsSettleModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSettleDispatch} disabled={isSubmitting} className="px-6 py-2 bg-emerald-600 text-white font-medium hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                <CheckCircle className="h-5 w-5" /> {isSubmitting ? 'Settling...' : 'Confirm Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
