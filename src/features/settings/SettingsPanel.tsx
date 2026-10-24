import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { stat } from '@tauri-apps/plugin-fs';
import { open as openShell } from '@tauri-apps/plugin-shell';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppContext } from '../../app/context/AppContext';
import { Settings, Shield, Database, Users, Download, Trash2, AlertTriangle, Building, Save, X, RefreshCw, Cloud, Globe, CheckCircle, Copy, Key } from 'lucide-react';
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
  // Local Storage Path state
  const [localBackupPath, setLocalBackupPath] = useState<string | null>(null);

  // Cloud / Google Drive state
  const [isInternetOnline, setIsInternetOnline] = useState<boolean | null>(null);
  const [cloudConfig, setCloudConfig] = useState<{ cloud_url?: string; access_token?: string; last_sync?: string }>({});
  const [showCloudSetup, setShowCloudSetup] = useState(false);
  const [showCloudRestoreModal, setShowCloudRestoreModal] = useState(false);
  const [cloudFiles, setCloudFiles] = useState<Array<{ id: string; name: string; size: number; date: string }>>([]);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [inputCloudUrl, setInputCloudUrl] = useState('');
  const [inputAccessToken, setInputAccessToken] = useState('');

  const testInternet = async (): Promise<boolean> => {
    try {
      const online: boolean = await invoke('check_internet_connection');
      setIsInternetOnline(online);
      return online;
    } catch {
      setIsInternetOnline(navigator.onLine);
      return navigator.onLine;
    }
  };

  useEffect(() => {
    // Load local backup path
    invoke('get_local_backup_path')
      .then((res: any) => {
        if (res) setLocalBackupPath(res);
      })
      .catch((e) => console.error("Error fetching local backup path:", e));

    // Load cloud config
    invoke('get_cloud_config')
      .then((res: any) => {
        if (res) {
          setCloudConfig(res);
          if (res.cloud_url) setInputCloudUrl(res.cloud_url);
          if (res.access_token) setInputAccessToken(res.access_token);
        }
      })
      .catch((e) => console.error("Error fetching cloud config:", e));

    // Check internet connection
    testInternet();
  }, []);

  const handleSelectLocalFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Local Storage Backup Folder'
      });
      if (selected && typeof selected === 'string') {
        await invoke('set_local_backup_path', { path: selected });
        setLocalBackupPath(selected);
        toast.success(`Local backup folder set to: ${selected}`);
      }
    } catch (e: any) {
      toast.error(`Failed to select folder: ${e.toString()}`);
    }
  };

  const handleLocalBackup = async () => {
    try {
      setIsSubmitting(true);
      const res: string = await invoke('backup_to_local', { customPath: localBackupPath });
      toast.success(res);
    } catch (e: any) {
      toast.error(`Local backup failed: ${e.toString()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCloudConfig = async () => {
    try {
      await invoke('set_cloud_config', {
        cloudUrl: inputCloudUrl.trim() || null,
        accessToken: inputAccessToken.trim() || null
      });
      setCloudConfig({
        cloud_url: inputCloudUrl.trim() || undefined,
        access_token: inputAccessToken.trim() || undefined,
        last_sync: cloudConfig.last_sync
      });
      toast.success("Google Drive cloud configuration saved!");
      setShowCloudSetup(false);
    } catch (e: any) {
      toast.error(`Failed to save cloud config: ${e.toString()}`);
    }
  };

  const copyAppsScript = () => {
    const scriptCode = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var folderName = "Zawar Traders Backups";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  var decoded = Utilities.base64Decode(data.base64);
  var blob = Utilities.newBlob(decoded, "application/x-sqlite3", data.filename);
  var file = folder.createFile(blob);
  return ContentService.createTextOutput(JSON.stringify({ status: "success", id: file.getId(), name: file.getName() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var folderName = "Zawar Traders Backups";
  var folders = DriveApp.getFoldersByName(folderName);
  if (!folders.hasNext()) {
    return ContentService.createTextOutput(JSON.stringify({ files: [] })).setMimeType(ContentService.MimeType.JSON);
  }
  var folder = folders.next();
  if (e && e.parameter && e.parameter.file_id) {
    var file = DriveApp.getFileById(e.parameter.file_id);
    var bytes = file.getBlob().getBytes();
    var b64 = Utilities.base64Encode(bytes);
    return ContentService.createTextOutput(JSON.stringify({ filename: file.getName(), base64: b64 }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var files = folder.getFiles();
  var list = [];
  while (files.hasNext()) {
    var f = files.next();
    list.push({ id: f.getId(), name: f.getName(), size: f.getSize(), date: f.getLastUpdated() });
  }
  return ContentService.createTextOutput(JSON.stringify({ files: list })).setMimeType(ContentService.MimeType.JSON);
}`;
    navigator.clipboard.writeText(scriptCode);
    toast.success("Google Apps Script code copied to clipboard!");
  };

  const handleCloudBackup = async () => {
    const online = await testInternet();
    if (!online) {
      toast.error("No internet connection detected. Please connect to internet to backup directly to Google Drive.");
      return;
    }

    if (!cloudConfig.cloud_url && !cloudConfig.access_token) {
      setShowCloudSetup(true);
      return;
    }

    setIsCloudSyncing(true);
    toast.loading("Uploading backup directly to Google Drive...", { id: 'cloudBackup' });
    try {
      const payload: { filename: string; base64: string; size_bytes: number } = await invoke('prepare_cloud_backup');

      if (cloudConfig.cloud_url) {
        const response = await fetch(cloudConfig.cloud_url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.status === 'error' || data.error) {
          throw new Error(data.message || data.error);
        }
      } else if (cloudConfig.access_token) {
        const metadata = { name: payload.filename, mimeType: 'application/x-sqlite3' };
        const byteChars = atob(payload.base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/x-sqlite3' });

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${cloudConfig.access_token}` },
          body: form
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Google Drive API error: ${err}`);
        }
      }

      await invoke('record_cloud_sync_time');
      const nowStr = new Date().toLocaleString();
      setCloudConfig(prev => ({ ...prev, last_sync: nowStr }));
      toast.success(`Cloud backup successfully saved to Google Drive! (${payload.filename})`, { id: 'cloudBackup' });
    } catch (err: any) {
      toast.error(`Google Drive backup failed: ${err.message || err.toString()}`, { id: 'cloudBackup' });
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleCloudRestoreClick = async () => {
    const online = await testInternet();
    if (!online) {
      toast.error("No internet connection detected. Please connect to internet to restore from Google Drive.");
      return;
    }

    if (!cloudConfig.cloud_url && !cloudConfig.access_token) {
      setShowCloudSetup(true);
      return;
    }

    setIsCloudSyncing(true);
    toast.loading("Fetching backup files from Google Drive...", { id: 'cloudList' });
    try {
      let files: Array<{ id: string; name: string; size: number; date: string }> = [];

      if (cloudConfig.cloud_url) {
        const resp = await fetch(cloudConfig.cloud_url);
        const data = await resp.json();
        files = data.files || [];
      } else if (cloudConfig.access_token) {
        const resp = await fetch("https://www.googleapis.com/drive/v3/files?q=name contains 'Zawar_Traders' and trashed=false&fields=files(id,name,size,createdTime)&orderBy=createdTime desc", {
          headers: { Authorization: `Bearer ${cloudConfig.access_token}` }
        });
        const data = await resp.json();
        files = (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          size: Number(f.size || 0),
          date: f.createdTime
        }));
      }

      if (files.length === 0) {
        toast.error("No Zawar Traders cloud backup files found on Google Drive.", { id: 'cloudList' });
        return;
      }

      setCloudFiles(files);
      setShowCloudRestoreModal(true);
      toast.dismiss('cloudList');
    } catch (err: any) {
      toast.error(`Failed to list Google Drive backups: ${err.message || err.toString()}`, { id: 'cloudList' });
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const executeCloudFileRestore = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(`Restore database from Google Drive cloud backup: ${fileName}?\nCurrent data will be backed up safely before replacement.`);
    if (!confirmed) return;

    setIsSubmitting(true);
    toast.loading(`Downloading ${fileName} from Google Drive...`, { id: 'downloadRestore' });
    try {
      let base64Data = '';
      if (cloudConfig.cloud_url) {
        const resp = await fetch(`${cloudConfig.cloud_url}?file_id=${fileId}`);
        const data = await resp.json();
        if (data.base64) {
          base64Data = data.base64;
        } else {
          throw new Error("Invalid response from Google Drive");
        }
      } else if (cloudConfig.access_token) {
        const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${cloudConfig.access_token}` }
        });
        const arrayBuffer = await resp.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }

      toast.loading("Restoring database and applying checkpoint...", { id: 'downloadRestore' });
      const msg = await invoke('restore_cloud_backup', { base64Data });
      toast.success(msg, { id: 'downloadRestore' });
      setShowCloudRestoreModal(false);

      setTimeout(() => {
        invoke('restart_app');
      }, 2000);
    } catch (err: any) {
      toast.error(`Restore failed: ${err.message || err.toString()}`, { id: 'downloadRestore' });
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
              {/* Local Storage Backup Section with Folder Selector */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-600" /> Local Storage (کمپیوٹر بیک اپ)
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-600">
                    Select your custom local folder on your computer or USB drive to save and restore backups.
                  </p>

                  <div className="bg-white p-2.5 rounded border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Local Backup Folder:</span>
                      <button 
                        type="button" 
                        onClick={handleSelectLocalFolder}
                        className="text-emerald-600 hover:text-emerald-800 underline font-bold"
                      >
                        {localBackupPath ? 'Change Folder (فولڈر تبدیل کریں)' : 'Select Folder (فولڈر منتخب کریں)'}
                      </button>
                    </div>
                    <div className="font-mono text-slate-600 truncate bg-slate-50 p-1.5 rounded border border-slate-100">
                      {localBackupPath || '⚠️ Default (AppData/backups)'}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button 
                      type="button"
                      onClick={handleLocalBackup}
                      disabled={isSubmitting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded shadow-sm transition-colors flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" /> Backup to Folder
                    </button>
                    <button 
                      type="button"
                      onClick={handleRestoreClick}
                      disabled={isSubmitting}
                      className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold py-2.5 px-3 rounded shadow-sm transition-colors flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" /> Restore File
                    </button>
                  </div>
                </div>
              </div>

              {/* Google Drive Direct Cloud Backup Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5M9.73 3.5l-3.43 6L12.86 21h6.85M13.72 13.5l-4.57 8h13.7l4.57-8"/>
                    </svg>
                    Google Drive (کلاؤڈ بیک اپ)
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setShowCloudSetup(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1"
                  >
                    <Cloud className="h-3.5 w-3.5" /> Setup / سیٹنگ
                  </button>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200/80">
                    <span className="text-slate-600 font-medium">Internet Status:</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className={`h-2.5 w-2.5 rounded-full ${isInternetOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className={isInternetOnline ? 'text-emerald-700' : 'text-rose-700'}>
                        {isInternetOnline ? 'Connected (آن لائن)' : 'Offline (انٹرنیٹ نہیں ہے)'}
                      </span>
                      <button 
                        type="button" 
                        onClick={testInternet}
                        className="ml-1 text-slate-400 hover:text-slate-600 p-0.5" 
                        title="Recheck internet"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">
                    Directly backs up to Google Drive in the cloud when connected to the internet, and restores anytime.
                  </p>

                  <div className="bg-white p-2.5 rounded border border-slate-200 text-xs">
                    <div className="flex justify-between items-center text-slate-700 font-medium">
                      <span>Cloud Sync Mode:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cloudConfig.cloud_url || cloudConfig.access_token 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {cloudConfig.cloud_url || cloudConfig.access_token ? 'Configured (فعال ہے)' : 'Not Configured'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                      <span>Last Cloud Sync:</span>
                      <span className="font-mono text-slate-700">{cloudConfig.last_sync || 'Never'}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button 
                      type="button"
                      onClick={handleCloudBackup}
                      disabled={isCloudSyncing}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded shadow-sm transition-colors flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                    >
                      <Cloud className="h-4 w-4" />
                      {isCloudSyncing ? 'Backing up...' : 'Backup to Drive'}
                    </button>
                    <button 
                      type="button"
                      onClick={handleCloudRestoreClick}
                      disabled={isCloudSyncing}
                      className="flex-1 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-bold py-2.5 px-3 rounded shadow-sm transition-colors flex items-center justify-center gap-2 text-xs disabled:opacity-50"
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


    
      {/* Google Drive Cloud Setup Modal */}
      {showCloudSetup && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-600" />
                Google Drive Cloud Direct Setup (گوگل ڈرائیو سیٹنگز)
              </h3>
              <button onClick={() => setShowCloudSetup(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To upload backups directly to Google Drive over the internet without complex API fees, you can use a free 
              <strong> Google Apps Script Webhook URL</strong> or a direct <strong>Google OAuth Token</strong>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Option 1: Google Apps Script Webhook URL (Recommended / آسان طریقہ)
                </label>
                <input 
                  type="url" 
                  value={inputCloudUrl}
                  onChange={e => setInputCloudUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full border border-slate-300 rounded p-2 text-xs font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-blue-600" /> Ready-to-Use 1-Minute Script:
                  </span>
                  <button 
                    type="button" 
                    onClick={copyAppsScript}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Script (اسکرپٹ کاپی کریں)
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800">
                  <li>Visit <strong>script.google.com</strong> with your Google Account.</li>
                  <li>Click <strong>New Project</strong>, paste the copied script, and click <strong>Deploy &gt; New deployment</strong>.</li>
                  <li>Select <strong>Web app</strong>, Who has access: <strong>Anyone</strong>, and copy the Web app URL here.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Option 2: Direct Google OAuth Access Token (Optional)
                </label>
                <input 
                  type="password" 
                  value={inputAccessToken}
                  onChange={e => setInputAccessToken(e.target.value)}
                  placeholder="ya29.a0AfH6S..."
                  className="w-full border border-slate-300 rounded p-2 text-xs font-mono outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShowCloudSetup(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveCloudConfig}
                className="px-5 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 shadow-sm"
              >
                Save Cloud Settings (محفوظ کریں)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Backups Selection Modal */}
      {showCloudRestoreModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-600" />
                Google Drive Cloud Backups (گوگل ڈرائیو بیک اپ لسٹ)
              </h3>
              <button onClick={() => setShowCloudRestoreModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select any cloud backup saved on your Google Drive to download and restore.
            </p>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {cloudFiles.map((file) => (
                <div key={file.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-blue-600" />
                      {file.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {file.date ? new Date(file.date).toLocaleString() : 'Date N/A'} • {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => executeCloudFileRestore(file.id, file.name)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
              ))}
              {cloudFiles.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No backups found on Google Drive.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="button"
                onClick={() => setShowCloudRestoreModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};