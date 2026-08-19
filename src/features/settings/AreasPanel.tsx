import React, { useState } from 'react';
import { useAppContext, Area } from '../../app/context/AppContext';
import { MapPin, Plus, Edit2, Search, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { EntitySelect } from '../../shared/components/EntitySelect';

export const AreasPanel: React.FC = () => {
  const { areas, accounts, createArea, updateArea, deleteArea } = useAppContext();
  const salesmen = accounts.filter(a => a.account_type_id === 14);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newAreaName, setNewAreaName] = useState('');
  
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{name: string, remarks: string, salesman_id: number | null, active: number}>({ name: '', remarks: '', salesman_id: null, active: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAreaName) {
      toast.error("Area name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createArea(newAreaName);
        toast.success(`Area '${newAreaName}' saved successfully`);
        setNewAreaName('');
    } catch (err: any) { toast.error(`Could not save Area: ${err.toString()}`); } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (area: Area) => {
    setEditingId(area.id);
    setEditData({ name: area.name, remarks: area.remarks || '', salesman_id: area.salesman_id, active: area.active || 1 });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    setIsSubmitting(true);
    try {
      // Assuming salesman_id is kept unchanged for now
      await updateArea(id, editData.name, editData.salesman_id || undefined, editData.remarks, editData.active);
        toast.success(`Area '${editData.name}' updated successfully`);
        setEditingId(null);
    } catch (err: any) { toast.error(`Could not save Area: ${err.toString()}`); } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if(confirm('Are you sure you want to delete this area?')) {
      setIsSubmitting(true);
      try { await deleteArea(id); toast.success(`Area deleted`); } catch (err: any) { toast.error(`Could not delete Area: ${err.toString()}`); } finally {
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
            <Plus className="h-4 w-4" /> {isSubmitting ? "Adding..." : "Add"}
            </button>
        </form>
      </div>
      

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
                <th className="px-4 py-3 font-medium">Salesman</th>
                <th className="px-4 py-3 font-medium text-center">Accounts</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium">Remarks</th>
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
                        <EntitySelect type="salesman" value={editData.salesman_id || 0} onChange={v => setEditData({...editData, salesman_id: v})} />
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400">—</td>
                      <td className="px-4 py-3 text-center">
                        <select className="border border-slate-300 rounded px-2 py-1" value={editData.active} onChange={e => setEditData({...editData, active: Number(e.target.value)})}>
                          <option value={1}>Active</option>
                          <option value={0}>Inactive</option>
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
                      <td className="px-4 py-3 text-slate-700">
                        {salesmen.find(s => s.id === area.salesman_id)?.name || <span className="text-slate-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-700">{area.account_count || 0}</td>
                      <td className="px-4 py-3 text-center">
                        {area.active === 1 ? <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">Active</span> : <span className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded-full">Inactive</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{area.remarks || '-'}</td>
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
