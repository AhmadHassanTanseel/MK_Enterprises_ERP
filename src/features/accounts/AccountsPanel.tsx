import React, { useState } from 'react';
import { useAppContext, Account } from '../../app/context/AppContext';
import { Plus, Edit2, Search, Trash2, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const AccountsPanel: React.FC = () => {
  const { accounts, createAccount, updateAccount, deleteAccount } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Account> & { opening_balance_type?: string }>({
    is_customer: false,
    is_supplier: false,
    opening_balance_type: 'DEBIT'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Account Name is required.");
      return;
    }
    if (!formData.is_customer && !formData.is_supplier) {
      toast.error("Account must be a Customer, Supplier, or both.");
      return;
    }

    setIsSubmitting(true);
    try {
      const type_id = formData.is_customer ? 2 : 4;
      
      if (formData.id) {
        await updateAccount(
          formData.id,
          type_id,
          formData.name,
          formData.contact || undefined,
          undefined, // address
          undefined, // area_id
          formData.opening_balance || 0,
          formData.opening_balance_type || 'DEBIT',
          formData.is_customer,
          formData.is_supplier
        );
      } else {
        await createAccount(
          type_id,
          formData.name,
          formData.contact || undefined,
          undefined, // Address
          undefined, // Area ID
          formData.opening_balance || 0,
          formData.opening_balance_type || 'DEBIT',
          formData.is_customer,
          formData.is_supplier
        );
      }
      setIsAddMode(false);
      setFormData({ is_customer: false, is_supplier: false, opening_balance_type: 'DEBIT' });
    } catch (err: any) { 
      toast.error(`Could not save Account: ${err.toString()}`); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (acc: Account) => {
    setFormData({
      id: acc.id,
      name: acc.name,
      contact: acc.contact,
      opening_balance: acc.opening_balance,
      opening_balance_type: acc.opening_balance_type,
      is_customer: acc.is_customer,
      is_supplier: acc.is_supplier
    });
    setIsAddMode(true);
  };

  const handleDelete = async (id: number) => {
    if(confirm('Are you sure you want to delete this account?')) {
      setIsSubmitting(true);
      try {
        await deleteAccount(id);
        if (formData.id === id) {
          setFormData({ is_customer: false, is_supplier: false, opening_balance_type: 'DEBIT' });
          setIsAddMode(false);
        }
      } catch (err: any) { 
        toast.error(`Could not delete Account: ${err.toString()}`); 
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    (acc.account_type_id === 2 || acc.account_type_id === 4 || acc.is_customer || acc.is_supplier) &&
    acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top Panel: Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {formData.id ? 'Edit Account' : 'Add New Account'}
          </h3>
          {formData.id && (
            <button onClick={() => { setFormData({ is_customer: false, is_supplier: false, opening_balance_type: 'DEBIT' }); setIsAddMode(false); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <form onSubmit={handleSave} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Name *</label>
            <input 
              type="text" required
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div className="w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Type *</label>
            <div className="flex gap-4 p-2 border border-slate-300 rounded-md bg-slate-50">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded text-blue-600 focus:ring-blue-500" 
                  checked={formData.is_customer || false}
                  onChange={e => setFormData({...formData, is_customer: e.target.checked})}
                />
                Customer
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded text-blue-600 focus:ring-blue-500" 
                  checked={formData.is_supplier || false}
                  onChange={e => setFormData({...formData, is_supplier: e.target.checked})}
                />
                Supplier
              </label>
            </div>
          </div>
          
          <div className="w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
            <input 
              type="text" 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.contact || ''}
              onChange={e => setFormData({...formData, contact: e.target.value})}
            />
          </div>

          <div className="w-64">
            <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance</label>
            <div className="flex">
              <input 
                type="number" step="0.01" min="0"
                className="w-full border border-slate-300 rounded-l-md p-2 focus:ring-2 focus:ring-blue-500 outline-none border-r-0"
                value={formData.opening_balance || ''}
                onChange={e => setFormData({...formData, opening_balance: Number(e.target.value)})}
              />
              <select 
                className="border border-slate-300 rounded-r-md p-2 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.opening_balance_type || 'DEBIT'}
                onChange={e => setFormData({...formData, opening_balance_type: e.target.value})}
              >
                <option value="DEBIT">Dr</option>
                <option value="CREDIT">Cr</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 h-[42px]"
          >
            {formData.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {formData.id ? 'Save Changes' : 'Add Account'}
          </button>
        </form>
      </div>

      {/* Bottom Panel: List */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-700">Customers & Suppliers</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search accounts..." 
              className="w-full border border-slate-300 rounded-md pl-10 pr-4 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-100 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{acc.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {acc.is_customer && <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded">Customer</span>}
                      {acc.is_supplier && <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">Supplier</span>}
                      {!acc.is_customer && !acc.is_supplier && <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded">Legacy</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{acc.contact || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={acc.current_balance >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                      {Math.abs(acc.current_balance).toLocaleString()} {acc.current_balance >= 0 ? 'Dr' : 'Cr'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEdit(acc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No accounts found matching your search.
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
