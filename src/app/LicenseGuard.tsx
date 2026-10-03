import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Lock, Key, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const LicenseGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isActivated, setIsActivated] = useState(false);
  const [hardwareId, setHardwareId] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const info: any = await invoke('get_hardware_id');
        setHardwareId(info.hardware_id);
        setIsActivated(info.is_activated);
      } catch (err) {
        console.error("License check failed", err);
      } finally {
        setLoading(false);
      }
    };
    checkLicense();
  }, []);

  const handleVerify = async () => {
    if (!licenseKey.trim()) {
      toast.error("Please enter a license key");
      return;
    }
    setVerifying(true);
    try {
      const success = await invoke('verify_license', { key: licenseKey });
      if (success) {
        toast.success("Software Activated Successfully!");
        setIsActivated(true);
      } else {
        toast.error("Invalid License Key");
      }
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setVerifying(false);
    }
  };

  const copyHardwareId = () => {
    navigator.clipboard.writeText(hardwareId);
    toast.success("Hardware ID copied to clipboard");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (isActivated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <Lock className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Software License Required</h1>
          <p className="text-blue-100 mt-2">This PC is not authorized to run this software.</p>
        </div>
        
        <div className="p-8">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Your Hardware ID</label>
            <div className="flex bg-slate-100 p-3 rounded-lg border border-slate-200">
              <code className="flex-1 text-slate-800 font-mono break-all">{hardwareId}</code>
              <button 
                onClick={copyHardwareId}
                className="ml-4 text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Send this Hardware ID to your administrator or developer to receive a license key.</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Enter License Key</label>
            <div className="relative">
              <Key className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
          >
            {verifying ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Activate Software
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
