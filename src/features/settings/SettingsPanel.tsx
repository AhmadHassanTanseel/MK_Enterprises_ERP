import React, { useState, useEffect } from 'react';
import { Settings, Shield, Database, Users, Download, Trash2, AlertTriangle, Building, Save } from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';

export const SettingsPanel: React.FC = () => {
  const { settings, saveSetting } = useAppContext();
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nameSetting = settings.find(s => s.key === 'company_name');
    if (nameSetting) setCompanyName(nameSetting.value);
    
    const addressSetting = settings.find(s => s.key === 'company_address');
    if (addressSetting) setCompanyAddress(addressSetting.value);
  }, [settings]);

  const handleSaveGeneral = async () => {
    setIsSubmitting(true);
    try {
      await saveSetting('company_name', companyName);
      await saveSetting('company_address', companyAddress);
      alert('Settings saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-500" /> Application Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">Configure system preferences and manage data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* General Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Building className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-slate-800">General Configuration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Company Name</label>
              <input 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Enter Company Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Company Address</label>
              <input 
                type="text" 
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Enter Company Address"
              />
            </div>
            <button 
              onClick={handleSaveGeneral}
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Save General Settings'}
            </button>
          </div>
        </div>

        {/* Security & Access */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800">Security & Access</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
              <span>Manage Users</span> <Users className="h-4 w-4 text-slate-400" />
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded border border-slate-200">
              Role Based Access Control (RBAC)
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded border border-slate-200">
              Audit Log Viewer
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-slate-800">Data Management</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
              <span>Backup Database</span> <Download className="h-4 w-4 text-slate-400" />
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded border border-slate-200">
              Import / Export Wizard
            </button>
            <div className="pt-2 border-t border-slate-100 mt-4">
              <button className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded border border-rose-200 flex justify-between items-center">
                <span>Delete All Data</span> <Trash2 className="h-4 w-4 text-rose-400" />
              </button>
              <p className="text-xs text-slate-400 mt-2 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5" /> Requires 2-step admin confirmation.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
