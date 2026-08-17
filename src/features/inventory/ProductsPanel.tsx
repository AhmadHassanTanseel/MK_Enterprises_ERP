import React, { useState } from 'react';
import { useAppContext, Product } from '../../app/context/AppContext';
import { Plus, Edit2, Search, Filter, Trash2, X } from 'lucide-react';

export const ProductsPanel: React.FC = () => {
  const { products, createProduct, updateProduct, deleteProduct } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (!formData.name || !formData.code) {
         setError("Product Name and Code are required");
         return;
      }
      setIsSubmitting(true);
      
      if (formData.id) {
        await updateProduct(
          formData.id,
          formData.code, 
          formData.name, 
          formData.category_id || undefined, 
          formData.packing || undefined, 
          formData.purchase_price || 0, 
          formData.sale_price || 0, 
          formData.opening_stock || 0, 
          formData.real_barcode || undefined, 
          formData.uom || 'Piece', 
          formData.reorder_level || undefined, 
          formData.sale_account_id || undefined
        );
        setSuccess("Product updated successfully!");
      } else {
        await createProduct(
          formData.code, 
          formData.name, 
          formData.category_id || undefined, 
          formData.packing || undefined, 
          formData.purchase_price || 0, 
          formData.sale_price || 0, 
          formData.opening_stock || 0, 
          formData.real_barcode || undefined, 
          formData.uom || 'Piece', 
          formData.reorder_level || undefined, 
          formData.sale_account_id || undefined
        );
        setSuccess("Product created successfully!");
      }

      setIsAddMode(false);
      setFormData({});
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (prod: Product) => {
    setFormData(prod);
    setIsAddMode(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id: number) => {
    if(confirm('Are you sure you want to delete this product?')) {
      setIsSubmitting(true);
      try {
        await deleteProduct(id);
        setSuccess("Product deleted successfully!");
        if (formData.id === id) {
          setFormData({});
          setIsAddMode(false);
        }
      } catch (err: any) {
        alert(err.toString());
      } finally {
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
      <div className={`w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col ${(isAddMode || formData.id) ? 'block' : 'hidden md:flex'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">{formData.id ? 'Edit Product' : 'Add Product'}</h3>
          {formData.id && (
            <button onClick={() => { setFormData({}); setIsAddMode(false); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
        {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-md border border-emerald-200">{success}</div>}
        <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Code *</label>
            <input 
              type="text" required
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.code || ''}
              onChange={e => setFormData({...formData, code: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
            <input 
              type="text" required
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Rate</label>
              <input 
                type="number" 
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.purchase_price || ''}
                onChange={e => setFormData({...formData, purchase_price: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sale Rate</label>
              <input 
                type="number" 
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.sale_price || ''}
                onChange={e => setFormData({...formData, sale_price: Number(e.target.value)})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Barcode (ERP Feature)</label>
            <div className="flex gap-2">
              <input 
                type="text" placeholder="Scan or generate..."
                className="flex-1 border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.real_barcode || ''}
                onChange={e => setFormData({...formData, real_barcode: e.target.value})}
              />
              <button type="button" className="bg-slate-100 border border-slate-300 text-slate-700 px-3 rounded-md hover:bg-slate-200">
                Gen
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure</label>
              <select 
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.uom || 'Piece'}
                onChange={e => setFormData({...formData, uom: e.target.value})}
              >
                <option value="Piece">Piece</option>
                <option value="Carton">Carton</option>
                <option value="Case">Case</option>
                <option value="Liter">Liter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
              <input 
                type="number" 
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.reorder_level || ''}
                onChange={e => setFormData({...formData, reorder_level: Number(e.target.value)})}
              />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition-colors mt-4 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (formData.id ? 'Update Product' : 'Save Product')}
          </button>
        </form>
      </div>

      {/* Right Panel: List */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
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
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Product Name</th>
                <th className="px-4 py-3 font-medium text-right">Pur. Rate</th>
                <th className="px-4 py-3 font-medium text-right">Sale Rate</th>
                <th className="px-4 py-3 font-medium text-center">UoM</th>
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
                  <td className="px-4 py-3 text-center text-xs">
                    <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600">{prod.uom}</span>
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center gap-2">
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
    </div>
  );
};
