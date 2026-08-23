import React, { useState } from 'react';
import { useAppContext, Area } from '../../app/context/AppContext';
import { MapPin, Plus, Edit2, Search, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { EntitySelect } from '../../shared/components/EntitySelect';

export const AreasPanel: React.FC = () => {
  const { areas, createArea, updateArea, deleteArea } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newArea, setNewArea] = useState<{name: string, salesman_id: number | null, remarks: string}>({ name: '', salesman_id: null, remarks: '' });
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{name: string, remarks: string, salesman_id: number | null, active: number}>({ name: '', remarks: '', salesman_id: null, active: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArea.name) {
      toast.error("Area name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createArea(newArea.name, newArea.salesman_id || undefined, newArea.remarks);
      toast.success(`Area '${newArea.name}' saved successfully`);
      setNewArea({ name: '', salesman_id: null, remarks: '' });
    } catch (error: any) {
      toast.error(error.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !editData.name) return;
    setIsSubmitting(true);
    try {
      await updateArea(editingId, editData.name, editData.salesman_id || undefined, editData.remarks, editData.active);
      toast.success("Area updated");
      setEditingId(null);
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if(window.confirm(`Delete area '${name}'?`)) {
      try {
        await deleteArea(id);
        toast.success("Area deleted");
      } catch (e: any) {
        toast.error(e.toString());
      }
    }
  };

  const filteredAreas = areas.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full gap-6">
      <div className="w-96 flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
            <MapPin className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Add Area</h2>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Area Name *</label>
            <input 
              type="text" 
              className="w-full border border-slate-300 rounded-md p-2"
              value={newArea.name} 
              onChange={e => setNewArea({...newArea, name: e.target.value})}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Salesman</label>
            <EntitySelect 
              type="salesman" 
              value={newArea.salesman_id || 0} 
              onChange={v => setNewArea({...newArea, salesman_id: v})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Explanation / Remarks</label>
            <textarea 
              className="w-full border border-slate-300 rounded-md p-2 h-24 resize-none"
              value={newArea.remarks} 
              onChange={e => setNewArea({...newArea, remarks: e.target.value})}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors mt-6"
          >
            <Plus className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Add Area'}
          </button>
        </form>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Area Directory</h2>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search areas..." 
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredAreas.map(area => (
              <div key={area.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                {editingId === area.id ? (
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      className="w-full border border-blue-300 rounded p-1"
                      value={editData.name} 
                      onChange={e => setEditData({...editData, name: e.target.value})}
                    />
                    <EntitySelect 
                      type="salesman" 
                      value={editData.salesman_id || 0} 
                      onChange={v => setEditData({...editData, salesman_id: v})} 
                    />
                    <input 
                      type="text" 
                      className="w-full border border-blue-300 rounded p-1 text-sm"
                      value={editData.remarks} 
                      onChange={e => setEditData({...editData, remarks: e.target.value})}
                      placeholder="Remarks"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={handleUpdate} className="p-1 bg-emerald-100 text-emerald-700 rounded"><Check className="h-4 w-4"/></button>
                      <button onClick={() => setEditingId(null)} className="p-1 bg-slate-100 text-slate-600 rounded"><X className="h-4 w-4"/></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800">{area.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{area.remarks || 'No remarks'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setEditingId(area.id);
                        setEditData({ name: area.name, remarks: area.remarks || '', salesman_id: area.salesman_id, active: area.active });
                      }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(area.id, area.name)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
