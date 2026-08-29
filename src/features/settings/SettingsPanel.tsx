import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { stat } from '@tauri-apps/plugin-fs';
import { open as openShell } from '@tauri-apps/plugin-shell';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppContext } from '../../app/context/AppContext';
import { Settings, Shield, Database, Users, Download, Trash2, AlertTriangle, Building, Save, X } from 'lucide-react';
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
  const [showDriveSetup, setShowDriveSetup] = useState(false);

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
                      className="flex-1 bg-white border border-blue-200 text-blue-700 font-medium py-2 px-3 rounded shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" /> Backup
                    </button>
                    <button 
                      onClick={handleRestoreClick}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 font-medium py-2 px-3 rounded shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="h-4 w-4" /> Restore
                    </button>
                  </div>
                </div>
              </div>

              {/* Drive Backup Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5M9.73 3.5l-3.43 6L12.86 21h6.85M13.72 13.5l-4.57 8h13.7l4.57-8"/>
                  </svg>
                  Google Drive
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 mb-4">Connect your Google Drive account to securely backup and restore your data to the cloud.</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowDriveSetup(true)}
                      className="flex-1 bg-blue-600 text-white font-medium py-2 px-3 rounded shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5M9.73 3.5l-3.43 6L12.86 21h6.85M13.72 13.5l-4.57 8h13.7l4.57-8"/>
                      </svg>
                      Setup Drive
                    </button>
                    <button 
                      onClick={() => setShowDriveSetup(true)}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 font-medium py-2 px-3 rounded shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      Restore
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
              <p><span className="font-medium">Software:</span> MK Enterprises Business Management System</p>
              <p><span className="font-medium">Version:</span> v2.0.0 Production Build</p>
              <p><span className="font-medium">Developed For:</span> Mian Khan Enterprises</p>
              <p className="pt-4 text-xs text-slate-400">© 2026 MK Enterprises. All rights reserved.</p>
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

      {showDriveSetup && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowDriveSetup(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5M9.73 3.5l-3.43 6L12.86 21h6.85M13.72 13.5l-4.57 8h13.7l4.57-8"/>
              </svg>
              Google Drive Backup
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              Connect your Google account to enable automatic backups and cloud restores.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Google Email Address</label>
                <input 
                  type="email" 
                  placeholder="admin@example.com"
                  className="w-full border border-slate-300 rounded p-2 outline-none focus:border-blue-500" 
                />
              </div>
              <p className="text-xs text-slate-500">
                You will be redirected to Google to authorize access to Google Drive.
              </p>
            </div>

            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-200 mb-6">
              <span className="font-bold flex items-center gap-1 mb-1"><AlertTriangle className="h-4 w-4" /> Developer Note:</span>
              To make this fully functional, an OAuth Client ID must be configured in Google Cloud Console. Until configured, Drive backups will save locally.
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDriveSetup(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                onClick={() => {
                  toast.success("OAuth configuration required. Saved as local backup for now.");
                  setShowDriveSetup(false);
                  handleBackup();
                }}
              >
                Connect Drive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
