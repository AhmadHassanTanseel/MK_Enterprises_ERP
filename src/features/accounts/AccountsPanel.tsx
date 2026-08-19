import React, { useState } from 'react';
import { useAppContext, Account } from '../../app/context/AppContext';
import { Plus, Edit2, Search, Filter, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const AccountsPanel: React.FC = () => {
  const { accounts, accountTypes, createAccount, updateAccount, deleteAccount } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Account> & { opening_balance_type?: string }>({});
  
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Account Name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (formData.id) {
        await updateAccount(
          formData.id,
          formData.account_type_id || 1,
          formData.name,
          formData.contact || undefined,
          undefined, // address
          undefined, // area_id
          formData.opening_balance || 0,
          formData.opening_balance_type || 'DEBIT'
        );
        toast.success("Account updated successfully!");
      } else {
        await createAccount(
          formData.account_type_id || 1,
          formData.name,
          formData.contact || undefined,
          undefined, // Address
          undefined, // Area ID
          formData.opening_balance || 0,
          formData.opening_balance_type || 'DEBIT'
        );
        toast.success("Account created successfully!");
      }
      setIsAddMode(false);
      setFormData({});
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (acc: Account) => {
    setFormData({
      id: acc.id,
      name: acc.name,
      account_type_id: acc.account_type_id,
      contact: acc.contact,
      opening_balance: acc.opening_balance,
      opening_balance_type: 'DEBIT'
    });
    setIsAddMode(true);
    
    
  };

  const handleDelete = async (id: number) => {
    if(confirm('Are you sure you want to delete this account?')) {
      setIsSubmitting(true);
      try {
        await deleteAccount(id);
        toast.success("Account deleted successfully!");
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

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel: Form */}
      <div className={`w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col ${(isAddMode || formData.id) ? 'block' : 'hidden md:flex'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">{formData.id ? 'Edit Account' : 'Add Account'}</h3>
          {formData.id && (
            <button onClick={() => { setFormData({}); setIsAddMode(false); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        
        <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Name *</label>
            <input 
              type="text" required
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Type *</label>
            <select 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.account_type_id || ''}
              onChange={e => setFormData({...formData, account_type_id: Number(e.target.value)})}
            >
              <option value="" disabled>Select Account Type</option>
              {accountTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mobile / Contact</label>
            <input 
              type="text" 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.contact || ''}
              onChange={e => setFormData({...formData, contact: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="flex-1 border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.opening_balance || ''}
                onChange={e => setFormData({...formData, opening_balance: Number(e.target.value)})}
              />
              <select 
                className="w-24 border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.opening_balance_type || 'DEBIT'}
                onChange={e => setFormData({...formData, opening_balance_type: e.target.value})}
              >
                <option value="DEBIT">Dr</option>
                <option value="CREDIT">Cr</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (formData.id ? 'Update Account' : 'Save Account')}
          </button>
        </form>
      </div>

      {/* Right Panel: List */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Accounts List</h3>
          <button onClick={() => { setFormData({}); setIsAddMode(true); }} className="md:hidden flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search accounts..." 
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
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Account Title</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length > 0 ? filteredAccounts.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">{acc.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{acc.name}</td>
                  <td className="px-4 py-3">{acc.contact || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{acc.opening_balance.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                    <button onClick={() => handleEdit(acc)} className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(acc.id)} disabled={isSubmitting} className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No accounts found. Create one to get started.
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
