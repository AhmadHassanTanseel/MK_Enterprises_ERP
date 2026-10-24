import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { stat } from '@tauri-apps/plugin-fs';
import { open as openShell } from '@tauri-apps/plugin-shell';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppContext } from '../../app/context/AppContext';
import { Settings, Shield, Database, Users, Download, Trash2, AlertTriangle, Building, Save, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { exit } from '@tauri-apps/plugin-process';

interface AuditLog {
  id: number;
  action: string;
  user_name: string;
  timestamp: string;
}

export const SettingsPanel: React.FC = () => {
  const { settings, saveSetting, fetchData } = useAppContext();
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountTitle, setBankAccountTitle] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<{path: string, size: number, date: Date} | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [driveBackupPath, setDriveBackupPath] = useState<string | null>(null);

  useEffect(() => {
    invoke('get_drive_backup_path')
      .then((res: any) => {
        if (res) setDriveBackupPath(res);
      })
      .catch((e) => console.error("Error fetching drive backup path:", e));
  }, []);

  const handleSelectDriveFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Google Drive / Cloud Sync Folder'
      });
      if (selected && typeof selected === 'string') {
        await invoke('set_drive_backup_path', { path: selected });
        setDriveBackupPath(selected);
        toast.success(`Drive backup folder set to: ${selected}`);
      }
    } catch (e: any) {
      toast.error(`Failed to select folder: ${e.toString()}`);
    }
  };

  const handleDriveBackup = async () => {
    try {
      if (!driveBackupPath) {
        toast.error("Please select a Drive backup folder first.");
        await handleSelectDriveFolder();
        return;
      }
      setIsSubmitting(true);
      const res: string = await invoke('backup_to_drive', { customPath: driveBackupPath });
      toast.success(res);
    } catch (e: any) {
      toast.error(`Drive backup failed: ${e.toString()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const nameSetting = settings.find(s => s.key === 'company_name');
    if (nameSetting) setCompanyName(nameSetting.value);

    const addressSetting = settings.find(s => s.key === 'company_address');
    if (addressSetting) setCompanyAddress(addressSetting.value);
    
    const bName = settings.find(s => s.key === 'bank_name');
    if (bName) setBankName(bName.value);
    
    const bTitle = settings.find(s => s.key === 'bank_account_title');
    if (bTitle) setBankAccountTitle(bTitle.value);
    
    const bAccNo = settings.find(s => s.key === 'bank_account_number');
    if (bAccNo) setBankAccountNumber(bAccNo.value);
  }, [settings]);

  const handleSaveGeneral = async () => {
    setIsSubmitting(true);
    try {
      await saveSetting('company_name', companyName);
      await saveSetting('company_address', companyAddress);
      await saveSetting('bank_name', bankName);
      await saveSetting('bank_account_title', bankAccountTitle);
      await saveSetting('bank_account_number', bankAccountNumber);
      alert('Settings saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBackupMessage(null);
      const result: string = await invoke('create_system_backup');
      toast.success(result);
    } catch (e: any) {
      toast.error(`Backup failed: ${e}`);
    }
  };

    const handleConfirmRestore = async () => {
    if (!restoreFile) return;
    setIsSubmitting(true);
    try {
      const msg: string = await invoke('restore_database', { filePath: restoreFile.path });
      toast.success(msg);
      setTimeout(() => {
        invoke('restart_app').catch(e => {
          toast.error("Failed to restart automatically. Please close and reopen.");
          exit(0);
        });
      }, 2000);
    } catch (e: any) {
      toast.error(`Restore failed: ${e.toString()}`);
      setIsSubmitting(false);
    }
  };

  const handleRestoreClick = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }]
      });
      if (file) {
        const metadata = await stat(file as string);
        setRestoreFile({
          path: file as string,
          size: metadata.size,
          date: metadata.mtime || new Date()
        });
        setRestoreConfirmText("");
        setShowRestoreConfirm(true);
      }
    } catch (e: any) {
      toast.error(`Restore failed: ${e.toString()}`);
    }
  };

  const executeRestore = async () => {
    if (restoreConfirmText !== 'RESTORE') {
      toast.error("You must type RESTORE to confirm.");
      return;
    }
    if (!restoreFile) return;
    
    setIsSubmitting(true);
    toast.loading("Restoring database...", { id: 'restoreToast' });
    try {
      const result: string = await invoke('restore_database', { filePath: restoreFile.path });
      toast.success((t) => (
        <div className="flex flex-col gap-2">
          <span className="font-bold">Database restored successfully!</span>
          <span className="text-sm">A backup of your previous data was saved automatically.</span>
          <button 
            onClick={() => invoke('restart_app')}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
          >
            Restart Now
          </button>
        </div>
      ), { id: 'restoreToast', duration: 15000 });
      setShowRestoreConfirm(false);
      setRestoreFile(null);
    } catch (e: any) {
      toast.error(`Restore failed, current data is untouched: ${e.toString()}`, { id: 'restoreToast', duration: 8000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigate = useNavigate();
  const loadAuditLogs = useCallback(async () => {
    try {
      const logs: AuditLog[] = await invoke('get_audit_logs');
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleOpenAuditLog = async () => {
    setShowAuditLog(true);
    await loadAuditLogs();
  };

  const handleFactoryReset = async () => {
    try {
      const result: string = await invoke('execute_factory_reset', { confirmation: resetConfirmText });
      toast.success(result);
      setShowResetConfirm(false);
      setResetConfirmText('');
      await fetchData();
      await loadAuditLogs();
    } catch (e: any) {
      toast.error(e.toString());
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 p-4">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-500" /> Application Settings
        </h2>
        <p className="text-sm text-slate-500 mt-1">Configure system preferences and manage data</p>
      </div>

      <div className="max-w-4xl space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                General Settings
              </h2>
              <p className="text-slate-500 mt-1">Update your business information and print settings</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. M K Enterprises" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Address</label>
                  <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Business Address" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  Bank Details (For Receipts)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bank Name</label>
                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Meezan Bank" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Account Title</label>
                    <input type="text" value={bankAccountTitle} onChange={e => setBankAccountTitle(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. M K Enterprises" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Account Number</label>
                    <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 0123456789" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSaveGeneral} 
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white font-medium py-2 px-6 rounded shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> Save Settings
                </button>
              </div>
            </div>
          </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Backup & Restore
            </h2>
            <p className="text-slate-500 mt-1">Manage local and cloud backups of your system data</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Local Backup Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Database className="h-4 w-4" /> Local Storage
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 mb-4">Create a backup file on your computer or restore from a previously saved local backup file.</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleBackup}
                      className="flex-1 min-w-0 bg-white border border-blue-200 text-blue-700 font-medium py-2 px-3 rounded shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" /> Backup
                    </button>
                    <button 
                      onClick={handleRestoreClick}
                      className="flex-1 min-w-0 bg-white border border-slate-200 text-slate-700 font-medium py-2 px-3 rounded shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="h-4 w-4" /> Restore
                    </button>
                  </div>
                </div>
              </div>

              {/* Drive Backup Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5M9.73 3.5l-3.43 6L12.86 21h6.85M13.72 13.5l-4.57 8h13.7l4.57-8"/>
                  </svg>
                  Google Drive / Cloud Backup & Restore
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-600">
                    Connect your Google Drive or Cloud sync folder to automatically create and restore timestamped cloud backups.
                  </p>

                  <div className="bg-white p-2.5 rounded border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Drive Backup Folder:</span>
                      <button 
                        type="button" 
                        onClick={handleSelectDriveFolder}
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        {driveBackupPath ? 'Change Folder' : 'Select Folder'}
                      </button>
                    </div>
                    <div className="font-mono text-slate-600 truncate bg-slate-50 p-1.5 rounded border border-slate-100">
                      {driveBackupPath || '⚠️ No folder selected (e.g. G:\\My Drive\\Zawar_Backups)'}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button 
                      type="button"
                      onClick={handleDriveBackup}
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-600 text-white font-medium py-2 px-3 rounded shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Backup to Drive
                    </button>
                    <button 
                      type="button"
                      onClick={handleRestoreClick}
                      disabled={isSubmitting}
                      className="flex-1 min-w-0 bg-white border border-slate-200 text-slate-700 font-medium py-2 px-3 rounded shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Restore from Drive
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">About</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p><span className="font-medium">Software:</span> Software By Ahmad Hassan Tanseel Contact-03107464349</p>
              <p><span className="font-medium">Version:</span> v4.1.2 Production Build</p>
              <p><span className="font-medium">Developed For:</span> Zawar Traders</p>
              <p className="pt-4 text-xs text-slate-400">© MIAS Solutions. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>

      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Restore</h3>
            <p className="text-slate-600 text-sm mb-4">
              You are about to overwrite the current database with the backup file. 
              <strong> This cannot be undone.</strong>
            </p>
            <div className="bg-rose-50 border border-rose-200 p-3 rounded mb-4 text-sm">
              <p className="font-mono text-xs mb-1 text-slate-700">File: {restoreFile?.path.split('\\').pop()?.split('/').pop()}</p>
              <p className="font-mono text-xs text-slate-700">Size: {restoreFile ? (restoreFile.size / 1024).toFixed(1) : 0} KB</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {setShowRestoreConfirm(false); setRestoreFile(null);}}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmRestore}
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Restoring...' : 'Restore Database'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
