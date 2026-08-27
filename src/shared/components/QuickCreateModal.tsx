import React, { useState } from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface QuickCreateModalProps {
  type: 'account' | 'product' | 'category' | 'area' | 'salesman';
  onClose: () => void;
  onSuccess: (id: number) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ type, onClose, onSuccess }) => {
  const { createAccount, createCategory, createArea, accountTypes, createSalesman, areas } = useAppContext();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extra fields for account
  const [accountTypeId, setAccountTypeId] = useState(accountTypes[0]?.id || 0);

  // Extra fields for salesman
  const [contact, setContact] = useState('');
  const [salary, setSalary] = useState<number>(0);
  const [details, setDetails] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<number[]>([]);

  const toggleArea = (id: number) => {
    setAssignedAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');

    setIsSubmitting(true);
    try {
      if (type === 'account') {
        // Defaults to is_customer=true if account type is Customer (2), etc. handled by backend or panel
        // Quick create for account might need customer/supplier flags.
        const isCustomer = accountTypeId === 2;
        const isSupplier = accountTypeId === 4;
        await createAccount(accountTypeId, name, undefined, undefined, undefined, 0, 'DEBIT', isCustomer, isSupplier);
        toast.success(`Account ${name} created`);
        onSuccess(0);
      } else if (type === 'category') {
        await createCategory(name);
        toast.success(`Category ${name} created`);
        onSuccess(0);
      } else if (type === 'area') {
        await createArea(name);
        toast.success(`Area ${name} created`);
        onSuccess(0);
      } else if (type === 'salesman') {
        await createSalesman(name, contact, salary, details, assignedAreas);
        toast.success(`Salesman ${name} created`);
        onSuccess(0);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800">New {type.charAt(0).toUpperCase() + type.slice(1)}</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          
          {type === 'account' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
              <select value={accountTypeId} onChange={e => setAccountTypeId(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" required>
                {accountTypes.map(at => (
                  <option key={at.id} value={at.id}>{at.name}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'salesman' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Info</label>
                <input type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Salary</label>
                <input type="number" min="0" value={salary || ''} onChange={e => setSalary(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Area(s)</label>
                <div className="max-h-32 overflow-y-auto border border-slate-300 rounded p-2 bg-slate-50 flex flex-col gap-1">
                  {areas.length === 0 && <div className="text-sm text-slate-500 italic">No areas available</div>}
                  {areas.map(a => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded text-blue-600 focus:ring-blue-500" 
                        checked={assignedAreas.includes(a.id)}
                        onChange={() => toggleArea(a.id)}
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Details / Notes</label>
                <textarea value={details} onChange={e => setDetails(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"></textarea>
              </div>
            </>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 mt-2 shrink-0">
            {isSubmitting ? 'Saving...' : 'Save & Select'}
          </button>
        </form>
      </div>
    </div>
  );
};
