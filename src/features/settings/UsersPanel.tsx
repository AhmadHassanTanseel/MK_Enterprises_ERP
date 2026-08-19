import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Edit2, Trash2, X, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  role: string;
  status: string;
}

export const UsersPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data: User[] = await invoke('get_users');
      setUsers(data);
    } catch (e: any) {
      toast.error("Failed to load users: " + e.toString());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.role) {
      toast.error("Username and Role are required");
      return;
    }

    if (!formData.id && !password) {
      toast.error("Password is required for new users");
      return;
    }

    setIsSubmitting(true);
    try {
      if (formData.id) {
        await invoke('update_user', {
          id: formData.id,
          username: formData.username,
          passwordPlain: password || null,
          role: formData.role,
          status: formData.status || 'ACTIVE'
        });
        toast.success("User updated successfully");
      } else {
        await invoke('create_user', {
          username: formData.username,
          passwordPlain: password,
          role: formData.role
        });
        toast.success("User created successfully");
      }
      
      setFormData({});
      setPassword('');
      setIsAddMode(false);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setFormData(user);
    setPassword('');
    setIsAddMode(true);
  };

  const handleDelete = async (id: number) => {
    if(confirm('Are you sure you want to delete this user?')) {
      setIsSubmitting(true);
      try {
        await invoke('delete_user', { id });
        toast.success("User deleted successfully!");
        if (formData.id === id) {
          setFormData({});
          setPassword('');
          setIsAddMode(false);
        }
        await loadUsers();
      } catch (err: any) {
        toast.error(err.toString());
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className={`w-full md:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${!isAddMode && !formData.id ? 'hidden md:block' : 'block'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">{formData.id ? 'Edit User' : 'Add User'}</h3>
          {formData.id && (
            <button onClick={() => { setFormData({}); setPassword(''); setIsAddMode(false); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
            <input 
              type="text" required
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.username || ''}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password {formData.id ? '(Leave blank to keep unchanged)' : '*'}
            </label>
            <input 
              type="password"
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
            <select 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.role || ''}
              onChange={e => setFormData({...formData, role: e.target.value})}
              required
            >
              <option value="">-- Select Role --</option>
              <option value="ADMIN">ADMIN (Full Access)</option>
              <option value="ACCOUNTANT">ACCOUNTANT (Financials)</option>
              <option value="CASHIER">CASHIER (Sales/POS)</option>
              <option value="VIEWER">VIEWER (Read-only)</option>
            </select>
          </div>

          {formData.id && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select 
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.status || 'ACTIVE'}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (formData.id ? 'Update User' : 'Save User')}
          </button>
        </form>
      </div>

      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" /> System Users
          </h3>
          <button onClick={() => { setFormData({}); setPassword(''); setIsAddMode(true); }} className="md:hidden flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{user.username}</td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">{user.role}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {user.username !== 'admin' && (
                      <button onClick={() => handleDelete(user.id)} disabled={isSubmitting} className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No users found.
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
