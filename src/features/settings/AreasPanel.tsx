import React, { useState } from 'react';
import { useAppContext, Area } from '../../app/context/AppContext';
import { MapPin, Plus, Edit2, Search, Trash2, Check, X } from 'lucide-react';

export const AreasPanel: React.FC = () => {
  const { areas, createArea, updateArea, deleteArea } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newAreaName, setNewAreaName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{name: string, remarks: string}>({ name: '', remarks: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newAreaName) {
      setError("Area name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createArea(newAreaName);
      setNewAreaName('');
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (area: Area) => {
    setEditingId(area.id);
    setEditData({ name: area.name, remarks: area.remarks || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    setIsSubmitting(true);
    try {
      // Assuming salesman_id is kept unchanged for now
      await updateArea(id, editData.name, undefined, editData.remarks);
      setEditingId(null);
    } catch (err: any) {
      alert(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if(confirm('Are you sure you want to delete this area?')) {
      setIsSubmitting(true);
      try {
        await deleteArea(id);
      } catch (err: any) {
        alert(err.toString());
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const filteredAreas = areas.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-teal-500" /> Areas & Territories
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage sales territories and assign salesmen</p>
        </div>
        
        <form onSubmit={handleSave} className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" required placeholder="New area name..."
            className="border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-teal-500 outline-none flex-1 md:w-64"
            value={newAreaName}
            onChange={e => setNewAreaName(e.target.value)}
          />
          <button type="submit" disabled={isSubmitting} className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>
      </div>
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}

      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search territories..." 
            className="w-full border border-slate-300 rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium w-16">ID</th>
                <th className="px-4 py-3 font-medium">Territory Name</th>
                <th className="px-4 py-3 font-medium w-1/4">Salesman</th>
                <th className="px-4 py-3 font-medium w-1/4">Remarks</th>
                <th className="px-4 py-3 font-medium text-center w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAreas.map(area => (
                <tr key={area.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">{area.id}</td>
                  {editingId === area.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                      </td>
                      <td className="px-4 py-3">
                        <select className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500">
                          <option value="">-- Unassigned --</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500" value={editData.remarks} onChange={e => setEditData({...editData, remarks: e.target.value})} />
                      </td>
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                        <button onClick={() => saveEdit(area.id)} disabled={isSubmitting} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded-md transition-colors"><Check className="h-4 w-4" /></button>
                        <button onClick={cancelEdit} disabled={isSubmitting} className="text-slate-600 hover:bg-slate-200 p-1 rounded-md transition-colors"><X className="h-4 w-4" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-800">{area.name}</td>
                      <td className="px-4 py-3">
                        <select className="w-full bg-transparent border border-slate-200 rounded p-1 text-sm outline-none focus:border-teal-500">
                          <option value="">-- Unassigned --</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">{area.remarks || '-'}</td>
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                        <button onClick={() => startEdit(area)} className="text-teal-600 hover:text-teal-800 p-1 rounded-md hover:bg-teal-50 transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(area.id)} className="text-slate-400 hover:text-teal-600 p-1 rounded-md hover:bg-teal-50 transition-colors">
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
