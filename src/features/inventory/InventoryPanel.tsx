import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../app/context/AppContext';
import { 
  Package, AlertTriangle, RefreshCw, Search, ArrowUpDown, 
  ArrowUp, ArrowDown, CheckCircle2, XCircle, TrendingDown, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StockRow {
  product_id: number;
  code: string;
  name: string;
  available_stock: number;
  stock_value: number;
}

type SortField = 'stock_asc' | 'stock_desc' | 'val_desc' | 'val_asc' | 'name_asc' | 'name_desc' | 'code_asc';
type StatusFilter = 'ALL' | 'LOW' | 'OPTIMAL' | 'ZERO';

export const InventoryPanel: React.FC = () => {
  const { products } = useAppContext();
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortField>('stock_asc');

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

  const productMeta = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  // Enriched rows
  const enrichedRows = useMemo(() => {
    return stockRows.map(row => {
      const product = productMeta.get(row.product_id);
      const reorderLevel = product?.reorder_level || 200;
      let status: 'Zero' | 'Low Stock' | 'Optimal' = 'Optimal';
      if (row.available_stock <= 0) {
        status = 'Zero';
      } else if (row.available_stock <= reorderLevel) {
        status = 'Low Stock';
      }
      return {
        ...row,
        uom: product?.uom ?? 'Piece',
        purchase_price: product?.purchase_price ?? 0,
        sale_price: product?.sale_price ?? 0,
        reorder_level: reorderLevel,
        status,
      };
    });
  }, [stockRows, productMeta]);

  // Summary counts
  const summary = useMemo(() => {
    const totalItems = enrichedRows.length;
    let lowStockCount = 0;
    let zeroStockCount = 0;
    let optimalCount = 0;
    let totalValuation = 0;

    for (const r of enrichedRows) {
      totalValuation += r.stock_value || 0;
      if (r.status === 'Zero') zeroStockCount++;
      else if (r.status === 'Low Stock') lowStockCount++;
      else optimalCount++;
    }

    return {
      totalItems,
      lowStockCount,
      zeroStockCount,
      optimalCount,
      totalValuation,
    };
  }, [enrichedRows]);

  // Filtered & Sorted rows
  const displayRows = useMemo(() => {
    let result = enrichedRows.filter(row => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCode = row.code.toLowerCase().includes(q);
        const matchName = row.name.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }

      // 2. Status filter
      if (statusFilter === 'LOW') {
        return row.status === 'Low Stock';
      }
      if (statusFilter === 'ZERO') {
        return row.status === 'Zero';
      }
      if (statusFilter === 'OPTIMAL') {
        return row.status === 'Optimal';
      }
      return true;
    });

    // 3. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'stock_asc':
          return a.available_stock - b.available_stock;
        case 'stock_desc':
          return b.available_stock - a.available_stock;
        case 'val_desc':
          return b.stock_value - a.stock_value;
        case 'val_asc':
          return a.stock_value - b.stock_value;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'code_asc':
          return a.code.localeCompare(b.code);
        default:
          return 0;
      }
    });

    return result;
  }, [enrichedRows, searchTerm, statusFilter, sortBy]);

  // Column header sort helper
  const handleSortToggle = (field: 'stock' | 'value' | 'name' | 'code') => {
    if (field === 'stock') {
      setSortBy(sortBy === 'stock_asc' ? 'stock_desc' : 'stock_asc');
    } else if (field === 'value') {
      setSortBy(sortBy === 'val_desc' ? 'val_asc' : 'val_desc');
    } else if (field === 'name') {
      setSortBy(sortBy === 'name_asc' ? 'name_desc' : 'name_asc');
    } else if (field === 'code') {
      setSortBy(sortBy === 'code_asc' ? 'name_asc' : 'code_asc');
    }
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* 1. TOP HEADER & METRICS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" /> Stock Dashboard (اسٹاک ڈیش بورڈ)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time inventory levels, reorder alerts & valuations</p>
        </div>
        <button
          onClick={loadStock}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 text-sm shadow-xs border border-indigo-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stock
        </button>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${statusFilter === 'ALL' ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Total Products</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">{summary.totalItems}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">کل پروڈکٹس</div>
        </div>

        <div 
          onClick={() => setStatusFilter('LOW')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${statusFilter === 'LOW' ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Low Stock Alert</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{summary.lowStockCount}</div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">ری آرڈر کی ضرورت</div>
        </div>

        <div 
          onClick={() => setStatusFilter('ZERO')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${statusFilter === 'ZERO' ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Out of Stock (0)</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{summary.zeroStockCount}</div>
          <div className="text-[11px] text-rose-700/80 mt-0.5">مکمل ختم شدہ اسٹاک</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Total Inventory Value</span>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">Rs. {Math.round(summary.totalValuation).toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">کل مالیت بمطابق خرید ریٹ</div>
        </div>
      </div>

      {/* 3. SEARCH & CONTROLS TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code or product name... (تلاش کریں)"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All ({summary.totalItems})
          </button>
          <button
            onClick={() => setStatusFilter('LOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${statusFilter === 'LOW' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}
          >
            <AlertTriangle className="h-3 w-3" /> Low Stock ({summary.lowStockCount})
          </button>
          <button
            onClick={() => setStatusFilter('OPTIMAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${statusFilter === 'OPTIMAL' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
          >
            <CheckCircle2 className="h-3 w-3" /> Optimal ({summary.optimalCount})
          </button>
          <button
            onClick={() => setStatusFilter('ZERO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${statusFilter === 'ZERO' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'}`}
          >
            <XCircle className="h-3 w-3" /> Zero ({summary.zeroStockCount})
          </button>
        </div>

        {/* Sort Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Sort By:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortField)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="stock_asc">اسٹاک: کم سے زیادہ (Stock: Low to High)</option>
            <option value="stock_desc">اسٹاک: زیادہ سے کم (Stock: High to Low)</option>
            <option value="val_desc">مالیت: زیادہ سے کم (Value: High to Low)</option>
            <option value="val_asc">مالیت: کم سے زیادہ (Value: Low to High)</option>
            <option value="name_asc">پروڈکٹ نام: A تا Z</option>
            <option value="name_desc">پروڈکٹ نام: Z تا A</option>
            <option value="code_asc">پروڈکٹ کوڈ</option>
          </select>
        </div>
      </div>

      {/* 4. STOCK DATA TABLE */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" /> Loading stock levels...
          </div>
        )}
        {error && (
          <div className="p-6 text-sm text-rose-600 text-center">{error}</div>
        )}
        {!loading && !error && (
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[850px] text-left text-sm text-slate-600 border-collapse">
              <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200 z-10 select-none">
                <tr>
                  <th 
                    onClick={() => handleSortToggle('code')}
                    className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors w-28"
                  >
                    <div className="flex items-center gap-1">
                      Code
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortToggle('name')}
                    className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Product Name
                      {sortBy === 'name_asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : sortBy === 'name_desc' ? <ArrowDown className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                    </div>
                  </th>
                  <th className="px-3 py-3 font-semibold text-center w-24">UoM</th>
                  <th className="px-4 py-3 font-semibold text-right w-28">Reorder Level</th>
                  <th 
                    onClick={() => handleSortToggle('stock')}
                    className="px-4 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors w-36 bg-slate-100/50"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Current Stock
                      {sortBy === 'stock_asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : sortBy === 'stock_desc' ? <ArrowDown className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortToggle('value')}
                    className="px-4 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors w-36"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Stock Value
                      {sortBy === 'val_desc' ? <ArrowDown className="h-3.5 w-3.5 text-indigo-600" /> : sortBy === 'val_asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-center w-32">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      کوئی پروڈکٹ نہیں ملی (No matching products found)
                    </td>
                  </tr>
                ) : (
                  displayRows.map(row => (
                    <tr key={row.product_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{row.code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-3 py-3 text-center text-xs text-slate-500">{row.uom}</td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">{row.reorder_level}</td>
                      <td className={`px-4 py-3 text-right font-black text-sm ${row.available_stock <= 0 ? 'text-rose-600 bg-rose-50/40' : row.available_stock <= row.reorder_level ? 'text-amber-700 bg-amber-50/30' : 'text-slate-900'}`}>
                        {row.available_stock.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700 text-xs">
                        Rs. {Math.round(row.stock_value).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.status === 'Zero' ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-200">
                            <XCircle className="h-3 w-3 text-rose-600" /> Out of Stock
                          </span>
                        ) : row.status === 'Low Stock' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200">
                            <AlertTriangle className="h-3 w-3 text-amber-600" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Optimal
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

        {/* Footer info bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex justify-between items-center text-xs text-slate-500">
          <span>Showing <strong>{displayRows.length}</strong> of <strong>{enrichedRows.length}</strong> products</span>
          <span className="italic">Click any column header to toggle sort direction</span>
        </div>
      </div>
    </div>
  );
};
