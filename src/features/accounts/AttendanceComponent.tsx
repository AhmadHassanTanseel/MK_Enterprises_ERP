import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { Plus, History } from 'lucide-react';

export const AttendanceComponent: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Add Worker Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerDesig, setNewWorkerDesig] = useState('');

  // History Modal
  const [historyWorker, setHistoryWorker] = useState<any | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    try {
      setLoading(true);
      const w: any[] = await invoke('get_workers');
      const att: any[] = await invoke('get_attendance', { date });
      
      setWorkers(w);
      setRecords(w.map(worker => {
        const existing = att.find(a => a.account_id === worker.id);
        return {
          account_id: worker.id,
          name: worker.name,
          designation: worker.designation,
          status: existing ? existing.status : 'PRESENT',
          remarks: existing ? (existing.remarks || '') : ''
        };
      }));
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const updateRecord = (id: number, field: string, value: string) => {
    setRecords(records.map(r => r.account_id === id ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = records.map(r => ({
        account_id: r.account_id,
        status: r.status,
        remarks: r.remarks || null
      }));
      await invoke('mark_attendance', { date, records: payload });
      toast.success('Attendance Saved Successfully');
      loadData();
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async () => {
    if (!newWorkerName) return toast.error("Name is required");
    try {
      setLoading(true);
      await invoke('quick_add_worker', { name: newWorkerName, designation: newWorkerDesig || null });
      toast.success("Worker added");
      setIsAddOpen(false);
      setNewWorkerName('');
      setNewWorkerDesig('');
      loadData();
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const openHistory = async (worker: any) => {
    setHistoryWorker(worker);
    try {
      const hist: any[] = await invoke('get_worker_attendance_history', { accountId: worker.account_id });
      setHistoryRecords(hist);
    } catch(e: any) {
      toast.error(e.toString());
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <label className="font-medium text-slate-700">Date:</label>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded p-2" 
          />
        </div>
        <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-100 transition-colors">
          <Plus className="h-4 w-4" /> Add Worker
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm">
              <th className="p-3">Worker Name</th>
              <th className="p-3">Designation</th>
              <th className="p-3">Status</th>
              <th className="p-3">Remarks</th>
              <th className="p-3 text-center">History</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.account_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-700">{r.name}</td>
                <td className="p-3 text-sm text-slate-500">{r.designation || '—'}</td>
                <td className="p-3">
                  <select 
                    value={r.status} 
                    onChange={e => updateRecord(r.account_id, 'status', e.target.value)}
                    className="border border-slate-300 rounded p-2 focus:ring-emerald-500 outline-none w-32"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="LEAVE">Leave</option>
                  </select>
                </td>
                <td className="p-3">
                  <input 
                    type="text" 
                    placeholder="Optional remarks" 
                    value={r.remarks}
                    onChange={e => updateRecord(r.account_id, 'remarks', e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 focus:ring-emerald-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => openHistory(r)} className="text-slate-400 hover:text-blue-600" title="View History">
                    <History className="h-5 w-5 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No workers found. Click 'Add Worker' to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button 
          onClick={handleSave} 
          disabled={loading || records.length === 0}
          className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>

      {/* Add Worker Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Add New Worker</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" className="w-full border p-2 rounded outline-none focus:border-blue-500" value={newWorkerName} onChange={e=>setNewWorkerName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Designation (Optional)</label>
                <input type="text" className="w-full border p-2 rounded outline-none focus:border-blue-500" placeholder="e.g. Manager, Salesman, Guard" value={newWorkerDesig} onChange={e=>setNewWorkerDesig(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 hover:bg-slate-100 rounded">Cancel</button>
              <button onClick={handleAddWorker} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50">Save Worker</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyWorker && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Attendance History: {historyWorker.name}</h3>
              <button onClick={() => setHistoryWorker(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-6 overflow-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="p-2">Date</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map(h => (
                    <tr key={h.id} className="border-b">
                      <td className="p-2">{h.date}</td>
                      <td className="p-2 font-medium">
                        <span className={`px-2 py-1 rounded text-xs ${h.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : h.status === 'ABSENT' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{h.status}</span>
                      </td>
                      <td className="p-2 text-slate-500">{h.remarks || '-'}</td>
                    </tr>
                  ))}
                  {historyRecords.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-500">No records found for the last 30 days.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
