import React, { useState } from 'react';
import { useAppContext, Category } from '../../app/context/AppContext';
import { Bookmark, Plus, Edit2, Search, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const CategoriesPanel: React.FC = () => {
  const { categories, createCategory, updateCategory, deleteCategory } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [newCatName, setNewCatName] = useState('');
  
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{name: string, description: string}>({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCatName) {
      toast.error("Category name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createCategory(newCatName);
        toast.success(`Category '${newCatName}' saved successfully`);
        setNewCatName('');
    } catch (err: any) { toast.error(`Could not save Category: ${err.toString()}`); } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditData({ name: cat.name, description: cat.description || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    setIsSubmitting(true);
    try {
      await updateCategory(id, editData.name, editData.description);
        toast.success(`Category '${editData.name}' updated successfully`);
        setEditingId(null);
    } catch (err: any) { toast.error(`Could not save Category: ${err.toString()}`); } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if(confirm('Are you sure you want to delete this category?')) {
      setIsSubmitting(true);
      try { await deleteCategory(id); toast.success(`Category deleted`); } catch (err: any) { toast.error(`Could not delete Category: ${err.toString()}`); } finally {
        setIsSubmitting(false);
      }
    }
  };

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-rose-500" /> Categories
          </h2>
          <p className="text-sm text-slate-500 mt-1">Organize products into hierarchical groups</p>
        </div>
        
        <form onSubmit={handleSave} className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" required placeholder="New category name..."
            className="border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-rose-500 outline-none flex-1 md:w-64"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
          />
          <button type="submit" disabled={isSubmitting} className="bg-rose-600 text-white px-4 py-2 rounded-md hover:bg-rose-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50">
            <Plus className="h-4 w-4" /> {isSubmitting ? "Adding..." : "Add"}
            </button>
        </form>
      </div>
      

      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search categories..." 
            className="w-full border border-slate-300 rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium w-16">ID</th>
                <th className="px-4 py-3 font-medium">Category Name</th>
                <th className="px-4 py-3 font-medium w-1/3">Description</th>
                <th className="px-4 py-3 font-medium text-center w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCategories.map(cat => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">{cat.id}</td>
                  {editingId === cat.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-rose-500" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-rose-500" value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} />
                      </td>
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                        <button onClick={() => saveEdit(cat.id)} disabled={isSubmitting} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded-md transition-colors"><Check className="h-4 w-4" /></button>
                        <button onClick={cancelEdit} disabled={isSubmitting} className="text-slate-600 hover:bg-slate-200 p-1 rounded-md transition-colors"><X className="h-4 w-4" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-bold text-slate-800">{cat.name}</td>
                      <td className="px-4 py-3">{cat.description || '-'}</td>
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                        <button onClick={() => startEdit(cat)} className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-50 transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(cat.id)} className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
