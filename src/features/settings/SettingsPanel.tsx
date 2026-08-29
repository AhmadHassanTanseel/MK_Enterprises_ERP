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

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Building className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-slate-800">Setup</h3>
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
                <label className="block text-xs font-medium text-slate-500 mb-1">Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-slate-100 border border-slate-200 rounded overflow-hidden flex items-center justify-center">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">No Logo</span>}
                  </div>
                  <input type="file" accept="image/*" className="text-sm text-slate-500" onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setLogoUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }} />
                </div>
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

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800">Security & Access</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded border border-slate-200 flex justify-between items-center opacity-50 cursor-not-allowed">
              <span>Manage Users</span> <Users className="h-4 w-4 text-slate-400" />
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded border border-slate-200 opacity-50 cursor-not-allowed">
              Role Based Access Control (RBAC)
            </button>
            <button
              onClick={handleOpenAuditLog}
              className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded border border-slate-200"
            >
              Audit Log Viewer
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-slate-800">Data Management</h3>
          </div>
          <div className="space-y-3">
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Backup</label>
              <div className="flex gap-2">
                <button
                  onClick={handleBackup}
                  className="flex-1 text-center px-2 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 rounded border border-slate-200"
                >
                  Local
                </button>
                <button
                  onClick={() => toast.error('Cloud backup isn\'t connected yet')}
                  className="flex-1 text-center px-2 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                >
                  Drive
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
              <label className="text-xs font-bold text-slate-500 uppercase">Restore</label>
              <div className="flex gap-2">
                <button
                  onClick={handleRestoreClick}
                  className="flex-1 text-center px-2 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 rounded border border-slate-200"
                >
                  Local
                </button>
                <button
                  onClick={() => toast.error('Cloud backup isn\'t connected yet')}
                  className="flex-1 text-center px-2 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                >
                  Drive
                </button>
              </div>
            </div>

            {backupMessage && (
              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">{backupMessage}</p>
            )}
            <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded border border-slate-200 opacity-50 cursor-not-allowed">
              Import / Export Wizard
            </button>
            <div className="pt-2 border-t border-slate-100 mt-4">
              <button
                onClick={() => { setShowResetConfirm(true); setResetConfirmText(''); }}
                className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded border border-rose-200 flex justify-between items-center"
              >
                <span>Delete All Data</span> <Trash2 className="h-4 w-4 text-rose-400" />
              </button>
              <p className="text-xs text-slate-400 mt-2 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5" /> Requires typing DELETE to confirm.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showAuditLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Audit Log</h3>
              <button onClick={() => setShowAuditLog(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No audit entries yet.</p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-slate-500 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="px-3 py-2">{log.user_name}</td>
                        <td className="px-3 py-2">{log.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      
      {showRestoreConfirm && restoreFile && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-orange-50 p-6 text-center border-b border-orange-100">
              <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Restore Database?</h3>
              <p className="text-sm text-slate-600 mt-2">
                You are about to restore the database from a backup file. Your current data will be automatically backed up before this action.
              </p>
            </div>
            
            <div className="p-6">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-6 text-sm text-slate-700">
                <p><strong>File:</strong> {restoreFile.path.split('\\').pop()?.split('/').pop()}</p>
                <p><strong>Size:</strong> {(restoreFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                <p><strong>Date modified:</strong> {restoreFile.date.toLocaleString()}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type <strong>RESTORE</strong> to confirm
                </label>
                <input 
                  type="text" 
                  value={restoreConfirmText}
                  onChange={e => setRestoreConfirmText(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                  placeholder="RESTORE"
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRestoreConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeRestore}
                  disabled={restoreConfirmText !== 'RESTORE' || isSubmitting}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : null}
                  {isSubmitting ? "Restoring..." : "Restore Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-rose-700 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5" /> Factory Reset
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              This will permanently delete all invoices, inventory movements (except opening stock), and journal entries (except opening balances). Products and accounts will be preserved.
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type DELETE to confirm</label>
            <input
              type="text"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 mb-3"
              placeholder="DELETE"
            />
            {resetError && <p className="text-sm text-rose-600 mb-3">{resetError}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleFactoryReset}
                disabled={resetConfirmText !== 'DELETE'}
                className="px-4 py-2 text-sm bg-rose-600 text-white rounded-md hover:bg-rose-700 disabled:opacity-50"
              >
                Wipe Transactional Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
