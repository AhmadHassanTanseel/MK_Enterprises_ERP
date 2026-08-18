import React, { useState } from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { Network, Plus, Settings, X } from 'lucide-react';

export const AccountTypesPanel: React.FC = () => {
  const { accountTypes, createAccountType } = useAppContext();
  
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', nature: 'DR', trial_bal_type: 'BS', trial_order: 99 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ERP Enhancement: Tree view grouping by Trial Balance Type (BS/IS) and Nature
  const groupedTypes = {
    'Balance Sheet (Assets / Liabilities / Equity)': accountTypes.filter(t => t.trial_bal_type === 'BS'),
    'Income Statement (Income / Expenses)': accountTypes.filter(t => t.trial_bal_type === 'IS')
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name) return;
    setIsSubmitting(true);
    try {
      await createAccountType(formData.name, formData.nature, formData.trial_bal_type, formData.trial_order);
      setIsAddMode(false);
      setFormData({ name: '', nature: 'DR', trial_bal_type: 'BS', trial_order: 99 });
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel: Form */}
      <div className={`w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col ${isAddMode ? 'block' : 'hidden md:hidden'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Add Account Type</h3>
          <button onClick={() => setIsAddMode(false)} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
        <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input 
              type="text" required
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nature *</label>
            <select 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.nature}
              onChange={e => setFormData({...formData, nature: e.target.value as any})}
            >
              <option value="DR">Debit (Assets / Expenses)</option>
              <option value="CR">Credit (Liabilities / Equity / Income)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Statement Type *</label>
            <select 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.trial_bal_type}
              onChange={e => setFormData({...formData, trial_bal_type: e.target.value as any})}
            >
              <option value="BS">Balance Sheet (Permanent)</option>
              <option value="IS">Income Statement (Temporary)</option>
            </select>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 mt-4">
            {isSubmitting ? 'Saving...' : 'Save Type'}
          </button>
        </form>
      </div>

      <div className="flex-1 flex flex-col h-full gap-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Chart of Account Types</h2>
            <p className="text-sm text-slate-500 mt-1">Hierarchical classification for all accounts</p>
          </div>
          {!isAddMode && (
            <button onClick={() => setIsAddMode(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" /> Add Type
            </button>
          )}
        </div>

        <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-auto">
          <div className="space-y-8">
            {Object.entries(groupedTypes).map(([groupName, types]) => (
              <div key={groupName}>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Network className="h-5 w-5 text-blue-500" />
                  {groupName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-7">
                  {types.map(type => (
                    <div key={type.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-700">{type.name}</h4>
                        <button className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Settings className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${type.nature === 'DR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {type.nature === 'DR' ? 'Debit Nature' : 'Credit Nature'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
