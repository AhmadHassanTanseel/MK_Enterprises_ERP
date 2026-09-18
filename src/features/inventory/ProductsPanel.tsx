import React, { useState } from 'react';
import { useAppContext, Product } from '../../app/context/AppContext';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Edit2, Search, Filter, Trash2, X, Copy, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { EntitySelect } from '../../shared/components/EntitySelect';

export const ProductsPanel: React.FC = () => {
  const { products, categories, createProduct, updateProduct, deleteProduct } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  
  
  
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    try {
      if (!formData.name || !formData.code) {
         toast.error("Product Name and Code are required");
         return;
      }
      setIsSubmitting(true);
      
      if (formData.id) {
        await updateProduct(
          formData.id,
          formData.code, 
          formData.name, 
          formData.flavors || undefined, 
          formData.packing || undefined, 
          formData.purchase_price || 0, 
          formData.sale_price || 0, 
          formData.opening_stock || 0, 
          formData.real_barcode || undefined, 
          formData.uom || 'Piece', 
          formData.reorder_level || undefined, 
          formData.sale_account_id || undefined
        );
        
      } else {
        await createProduct(
          formData.code, 
          formData.name, 
          formData.flavors || undefined, 
          formData.packing || undefined, 
          formData.purchase_price || 0, 
          formData.sale_price || 0, 
          formData.opening_stock || 0, 
          formData.real_barcode || undefined, 
          formData.uom || 'Piece', 
          formData.reorder_level || undefined, 
          formData.sale_account_id || undefined
        );
        
      }

      setIsAddMode(false);
      setFormData({});
    } catch (err: any) { toast.error(`Could not save Product: ${err.toString()}`); } finally {
      setIsSubmitting(false);
    }
  };

    const handleDuplicate = (prod: Product) => {
    setFormData({
      code: prod.code + '-COPY',
      name: prod.name + ' (Copy)',
      flavors: prod.flavors || undefined,
      packing: prod.packing || '',
      purchase_price: prod.purchase_price,
      sale_price: prod.sale_price,
      reorder_level: prod.reorder_level || 0,
      opening_stock: prod.opening_stock || 0
    });
    setIsAddMode(true);
  };

  const handleEdit = (prod: Product) => {
    setFormData(prod);
    setIsAddMode(true);
    
    
  };

  const handleDelete = async (id: number) => {
    if(confirm('Are you sure you want to delete this product?')) {
      setIsSubmitting(true);
      try {
        await deleteProduct(id);
        
        if (formData.id === id) {
          setFormData({});
          setIsAddMode(false);
        }
      } catch (err: any) { toast.error(`Could not save Product: ${err.toString()}`); } finally {
        setIsSubmitting(false);
      }
    }
  };

  const filteredProducts = products.filter(prod => 
    prod.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    prod.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel: Form */}
      <div className={`w-1/3 min-w-[280px] shrink-0 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col ${(isAddMode || formData.id) ? 'block' : 'hidden md:flex'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">{formData.id ? 'Edit Product' : 'Add Product'}</h3>
          {formData.id && (
            <button onClick={() => { setFormData({}); setIsAddMode(false); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        
        <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Code *</label>
              <input 
                type="text" required
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.code || ''}
                onChange={e => setFormData({...formData, code: e.target.value})}
                placeholder="e.g. PEP-1L"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Name (Brand) *</label>
              <input 
                type="text" required
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Pepsi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Flavors (comma separated)</label>
              <input 
                type="text" 
                className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" 
                value={formData.flavors || ''} 
                placeholder="e.g. Cola, Sprite, Orange"
                onChange={e => setFormData({...formData, flavors: e.target.value})} 
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400">
              {formData.id ? 'Update Product' : 'Save Product'}
            </button>
          </form>
      </div>

      {/* Right Panel: List */}
      <div className="flex-1 min-w-0 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Products Inventory</h3>
          <button onClick={() => { setFormData({}); setIsAddMode(true); }} className="md:hidden flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by code or name..." 
              className="w-full border border-slate-300 rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50">
            <Filter className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-max text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Product Name</th>
                <th className="px-4 py-3 font-medium text-right">Pur. Rate</th>
                <th className="px-4 py-3 font-medium text-right">Sale Rate</th>
                                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? filteredProducts.map(prod => (
                <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500">{prod.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{prod.name}</td>
                  <td className="px-4 py-3 text-right">{prod.purchase_price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">{prod.sale_price.toLocaleString()}</td>

                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                                        <button onClick={() => openHistory(prod)} className="text-amber-600 hover:text-amber-800 p-1 rounded-md hover:bg-amber-50 transition-colors" title="Purchase History">
                      <History className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDuplicate(prod)} className="text-teal-600 hover:text-teal-800 p-1 rounded-md hover:bg-teal-50 transition-colors" title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleEdit(prod)} className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(prod.id)} disabled={isSubmitting} className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No products found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                        <th className="px-4 py-3 text-right">Sale Price</th>
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
                          <td className="px-4 py-3 text-right text-emerald-600">Rs. {h.sale_rate?.toLocaleString() || 0}</td>
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
    </div>
  );
};
